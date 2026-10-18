/**
 * Meta Conversions API, server side. Sends the same custom event the browser pixel sends
 * (QualifiedForm), with the same event_id (the lead_id), so Meta counts it once.
 *
 * Only ever called for a visitor who accepted the cookie choice: the browser reports its
 * state in the "consent" field and the caller checks it. It is the same data as the pixel,
 * served from here, so it follows the same consent.
 *
 * Environment: META_CAPI_TOKEN (required to send), META_PIXEL_ID (falls back to the
 * funnel's pixel), META_TEST_EVENT_CODE (optional: events then appear only under Test
 * Events in Events Manager and never reach the live pixel's data).
 */
import { createHash } from 'node:crypto';

const GRAPH = 'https://graph.facebook.com/v21.0';

export const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');
const norm = (s) => String(s || '').trim().toLowerCase();

/**
 * fbc: Meta's click id cookie value. The browser sends the real cookie when it has one;
 * otherwise it is built from fbclid in the format Meta documents (fb.1.<ms>.<fbclid>).
 */
export function clickId(fbc, fbclid, nowMs) {
  if (fbc) return String(fbc).slice(0, 200);
  if (fbclid) return `fb.1.${nowMs}.${String(fbclid).slice(0, 180)}`;
  return '';
}

/**
 * Returns {state: 'skipped' | 'ok' | 'failed', reason?}. Never throws.
 */
export async function sendQualifiedForm({
  env, fetch: doFetch = globalThis.fetch, nowMs, eventName, leadId, route, campaign, sourceUrl,
  email, firstName, lastName, ip, userAgent, fbp, fbc, fbclid, timeoutMs = 3000,
}) {
  const token = env.META_CAPI_TOKEN;
  const pixel = env.META_PIXEL_ID;
  if (!token || !pixel) return { state: 'skipped', reason: 'not_configured' };

  const user = {};
  if (email) user.em = [sha256(norm(email))];
  if (firstName) user.fn = [sha256(norm(firstName))];
  if (lastName) user.ln = [sha256(norm(lastName))];
  if (ip) user.client_ip_address = ip;
  if (userAgent) user.client_user_agent = String(userAgent).slice(0, 400);
  const click = clickId(fbc, fbclid, nowMs);
  if (click) user.fbc = click;
  if (fbp) user.fbp = String(fbp).slice(0, 200);

  const body = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(nowMs / 1000),
      event_id: leadId,
      action_source: 'website',
      event_source_url: sourceUrl,
      user_data: user,
      custom_data: { route, campaign },
    }],
    access_token: token,
  };
  if (env.META_TEST_EVENT_CODE) body.test_event_code = env.META_TEST_EVENT_CODE;

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await doFetch(`${GRAPH}/${encodeURIComponent(pixel)}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    return res.ok ? { state: 'ok' } : { state: 'failed', reason: 'http_' + res.status };
  } catch (err) {
    return { state: 'failed', reason: err && err.name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}
