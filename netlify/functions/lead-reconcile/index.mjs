/**
 * Daily reconciliation, 07:00 UTC (08:00 Norwegian winter time, 09:00 in summer).
 *
 * The lead function stores every lead before it sends it anywhere. This job is the safety
 * net under that: it makes sure what is in storage is also where it should be.
 *
 *  1. Retention: delete leads older than the retention period, and stale rate-limit counters.
 *  2. Delivery: any lead from the last two days that Zapier never confirmed is sent again.
 *  3. ClickUp (only if CLICKUP_API_TOKEN is set): every lead Zapier confirmed more than an
 *     hour ago should have a task. A lead with none is reported.
 *  4. Anything wrong is sent as an alert (e-mail, and Slack if a webhook is set). A clean
 *     day is not reported: it is in the function log.
 *
 * The same lead_id never makes two tasks (the Zap starts with a Find Task on lead_id), so
 * sending a lead again is safe.
 */
import { campaigns as defaultCampaigns } from '../lead/campaigns.mjs';
import { createStore, dayOf } from '../lead/store.mjs';
import { deliverLead } from '../lead/deliver.mjs';
import { buildPayload } from '../lead/payload.mjs';
import { sendAlert } from '../lead/alert.mjs';

const CLICKUP = 'https://api.clickup.com/api/v2';
const HOUR = 3600000;
/* A scheduled function is stopped after 30 seconds. No new delivery is started after the first
   18, each one gets at most 6, and two in a row that fail mean the hook is down: the rest wait
   for tomorrow instead of using the minutes it would take to fail them one by one. */
const START_NEW_UNTIL_MS = 18000;
const PER_LEAD_MS = 6000;
const GIVE_UP_AFTER = 2;

/** lead_id values of the tasks created since sinceMs in one ClickUp list. null if it cannot be read. */
export async function clickupLeadIds({ token, listId, sinceMs, fetch: doFetch, fieldName = 'lead_id' }) {
  const ids = new Set();
  for (let page = 0; page < 10; page++) {
    const url = `${CLICKUP}/list/${encodeURIComponent(listId)}/task?include_closed=true&subtasks=false&date_created_gt=${sinceMs}&page=${page}`;
    const res = await doFetch(url, { headers: { Authorization: token, Accept: 'application/json' } });
    if (!res.ok) return null;
    const body = await res.json();
    const tasks = body.tasks || [];
    for (const t of tasks) {
      for (const f of t.custom_fields || []) {
        if (f.name === fieldName && f.value) ids.add(String(f.value));
      }
    }
    if (tasks.length < 100) break;
  }
  return ids;
}

export function createReconciler(deps = {}) {
  const campaigns = deps.campaigns || defaultCampaigns;
  const env = deps.env || (() => process.env);
  const doFetch = deps.fetch || globalThis.fetch;
  const nowFn = deps.now || (() => new Date());
  const sleep = deps.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const log = deps.log || ((o) => console.log(JSON.stringify(Object.assign({ evt: 'lead-reconcile' }, o))));
  const makeStore = deps.store || (() => createStore());

  return async function reconcile() {
    const e = env();
    const now = nowFn();
    const store = makeStore();
    const problems = [];
    const summary = { checked: 0, redelivered: 0, still_failing: 0, deferred: 0, missing_in_clickup: 0, deleted: 0 };
    const startedAt = nowFn().getTime();

    summary.deleted = await store.sweep({ now });

    const hook = e.ZAPIER_LEAD_HOOK || '';
    const hookOk = /^https:\/\/[^\s]+$/.test(hook);
    if (!hookOk) problems.push('ZAPIER_LEAD_HOOK is not set: stored leads cannot be delivered.');

    const days = [dayOf(new Date(now.getTime() - 24 * HOUR)), dayOf(now)];
    const leads = [];
    for (const day of new Set(days)) {
      for (const id of await store.listDay(day)) {
        const rec = await store.getLead(id);
        if (rec) leads.push(rec);
      }
    }
    summary.checked = leads.length;

    // 2. delivery
    const waiting = [];
    let failedInARow = 0;
    for (const rec of leads) {
      if (!rec.delivery || rec.delivery.state === 'ok' || !hookOk) continue;
      if (failedInARow >= GIVE_UP_AFTER || nowFn().getTime() - startedAt > START_NEW_UNTIL_MS) {
        waiting.push(rec.lead_id);
        continue;
      }
      const r = await deliverLead({
        rec, store, hook, env: e, fetch: doFetch, sleep, now: nowFn, log, buildPayload,
        deadline: nowFn().getTime() + PER_LEAD_MS, alert: null,
      });
      if (r.ok) { summary.redelivered++; failedInARow = 0; }
      else {
        summary.still_failing++;
        failedInARow++;
        problems.push(`Still not delivered: ${rec.values.company_name || rec.lead_id} (lead_id ${rec.lead_id}, ${rec.delivery.error}).`);
      }
    }
    if (waiting.length) {
      summary.deferred = waiting.length;
      problems.push(`${waiting.length} more lead${waiting.length === 1 ? ' was' : 's were'} not tried this run (the hook failed twice in a row, or time ran out). ` +
        `They are in storage and are tried again tomorrow: lead_id ${waiting.slice(0, 10).join(', ')}${waiting.length > 10 ? ' and others' : ''}.`);
    }

    // 3. ClickUp
    const token = e.CLICKUP_API_TOKEN;
    if (token) {
      const byList = new Map();
      for (const rec of leads) {
        if (!rec.delivery || rec.delivery.state !== 'ok') continue;
        if (now.getTime() - new Date(rec.delivery.at || rec.received_at).getTime() < HOUR) continue;
        const camp = campaigns[rec.campaign];
        const listId = camp && camp.cfg.clickup && camp.cfg.clickup.listId;
        if (!listId) continue;
        if (!byList.has(listId)) byList.set(listId, []);
        byList.get(listId).push(rec);
      }
      for (const [listId, recs] of byList) {
        const since = Math.min(...recs.map((r) => new Date(r.received_at).getTime())) - HOUR;
        let ids = null;
        try { ids = await clickupLeadIds({ token, listId, sinceMs: since, fetch: doFetch }); } catch (err) { ids = null; }
        if (!ids) { problems.push(`ClickUp list ${listId} could not be read, so leads were not compared.`); continue; }
        for (const rec of recs) {
          if (!ids.has(rec.lead_id)) {
            summary.missing_in_clickup++;
            problems.push(`In storage and sent to Zapier, but no ClickUp task: ${rec.values.company_name || rec.lead_id} (lead_id ${rec.lead_id}, ${rec.route}).`);
          }
        }
      }
    }

    log({ code: 'done', ...summary, problems: problems.length });
    if (problems.length) {
      await sendAlert({
        env: e, fetch: doFetch,
        subject: `Lead check: ${problems.length} problem${problems.length === 1 ? '' : 's'}`,
        text: `${summary.checked} leads in storage for ${days[0]} and ${days[1]}. ` +
          `${summary.redelivered} sent again, ${summary.still_failing} still failing, ${summary.deferred} left for tomorrow, ${summary.missing_in_clickup} without a ClickUp task.\n\n` +
          problems.map((p) => '- ' + p).join('\n'),
      });
    }
    return { summary, problems };
  };
}

export default async function handler() {
  const result = await createReconciler()();
  return new Response(JSON.stringify(result.summary), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

export const config = { schedule: '0 7 * * *' };
