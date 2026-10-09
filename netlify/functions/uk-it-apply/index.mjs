/**
 * POST /uk-it-firms/apply
 *
 * Receives the application, checks it with the same code the browser runs,
 * decides the outcome page, hands the lead to the receiving system, and sends
 * the visitor on. The first Netlify Function on this site, and it exists
 * because the work order requires a form that works with JavaScript off and a
 * server that validates: both need something that runs on the server.
 *
 * It fails closed. A lead that is accepted but goes nowhere is the worst
 * outcome on a paid funnel: the firm believes it applied, the ad money is
 * spent, and nobody can tell. So it answers 503 rather than 200 when:
 *   - the funnel is not live (config.live is false),
 *   - routing is not configured (the rules were not supplied),
 *   - no destination is set (UK_IT_LEAD_WEBHOOK_URL is missing), or
 *   - the destination did not accept the lead.
 * The visitor sees the form's general error and keeps their answers.
 *
 * Environment (Netlify, scope: Functions):
 *   UK_IT_LEAD_WEBHOOK_URL    required once live. https URL that receives the lead as JSON.
 *   UK_IT_LEAD_WEBHOOK_TOKEN  optional. Sent as "Authorization: Bearer <token>".
 *
 * The lead is not stored here. This function keeps nothing and logs no personal
 * data: only a lead id and the reason for a refusal.
 */
import core from '../../../g/uk-it-larger-firms/core.cjs';
import route from '../../../g/uk-it-larger-firms/route.cjs';
import formMod from '../../../g/uk-it-larger-firms/form.cjs';
import * as data from './data.generated.mjs';

const { renderForm } = formMod;
const WEBHOOK_TIMEOUT_MS = 8000;
const MAX_BODY = 64 * 1024;
const LEAD_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

const SECURITY = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export function createHandler(deps) {
  const { cfg, copy, routing, shell } = deps;
  const env = deps.env || (() => process.env);
  const doFetch = deps.fetch || globalThis.fetch;
  const now = deps.now || (() => new Date());
  const uuid = deps.uuid || (() => globalThis.crypto.randomUUID());
  const log = deps.log || ((o) => console.error(JSON.stringify(Object.assign({ evt: 'uk-it-apply' }, o))));
  const Q = copy.form.questions, M = copy.form.errors;
  const BASE = cfg.path;

  const reply = (status, body, type, extra) =>
    new Response(body, { status, headers: Object.assign({ 'Content-Type': type }, SECURITY, extra || {}) });
  const json = (status, obj) => reply(status, JSON.stringify(obj), 'application/json; charset=utf-8');
  const wantsJson = (req) => /application\/json/i.test(req.headers.get('accept') || '');

  /** The form page again, answers put back, for a visitor who is not running our script. */
  function rerender(status, answers, errors, hidden, general) {
    const html = shell.before + renderForm({ copy, config: cfg, answers, errors, hidden, general }) + shell.after;
    return reply(status, html, 'text/html; charset=utf-8');
  }

  /** Something other than the visitor's input went wrong. Their answers survive and they are told, as the form says, to try again or email. */
  function refuse(req, status, code, leadId, answers, hidden) {
    log({ code, lead_id: leadId || null });
    return wantsJson(req) ? json(status, { ok: false, error: 'unavailable' })
      : rerender(status, answers || {}, {}, hidden || {}, true);
  }

  /** utm_* and fbclid from the page that posted, for a browser that could not fill them in. */
  function fromReferer(req) {
    const out = {};
    try {
      const u = new URL(req.headers.get('referer') || '');
      if (u.pathname.indexOf(BASE) !== 0) return out;
      UTM.concat(['fbclid']).forEach((k) => { const v = u.searchParams.get(k); if (v) out[k] = v; });
    } catch (e) { /* no usable Referer: nothing to recover */ }
    return out;
  }

  return async function handler(req) {
    if (req.method !== 'POST') return reply(405, 'Method Not Allowed', 'text/plain; charset=utf-8', { Allow: 'POST' });

    let get, rawHidden = {};
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
        get = (n) => p.get(n);
      } else {
        return json(415, { ok: false, error: 'unsupported_type' });
      }
    }

    /* Tracking fields, whatever else happens, so a retry keeps them. */
    const fallback = fromReferer(req);
    cfg.hiddenFields.forEach((name) => {
      if (name === 'page_slug') return;
      let v = core.str(get(name)).slice(0, name === 'referrer' ? 300 : 200);
      if (!v && fallback[name]) v = core.str(fallback[name]).slice(0, 200);
      rawHidden[name] = v;
    });
    if (!LEAD_ID_RE.test(rawHidden.lead_id || '')) rawHidden.lead_id = 'l_' + uuid().replace(/-/g, '').slice(0, 20);
    const hidden = rawHidden;
    const leadId = hidden.lead_id;

    const answers = core.answersFrom(Q, get);

    /* A field a person never sees. Anything in it is a script, so the answer is
       the same shape as success and nothing is recorded. */
    if (core.str(get('contact_by_fax'))) {
      log({ code: 'honeypot', lead_id: leadId });
      const next = BASE + '/not-a-fit/';
      return wantsJson(req) ? json(200, { ok: true, next, page: 'not-a-fit' })
        : reply(303, '', 'text/plain; charset=utf-8', { Location: next });
    }

    if (!cfg.live) return refuse(req, 503, 'not_live', leadId, answers, hidden);

    const v = core.validateAll(Q, answers, M);
    if (!v.ok) {
      return wantsJson(req) ? json(422, { ok: false, errors: v.errors })
        : rerender(422, answers, v.errors, hidden, false);
    }

    let routed;
    try { routed = route.routeLead(Q, answers, routing); }
    catch (e) { return refuse(req, 503, e.name === 'RoutingNotConfigured' ? 'routing_not_configured' : 'routing_error', leadId, answers, hidden); }

    const e = env();
    const url = e.UK_IT_LEAD_WEBHOOK_URL || '';
    if (!/^https:\/\/[^\s]+$/.test(url)) return refuse(req, 503, 'no_destination', leadId, answers, hidden);

    const lead = {
      event: 'uk_it_larger_firms.lead',
      lead_id: leadId,
      received_at: now().toISOString(),
      page_slug: cfg.slug,
      route: { page: routed.page, rule: routed.rule },
      answers: core.describe(Q, answers),
      tracking: hidden,
    };

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), WEBHOOK_TIMEOUT_MS);
    try {
      const res = await doFetch(url, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, e.UK_IT_LEAD_WEBHOOK_TOKEN ? { Authorization: 'Bearer ' + e.UK_IT_LEAD_WEBHOOK_TOKEN } : {}),
        body: JSON.stringify(lead),
        signal: ctl.signal,
        redirect: 'manual',
      });
      /* ok means 2xx. A redirect is not accepted either: with redirect:'manual' it arrives as a non-ok response, so a destination that bounces us elsewhere is a refusal, not a delivery. */
      if (!res.ok) return refuse(req, 502, 'delivery_rejected', leadId, answers, hidden);
    } catch (err) {
      return refuse(req, 502, err && err.name === 'AbortError' ? 'delivery_timeout' : 'delivery_failed', leadId, answers, hidden);
    } finally { clearTimeout(timer); }

    /* Only values we built, URL-encoded: the destination page is chosen by us and
       the parameters are carried, never trusted as a location. */
    const q = [];
    UTM.concat(['fbclid']).forEach((k) => { if (hidden[k]) q.push(k + '=' + encodeURIComponent(hidden[k])); });
    q.unshift('lead_id=' + encodeURIComponent(leadId));
    const next = BASE + '/' + routed.page + '/?' + q.join('&');
    log({ code: 'accepted', lead_id: leadId, page: routed.page });
    return wantsJson(req) ? json(200, { ok: true, next, page: routed.page })
      : reply(303, '', 'text/plain; charset=utf-8', { Location: next });
  };
}

export default createHandler({ cfg: data.cfg, copy: data.copy, routing: data.routing, shell: data.shell });

/* Both the path and a redirect rule in netlify.toml point here. The path alone
   should win over the SPA fallback and the /uk-it-firms/* 404; the rule is there so
   that a misremembered precedence cannot turn the endpoint into a 404 for paid
   traffic. The build fails if this literal and config.path in config.json differ. */
export const config = { path: '/uk-it-firms/apply', method: ['POST'] };
