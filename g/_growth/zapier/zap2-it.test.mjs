// Zap 2 for Italy (it-ict-growth). The UK checks are in zap2.test.mjs and must stay green next to these.
// The shipped source has no ClickUp list and no Calendly event type for Italy yet, so the checks that need them
// build a copy of the source with test values put into the Italy entry (nothing is written to the repository).
//   node g/_growth/zapier/build.mjs zap2-calendly-booking.ts && node g/_growth/zapier/zap2-it.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const truth = JSON.parse(fs.readFileSync(path.join(here, 'truth.json'), 'utf8'));
const SOURCE = fs.readFileSync(path.join(here, 'zap2-calendly-booking.ts'), 'utf8');

const IT_LIST = '901599999999';
const UK_LIST = '901522580321';
const UK_HEALTH_LIST = '1201270000003578';
const UK_LAW_LIST = '1201270000003579';
const IT_TYPE = 'c0ffee00-1111-4222-8333-444455556666';
const UK_IT_TYPE = '769980c2-23c5-4a60-8f1e-462e5e4ea12e';
const EV = '11111111-2222-3333-4444-555555555555';
const INV = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const KNOWN_TAGS = new Set(['growth-2m', 'growth-it', 'booket-uten-skjema', 'test']);
const KNOWN_STATUS = new Set(['ny lead', 'møte booket', 'ukvalifisert - archive', 'kontaktet']);
const F = { leadId: '08cf9ecc-ff51-4296-9e03-c5250ebb7abf', email: '78c13487-0fee-46d2-893f-68b212b09e6b' };

let passed = 0;
const ok = (cond, label) => { assert.ok(cond, label); passed++; };
const eq = (a, b, label) => { assert.deepEqual(a, b, label); passed++; };

function patchedSource({ list = IT_LIST, types = [IT_TYPE] } = {}) {
  const at = SOURCE.indexOf('"it-ict-growth": {');
  assert.ok(at > 0, 'the Italy entry exists');
  let entry = SOURCE.slice(at);
  const swap = (from, to) => { assert.ok(entry.includes(from), 'in the Italy entry: ' + from); entry = entry.replace(from, to); };
  swap('listId: "",', `listId: "${list}",`);
  swap('eventTypes: [],', `eventTypes: ${JSON.stringify(types)},`);
  return SOURCE.slice(0, at) + entry;
}
let n = 0;
async function load(opts) {
  const dir = path.join(here, 'out');
  fs.mkdirSync(dir, { recursive: true });
  const src = path.join(dir, `zap2-it-variant-${++n}.ts`);
  const out = path.join(dir, `zap2-it-variant-${n}.mjs`);
  fs.writeFileSync(src, patchedSource(opts));
  await build({
    entryPoints: [src], outfile: out, bundle: true, format: 'esm', platform: 'node', target: 'node20', logLevel: 'error',
    alias: { '@zapier/zapier-durable': path.join(here, 'stubs/durable.mjs'), '@zapier/zapier-sdk': path.join(here, 'stubs/sdk.mjs') },
  });
  return (await import(pathToFileURL(out).href + '?n=' + n)).default;
}

function makeWorld() {
  const w = { tasks: [], calls: [], waits: [], nextId: 1 };
  const reply = (status, json) => ({ ok: status >= 200 && status < 300, status, text: async () => (typeof json === 'string' ? json : JSON.stringify(json)) });
  w.addTask = (o) => {
    const id = 'T' + w.nextId++;
    const t = { id, list: o.list || IT_LIST, name: o.name || 'Existing', description: '', status: o.status || 'ny lead', tags: o.tags || [], custom_fields: [], comments: [], date_created: String(Date.now()) };
    if (o.leadId) t.custom_fields.push({ id: F.leadId, value: o.leadId });
    if (o.email) t.custom_fields.push({ id: F.email, value: o.email });
    w.tasks.push(t);
    return t;
  };
  w.fetch = async (url, init = {}) => {
    const method = init.method || 'GET';
    const u = new URL(url);
    const p = u.pathname.replace('/api/v2', '');
    const body = init.body ? JSON.parse(init.body) : undefined;
    w.calls.push({ method, path: p });
    assert.equal(init.connection, 'clickup_main');
    let m = p.match(/^\/list\/(\d+)\/task$/);
    if (m && method === 'GET') {
      assert.ok([IT_LIST, UK_LIST, UK_HEALTH_LIST, UK_LAW_LIST].includes(m[1]), 'search on a known list: ' + m[1]);
      const cf = JSON.parse(u.searchParams.get('custom_fields') || '[]');
      let tasks = w.tasks.filter((t) => t.list === m[1]);
      for (const f of cf) tasks = tasks.filter((t) => (t.custom_fields.find((c) => c.id === f.field_id) || {}).value === f.value);
      return reply(200, { tasks: tasks.map((t) => ({ id: t.id, url: 'https://app.clickup.com/t/' + t.id, status: { status: t.status }, date_created: t.date_created, custom_fields: t.custom_fields.map((c) => ({ id: c.id, value: c.value })) })) });
    }
    if (m && method === 'POST') {
      const errs = [];
      if (!KNOWN_STATUS.has(body.status)) errs.push('status');
      for (const t of body.tags || []) if (!KNOWN_TAGS.has(t)) errs.push('tag ' + t);
      for (const c of body.custom_fields || []) { const def = truth[c.id]; if (!def) errs.push('field ' + c.id); else if (def.type === 'drop_down' && !def.options[c.value]) errs.push('option'); }
      if (errs.length) return reply(400, { err: errs.join(',') });
      const t = w.addTask({ name: body.name, status: body.status, tags: body.tags, list: m[1] });
      t.description = body.markdown_description; t.due_date = body.due_date; t.custom_fields = (body.custom_fields || []).map((c) => ({ ...c }));
      return reply(200, { id: t.id, url: 'https://app.clickup.com/t/' + t.id });
    }
    m = p.match(/^\/task\/([^/]+)$/);
    if (m && method === 'PUT') {
      const t = w.tasks.find((x) => x.id === m[1]);
      if (body.status !== undefined) t.status = body.status;
      if (body.due_date !== undefined) t.due_date = body.due_date;
      return reply(200, { id: t.id });
    }
    m = p.match(/^\/task\/([^/]+)\/comment$/);
    if (m && method === 'GET') return reply(200, { comments: w.tasks.find((x) => x.id === m[1]).comments.map((c) => ({ comment_text: c })) });
    if (m && method === 'POST') { w.tasks.find((x) => x.id === m[1]).comments.push(body.comment_text); return reply(200, { id: 1 }); }
    throw new Error('unexpected ClickUp call ' + method + ' ' + p);
  };
  return w;
}
async function run(wf, world, input) {
  globalThis.__fake = world;
  const ctx = {
    async step(spec) { let last; for (let i = 0; i < (spec.maxAttempts || 1); i++) { try { const r = await spec.run(); return r === undefined ? undefined : JSON.parse(JSON.stringify(r)); } catch (e) { last = e; } } throw last; },
    async wait(name, seconds) { world.waits.push({ name, seconds }); },
  };
  return wf.run(ctx, input);
}
// 22 Oct 2026 is in summer time in both Rome and London, 13:00 UTC is 15:00 in Rome and 14:00 in London.
const START = '2026-10-22T13:00:00.000000Z';
const END = '2026-10-22T13:30:00.000000Z';
const booking = (o = {}, type = IT_TYPE) => ({
  uri: `https://api.calendly.com/scheduled_events/${EV}/invitees/${INV}`, email: 'marco@rossi-informatica.it', first_name: 'Marco', last_name: 'Rossi', name: 'Marco Rossi', status: 'active',
  timezone: 'Europe/Rome', event: `https://api.calendly.com/scheduled_events/${EV}`, old_invitee: null, new_invitee: null, rescheduled: false, text_reminder_number: '+39 333 1234567',
  tracking: { utm_source: 'meta', utm_medium: 'paid', utm_campaign: 'ita-ict', utm_content: 'l_it_book_0001', utm_term: null },
  scheduled_event: { uri: `https://api.calendly.com/scheduled_events/${EV}`, name: 'Elevate Marketing | Commission | IT Italia', status: 'active', start_time: START, end_time: END, event_type: `https://api.calendly.com/event_types/${type}` },
  ...o,
});
const NORWEGIAN = ['Møte booket', 'Status flyttet', 'Flyttet fra', 'Kontakt', 'Tidssone', 'booket uten skjema', 'BOOKET UTEN SKJEMA', 'Koblet på', 'Skjemaet rutet', 'kl.', 'Oppgaven sto', 'Status ikke endret', 'Personen booket', 'virkedager', 'ukjent'];
const noNorwegian = (text, label) => { for (const w of NORWEGIAN) ok(!text.includes(w), `${label}: no Norwegian "${w}"`); };

// ---------------------------------------------------------------- 1. as shipped: Italy has no list and no event type, so an Italian booking is shown as a failure, never guessed onto a UK list
{
  const shipped = (await import(pathToFileURL(path.join(here, 'out/zap2-calendly-booking.mjs')).href)).default;
  const w = makeWorld();
  const t = w.addTask({ leadId: 'l_it_book_0001', status: 'ny lead' });
  let err = '';
  try { await run(shipped, w, booking()); } catch (e) { err = String(e.message); }
  ok(/is not in CAMPAIGNS/.test(err), 'shipped: an Italian booking with a lead id fails visibly (its event type is unknown)');
  eq(t.status, 'ny lead', 'shipped: the task is untouched'); eq(w.tasks.length, 1, 'shipped: nothing is created');
  ok(w.calls.every((c) => c.method === 'GET' && !c.path.includes(IT_LIST)), 'shipped: only searches, none on the Italy list');
  // and a booking with no lead id of ours and an unknown event is skipped, as for any event that is not ours
  const w2 = makeWorld();
  const out = await run(shipped, w2, booking({ tracking: { utm_content: null } }));
  eq(out.skipped, 'other_event', 'shipped: an unknown event without our lead id is skipped'); eq(w2.calls.length, 0, 'shipped: ClickUp is not called');
  console.log('1 ok');
}
// ---------------------------------------------------------------- 2. the lead's task: moved, due date, English comment in Rome time
{
  const wf = await load({});
  const w = makeWorld();
  const t = w.addTask({ leadId: 'l_it_book_0001', status: 'ny lead', email: 'marco@rossi-informatica.it' });
  const out = await run(wf, w, booking());
  eq(out.outcome, 'linked', 'linked'); eq(out.how, 'lead_id', 'by lead id'); eq(t.status, 'møte booket', 'moved to møte booket'); eq(t.due_date, Date.parse(START), 'due date is the meeting start');
  const c = t.comments[0];
  console.log('--- comment (Italy) ---\n' + c + '\n---');
  ok(c.startsWith('Meeting booked in Calendly: Thu 22.10.2026 at 15:00 (Rome), 30 min'), 'time in Rome, one zone only (Oslo is the same hour and is not repeated)');
  ok(!c.includes('London') && !c.includes('Oslo'), 'no London or Oslo for an Italian booking');
  ok(c.includes('Type: Elevate Marketing | Commission | IT Italia'), 'type'); ok(c.includes('Status moved from «ny lead» to «møte booket».'), 'status line, status names stay as ClickUp has them');
  ok(c.includes('Calendly-ref: aaaaaaaa'), 'ref'); noNorwegian(c, 'comment');
  // a second delivery is not commented twice
  await run(wf, w, booking());
  eq(t.comments.length, 1, 'the same booking twice: one comment');
  console.log('2 ok');
}
// ---------------------------------------------------------------- 3. reschedule, an archived lead, a booking found only by e-mail
{
  const wf = await load({});
  const w = makeWorld();
  const t = w.addTask({ leadId: 'l_it_book_0002', status: 'ukvalifisert - archive', email: 'x@acme-it.it' });
  await run(wf, w, booking({ email: 'x@acme-it.it', rescheduled: true, tracking: { utm_content: 'l_it_book_0002' } }));
  const c = t.comments[0];
  ok(c.includes('Moved from an earlier time.') && c.includes('⚠ The form routed this as not applicable. Check before the meeting.'), 'reschedule and archive warning in English'); noNorwegian(c, 'reschedule comment');
  const w2 = makeWorld();
  const t2 = w2.addTask({ leadId: 'l_other', status: 'kontaktet', email: 'm@acme-it.it' });
  await run(wf, w2, booking({ email: 'm@acme-it.it', tracking: { utm_content: null } }));
  ok(t2.comments[0].includes('Linked on the e-mail address, not on lead_id. Check that it is the right task.') && t2.comments[0].includes('Status moved from «kontaktet» to «møte booket».'), 'e-mail match noted');
  console.log('3 ok');
}
// ---------------------------------------------------------------- 4. a booking without the form: a task of its own, in English
{
  const wf = await load({});
  const w = makeWorld();
  const out = await run(wf, w, booking({ tracking: { utm_content: 'd_it_direct_01' } }));
  eq(out.outcome, 'created_without_form', 'created without form');
  const t = w.tasks[0];
  eq(t.list, IT_LIST, 'on the Italy list'); eq(t.tags, ['growth-it', 'booket-uten-skjema'], 'tags (the tag name is the same in every country)'); eq(t.status, 'møte booket', 'status');
  ok(t.name === 'Marco Rossi · booked without form', 'name in English');
  ok(t.description.startsWith('**BOOKED WITHOUT FORM** · IT ITALY'), 'description heading');
  ok(t.description.includes('The person booked the meeting in Calendly without filling in the form.') && t.description.includes('ask for the numbers in the meeting'), 'description text');
  ok(t.description.includes('- Time: Thu 22.10.2026 at 15:00 (Rome), 30 min') && t.description.includes('**Meeting**') && t.description.includes('**Contact**') && t.description.includes('- Time zone: Europe/Rome'), 'blocks and labels');
  noNorwegian(t.description, 'description');
  // the form id is missing: the booking came with an l_ id the form's Zap has not delivered
  const w2 = makeWorld();
  await run(wf, w2, booking({ tracking: { utm_content: 'l_it_missing_01' } }));
  ok(w2.tasks[0].description.includes('the form with id l_it_missing_01 had not reached ClickUp'), 'missing form id explained'); noNorwegian(w2.tasks[0].description, 'missing form description');
  ok(w2.waits.length >= 3, 'it waits for the form task first');
  console.log('4 ok');
}
// ---------------------------------------------------------------- 5. UK stays as it was, in the same build that has Italy in it
{
  const wf = await load({});
  const w = makeWorld();
  const t = w.addTask({ leadId: 'l_uk_book_0001', status: 'ny lead', list: UK_LIST });
  await run(wf, w, booking({ timezone: 'Europe/London', tracking: { utm_content: 'l_uk_book_0001' } }, UK_IT_TYPE));
  const c = t.comments[0];
  ok(c.startsWith('Møte booket i Calendly: tor 22.10.2026 kl. 14:00 (London) / 15:00 (Oslo), 30 min'), 'UK: Norwegian, London and Oslo'); ok(c.includes('Status flyttet fra «ny lead» til «møte booket».'), 'UK: status line');
  // an Italian event never lands on the UK list and the other way round
  const w2 = makeWorld();
  const t2 = w2.addTask({ leadId: 'l_it_book_0009', status: 'ny lead', list: IT_LIST });
  await run(wf, w2, booking({ tracking: { utm_content: 'l_it_book_0009' } }));
  eq(t2.status, 'møte booket', 'Italy: the Italy list');
  const searched = w2.calls.filter((c) => c.method === 'GET' && c.path.endsWith('/task'));
  ok(searched.length > 0 && searched.every((c) => c.path.includes(IT_LIST)), 'Italy: only the Italy list is searched for an Italian event type');
  const searchedUk = w.calls.filter((c) => c.method === 'GET' && c.path.endsWith('/task'));
  ok(searchedUk.length > 0 && searchedUk.every((c) => c.path.includes(UK_LIST)), 'UK: only the UK list is searched for the UK event type');
  console.log('5 ok');
}
console.log('\nALL PASSED (Italy, Zap 2): ' + passed + ' checks');
