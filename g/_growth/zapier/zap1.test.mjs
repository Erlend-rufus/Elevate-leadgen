import fs from 'node:fs';
import assert from 'node:assert/strict';

const truth = JSON.parse(fs.readFileSync(new URL('./truth.json', import.meta.url), 'utf8'));
const mod = await import('./out/zap1-lead-to-clickup-slack.mjs');
const wf = mod.default;

// ---------------------------------------------------------------- fakes
const LIST = '901522580321'; // IT - UK - Commision
const HEALTH_LIST = '1201270000003578'; // HEALTH - UK - Commission
const LAW_LIST = '1201270000003579'; // LAW - UK - Commission
const LISTS = new Set([LIST, HEALTH_LIST, LAW_LIST]);
const KNOWN_TAGS = new Set(['growth-2m', 'growth-health', 'growth-law', 'sjekk-størrelse', 'ta-opp-om-3-mnd', 'booket-uten-skjema', 'test', 'old-import', 'vurder-nettside']);
const SONDRE = 106690144;
const KNOWN_STATUS = new Set(['ny lead', 'møte booket', 'klar for deal', 'ukvalifisert - archive', 'kontaktet', 'møte booket - noshow']);

function makeWorld(opts = {}) {
  const w = { tasks: [], slack: [], calls: [], nextId: 1, opts, failNext: [] };
  const reply = (status, json) => ({
    ok: status >= 200 && status < 300, status,
    text: async () => (typeof json === 'string' ? json : JSON.stringify(json)),
  });
  w.fetch = async (url, init = {}) => {
    const method = init.method || 'GET';
    const u = new URL(url);
    const path = u.pathname.replace('/api/v2', '');
    const body = init.body ? JSON.parse(init.body) : undefined;
    w.calls.push({ method, path, query: u.search, body });
    assert.equal(init.connection, 'clickup_main', 'ClickUp calls must use the clickup_main alias');
    if (w.failNext.length && w.failNext[0].match(method, path)) {
      const f = w.failNext.shift();
      return reply(f.status, f.body || { err: 'forced', ECODE: 'X' });
    }
    // GET /list/:id/task
    let m = path.match(/^\/list\/(\d+)\/task$/);
    if (m && method === 'GET') {
      assert.ok(LISTS.has(m[1]), 'search on a known list: ' + m[1]);
      const cf = JSON.parse(u.searchParams.get('custom_fields') || '[]');
      assert.equal(u.searchParams.get('include_closed'), 'true');
      let tasks = w.tasks.filter((t) => t.list === m[1]);
      if (w.opts.ignoreFilter) tasks = w.tasks.filter((t) => t.list === m[1]); // a search that ignores the filter
      else for (const f of cf) tasks = tasks.filter((t) => (t.custom_fields.find((c) => c.id === f.field_id) || {}).value === f.value);
      return reply(200, { tasks: tasks.map(fullTask), last_page: true });
    }
    if (m && method === 'POST') {
      assert.ok(LISTS.has(m[1]), 'create on a known list: ' + m[1]);
      if (w.opts.rejectFields && body.custom_fields) return reply(400, { err: 'Custom field value invalid', ECODE: 'FIELD_X' });
      const errs = [];
      if (!KNOWN_STATUS.has(body.status)) errs.push('status');
      for (const t of body.tags || []) if (!KNOWN_TAGS.has(t)) errs.push('tag ' + t);
      for (const c of body.custom_fields || []) {
        const def = truth[c.id];
        if (!def) { errs.push('field ' + c.id); continue; }
        if (def.type === 'drop_down' && !def.options[c.value]) errs.push('option ' + c.value);
        if (def.type === 'email' && !String(c.value).includes('@')) errs.push('email');
      }
      if (errs.length) return reply(400, { err: 'bad: ' + errs.join(','), ECODE: 'BAD' });
      const id = 'T' + w.nextId++;
      const t = { id, list: m[1], name: body.name, description: body.markdown_description, status: body.status, priority: body.priority ?? null,
        assignees: body.assignees || [], tags: body.tags || [], due_date: body.due_date ?? null, custom_fields: (body.custom_fields || []).map((c) => ({ ...c })), comments: [], commentFlags: [] };
      w.tasks.push(t);
      return reply(200, { id, url: 'https://app.clickup.com/t/' + id, name: t.name });
    }
    // POST /task/:id/field/:fid
    m = path.match(/^\/task\/([^/]+)\/field\/([^/]+)$/);
    if (m && method === 'POST') {
      const t = w.tasks.find((x) => x.id === m[1]);
      if (!t) return reply(404, { err: 'no task' });
      const def = truth[m[2]];
      if (!def) return reply(404, { err: 'no field' });
      if (def.type === 'phone' && !/^\+\d{8,15}$/.test(body.value)) return reply(400, { err: 'phone invalid' });
      if (w.opts.badFieldOnSingleSet && m[2] === w.opts.badFieldOnSingleSet) return reply(400, { err: 'forced one-field failure' });
      const ex = t.custom_fields.find((c) => c.id === m[2]);
      if (ex) ex.value = body.value; else t.custom_fields.push({ id: m[2], value: body.value });
      return reply(200, {});
    }
    m = path.match(/^\/task\/([^/]+)\/comment$/);
    if (m && method === 'POST') {
      const t = w.tasks.find((x) => x.id === m[1]);
      t.comments.push(body.comment_text);
      t.commentFlags.push({ notify_all: body.notify_all });
      return reply(200, { id: 1 });
    }
    // POST /task/:id/tag/:name  (the name is in the path; a tag the space does not have is refused until it is made)
    m = path.match(/^\/task\/([^/]+)\/tag\/([^/]+)$/);
    if (m && method === 'POST') {
      const t = w.tasks.find((x) => x.id === m[1]);
      if (!t) return reply(404, { err: 'no task' });
      const name = decodeURIComponent(m[2]);
      if (!KNOWN_TAGS.has(name)) return reply(404, { err: 'Tag does not exist', ECODE: 'TAG_001' });
      if (!t.tags.includes(name)) t.tags.push(name);
      return reply(200, {});
    }
    m = path.match(/^\/list\/(\d+)$/);
    if (m && method === 'GET') return reply(200, { id: m[1], space: { id: 'S1' } });
    m = path.match(/^\/space\/([^/]+)\/tag$/);
    if (m && method === 'POST') {
      KNOWN_TAGS.add(body.tag.name);
      return reply(200, {});
    }
    throw new Error('unexpected ClickUp call ' + method + ' ' + path);
  };
  const fullTask = (t) => ({ id: t.id, url: 'https://app.clickup.com/t/' + t.id, tags: t.tags.map((name) => ({ name })), custom_fields: t.custom_fields.map((c) => ({ id: c.id, name: truth[c.id].name, value: c.value })) });
  w.runAction = async (args) => {
    assert.equal(args.appKey, 'SlackCLIAPI');
    assert.equal(args.actionType, 'write');
    assert.equal(args.actionKey, 'channel_message');
    assert.equal(args.connection, 'slack_main');
    assert.equal(args.inputs.channel, 'C0CAA3726DS');
    assert.equal(args.inputs.as_bot, 'yes');
    assert.equal(args.inputs.add_edit_link, 'no');
    w.slack.push(args.inputs.text);
    return { data: [{ ts: '1700000000.000100', channel: 'C0CAA3726DS' }], nextCursor: undefined };
  };
  return w;
}

async function run(world, input) {
  globalThis.__fake = world;
  const log = [];
  const ctx = {
    async step(spec, fn) {
      const name = typeof spec === 'string' ? spec : spec.name;
      const run = typeof spec === 'string' ? fn : spec.run;
      const attempts = typeof spec === 'string' ? 1 : spec.maxAttempts || 1;
      let lastErr;
      for (let i = 1; i <= attempts; i++) {
        try { const r = await run(); log.push({ name, attempt: i, ok: true }); return JSON.parse(JSON.stringify(r)); }
        catch (e) { lastErr = e; log.push({ name, attempt: i, ok: false, err: String(e.message || e).slice(0, 120) }); }
      }
      throw lastErr;
    },
  };
  const out = await wf.run(ctx, input);
  return { out, log };
}

// ---------------------------------------------------------------- payloads
const base = {
  lead_id: 'l_test_fit_0001', campaign: 'uk-it-growth', route: 'fit', route_reason: 'turnover_2m_plus',
  submitted_at: '2026-10-18T22:00:00Z', company_name: 'TEST Leadflow Fit Ltd', company_website: 'testleadflow.example',
  company_number: '99999999', ch_status: 'active', ch_accounts_type: 'small', ch_incorporated: '2016-03-14', ch_check: 'ok',
  specialism: 'Managed IT services', practice_areas: '', sra_number: '', turnover_band: '£2m to under £5m',
  trading_years: 'More than five years', employees_or_fee_earners: '25 to 49', marketing_spend: '£5,000 to under £15,000',
  first_year_value: '£10k to under £25k', sales_cycle: 'One to under three months', target_next_year: '£6m',
  decision_maker: 'Me', capacity: 'Four to ten', first_name: 'Test', last_name: 'Fit', job_title: 'Managing director',
  email: 'test-fit@example.invalid', mobile: '', utm_source: 'meta', utm_medium: 'paid', utm_campaign: 'A2', utm_content: 'A2-V1',
  utm_term: '', fbclid: 'IwAR_test', page_slug: 'uk-it-growth', referrer: 'https://l.facebook.com/',
};
const withLead = (o) => ({ ...base, ...o });
const optName = (t, fid) => { const c = t.custom_fields.find((x) => x.id === fid); return c ? (truth[fid].options ? truth[fid].options[c.value] : c.value) : undefined; };
const F = { leadId: '08cf9ecc-ff51-4296-9e03-c5250ebb7abf', web: '09d8fbaa-d659-4b44-9738-39fcf5c6f25b', spend: '13229225-75e5-4729-bd8d-eb69c20e80b2', team: '18957c8f-f573-4790-957c-11812dd3aa04', value: '189cd0e5-2c7d-4c43-a94b-9ad280a4ad53', tier: '668b1a6a-4054-4b24-ac3c-55432d7c2b3e', email: '78c13487-0fee-46d2-893f-68b212b09e6b', crm: '8289eaa9-7492-40eb-a35d-092c51bd01ac', contact: '8fb666f4-c213-4f7a-a8ce-627e496a8313', phone: 'a0c06e36-5028-4b86-af93-c57de3ad2418', spec: 'ce2deb01-0b47-45c6-8bf5-dbdc67f9962d', job: 'cf254478-a92a-4805-921a-a89ba06c69a0', stage: 'f4bfea58-b05c-4427-ba1c-b4aa61200583' };

let passed = 0;
const ok = (cond, label) => { assert.ok(cond, label); passed++; };
const eq = (a, b, label) => { assert.deepEqual(a, b, label); passed++; };

// ---------------------------------------------------------------- 1. fit test lead: task, no Slack
{
  const w = makeWorld();
  const { out } = await run(w, withLead({}));
  const t = w.tasks[0];
  eq(w.tasks.length, 1, 'one task');
  eq(t.status, 'ny lead', 'fit status'); eq(t.priority, 2, 'fit priority high');
  eq(t.tags, ['growth-2m', 'test'], 'tags fit test');
  eq(t.name, 'TEST Leadflow Fit Ltd · Test Fit', 'name');
  eq(optName(t, F.leadId), 'l_test_fit_0001', 'lead_id'); eq(optName(t, F.crm), 'Lead', 'crm type'); eq(optName(t, F.stage), 'Lead Qualification', 'stage');
  eq(optName(t, F.tier), 'Tier 1', 'tier'); eq(optName(t, F.contact), 'Test Fit', 'contact'); eq(optName(t, F.email), 'test-fit@example.invalid', 'email');
  eq(optName(t, F.job), 'Managing director', 'job'); eq(optName(t, F.web), 'https://testleadflow.example', 'website with scheme');
  eq(optName(t, F.spec), 'Managed IT services / MSP', 'specialism'); eq(optName(t, F.spend), '£5k+/mth', 'spend fits'); eq(optName(t, F.value), '£10k-£30k', 'value fits');
  eq(optName(t, F.team), undefined, 'team size 25 to 49 straddles two ClickUp bands: not set');
  ok(t.description.includes('25 to 49'), 'exact answer in description');
  ok(t.description.includes('[99999999](https://find-and-update.company-information.service.gov.uk/company/99999999)'), 'CH link');
  eq(w.slack.length, 0, 'test lead does not post to Slack'); eq(out.slack.posted, false, 'slack not posted');
  eq(out.phone.set, false, 'no phone');
  console.log('1 ok');
}
// ---------------------------------------------------------------- 2. slack_test posts, message text
{
  const w = makeWorld();
  const { out } = await run(w, withLead({ slack_test: true }));
  eq(w.slack.length, 1, 'posted once'); eq(out.slack.posted, true, 'posted flag');
  const msg = w.slack[0];
  console.log('--- Slack (fit, test) ---\n' + msg + '\n---');
  ok(msg.startsWith('[TEST] *FIT* · UK IT · TEST Leadflow Fit Ltd\n'), 'head');
  ok(msg.includes('£2m to under £5m · 25 to 49 ansatte · Companies House: small, stiftet 2016'), 'line 2');
  ok(msg.includes('Verdi første år: £10k to under £25k · Salgssyklus: One to under three months'), 'line 3');
  ok(msg.includes('Kapasitet: Four to ten · Beslutter: Me'), 'line 4');
  ok(msg.includes('Kilde: meta / A2-V1'), 'source');
  ok(msg.includes('ClickUp: <https://app.clickup.com/t/T1|åpne oppgaven>'), 'link');
  ok(!msg.includes('⚠'), 'no warning on ok');
  ok(!msg.includes('example.invalid') && !msg.includes('Managing director') && !msg.includes('testleadflow') && !msg.includes('£6m'), 'no e-mail, role, website or free text in Slack');
  console.log('2 ok');
}
// ---------------------------------------------------------------- 3. real fit lead (not a test): posts, no [TEST]
{
  const w = makeWorld();
  const { out } = await run(w, withLead({ lead_id: 'l_real_0001', email: 'person@acme-it.co.uk' }));
  eq(w.slack.length, 1, 'real lead posts'); ok(w.slack[0].startsWith('*FIT* · UK IT'), 'no TEST prefix');
  eq(w.tasks[0].tags, ['growth-2m'], 'no test tag');
  ok(out.slack.posted, 'posted');
  console.log('3 ok');
}
// ---------------------------------------------------------------- 4. review with mismatch, other, phone
{
  const w = makeWorld();
  const { out } = await run(w, withLead({
    lead_id: 'l_test_review_0001', route: 'review', route_reason: 'ch_accounts_too_small', ch_check: 'mismatch', ch_accounts_type: 'micro-entity',
    specialism: 'Other: Quantum plumbing', marketing_spend: 'I do not know', first_year_value: '£150k or more', employees_or_fee_earners: '100 or more',
    mobile: '07700 900123', slack_test: 'true', company_name: 'TEST <Review> & Co', email: 'test-review@example.invalid' }));
  const t = w.tasks[0];
  eq(t.status, 'ny lead', 'review status'); eq(t.priority, 3, 'review priority'); eq(t.tags, ['growth-2m', 'sjekk-størrelse', 'test'], 'review tags');
  eq(optName(t, F.tier), 'Tier 2', 'tier 2'); eq(optName(t, F.spec), 'Other', 'other'); eq(optName(t, F.spend), 'Unknown', 'unknown spend');
  eq(optName(t, F.value), '£150k+', '150k'); eq(optName(t, F.team), '50+', '100 or more -> 50+');
  eq(optName(t, F.phone), '+447700900123', 'phone normalised'); eq(out.phone.set, true, 'phone set');
  const msg = w.slack[0];
  console.log('--- Slack (review) ---\n' + msg + '\n---');
  ok(msg.includes('TEST &lt;Review&gt; &amp; Co'), 'escaped');
  ok(msg.includes('Companies House: micro-entity, stiftet 2016'), 'ch line');
  ok(msg.trimEnd().endsWith('⚠ Størrelse ikke bekreftet, sjekk før møtet'), 'warning line');
  ok(!msg.includes('07700') && !msg.includes('Quantum'), 'no phone or free text in Slack');
  ok(t.description.includes('Quantum plumbing') && t.description.includes('07700 900123'), 'description has them');
  console.log('4 ok');
}
// ---------------------------------------------------------------- 5. not_now and not_a_fit
{
  const w = makeWorld();
  const before = Date.now();
  await run(w, withLead({ lead_id: 'l_test_notnow_0001', route: 'not_now', route_reason: 'turnover_below_2m', specialism: 'Cybersecurity', marketing_spend: 'Under £1,000', first_year_value: 'Under £10k', employees_or_fee_earners: 'Under 10', slack_test: true }));
  await run(w, withLead({ lead_id: 'l_test_notafit_0001', route: 'not_a_fit', route_reason: 'capacity_none', specialism: 'Software development', capacity: 'None, we are at capacity', slack_test: true }));
  const [a, b] = w.tasks;
  eq(a.status, 'ukvalifisert - archive', 'not_now status'); eq(a.priority, null, 'no priority'); eq(a.tags, ['growth-2m', 'ta-opp-om-3-mnd', 'test'], 'not_now tags');
  ok(a.due_date >= before + 89 * 86400000 && a.due_date <= Date.now() + 91 * 86400000, 'due in 90 days');
  eq(optName(a, F.spend), 'Under £1k/mth', 'under 1k'); eq(optName(a, F.value), 'Under £10k', 'under 10k'); eq(optName(a, F.tier), 'Tier 3', 'tier 3'); eq(optName(a, F.spec), 'Cybersecurity', 'cyber');
  eq(optName(a, F.team), undefined, 'Under 10 straddles');
  eq(b.status, 'ukvalifisert - archive', 'not_a_fit status'); eq(b.tags, ['growth-2m', 'vurder-nettside', 'test'], 'not_a_fit tags'); eq(b.due_date, null, 'no due date');
  eq(optName(b, F.spec), 'Software development', 'sw dev');
  eq(w.slack.length, 1, 'not_now never posts; not_a_fit posts one compact line when slack_test is on');
  eq(b.assignees, [], 'a test lead is never assigned');
  console.log('5 ok');
}
// ---------------------------------------------------------------- 6. same lead twice -> one task, no second Slack
{
  const w = makeWorld();
  await run(w, withLead({ lead_id: 'l_dup_0001', email: 'dup@acme-it.co.uk' }));
  const { out } = await run(w, withLead({ lead_id: 'l_dup_0001', email: 'dup@acme-it.co.uk' }));
  eq(w.tasks.length, 1, 'still one task'); eq(out.deduped, true, 'deduped'); eq(w.slack.length, 1, 'Slack once');
  console.log('6 ok');
}
// ---------------------------------------------------------------- 6b. search that ignores the filter is never trusted
{
  const w = makeWorld({ ignoreFilter: true });
  await run(w, withLead({ lead_id: 'l_a_0001', email: 'a@acme-it.co.uk' }));
  const { out } = await run(w, withLead({ lead_id: 'l_b_0001', email: 'b@acme-it.co.uk' }));
  eq(w.tasks.length, 2, 'second lead gets its own task'); eq(out.deduped, false, 'not deduped');
  console.log('6b ok');
}
// ---------------------------------------------------------------- 7. ClickUp refuses the custom fields: task still made, fields set one by one
{
  const w = makeWorld({ rejectFields: true, badFieldOnSingleSet: F.web });
  const { out, log } = await run(w, withLead({ lead_id: 'l_salvage_0001', email: 'salvage@acme-it.co.uk' }));
  eq(w.tasks.length, 1, 'task made without fields first'); eq(out.fieldsDropped, true, 'flag');
  ok(out.salvage.failed.length === 1 && out.salvage.failed[0].startsWith(F.web), 'one field failed');
  ok(out.salvage.set >= 10, 'rest were set one by one: ' + out.salvage.set);
  eq(w.tasks[0].comments.length, 1, 'comment explains'); ok(w.tasks[0].comments[0].includes(F.web), 'comment names field');
  eq(w.slack.length, 1, 'Slack still posted'); eq(optName(w.tasks[0], F.spec), 'Managed IT services / MSP', 'specialism set via salvage');
  console.log('7 ok');
}
// ---------------------------------------------------------------- 8. transient 500 on create is retried; retry does not duplicate
{
  const w = makeWorld();
  w.failNext.push({ match: (m, p) => m === 'POST' && p === '/list/901522580321/task', status: 500 });
  const { log } = await run(w, withLead({ lead_id: 'l_retry_0001', email: 'retry@acme-it.co.uk' }));
  eq(w.tasks.length, 1, 'exactly one task after a retry'); ok(log.filter((l) => l.name === 'create-clickup-task').length === 2, 'two attempts');
  console.log('8 ok');
}
// ---------------------------------------------------------------- 9. invalid input fails the run, writes nothing
{
  for (const bad of [withLead({ campaign: 'uk-no-such-funnel' }), withLead({ campaign: 'constructor' }), withLead({ campaign: '__proto__' }), withLead({ route: 'maybe' }), withLead({ route: 'constructor' }), { hello: 'world' }, withLead({ lead_id: '' }), 'not json']) {
    const w = makeWorld();
    let threw = false;
    try { await run(w, bad); } catch { threw = true; }
    ok(threw, 'throws for ' + JSON.stringify(bad).slice(0, 60)); eq(w.tasks.length, 0, 'nothing written'); eq(w.calls.length, 0, 'no ClickUp call');
  }
  console.log('9 ok');
}
// ---------------------------------------------------------------- 10. wrappers and strings
{
  for (const [label, wrap] of [['json string', (p) => JSON.stringify(p)], ['body wrapper', (p) => ({ body: p })], ['data.payload wrapper', (p) => ({ data: { payload: p } })]]) {
    const w = makeWorld();
    await run(w, wrap(withLead({ lead_id: 'l_wrap_' + label.length })));
    eq(w.tasks.length, 1, label);
  }
  console.log('10 ok');
}
// ---------------------------------------------------------------- 11. odd values
{
  const w = makeWorld();
  const { out } = await run(w, withLead({ lead_id: 'l_odd_0001', email: 'odd@acme-it.co.uk', mobile: '12', company_website: 'not a url', first_name: '', last_name: '', company_name: 'Line\nbreak\u0000 Ltd', specialism: 'constructor', marketing_spend: '__proto__' }));
  const t = w.tasks[0];
  eq(out.phone.set, false, 'bad phone not sent'); eq(optName(t, F.web), undefined, 'bad url skipped'); eq(optName(t, F.contact), undefined, 'no contact name');
  eq(t.name, 'Line break  Ltd', 'control characters removed'); eq(optName(t, F.spec), undefined, 'prototype key is no option'); eq(optName(t, F.spend), undefined, 'prototype key is no option 2');
  console.log('11 ok');
}
// ---------------------------------------------------------------- 12. phone formats
{
  const cases = { '07700 900123': '+447700900123', '+44 7700 900123': '+447700900123', '+44 (0)7700 900123': '+447700900123', '0044 7700 900123': '+447700900123', '+47 912 34 567': '+4791234567', '7700900123': '' , '123': '' };
  for (const [input, expected] of Object.entries(cases)) {
    const w = makeWorld();
    const { out } = await run(w, withLead({ lead_id: 'l_ph_' + Math.random().toString(36).slice(2, 8), mobile: input }));
    const t = w.tasks[0];
    eq(optName(t, F.phone), expected || undefined, 'phone ' + input);
  }
  console.log('12 ok');
}
// ---------------------------------------------------------------- 13. health and law: own list, own tag, only what fits one ClickUp band
const SPEND_UNDER_1K = '5482c305-7587-466a-bef4-ab15e6a70906';
{
  const health = { campaign: 'uk-private-hospitals', page_slug: 'uk-private-hospitals', company_name: 'TEST Harbour Clinics Ltd', specialism: '', practice_areas: '', sra_number: '',
    regulator_number: 'TEST-1234', self_pay_share: '60% or more', specialties: 'Orthopaedics, Cardiology', first_consultation_value: '£300 to under £600',
    turnover_band: '£5m to under £10m', employees_or_fee_earners: '', marketing_spend: '£20,000 to under £50,000', first_year_value: '', target_next_year: '£12m' };
  const w = makeWorld();
  const { out } = await run(w, withLead({ ...health, lead_id: 'l_health_0001', email: 'health@example.invalid' }));
  const t = w.tasks[0];
  eq(w.tasks.length, 1, 'health: one task'); eq(t.list, HEALTH_LIST, 'health: in the HEALTH list'); eq(t.tags, ['growth-health', 'test'], 'health: tags');
  eq(t.status, 'ny lead', 'health: status'); eq(optName(t, F.tier), 'Tier 1', 'health: tier'); eq(optName(t, F.leadId), 'l_health_0001', 'health: lead_id field');
  eq(optName(t, F.spend), '£5k+/mth', 'health: spend inside one band'); eq(optName(t, F.spec), undefined, 'health: IT specialism dropdown left alone');
  eq(optName(t, F.team), undefined, 'health: no team size'); eq(optName(t, F.value), undefined, 'health: no contract value');
  ok(t.description.includes('UK HEALTH'), 'health: label in description'); ok(t.description.includes('Orthopaedics, Cardiology'), 'health: specialties in description');
  ok(t.description.includes('£300 to under £600'), 'health: consultation value in description');
  eq(out.slack.posted, false, 'health: test lead stays out of Slack');
  // a real health lead posts with the health label and uses "ansatte"
  const w2 = makeWorld();
  await run(w2, withLead({ ...health, lead_id: 'l_health_0002', email: 'real@clinic-group.co.uk' }));
  eq(w2.slack.length, 1, 'health: real lead posts'); ok(w2.slack[0].includes('UK HEALTH'), 'health: Slack label'); ok(!w2.slack[0].includes('[TEST]'), 'health: no TEST on a real lead');
  eq(w2.tasks[0].tags, ['growth-health'], 'health: real lead tag');
  // the "I do not know" answer maps to Unknown, the two highest bands to £5k+; the two lowest (26 Oct 2026: the
  // line is £3,000) straddle ClickUp's bands and stay empty
  for (const [answer, expected] of [['I do not know', 'Unknown'], ['£50,000 or more', '£5k+/mth'], ['£20,000 to under £50,000', '£5k+/mth'], ['Under £3,000', undefined], ['£3,000 to under £20,000', undefined]]) {
    const wx = makeWorld();
    await run(wx, withLead({ ...health, lead_id: 'l_health_' + answer.length, marketing_spend: answer }));
    eq(optName(wx.tasks[0], F.spend), expected, 'health spend: ' + answer);
  }
  // two campaigns, same lead id format: a lead lives in its own list only
  const wd = makeWorld();
  await run(wd, withLead({ ...health, lead_id: 'l_dupe_0001' }));
  const { out: again } = await run(wd, withLead({ ...health, lead_id: 'l_dupe_0001' }));
  eq(again.deduped, true, 'health: second delivery deduped'); eq(wd.tasks.length, 1, 'health: still one task');
  console.log('13 health ok');
}
{
  const law = { campaign: 'uk-law-firms', page_slug: 'uk-law-firms', company_name: 'TEST Harbour Law LLP', specialism: '', practice_areas: 'Private client, Family', sra_number: '999999',
    turnover_band: '£2m to under £5m', employees_or_fee_earners: '15 to 29', marketing_spend: '£2,000 to under £5,000', first_year_value: '£5,000 to under £15,000', target_next_year: '£4m' };
  const w = makeWorld();
  await run(w, withLead({ ...law, lead_id: 'l_law_0001', email: 'law@example.invalid' }));
  const t = w.tasks[0];
  eq(w.tasks.length, 1, 'law: one task'); eq(t.list, LAW_LIST, 'law: in the LAW list'); eq(t.tags, ['growth-law', 'test'], 'law: tags');
  eq(optName(t, F.tier), 'Tier 1', 'law: tier'); eq(optName(t, F.leadId), 'l_law_0001', 'law: lead_id field');
  eq(optName(t, F.spend), undefined, 'law: £2,000 to under £5,000 straddles two ClickUp bands: not set');
  eq(optName(t, F.spec), undefined, 'law: IT specialism dropdown left alone'); eq(optName(t, F.team), undefined, 'law: team size not set'); eq(optName(t, F.value), undefined, 'law: contract value not set');
  ok(t.description.includes('Private client, Family'), 'law: practice areas in description'); ok(t.description.includes('999999'), 'law: SRA number in description');
  ok(t.description.includes('15 to 29'), 'law: fee earners in description');
  for (const [answer, expected] of [['Under £1,000', 'Under £1k/mth'], ['£1,000 to under £2,000', '£1-2.5k/mth'], ['£5,000 to under £15,000', '£5k+/mth'], ['£15,000 or more', '£5k+/mth'], ['I do not know', 'Unknown']]) {
    const wx = makeWorld();
    await run(wx, withLead({ ...law, lead_id: 'l_law_' + answer.length, marketing_spend: answer }));
    eq(optName(wx.tasks[0], F.spend), expected, 'law spend: ' + answer);
  }
  const w2 = makeWorld();
  await run(w2, withLead({ ...law, lead_id: 'l_law_0002', email: 'real@harbour-law.co.uk' }));
  eq(w2.slack.length, 1, 'law: real lead posts'); ok(w2.slack[0].includes('UK LAW'), 'law: Slack label'); ok(w2.slack[0].includes('fee earners'), 'law: fee earners wording');
  console.log('13 law ok');
}
// ---------------------------------------------------------------- 14. a lead goes only to the list of its own campaign
{
  const w = makeWorld();
  await run(w, withLead({ lead_id: 'l_it_0001' }));
  await run(w, withLead({ lead_id: 'l_it_0001', campaign: 'uk-private-hospitals' }));
  await run(w, withLead({ lead_id: 'l_it_0001', campaign: 'uk-law-firms' }));
  eq(w.tasks.map((x) => x.list).sort(), [LIST, HEALTH_LIST, LAW_LIST].sort(), 'same lead id in three campaigns: one task in each list, none deduped across lists');
  console.log('14 ok');
}
// ---------------------------------------------------------------- 15. not a fit: tag, Sondre, one compact post without a ping
const naf = { lead_id: 'l_naf_0001', route: 'not_a_fit', route_reason: 'turnover_below_2m', turnover_band: 'Under £1m', employees_or_fee_earners: '10 to 24', email: 'owner@small-it.co.uk', company_name: 'Small IT Ltd', ch_check: 'skipped', ch_status: '', ch_accounts_type: '', ch_incorporated: '', company_number: '' };
{
  const w = makeWorld();
  const { out } = await run(w, withLead(naf));
  const t = w.tasks[0];
  eq(w.tasks.length, 1, 'naf: one task'); eq(t.status, 'ukvalifisert - archive', 'naf: stays in the archive status, not in "ny lead"');
  eq(t.tags, ['growth-2m', 'vurder-nettside'], 'naf: tagged for review'); eq(t.assignees, [SONDRE], 'naf: assigned to Sondre');
  eq(optName(t, F.tier), 'Tier 3', 'naf: tier 3');
  eq(w.slack.length, 1, 'naf: one Slack post'); eq(out.slack.posted, true, 'naf: posted');
  const msg = w.slack[0];
  console.log('--- Slack (not a fit) ---\n' + msg + '\n---');
  eq(msg.split('\n').length, 3, 'naf: three lines');
  ok(msg.startsWith('*IKKE TREFF* · UK IT · Small IT Ltd\n'), 'naf: head');
  ok(msg.includes('Under £1m · 10 to 24 ansatte · Grunn: omsetning under £2m'), 'naf: line 2 with the reason in words');
  ok(msg.includes('Sondre vurderer nettside eller retainer · ClickUp: <https://app.clickup.com/t/T1|åpne oppgaven>'), 'naf: line 3');
  ok(!msg.includes('<@'), 'naf: no ping');
  ok(!msg.includes('owner@') && !msg.includes('small-it.co.uk'), 'naf: no e-mail address in Slack');
  // an unknown reason code is shown as it is, and several are joined
  const w2 = makeWorld();
  await run(w2, withLead({ ...naf, lead_id: 'l_naf_0002', route_reason: 'trading_under_2y,something_new' }));
  ok(w2.slack[0].includes('Grunn: under to år i drift, something_new'), 'naf: reasons joined, unknown code kept');
  // a test lead is not assigned and does not post, unless slack_test
  const w3 = makeWorld();
  await run(w3, withLead({ ...naf, lead_id: 'l_naf_0003', email: 'x@example.invalid' }));
  eq(w3.tasks[0].assignees, [], 'naf: test lead not assigned'); eq(w3.slack.length, 0, 'naf: test lead silent'); eq(w3.tasks[0].tags, ['growth-2m', 'vurder-nettside', 'test'], 'naf: test tag');
  // health and law: their own tags and labels
  const w4 = makeWorld();
  await run(w4, withLead({ ...naf, lead_id: 'l_naf_0004', campaign: 'uk-private-hospitals', route_reason: 'self_pay_under_10pc' }));
  eq(w4.tasks[0].tags, ['growth-health', 'vurder-nettside'], 'naf health: tags'); eq(w4.tasks[0].assignees, [SONDRE], 'naf health: assigned');
  ok(w4.slack[0].includes('UK HEALTH') && w4.slack[0].includes('Grunn: under 10 % selvbetalende'), 'naf health: label and reason');
  // the codes the 26 Oct 2026 rules give, in words
  for (const [campaign, reason, words] of [
    ['uk-law-firms', 'turnover_below_1m,budget_2k_no', 'Grunn: omsetning under £1m, kan ikke sette av £2 000 i måneden til annonser'],
    ['uk-private-hospitals', 'turnover_below_2m,spend_under_3k', 'Grunn: omsetning under £2m, markedsføring under £3 000 i måneden'],
    ['uk-it-growth', 'turnover_below_2m,spend_under_1k', 'Grunn: omsetning under £2m, markedsføring under £1 000 i måneden'],
  ]) {
    const w5 = makeWorld();
    await run(w5, withLead({ ...naf, lead_id: 'l_naf_' + reason.length, campaign, route_reason: reason }));
    ok(w5.slack[0].includes(words), 'naf: ' + reason + ' in words');
  }
  console.log('15 ok');
}
// ---------------------------------------------------------------- 16. the quote button: tag, comment that notifies, post that pings
const press = (o = {}) => withLead({ ...naf, event: 'website_interest', interest_at: '2026-10-22T12:00:00.000Z', ...o });
{
  const w = makeWorld();
  await run(w, withLead(naf)); // the application first
  w.slack.length = 0;
  const { out, log } = await run(w, press());
  const t = w.tasks[0];
  eq(w.tasks.length, 1, 'interest: no second task'); eq(out.taskCreated, false, 'interest: the existing task is used');
  eq(t.tags, ['growth-2m', 'vurder-nettside', 'ønsker-nettsidetilbud'], 'interest: tagged (the tag did not exist yet, so it was made in the space first)');
  eq(out.tagged, true, 'interest: tag result'); eq(t.comments.length, 1, 'interest: one comment');
  ok(t.comments[0].includes('owner@small-it.co.uk') && t.comments[0].includes('innen to virkedager'), 'interest: comment says whom to e-mail and by when');
  eq(t.commentFlags[0].notify_all, true, 'interest: the comment notifies the assignee');
  eq(w.slack.length, 1, 'interest: one Slack post');
  const msg = w.slack[0];
  console.log('--- Slack (interest) ---\n' + msg + '\n---');
  ok(msg.startsWith('*ØNSKER NETTSIDETILBUD* · UK IT · Small IT Ltd\n'), 'interest: head');
  ok(msg.includes('<@U0AR2CM4NTZ> sender ett tilbud på e-post innen to virkedager'), 'interest: pings Sondre');
  ok(!msg.includes('owner@') && !msg.includes('small-it.co.uk'), 'interest: no e-mail in Slack');
  eq(out.deduped, false, 'interest: not deduped'); ok(log.some((l) => l.name === 'tag-website-interest'), 'interest: tag step ran');
  // the same press delivered again does nothing
  const callsBefore = w.calls.length; const slackBefore = w.slack.length;
  const { out: again } = await run(w, press());
  eq(again.deduped, true, 'interest: second delivery deduped'); eq(w.slack.length, slackBefore, 'interest: no second post'); eq(w.tasks[0].comments.length, 1, 'interest: no second comment');
  ok(w.calls.slice(callsBefore).every((c) => c.method === 'GET'), 'interest: second delivery only reads');
  console.log('16 ok');
}
{
  // the application never reached ClickUp: the press makes the task, as a not-a-fit lead, and then does the rest
  const w = makeWorld();
  const { out } = await run(w, press({ lead_id: 'l_naf_0010' }));
  eq(w.tasks.length, 1, 'interest-only: one task made'); eq(out.taskCreated, true, 'interest-only: created');
  eq(w.tasks[0].status, 'ukvalifisert - archive', 'interest-only: archive status'); eq(w.tasks[0].assignees, [SONDRE], 'interest-only: assigned');
  ok(w.tasks[0].tags.includes('ønsker-nettsidetilbud') && w.tasks[0].tags.includes('vurder-nettside'), 'interest-only: both tags');
  eq(w.slack.length, 1, 'interest-only: one post (the application post is not repeated)'); ok(w.slack[0].includes('ØNSKER NETTSIDETILBUD'), 'interest-only: it is the interest post');
  // a test lead: no ping, no notification, no assignee, silent unless slack_test
  const w2 = makeWorld();
  await run(w2, press({ lead_id: 'l_naf_0011', email: 'x@example.invalid' }));
  eq(w2.slack.length, 0, 'interest test: silent'); eq(w2.tasks[0].assignees, [], 'interest test: not assigned'); eq(w2.tasks[0].commentFlags[0].notify_all, false, 'interest test: comment does not notify');
  const w3 = makeWorld();
  await run(w3, press({ lead_id: 'l_naf_0012', email: 'x@example.invalid', slack_test: true }));
  eq(w3.slack.length, 1, 'interest test: posts with slack_test'); ok(w3.slack[0].startsWith('[TEST] *ØNSKER NETTSIDETILBUD*') && !w3.slack[0].includes('<@'), 'interest test: marked TEST and no ping');
  // an unknown tag is made in the space and the add is tried again
  const w4 = makeWorld();
  KNOWN_TAGS.delete('ønsker-nettsidetilbud');
  const { out: o4 } = await run(w4, press({ lead_id: 'l_naf_0013' }));
  eq(o4.tagged, true, 'interest: unknown tag made, then added'); ok(w4.calls.some((c) => c.method === 'POST' && c.path === '/space/S1/tag'), 'interest: the tag was made in the space');
  // a tag that cannot be added does not stop the comment or the post, and is reported
  const w5 = makeWorld();
  KNOWN_TAGS.delete('ønsker-nettsidetilbud');
  w5.failNext.push({ match: (m, p) => m === 'POST' && p.endsWith('/tag/' + encodeURIComponent('ønsker-nettsidetilbud')), status: 500 });
  const { out: o5 } = await run(w5, press({ lead_id: 'l_naf_0014' }));
  eq(o5.tagged, true, 'interest: a 500 on the first add is retried'); eq(w5.slack.length, 1, 'interest: post still made');
  console.log('16b ok');
}
{
  // only a not_a_fit lead can ask; anything else fails on purpose and writes nothing
  for (const route of ['fit', 'review', 'not_now']) {
    const w = makeWorld();
    let threw = false;
    try { await run(w, press({ lead_id: 'l_bad_' + route, route })); } catch { threw = true; }
    ok(threw, 'interest for ' + route + ' fails'); eq(w.tasks.length, 0, 'interest for ' + route + ': nothing written');
  }
  // a normal lead without an event key is unchanged: the same lead_id as a press is still "deduped" by the first path
  const w = makeWorld();
  await run(w, withLead({ ...naf, lead_id: 'l_naf_0020' }));
  const { out } = await run(w, withLead({ ...naf, lead_id: 'l_naf_0020' }));
  eq(out.deduped, true, 'a second delivery of the application is still deduped'); eq(w.slack.length, 1, 'and posts once');
  console.log('16c ok');
}
// ---------------------------------------------------------------- 17. meeting_goal (21 Oct 2026): in the description as a quote, in Slack cut to 320 characters
{
  const goal = 'We want a straight answer on whether\nthis can work for us. <b>Fast</b> & cheap?';
  const w = makeWorld();
  await run(w, withLead({ lead_id: 'l_goal_0001', email: 'goal@acme-it.co.uk', meeting_goal: goal }));
  const d = w.tasks[0].description;
  ok(d.includes('**What do you want to get out of this meeting?**\n> We want a straight answer on whether this can work for us. <b>Fast</b> & cheap?'), 'goal: quoted in the description (line breaks are already flattened by clean())');
  ok(d.indexOf('**What do you want') > d.indexOf('Kapasitet') && d.indexOf('**What do you want') < d.indexOf('**Kontakt**'), 'goal: between the answers and the contact block');
  const msg = w.slack[0];
  ok(msg.includes('Vil ha ut av møtet: _We want a straight answer on whether this can work for us. &lt;b&gt;Fast&lt;/b&gt; &amp; cheap?_'), 'goal: flattened and escaped in Slack');
  ok(msg.indexOf('Vil ha ut av møtet') > msg.indexOf('Beslutter:') && msg.indexOf('Vil ha ut av møtet') < msg.indexOf('Kilde:'), 'goal: after the facts, before the source');
  // long answers: 320 characters in Slack, the whole text in ClickUp (up to 600)
  const long = 'x'.repeat(590);
  const w2 = makeWorld();
  await run(w2, withLead({ lead_id: 'l_goal_0002', email: 'goal2@acme-it.co.uk', meeting_goal: long }));
  ok(w2.tasks[0].description.includes('> ' + long), 'goal: the whole answer in the description');
  const line = w2.slack[0].split('\n').find((l) => l.startsWith('Vil ha ut av møtet'));
  eq(line, 'Vil ha ut av møtet: _' + 'x'.repeat(319) + '…_', 'goal: cut to 320 characters with an ellipsis');
  // no answer: no heading, no line
  const w3 = makeWorld();
  await run(w3, withLead({ lead_id: 'l_goal_0003', email: 'goal3@acme-it.co.uk' }));
  ok(!w3.tasks[0].description.includes('What do you want to get out of this meeting?'), 'goal: no heading without an answer');
  ok(!w3.slack[0].includes('Vil ha ut av møtet'), 'goal: no Slack line without an answer');
  // the compact not-a-fit post does not carry the free text
  const w4 = makeWorld();
  await run(w4, withLead({ ...naf, lead_id: 'l_goal_0004', meeting_goal: 'Private words' }));
  ok(!w4.slack[0].includes('Private words'), 'goal: not in the compact not-a-fit post');
  ok(w4.tasks[0].description.includes('> Private words'), 'goal: but in the task');
  console.log('17 ok');
}
console.log('\nALL PASSED: ' + passed + ' checks');
