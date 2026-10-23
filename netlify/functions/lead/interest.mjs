/**
 * POST /api/lead-interest
 *
 * The one button on the "not the right fit" page: a visitor whose application we could not take
 * on asks for a fixed-price quote on a website, or a monthly retainer. It is an opt-in. Nobody is
 * contacted about this unless they press it; the privacy notice says so.
 *
 *  1. read the post (JSON from the page's script: campaign and lead_id, nothing else is trusted)
 *  2. find the stored lead. It has to exist, belong to that campaign and have been routed
 *     "not_a_fit". Anything else is answered the same way, so the endpoint tells nobody which
 *     lead ids exist.
 *  3. STORE THE REQUEST on the lead (rec.interest) before anything is sent anywhere.
 *  4. send it on to the same Zapier hook as the lead, as the lead's own payload plus
 *     event="website_interest" and interest_at. Zap 1 finds the task (or makes it, if the
 *     application never reached ClickUp), tags it, comments on it and tells Slack.
 *  5. answer. A request is never lost: if Zapier cannot be reached it is in storage, an alert
 *     names the company, and the visitor is told that it was received.
 *
 * Pressing the button twice does nothing the second time. The log carries a lead id and a code,
 * never a name, an address or free text.
 */
import { createHash } from 'node:crypto';
import { campaigns as defaultCampaigns } from './campaigns.mjs';
import { createStore, hourOf } from './store.mjs';
import { deliverToZapier } from './deliver.mjs';
import { buildPayload } from './payload.mjs';
import { sendAlert } from './alert.mjs';

const MAX_BODY = 2 * 1024;
const BUDGET_MS = 8000;
const RATE_LIMIT_PER_HOUR = 12;
const LEAD_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
/** Which wording the visitor saw. Bump it when the words on the page change, so the record says which they agreed to. */
export const NOTICE = 'not-a-fit-quote-v2';

const SECURITY = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export function createInterestHandler(deps = {}) {
  const campaigns = deps.campaigns || defaultCampaigns;
  const env = deps.env || (() => process.env);
  const doFetch = deps.fetch || globalThis.fetch;
  const nowFn = deps.now || (() => new Date());
  const sleep = deps.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const log = deps.log || ((o) => console.log(JSON.stringify(Object.assign({ evt: 'lead_interest' }, o))));
  const makeStore = deps.store || (() => createStore());

  const json = (status, obj) =>
    new Response(JSON.stringify(obj), { status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, SECURITY) });
  const gone = () => json(404, { ok: false, error: 'not_available' });

  async function safe(label, fn, fallback) {
    try { return await fn(); } catch (err) {
      log({ code: label + '_error', message: String((err && err.name) || 'Error') });
      return fallback;
    }
  }

  return async function handler(req, context) {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: Object.assign({ 'Content-Type': 'text/plain; charset=utf-8', Allow: 'POST' }, SECURITY) });
    }
    try {
      return await handle(req, context || {});
    } catch (err) {
      log({ code: 'unhandled', message: String((err && err.name) || 'Error') });
      return json(500, { ok: false, error: 'unavailable' });
    }
  };

  async function handle(req, context) {
    const deadline = nowFn().getTime() + BUDGET_MS;

    /* ---- 1. read ---------------------------------------------------------- */
    if (!/application\/json/i.test(req.headers.get('content-type') || '')) return json(415, { ok: false, error: 'unsupported_type' });
    if (Number(req.headers.get('content-length') || 0) > MAX_BODY) return json(413, { ok: false, error: 'too_large' });
    let text;
    try { text = await req.text(); } catch (e) { return json(400, { ok: false, error: 'unreadable' }); }
    if (text.length > MAX_BODY) return json(413, { ok: false, error: 'too_large' });
    let o;
    try { o = JSON.parse(text); } catch (e) { return json(400, { ok: false, error: 'bad_json' }); }
    if (!o || typeof o !== 'object' || Array.isArray(o)) return json(400, { ok: false, error: 'bad_json' });

    const campaignKey = String(typeof o.campaign === 'string' ? o.campaign : '').slice(0, 64);
    const camp = Object.prototype.hasOwnProperty.call(campaigns, campaignKey) ? campaigns[campaignKey] : null;
    if (!camp) return json(400, { ok: false, error: 'unknown_campaign' });
    const leadId = typeof o.lead_id === 'string' ? o.lead_id : '';
    if (!LEAD_ID_RE.test(leadId)) return json(400, { ok: false, error: 'bad_lead_id' });
    if (!camp.cfg.live) { log({ code: 'not_live', lead_id: leadId }); return json(503, { ok: false, error: 'unavailable' }); }

    const e = env();
    const hook = e.ZAPIER_LEAD_HOOK || '';
    if (!/^https:\/\/[^\s]+$/.test(hook)) { log({ code: 'no_destination', lead_id: leadId }); return json(503, { ok: false, error: 'unavailable' }); }

    let store = null;
    try { store = makeStore(); } catch (err) { log({ code: 'store_unavailable' }); }
    if (!store) return json(503, { ok: false, error: 'unavailable' });

    /* ---- an hourly limit per address, counted apart from the application form's */
    const ip = context.ip || (req.headers.get('x-nf-client-connection-ip') || '').trim() ||
      (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    if (ip) {
      const ipHash = createHash('sha256').update((e.LEAD_IP_SALT || 'elevate-leads') + 'interest' + ip).digest('hex').slice(0, 32);
      const allowed = await safe('rate', () => store.rateHit({ ipHash, hour: hourOf(nowFn()), limit: RATE_LIMIT_PER_HOUR }), true);
      if (!allowed) { log({ code: 'rate_limited', lead_id: leadId }); return json(429, { ok: false, error: 'rate_limited' }); }
    }

    /* ---- 2. the lead ---------------------------------------------------------- */
    const rec = await safe('read', () => store.getLead(leadId), null);
    if (!rec || rec.campaign !== camp.id || rec.route !== 'not_a_fit') {
      log({ code: 'not_available', lead_id: leadId, route: rec ? rec.route : 'none' });
      return gone();
    }
    if (rec.interest && rec.interest.delivery && rec.interest.delivery.state === 'ok') {
      log({ code: 'replay', lead_id: leadId });
      return json(200, { ok: true, lead_id: leadId, already: true });
    }

    /* ---- 3. store it first ----------------------------------------------------- */
    const at = (rec.interest && rec.interest.at) || nowFn().toISOString();
    rec.interest = Object.assign({}, rec.interest, {
      kind: 'website', at, notice: NOTICE, page_slug: camp.cfg.slug,
      delivery: (rec.interest && rec.interest.delivery) || { state: 'pending', attempts: 0, error: '', at: '' },
    });
    const saved = await safe('save', async () => { await store.saveLead(rec); return true; }, false);
    if (!saved) return json(503, { ok: false, error: 'unavailable' });

    /* ---- 4. send it on ---------------------------------------------------------- */
    const payload = Object.assign(buildPayload({
      leadId: rec.lead_id, campaign: rec.campaign, route: rec.route, reasons: rec.reasons,
      submittedAt: rec.received_at, values: rec.values, ch: rec.ch, tracking: rec.tracking,
    }), { event: 'website_interest', interest_at: at });
    const r = await deliverToZapier({ url: hook, payload, fetch: doFetch, sleep, now: () => nowFn().getTime(), deadline });
    rec.interest.delivery = {
      state: r.ok ? 'ok' : 'failed',
      attempts: ((rec.interest.delivery && rec.interest.delivery.attempts) || 0) + r.attempts,
      error: r.ok ? '' : r.error,
      at: nowFn().toISOString(),
    };
    await safe('save', () => store.saveLead(rec), null);

    if (!r.ok) {
      log({ code: 'zap_failed', lead_id: leadId, error: r.error, attempts: r.attempts });
      await safe('alert', () => sendAlert({
        env: e, fetch: doFetch,
        subject: `Website quote request not delivered to Zapier: ${rec.values.company_name || rec.lead_id}`,
        text: `lead_id: ${rec.lead_id}\ncampaign: ${rec.campaign}\ncompany: ${rec.values.company_name}\n` +
          `error: ${r.error} after ${r.attempts} attempts\n\n` +
          'The visitor asked for a quote on a website and was told it was received. The request is stored on the lead ' +
          `(interest) but is NOT in ClickUp or Slack. Tag the task "ønsker-nettsidetilbud" by hand and tell ${(camp.cfg.reviewer && camp.cfg.reviewer.name) || 'Sondre'}.`,
      }), null);
    }

    /* ---- 5. answer ---------------------------------------------------------------- */
    log({ code: 'accepted', lead_id: leadId, delivery: rec.interest.delivery.state });
    return json(200, { ok: true, lead_id: leadId });
  }
}
