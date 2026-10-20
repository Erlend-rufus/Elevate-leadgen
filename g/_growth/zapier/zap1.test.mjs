import fs from 'node:fs';
import assert from 'node:assert/strict';

const truth = JSON.parse(fs.readFileSync(new URL('./truth.json', import.meta.url), 'utf8'));
const mod = await import('./out/zap1-lead-to-clickup-slack.mjs');
const wf = mod.default;

// ---------------------------------------------------------------- fakes
const LIST = '901522580321';
const KNOWN_TAGS = new Set(['growth-2m', 'sjekk-størrelse', 'ta-opp-om-3-mnd', 'booket-uten-skjema', 'test', 'old-import']);
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
      assert.equal(m[1], LIST);
      const cf = JSON.parse(u.searchParams.get('custom_fields') || '[]');
      assert.equal(u.searchParams.get('include_closed'), 'true');
      let tasks = w.tasks;
      if (w.opts.ignoreFilter) tasks = w.tasks; // a search that ignores the filter
      else for (const f of cf) tasks = tasks.filter((t) => (t.custom_fields.find((c) => c.id === f.field_id) || {}).value === f.value);
      return reply(200, { tasks: tasks.map(fullTask), last_page: true });
    }
    if (m && method === 'POST') {
      assert.equal(m[1], LIST);
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
      const t = { id, name: body.name, description: body.markdown_description, status: body.status, priority: body.priority ?? null,
        tags: body.tags || [], due_date: body.due_date ?? null, custom_fields: (body.custom_fields || []).map((c) => ({ ...c })), comments: [] };
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
      return reply(200, { id: 1 });
    }
    throw new Error('unexpected ClickUp call ' + method + ' ' + path);
  };
  const fullTask = (t) => ({ id: t.id, url: 'https://app.clickup.com/t/' + t.id, custom_fields: t.custom_fields.map((c) => ({ id: c.id, name: truth[c.id].name, value: c.value })) });
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
  eq(b.status, 'ukvalifisert - archive', 'not_a_fit status'); eq(b.tags, ['growth-2m', 'test'], 'not_a_fit tags'); eq(b.due_date, null, 'no due date');
  eq(optName(b, F.spec), 'Software development', 'sw dev');
  eq(w.slack.length, 0, 'never Slack for not_now / not_a_fit, even with slack_test');
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
  for (const bad of [withLead({ campaign: 'uk-law-firms' }), withLead({ campaign: 'constructor' }), withLead({ campaign: '__proto__' }), withLead({ route: 'maybe' }), withLead({ route: 'constructor' }), { hello: 'world' }, withLead({ lead_id: '' }), 'not json']) {
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
// ---------------------------------------------------------------- 13. health and law: known campaigns, no list yet
{
  for (const campaign of ['uk-private-hospitals', 'uk-law-firms']) {
    const w = makeWorld();
    let err = null;
    try { await run(w, withLead({ lead_id: 'l_' + campaign.slice(3, 8) + '_1', campaign })); } catch (e) { err = e; }
    eq(!!err, true, campaign + ' fails on purpose');
    eq(String(err && err.message).includes('has no ClickUp list yet'), true, campaign + ' says why');
    eq(w.tasks.length, 0, campaign + ' creates nothing');
  }
  console.log('13 ok');
}
console.log('\nALL PASSED: ' + passed + ' checks');
