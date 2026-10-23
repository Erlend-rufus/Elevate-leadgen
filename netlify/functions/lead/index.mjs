/**
 * POST /api/lead
 *
 * Receives an application from a landing page, decides what the firm is told next, and
 * hands the lead on. The rules that decide are in code we own (g/<campaign>/route.mjs), not
 * in the browser, where a visitor could read and change them, and not in Zapier, which runs
 * after the visitor has already seen the next page.
 *
 *  1. read the post (JSON from the page's script, or a plain form post without one)
 *  2. stop the obvious spam: a hidden field, an hourly limit per address
 *  3. validate with the same code the browser ran
 *  4. ask Companies House about the company, unless the answers already decide (or, on a
 *     deploy preview only, the check has been switched off: see registerSwitchedOff)
 *  5. decide the route: fit, review, not_now or not_a_fit
 *  6. STORE THE LEAD. Nothing below can lose it.
 *  7. send it on: Zapier (three tries, inside a time budget) and, for a qualified form from
 *     a visitor who accepted cookies, Meta's Conversions API
 *  8. answer with the route, and the address of the page to show
 *
 * Failure is handled by what is already safe. If Zapier cannot be reached the lead is in
 * storage, the visitor is still sent on (their application was received), an e-mail names the
 * lead, and the daily reconciliation delivers it. If the lead cannot be stored AND cannot be
 * delivered, the visitor gets an honest error and keeps their answers.
 *
 * Environment (Netlify, scope: Functions). Never in the repository or in a chat:
 *   ZAPIER_LEAD_HOOK         required. The Catch Hook URL of the lead Zap.
 *   COMPANIES_HOUSE_API_KEY  without it every lead goes to review, never to fit.
 *   COMPANIES_HOUSE_MODE     "off" skips the register, on a deploy preview only. Set it for the deploy-preview
 *                            context and nowhere else; on every other address it is ignored (registerSwitchedOff).
 *   META_CAPI_TOKEN         needed for the server side event (capi.mjs). META_PIXEL_ID defaults to the page's pixel;
 *                            META_TEST_EVENT_CODE is optional (events then show only under Test Events).
 *   META_CAPI_TOKEN_IT      the Italian funnel's own token (config.json funnel.capiTokenEnv). A token belongs to one pixel;
 *                            for such a funnel META_PIXEL_ID is ignored and the event goes to funnel.pixelId.
 *   RESEND_API_KEY, ALERT_EMAIL_FROM, ALERT_EMAIL_TO, SLACK_ALERT_WEBHOOK_URL   see alert.mjs
 *   LEAD_IP_SALT             optional. Salt for the hashed address in the rate limiter.
 *
 * The log carries a lead id, a route and a reason code. Never a name, an address or free text.
 */
import { createHash, randomUUID } from 'node:crypto';
import { campaigns as defaultCampaigns } from './campaigns.mjs';
import { createStore, dayOf, hourOf } from './store.mjs';
import { lookup as lookupCompany } from './companies-house.mjs';
import { sendQualifiedForm } from './capi.mjs';
import { deliverLead } from './deliver.mjs';
import { sendAlert } from './alert.mjs';
import { buildPayload } from './payload.mjs';

const MAX_BODY = 64 * 1024;
const BUDGET_MS = 8000;
const RATE_LIMIT_PER_HOUR = 12;
const LEAD_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const TRACKING = UTM.concat(['fbclid', 'referrer', 'consent', 'fbp', 'fbc']);

const SECURITY = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

/* A preview can be tried end to end before a Companies House key exists: COMPANIES_HOUSE_MODE=off skips
   the register. It is honoured only on an address that Netlify gives a deploy preview or a branch deploy
   (a name with "--" in front of the site name) or on this computer, and never when Netlify says the context
   is production. On getelevateleads.com and on the site's own netlify.app address the setting is ignored, so
   a variable set in the wrong scope by mistake still cannot change what a real visitor is told. */
const PREVIEW_HOST = /^[a-z0-9][a-z0-9-]*--[a-z0-9-]+\.netlify\.app$/i;
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$/i;

function registerSwitchedOff(e, req) {
  if (String(e.COMPANIES_HOUSE_MODE || '').trim().toLowerCase() !== 'off') return false;
  if (String(e.CONTEXT || '').trim().toLowerCase() === 'production') return false;
  let host = '';
  try { host = new URL(req.url).hostname; } catch (err) { return false; }
  return PREVIEW_HOST.test(host) || LOCAL_HOST.test(host);
}

export function createHandler(deps = {}) {
  const campaigns = deps.campaigns || defaultCampaigns;
  const env = deps.env || (() => process.env);
  const doFetch = deps.fetch || globalThis.fetch;
  const nowFn = deps.now || (() => new Date());
  const uuid = deps.uuid || (() => randomUUID());
  const sleep = deps.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const log = deps.log || ((o) => console.log(JSON.stringify(Object.assign({ evt: 'lead' }, o))));
  const makeStore = deps.store || (() => createStore());

  const reply = (status, body, type, extra) =>
    new Response(body, { status, headers: Object.assign({ 'Content-Type': type }, SECURITY, extra || {}) });
  const json = (status, obj) => reply(status, JSON.stringify(obj), 'application/json; charset=utf-8');
  const wantsJson = (req) => /application\/json/i.test(req.headers.get('accept') || '');

  /** A step that must not take the request down with it. */
  async function safe(label, fn, fallback) {
    try { return await fn(); } catch (err) {
      log({ code: label + '_error', message: String((err && err.name) || 'Error') });
      return fallback;
    }
  }

  return async function handler(req, context) {
    const startMs = nowFn().getTime();
    const deadline = startMs + BUDGET_MS;
    if (req.method !== 'POST') return reply(405, 'Method Not Allowed', 'text/plain; charset=utf-8', { Allow: 'POST' });

    try {
      return await handle(req, context || {}, startMs, deadline);
    } catch (err) {
      log({ code: 'unhandled', message: String((err && err.name) || 'Error') });
      return json(500, { ok: false, error: 'unavailable' });
    }
  };

  async function handle(req, context, startMs, deadline) {
    /* ---- 1. read the post ------------------------------------------------ */
    let get;
    {
      const len = Number(req.headers.get('content-length') || 0);
      if (len > MAX_BODY) return json(413, { ok: false, error: 'too_large' });
      let text;
      try { text = await req.text(); } catch (e) { return json(400, { ok: false, error: 'unreadable' }); }
      if (text.length > MAX_BODY) return json(413, { ok: false, error: 'too_large' });
      const type = req.headers.get('content-type') || '';
      if (/application\/json/i.test(type)) {
        let o;
        try { o = JSON.parse(text); } catch (e) { return json(400, { ok: false, error: 'bad_json' }); }
        if (!o || typeof o !== 'object' || Array.isArray(o)) return json(400, { ok: false, error: 'bad_json' });
        get = (n) => (typeof o[n] === 'string' || typeof o[n] === 'number' ? o[n] : null);
      } else if (/application\/x-www-form-urlencoded/i.test(type)) {
        const p = new URLSearchParams(text);
        // A multi-choice question posts one value per ticked box; joined here the way the page's script joins them.
        get = (n) => { const all = p.getAll(n); return all.length > 1 ? all.join(', ') : p.get(n); };
      } else {
        return json(415, { ok: false, error: 'unsupported_type' });
      }
    }

    /* An own property only: "constructor" and "__proto__" are not campaigns. */
    const campaignKey = String(get('campaign') || '').slice(0, 64);
    const camp = Object.prototype.hasOwnProperty.call(campaigns, campaignKey) ? campaigns[campaignKey] : null;
    if (!camp) return json(400, { ok: false, error: 'unknown_campaign' });
    const { core, route: routing, cfg } = camp;
    const tidy = core.tidy;

    /* The tracking fields come through whatever else happens, so a retry keeps them. */
    const fallback = fromReferer(req, cfg);
    const hidden = {};
    TRACKING.forEach((name) => {
      let v = tidy(get(name), name === 'referrer' ? 300 : 200);
      if (!v && fallback[name]) v = tidy(fallback[name], 200);
      hidden[name] = v;
    });
    hidden.consent = hidden.consent === 'accepted' || hidden.consent === 'declined' ? hidden.consent : 'unset';
    /* The advertising identifiers are kept only for a visitor who accepted the cookie. Without
       that choice they are neither stored, sent on, nor carried to the next page. */
    if (hidden.consent !== 'accepted') { hidden.fbclid = ''; hidden.fbp = ''; hidden.fbc = ''; }
    let leadId = tidy(get('lead_id'), 64);
    if (!LEAD_ID_RE.test(leadId)) leadId = 'l_' + uuid().replace(/-/g, '').slice(0, 20);
    hidden.lead_id = leadId;
    hidden.page_slug = cfg.slug;

    const rawValues = {};
    core.FIELDS.forEach((f) => { const v = get(f); if (v !== null) rawValues[f] = v; });

    const rerender = (status, values, errors, general) => reply(status,
      camp.shell.before + camp.renderForm({ copy: camp.copy, cfg, values, errors, hidden, general }) + camp.shell.after,
      'text/html; charset=utf-8');
    const refuse = (status, code, general = true) => {
      log({ code, lead_id: leadId });
      return wantsJson(req) ? json(status, { ok: false, error: 'unavailable' }) : rerender(status, rawValues, {}, general);
    };
    const nextUrl = (route) => {
      const q = ['lead_id=' + encodeURIComponent(leadId)];
      UTM.concat(['fbclid']).forEach((k) => { if (hidden[k]) q.push(k + '=' + encodeURIComponent(hidden[k])); });
      return `${cfg.path}/${routing.PAGE_FOR[route]}/?${q.join('&')}`;
    };
    const answer = (route) => {
      const next = nextUrl(route);
      return wantsJson(req)
        ? json(200, { ok: true, lead_id: leadId, route, page: routing.PAGE_FOR[route], next })
        : reply(303, '', 'text/plain; charset=utf-8', { Location: next });
    };

    /* ---- 2. spam: a field no person sees --------------------------------- */
    if (tidy(get(cfg.honeypot), 200)) {
      log({ code: 'honeypot', lead_id: leadId });
      return answer('not_a_fit');
    }

    /* ---- readiness: fail closed rather than accept a lead that goes nowhere */
    if (!cfg.live) return refuse(503, 'not_live');
    const e = env();
    const hook = e.ZAPIER_LEAD_HOOK || '';
    if (!/^https:\/\/[^\s]+$/.test(hook)) return refuse(503, 'no_destination');

    /* ---- hourly limit per address ---------------------------------------- */
    let store = null;
    try { store = makeStore(); } catch (err) { log({ code: 'store_unavailable' }); }
    const ip = context.ip || (req.headers.get('x-nf-client-connection-ip') || '').trim() ||
      (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    if (store && ip) {
      const ipHash = createHash('sha256').update((e.LEAD_IP_SALT || 'elevate-leads') + ip).digest('hex').slice(0, 32);
      const allowed = await safe('rate', () => store.rateHit({ ipHash, hour: hourOf(nowFn()), limit: RATE_LIMIT_PER_HOUR }), true);
      if (!allowed) {
        log({ code: 'rate_limited', lead_id: leadId });
        return wantsJson(req) ? json(429, { ok: false, error: 'rate_limited' }) : rerender(429, rawValues, {}, true);
      }
    }

    /* ---- 3. validate ----------------------------------------------------- */
    const v = core.validate(rawValues);
    if (!v.ok) {
      return wantsJson(req) ? json(422, { ok: false, errors: v.errors }) : rerender(422, rawValues, v.errors, false);
    }
    const values = v.values;

    /* ---- the same lead again: answer as before, and try the delivery again */
    const existing = store ? await safe('read', () => store.getLead(leadId), null) : null;
    if (existing && existing.route) {
      log({ code: 'replay', lead_id: leadId, route: existing.route });
      if (existing.delivery && existing.delivery.state !== 'ok') {
        await deliver(existing, { store, hook, e, deadline });
      }
      return answer(existing.route);
    }

    /* ---- 4. the register -------------------------------------------------- */
    let ch = { check: 'skipped', reasons: [] };
    if (routing.needsRegistry(values)) {
      if (!(cfg.legal && cfg.legal.registerCheck)) {
        // The privacy notice does not promise a register check (legal.registerCheck is false), so none is made.
        // Recorded as "unchecked": the lead still says in its own record that nobody looked the company up.
        ch = { check: 'unchecked', reasons: [] };
      } else if (registerSwitchedOff(e, req)) {
        // Recorded as "off", never as "ok": the lead says in its own record that nobody checked the register.
        ch = { check: 'off', reasons: [] };
        log({ code: 'ch_switched_off', lead_id: leadId });
      } else {
        const remaining = deadline - nowFn().getTime();
        const found = await lookupCompany({
          name: camp.registryName(values), key: e.COMPANIES_HOUSE_API_KEY, fetch: doFetch,
          timeoutMs: Math.max(1000, Math.min(4000, remaining - 3500)),
        });
        if (found.status === 'found') {
          const a = routing.assessProfile(values, found.profile, nowFn());
          ch = { check: a.check, reasons: a.reasons, profile: found.profile };
        } else if (found.status === 'not_found') {
          ch = { check: 'not_found', reasons: [] };
        } else {
          ch = { check: 'timeout', reasons: [], error: found.reason };
          log({ code: 'ch_unavailable', lead_id: leadId, reason: found.reason });
        }
      }
    }

    /* ---- 5. decide --------------------------------------------------------- */
    const decision = routing.decide(values, ch);

    /* ---- 6. store, before anything is sent anywhere ------------------------- */
    const rec = {
      v: 1,
      lead_id: leadId,
      campaign: camp.id,
      received_at: nowFn().toISOString(),
      route: decision.route,
      reasons: decision.reasons,
      values,
      tracking: {
        page_slug: cfg.slug, referrer: hidden.referrer, fbclid: hidden.fbclid,
        utm_source: hidden.utm_source, utm_medium: hidden.utm_medium, utm_campaign: hidden.utm_campaign,
        utm_content: hidden.utm_content, utm_term: hidden.utm_term,
      },
      consent: hidden.consent,
      ch,
      delivery: { state: 'pending', attempts: 0, error: '', at: '' },
      capi: { state: 'skipped', reason: '' },
    };
    let stored = false;
    if (store) {
      const made = await safe('store', () => store.createLead(rec), null);
      if (made && made.created === false) {
        // Lost a race with the same lead_id: the other request owns it.
        const other = await safe('read', () => store.getLead(leadId), null);
        if (other && other.route) return answer(other.route);
      }
      stored = !!(made && made.created);
    }

    /* ---- 7. send it on ------------------------------------------------------- */
    const qualified = camp.qualifiedRoutes.includes(decision.route) && hidden.consent === 'accepted';
    /* With the register off, a "fit" has not been checked, so Meta is not told it is a qualified form. The one
       exception is a Test Events code (META_TEST_EVENT_CODE): those events show only in Meta's test tool. */
    const capiHeld = qualified && ch.check === 'off' && !e.META_TEST_EVENT_CODE;
    const capiWanted = qualified && !capiHeld;
    const [delivered, capi] = await Promise.all([
      deliver(rec, { store: stored ? store : null, hook, e, deadline, skipSave: true }),
      capiWanted
        ? sendQualifiedForm({
          // The browser's pixel is the one in config.json; the server event has to go to the same one or Meta can not
          // match the two by event id. META_PIXEL_ID is an override for testing, not a thing that has to be set.
          env: capiEnv(e, cfg), fetch: doFetch, nowMs: nowFn().getTime(), eventName: cfg.funnel.qualifiedEvent,
          leadId, route: decision.route, campaign: camp.id, sourceUrl: cfg.origin + cfg.path + '/',
          email: values.email, firstName: values.first_name, lastName: values.last_name,
          ip, userAgent: req.headers.get('user-agent') || '', fbp: hidden.fbp, fbc: hidden.fbc, fbclid: hidden.fbclid,
        })
        : Promise.resolve({ state: 'skipped', reason: capiHeld ? 'register_off' : 'no_consent_or_not_qualified' }),
    ]);
    rec.capi = capi;
    if (capi.state === 'failed') log({ code: 'capi_failed', lead_id: leadId, reason: capi.reason });
    if (stored) await safe('save', () => store.saveLead(rec), null);

    /* ---- 8. answer ------------------------------------------------------------ */
    if (!delivered.ok && !stored) return refuse(503, 'lost_lead_refused');
    log({ code: 'accepted', lead_id: leadId, route: decision.route, delivery: rec.delivery.state, ms: nowFn().getTime() - startMs });
    return answer(decision.route);
  }

  /**
   * The environment the Conversions API call sees. A Meta access token belongs to one pixel, so a funnel with a pixel of its
   * own (Italy) names its own token variable in config.json (funnel.capiTokenEnv, e.g. META_CAPI_TOKEN_IT). Its events then
   * always go to its own pixel, and the shared META_PIXEL_ID test override is ignored: it would send them to another country's
   * pixel. A funnel without capiTokenEnv (the UK ones) behaves exactly as before.
   */
  function capiEnv(e, cfg) {
    const own = cfg.funnel.capiTokenEnv;
    if (!own) return Object.assign({}, e, { META_PIXEL_ID: e.META_PIXEL_ID || cfg.funnel.pixelId });
    return Object.assign({}, e, { META_CAPI_TOKEN: e[own], META_PIXEL_ID: cfg.funnel.pixelId });
  }

  /** Delivers one lead through the shared routine, with the alert wired to this deployment's settings. */
  function deliver(rec, { store, hook, e, deadline, skipSave }) {
    return deliverLead({
      rec, store, skipSave, hook, env: e, fetch: doFetch, sleep, now: nowFn, deadline, log, buildPayload,
      alert: ({ subject, text }) => sendAlert({ env: e, fetch: doFetch, subject, text }),
    });
  }
}

/** utm_* and fbclid from the page that posted, for a browser that could not fill them in. */
function fromReferer(req, cfg) {
  const out = {};
  try {
    const u = new URL(req.headers.get('referer') || '');
    if (u.pathname.indexOf(cfg.path) !== 0) return out;
    UTM.concat(['fbclid']).forEach((k) => { const v = u.searchParams.get(k); if (v) out[k] = v; });
  } catch (e) { /* no usable Referer: nothing to recover */ }
  return out;
}

export default createHandler();

/* Netlify matches a function with its own path before it looks at redirects, so this line is
   what serves /api/lead. The rule of the same name in netlify.toml is only a fallback: it would
   matter if this export were ever removed, when the function would answer at its default address.
   No "method" is set on purpose: a GET must reach the handler and get its 405, not fall through
   to the redirects below and be answered with the homepage. */
export const config = { path: '/api/lead' };
