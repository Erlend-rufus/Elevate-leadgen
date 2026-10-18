/**
 * Alerts to a person. Two channels, either optional, so one failing does not hide the other:
 *
 *   e-mail   via Resend (https://resend.com). RESEND_API_KEY, ALERT_EMAIL_FROM (an address
 *            on a domain verified in Resend), ALERT_EMAIL_TO (defaults to the contact address).
 *   Slack    an incoming webhook. SLACK_ALERT_WEBHOOK_URL.
 *
 * The e-mail is deliberately not sent through Zapier: the case it exists for is Zapier being
 * down. Resend is the first choice and a placeholder for whichever service is decided; the
 * service has to be listed as a processor in the privacy notice. Swapping it is this file only.
 *
 * What goes in a message: the lead id and the company name, as agreed. No e-mail address,
 * phone number or free text.
 */
export async function sendAlert({ env, fetch: doFetch = globalThis.fetch, subject, text, to, timeoutMs = 3000 }) {
  const results = { email: 'skipped', slack: 'skipped' };
  const jobs = [];

  if (env.RESEND_API_KEY && env.ALERT_EMAIL_FROM) {
    jobs.push(post(doFetch, 'https://api.resend.com/emails', {
      Authorization: 'Bearer ' + env.RESEND_API_KEY,
    }, { from: env.ALERT_EMAIL_FROM, to: [to || env.ALERT_EMAIL_TO || 'post@elevatemarketing.no'], subject, text }, timeoutMs)
      .then((ok) => { results.email = ok ? 'ok' : 'failed'; }));
  }
  if (/^https:\/\/hooks\.slack\.com\//.test(env.SLACK_ALERT_WEBHOOK_URL || '')) {
    jobs.push(post(doFetch, env.SLACK_ALERT_WEBHOOK_URL, {}, { text: `*${subject}*\n${text}` }, timeoutMs)
      .then((ok) => { results.slack = ok ? 'ok' : 'failed'; }));
  }
  await Promise.all(jobs);
  return results;
}

async function post(doFetch, url, headers, body, timeoutMs) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await doFetch(url, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    return res.ok;
  } catch (e) {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
