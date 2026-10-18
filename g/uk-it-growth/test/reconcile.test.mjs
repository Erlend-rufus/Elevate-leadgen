import test from 'node:test';
import assert from 'node:assert/strict';
import { rig, post, GOOD, HOOK, ok, NOW, cfg, createStore, fakeBlobs } from './helpers.mjs';
import { createReconciler, clickupLeadIds } from '../../../netlify/functions/lead-reconcile/index.mjs';

const HOUR = 3600000;
const LIST = cfg.clickup.listId;

/**
 * Leads come from the real handler, so the records in storage are the records production
 * writes. zapier: what the hook answers while they are being created.
 */
async function seed({ zapier = () => ok('ok'), ids = ['l_one'], over = {} } = {}) {
  const r = rig({ responders: { zapier } });
  for (const id of ids) await r.handler(post(Object.assign({}, GOOD, { lead_id: id }, over)));
  return r;
}

/** A reconciler on the same storage, two hours after the leads were received. */
function reconciler(r, over = {}) {
  const calls = [];
  const logs = [];
  const responders = Object.assign({
    zapier: () => ok('ok'),
    resend: () => ok({ id: 'm' }),
    slack: () => ok('ok'),
    clickup: () => ok({ tasks: [] }),
  }, over.responders || {});
  const kind = (host) => (host === 'hooks.zapier.com' ? 'zapier' : host === 'api.resend.com' ? 'resend' : host === 'hooks.slack.com' ? 'slack' : host === 'api.clickup.com' ? 'clickup' : 'other');
  const env = Object.assign({}, r.env, over.env || {});
  for (const k of Object.keys(env)) if (env[k] === undefined) delete env[k];
  const run = createReconciler({
    campaigns: over.campaigns || r.campaigns,
    env: () => env,
    fetch: async (url, init = {}) => {
      const u = new URL(url);
      const body = init.body ? JSON.parse(init.body) : null;
      const call = { url: String(url), kind: kind(u.host), headers: init.headers || {}, body };
      calls.push(call);
      return responders[call.kind](call);
    },
    now: () => new Date(over.now || NOW.getTime() + 2 * HOUR),
    sleep: async () => {},
    log: (o) => logs.push(o),
    store: () => createStore({ blobs: r.blobs }),
  });
  return { run, calls, logs, of: (k) => calls.filter((c) => c.kind === k) };
}

test('a lead that was never delivered is delivered, and nothing is reported', async () => {
  const r = await seed({ zapier: () => ok('', 500) });
  assert.equal(r.blobs.lead('l_one').delivery.state, 'failed');
  const z = reconciler(r);
  const { summary, problems } = await z.run();
  assert.deepEqual(summary, { checked: 1, redelivered: 1, still_failing: 0, deferred: 0, missing_in_clickup: 0, deleted: 0 });
  assert.deepEqual(problems, []);
  assert.equal(r.blobs.lead('l_one').delivery.state, 'ok');
  assert.equal(z.of('zapier').length, 1);
  assert.equal(z.of('zapier')[0].body.lead_id, 'l_one');
  assert.equal(z.of('resend').length + z.of('slack').length, 0, 'a clean day is not reported');
  assert.ok(z.logs.some((l) => l.code === 'done'));
});

test('a lead that is already delivered is left alone', async () => {
  const r = await seed();
  const z = reconciler(r);
  const { summary } = await z.run();
  assert.equal(summary.checked, 1);
  assert.equal(summary.redelivered, 0);
  assert.equal(z.of('zapier').length, 0);
});

test('a lead that still cannot be delivered is reported by name, without anything a person typed', async () => {
  const r = await seed({ zapier: () => ok('', 500) });
  const z = reconciler(r, { responders: { zapier: () => ok('', 500) } });
  const { summary, problems } = await z.run();
  assert.equal(summary.still_failing, 1);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /Northbridge IT Limited \(lead_id l_one, http_500\)/);
  const mail = z.of('resend')[0].body;
  assert.equal(mail.subject, 'Lead check: 1 problem');
  assert.match(mail.text, /1 leads in storage for 2026-10-18 and 2026-10-19\. 0 sent again, 1 still failing, 0 left for tomorrow, 0 without a ClickUp task\./);
  assert.equal(z.of('slack').length, 1);
  for (const secret of ['alex@', 'Morgan', '07700']) assert.equal(mail.text.includes(secret), false, secret);
  assert.equal(r.blobs.lead('l_one').delivery.state, 'failed');
  assert.equal(r.blobs.lead('l_one').delivery.attempts, 6, 'three at the time and three now');
});

test('no hook set: nothing can be delivered, and that is said once', async () => {
  const r = await seed({ zapier: () => ok('', 500) });
  const z = reconciler(r, { env: { ZAPIER_LEAD_HOOK: undefined } });
  const { summary, problems } = await z.run();
  assert.equal(z.of('zapier').length, 0);
  assert.equal(summary.redelivered + summary.still_failing, 0);
  assert.deepEqual(problems, ['ZAPIER_LEAD_HOOK is not set: stored leads cannot be delivered.']);
});

test('yesterday\'s leads are checked as well as today\'s, and older ones are not', async () => {
  const r = await seed({ zapier: () => ok('', 500), ids: ['l_today'] });
  // one from yesterday, one from three days ago
  for (const [id, daysAgo] of [['l_yesterday', 1], ['l_old', 3]]) {
    const rec = JSON.parse(JSON.stringify(r.blobs.lead('l_today')));
    rec.lead_id = id;
    rec.received_at = new Date(NOW.getTime() - daysAgo * 86400000).toISOString();
    await createStore({ blobs: r.blobs }).createLead(rec);
  }
  const z = reconciler(r);
  const { summary } = await z.run();
  assert.equal(summary.checked, 2);
  assert.deepEqual(z.of('zapier').map((c) => c.body.lead_id).sort(), ['l_today', 'l_yesterday']);
  assert.equal(r.blobs.lead('l_old').delivery.state, 'failed', 'the day before yesterday is outside the check');
});

/* ---------------------------------------------------------------------------------- ClickUp */

const tasks = (...ids) => ({ tasks: ids.map((id) => ({ custom_fields: [{ name: 'other', value: 'x' }, { name: 'lead_id', value: id }] })) });

test('ClickUp: every lead Zapier confirmed has a task, and nothing is reported', async () => {
  const r = await seed({ ids: ['l_a', 'l_b'] });
  const z = reconciler(r, { env: { CLICKUP_API_TOKEN: 'pk_test' }, responders: { clickup: () => ok(tasks('l_a', 'l_b', 'l_other')) } });
  const { summary, problems } = await z.run();
  assert.equal(summary.missing_in_clickup, 0);
  assert.deepEqual(problems, []);
  const [call] = z.of('clickup');
  assert.equal(call.headers.Authorization, 'pk_test', 'a ClickUp token is sent as it is');
  assert.match(call.url, new RegExp(`/list/${LIST}/task\\?include_closed=true&subtasks=false&date_created_gt=\\d+&page=0$`));
  assert.equal(z.of('clickup').length, 1, 'one list, one read');
});

test('ClickUp: a lead with no task is reported with its lead id and route', async () => {
  const r = await seed({ ids: ['l_a', 'l_b'] });
  const z = reconciler(r, { env: { CLICKUP_API_TOKEN: 'pk_test' }, responders: { clickup: () => ok(tasks('l_a')) } });
  const { summary, problems } = await z.run();
  assert.equal(summary.missing_in_clickup, 1);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /no ClickUp task: Northbridge IT Limited \(lead_id l_b, fit\)/);
  assert.equal(z.of('resend').length, 1);
});

test('ClickUp: a lead delivered less than an hour ago has not been given time yet', async () => {
  const r = await seed();
  const z = reconciler(r, { now: NOW.getTime() + 30 * 60000, env: { CLICKUP_API_TOKEN: 'pk_test' }, responders: { clickup: () => ok(tasks()) } });
  const { summary } = await z.run();
  assert.equal(summary.missing_in_clickup, 0);
  assert.equal(z.of('clickup').length, 0);
});

test('ClickUp: a lead Zapier never confirmed is not expected to have a task', async () => {
  const r = await seed({ zapier: () => ok('', 500) });
  const z = reconciler(r, { env: { CLICKUP_API_TOKEN: 'pk_test' }, responders: { zapier: () => ok('', 500), clickup: () => ok(tasks()) } });
  const { summary } = await z.run();
  assert.equal(summary.still_failing, 1);
  assert.equal(summary.missing_in_clickup, 0, 'reported once, as undelivered');
  assert.equal(z.of('clickup').length, 0);
});

test('ClickUp: without a token it is not asked', async () => {
  const r = await seed();
  const z = reconciler(r);
  await z.run();
  assert.equal(z.of('clickup').length, 0);
});

test('ClickUp: a list that cannot be read is said so, not guessed at', async () => {
  const r = await seed();
  const z = reconciler(r, { env: { CLICKUP_API_TOKEN: 'pk_test' }, responders: { clickup: () => ok('', 401) } });
  const { problems, summary } = await z.run();
  assert.deepEqual(problems, [`ClickUp list ${LIST} could not be read, so leads were not compared.`]);
  assert.equal(summary.missing_in_clickup, 0);
  const z2 = reconciler(r, { env: { CLICKUP_API_TOKEN: 'pk_test' }, responders: { clickup: () => { throw new TypeError('x'); } } });
  assert.equal((await z2.run()).problems.length, 1);
});

test('ClickUp: a campaign with no list is skipped', async () => {
  const r = await seed();
  const campaigns = { [cfg.campaign]: Object.assign({}, r.campaigns[cfg.campaign], { cfg: Object.assign({}, cfg, { clickup: {} }) }) };
  const z = reconciler(r, { campaigns, env: { CLICKUP_API_TOKEN: 'pk_test' } });
  await z.run();
  assert.equal(z.of('clickup').length, 0);
});

test('clickupLeadIds: reads every page until a short one, keeps only the lead_id field, and gives up with null', async () => {
  const pages = [
    { tasks: Array.from({ length: 100 }, (_, i) => ({ custom_fields: [{ name: 'lead_id', value: 'p0_' + i }] })) },
    { tasks: [{ custom_fields: [{ name: 'lead_id', value: 'p1_0' }, { name: 'Lead ID', value: 'ignored' }] }, { custom_fields: [{ name: 'lead_id', value: '' }] }, { custom_fields: null }, {}] },
  ];
  const urls = [];
  const ids = await clickupLeadIds({
    token: 't', listId: '9', sinceMs: 5,
    fetch: async (u) => { urls.push(u); return ok(pages[urls.length - 1]); },
  });
  assert.equal(ids.size, 101);
  assert.ok(ids.has('p0_99') && ids.has('p1_0'));
  assert.equal(ids.has('ignored'), false);
  assert.equal(urls.length, 2);
  assert.match(urls[1], /page=1$/);
  assert.equal(await clickupLeadIds({ token: 't', listId: '9', sinceMs: 5, fetch: async () => ok('', 500) }), null);
});

/* ------------------------------------------------------------------------------ retention */

test('leads older than a year are deleted with their index entries; this is counted', async () => {
  const r = await seed();
  const old = JSON.parse(JSON.stringify(r.blobs.lead('l_one')));
  old.lead_id = 'l_ancient';
  old.received_at = new Date(NOW.getTime() - 400 * 86400000).toISOString();
  await createStore({ blobs: r.blobs }).createLead(old);
  const z = reconciler(r);
  const { summary } = await z.run();
  assert.equal(summary.deleted, 1);
  assert.equal(r.blobs.lead('l_ancient'), null);
  assert.ok(r.blobs.lead('l_one'));
});

test('stale hourly counters are removed, this hour\'s is kept', async () => {
  const r = await seed();
  const s = createStore({ blobs: r.blobs });
  await s.rateHit({ ipHash: 'old', hour: '2026101800', limit: 12 });
  const keysBefore = [...r.blobs.m.keys()].filter((k) => k.startsWith('rl/'));
  assert.equal(keysBefore.length, 2);
  await reconciler(r, { now: NOW.getTime() + HOUR }).run();
  const after = [...r.blobs.m.keys()].filter((k) => k.startsWith('rl/'));
  assert.equal(after.length, 0, 'at 10:00 both the 09:00 counter and yesterday\'s are past');
});

test('the reconciler is idempotent: a second run on the same day changes nothing', async () => {
  const r = await seed({ zapier: () => ok('', 500) });
  const z = reconciler(r);
  const first = await z.run();
  const second = await z.run();
  assert.equal(first.summary.redelivered, 1);
  assert.equal(second.summary.redelivered, 0);
  assert.equal(z.of('zapier').length, 1);
});

test('what is sent again is the same payload as the first time', async () => {
  const r = await seed({ zapier: () => ok('', 500) });
  const original = r.of('zapier')[0].body;
  const z = reconciler(r);
  await z.run();
  assert.deepEqual(z.of('zapier')[0].body, original);
  assert.equal(z.of('zapier')[0].url, HOOK);
});

test('with no storage at all, the job says so and stops there', async () => {
  const r = await seed();
  const run = createReconciler({
    campaigns: r.campaigns, env: () => r.env, fetch: async () => ok('ok'), now: () => new Date(NOW.getTime() + 2 * HOUR),
    sleep: async () => {}, log: () => {}, store: () => { throw new Error('no blobs'); },
  });
  await assert.rejects(() => run(), /no blobs/);
  assert.ok(fakeBlobs);
});

test('a hook that is down is tried on two leads, not on all of them: the rest wait for tomorrow', async () => {
  const ids = ['l_1', 'l_2', 'l_3', 'l_4', 'l_5'];
  const r = await seed({ zapier: () => ok('', 500), ids });
  const z = reconciler(r, { responders: { zapier: () => ok('', 500) } });
  const { summary, problems } = await z.run();
  assert.equal(summary.still_failing, 2);
  assert.equal(summary.deferred, 3);
  assert.equal(z.of('zapier').length, 6, 'three tries on each of two leads');
  assert.equal(problems.length, 3);
  assert.match(problems[2], /3 more leads were not tried this run .* tomorrow: lead_id l_3, l_4, l_5\./);
  assert.match(z.of('resend')[0].body.text, /2 still failing, 3 left for tomorrow/);
});

test('one success resets the count: a hook that came back is used for the rest', async () => {
  const ids = ['l_1', 'l_2', 'l_3', 'l_4'];
  const r = await seed({ zapier: () => ok('', 500), ids });
  const z = reconciler(r, { responders: { zapier: () => ok('ok') } });
  const { summary } = await z.run();
  assert.equal(summary.redelivered, 4);
  assert.equal(summary.deferred, 0);
});

test('no new delivery is started after eighteen seconds, and the lead that is left is said so', async () => {
  const r = await seed({ zapier: () => ok('', 500), ids: ['l_1', 'l_2', 'l_3'] });
  let clock = NOW.getTime() + 2 * HOUR;
  const run = createReconciler({
    campaigns: r.campaigns, env: () => r.env, store: () => createStore({ blobs: r.blobs }), sleep: async () => {}, log: () => {},
    now: () => new Date(clock),
    // each delivery takes ten seconds
    fetch: async (url) => { const u = new URL(url); if (u.host === 'hooks.zapier.com') { clock += 10000; return ok('ok'); } return ok({}); },
  });
  const { summary, problems } = await run();
  assert.equal(summary.redelivered, 2, 'the third would have started at twenty seconds');
  assert.equal(summary.deferred, 1);
  assert.match(problems[0], /1 more lead was not tried this run/);
});
