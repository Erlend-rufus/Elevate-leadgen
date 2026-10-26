import fs from 'node:fs';
import assert from 'node:assert/strict';

const truth = JSON.parse(fs.readFileSync(new URL('./truth.json', import.meta.url), 'utf8'));
const mod = await import('./out/zap2-calendly-booking.mjs');
const wf = mod.default;

// ---------------------------------------------------------------- fakes
const LIST = '901522580321'; // IT - UK - Commision
const HEALTH_LIST = '1201270000003578'; // HEALTH - UK - Commission
const LAW_LIST = '1201270000003579'; // LAW - UK - Commission
const LISTS = new Set([LIST, HEALTH_LIST, LAW_LIST]);
const KNOWN_TAGS = new Set(['growth-2m', 'growth-health', 'growth-law', 'sjekk-størrelse', 'ta-opp-om-3-mnd', 'booket-uten-skjema', 'test', 'old-import']);
const KNOWN_STATUS = new Set(['ny lead', 'møte booket', 'klar for deal', 'ukvalifisert - archive', 'kontaktet', 'møte booket - noshow', 'møte gjennomført']);
const F = { leadId: '08cf9ecc-ff51-4296-9e03-c5250ebb7abf', email: '78c13487-0fee-46d2-893f-68b212b09e6b', contact: '8fb666f4-c213-4f7a-a8ce-627e496a8313', crm: '8289eaa9-7492-40eb-a35d-092c51bd01ac', stage: 'f4bfea58-b05c-4427-ba1c-b4aa61200583' };
const IT_TYPE = '769980c2-23c5-4a60-8f1e-462e5e4ea12e';
const HEALTH_TYPE = '516ab30e-089f-49dc-a8e6-0e1071a71a1d';
const LAW_TYPE = '1a655d87-d08d-4b52-a8fa-2120472d584d';
const OTHER_TYPE = 'a71fef8d-91f6-44cd-abbf-03feb49574f4';
const EV = '11111111-2222-3333-4444-555555555555';
const INV = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function makeWorld(opts = {}) {
  const w = { tasks: [], calls: [], waits: [], nextId: 1, opts, failNext: [], calendly: [] };
  const reply = (status, json) => ({ ok: status >= 200 && status < 300, status, text: async () => (typeof json === 'string' ? json : JSON.stringify(json)) });
  w.addTask = (o) => {
    const id = 'T' + w.nextId++;
    const t = { id, list: o.list || LIST, name: o.name || 'Existing', description: '', status: o.status || 'ny lead', tags: o.tags || [], due_date: null, due_date_time: null,
      custom_fields: [], comments: [], date_created: String(o.created ?? Date.now()) };
    if (o.leadId) t.custom_fields.push({ id: F.leadId, value: o.leadId });
    if (o.email) t.custom_fields.push({ id: F.email, value: o.email });
    w.tasks.push(t);
    return t;
  };
  w.fetch = async (url, init = {}) => {
    const method = init.method || 'GET';
    if (url.startsWith('https://api.calendly.com/')) {
      assert.equal(init.connection, 'calendly_main', 'Calendly calls must use the calendly_main alias');
      w.calendly.push(url);
      if (w.opts.calendlyEvent) return reply(200, { resource: w.opts.calendlyEvent });
      return reply(404, { title: 'Not Found' });
    }
    const u = new URL(url);
    const path = u.pathname.replace('/api/v2', '');
    const body = init.body ? JSON.parse(init.body) : undefined;
    w.calls.push({ method, path, query: u.search, body });
    assert.equal(init.connection, 'clickup_main', 'ClickUp calls must use the clickup_main alias');
    if (w.failNext.length && w.failNext[0].match(method, path)) {
      const f = w.failNext[0];
      f.times = (f.times ?? 1) - 1;
      if (f.times <= 0) w.failNext.shift();
      return reply(f.status, f.body || { err: 'forced', ECODE: 'X' });
    }
    let m = path.match(/^\/list\/(\d+)\/task$/);
    if (m && method === 'GET') {
      assert.ok(LISTS.has(m[1]), 'search on a known list: ' + m[1]);
      assert.equal(u.searchParams.get('include_closed'), 'true');
      const cf = JSON.parse(u.searchParams.get('custom_fields') || '[]');
      if (w.opts.emailSearch400 && cf.some((f) => f.field_id === F.email)) return reply(400, { err: 'operator not supported', ECODE: 'X' });
      let tasks = w.tasks.filter((t) => t.list === m[1]);
      for (const f of cf) tasks = tasks.filter((t) => (t.custom_fields.find((c) => c.id === f.field_id) || {}).value === f.value);
      return reply(200, { tasks: tasks.map((t) => ({ id: t.id, url: 'https://app.clickup.com/t/' + t.id, status: { status: t.status }, date_created: t.date_created,
        custom_fields: t.custom_fields.map((c) => ({ id: c.id, value: c.value })) })), last_page: true });
    }
    if (m && method === 'POST') {
      assert.ok(LISTS.has(m[1]), 'create on a known list: ' + m[1]);
      const errs = [];
      if (!KNOWN_STATUS.has(body.status)) errs.push('status');
      for (const t of body.tags || []) if (!KNOWN_TAGS.has(t)) errs.push('tag ' + t);
      for (const c of body.custom_fields || []) {
        const def = truth[c.id];
        if (!def) { errs.push('field ' + c.id); continue; }
        if (def.type === 'drop_down' && !def.options[c.value]) errs.push('option ' + c.value);
        if (def.type === 'email' && !String(c.value).includes('@')) errs.push('email');
      }
      if (w.opts.rejectFields && body.custom_fields) errs.push('forced');
      if (errs.length) return reply(400, { err: 'bad: ' + errs.join(','), ECODE: 'BAD' });
      const t = w.addTask({ name: body.name, status: body.status, tags: body.tags, list: m[1] });
      t.description = body.markdown_description; t.due_date = body.due_date ?? null; t.due_date_time = body.due_date_time ?? null;
      t.custom_fields = (body.custom_fields || []).map((c) => ({ ...c }));
      t.created_body = body;
      return reply(200, { id: t.id, url: 'https://app.clickup.com/t/' + t.id, name: t.name });
    }
    m = path.match(/^\/task\/([^/]+)$/);
    if (m && method === 'PUT') {
      const t = w.tasks.find((x) => x.id === m[1]);
      if (!t) return reply(404, { err: 'no task' });
      if (body.status !== undefined) {
        if (!KNOWN_STATUS.has(body.status)) return reply(400, { err: 'status' });
        t.status = body.status;
      }
      if (body.due_date !== undefined) { t.due_date = body.due_date; t.due_date_time = body.due_date_time ?? null; }
      t.puts = (t.puts || 0) + 1; t.lastPut = body;
      return reply(200, { id: t.id, status: { status: t.status }, huge: 'x'.repeat(20000) });
    }
    m = path.match(/^\/task\/([^/]+)\/comment$/);
    if (m && method === 'GET') {
      const t = w.tasks.find((x) => x.id === m[1]);
      return reply(200, { comments: t.comments.map((c) => ({ comment_text: c })) });
    }
    if (m && method === 'POST') {
      const t = w.tasks.find((x) => x.id === m[1]);
      t.comments.push(body.comment_text);
      return reply(200, { id: 1 });
    }
    throw new Error('unexpected ClickUp call ' + method + ' ' + path);
  };
  return w;
}

async function run(world, input, hooks = {}) {
  globalThis.__fake = world;
  const log = [];
  const names = new Set();
  const ctx = {
    async step(spec, fn) {
      const name = typeof spec === 'string' ? spec : spec.name;
      assert.ok(!names.has(name), 'duplicate step name ' + name);
      names.add(name);
      const run = typeof spec === 'string' ? fn : spec.run;
      const attempts = typeof spec === 'string' ? 1 : spec.maxAttempts || 1;
      let lastErr;
      for (let i = 1; i <= attempts; i++) {
        try { const r = await run(); log.push({ name, attempt: i, ok: true }); return r === undefined ? undefined : JSON.parse(JSON.stringify(r)); }
        catch (e) { lastErr = e; log.push({ name, attempt: i, ok: false, err: String(e.message || e).slice(0, 160) }); }
      }
      throw lastErr;
    },
    async wait(name, seconds) {
      assert.ok(!names.has(name), 'duplicate wait/step name ' + name);
      names.add(name);
      world.waits.push({ name, seconds });
      if (hooks.onWait) hooks.onWait(world, world.waits.length);
    },
  };
  const out = await wf.run(ctx, input);
  return { out, log };
}

// ---------------------------------------------------------------- payloads
const START = '2026-10-22T13:00:00.000000Z';
const END = '2026-10-22T13:30:00.000000Z';
function nested(o = {}) {
  const base = {
    uri: `https://api.calendly.com/scheduled_events/${EV}/invitees/${INV}`,
    email: 'booker@example.invalid', first_name: 'Test', last_name: 'Booker', name: 'Test Booker', status: 'active', timezone: 'Europe/London',
    event: `https://api.calendly.com/scheduled_events/${EV}`, old_invitee: null, new_invitee: null, rescheduled: false, text_reminder_number: null,
    cancel_url: 'https://calendly.com/cancellations/secret', reschedule_url: 'https://calendly.com/reschedulings/secret',
    questions_and_answers: [],
    tracking: { utm_campaign: null, utm_source: null, utm_medium: null, utm_content: 'l_test_book_0001', utm_term: null, salesforce_uuid: null },
    scheduled_event: { uri: `https://api.calendly.com/scheduled_events/${EV}`, name: 'Elevate Marketing | Commission I IT', status: 'active', start_time: START, end_time: END,
      event_type: `https://api.calendly.com/event_types/${IT_TYPE}`, location: { type: 'google_conference', join_url: 'https://meet.google.com/x' },
      event_memberships: [{ user: 'https://api.calendly.com/users/u1' }], invitees_counter: { total: 1, active: 1, limit: 1 } },
  };
  const merged = { ...base, ...o };
  if (o.tracking) merged.tracking = { ...base.tracking, ...o.tracking };
  if (o.scheduled_event) merged.scheduled_event = { ...base.scheduled_event, ...o.scheduled_event };
  return merged;
}
function flattened(p) {
  const out = {};
  const walk = (n, prefix) => {
    if (n && typeof n === 'object' && !Array.isArray(n)) for (const [k, v] of Object.entries(n)) walk(v, prefix ? `${prefix}__${k}` : k);
    else out[prefix] = n;
  };
  walk(p, '');
  return out;
}
const envelope = (p) => ({ created_at: '2026-10-18T22:00:00.000000Z', created_by: 'https://api.calendly.com/users/u1', event: 'invitee.created', payload: p });

let passed = 0;
const ok = (cond, label) => { assert.ok(cond, label); passed++; };
const eq = (a, b, label) => { assert.deepEqual(a, b, label); passed++; };
const startMs = Date.parse(START);
const allTexts = [];
const rec = (w) => { for (const t of w.tasks) { allTexts.push(t.description || '', ...t.comments, t.name); } };

// ---------------------------------------------------------------- 1. nested payload, task exists: status, due date, comment
{
  const w = makeWorld();
  const t = w.addTask({ leadId: 'l_test_book_0001', email: 'booker@example.invalid', status: 'ny lead' });
  const { out } = await run(w, nested());
  eq(out.outcome, 'linked', 'linked'); eq(out.how, 'lead_id', 'by lead id'); eq(out.statusBefore, 'ny lead', 'before'); eq(out.statusMoved, true, 'moved');
  eq(t.status, 'møte booket', 'status set'); eq(t.due_date, startMs, 'due date is the meeting start'); eq(t.due_date_time, true, 'with time');
  eq(t.comments.length, 1, 'one comment');
  console.log('--- comment (linked) ---\n' + t.comments[0] + '\n---');
  ok(t.comments[0].startsWith('Møte booket i Calendly: tor 22.10.2026 kl. 14:00 (London) / 15:00 (Oslo), 30 min'), 'time line');
  ok(t.comments[0].includes('Type: Elevate Marketing | Commission I IT'), 'type');
  ok(t.comments[0].includes('Status flyttet fra «ny lead» til «møte booket».'), 'status line');
  ok(t.comments[0].includes('Calendly-ref: aaaaaaaa'), 'ref');
  ok(!t.comments[0].includes('secret') && !t.comments[0].includes('meet.google.com') && !t.comments[0].includes('example.invalid'), 'no cancel/reschedule links, join url or e-mail in the comment');
  eq(w.calls.filter((c) => c.method === 'GET' && c.path.endsWith('/task')).length, 1, 'one search');
  eq(w.waits.length, 0, 'no waiting when the task is there');
  eq(w.calendly.length, 0, 'no Calendly call when the trigger carries the event');
  const text = JSON.stringify(out);
  ok(!text.includes('booker@') && !text.includes('Test Booker'), 'no name or e-mail in the run output');
  rec(w);
  console.log('1 ok');
}
// ---------------------------------------------------------------- 2. flattened and envelope shapes read the same
for (const [label, input] of [['flattened', flattened(nested())], ['envelope', envelope(nested())], ['json string', JSON.stringify(nested())], ['flattened in envelope', envelope(flattened(nested()))]]) {
  const w = makeWorld();
  const t = w.addTask({ leadId: 'l_test_book_0001', status: 'kontaktet' });
  const { out } = await run(w, input);
  eq(out.outcome, 'linked', label + ': linked'); eq(t.status, 'møte booket', label + ': status'); eq(t.due_date, startMs, label + ': due');
  ok(t.comments[0].includes('tor 22.10.2026 kl. 14:00 (London) / 15:00 (Oslo)'), label + ': time');
  console.log('2 ' + label + ' ok');
}
// ---------------------------------------------------------------- 3. not ours: skipped without touching ClickUp
{
  const w = makeWorld();
  const { out } = await run(w, nested({ tracking: { utm_content: null }, scheduled_event: { event_type: `https://api.calendly.com/event_types/${OTHER_TYPE}` } }));
  eq(out.skipped, 'other_event', 'skipped'); eq(w.calls.length, 0, 'no ClickUp calls'); eq(w.calendly.length, 0, 'no Calendly calls');
  const { out: out2 } = await run(makeWorld(), { ...nested(), status: 'canceled' });
  eq(out2.skipped, 'not_active', 'canceled skipped');
  // an ad's own utm_content is not a lead id
  const w3 = makeWorld();
  const { out: out3 } = await run(w3, nested({ tracking: { utm_content: 'A2-V1' }, scheduled_event: { event_type: `https://api.calendly.com/event_types/${OTHER_TYPE}` } }));
  eq(out3.skipped, 'other_event', 'ad utm_content ignored');
  console.log('3 ok');
}
// ---------------------------------------------------------------- 4. a lead id on another event type is still ours
{
  const w = makeWorld();
  const t = w.addTask({ leadId: 'l_test_book_0001', status: 'ny lead' });
  const { out } = await run(w, nested({ scheduled_event: { event_type: `https://api.calendly.com/event_types/${OTHER_TYPE}` } }));
  eq(out.outcome, 'linked', 'linked by lead id'); eq(t.status, 'møte booket', 'moved'); eq(out.eventNotInCampaigns, true, 'flagged in the output');
  console.log('4 ok');
}
// ---------------------------------------------------------------- 4b. a lead id on another event type and no task: loud failure, nothing created or guessed
{
  const other = { scheduled_event: { event_type: `https://api.calendly.com/event_types/${OTHER_TYPE}` } };
  const w = makeWorld();
  await assert.rejects(() => run(w, nested(other)), /is not in CAMPAIGNS/); passed++;
  eq(w.tasks.length, 0, 'nothing created for an l_ id');
  ok(!w.calls.some((c) => c.method === 'GET' && c.query.includes(F.email)), 'no e-mail guessing');
  ok(!w.calls.some((c) => c.method === 'POST'), 'no writes at all');
  const w2 = makeWorld();
  await assert.rejects(() => run(w2, nested({ ...other, tracking: { utm_content: 'd_0123456789abcdef0123' } })), /is not in CAMPAIGNS/); passed++;
  eq(w2.tasks.length, 0, 'nothing created for a d_ id');
  console.log('4b ok');
}
// ---------------------------------------------------------------- 4c. the short alphanumeric id form in Calendly's docs reads the same
{
  const w = makeWorld();
  const t = w.addTask({ leadId: 'l_test_book_0001', status: 'ny lead' });
  const p = nested({ uri: 'https://api.calendly.com/scheduled_events/GBGBDCAADAEDCRZ2/invitees/AAAAAAAAAAAAAAAA', event: 'https://api.calendly.com/scheduled_events/GBGBDCAADAEDCRZ2',
    scheduled_event: { uri: 'https://api.calendly.com/scheduled_events/GBGBDCAADAEDCRZ2' } });
  const { out } = await run(w, p);
  eq(out.outcome, 'linked', 'linked with short ids'); eq(t.status, 'møte booket', 'moved');
  ok(t.comments[0].includes('Calendly-ref: aaaaaaaa'), 'ref from the invitee id');
  console.log('4c ok');
}
// ---------------------------------------------------------------- 5. unreadable bookings fail loudly
{
  await assert.rejects(() => run(makeWorld(), { something: 'else', tracking__utm_content: null }), /Cannot tell which Calendly event was booked\. Keys seen: /);
  passed++;
  const bad = nested(); bad.scheduled_event = { event_type: `https://api.calendly.com/event_types/${IT_TYPE}` }; delete bad.event;
  await assert.rejects(() => run(makeWorld(), bad), /Unreadable Calendly booking: start=missing/);
  passed++;
  const noEmail = nested(); delete noEmail.email;
  await assert.rejects(() => run(makeWorld(), noEmail), /email=missing/);
  passed++;
  console.log('5 ok');
}
// ---------------------------------------------------------------- 6. event details only by URI: read from Calendly
{
  const w = makeWorld({ calendlyEvent: { start_time: START, end_time: END, event_type: `https://api.calendly.com/event_types/${IT_TYPE}`, name: 'Elevate Marketing | Commission I IT' } });
  const t = w.addTask({ leadId: 'l_test_book_0001', status: 'ny lead' });
  const p = nested(); delete p.scheduled_event;
  const { out } = await run(w, p);
  eq(out.outcome, 'linked', 'linked'); eq(w.calendly, [`https://api.calendly.com/scheduled_events/${EV}`], 'one Calendly read'); eq(t.due_date, startMs, 'due from Calendly');
  console.log('6 ok');
}
// ---------------------------------------------------------------- 7. booking page's d_ id, no task: created; second delivery does not duplicate
{
  const w = makeWorld();
  const p = nested({ tracking: { utm_content: 'd_0123456789abcdef0123' } });
  const { out } = await run(w, p);
  eq(out.outcome, 'created_without_form', 'created'); eq(w.tasks.length, 1, 'one task');
  const t = w.tasks[0];
  eq(t.status, 'møte booket', 'booked'); eq(t.tags, ['growth-2m', 'booket-uten-skjema', 'test'], 'tags (test e-mail)');
  eq(t.due_date, startMs, 'due'); eq(t.due_date_time, true, 'due with time'); eq(t.name, 'Test Booker · booket uten skjema', 'name');
  eq(t.custom_fields.find((c) => c.id === F.leadId).value, 'd_0123456789abcdef0123', 'd_ id kept');
  eq(t.custom_fields.find((c) => c.id === F.email).value, 'booker@example.invalid', 'email field'); eq(t.custom_fields.find((c) => c.id === F.crm).value, '0b565b82-9090-45fa-8bf9-67f2a7d2eca3', 'crm type Lead');
  eq(t.custom_fields.find((c) => c.id === F.contact).value, 'Test Booker', 'contact');
  ok(t.description.includes('uten å fylle ut skjemaet') && t.description.includes('lead_id: d_0123456789abcdef0123'), 'description');
  console.log('--- description (no form) ---\n' + t.description + '\n---');
  await run(w, p);
  eq(w.tasks.length, 1, 'still one task after a second delivery');
  await run(w, p);
  eq(w.tasks.length, 1, 'and after a third'); eq(w.tasks[0].comments.length, 1, 'one comment only');
  rec(w);
  console.log('7 ok');
}
// ---------------------------------------------------------------- 8. no lead id, our event, e-mail matches a recent task
{
  const w = makeWorld();
  const t = w.addTask({ leadId: 'l_other', email: 'booker@example.invalid', status: 'ny lead', created: Date.now() - 3 * 86400000 });
  const { out } = await run(w, nested({ tracking: { utm_content: null } }));
  eq(out.outcome, 'linked', 'linked'); eq(out.how, 'email', 'by e-mail'); eq(t.status, 'møte booket', 'moved');
  ok(t.comments[0].includes('Koblet på e-postadressen, ikke på lead_id'), 'says how');
  // an old task is not linked
  const w2 = makeWorld();
  w2.addTask({ leadId: 'l_old', email: 'booker@example.invalid', status: 'ny lead', created: Date.now() - 200 * 86400000 });
  const { out: o2 } = await run(w2, nested({ tracking: { utm_content: null } }));
  eq(o2.outcome, 'created_without_form', 'old task not linked'); eq(w2.tasks.length, 2, 'new task made');
  // the newest of two
  const w3 = makeWorld();
  const a = w3.addTask({ leadId: 'l_a', email: 'booker@example.invalid', created: Date.now() - 20 * 86400000 });
  const b = w3.addTask({ leadId: 'l_b', email: 'booker@example.invalid', created: Date.now() - 2 * 86400000 });
  await run(w3, nested({ tracking: { utm_content: null } }));
  eq([a.status, b.status], ['ny lead', 'møte booket'], 'newest linked');
  console.log('8 ok');
}
// ---------------------------------------------------------------- 9. no lead id, no match: a task of its own with a c_ id
{
  const w = makeWorld();
  const { out } = await run(w, nested({ tracking: { utm_content: null, utm_source: 'linkedin', utm_campaign: 'dm' }, email: 'someone@acme-it.co.uk', name: 'Sam Someone' }));
  eq(out.outcome, 'created_without_form', 'created'); const t = w.tasks[0];
  eq(t.custom_fields.find((c) => c.id === F.leadId).value, 'c_aaaaaaaabbbbccccdddd', 'c_ id from the invitee uuid');
  eq(t.tags, ['growth-2m', 'booket-uten-skjema'], 'tags (not a test)');
  ok(t.description.includes('utm_source: linkedin') && t.description.includes('utm_campaign: dm'), 'source in description');
  ok(t.description.includes('E-post: someone@acme-it.co.uk'), 'contact in description');
  const again = await run(w, nested({ tracking: { utm_content: null }, email: 'someone@acme-it.co.uk', name: 'Sam Someone' }));
  eq(w.tasks.length, 1, 'second delivery: still one task'); eq(again.out.outcome, 'linked', 'second delivery is linked (found by its c_ id? no: by e-mail)');
  console.log('9 ok');
}
// ---------------------------------------------------------------- 10. form id but no task yet: waits, then makes its own task
{
  const w = makeWorld();
  const { out } = await run(w, nested({ tracking: { utm_content: 'l_0123456789abcdef0123' } }));
  eq(w.waits.map((x) => x.seconds), [40, 40, 40], 'three waits of 40 seconds'); eq(new Set(w.waits.map((x) => x.name)).size, 3, 'unique wait names');
  eq(out.outcome, 'created_without_form', 'created'); eq(out.formIdMissing, true, 'form id flagged'); eq(w.tasks.length, 1, 'one task');
  const t = w.tasks[0];
  eq(t.custom_fields.find((c) => c.id === F.leadId).value, 'c_aaaaaaaabbbbccccdddd', 'gets its own id, so the form task can still be made');
  ok(t.description.includes('skjemaet med id l_0123456789abcdef0123 var ikke kommet inn'), 'description names the form id');
  eq(w.calls.filter((c) => c.method === 'GET' && c.query.includes(encodeURIComponent(F.email).slice(0, 8))).length, 0, 'no e-mail search for a form id');
  console.log('10 ok');
}
// ---------------------------------------------------------------- 11. the form task shows up while waiting
{
  const w = makeWorld();
  const { out } = await run(w, nested({ tracking: { utm_content: 'l_0123456789abcdef0123' } }), {
    onWait: (world, n) => { if (n === 1) world.addTask({ leadId: 'l_0123456789abcdef0123', status: 'ny lead' }); },
  });
  eq(out.outcome, 'linked', 'linked'); eq(out.lookedByLeadId, 2, 'looked twice'); eq(w.waits.length, 1, 'waited once'); eq(w.tasks[0].status, 'møte booket', 'moved');
  console.log('11 ok');
}
// ---------------------------------------------------------------- 12. status guards
{
  for (const [from, moved, expect] of [
    ['kontaktet', true, 'Status flyttet fra «kontaktet» til «møte booket».'],
    ['møte booket - noshow', true, 'Status flyttet fra «møte booket - noshow» til «møte booket».'],
    ['møte gjennomført', false, 'Status ikke endret (møte gjennomført)'],
    ['klar for deal', false, 'Status ikke endret (klar for deal)'],
    ['ukvalifisert - archive', true, '⚠ Skjemaet rutet dette som ikke aktuelt. Sjekk før møtet.'],
    ['møte booket', false, 'Oppgaven sto allerede i «møte booket». Sjekk om dette er en ny booking eller en dobbel.'],
  ]) {
    const w = makeWorld();
    const t = w.addTask({ leadId: 'l_test_book_0001', status: from });
    const { out } = await run(w, nested());
    eq(out.statusMoved, moved, from + ': moved flag');
    eq(t.status, moved ? 'møte booket' : from, from + ': status');
    eq(t.lastPut.status === undefined, !moved, from + ': PUT carries a status only when it moves');
    eq(t.due_date, startMs, from + ': due date always set');
    ok(t.comments[0].includes(expect), from + ': comment says ' + expect);
  }
  const w = makeWorld();
  const t = w.addTask({ leadId: 'l_test_book_0001', status: 'møte booket' });
  await run(w, nested({ old_invitee: `https://api.calendly.com/scheduled_events/${EV}/invitees/99999999-bbbb-cccc-dddd-eeeeeeeeeeee`, rescheduled: false }));
  ok(t.comments[0].includes('Flyttet fra en tidligere tid.') && t.comments[0].includes('Status er fortsatt «møte booket».'), 'reschedule on a booked task');
  console.log('12 ok');
}
// ---------------------------------------------------------------- 13. reschedule without tracking: found by e-mail
{
  const w = makeWorld();
  const t = w.addTask({ leadId: 'l_test_book_0001', email: 'booker@example.invalid', status: 'møte booket' });
  const old = `https://api.calendly.com/scheduled_events/${EV}/invitees/99999999-bbbb-cccc-dddd-eeeeeeeeeeee`;
  const { out } = await run(w, nested({ tracking: { utm_content: null }, old_invitee: old, scheduled_event: { start_time: '2026-10-29T09:00:00.000000Z', end_time: '2026-10-29T09:30:00.000000Z' } }));
  eq(out.how, 'email', 'by e-mail'); eq(out.rescheduled, true, 'flagged'); eq(t.due_date, Date.parse('2026-10-29T09:00:00Z'), 'new time');
  ok(t.comments[0].includes('Flyttet fra en tidligere tid.'), 'says rescheduled');
  ok(t.comments[0].includes('ons 29.10.2026') === false && t.comments[0].includes('tor 29.10.2026 kl. 09:00 (London)'), 'weekday and clock: 29 Oct 2026 is a Thursday, still British Summer Time? no, GMT from 25 Oct');
  console.log('13 ok');
}
// ---------------------------------------------------------------- 14. winter time
{
  const w = makeWorld();
  const t = w.addTask({ leadId: 'l_test_book_0001', status: 'ny lead' });
  await run(w, nested({ scheduled_event: { start_time: '2026-12-10T10:00:00.000000Z', end_time: '2026-12-10T10:30:00.000000Z' } }));
  ok(t.comments[0].startsWith('Møte booket i Calendly: tor 10.12.2026 kl. 10:00 (London) / 11:00 (Oslo), 30 min'), 'winter time: ' + t.comments[0].split('\n')[0]);
  console.log('14 ok');
}
// ---------------------------------------------------------------- 15. ClickUp failures
{
  // the update fails twice with 500, then works: the step is retried
  const w = makeWorld();
  const t = w.addTask({ leadId: 'l_test_book_0001', status: 'ny lead' });
  w.failNext.push({ match: (m, p) => m === 'PUT', status: 500, times: 2 });
  const { log } = await run(w, nested());
  eq(t.status, 'møte booket', 'status set after retries'); eq(log.filter((l) => l.name === 'update-task').map((l) => l.ok), [false, false, true], 'two failures then success');
  // permanently down: the run fails, so it shows in the run history
  const w2 = makeWorld();
  w2.addTask({ leadId: 'l_test_book_0001', status: 'ny lead' });
  w2.failNext.push({ match: (m, p) => m === 'PUT', status: 500, times: 99 });
  await assert.rejects(() => run(w2, nested()), /ClickUp update failed: HTTP 500/);
  passed++;
  // the search itself failing is a failure too (never "no task, so make one")
  const w3 = makeWorld();
  w3.failNext.push({ match: (m, p) => m === 'GET' && p.endsWith('/task'), status: 500, times: 99 });
  await assert.rejects(() => run(w3, nested()), /ClickUp search failed: HTTP 500/);
  eq(w3.tasks.length, 0, 'nothing created when the search fails');
  // e-mail search not supported: falls through to a task of its own, no failure
  const w4 = makeWorld({ emailSearch400: true });
  const { out } = await run(w4, nested({ tracking: { utm_content: null } }));
  eq(out.outcome, 'created_without_form', 'e-mail search 400 does not fail the booking'); ok(String(out.emailLookup).includes('HTTP 400'), 'noted');
  // a custom field ClickUp refuses must not cost the booking
  const w5 = makeWorld({ rejectFields: true });
  const { out: o5 } = await run(w5, nested({ tracking: { utm_content: 'd_0123456789abcdef0123' } }));
  eq(o5.outcome, 'created_without_form', 'created without fields'); eq(w5.tasks[0].created_body.custom_fields, undefined, 'second try carried none');
  console.log('15 ok');
}
// ---------------------------------------------------------------- 16. house style in everything written
{
  const w = makeWorld();
  w.addTask({ leadId: 'l_test_book_0001', status: 'ukvalifisert - archive' });
  await run(w, nested());
  await run(makeWorld(), nested({ tracking: { utm_content: null } }));
  const w2 = makeWorld();
  await run(w2, nested({ tracking: { utm_content: 'd_0123456789abcdef0123' } }));
  rec(w); rec(w2);
  for (const t of allTexts) { ok(!/[–—]/.test(t), 'no en or em dash in: ' + t.slice(0, 50)); ok(!t.includes('!'), 'no exclamation mark'); }
  console.log('16 ok');
}
// ---------------------------------------------------------------- 17. health and law bookings: own event, own list, own tag
for (const [label, type, list, tag] of [['health', HEALTH_TYPE, HEALTH_LIST, 'growth-health'], ['law', LAW_TYPE, LAW_LIST, 'growth-law']]) {
  const bookedOn = (extra = {}) => nested({ ...extra, scheduled_event: { name: 'Elevate Marketing | ' + label, event_type: `https://api.calendly.com/event_types/${type}` } });
  // the lead's task is in its own list: linked by lead id, status moved, due date set
  const w = makeWorld();
  const t = w.addTask({ leadId: 'l_test_book_0001', status: 'ny lead', list });
  const { out } = await run(w, bookedOn());
  eq(out.outcome, 'linked', label + ': linked'); eq(out.how, 'lead_id', label + ': by lead id'); eq(t.status, 'møte booket', label + ': moved'); eq(t.due_date, startMs, label + ': due date');
  eq(out.eventNotInCampaigns, false, label + ': event is in CAMPAIGNS');
  ok(w.calls.every((c) => !c.path.startsWith('/list/') || c.path.startsWith('/list/' + list + '/')), label + ': only its own list was searched');
  // no lead id, no task: the booking gets a task of its own in the right list with the right tag
  const w2 = makeWorld();
  const { out: o2 } = await run(w2, bookedOn({ tracking: { utm_content: 'd_0123456789abcdef0123' } }));
  eq(o2.outcome, 'created_without_form', label + ': created'); eq(w2.tasks.length, 1, label + ': one task'); eq(w2.tasks[0].list, list, label + ': in its own list');
  eq(w2.tasks[0].tags, [tag, 'booket-uten-skjema', 'test'], label + ': tags'); eq(w2.tasks[0].status, 'møte booket', label + ': booked');
  eq(w2.tasks[0].custom_fields.find((c) => c.id === F.leadId).value, 'd_0123456789abcdef0123', label + ': d_ id kept');
  eq(w2.tasks[0].custom_fields.find((c) => c.id === F.crm).value, '0b565b82-9090-45fa-8bf9-67f2a7d2eca3', label + ': crm type Lead');
  await run(w2, bookedOn({ tracking: { utm_content: 'd_0123456789abcdef0123' } }));
  eq(w2.tasks.length, 1, label + ': second delivery does not duplicate');
  // no lead id: matched by e-mail in its own list, and never on a task in another list
  const w3 = makeWorld();
  const other = w3.addTask({ leadId: 'l_it_task', email: 'booker@example.invalid', status: 'ny lead', list: list === HEALTH_LIST ? LAW_LIST : HEALTH_LIST });
  const it = w3.addTask({ leadId: 'l_it_task2', email: 'booker@example.invalid', status: 'ny lead', list: LIST });
  const mine = w3.addTask({ leadId: 'l_mine', email: 'booker@example.invalid', status: 'ny lead', list });
  await run(w3, bookedOn({ tracking: { utm_content: null } }));
  eq([other.status, it.status, mine.status], ['ny lead', 'ny lead', 'møte booket'], label + ': e-mail match stays inside its list');
  // an IT booking never touches these lists
  const w4 = makeWorld();
  const hl = w4.addTask({ leadId: 'l_x', email: 'booker@example.invalid', status: 'ny lead', list });
  await run(w4, nested({ tracking: { utm_content: null } }));
  eq(hl.status, 'ny lead', label + ': an IT booking leaves this list alone'); eq(w4.tasks.filter((x) => x.list === LIST).length, 1, label + ': IT booking made its own IT task');
  console.log('17 ' + label + ' ok');
}
// a lead id on an event that is not ours is searched in every list
{
  const w = makeWorld();
  const t = w.addTask({ leadId: 'l_test_book_0001', status: 'ny lead', list: LAW_LIST });
  const { out } = await run(w, nested({ scheduled_event: { event_type: `https://api.calendly.com/event_types/${OTHER_TYPE}` } }));
  eq(out.outcome, 'linked', 'other event, lead id in the law list: linked'); eq(t.status, 'møte booket', 'moved'); eq(out.eventNotInCampaigns, true, 'flagged');
  console.log('17 other ok');
}
console.log(`\nALL OK: ${passed} checks`);
