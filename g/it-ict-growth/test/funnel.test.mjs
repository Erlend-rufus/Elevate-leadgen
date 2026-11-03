// Tests for /g/it-ict-growth (Italy, IT and ICT firms): the form, the routing, the endpoint and the pages.
// Run with: npm run test:g-growth
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, cpSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as core from '../core.mjs';
import * as route from '../route.mjs';
import * as ukCore from '../../uk-it-growth/core.mjs';
import * as ukRoute from '../../uk-it-growth/route.mjs';
import { ROOT, rig, post, bodyOf, visible } from '../../uk-it-growth/test/helpers.mjs';
import { campaigns as realCampaigns } from '../../../netlify/functions/lead/campaigns.mjs';
import { buildPayload } from '../../../netlify/functions/lead/payload.mjs';

const O = core.OPTIONS;
const SLUG = 'it-ict-growth';
const cfg = JSON.parse(readFileSync(join(ROOT, 'g', SLUG, 'config.json'), 'utf8'));
const copy = JSON.parse(readFileSync(join(ROOT, 'g', SLUG, 'copy.json'), 'utf8'));
const legal = JSON.parse(readFileSync(join(ROOT, 'g', SLUG, 'legal.json'), 'utf8'));
const PAGES = ['index.html', 'book/index.html', 'takk/index.html', 'review/index.html', 'not-now/index.html', 'not-a-fit/index.html', 'privacy/index.html', 'terms/index.html'];
const html = (p) => readFileSync(join(ROOT, 'public', 'g', SLUG, p), 'utf8');
const text = (p) => visible(html(p));

const GOOD = {
  campaign: SLUG,
  company_website: 'www.rossi-informatica.it',
  company_name: 'Rossi Informatica S.r.l.',
  specialism: O.area[1],
  specialism_other: '',
  turnover_band: O.turnover[2],
  trading_years: O.trading[2],
  employees_or_fee_earners: O.people[2],
  marketing_spend: O.spend[1],
  first_year_value: O.worth[2],
  sales_cycle: O.cycle[1],
  target_next_year: '',
  decision_maker: O.decider[0],
  capacity: O.capacity[1],
  meeting_goal: 'Una risposta chiara su se questo può funzionare per un’azienda come la nostra.',
  first_name: 'Marco',
  last_name: 'Rossi',
  job_title: 'Amministratore delegato',
  email: 'marco@rossi-informatica.it',
  mobile: '',
  lead_id: 'l_ita0001',
  page_slug: SLUG,
  utm_source: 'meta',
  utm_medium: 'paid',
  utm_campaign: 'ita-ict',
  utm_content: 'ad1',
  consent: 'accepted',
  fbp: 'fb.1.1700000000000.123456789',
  fbc: '',
};

// over.funnel changes funnel settings for one test (a pixel of its own, say); the shipped settings are the shared UK pixel.
function itRig(over = {}) {
  const r = rig(Object.assign({}, over, { env: Object.assign({ COMPANIES_HOUSE_API_KEY: undefined }, over.env || {}) }));
  const base = realCampaigns[SLUG];
  r.campaigns[SLUG] = Object.assign({}, base, { cfg: Object.assign({}, base.cfg, { live: over.live !== false, funnel: Object.assign({}, base.cfg.funnel, over.funnel || {}) }) });
  return r;
}
const go = async (over, fields, opts) => {
  const r = itRig(over);
  const res = await r.handler(post(fields, opts), { ip: '203.0.113.9' });
  return { r, res, body: res.headers.get('content-type').includes('json') ? await bodyOf(res) : await res.text() };
};

test('the Italian form is the UK form step for step: same fields, same order, same number of options', () => {
  assert.equal(core.STEPS.length, 14);
  assert.deepEqual(core.FIELDS, ukCore.FIELDS, 'the field names are the payload keys');
  assert.deepEqual(core.STEPS.map((s) => [s.id, s.kind, s.field || null, Boolean(s.optional)]), ukCore.STEPS.map((s) => [s.id, s.kind, s.field || null, Boolean(s.optional)]));
  for (const k of Object.keys(ukCore.OPTIONS)) assert.equal(O[k].length, ukCore.OPTIONS[k].length, `options.${k}: the routing reads an answer by position`);
  assert.equal(core.validate(GOOD).ok, true);
  assert.equal(core.tidy.toString(), ukCore.tidy.toString());
});

test('the bands are in euro, written "da ... a meno di", with no pound sign anywhere', () => {
  assert.deepEqual(O.turnover.slice(0, 5), ['Meno di 1 milione di €', 'Da 1 milione a meno di 2 milioni di €', 'Da 2 a meno di 5 milioni di €', 'Da 5 a meno di 10 milioni di €', '10 milioni di € o più']);
  assert.equal(O.turnover[5], 'Preferisco non dirlo');
  assert.deepEqual(O.worth.slice(0, 2), ['Meno di 10.000 €', 'Da 10.000 € a meno di 25.000 €']);
  assert.equal(JSON.stringify({ core: O, copy, legal }).includes('£'), false);
});

test('the form rejects what the UK form rejects', () => {
  const bad = (patch) => core.validate(Object.assign({}, GOOD, patch));
  assert.equal(bad({ company_website: 'non un sito' }).ok, false);
  assert.equal(bad({ turnover_band: 'Under £1m' }).ok, false, 'an English option is not an answer here');
  assert.equal(bad({ email: 'marco@' }).ok, false);
  assert.equal(bad({ meeting_goal: '' }).ok, false);
  assert.equal(bad({ mobile: '' }).ok, true, 'the mobile number is optional');
  assert.equal(bad({ specialism: 'Altro', specialism_other: 'Telecomunicazioni' }).values.specialism_other, 'Telecomunicazioni');
  assert.equal(bad({ specialism: O.area[0], specialism_other: 'ignorato' }).values.specialism_other, '', 'the free text counts only for "Altro"');
});

test('routing: the UK decision table, answer for answer, with the same reason codes', () => {
  const v = core.validate(GOOD).values;
  const un = { check: 'unchecked', reasons: [] };
  const d = (patch, ch = un) => route.decide(Object.assign({}, v, patch), ch);
  assert.deepEqual(d({}), { route: 'fit', reasons: ['turnover_2m_plus', 'trading_2y_plus', 'register_not_used'] });
  for (const t of [O.turnover[0], O.turnover[1]]) assert.deepEqual(d({ turnover_band: t }), { route: 'not_a_fit', reasons: ['turnover_below_2m'] });
  assert.deepEqual(d({ trading_years: O.trading[0] }), { route: 'not_a_fit', reasons: ['trading_under_2y'] });
  assert.deepEqual(d({ first_year_value: O.worth[0] }), { route: 'not_a_fit', reasons: ['value_under_10k'] });
  assert.deepEqual(d({ capacity: O.capacity[0] }), { route: 'not_now', reasons: ['capacity_none'] });
  assert.deepEqual(d({ turnover_band: O.turnover[5] }), { route: 'review', reasons: ['turnover_not_stated'] });
  assert.deepEqual(d({ first_year_value: O.worth[1] }), { route: 'review', reasons: ['value_10k_to_25k'] });
  assert.equal(d({ turnover_band: O.turnover[0], capacity: O.capacity[0] }).route, 'not_a_fit', 'structural beats temporary');
  assert.deepEqual(route.PAGE_FOR, ukRoute.PAGE_FOR);
  assert.deepEqual(route.ROUTES, ukRoute.ROUTES);
});

test('routing, 22 Oct 2026 rule: withheld turnover is inferred only from 50+ people AND 5,000 euro a month or more', () => {
  const v = core.validate(GOOD).values;
  const un = { check: 'unchecked', reasons: [] };
  const withheld = { turnover_band: O.turnover[5], employees_or_fee_earners: O.people[3], marketing_spend: O.spend[2] };
  const d = (patch) => route.decide(Object.assign({}, v, withheld, patch), un);
  assert.deepEqual(d({}), { route: 'fit', reasons: ['turnover_inferred', 'trading_2y_plus', 'register_not_used'] });
  assert.equal(d({ marketing_spend: O.spend[3] }).route, 'fit');
  for (const over of [{ employees_or_fee_earners: O.people[2] }, { marketing_spend: O.spend[1] }, { marketing_spend: O.spend[4] }]) {
    assert.deepEqual(d(over), { route: 'review', reasons: ['turnover_not_stated'] }, JSON.stringify(over));
  }
  assert.equal(route.turnoverInferred(Object.assign({}, v, withheld)), true);
  assert.equal(route.turnoverInferred(v), false);
});

test('payload: the Italian "Altro" and its free text arrive as one value, the UK "Other" is unchanged', () => {
  const base = { leadId: 'l_1', campaign: SLUG, route: 'fit', reasons: [], submittedAt: '2026-10-23T10:00:00Z', ch: null, tracking: {} };
  assert.equal(buildPayload(Object.assign({}, base, { values: { specialism: 'Altro', specialism_other: 'Telecomunicazioni' } })).specialism, 'Altro: Telecomunicazioni');
  assert.equal(buildPayload(Object.assign({}, base, { values: { specialism: 'Other', specialism_other: 'Telecoms' } })).specialism, 'Other: Telecoms');
  assert.equal(buildPayload(Object.assign({}, base, { values: { specialism: 'Cybersecurity' } })).specialism, 'Cybersecurity');
});

test('endpoint: a fit books, Zapier gets the Italian answers under the same keys, Meta is told once', async () => {
  const { r, res, body } = await go({}, GOOD);
  assert.equal(res.status, 200);
  assert.equal(body.route, 'fit');
  assert.equal(body.next, '/g/it-ict-growth/book/?lead_id=l_ita0001&utm_source=meta&utm_medium=paid&utm_campaign=ita-ict&utm_content=ad1');
  const z = r.of('zapier')[0].body;
  assert.equal(z.campaign, SLUG);
  assert.equal(z.route, 'fit');
  assert.equal(z.route_reason, 'turnover_2m_plus, trading_2y_plus, register_not_used');
  assert.equal(z.turnover_band, 'Da 2 a meno di 5 milioni di €');
  assert.equal(z.specialism, 'Servizi IT gestiti (MSP)');
  assert.equal(z.company_number, '', 'no register is asked in Italy');
  assert.equal(r.of('ch').length, 0, 'Companies House is never called for an Italian firm');
  assert.equal(r.of('capi').length, 1);
});

test('Meta: Italy shares the UK pixel on purpose, so the server event goes to that pixel with the shared token', async () => {
  const ukCfg = JSON.parse(readFileSync(join(ROOT, 'g', 'uk-it-growth', 'config.json'), 'utf8'));
  assert.equal(cfg.funnel.sharedPixel, true, 'chosen on purpose (3 Nov 2026), never by a copied value');
  assert.equal(cfg.funnel.pixelId, ukCfg.funnel.pixelId, 'the same pixel as the UK funnels and the rest of getelevateleads.com');
  assert.equal(cfg.funnel.capiTokenEnv, undefined, 'a shared pixel uses the shared token, not one of its own');
  let x = await go({ env: { META_CAPI_TOKEN: 'shared-token' } }, GOOD);
  assert.equal(x.r.of('capi').length, 1);
  const c = x.r.of('capi')[0];
  assert.equal(new URL(c.url).pathname, `/v21.0/${cfg.funnel.pixelId}/events`);
  assert.equal(c.body.access_token, 'shared-token');
  assert.equal(c.body.data[0].event_id, 'l_ita0001');
  assert.equal(c.body.data[0].event_name, cfg.funnel.qualifiedEvent);
  assert.equal(c.body.data[0].custom_data.campaign, SLUG, 'the campaign is how the two countries are told apart in one pixel');
  // The shared token is missing: nothing is sent, and the lead is not held up.
  x = await go({ env: { META_CAPI_TOKEN: undefined } }, GOOD);
  assert.equal(x.r.of('capi').length, 0);
  assert.deepEqual(x.r.blobs.lead('l_ita0001').capi, { state: 'skipped', reason: 'not_configured' });
  assert.equal(x.body.route, 'fit', 'the lead is not held up');
});

test('Meta: a funnel with a pixel of its own (not Italy today) uses its own token and pixel, never the shared ones', async () => {
  const own = { sharedPixel: undefined, pixelId: '2200000000000001', capiTokenEnv: 'META_CAPI_TOKEN_IT' };
  // Both tokens and a stray META_PIXEL_ID set (as on the shared Netlify site): the funnel's own token and its own pixel.
  let x = await go({ funnel: own, env: { META_CAPI_TOKEN: 'shared-token', META_CAPI_TOKEN_IT: 'own-token', META_PIXEL_ID: '999000111' } }, GOOD);
  assert.equal(x.r.of('capi').length, 1);
  const c = x.r.of('capi')[0];
  assert.equal(new URL(c.url).pathname, '/v21.0/2200000000000001/events');
  assert.equal(c.body.access_token, 'own-token');
  // Only the shared token present: nothing is sent (it would be the wrong pixel's token, and Meta would refuse it).
  x = await go({ funnel: own, env: { META_CAPI_TOKEN: 'shared-token', META_CAPI_TOKEN_IT: undefined } }, GOOD);
  assert.equal(x.r.of('capi').length, 0);
  assert.deepEqual(x.r.blobs.lead('l_ita0001').capi, { state: 'skipped', reason: 'not_configured' });
  assert.equal(x.body.route, 'fit', 'the lead is not held up');
});

test('endpoint: not a fit goes to the archive page and Meta is not told; not now and review have their own pages', async () => {
  let x = await go({}, Object.assign({}, GOOD, { turnover_band: O.turnover[0] }));
  assert.equal(x.body.route, 'not_a_fit');
  assert.match(x.body.next, /^\/g\/it-ict-growth\/not-a-fit\//);
  assert.equal(x.r.of('capi').length, 0);
  x = await go({}, Object.assign({}, GOOD, { capacity: O.capacity[0] }));
  assert.match(x.body.next, /^\/g\/it-ict-growth\/not-now\//);
  x = await go({}, Object.assign({}, GOOD, { turnover_band: O.turnover[5] }));
  assert.match(x.body.next, /^\/g\/it-ict-growth\/review\//);
});

test('endpoint: while not live, every post is refused and nothing is stored', async () => {
  const { r, res } = await go({ live: false }, GOOD);
  assert.equal(res.status, 503);
  assert.equal(r.of('zapier').length, 0);
  assert.equal(r.blobs.leads().length, 0);
  assert.equal(realCampaigns[SLUG].cfg.live, false, 'the shipped config is not live');
});

test('endpoint without JavaScript: a bad post gives the form back in Italian with the answers kept', async () => {
  const { res, body } = await go({}, Object.assign({}, GOOD, { email: 'marco@' }), { asJson: false });
  assert.equal(res.status, 422);
  assert.match(body, /Inserire un indirizzo email aziendale valido/);
  assert.match(body, /<html lang="it-IT">/);
  assert.match(body, /value="Rossi Informatica S\.r\.l\."/);
});

test('pages: all eight are built, Italian, noindex, one h1 and a main', () => {
  for (const p of PAGES) {
    assert.ok(existsSync(join(ROOT, 'public', 'g', SLUG, p)), p + ' is built');
    const h = html(p);
    assert.match(h, /<html lang="it-IT">/, p);
    assert.match(h, /<meta name="robots" content="noindex,nofollow">/, p);
    assert.equal((h.match(/<h1[\s>]/g) || []).length, 1, p + ' h1');
    assert.equal((h.match(/<main[\s>]/g) || []).length, 1, p + ' main');
  }
  assert.match(html('index.html'), /<nav class="ft-links" aria-label="Note legali">/);
  assert.match(html('index.html'), /aria-label="Altro"/);
  assert.equal(html('index.html').includes('aria-label="Other"'), false);
});

test('pages: no dash, no exclamation mark, no telephone number, no unfilled token, no pound sign', () => {
  for (const p of PAGES) {
    const t = text(p);
    assert.equal(/[—–]/.test(t), false, p + ': dash');
    assert.equal(t.includes('!'), false, p + ': exclamation mark');
    assert.equal(/tel:|\+39|\+44|\+47/.test(html(p)), false, p + ': phone number');
    assert.equal(/\{[A-Z_]{3,}\}|\{\{|undefined|\[object /.test(t), false, p + ': unfilled value');
    assert.equal(t.includes('£'), false, p + ': pound sign');
  }
});

test('pages: a commission is never printed with a rate or an amount', () => {
  for (const p of PAGES) {
    const t = text(p);
    for (const m of t.matchAll(/commission[ei]|provvigion[ei]|commission|kommisjon/gi)) {
      const around = t.slice(Math.max(0, m.index - 120), m.index + 120);
      assert.equal(/%|[£€]\s?\d|\d\s?[£€]|\bkr\s?\d|\d\s?(percent|per cent|per cento|euro)\b/i.test(around), false, `${p}: ${around}`);
    }
  }
});

test('pages: the cases are the three UK firms and the page says so, in the hero, over the cases and in the note', () => {
  const t = text('index.html');
  for (const name of ['Ignite Consulting', 'Be | Shaping the Future', 'Crux IT Consulting']) assert.ok(t.includes(name), name);
  assert.match(t, /Nel Regno Unito abbiamo già riempito/);
  assert.match(t, /Tre società britanniche/);
  assert.match(t, /Tre società di consulenza IT britanniche/);
  assert.match(t, /non sono stati ottenuti in Italia/);
  assert.equal((t.match(/\(Regno Unito\)/g) || []).length, 3, 'each case card carries its country');
  assert.ok(!/in Italia abbiamo|clienti italiani|casi italiani/i.test(t), 'no Italian result is claimed');
});

test('pages: Aurora\'s address is the only address, and it is a link; Sondre and the UK mailbox are nowhere', () => {
  for (const p of PAGES) {
    const found = new Set(html(p).match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []);
    for (const a of found) assert.equal(a, 'au@growwithelevate.eu', p);
    assert.equal(/Sondre|elevatemarketing\.no/.test(html(p)), false, p);
  }
  assert.ok(html('index.html').includes('href="mailto:au@growwithelevate.eu"'));
});

test('pages: the offer is the UK offer: commission only, the client pays the advertising, no rate, no setup fee', () => {
  const t = text('index.html');
  assert.match(t, /Si paga quando un contratto si chiude/);
  assert.match(t, /Nessun canone fisso, nessun costo di attivazione, nessuna durata minima/);
  assert.match(t, /Applichiamo una commissione sui contratti che si chiudono/);
  assert.match(t, /Non la pubblichiamo/);
  assert.match(t, /Il budget pubblicitario è separato\. Lo concordiamo con voi prima dell’avvio delle campagne e lo pagate direttamente alle piattaforme/);
  assert.match(t, /Nessun contratto chiuso, nessuna fattura/);
});

test('pages: the Sondre once-only e-mail is not used in Italy; the opt-in quote button is, and nothing else', () => {
  const nf = text('not-a-fit/index.html');
  assert.match(nf, /Sì, inviatemi un preventivo/);
  assert.ok(!/Una persona di Elevate Marketing legge/.test(nf));
  const priv = text('privacy/index.html');
  assert.ok(!/Una persona di Elevate Marketing legge|Scrivervi una sola volta con un’offerta/.test(priv));
  assert.match(priv, /Scrivervi una sola volta con un preventivo a prezzo fisso/);
});

test('privacy and terms: no UK or US-only machinery, no Companies House, no Typeform, the Garante and the Datatilsynet', () => {
  const priv = text('privacy/index.html');
  const terms = text('terms/index.html');
  for (const t of [priv, terms]) {
    assert.ok(!/Companies House|Typeform|Information Commissioner|UK to US|addendum|England and Wales/i.test(t));
    assert.ok(!/\bICO\b/.test(t), 'the UK regulator is not named (case sensitive: "tipico" is Italian)');
  }
  assert.match(priv, /Garante per la protezione dei dati personali \(garanteprivacy\.it\)/);
  assert.match(priv, /Datatilsynet \(datatilsynet\.no\)/);
  assert.match(priv, /EU-US Data Privacy Framework/);
  assert.match(priv, /articolo 6, paragrafo 1, lettera f, GDPR/);
  assert.match(priv, /au@growwithelevate\.eu/);
  assert.match(terms, /Bergen tingrett/);
  assert.equal(cfg.legal.registerCheck, false);
  assert.equal(cfg.legal.registerSupported, false);
});

test('the funnel has a cookie bar in Italian with Accetta and Rifiuta, and the Meta pixel only through the consent script', () => {
  const h = html('index.html');
  assert.match(h, /data-c="yes">Accetta<\/button><button class="cb-btn" type="button" data-c="no">Rifiuta<\/button>/);
  for (const bad of ['connect.facebook.net', 'fbevents.js', "fbq('init'", 'googletagmanager', 'fonts.googleapis']) assert.equal(h.includes(bad), false, bad);
});

test('settings: not live, the pixel is the shared UK one on purpose, the Italy event is wired, review blocks are empty', () => {
  assert.equal(cfg.live, false);
  assert.equal(cfg.funnel.pixelId, '1466790598245604');
  assert.equal(cfg.funnel.sharedPixel, true);
  assert.equal(cfg.funnel.calendlyUrl, 'https://calendly.com/au-growwithelevate/elevate-marketing-commission-it-italia');
  assert.equal(cfg.contact.email, 'au@growwithelevate.eu');
  assert.equal(cfg.origin, 'https://getelevateleads.com');
  assert.equal(cfg.reviewer.name, 'Aurora');
  assert.deepEqual([legal.review.by, legal.review.on, copy.review.by, copy.review.on], ['', '', '', '']);
});

/* The build's refusals about the pixel (scripts/build-g-growth.mjs). The generator and the sources are copied to a scratch
   folder, the Italian settings are changed there, and the generator is run into that folder: the committed files are never
   touched. A refusal is exit code 1 and a reason on stderr. "reviewed" fills the two review blocks that a funnel in another
   language needs before it may go live, so that the pixel is the only thing under test. */
let scratch = null;
after(() => { if (scratch) rmSync(scratch, { recursive: true, force: true }); });
function buildItalyWith({ live = false, reviewed = false, funnel = {} } = {}) {
  if (!scratch) {
    scratch = mkdtempSync(join(tmpdir(), 'it-pixel-'));
    cpSync(join(ROOT, 'g'), join(scratch, 'g'), { recursive: true, filter: (s) => !s.includes('node_modules') });
    mkdirSync(join(scratch, 'scripts'));
    cpSync(join(ROOT, 'scripts', 'build-g-growth.mjs'), join(scratch, 'scripts', 'build-g-growth.mjs'));
  }
  const put = (file, change) => {
    const o = JSON.parse(readFileSync(join(ROOT, 'g', SLUG, file), 'utf8'));
    change(o);
    writeFileSync(join(scratch, 'g', SLUG, file), JSON.stringify(o, null, 2));
  };
  put('config.json', (o) => { o.live = live; Object.assign(o.funnel, funnel); });
  const review = (o) => { if (reviewed) Object.assign(o.review, { by: 'Revisore di prova', on: '2026-11-03' }); };
  put('legal.json', review);
  put('copy.json', review);
  const res = spawnSync(process.execPath, [join(scratch, 'scripts', 'build-g-growth.mjs')], {
    cwd: scratch, encoding: 'utf8',
    env: Object.assign({}, process.env, { G_GROWTH_OUT: join(scratch, 'out'), G_GROWTH_FUNCTION_DATA: join(scratch, 'data.generated.mjs') }),
  });
  return { status: res.status, said: String(res.stderr || '') + String(res.stdout || '') };
}

test('build: Italy may go live on the shared UK pixel only because its config says so on purpose', () => {
  const as = buildItalyWith();
  assert.equal(as.status, 0, 'control: the shipped settings build: ' + as.said);
  const live = buildItalyWith({ live: true, reviewed: true });
  assert.equal(live.status, 0, 'shared pixel, shared token, reviewed: nothing else stands in the way: ' + live.said);
  const copied = buildItalyWith({ live: true, reviewed: true, funnel: { sharedPixel: undefined } });
  assert.equal(copied.status, 1, 'the UK pixel without the explicit choice is refused');
  assert.match(copied.said, /is the UK pixel while "live" is true for a non-UK funnel/);
});

test('build: sharedPixel must be a boolean, must name the shared pixel, and must not come with a token variable of its own', () => {
  const notBool = buildItalyWith({ funnel: { sharedPixel: 'yes' } });
  assert.equal(notBool.status, 1);
  assert.match(notBool.said, /funnel\.sharedPixel must be true or false/);
  const wrongPixel = buildItalyWith({ funnel: { pixelId: '2200000000000001' } });
  assert.equal(wrongPixel.status, 1, 'sharedPixel is true but the pixel is another one');
  assert.match(wrongPixel.said, /sharedPixel is true but funnel\.pixelId is not the shared \(UK\) pixel/);
  const both = buildItalyWith({ funnel: { capiTokenEnv: 'META_CAPI_TOKEN_IT' } });
  assert.equal(both.status, 1, 'a shared pixel is sent with the shared token');
  assert.match(both.said, /sharedPixel and funnel\.capiTokenEnv are both set/);
});

test('build: a pixel of its own goes live only with a token variable of its own', () => {
  const own = { sharedPixel: undefined, pixelId: '2200000000000001' };
  const noToken = buildItalyWith({ live: true, reviewed: true, funnel: own });
  assert.equal(noToken.status, 1);
  assert.match(noToken.said, /capiTokenEnv is empty while "live" is true/);
  const withToken = buildItalyWith({ live: true, reviewed: true, funnel: Object.assign({}, own, { capiTokenEnv: 'META_CAPI_TOKEN_IT' }) });
  assert.equal(withToken.status, 0, withToken.said);
  const notAName = buildItalyWith({ funnel: Object.assign({}, own, { capiTokenEnv: 'EAAB-the-token-itself' }) });
  assert.equal(notAName.status, 1, 'the config names the variable, it never holds the token');
  assert.match(notAName.said, /must be the name of a Netlify variable/);
});

test('every page of the funnel has its header and redirect rule in netlify.toml', () => {
  const toml = readFileSync(join(ROOT, 'netlify.toml'), 'utf8');
  assert.ok(toml.includes('for = "/g/it-ict-growth"') && toml.includes('for = "/g/it-ict-growth/*"'));
  for (const sub of ['', '/book', '/takk', '/review', '/not-now', '/not-a-fit', '/privacy', '/terms']) {
    assert.ok(toml.includes(`from = "/g/it-ict-growth${sub}"\n  to = "/g/it-ict-growth${sub || ''}${sub ? '/index.html' : '/index.html'}"`), sub || 'landing');
  }
});
