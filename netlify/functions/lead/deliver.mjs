/**
 * Delivery to the Zapier Catch Hook. Three attempts with a growing pause, inside a time
 * budget: the whole function has to answer well within Netlify's ten seconds, so an attempt
 * is not started that cannot finish before the deadline. A lead that is not delivered here
 * is already in storage; the daily reconciliation delivers it later.
 *
 * Retried: network errors, timeouts, 429 and 5xx. Not retried: any other 4xx, which means
 * the hook itself is wrong (turned off, deleted, mistyped) and another try changes nothing.
 * A redirect is not delivery either (redirect: 'manual'), so a hook that bounces us
 * elsewhere is reported as a failure and not trusted.
 */
export async function deliverToZapier({
  url, payload, fetch: doFetch = globalThis.fetch, sleep, now = Date.now, deadline,
  attempts = 3, waitsMs = [300, 800], attemptTimeoutMs = 2500, minAttemptMs = 700,
}) {
  let last = { ok: false, attempts: 0, error: 'not_attempted' };
  for (let i = 0; i < attempts; i++) {
    const remaining = deadline - now();
    if (i > 0 && remaining < minAttemptMs) break;
    if (i === 0 && remaining < 300) break;
    const timeout = Math.max(300, Math.min(attemptTimeoutMs, remaining - 100));
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeout);
    let retry = true;
    try {
      const res = await doFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctl.signal,
        redirect: 'manual',
      });
      last = { ok: res.ok, attempts: i + 1, status: res.status, error: res.ok ? '' : 'http_' + res.status };
      if (res.ok) return last;
      retry = res.status === 429 || res.status >= 500;
    } catch (err) {
      last = { ok: false, attempts: i + 1, error: err && err.name === 'AbortError' ? 'timeout' : 'network' };
    } finally {
      clearTimeout(timer);
    }
    if (!retry) break;
    if (i < attempts - 1) {
      const wait = waitsMs[Math.min(i, waitsMs.length - 1)];
      if (deadline - now() <= wait + minAttemptMs) break;
      await sleep(wait);
    }
  }
  return last;
}

/**
 * Delivers a stored lead and records the outcome on it (rec.delivery). On failure it sends
 * the alert and leaves the lead "failed", so the daily reconciliation tries again.
 * store: pass it when the lead is stored (then it is saved here unless skipSave); null when
 * storage was unavailable, which changes what the alert says.
 * Returns {ok}.
 */
export async function deliverLead({
  rec, store, skipSave, hook, env, fetch: doFetch = globalThis.fetch, sleep, now, deadline, log, alert, buildPayload,
}) {
  const payload = buildPayload({
    leadId: rec.lead_id, campaign: rec.campaign, route: rec.route, reasons: rec.reasons,
    submittedAt: rec.received_at, values: rec.values, ch: rec.ch, tracking: rec.tracking,
  });
  const r = await deliverToZapier({ url: hook, payload, fetch: doFetch, sleep, now: () => now().getTime(), deadline });
  rec.delivery = {
    state: r.ok ? 'ok' : 'failed',
    attempts: (rec.delivery && rec.delivery.attempts ? rec.delivery.attempts : 0) + r.attempts,
    error: r.ok ? '' : r.error,
    at: now().toISOString(),
  };
  if (!r.ok) {
    log({ code: 'zap_failed', lead_id: rec.lead_id, error: r.error, attempts: r.attempts });
    if (alert) {
      try {
        await alert({
          subject: `Lead not delivered to Zapier: ${rec.values.company_name || rec.lead_id}`,
          text: `lead_id: ${rec.lead_id}\ncampaign: ${rec.campaign}\ncompany: ${rec.values.company_name}\nroute: ${rec.route}\n` +
            `error: ${r.error} after ${r.attempts} attempts\n\n` +
            (store
              ? 'The lead is stored and will be delivered again by the daily reconciliation (07:00 UTC). Until then it is not in ClickUp or Slack.'
              : 'The lead could NOT be stored either. The visitor was shown an error and still has the answers on screen.'),
        });
      } catch (err) { log({ code: 'alert_error' }); }
    }
  }
  if (store && !skipSave) {
    try { await store.saveLead(rec); } catch (err) { log({ code: 'save_error', lead_id: rec.lead_id }); }
  }
  return { ok: r.ok };
}
