// Zap 1 for Italy (it-ict-growth). The UK checks are in zap1.test.mjs and must stay green next to these.
// The shipped source has no ClickUp list, no Slack channel and no ids for Aurora yet, so the checks that need
// them build a copy of the source with test values put into the Italy entry (nothing is written to the repository).
//   node g/_growth/zapier/build.mjs zap1-lead-to-clickup-slack.ts && node g/_growth/zapier/zap1-it.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const truth = JSON.parse(fs.readFileSync(path.join(here, 'truth.json'), 'utf8'));
const SOURCE = fs.readFileSync(path.join(here, 'zap1-lead-to-clickup-slack.ts'), 'utf8');

const IT_LIST = '901599999999';
const IT_CHANNEL = 'CITALY00001';
const AURORA_CLICKUP = 777001;
const AURORA_SLACK = 'UAURORA001';
const UK_LIST = '901522580321';
const UK_CHANNEL = 'C0CAA3726DS';
const KNOWN_TAGS = new Set(['growth-2m', 'growth-it', 'sjekk-størrelse', 'ta-opp-om-3-mnd', 'test', 'vurder-nettside', 'ønsker-nettsidetilbud']);
const KNOWN_STATUS = new Set(['ny lead', 'møte booket', 'ukvalifisert - archive']);
const F = { leadId: '08cf9ecc-ff51-4296-9e03-c5250ebb7abf', web: '09d8fbaa-d659-4b44-9738-39fcf5c6f25b', spend: '13229225-75e5-4729-bd8d-eb69c20e80b2', team: '18957c8f-f573-4790-957c-11812dd3aa04', value: '189cd0e5-2c7d-4c43-a94b-9ad280a4ad53', tier: '668b1a6a-4054-4b24-ac3c-55432d7c2b3e', email: '78c13487-0fee-46d2-893f-68b212b09e6b', phone: 'a0c06e36-5028-4b86-af93-c57de3ad2418', spec: 'ce2deb01-0b47-45c6-8bf5-dbdc67f9962d' };

let passed = 0;
const ok = (cond, label) => { assert.ok(cond, label); passed++; };
const eq = (a, b, label) => { assert.deepEqual(a, b, label); passed++; };

// ---------------------------------------------------------------- the Italy entry with test values, built
function patchedSource({ list = IT_LIST, channel = IT_CHANNEL, aurora = true } = {}) {
  const at = SOURCE.indexOf('"it-ict-growth": {');
  assert.ok(at > 0, 'the Italy entry exists');
  let head = SOURCE.slice(0, at);
  let entry = SOURCE.slice(at);
  const swap = (from, to) => { assert.ok(entry.includes(from), 'in the Italy entry: ' + from); entry = entry.replace(from, to); };
  swap('listId: "",', `listId: "${list}",`);
  swap('slackChannel: "",', `slackChannel: "${channel}",`);
  if (aurora) swap('reviewer: { clickupId: 0, slackId: "", name: "Aurora" },', `reviewer: { clickupId: ${AURORA_CLICKUP}, slackId: "${AURORA_SLACK}", name: "Aurora" },`);
  return head + entry;
}
let n = 0;
async function load(opts) {
  const dir = path.join(here, 'out');
  fs.mkdirSync(dir, { recursive: true });
  const src = path.join(dir, `zap1-it-variant-${++n}.ts`);
  const out = path.join(dir, `zap1-it-variant-${n}.mjs`);
  fs.writeFileSync(src, patchedSource(opts));
  await build({
    entryPoints: [src], outfile: out, bundle: true, format: 'esm', platform: 'node', target: 'node20', logLevel: 'error',
    alias: { '@zapier/zapier-durable': path.join(here, 'stubs/durable.mjs'), '@zapier/zapier-sdk': path.join(here, 'stubs/sdk.mjs') },
  });
  return (await import(pathToFileURL(out).href + '?n=' + n)).default;
}

// ---------------------------------------------------------------- fakes
function makeWorld() {
  const w = { tasks: [], slack: [], calls: [], nextId: 1 };
  const reply = (status, json) => ({ ok: status >= 200 && status < 300, status, text: async () => (typeof json === 'string' ? json : JSON.stringify(json)) });
  const fullTask = (t) => ({ id: t.id, url: 'https://app.clickup.com/t/' + t.id, tags: t.tags.map((name) => ({ name })), custom_fields: t.custom_fields.map((c) => ({ id: c.id, name: truth[c.id].name, value: c.value })) });
  w.fetch = async (url, init = {}) => {
    const method = init.method || 'GET';
    const u = new URL(url);
    const p = u.pathname.replace('/api/v2', '');
    const body = init.body ? JSON.parse(init.body) : undefined;
    w.calls.push({ method, path: p, body });
    assert.equal(init.connection, 'clickup_main');
    let m = p.match(/^\/list\/(\d+)\/task$/);
    if (m && method === 'GET') {
      const cf = JSON.parse(u.searchParams.get('custom_fields') || '[]');
      let tasks = w.tasks.filter((t) => t.list === m[1]);
      for (const f of cf) tasks = tasks.filter((t) => (t.custom_fields.find((c) => c.id === f.field_id) || {}).value === f.value);
      return reply(200, { tasks: tasks.map(fullTask), last_page: true });
    }
    if (m && method === 'POST') {
      assert.ok([IT_LIST, UK_LIST].includes(m[1]), 'create on a known list');
      const errs = [];
      if (!KNOWN_STATUS.has(body.status)) errs.push('status');
      for (const t of body.tags || []) if (!KNOWN_TAGS.has(t)) errs.push('tag ' + t);
      for (const c of body.custom_fields || []) {
        const def = truth[c.id];
        if (!def) { errs.push('field ' + c.id); continue; }
        if (def.type === 'drop_down' && !def.options[c.value]) errs.push('option ' + c.value);
      }
      if (errs.length) return reply(400, { err: 'bad: ' + errs.join(',') });
      const id = 'T' + w.nextId++;
      w.tasks.push({ id, list: m[1], name: body.name, description: body.markdown_description, status: body.status, assignees: body.assignees || [], tags: body.tags || [], custom_fields: (body.custom_fields || []).map((c) => ({ ...c })), comments: [], commentFlags: [] });
      return reply(200, { id, url: 'https://app.clickup.com/t/' + id });
    }
    m = p.match(/^\/task\/([^/]+)\/field\/([^/]+)$/);
    if (m && method === 'POST') {
      const t = w.tasks.find((x) => x.id === m[1]);
      if (truth[m[2]].type === 'phone' && !/^\+\d{8,15}$/.test(body.value)) return reply(400, { err: 'phone invalid' });
      t.custom_fields.push({ id: m[2], value: body.value });
      return reply(200, {});
    }
    m = p.match(/^\/task\/([^/]+)\/comment$/);
    if (m && method === 'POST') {
      const t = w.tasks.find((x) => x.id === m[1]);
      t.comments.push(body.comment_text); t.commentFlags.push(body.notify_all);
      return reply(200, { id: 1 });
    }
    m = p.match(/^\/task\/([^/]+)\/tag\/([^/]+)$/);
    if (m && method === 'POST') {
      const t = w.tasks.find((x) => x.id === m[1]);
      const name = decodeURIComponent(m[2]);
      if (!KNOWN_TAGS.has(name)) return reply(404, { err: 'no tag' });
      if (!t.tags.includes(name)) t.tags.push(name);
      return reply(200, {});
    }
    throw new Error('unexpected ClickUp call ' + method + ' ' + p);
  };
  w.runAction = async (args) => {
    w.slack.push({ channel: args.inputs.channel, text: args.inputs.text });
    return { data: [{ ts: '1700000000.000100', channel: args.inputs.channel }] };
  };
  return w;
}
async function run(wf, world, input) {
  globalThis.__fake = world;
  const ctx = {
    async step(spec) {
      let last;
      for (let i = 0; i < (spec.maxAttempts || 1); i++) { try { return JSON.parse(JSON.stringify(await spec.run())); } catch (e) { last = e; } }
      throw last;
    },
  };
  return wf.run(ctx, input);
}
const optName = (t, fid) => { const c = t.custom_fields.find((x) => x.id === fid); return c ? (truth[fid].options ? truth[fid].options[c.value] : c.value) : undefined; };

// ---------------------------------------------------------------- payloads, as the Italian function sends them
const base = {
  lead_id: 'l_it_0001', campaign: 'it-ict-growth', route: 'fit', route_reason: 'turnover_2m_plus, trading_2y_plus, register_not_used',
  submitted_at: '2026-10-23T10:00:00Z', company_name: 'Rossi Informatica S.r.l.', company_website: 'www.rossi-informatica.it',
  company_number: '', ch_status: '', ch_accounts_type: '', ch_incorporated: '', ch_check: 'unchecked',
  specialism: 'Servizi IT gestiti (MSP)', practice_areas: '', sra_number: '', turnover_band: 'Da 2 a meno di 5 milioni di €',
  trading_years: 'Più di cinque anni', employees_or_fee_earners: 'Da 25 a 49', marketing_spend: 'Da 5.000 € a meno di 15.000 €',
  first_year_value: 'Da 25.000 € a meno di 50.000 €', sales_cycle: 'Da uno a meno di tre mesi', target_next_year: '6 milioni di euro',
  decision_maker: 'Io', capacity: 'Da quattro a dieci', meeting_goal: 'Una risposta chiara su se questo può funzionare.',
  first_name: 'Marco', last_name: 'Rossi', job_title: 'Amministratore delegato',
  email: 'marco@rossi-informatica.it', mobile: '', utm_source: 'meta', utm_medium: 'paid', utm_campaign: 'ita-ict', utm_content: 'ad1',
  utm_term: '', fbclid: '', page_slug: 'it-ict-growth', referrer: '',
};
const lead = (o) => ({ ...base, ...o });
const NORWEGIAN = ['Selskap', 'Svar i skjemaet', 'Kontakt', 'Kapasitet', 'Beslutter', 'Omsetning', 'Salgssyklus', 'åpne oppgaven', 'skjema levert', 'Grunn', 'vurderer', 'ansatte', 'Verdi første år', 'Vil ha ut av møtet', 'Kilde', 'uten navn', 'virkedager', 'Ønsker', 'Rute'];
const noNorwegian = (text, label) => { for (const w of NORWEGIAN) ok(!text.includes(w), `${label}: no Norwegian "${w}"`); };

// ---------------------------------------------------------------- 1. as shipped, Italy fails on purpose and writes nothing
{
  const shipped = (await import(pathToFileURL(path.join(here, 'out/zap1-lead-to-clickup-slack.mjs')).href)).default;
  const w = makeWorld();
  let err = '';
  try { await run(shipped, w, lead({})); } catch (e) { err = String(e.message); }
  ok(/has no ClickUp list yet/.test(err), 'shipped: an Italian lead fails on the missing list');
  eq(w.tasks.length, 0, 'shipped: nothing written to ClickUp'); eq(w.slack.length, 0, 'shipped: nothing posted');
  // a list but no Slack channel: also on purpose, before anything is written
  const noChannel = await load({ channel: '' });
  const w2 = makeWorld();
  let err2 = '';
  try { await run(noChannel, w2, lead({})); } catch (e) { err2 = String(e.message); }
  ok(/has no Slack channel yet/.test(err2), 'no channel: fails on purpose'); eq(w2.tasks.length, 0, 'no channel: nothing written');
  console.log('1 ok');
}
// ---------------------------------------------------------------- 2. a fit lead: English, euro, no register, own channel
{
  const wf = await load({});
  const w = makeWorld();
  const out = await run(wf, w, lead({}));
  const t = w.tasks[0];
  eq(t.list, IT_LIST, 'fit: the Italy list'); eq(t.status, 'ny lead', 'fit: status'); eq(t.tags, ['growth-it'], 'fit: tag growth-it');
  eq(optName(t, F.tier), 'Tier 1', 'fit: tier');
  eq(optName(t, F.spec), 'Managed IT services / MSP', 'fit: Italian specialism label maps to the ClickUp option');
  eq(optName(t, F.spend), undefined, 'fit: euro ad spend is not forced into a pound band');
  eq(optName(t, F.value), undefined, 'fit: euro contract value is not forced into a pound band');
  eq(optName(t, F.team), undefined, 'fit: 25 to 49 straddles two ClickUp bands');
  const d = t.description;
  console.log('--- description (Italy) ---\n' + d + '\n---');
  ok(d.startsWith('**FIT** · IT ITALY · form submitted 2026-10-23T10:00:00Z'), 'fit: header in English');
  for (const label of ['**Company**', '**Form answers**', '**Contact**', '**Routing**', '**Source**', '- Turnover: Da 2 a meno di 5 milioni di €', '- First-year value: Da 25.000 € a meno di 50.000 €', '- Sales cycle:', '- Capacity: Da quattro a dieci', '- E-mail: marco@rossi-informatica.it'])
    ok(d.includes(label), 'fit: ' + label);
  ok(d.includes('**What do you want to get out of this meeting?**\n> Una risposta chiara'), 'fit: the question block the routines read, with the answer as a quote');
  ok(!d.includes('Companies House') && !d.includes('Register check'), 'fit: no register rows');
  noNorwegian(d, 'fit description');
  ok(!d.includes('£'), 'fit: no pound sign');
  eq(w.slack.length, 1, 'fit: one Slack post'); eq(w.slack[0].channel, IT_CHANNEL, 'fit: posted to the Italy channel, not #leads-uk');
  const msg = w.slack[0].text;
  console.log('--- Slack (Italy fit) ---\n' + msg + '\n---');
  ok(msg.startsWith('*FIT* · IT ITALY · Rossi Informatica S.r.l.\n'), 'fit slack: head');
  ok(msg.includes('Da 2 a meno di 5 milioni di € · Da 25 a 49 employees'), 'fit slack: turnover and people');
  ok(!msg.includes('Companies House'), 'fit slack: no register line');
  ok(msg.includes('First-year value: Da 25.000 € a meno di 50.000 €'), 'fit slack: value line'); ok(msg.includes('Wants from the meeting: _Una risposta chiara'), 'fit slack: the goal');
  ok(msg.includes('ClickUp: <https://app.clickup.com/t/T1|open the task>'), 'fit slack: link'); ok(msg.includes('Source: meta / ad1'), 'fit slack: source');
  ok(!msg.includes('⚠'), 'fit slack: no size warning when there is no register');
  ok(!msg.includes('marco@') && !msg.includes('Amministratore') && !msg.includes('rossi-informatica.it'), 'fit slack: no e-mail, role or website');
  noNorwegian(msg, 'fit slack');
  eq(out.test, false, 'fit: not a test');
  console.log('2 ok');
}
// ---------------------------------------------------------------- 3. specialism "Altro", team size, ad spend unknown, phone
{
  const wf = await load({});
  const w = makeWorld();
  await run(wf, w, lead({ lead_id: 'l_it_0002', specialism: 'Altro: Telecomunicazioni', employees_or_fee_earners: '100 o più', marketing_spend: 'Non lo so', mobile: '333 1234567', email: 'a@acme-it.it' }));
  const t = w.tasks[0];
  eq(optName(t, F.spec), 'Other', '"Altro: ..." maps to Other'); eq(optName(t, F.team), '50+', '100 o più -> 50+'); eq(optName(t, F.spend), 'Unknown', 'Non lo so -> Unknown');
  eq(optName(t, F.phone), '+393331234567', 'Italian mobile -> +39');
  ok(t.description.includes('Altro: Telecomunicazioni'), 'the free text is in the description');
  ok(!w.slack[0].text.includes('Telecomunicazioni'), 'and not in Slack');
  const phones = [['+39 02 1234 5678', '+390212345678'], ['02 1234 5678', '+390212345678'], ['0039 333 1234567', '+393331234567'], ['3331234567', '+393331234567'], ['12345', ''], ['4331234567', ''], ['+44 7700 900123', '+447700900123']];
  for (const [input, want] of phones) {
    const w2 = makeWorld();
    await run(wf, w2, lead({ lead_id: 'l_it_ph_' + input.replace(/\D/g, ''), mobile: input, email: 'p@acme-it.it' }));
    eq(optName(w2.tasks[0], F.phone), want || undefined, 'phone ' + input + ' -> ' + (want || 'not set'));
  }
  console.log('3 ok');
}
// ---------------------------------------------------------------- 4. review and not a fit: Aurora reads them
{
  const wf = await load({});
  const w = makeWorld();
  await run(wf, w, lead({ lead_id: 'l_it_0003', route: 'review', route_reason: 'turnover_not_stated', turnover_band: 'Preferisco non dirlo', email: 'r@acme-it.it' }));
  eq(w.tasks[0].tags, ['growth-it', 'sjekk-størrelse'], 'review: tags');
  const msg = w.slack[0].text;
  ok(msg.startsWith('*REVIEW* · IT ITALY'), 'review slack: head'); ok(!msg.includes('⚠'), 'review slack: no register warning'); noNorwegian(msg, 'review slack');

  const naf = lead({ lead_id: 'l_it_0004', route: 'not_a_fit', route_reason: 'turnover_below_2m, value_under_10k, mystery_code', turnover_band: 'Meno di 1 milione di €', email: 'n@acme-it.it' });
  const w2 = makeWorld();
  await run(wf, w2, naf);
  const t = w2.tasks[0];
  eq(t.status, 'ukvalifisert - archive', 'not a fit: archive'); eq(t.tags, ['growth-it', 'vurder-nettside'], 'not a fit: review tag'); eq(t.assignees, [AURORA_CLICKUP], 'not a fit: assigned to Aurora, not Sondre');
  const c = w2.slack[0].text;
  console.log('--- Slack (Italy not a fit) ---\n' + c + '\n---');
  ok(c.startsWith('*NOT A FIT* · IT ITALY · Rossi Informatica S.r.l.'), 'not a fit slack: heading'); ok(c.includes('Reason: turnover under €2m, client value under €10k, mystery_code'), 'not a fit slack: reasons in euro, an unknown code as it is');
  ok(c.includes('Aurora reviews website or retainer'), 'not a fit slack: names Aurora'); ok(!c.includes('Sondre') && !c.includes('<@'), 'not a fit slack: no Sondre, no ping'); noNorwegian(c, 'not a fit slack');
  eq(w2.slack[0].channel, IT_CHANNEL, 'not a fit: Italy channel');
  console.log('4 ok');
}
// ---------------------------------------------------------------- 5. the quote button
{
  const wf = await load({});
  const w = makeWorld();
  const press = (o) => lead({ route: 'not_a_fit', route_reason: 'turnover_below_2m', turnover_band: 'Meno di 1 milione di €', event: 'website_interest', interest_at: '2026-10-23T11:00:00Z', email: 'q@acme-it.it', ...o });
  const out = await run(wf, w, press({ lead_id: 'l_it_0005' }));
  eq(out.deduped, false, 'interest: first press'); eq(w.tasks[0].assignees, [AURORA_CLICKUP], 'interest: Aurora assigned');
  ok(w.tasks[0].tags.includes('ønsker-nettsidetilbud') && w.tasks[0].tags.includes('vurder-nettside'), 'interest: both tags');
  const comment = w.tasks[0].comments[0];
  eq(comment, 'Wants a quote for a new website or a monthly retainer. Pressed the button on the “not a fit” page.\nSend one quote by e-mail to q@acme-it.it within two working days.', 'interest: comment in English'); eq(w.tasks[0].commentFlags[0], true, 'interest: notifies');
  const post = w.slack.find((s) => s.text.includes('WANTS WEBSITE QUOTE'));
  ok(post, 'interest: the post'); ok(post.text.includes(`<@${AURORA_SLACK}> sends one quote by e-mail within two working days`), 'interest: pings Aurora'); noNorwegian(post.text, 'interest post'); noNorwegian(comment, 'interest comment');
  const again = await run(wf, w, press({ lead_id: 'l_it_0005' }));
  eq(again.deduped, true, 'interest: the same press twice does nothing the second time');
  // a test lead: no ping, no assignee, silent
  const w2 = makeWorld();
  await run(wf, w2, press({ lead_id: 'l_it_0006', email: 'x@example.invalid' }));
  eq(w2.slack.length, 0, 'interest test: silent'); eq(w2.tasks[0].assignees, [], 'interest test: not assigned'); eq(w2.tasks[0].commentFlags[0], false, 'interest test: does not notify');
  console.log('5 ok');
}
// ---------------------------------------------------------------- 6. before Aurora has been invited: nobody assigned, nobody pinged, still works
{
  const wf = await load({ aurora: false });
  const w = makeWorld();
  const naf = lead({ lead_id: 'l_it_0007', route: 'not_a_fit', route_reason: 'turnover_below_2m', turnover_band: 'Meno di 1 milione di €', email: 'n2@acme-it.it' });
  await run(wf, w, naf);
  eq(w.tasks[0].assignees, [], 'no ids: nobody assigned (not user id 0)');
  await run(wf, w, { ...naf, event: 'website_interest', interest_at: '2026-10-23T11:00:00Z' });
  const post = w.slack.find((s) => s.text.includes('WANTS WEBSITE QUOTE')).text;
  ok(post.includes('Aurora sends one quote') && !post.includes('<@'), 'no ids: her name, no ping');
  console.log('6 ok');
}
// ---------------------------------------------------------------- 7. UK stays as it was, in the same build that has Italy in it
{
  const wf = await load({});
  const w = makeWorld();
  const uk = {
    ...base, campaign: 'uk-it-growth', lead_id: 'l_uk_0001', specialism: 'Managed IT services', turnover_band: '£2m to under £5m', employees_or_fee_earners: '25 to 49',
    marketing_spend: '£5,000 to under £15,000', first_year_value: '£10k to under £25k', company_number: '99999999', ch_status: 'active', ch_accounts_type: 'small', ch_incorporated: '2016-03-14', ch_check: 'ok',
    email: 'person@acme-it.co.uk', mobile: '07700 900123',
  };
  await run(wf, w, uk);
  const t = w.tasks[0];
  eq(t.list, UK_LIST, 'UK: the UK list'); eq(t.tags, ['growth-2m'], 'UK: tag'); eq(w.slack[0].channel, UK_CHANNEL, 'UK: #leads-uk');
  ok(t.description.includes('**Selskap**') && t.description.includes('Companies House') && t.description.includes('skjema levert'), 'UK: Norwegian description with the register rows');
  ok(w.slack[0].text.includes('Companies House: small, stiftet 2016') && w.slack[0].text.includes('25 to 49 ansatte'), 'UK: Norwegian Slack with the register line');
  eq(optName(t, F.phone), '+447700900123', 'UK: +44 phone');
  const w2 = makeWorld();
  await run(wf, w2, { ...uk, lead_id: 'l_uk_0002', route: 'not_a_fit', route_reason: 'turnover_below_2m', email: 'u@acme-it.co.uk' });
  eq(w2.tasks[0].assignees, [106690144], 'UK: not a fit goes to Sondre'); ok(w2.slack[0].text.includes('Sondre vurderer nettside eller retainer') && w2.slack[0].text.includes('omsetning under £2m'), 'UK: Norwegian compact post with pounds');
  console.log('7 ok');
}
console.log('\nALL PASSED (Italy, Zap 1): ' + passed + ' checks');
