// Zap 1 for Italy (it-ict-growth). The UK checks are in zap1.test.mjs and must stay green next to these.
// The shipped source has the Italy list and the Slack channel #leads-it, but no ids for Aurora yet (she is not in
// ClickUp or Slack). The checks that need her build a copy of the source with test ids put into the Italy entry,
// and the failure checks build a copy with the list or the channel taken out (nothing is written to the repository).
//   node g/_growth/zapier/build.mjs zap1-lead-to-clickup-slack.ts && node g/_growth/zapier/zap1-it.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { OPTIONS } from '../../it-ict-growth/core.mjs'; // the Italian words of the form: the English table is checked against them
import * as itRoute from '../../it-ict-growth/route.mjs'; // the reason codes the English table has to have words for

const here = path.dirname(fileURLToPath(import.meta.url));
const truth = JSON.parse(fs.readFileSync(path.join(here, 'truth.json'), 'utf8'));
const SOURCE = fs.readFileSync(path.join(here, 'zap1-lead-to-clickup-slack.ts'), 'utf8');

const IT_LIST = '1201270000004918'; // IT - ITALY - Commission
const IT_CHANNEL = 'C0CEKL5H4LC'; // #leads-it
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
// list and channel: left as shipped unless a value is given ('' takes it out, for the failure checks);
// aurora: true puts test ids for Aurora into the entry, false leaves the shipped (empty) ones.
function patchedSource({ list, channel, aurora = true } = {}) {
  const at = SOURCE.indexOf('"it-ict-growth": {');
  assert.ok(at > 0, 'the Italy entry exists');
  let head = SOURCE.slice(0, at);
  let entry = SOURCE.slice(at);
  const swap = (from, to) => { assert.ok(entry.includes(from), 'in the Italy entry: ' + from); entry = entry.replace(from, to); };
  if (list !== undefined) swap(`listId: "${IT_LIST}",`, `listId: "${list}",`);
  if (channel !== undefined) swap(`slackChannel: "${IT_CHANNEL}",`, `slackChannel: "${channel}",`);
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
const NORWEGIAN = ['Selskap', 'Svar i skjemaet', 'Kontakt', 'Kapasitet', 'Beslutter', 'Omsetning', 'Salgssyklus', 'åpne oppgaven', 'skjema levert', 'Grunn', 'vurderer', 'ansatte', 'Verdi første år', 'Vil ha ut av møtet', 'Kilde', 'uten navn', 'virkedager', 'Ønsker', 'Rute', 'Hvorfor', 'Nettside', 'Spesialisering', 'Hvor lenge', 'Mål neste'];
const noNorwegian = (text, label) => { for (const w of NORWEGIAN) ok(!text.includes(w), `${label}: no Norwegian "${w}"`); };

// ---------------------------------------------------------------- 1. as shipped: the Italy list and #leads-it, and a missing list or channel fails on purpose
const shipped = (await import(pathToFileURL(path.join(here, 'out/zap1-lead-to-clickup-slack.mjs')).href)).default;
{
  const w = makeWorld();
  await run(shipped, w, lead({}));
  eq(w.tasks.length, 1, 'shipped: an Italian lead is written to ClickUp');
  eq(w.tasks[0].list, IT_LIST, 'shipped: on the Italy list, not a UK list'); eq(w.tasks[0].tags, ['growth-it'], 'shipped: tag growth-it');
  eq(w.slack.length, 1, 'shipped: one Slack post'); eq(w.slack[0].channel, IT_CHANNEL, 'shipped: posted in #leads-it, not in #leads-uk');
  ok(w.slack[0].channel !== UK_CHANNEL, 'shipped: not the UK channel');
  // the entry in the source carries the real ids, so a later edit that empties them is caught here
  const entry = SOURCE.slice(SOURCE.indexOf('"it-ict-growth": {'));
  ok(entry.includes(`listId: "${IT_LIST}",`) && entry.includes(`slackChannel: "${IT_CHANNEL}",`), 'shipped: the source carries the list and the channel');
  // no list: on purpose, before anything is written
  const noList = await load({ list: '', aurora: false });
  const w1 = makeWorld();
  let err1 = '';
  try { await run(noList, w1, lead({})); } catch (e) { err1 = String(e.message); }
  ok(/has no ClickUp list yet/.test(err1), 'no list: an Italian lead fails on the missing list');
  eq(w1.tasks.length, 0, 'no list: nothing written to ClickUp'); eq(w1.slack.length, 0, 'no list: nothing posted');
  // a list but no Slack channel: also on purpose, before anything is written
  const noChannel = await load({ channel: '', aurora: false });
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
  for (const label of ['**Company**', '**Form answers**', '**Contact**', '**Routing**', '**Source**', '- Turnover: €2m to under €5m (Da 2 a meno di 5 milioni di €)', '- First-year value: €25k to under €50k (Da 25.000 € a meno di 50.000 €)', '- Sales cycle: One to under three months (Da uno a meno di tre mesi)', '- Capacity: Four to ten (Da quattro a dieci)', '- Decision maker: Me (Io)', '- Specialism: Managed IT services (MSP) (Servizi IT gestiti (MSP))', '- Target next year: 6 milioni di euro', '- E-mail: marco@rossi-informatica.it'])
    ok(d.includes(label), 'fit: ' + label);
  ok(d.includes('**What do you want to get out of this meeting?**\n> Una risposta chiara'), 'fit: the question block the routines read, with the answer as a quote');
  ok(!d.includes('Companies House') && !d.includes('Register check'), 'fit: no register rows');
  noNorwegian(d, 'fit description');
  ok(!d.includes('£'), 'fit: no pound sign');
  eq(w.slack.length, 1, 'fit: one Slack post'); eq(w.slack[0].channel, IT_CHANNEL, 'fit: posted to the Italy channel, not #leads-uk');
  const msg = w.slack[0].text;
  console.log('--- Slack (Italy fit) ---\n' + msg + '\n---');
  // 3 Nov 2026: the whole post, in English. The answers are the form's Italian words, translated; the visitor's own
  // words (the target, what they want from the meeting) stay as written. Area, years trading, target, why and the
  // website are in the post since slackDetail.
  eq(msg, [
    '*FIT* · IT ITALY · Rossi Informatica S.r.l.',
    'Turnover: €2m to under €5m · 25 to 49 employees',
    'Specialism: Managed IT services (MSP) · Years trading: More than five years',
    'Marketing spend per month: €5,000 to under €15,000 · First-year value: €25k to under €50k · Sales cycle: One to under three months',
    'Capacity: Four to ten · Decision maker: Me',
    'Target next year: 6 milioni di euro',
    'Why: turnover €2m or more, two years or more trading, no company register check',
    'Wants from the meeting (their own words): _Una risposta chiara su se questo può funzionare._',
    'Website: www.rossi-informatica.it',
    'Source: meta / ad1',
    'ClickUp: <https://app.clickup.com/t/T1|open the task>',
  ].join('\n'), 'fit slack: the whole post, in English');
  ok(!msg.includes('Companies House'), 'fit slack: no register line');
  ok(!msg.includes('⚠'), 'fit slack: no size warning when there is no register');
  ok(!msg.includes('marco@') && !msg.includes('Amministratore') && !msg.includes('Marco'), 'fit slack: no e-mail, role or contact name');
  for (const word of [].concat(...Object.values(OPTIONS))) if (word.length > 3) ok(!msg.includes(word), 'fit slack: no Italian option word: ' + word);
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
  ok(t.description.includes('- Specialism: Other: Telecomunicazioni (Altro: Telecomunicazioni)'), 'the free text is in the description, English first and the visitor\'s words after it');
  ok(w.slack[0].text.includes('Specialism: Other: Telecomunicazioni'), 'and in Slack, after the English word');
  ok(w.slack[0].text.includes('100 or more employees') && w.slack[0].text.includes('Marketing spend per month: I do not know'), 'Slack: team size and "I do not know" in English');
  ok(!w.slack[0].text.includes('Altro') && !w.slack[0].text.includes('Non lo so') && !w.slack[0].text.includes('o più'), 'Slack: none of the Italian words');
  ok(!w.slack[0].text.includes('333') && !w.slack[0].text.includes('a@acme-it.it'), 'Slack: no phone number, no e-mail address');
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
  ok(msg.includes('Turnover: I would rather not say') && msg.includes('Why: turnover not stated\n'), 'review slack: the withheld turnover and why it is a review, in English');

  const naf = lead({ lead_id: 'l_it_0004', route: 'not_a_fit', route_reason: 'turnover_below_2m, value_under_10k, mystery_code', turnover_band: 'Meno di 1 milione di €', email: 'n@acme-it.it' });
  const w2 = makeWorld();
  await run(wf, w2, naf);
  const t = w2.tasks[0];
  eq(t.status, 'ukvalifisert - archive', 'not a fit: archive'); eq(t.tags, ['growth-it', 'vurder-nettside'], 'not a fit: review tag'); eq(t.assignees, [AURORA_CLICKUP], 'not a fit: assigned to Aurora, not Sondre');
  const c = w2.slack[0].text;
  console.log('--- Slack (Italy not a fit) ---\n' + c + '\n---');
  ok(c.startsWith('*NOT A FIT* · IT ITALY · Rossi Informatica S.r.l.'), 'not a fit slack: heading'); ok(c.includes('Reason: turnover under €2m, client value under €10k, mystery_code'), 'not a fit slack: reasons in euro, an unknown code as it is');
  ok(c.includes('Under €1m · 25 to 49 employees · Reason:'), 'not a fit slack: turnover and people in English');
  ok(c.includes('\nWebsite: www.rossi-informatica.it\n'), 'not a fit slack: the website, which the reviewer needs');
  ok(!c.includes('Meno di') && !c.includes('Da 25'), 'not a fit slack: none of the Italian words');
  ok(c.includes('Aurora reviews website or retainer'), 'not a fit slack: names Aurora'); ok(!c.includes('Sondre') && !c.includes('<@'), 'not a fit slack: no Sondre, no ping'); noNorwegian(c, 'not a fit slack');
  eq(w2.slack[0].channel, IT_CHANNEL, 'not a fit: Italy channel');
  console.log('4 ok');
}
// ---------------------------------------------------------------- 4b. 3 Nov 2026: the limit is 1 million euro, and the band 1 to under 2 million says so in Slack
{
  const wf = await load({});
  const w = makeWorld();
  await run(wf, w, lead({ lead_id: 'l_it_0041', route: 'not_a_fit', route_reason: 'turnover_below_1m', turnover_band: 'Meno di 1 milione di €', email: 'n41@acme-it.it' }));
  const c = w.slack[0].text;
  ok(c.includes('Reason: turnover under €1m'), 'under 1m: the reason names €1m');
  ok(!c.includes('€2m'), 'under 1m: no €2m anywhere in the post');
  noNorwegian(c, 'under 1m slack');

  const w2 = makeWorld();
  await run(wf, w2, lead({ lead_id: 'l_it_0042', route: 'fit', route_reason: 'turnover_1m_2m, trading_2y_plus, register_not_used', turnover_band: 'Da 1 milione a meno di 2 milioni di €', email: 'f42@acme-it.it' }));
  const m = w2.slack[0].text;
  ok(m.startsWith('*FIT* · IT ITALY'), '1m to 2m fit: heading');
  ok(m.includes('Turnover: €1m to under €2m'), '1m to 2m fit: the band in English');
  ok(m.includes('\nWhy: turnover €1m to under €2m, two years or more trading, no company register check\n'), '1m to 2m fit: its own reason');
  ok(!m.includes('€2m or more'), '1m to 2m fit: never called "€2m or more"');
  noNorwegian(m, '1m to 2m fit slack');

  // The first real lead (ResilientX) would now be a review: a client worth 10,000 to under 25,000 euro always is.
  const w3 = makeWorld();
  await run(wf, w3, lead({ lead_id: 'l_it_0043', route: 'review', route_reason: 'value_10k_to_25k', turnover_band: 'Da 1 milione a meno di 2 milioni di €', employees_or_fee_earners: 'Da 10 a 24', first_year_value: 'Da 10.000 € a meno di 25.000 €', email: 'r43@acme-it.it' }));
  const r = w3.slack[0].text;
  ok(r.startsWith('*REVIEW* · IT ITALY') && r.includes('Why: client value €10k to under €25k\n'), '1m to 2m review: the reason');

  // 5,000 euro a month or more on marketing: a fit whatever else was said, and the post says why (the small answers stay in the post).
  const w5 = makeWorld();
  await run(wf, w5, lead({ lead_id: 'l_it_0045', route: 'fit', route_reason: 'spend_5k_plus, register_not_used', turnover_band: 'Meno di 1 milione di €', trading_years: 'Meno di due anni', first_year_value: 'Meno di 10.000 €', email: 'b45@acme-it.it' }));
  const b = w5.slack[0].text;
  ok(b.startsWith('*FIT* · IT ITALY'), 'big spender: heading');
  ok(b.includes('Turnover: Under €1m'), 'big spender: the small turnover is in the post, so the reader sees it');
  ok(b.includes('\nWhy: marketing spend €5,000 a month or more (a call is worth having whatever else they said), no company register check\n'), 'big spender: why it is a fit');
  noNorwegian(b, 'big spender slack');

  // A lead made before 3 Nov still reads as it did.
  const w4 = makeWorld();
  await run(wf, w4, lead({ lead_id: 'l_it_0044', route: 'not_a_fit', route_reason: 'turnover_below_2m', turnover_band: 'Da 1 milione a meno di 2 milioni di €', email: 'o44@acme-it.it' }));
  ok(w4.slack[0].text.includes('Reason: turnover under €2m'), 'an old lead: the old code still has its words');

  // Every code the Italian route can give has its words in the Italy table, so Slack never shows a raw code for it.
  const fromItaly = SOURCE.slice(SOURCE.indexOf('"it-ict-growth": {'));
  const table = fromItaly.slice(fromItaly.indexOf('reasonText: {'), fromItaly.indexOf('answersEn: {'));
  const have = new Set([...table.matchAll(/^\s+([a-z0-9_]+):/gm)].map((x) => x[1]));
  const codes = new Set();
  for (const turnover_band of OPTIONS.turnover) for (const trading_years of OPTIONS.trading) for (const employees_or_fee_earners of OPTIONS.people)
    for (const marketing_spend of OPTIONS.spend) for (const first_year_value of OPTIONS.worth) for (const capacity of OPTIONS.capacity) for (const check of ['unchecked', 'off']) {
      const v = { turnover_band, trading_years, employees_or_fee_earners, marketing_spend, first_year_value, capacity };
      for (const code of itRoute.decide(v, { check, reasons: [] }).reasons) codes.add(code);
    }
  const missing = [...codes].filter((code) => !have.has(code));
  eq(missing, [], 'every reason code the Italian route can give has words in the Italy table: ' + missing.join(', '));
  ok(codes.has('turnover_1m_2m') && codes.has('turnover_below_1m') && !codes.has('turnover_below_2m'), 'the route gives the new codes and no longer the old one');
  console.log('4b ok');
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
// ---------------------------------------------------------------- 6. before Aurora has been invited (the shipped state): nobody assigned, nobody pinged, still works
{
  const wf = shipped;
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
// ---------------------------------------------------------------- 8. English for the people who read Slack (3 Nov 2026)
// The answers arrive as the Italian form's own words. The table that turns them into English must cover every option of
// the form (g/it-ict-growth/core.mjs), and nothing else may change with it: no table in the UK entries.
{
  const entry = SOURCE.slice(SOURCE.indexOf('"it-ict-growth": {'));
  const from = entry.indexOf('answersEn: {');
  ok(from > 0, 'the Italy entry has answersEn');
  const block = entry.slice(from, entry.indexOf('\n    },', from));
  const pairs = [...block.matchAll(/^\s+"([^"]+)": "([^"]+)",$/gm)].map((m) => [m[1], m[2]]);
  const table = new Map(pairs);
  const words = [].concat(...Object.values(OPTIONS));
  eq(table.size, pairs.length, 'answersEn: no word is in the table twice');
  eq(new Set(words).size, words.length, 'the Italian form has no option word twice, so one flat table is unambiguous');
  eq(pairs.length, words.length, 'answersEn: as many entries as the form has options (' + words.length + ')');
  for (const word of words) ok(table.has(word), 'answersEn has an entry for: ' + word);
  for (const [it, en] of pairs) {
    ok(words.includes(it), 'answersEn has no stale entry: ' + it);
    ok(en.trim() === en && en.length > 0 && !/[àèéìíòóùú]/i.test(en), 'English, not Italian: ' + en);
    ok(en !== it || it === 'Cybersecurity', 'translated: ' + it);
  }
  const uk = SOURCE.slice(SOURCE.indexOf('const CAMPAIGNS'), SOURCE.indexOf('"it-ict-growth": {'));
  ok(!uk.includes('answersEn:') && !uk.includes('slackDetail:'), 'the UK entries have no table and no detail lines: their posts are as they were');

  // every option, in the field it belongs to: Slack has the English and none of the Italian, the description has both
  const FIELD = { area: 'specialism', turnover: 'turnover_band', trading: 'trading_years', people: 'employees_or_fee_earners', spend: 'marketing_spend', worth: 'first_year_value', cycle: 'sales_cycle', decider: 'decision_maker', capacity: 'capacity' };
  const SHOWN = {
    specialism: (en) => `Specialism: ${en}`, turnover_band: (en) => `Turnover: ${en}`, trading_years: (en) => `Years trading: ${en}`,
    employees_or_fee_earners: (en) => `${en} employees`, marketing_spend: (en) => `Marketing spend per month: ${en}`, first_year_value: (en) => `First-year value: ${en}`,
    sales_cycle: (en) => `Sales cycle: ${en}`, decision_maker: (en) => `Decision maker: ${en}`, capacity: (en) => `Capacity: ${en}`,
  };
  const ROW = { specialism: 'Specialism', turnover_band: 'Turnover', trading_years: 'Years trading', employees_or_fee_earners: 'People', marketing_spend: 'Marketing spend per month', first_year_value: 'First-year value', sales_cycle: 'Sales cycle', decision_maker: 'Decision maker', capacity: 'Capacity' };
  const wf = await load({});
  let i = 0;
  for (const [list, field] of Object.entries(FIELD)) {
    for (const word of OPTIONS[list]) {
      const w = makeWorld();
      await run(wf, w, lead({ lead_id: 'l_it_en_' + (++i), email: `en${i}@acme-it.it`, [field]: word }));
      const en = table.get(word);
      const msg = w.slack[0].text;
      ok(msg.includes(SHOWN[field](en)), `${field} "${word}" is "${en}" in Slack`);
      if (word.length > 3 && word !== en) ok(!msg.includes(word), `${field} "${word}": the Italian word is not in Slack`);
      // a word that is English already ("Cybersecurity") is printed once
      const row = en === word ? `- ${ROW[field]}: ${word}\n` : `- ${ROW[field]}: ${en} (${word})\n`;
      ok(w.tasks[0].description.includes(row), `${field} "${word}": the description has the English and the visitor's word`);
    }
  }

  // a word the table does not know is shown as it came in, in Slack and in the description, never dropped
  {
    const w = makeWorld();
    await run(wf, w, lead({ lead_id: 'l_it_en_new', email: 'new@acme-it.it', capacity: 'Qualcosa di nuovo' }));
    ok(w.slack[0].text.includes('Capacity: Qualcosa di nuovo'), 'an unknown word is shown as it came in in Slack');
    ok(w.tasks[0].description.includes('- Capacity: Qualcosa di nuovo\n') && !w.tasks[0].description.includes('Qualcosa di nuovo ('), 'and in the description, without brackets');
  }
  // why a lead was routed as it was, in English; unknown codes as they are
  {
    const w = makeWorld();
    await run(wf, w, lead({ lead_id: 'l_it_en_why', email: 'why@acme-it.it', route: 'review', turnover_band: 'Preferisco non dirlo', employees_or_fee_earners: '100 o più', marketing_spend: '15.000 € o più', first_year_value: 'Da 10.000 € a meno di 25.000 €', route_reason: 'turnover_inferred, value_10k_to_25k, mystery_code' }));
    ok(w.slack[0].text.includes('\nWhy: turnover not stated, taken as €2m or more from headcount and marketing spend, client value €10k to under €25k, mystery_code\n'), 'review slack: the reasons in English, an unknown code as it is');
  }
  // what is not there is not printed: no empty lines, no empty labels
  {
    const w = makeWorld();
    await run(wf, w, lead({ lead_id: 'l_it_en_min', email: 'min@acme-it.it', target_next_year: '', company_website: '', meeting_goal: '', route_reason: '' }));
    const m = w.slack[0].text;
    ok(!m.includes('\n\n') && !m.includes('Target next year') && !m.includes('Website') && !m.includes('Why') && !m.includes('Wants from the meeting'), 'a post without target, website, goal and reasons has none of those lines');
  }
  // the visitor's own text cannot start a mention, a link or a tag
  {
    const w = makeWorld();
    await run(wf, w, lead({ lead_id: 'l_it_en_esc', email: 'esc@acme-it.it', target_next_year: '<!channel> 5 milioni & più', company_website: 'a.it/?x=1&y=<2>' }));
    const m = w.slack[0].text;
    ok(m.includes('Target next year: &lt;!channel&gt; 5 milioni &amp; più') && m.includes('Website: a.it/?x=1&amp;y=&lt;2&gt;'), 'target and website are escaped for Slack');
    ok(!m.includes('<!channel>') && !m.includes('<2>'), 'no raw < or > from the visitor');
  }
  console.log('8 ok');
}
console.log('\nALL PASSED (Italy, Zap 1): ' + passed + ' checks');
