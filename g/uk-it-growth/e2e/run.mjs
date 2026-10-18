// Browser tests for /g/uk-it-growth: the real pages in Chromium, talking to the real lead function
// (fakes only for Zapier, Companies House, Meta and e-mail). Not part of "npm test": it needs a browser.
//
//   npm install --no-save playwright-core axe-core
//   npx playwright-core install chromium
//   node g/uk-it-growth/e2e/run.mjs [group ...]
//
// Groups: landing form routes consent book nojs failures motion desktop committed kbd a11y text
// Settings (all optional): E2E_SHOTS=<dir> writes screenshots; E2E_CHROMIUM=<path> uses that browser;
// E2E_BOARD_TEXT=<textdump.json> compares the page text with the design board's text dump.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  startServer, launch, reporter, watch, bucket, stubPixel, fbqCalls, fillFrom, fillForm, fillAll, answerStep,
  pageText, ANSWERS, SHOTS, GOOD, OPTIONS, core, cfg, copy, buildLiveCopy, CALENDLY,
} from './lib.mjs';

const BUILT = buildLiveCopy();
const LIVE_PUBLIC = BUILT.publicDir;
const M = { width: 390, height: 844 };
const D = { width: 1280, height: 900 };
const TAB = { width: 820, height: 1180 };
const PATH = '/g/uk-it-growth/';
const QS = '?utm_source=meta&utm_medium=paid&utm_campaign=itq4&utm_content=ad7&utm_term=managed&fbclid=FB1';
const KEY = 'elevate-cookie-consent';
const CAL = CALENDLY;
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const R = reporter();
const want = process.argv.slice(2);
const run = (g) => !want.length || want.includes(g);

const srv = await startServer({ publicDir: LIVE_PUBLIC, live: true });
const browser = await launch();
const LANDING = srv.base + PATH;
const rigNow = () => srv.state.rig;

/** A fresh browser profile with the outside world stubbed: Meta's script and Calendly's widget are recorded, any other host is refused and listed. */
async function open(o = {}, url = LANDING + QS) {
  const vp = o.vp || M;
  const ctx = await browser.newContext({
    viewport: vp, deviceScaleFactor: 2, isMobile: vp.width < 600, hasTouch: vp.width < 600,
    locale: 'en-GB', timezoneId: 'Europe/London', javaScriptEnabled: o.js !== false,
    // No script means a 14,000 px page. Smooth scrolling (CSS, motion allowed) keeps Playwright from ever finding it still, so those runs ask for reduced motion. A test aid only; the motion group tests both.
    reducedMotion: (o.reduced || o.js === false) ? 'reduce' : 'no-preference',
  });
  const ext = []; const pixel = []; const cal = [];
  await ctx.route('**/*', (r) => {
    const u = new URL(r.request().url());
    if (u.hostname === '127.0.0.1') return r.fallback();
    ext.push(r.request().url());
    return r.abort();
  });
  await stubPixel(ctx, pixel);
  await ctx.route('https://assets.calendly.com/**', (r) => { cal.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'application/javascript', body: '/* stub */' }); });
  if (o.consent) await ctx.addInitScript(([k, v]) => { try { if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch (e) { /* none */ } }, [KEY, o.consent]);
  const page = await ctx.newPage();
  const b = bucket();
  watch(page, b);
  srv.newRig();
  if (url) await page.goto(url, { waitUntil: 'load' });
  return { ctx, page, b, ext, pixel, cal };
}
const txt = async (loc) => norm(await loc.first().textContent());
const shot = (page, name, o = {}) => (SHOTS ? page.screenshot({ path: path.join(SHOTS, name + '.png'), ...o }) : Promise.resolve());
const cleanErrors = (b) => b.errors.concat(b.console.filter((c) => !/net::ERR_FAILED|Failed to load resource/.test(c)));
const lastLead = () => rigNow().blobs.leads()[0] || null;
const hidden = (page, name) => page.inputValue(`#lf-form input[name="${name}"]`);
const q = (u) => Object.fromEntries(new URL(u).searchParams);
const waitBy = (page, re) => page.waitForURL(re, { timeout: 8000 });
const noPixelYet = (r, label) => {
  R.check(r.pixel.length === 0, `${label}: no request to connect.facebook.net`, r.pixel.join(','));
  R.check(r.ext.length === 0, `${label}: no request to any other outside host`, r.ext.join(','));
};
const scrollY = (page, y) => page.evaluate((v) => window.scrollTo(0, v), y);
const settle = (page, ms = 350) => page.waitForTimeout(ms);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

/* ============================================================================ 1. landing */
async function landing() {
  R.section('1. Landing page, 390 x 844, JavaScript on, no cookie choice made');
  const r = await open();
  const { page, b } = r;
  R.eq(await page.title(), copy.meta.title, 'title is the board title');
  R.eq(await page.locator('h1').count(), 1, 'one h1');
  R.check(await page.evaluate(() => document.documentElement.classList.contains('js') && document.documentElement.classList.contains('anim')), 'html has js and anim classes');
  R.check((await overflow(page)) <= 0, 'no horizontal scroll at 390 px', String(await overflow(page)));
  R.check(await page.locator('meta[name=robots][content="noindex,nofollow"]').count() === 1, 'noindex meta present');
  R.check(await page.evaluate(() => document.getElementById('g-consent').hidden), 'banner hidden on arrival (nothing scrolled yet)');
  R.check(!(await page.evaluate(() => document.documentElement.classList.contains('has-cb'))), 'html.has-cb not set on arrival');

  // counters: armed, then final
  const counters = await page.evaluate(() => [].map.call(document.querySelectorAll('.cn[data-to]'), (el) => ({
    on: el.classList.contains('cn-on'), play: el.getAttribute('data-play'),
    sr: el.querySelector('.cn-sr').textContent.trim(), vis: el.querySelector('[aria-hidden]').textContent.trim(),
  })));
  R.eq(counters.length, 10, 'ten counters on the page');
  R.check(counters.every((c) => c.on), 'all counters armed (count up from zero)');
  await page.waitForFunction(() => document.querySelector('.cn[data-play=load] [aria-hidden]').textContent.trim() === '424', null, { timeout: 5000 })
    .then(() => R.ok('hero counter reaches 424'), () => R.fail('hero counter reaches 424'));
  const before = await page.evaluate(() => [].map.call(document.querySelectorAll('.cn[data-play=cases] [aria-hidden]'), (e) => e.textContent.trim()));
  R.check(before.every((t) => /^0%?$/.test(t)), 'case figures wait at zero until the cases are on screen', before.join(' '));
  await page.locator('#cases').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [].every.call(document.querySelectorAll('.cn[data-play=cases]'), (el) => el.querySelector('[aria-hidden]').textContent.trim() === el.querySelector('.cn-sr').textContent.trim()), null, { timeout: 6000 })
    .then(() => R.ok('case figures count up to the same text a screen reader gets'), () => R.fail('case figures reach their final text'));
  const finals = await page.evaluate(() => [].map.call(document.querySelectorAll('.cn[data-play=cases] .cn-sr'), (e) => e.textContent.trim()));
  R.eq(finals, ['97', '40%', '4', '210', '37%', '10', '117', '65%', '6'], 'case figures are the board figures');

  // the banner (the visit to #cases has already scrolled past 200 px)
  await scrollY(page, 0); await settle(page);
  R.check(await page.locator('#g-consent').isVisible(), 'once shown the banner stays, also back at the top (it waits for a choice)');
  await scrollY(page, 420); await settle(page, 500);
  R.check(await page.locator('#g-consent').isVisible(), 'banner shown after scrolling 200 px');
  R.check(await page.evaluate(() => document.documentElement.classList.contains('has-cb')), 'html.has-cb set');
  const bb = await page.locator('#g-consent').boundingBox();
  R.check(bb && Math.abs(bb.y + bb.height - M.height) <= 1, 'banner sits on the bottom edge', JSON.stringify(bb));
  R.check(bb && bb.width <= M.width && bb.x >= 0, 'banner fits the width');
  await shot(page, 'landing-390-banner');
  noPixelYet(r, 'before any choice');
  R.check(await page.evaluate(() => window.fbq === undefined), 'window.fbq does not exist before Accept');
  R.check(await page.evaluate(() => localStorage.getItem('elevate-cookie-consent')) === null, 'no consent value stored before a choice');
  await scrollY(page, 0); await settle(page, 200);
  await shot(page, 'landing-390-top');
  R.eq(cleanErrors(b), [], 'no console errors or page errors', JSON.stringify(cleanErrors(b)));
  R.eq(b.bad, [], 'no 4xx or 5xx responses for page assets', JSON.stringify(b.bad));
  await r.ctx.close();
}

/* ============================================================================ 2. form */
async function form() {
  R.section('2. The thirteen questions, one at a time, with the board messages');
  const r = await open();
  const { page, b } = r;
  const f = page.locator('#lf-form');
  const btn = f.locator('.lf-actions .btn');
  const count = f.locator('#lf-count');
  const open1 = () => f.locator('.lf-block:not([hidden])');
  await page.locator('#form').scrollIntoViewIfNeeded();
  R.check(await f.evaluate((el) => el.classList.contains('is-steps')), 'form is in step mode');
  R.eq(await open1().count(), 1, 'one question on screen');
  R.eq(await txt(count), '1 / 13', 'counter starts at 1 / 13');
  R.check(await f.locator('.lf-back').isHidden(), 'no Back button on the first question');
  R.eq(await txt(btn), copy.form.next, 'button says Next');
  R.eq(await f.locator('[role=progressbar]').getAttribute('aria-valuenow'), '1', 'progress bar: 1');
  R.check(await f.locator('.lf-consent').isHidden(), 'consent sentence is hidden until the last question');

  // 1 website
  await btn.click();
  R.eq(await txt(open1().locator('.lf-err')), core.MSG.url, 'empty website: board message');
  R.eq(await open1().locator('#f-company_website').getAttribute('aria-invalid'), 'true', 'input marked invalid');
  R.eq(await page.evaluate(() => document.activeElement.id), 'f-company_website', 'focus goes to the input');
  R.eq(await txt(count), '1 / 13', 'still on question 1');
  await open1().locator('#f-company_website').fill('not a website');
  R.eq(await open1().locator('.lf-err').count(), 1, 'a wrong address keeps the message');
  await open1().locator('#f-company_website').fill('northbridge-it.co.uk');
  R.eq(await open1().locator('.lf-err').count(), 0, 'the message goes as soon as the answer is right');
  await page.keyboard.press('Enter');
  R.eq(await txt(count), '2 / 13', 'Enter moves on');
  R.eq(await page.evaluate(() => document.activeElement.id), 'f-company_name', 'focus follows to the next input');
  R.check(await f.locator('.lf-back').isVisible(), 'Back appears on question 2');

  // 2 company
  await btn.click();
  R.eq(await txt(open1().locator('.lf-err')), core.MSG.required, 'empty company name: board message');
  await open1().locator('#f-company_name').fill('Northbridge IT Limited');
  await btn.click();
  R.eq(await txt(count), '3 / 13', 'on to question 3');

  // 3 area, with "Other"
  R.eq(await txt(open1().locator('legend')), core.STEPS[2].q, 'question 3 is the board question');
  R.eq(await open1().locator('.lf-card').count(), 6, 'six options');
  R.check(await open1().locator('[data-other-for]').isHidden(), 'the Other box is hidden');
  await btn.click();
  R.eq(await txt(open1().locator('.lf-err')), core.MSG.choice, 'nothing chosen: board message');
  R.check((await open1().locator('fieldset').getAttribute('aria-describedby') || '').includes('e-specialism'), 'the error is tied to the group');
  await open1().locator('label.lf-card', { hasText: 'Other' }).click();
  R.check(await open1().locator('[data-other-for]').isVisible(), 'Other opens a text box');
  R.eq(await open1().locator('.lf-err').count(), 0, 'choosing clears the message');
  await open1().locator('label.lf-card', { hasText: 'Managed IT services' }).click();
  R.check(await open1().locator('[data-other-for]').isHidden(), 'the box closes again');
  R.check(await open1().locator('label.lf-card.is-checked').count() === 1, 'one card is marked chosen');

  // back keeps answers
  await f.locator('.lf-back').click();
  R.eq(await txt(count), '2 / 13', 'Back goes to question 2');
  R.eq(await open1().locator('#f-company_name').inputValue(), 'Northbridge IT Limited', 'the answer is still there');
  await btn.click();
  R.check(await open1().locator('label.lf-card.is-checked').count() === 1, 'and the choice on question 3 is kept');

  // through to the last
  await btn.click();
  await fillFrom(page, 3, {}, { submit: false });
  R.eq(await txt(count), '13 / 13', 'thirteen questions');
  R.eq(await f.locator('[role=progressbar]').getAttribute('aria-valuenow'), '13', 'progress bar: 13');
  R.eq(await txt(btn), copy.form.cta, 'last button says what the board says');
  R.check(await f.locator('.lf-consent').isVisible(), 'consent sentence shows on the last question');
  R.check(await f.locator('.lf-consent a[href="/lp/privacy/"]').count() === 1, 'and links to the privacy page');
  R.check(await f.locator('#f-mobile').isVisible() && (await f.locator('label[for=f-mobile]').textContent()).includes('optional'), 'mobile is marked optional');

  // the details step
  for (const id of ['first_name', 'last_name', 'job_title', 'email', 'mobile']) await f.locator('#f-' + id).fill('');
  await btn.click();
  const errs = await f.locator('.lf-block:not([hidden]) .lf-err span').allTextContents();
  R.eq(errs.map(norm), [core.MSG.required, core.MSG.required, core.MSG.required, core.MSG.email], 'details: four board messages, mobile is not one of them');
  R.eq(await page.evaluate(() => document.activeElement.id), 'f-first_name', 'focus goes to the first wrong field');
  await f.locator('#f-first_name').fill('Alex'); await f.locator('#f-last_name').fill('Morgan'); await f.locator('#f-job_title').fill('Managing Director');
  await f.locator('#f-email').fill('alex@northbridge');
  R.eq(await txt(f.locator('.lf-block:not([hidden]) .lf-err')), core.MSG.email, 'a half address keeps the e-mail message');
  await shot(page, 'form-390-last-step-errors');
  R.check(!rigNow().calls.length, 'nothing has been sent to any service so far', JSON.stringify(rigNow().calls.map((c) => c.kind)));
  R.eq(cleanErrors(b), [], 'no console errors', JSON.stringify(cleanErrors(b)));
  await r.ctx.close();
}

/* ============================================================================ 3. routes */
const OUTCOME = {
  fit: { page: 'book', key: 'book' },
  review: { page: 'review', key: 'review' },
  not_now: { page: 'not-now', key: 'not-now' },
  not_a_fit: { page: 'not-a-fit', key: 'not-a-fit' },
};
async function routes() {
  R.section('3. Four answers, four pages (390 x 844, no cookie choice)');
  for (const [route, o] of Object.entries(OUTCOME)) {
    const r = await open();
    const { page, b } = r;
    await page.locator('#form').scrollIntoViewIfNeeded();
    await fillForm(page, ANSWERS[route], { submit: false });
    const leadId = await hidden(page, 'lead_id');
    R.check(/^l_[0-9a-f]{20}$/.test(leadId), `${route}: the page minted a lead id`, leadId);
    await page.locator('#lf-form .lf-actions .btn').click();
    await waitBy(page, new RegExp(`${PATH}${o.page}/`));
    const u = new URL(page.url());
    R.eq(u.pathname, `${PATH}${o.page}/`, `${route}: lands on /${o.page}/`);
    const qq = q(page.url());
    R.eq(qq.lead_id, leadId, `${route}: the same lead id is in the address`);
    R.eq([qq.utm_source, qq.utm_medium, qq.utm_campaign, qq.utm_content, qq.utm_term], ['meta', 'paid', 'itq4', 'ad7', 'managed'], `${route}: tracking carried to the answer page`);
    R.check(!('fbclid' in qq), `${route}: no ad-click id carried without Accept`);
    R.eq(await txt(page.locator('h1')), copy.outcomes[o.key].h, `${route}: heading is the board heading`);
    R.check((await txt(page.locator('main'))).includes(norm(copy.outcomes[o.key].p)), `${route}: board paragraph is on the page`);
    if (copy.outcomes[o.key].note) R.check((await txt(page.locator('main'))).includes(norm(copy.outcomes[o.key].note)), `${route}: board note is on the page`);
    R.check(await page.locator('meta[name=robots][content="noindex,nofollow"]').count() === 1, `${route}: answer page is noindex`);
    // what the back end did
    const lead = rigNow().blobs.lead(leadId);
    R.check(lead && lead.route === route, `${route}: stored with route ${route}`, JSON.stringify(lead && lead.route));
    const zap = rigNow().of('zapier');
    if (route === 'fit' || route === 'review' || route === 'not_now' || route === 'not_a_fit') {
      R.eq(zap.length, 1, `${route}: one delivery to Zapier`);
      R.eq(zap[0].body.route, route, `${route}: Zapier is told the route`);
      R.eq(zap[0].body.lead_id, leadId, `${route}: Zapier gets the same lead id`);
      R.eq([zap[0].body.utm_source, zap[0].body.utm_content, zap[0].body.page_slug], ['meta', 'ad7', 'uk-it-growth'], `${route}: Zapier gets tracking and page`);
      R.eq(zap[0].body.fbclid, '', `${route}: no ad-click id to Zapier without Accept`);
    }
    R.eq(rigNow().of('capi').length, 0, `${route}: nothing to Meta without Accept`);
    R.eq(cleanErrors(b), [], `${route}: no console errors`, JSON.stringify(cleanErrors(b)));
    noPixelYet(r, `${route} answer page`);
    {
      const short = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight < 200);
      if (short) {
        R.check(await page.locator('#g-consent').isVisible(), `${route}: page too short to scroll 200 px, so the banner shows at once`);
      } else {
        R.check(await page.locator('#g-consent').isHidden(), `${route}: banner waits for a 200 px scroll`);
        await scrollY(page, 300); await settle(page, 500);
        R.check(await page.locator('#g-consent').isVisible(), `${route}: and shows after it`);
        await scrollY(page, 0); await settle(page, 200);
      }
    }
    if (route === 'fit') await shot(page, 'book-390');
    if (route === 'review') await shot(page, 'review-390');
    if (route === 'not_now') await shot(page, 'not-now-390');
    if (route === 'not_a_fit') await shot(page, 'not-a-fit-390');
    await r.ctx.close();
  }
}

/* ============================================================================ 4. consent */
async function consent() {
  R.section('4. Cookie choice and the Meta pixel');
  const PID = cfg.funnel.pixelId;
  const names = (c) => (c || []).map((a) => a.slice(0, 2).join(':'));

  // 4a accept on the landing page
  {
    const r = await open();
    const { page } = r;
    await scrollY(page, 420); await settle(page, 500);
    await page.locator('#g-consent button[data-c=yes]').click();
    await settle(page);
    R.eq(await page.locator('#g-consent').count(), 0, 'Accept: the banner is gone');
    R.check(!(await page.evaluate(() => document.documentElement.classList.contains('has-cb'))), 'Accept: has-cb removed');
    R.eq(await page.evaluate((k) => localStorage.getItem(k), KEY), 'accepted', 'Accept: choice stored');
    R.eq(r.pixel.length, 1, 'Accept: Meta script requested once', r.pixel.join(','));
    R.eq(r.pixel[0], 'https://connect.facebook.net/en_US/fbevents.js', 'Accept: from the official address');
    R.eq(names(await fbqCalls(page)), ['init:' + PID, 'track:PageView', 'track:ViewContent'], 'Accept: init, PageView, ViewContent in that order');
    R.check(!names(await fbqCalls(page)).some((n) => /Lead$/.test(n)), 'never the standard Lead event');
    await scrollY(page, 0);
    await page.locator('#form').scrollIntoViewIfNeeded();
    await fillForm(page, {}, { submit: false });
    const leadId = await hidden(page, 'lead_id');
    R.eq(await hidden(page, 'consent'), '', 'consent field is filled in at send time, not before');
    await page.locator('#lf-form .lf-actions .btn').click();
    await waitBy(page, /\/book\//);
    const qq = q(page.url());
    R.eq(qq.fbclid, 'FB1', 'accepted: the ad-click id follows to the answer page');
    const calls = await fbqCalls(page);
    const qf = (calls || []).filter((c) => c[1] === 'QualifiedForm');
    R.eq(qf.length, 1, 'book page: QualifiedForm queued once');
    R.eq(qf[0] && qf[0][0], 'trackCustom', 'book page: a custom event');
    R.eq(qf[0] && qf[0][2], { route: 'fit', campaign: 'uk-it-growth' }, 'book page: only route and campaign as parameters');
    R.eq(qf[0] && qf[0][3], { eventID: leadId }, 'book page: event id is the lead id');
    R.eq(names(calls).slice(0, 2), ['init:' + PID, 'track:PageView'], 'book page: pixel started');
    R.check(!names(calls).includes('track:ViewContent'), 'book page: no landing event here');
    const capi = rigNow().of('capi');
    R.eq(capi.length, 1, 'server: one Conversions API call');
    const ev = capi[0] && capi[0].body && capi[0].body.data && capi[0].body.data[0];
    R.eq(ev && ev.event_name, 'QualifiedForm', 'server: same event name');
    R.eq(ev && ev.event_id, leadId, 'server: same event id, so Meta counts it once');
    R.check(ev && ev.user_data && Array.isArray(ev.user_data.em) && /^[0-9a-f]{64}$/.test(ev.user_data.em[0]), 'server: e-mail is hashed');
    R.check(!JSON.stringify(capi[0].body).includes('alex@northbridge-it.co.uk'), 'server: no plain e-mail to Meta');
    // reload: once per lead
    await page.reload({ waitUntil: 'load' });
    const again = (await fbqCalls(page) || []).filter((c) => c[1] === 'QualifiedForm');
    R.eq(again.length, 0, 'reloading the book page does not fire the event again');
    await r.ctx.close();
  }
  // 4b decline
  {
    const r = await open();
    const { page } = r;
    await scrollY(page, 420); await settle(page, 500);
    await page.locator('#g-consent button[data-c=no]').click();
    await settle(page);
    R.eq(await page.locator('#g-consent').count(), 0, 'Decline: the banner is gone');
    R.eq(await page.evaluate((k) => localStorage.getItem(k), KEY), 'declined', 'Decline: choice stored');
    await page.locator('#form').scrollIntoViewIfNeeded();
    await fillForm(page, {}, { submit: false });
    await page.locator('#lf-form .lf-actions .btn').click();
    await waitBy(page, /\/book\//);
    noPixelYet(r, 'Decline');
    R.check(await page.evaluate(() => window.fbq === undefined), 'Decline: no pixel object on the answer page');
    R.check(!('fbclid' in q(page.url())), 'Decline: no ad-click id on the answer page');
    R.eq(rigNow().of('capi').length, 0, 'Decline: nothing to Meta from the server');
    R.eq(rigNow().of('zapier')[0].body.fbclid, '', 'Decline: no ad-click id to Zapier');
    R.eq(await page.locator('#g-consent').count(), 0, 'Decline: not asked again on the next page');
    await r.ctx.close();
  }
  // 4c ignore the banner, choose on the book page
  {
    const r = await open();
    const { page } = r;
    await page.locator('#form').scrollIntoViewIfNeeded();
    await fillForm(page, {}, { submit: false });
    const leadId = await hidden(page, 'lead_id');
    await page.locator('#lf-form .lf-actions .btn').click();
    await waitBy(page, /\/book\//);
    await scrollY(page, 300); await settle(page, 500);
    R.check(await page.locator('#g-consent').isVisible(), 'no choice yet: asked on the book page once it is scrolled');
    noPixelYet(r, 'no choice');
    R.eq(rigNow().of('capi').length, 0, 'no choice: nothing to Meta from the server');
    await page.locator('#g-consent button[data-c=yes]').click();
    await settle(page);
    const qf = (await fbqCalls(page) || []).filter((c) => c[1] === 'QualifiedForm');
    R.eq(qf.length, 1, 'accepting on the book page fires QualifiedForm once');
    R.eq(qf[0] && qf[0][3], { eventID: leadId }, 'with the lead id as event id');
    await r.ctx.close();
  }
  // 4d a visitor who accepted earlier
  {
    const r = await open({ consent: 'accepted' });
    const { page } = r;
    await settle(page);
    R.eq(r.pixel.length, 1, 'accepted earlier: the pixel loads on arrival');
    R.eq(await page.locator('#g-consent').count(), 0, 'accepted earlier: no banner');
    R.eq(names(await fbqCalls(page)), ['init:' + PID, 'track:PageView', 'track:ViewContent'], 'accepted earlier: init, PageView, ViewContent');
    await r.ctx.close();
  }
  // 4e a visitor who declined earlier
  {
    const r = await open({ consent: 'declined' });
    const { page } = r;
    await settle(page);
    noPixelYet(r, 'declined earlier');
    R.eq(await page.locator('#g-consent').count(), 0, 'declined earlier: no banner');
    await r.ctx.close();
  }
  // 4f the review page also reports
  {
    const r = await open({ consent: 'accepted' });
    const { page } = r;
    await page.locator('#form').scrollIntoViewIfNeeded();
    await fillForm(page, ANSWERS.review, { submit: false });
    const leadId = await hidden(page, 'lead_id');
    await page.locator('#lf-form .lf-actions .btn').click();
    await waitBy(page, /\/review\//);
    const qf = (await fbqCalls(page) || []).filter((c) => c[1] === 'QualifiedForm');
    R.eq(qf.length, 1, 'review page: QualifiedForm once');
    R.eq(qf[0] && qf[0][2], { route: 'review', campaign: 'uk-it-growth' }, 'review page: route review');
    R.eq(qf[0] && qf[0][3], { eventID: leadId }, 'review page: lead id as event id');
    R.eq(rigNow().of('capi').length, 1, 'review: the server sends it too');
    await r.ctx.close();
  }
  // 4g not_now and not_a_fit do not report
  for (const route of ['not_now', 'not_a_fit']) {
    const r = await open({ consent: 'accepted' });
    const { page } = r;
    await page.locator('#form').scrollIntoViewIfNeeded();
    await fillForm(page, ANSWERS[route]);
    await waitBy(page, new RegExp(`/${OUTCOME[route].page}/`));
    const qf = (await fbqCalls(page) || []).filter((c) => c[1] === 'QualifiedForm');
    R.eq(qf.length, 0, `${route}: no QualifiedForm in the browser`);
    R.eq(rigNow().of('capi').length, 0, `${route}: none from the server`);
    await r.ctx.close();
  }
}

/* ============================================================================ 5. book */
async function book() {
  R.section('5. Booking page and the calendar');
  const widgetUrl = (page) => page.locator('.calendly-inline-widget').getAttribute('data-url');
  // 5a after a fit
  {
    const r = await open();
    const { page } = r;
    await page.locator('#form').scrollIntoViewIfNeeded();
    await fillForm(page, {}, { submit: false });
    const leadId = await hidden(page, 'lead_id');
    await page.locator('#lf-form .lf-actions .btn').click();
    await waitBy(page, /\/book\//);
    await page.waitForSelector('.calendly-inline-widget', { state: 'attached' });
    const du = await widgetUrl(page);
    const u = new URL(du);
    R.eq(u.origin + u.pathname, CAL, 'widget points at the configured event');
    const p = Object.fromEntries(u.searchParams);
    R.eq(p.name, 'Alex Morgan', 'name is prefilled');
    R.eq(p.email, 'alex@northbridge-it.co.uk', 'e-mail is prefilled');
    R.eq(p.utm_content, leadId, 'utm_content carries the lead id (not the ad value)');
    R.eq([p.utm_source, p.utm_medium, p.utm_campaign, p.utm_term], ['meta', 'paid', 'itq4', 'managed'], 'the other tracking values are kept');
    R.eq([p.hide_gdpr_banner, p.background_color, p.text_color, p.primary_color], ['1', 'FFFFFF', '10141C', '0073BD'], 'the look is the page\'s own');
    R.check(!('fbclid' in p) && !('mobile' in p) && !('a1' in p), 'nothing else is passed on (no ad-click id, no phone)');
    R.eq(r.cal, ['https://assets.calendly.com/assets/external/widget.js'], 'Calendly widget script requested once, from Calendly');
    R.check(await page.locator('.o-note').count() === 0 || !(await txt(page.locator('#cal'))).includes('not connected'), 'no "not connected" note');
    // single use
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('.calendly-inline-widget', { state: 'attached' });
    const again = Object.fromEntries(new URL(await widgetUrl(page)).searchParams);
    R.check(!('name' in again) && !('email' in again), 'after a reload the prefill is gone (single use)');
    R.eq(again.utm_content, leadId, 'but the lead id is still passed');
    // heights per width
    for (const [vp, h] of [[M, 1150], [{ width: 600, height: 900 }, 1000], [TAB, 700], [D, 700]]) {
      await page.setViewportSize(vp); await settle(page, 200);
      const got = await page.locator('#cal').evaluate((el) => Math.round(el.getBoundingClientRect().height));
      R.eq(got, h, `calendar box is ${h} px high at ${vp.width} px wide`);
    }
    await page.setViewportSize(M);
    R.check((await overflow(page)) <= 0, 'no horizontal scroll on the book page at 390 px');
    // messages from Calendly
    const send = (origin, data) => page.evaluate(([o, d]) => window.dispatchEvent(new MessageEvent('message', { origin: o, data: d })), [origin, data]);
    for (const bad of ['https://calendly.com.evil.example', 'https://evilcalendly.com', 'http://calendly.com', 'https://notcalendly.com', page.url().split('/g/')[0]]) {
      await send(bad, { event: 'calendly.event_scheduled' });
    }
    await settle(page, 400);
    R.eq(new URL(page.url()).pathname, `${PATH}book/`, 'messages from other origins are ignored');
    await send('https://calendly.com', { event: 'calendly.date_and_time_selected' });
    await settle(page, 300);
    R.eq(new URL(page.url()).pathname, `${PATH}book/`, 'other Calendly events do not forward');
    await Promise.all([
      page.waitForURL(/\/takk\//, { timeout: 5000 }),
      send('https://calendly.com', { event: 'calendly.event_scheduled' }),
    ]);
    const t = q(page.url());
    R.eq(t.lead_id, leadId, 'a booking forwards to /takk with the lead id');
    R.eq([t.utm_source, t.utm_content], ['meta', 'ad7'], 'and the tracking from the address');
    R.eq(await txt(page.locator('h1')), copy.outcomes.takk.h, '/takk shows the board heading');
    R.check((await txt(page.locator('main'))).includes(norm(copy.outcomes.takk.p)), '/takk shows the board paragraph');
    await shot(page, 'takk-390');
    await r.ctx.close();
  }
  // 5b the prefill belongs to one lead, and expires
  {
    const r = await open({}, null);
    const { page } = r;
    const PK = 'elevate:g:uk-it-growth:prefill';
    await page.goto(LANDING + 'book/?lead_id=l_mine&utm_source=meta');
    await page.evaluate(([k]) => sessionStorage.setItem(k, JSON.stringify({ n: 'Someone Else', e: 'else@example.com', l: 'l_other', t: Date.now() })), [PK]);
    await page.goto(LANDING + 'book/?lead_id=l_mine&utm_source=meta');
    await page.waitForSelector('.calendly-inline-widget', { state: 'attached' });
    let p = Object.fromEntries(new URL(await widgetUrl(page)).searchParams);
    R.check(!('name' in p) && !('email' in p), 'a prefill written for another lead is not used');
    await page.evaluate(([k]) => sessionStorage.setItem(k, JSON.stringify({ n: 'Old Entry', e: 'old@example.com', l: 'l_mine', t: Date.now() - 31 * 60 * 1000 })), [PK]);
    await page.goto(LANDING + 'book/?lead_id=l_mine&utm_source=meta');
    await page.waitForSelector('.calendly-inline-widget', { state: 'attached' });
    p = Object.fromEntries(new URL(await widgetUrl(page)).searchParams);
    R.check(!('name' in p) && !('email' in p), 'a prefill older than 30 minutes is not used');
    await page.evaluate(([k]) => sessionStorage.setItem(k, JSON.stringify({ n: 'Fresh Entry', e: 'fresh@example.com', l: 'l_mine', t: Date.now() - 60 * 1000 })), [PK]);
    await page.goto(LANDING + 'book/?lead_id=l_mine&utm_source=meta');
    await page.waitForSelector('.calendly-inline-widget', { state: 'attached' });
    p = Object.fromEntries(new URL(await widgetUrl(page)).searchParams);
    R.eq([p.name, p.email], ['Fresh Entry', 'fresh@example.com'], 'a fresh prefill for this lead is used');
    R.check((await page.evaluate(([k]) => sessionStorage.getItem(k), [PK])) === null, 'and removed at once');
    await r.ctx.close();
  }
  // 5c a booking without a form
  {
    const r = await open({ consent: 'accepted' }, null);
    const { page } = r;
    await page.goto(LANDING + 'book/?utm_source=meta&utm_content=ad9');
    await page.waitForSelector('.calendly-inline-widget', { state: 'attached' });
    const p = Object.fromEntries(new URL(await widgetUrl(page)).searchParams);
    R.check(/^d_[0-9a-f]{20}$/.test(p.utm_content), 'no lead id in the address: a d_ id is minted for Calendly', p.utm_content);
    R.eq(p.utm_source, 'meta', 'tracking from the address is kept');
    const qf = (await fbqCalls(page) || []).filter((c) => c[1] === 'QualifiedForm');
    R.eq(qf.length, 0, 'no QualifiedForm for a visit that did not come from the form');
    await Promise.all([page.waitForURL(/\/takk\//, { timeout: 5000 }), page.evaluate(() => window.dispatchEvent(new MessageEvent('message', { origin: 'https://calendly.com', data: { event: 'calendly.event_scheduled' } })))]);
    R.check(/^d_/.test(q(page.url()).lead_id), 'and the booking still reaches /takk with its d_ id');
    await r.ctx.close();
  }
  // 5d a lead id that is not shaped like ours is not trusted
  {
    const r = await open({}, null);
    const { page } = r;
    await page.goto(LANDING + 'book/?lead_id=' + encodeURIComponent('x" onload="alert(1)'));
    await page.waitForSelector('.calendly-inline-widget', { state: 'attached' });
    const p = Object.fromEntries(new URL(await widgetUrl(page)).searchParams);
    R.check(/^d_/.test(p.utm_content), 'a lead id with odd characters is replaced by a d_ id', p.utm_content);
    await r.ctx.close();
  }
}

/* ============================================================================ 6. no JavaScript */
async function nojs() {
  R.section('6. JavaScript off');
  for (const vp of [M, D]) {
    const r = await open({ js: false, vp });
    const { page } = r;
    R.eq(await page.locator('#lf-form .lf-block:visible').count(), 13, `${vp.width}: all thirteen questions are on the page`);
    R.check(await page.locator('#lf-form .lf-actions .btn').isVisible(), `${vp.width}: the submit button is there`);
    R.check(await page.locator('#lf-form .lf-consent').isVisible(), `${vp.width}: the consent sentence is there`);
    R.check(await page.evaluate(() => !document.documentElement.classList.contains('js')), `${vp.width}: no js class`);
    R.check(await page.locator('.is-closed').count() === 0 && await page.locator('.rv').count() === 0, `${vp.width}: nothing is hidden waiting for a scroll`);
    const fin = await page.evaluate(() => [].map.call(document.querySelectorAll('.cn[data-to]'), (el) => [el.querySelector('.cn-sr').textContent.trim(), el.querySelector('[aria-hidden]').textContent.trim()]));
    R.check(fin.every((x) => x[0] === x[1] && x[0] !== '0'), `${vp.width}: figures show their final value`, JSON.stringify(fin));
    R.check(await page.locator('#g-consent').isHidden(), `${vp.width}: no banner without a script`);
    R.check((await overflow(page)) <= 0, `${vp.width}: no horizontal scroll`);
    if (vp === M) await shot(page, 'nojs-390-landing', { fullPage: true });
    await r.ctx.close();
  }
  // fit, post, 303
  {
    const r = await open({ js: false });
    const { page } = r;
    await fillAll(page, {});
    await Promise.all([page.waitForURL(/\/book\//, { timeout: 8000 }), page.locator('#lf-form .lf-actions .btn').click()]);
    const qq = q(page.url());
    R.check(/^l_[0-9a-f]{20}$/.test(qq.lead_id), 'fit: the server minted the lead id', qq.lead_id);
    R.eq(srv.state.lastApi.status, 303, 'fit: the post was answered with a redirect');
    R.eq(rigNow().of('zapier').length, 1, 'fit: one delivery');
    const z = rigNow().of('zapier')[0].body;
    R.eq([z.utm_source, z.utm_medium, z.utm_campaign, z.utm_content, z.utm_term], ['meta', 'paid', 'itq4', 'ad7', 'managed'], 'fit: tracking recovered from the page address');
    R.eq(z.fbclid, '', 'fit: no ad-click id (no consent without a script)');
    R.eq(rigNow().of('capi').length, 0, 'fit: nothing to Meta');
    R.eq([qq.utm_source, qq.utm_content], ['meta', 'ad7'], 'fit: tracking is on the book page address');
    R.eq(r.cal.length, 0, 'fit: no Calendly script without JavaScript');
    R.check(await page.locator('noscript').count() > 0, 'book: noscript block exists');
    const link = page.locator('.o-cal-wrap a', { hasText: 'Open the calendar in its own page' });
    R.eq(await link.count(), 1, 'book: a plain link to the calendar is shown');
    R.eq(await link.getAttribute('href'), CAL, 'book: and it goes to the Calendly event');
    R.check((await txt(page.locator('main'))).includes('Choose a time that suits you.'), 'book: the heading is there');
    await shot(page, 'nojs-390-book');
    await r.ctx.close();
  }
  // review, not_now, not_a_fit
  for (const route of ['review', 'not_now', 'not_a_fit']) {
    const r = await open({ js: false });
    const { page } = r;
    await fillAll(page, ANSWERS[route]);
    await Promise.all([page.waitForURL(new RegExp(`/${OUTCOME[route].page}/`), { timeout: 8000 }), page.locator('#lf-form .lf-actions .btn').click()]);
    R.eq(await txt(page.locator('h1')), copy.outcomes[OUTCOME[route].key].h, `${route}: the right page`);
    await r.ctx.close();
  }
  // a wrong post
  {
    const r = await open({ js: false });
    const { page } = r;
    await fillAll(page, { company_website: 'not a site', email: 'nope', turnover_band: OPTIONS.turnover[3] });
    await page.locator('#lf-form .lf-actions .btn').click();
    await page.waitForLoadState('load');
    R.eq(srv.state.lastApi.status, 422, 'invalid: the server answers 422');
    R.eq(new URL(page.url()).pathname, '/api/lead', 'invalid: the answer is shown at the post address');
    R.eq(await page.locator('#lf-form .lf-block:visible').count(), 13, 'invalid: the whole form is back');
    const errs = (await page.locator('.lf-err span').allTextContents()).map(norm);
    R.eq(errs, [core.MSG.url, core.MSG.email], 'invalid: the two board messages, in form order');
    R.eq(await page.locator('#f-company_name').inputValue(), GOOD.company_name, 'invalid: other answers are kept');
    R.eq(await page.locator('input[name=turnover_band]:checked').getAttribute('value'), OPTIONS.turnover[3], 'invalid: the chosen option is kept');
    R.eq(await page.locator('#f-company_website').getAttribute('aria-invalid'), 'true', 'invalid: field marked invalid');
    R.check(await page.locator('meta[name=robots][content="noindex,nofollow"]').count() === 1, 'invalid: still noindex');
    R.eq(rigNow().blobs.leads().length, 0, 'invalid: nothing stored');
    R.eq(rigNow().calls.length, 0, 'invalid: no outside call at all');
    await shot(page, 'nojs-390-invalid', { fullPage: true });
    await page.locator('#f-company_website').fill('northbridge-it.co.uk');
    await page.locator('#f-email').fill('alex@northbridge-it.co.uk');
    await Promise.all([page.waitForURL(/\/book\//, { timeout: 8000 }), page.locator('#lf-form .lf-actions .btn').click()]);
    const z = rigNow().of('zapier')[0] && rigNow().of('zapier')[0].body;
    R.eq(z && z.utm_source, 'meta', 'corrected: tracking survived the failed attempt');
    R.eq(rigNow().blobs.leads().length, 1, 'corrected: stored once');
    await r.ctx.close();
  }
}

/* ============================================================================ 7. failures */
async function failures() {
  R.section('7. When something goes wrong');
  // 7a network down, then back
  {
    const r = await open();
    const { page } = r;
    await page.locator('#form').scrollIntoViewIfNeeded();
    await fillForm(page, {}, { submit: false });
    const leadId = await hidden(page, 'lead_id');
    await page.route('**/api/lead', (rt) => rt.abort('failed'));
    const btn = page.locator('#lf-form .lf-actions .btn');
    await btn.click();
    await page.locator('.lf-gerr').waitFor({ state: 'visible', timeout: 5000 });
    R.eq(await txt(btn), copy.form.retry, 'network down: the button says what the board says');
    R.check((await txt(page.locator('.lf-gerr'))).includes(norm(copy.form.failed)), 'network down: the board message is shown');
    R.eq(await page.locator('.lf-gerr a').getAttribute('href'), 'mailto:' + cfg.contact.email, 'network down: with a way to write to us');
    R.eq(await txt(page.locator('#lf-count')), '13 / 13', 'network down: the visitor stays on the last question');
    R.eq(await page.locator('#f-email').inputValue(), GOOD.email, 'network down: answers are kept');
    R.check(await btn.isEnabled(), 'network down: the button is usable again');
    await shot(page, 'form-390-failed');
    await page.unroute('**/api/lead');
    await btn.click();
    await waitBy(page, /\/book\//);
    R.eq(q(page.url()).lead_id, leadId, 'retry: the same lead id');
    R.eq(rigNow().blobs.leads().length, 1, 'retry: stored once');
    await r.ctx.close();
  }
  // 7b server says 503
  {
    const r = await open();
    const { page } = r;
    await page.locator('#form').scrollIntoViewIfNeeded();
    await fillForm(page, {}, { submit: false });
    await page.route('**/api/lead', (rt) => rt.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false,"error":"unavailable"}' }));
    await page.locator('#lf-form .lf-actions .btn').click();
    await page.locator('.lf-gerr').waitFor({ state: 'visible', timeout: 5000 });
    R.eq(await txt(page.locator('#lf-form .lf-actions .btn')), copy.form.retry, '503: same message and button');
    await r.ctx.close();
  }
  // 7c an answer page that is not ours is not followed
  {
    const r = await open();
    const { page } = r;
    await page.locator('#form').scrollIntoViewIfNeeded();
    await fillForm(page, {}, { submit: false });
    await page.route('**/api/lead', (rt) => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, route: 'fit', next: 'https://evil.example/x' }) }));
    await page.locator('#lf-form .lf-actions .btn').click();
    await page.locator('.lf-gerr').waitFor({ state: 'visible', timeout: 5000 });
    R.check(new URL(page.url()).hostname === '127.0.0.1', 'a "next" on another host is not followed');
    await page.unroute('**/api/lead');
    await page.route('**/api/lead', (rt) => rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, route: 'fit', next: '//evil.example/x' }) }));
    await page.locator('#lf-form .lf-actions .btn').click();
    await settle(page, 600);
    R.check(new URL(page.url()).hostname === '127.0.0.1', 'nor is a protocol-relative one');
    R.check(r.ext.length === 0, 'and nothing was requested from it', r.ext.join(','));
    await r.ctx.close();
  }
  // 7d the server finds a wrong answer: jump to that question
  {
    const r = await open();
    const { page } = r;
    await page.locator('#form').scrollIntoViewIfNeeded();
    await fillForm(page, {}, { submit: false });
    await page.route('**/api/lead', (rt) => rt.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ ok: false, errors: { email: core.MSG.email, company_website: core.MSG.url } }) }));
    await page.locator('#lf-form .lf-actions .btn').click();
    await page.waitForFunction(() => document.getElementById('lf-count').textContent.trim() === '1 / 13', null, { timeout: 5000 });
    R.eq(await txt(page.locator('.lf-block:not([hidden]) .lf-err')), core.MSG.url, '422: the first wrong question is shown, with its message');
    R.eq(await page.evaluate(() => document.activeElement.id), 'f-company_website', '422: and has focus');
    await page.unroute('**/api/lead');
    await page.locator('#f-company_website').fill('northbridge-it.co.uk');
    const btn = page.locator('#lf-form .lf-actions .btn');
    for (let i = 0; i < 12; i++) await btn.click();
    R.eq(await txt(page.locator('#lf-count')), '13 / 13', '422: the visitor can walk on to the last question');
    await btn.click();
    await waitBy(page, /\/book\//);
    R.ok('422: and send again');
    await r.ctx.close();
  }
  // 7e double press while a slow send is under way
  {
    const r = await open();
    const { page } = r;
    await page.locator('#form').scrollIntoViewIfNeeded();
    await fillForm(page, {}, { submit: false });
    await page.route('**/api/lead', async (rt) => { await new Promise((ok) => setTimeout(ok, 700)); await rt.continue(); });
    const btn = page.locator('#lf-form .lf-actions .btn');
    await btn.click();
    R.check(await page.locator('.lf-status').isVisible(), 'sending: the board "sending" line shows');
    R.check(await btn.isDisabled(), 'sending: the button is disabled');
    R.eq(await page.locator('#lf-form').getAttribute('aria-busy'), 'true', 'sending: aria-busy');
    await btn.click({ force: true, timeout: 1000 }).catch(() => {});
    await page.keyboard.press('Enter').catch(() => {});
    await waitBy(page, /\/book\//);
    R.eq(rigNow().blobs.leads().length, 1, 'sending: only one lead stored');
    R.eq(rigNow().of('zapier').length, 1, 'sending: only one delivery');
    await r.ctx.close();
  }
  // 7f a bot that fills the hidden field
  {
    const r = await open();
    const { page } = r;
    await page.locator('#form').scrollIntoViewIfNeeded();
    await fillForm(page, {}, { submit: false });
    await page.evaluate(() => { document.querySelector('input[name=contact_by_fax]').value = '0123'; });
    await page.locator('#lf-form .lf-actions .btn').click();
    await waitBy(page, /\/not-a-fit\//);
    R.eq(rigNow().blobs.leads().length, 0, 'bot: nothing stored');
    R.eq(rigNow().calls.length, 0, 'bot: nothing sent anywhere');
    await r.ctx.close();
  }
  // 7g the endpoint with a plain GET
  {
    const r = await open({}, null);
    const res = await r.ctx.request.get(srv.base + '/api/lead');
    R.eq(res.status(), 405, 'GET /api/lead: 405');
    R.eq(res.headers().allow, 'POST', 'GET /api/lead: Allow: POST');
    await r.ctx.close();
  }
  // 7h the browser's own back button
  {
    const r = await open();
    const { page } = r;
    await page.locator('#form').scrollIntoViewIfNeeded();
    await fillForm(page, {});
    await waitBy(page, /\/book\//);
    await page.goBack({ waitUntil: 'load' });
    await settle(page, 500);
    R.eq(new URL(page.url()).pathname, PATH, 'back: the landing page again');
    R.check(!(await page.locator('#lf-form').evaluate((f) => f.classList.contains('is-sending'))), 'back: the form is not stuck in "sending"');
    R.check(await page.locator('#lf-form .lf-actions .btn').isEnabled(), 'back: the button works');
    await r.ctx.close();
  }
}

/* ============================================================================ 8. motion */
async function motion() {
  R.section('8. Reduced motion');
  const r = await open({ reduced: true });
  const { page } = r;
  R.check(await page.evaluate(() => !document.documentElement.classList.contains('anim')), 'html has no anim class');
  const fin = await page.evaluate(() => [].map.call(document.querySelectorAll('.cn[data-to]'), (el) => [el.querySelector('.cn-sr').textContent.trim(), el.querySelector('[aria-hidden]').textContent.trim()]));
  R.check(fin.every((x) => x[0] === x[1] && x[0] !== '0'), 'figures are final at once', JSON.stringify(fin));
  R.eq(await page.locator('.rv, .is-closed').count(), 0, 'no section waits for a scroll');
  const anim = await page.evaluate(() => [].filter.call(document.querySelectorAll('*'), (el) => { const s = getComputedStyle(el); return s.animationName !== 'none' && parseFloat(s.animationDuration) > 0.01; }).length);
  R.eq(anim, 0, 'no CSS animation runs', String(anim));
  await r.ctx.close();
}

/* ============================================================================ 9. desktop */
async function desktop() {
  R.section('9. Desktop, 1280 x 900');
  const r = await open({ vp: D });
  const { page, b } = r;
  R.check((await overflow(page)) <= 0, 'no horizontal scroll');
  await shot(page, 'landing-1280-top');
  await page.locator('#form').scrollIntoViewIfNeeded();
  await settle(page, 400);
  await shot(page, 'form-1280-step1');
  await fillForm(page, {}, { submit: false });
  await shot(page, 'form-1280-last');
  await page.locator('#lf-form .lf-actions .btn').click();
  await waitBy(page, /\/book\//);
  await page.waitForSelector('.calendly-inline-widget', { state: 'attached' });
  const grid = await page.evaluate(() => { const h = document.querySelector('.o-h1').getBoundingClientRect(); const c = document.querySelector('.o-cal-wrap').getBoundingClientRect(); return { sideBySide: c.left > h.left + 100, calTop: Math.round(c.top), h1Top: Math.round(h.top) }; });
  R.check(grid.sideBySide, 'book: heading and calendar side by side at 1280', JSON.stringify(grid));
  await shot(page, 'book-1280');
  R.eq(cleanErrors(b), [], 'no console errors', JSON.stringify(cleanErrors(b)));
  await r.ctx.close();
}

/* ============================================================================ 10. committed state */
async function committed() {
  R.section('10. The pages as committed (live is false, no calendar address yet)');
  const s2 = await startServer({ live: false });
  const ctx = await browser.newContext({ viewport: M, javaScriptEnabled: true, locale: 'en-GB' });
  await ctx.route('**/*', (rt) => (new URL(rt.request().url()).hostname === '127.0.0.1' ? rt.fallback() : rt.abort()));
  const page = await ctx.newPage();
  const b = bucket(); watch(page, b);
  await page.goto(s2.base + PATH + 'book/?lead_id=l_x');
  R.check((await txt(page.locator('#cal'))).includes('The calendar is not connected yet'), 'book: shows the build note instead of a calendar');
  R.eq(await page.locator('.calendly-inline-widget').count(), 0, 'book: no calendar widget');
  await page.goto(s2.base + PATH + QS);
  await page.locator('#form').scrollIntoViewIfNeeded();
  await fillForm(page, {}, { submit: false });
  await page.locator('#lf-form .lf-actions .btn').click();
  await page.locator('.lf-gerr').waitFor({ state: 'visible', timeout: 5000 });
  R.eq(s2.state.lastApi.status, 503, 'endpoint answers 503 while live is false');
  R.eq(s2.state.rig.blobs.leads().length, 0, 'and stores nothing');
  R.eq(s2.state.rig.calls.length, 0, 'and sends nothing');
  R.eq(await txt(page.locator('#lf-form .lf-actions .btn')), copy.form.retry, 'the visitor sees the board failure message and Try again');
  await ctx.close();
  await s2.close();
}

/* ============================================================================ 11. text */
async function text() {
  R.section('11. Text on the pages against the board text dump');
  const dump = JSON.parse(fs.readFileSync(process.env.E2E_BOARD_TEXT, 'utf8'));
  const plain = (arr) => arr.filter((t) => typeof t === 'string' && !/^(TITLE:|META |HREF |ATTR |\[PLASSHOLDER)/.test(t) && !/^(390|768|1280|CALENDLY_EMBED)$/.test(t));
  const targets = [
    ['Main', PATH + QS, {}],
    ['OutBook', PATH + 'book/?lead_id=l_x', {}],
    ['OutTakk', PATH + 'takk/?lead_id=l_x', {}],
    ['OutReview', PATH + 'review/?lead_id=l_x', {}],
    ['OutNotNow', PATH + 'not-now/', {}],
    ['OutNotFit', PATH + 'not-a-fit/', {}],
  ];
  for (const [key, url] of targets) {
    const r = await open({ vp: D, reduced: true }, srv.base + url);
    const nodes = await pageText(r.page);
    const have = norm(nodes.join(' '));
    const board = [...new Set(plain(dump[key]).map(norm))].filter((t) => t.length > 1);
    const missing = board.filter((t) => !have.includes(t));
    // the first frame (390) is a mobile cut of the same page; everything must be in the page once
    R.check(missing.length === 0, `${key}: every board string is on the page (${board.length} checked)`, missing.slice(0, 12).map((m) => JSON.stringify(m)).join('\n      '));
    const bigBoard = norm(board.join(' '));
    const extra = nodes.map(norm).filter((t) => t.length > 3 && !bigBoard.includes(t));
    if (extra.length) console.log(`    · ${key}: page text not in the board dump (${extra.length}): ` + extra.slice(0, 8).map((m) => JSON.stringify(m.slice(0, 90))).join(' | '));
    await r.ctx.close();
  }
}


/* ============================================================================ 12. keyboard */
async function kbd() {
  R.section('12. Keyboard only');
  const r = await open({ reduced: true });
  const { page } = r;
  const act = () => page.evaluate(() => { const a = document.activeElement; return { tag: a.tagName, id: a.id, type: a.type || '', name: a.name || '', cls: a.className || '', text: (a.textContent || '').trim().slice(0, 40) }; });
  await page.locator('#form').scrollIntoViewIfNeeded();
  await page.focus('#f-company_website');
  await page.keyboard.type('northbridge-it.co.uk');
  await page.keyboard.press('Enter');
  R.eq((await act()).id, 'f-company_name', 'Enter on a text question moves on and focuses the next input');
  await page.keyboard.type('Northbridge IT Limited');
  await page.keyboard.press('Enter');
  let a = await act();
  R.eq(a.tag, 'LEGEND', 'a choice question takes focus on its legend, so the question is read out');
  await page.keyboard.press('Tab');
  a = await act();
  R.check(a.type === 'radio' && a.name === 'specialism', 'Tab goes into the options', JSON.stringify(a));
  const ring = await page.evaluate(() => { const c = document.activeElement.closest('.lf-card'); const o = getComputedStyle(c); const i = getComputedStyle(c.querySelector('.lf-ind')); return { card: o.outlineStyle + ' ' + o.outlineWidth, ind: i.outlineStyle + ' ' + i.outlineWidth }; });
  R.check(!/^none/.test(ring.card) || !/^none/.test(ring.ind), 'the focused option shows a focus ring', JSON.stringify(ring));
  await shot(page, 'kbd-390-radio-focus');
  await page.keyboard.press('ArrowDown');
  R.eq(await page.locator('input[name=specialism]:checked').getAttribute('value'), OPTIONS.area[1], 'arrow keys move between options and choose');
  await page.keyboard.press('Enter');
  const c1 = await txt(page.locator('#lf-count'));
  R.eq(c1, '4 / 13', 'Enter on an option moves on (implicit submit)');
  await page.keyboard.press('Shift+Tab');
  a = await act();
  R.check(a.cls.includes('lf-back') || a.tag === 'LEGEND', 'Shift+Tab from the first option reaches Back or the question', JSON.stringify(a));
  // Tab order after a text question: input, then Next
  await page.goto(LANDING + QS);
  await page.locator('#form').scrollIntoViewIfNeeded();
  await page.focus('#f-company_website');
  await page.keyboard.press('Tab');
  a = await act();
  R.check(a.tag === 'BUTTON' && /Next/.test(a.text), 'Tab from the input reaches Next', JSON.stringify(a));
  await page.keyboard.press('Space');
  R.eq(await txt(page.locator('.lf-block:not([hidden]) .lf-err')), core.MSG.url, 'Space on Next validates like a click');
  // banner by keyboard
  await scrollY(page, 420); await settle(page, 500);
  await page.focus('#g-consent button[data-c=no]');
  await page.keyboard.press('Enter');
  await settle(page);
  R.eq(await page.evaluate((k) => localStorage.getItem(k), KEY), 'declined', 'the banner can be answered from the keyboard');
  await r.ctx.close();
}

/* ============================================================================ 13. axe */
let AXE = '';
try { AXE = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8'); } catch (e) { /* optional */ }
async function axeRun(page, label) {
  await page.evaluate(AXE);
  const res = await page.evaluate(async () => {
    const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }, resultTypes: ['violations'] });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.slice(0, 3).map((n) => ({ t: n.target.join(' '), h: n.html.slice(0, 130), s: (n.failureSummary || '').split('\n').slice(1, 3).join(' | ') })) }));
  });
  R.check(res.length === 0, `axe: ${label}`, JSON.stringify(res, null, 1).slice(0, 2200));
  return res;
}
async function a11y() {
  R.section('13. Automated accessibility checks (axe-core, WCAG 2.2 AA and best practice)');
  for (const vp of [M, D]) {
    const r = await open({ vp, reduced: true });
    const { page } = r;
    await settle(page, 500);
    await axeRun(page, `landing ${vp.width}, top of page`);
    await scrollY(page, 500); await settle(page, 700);
    await axeRun(page, `landing ${vp.width}, banner showing`);
    await page.locator('#g-consent button[data-c=no]').click();
    await page.locator('#form').scrollIntoViewIfNeeded(); await settle(page, 500);
    if (vp === M) {
      // every question
      const f = page.locator('#lf-form');
      for (let i = 0; i < core.STEPS.length; i++) {
        await axeRun(page, `question ${i + 1} (${core.STEPS[i].id})`);
        if (i === 0) {
          await f.locator('.lf-actions .btn').click(); await settle(page, 200);
          await axeRun(page, 'question 1 with its error showing');
          await answerStep(page, 0, GOOD);
        }
        if (i === core.STEPS.length - 1) {
          await f.locator('.lf-actions .btn').click(); await settle(page, 200);
          await axeRun(page, 'details question with its errors showing');
        } else {
          await answerStep(page, i, GOOD);
          await f.locator('.lf-actions .btn').click(); await settle(page, 150);
        }
      }
      await fillFrom(page, core.STEPS.length - 1, {}, { submit: false });
      await page.route('**/api/lead', (rt) => rt.abort('failed'));
      await f.locator('.lf-actions .btn').click();
      await page.locator('.lf-gerr').waitFor({ state: 'visible' });
      await settle(page, 300);
      await axeRun(page, 'the "something went wrong" state');
    }
    await r.ctx.close();
  }
  const pages = [['book', PATH + 'book/?lead_id=l_x'], ['takk', PATH + 'takk/?lead_id=l_x'], ['review', PATH + 'review/?lead_id=l_x'], ['not-now', PATH + 'not-now/'], ['not-a-fit', PATH + 'not-a-fit/']];
  for (const vp of [M, D]) {
    for (const [name, u] of pages) {
      const r = await open({ vp, reduced: true }, srv.base + u);
      await settle(page0(r), 700);
      await axeRun(r.page, `${name} ${vp.width}, with the banner`);
      await r.ctx.close();
    }
  }
}
const page0 = (r) => r.page;

const groups = { landing, form, routes, consent, book, nojs, failures, motion, desktop, committed, kbd, a11y, text };
const skip = {
  committed: cfg.live ? 'config.json has "live": true, so the committed pages are no longer in the pre-launch state this group describes' : '',
  a11y: AXE ? '' : 'axe-core is not installed (npm install --no-save axe-core)',
  text: process.env.E2E_BOARD_TEXT ? '' : 'E2E_BOARD_TEXT is not set',
};
for (const [name, fn] of Object.entries(groups)) {
  if (!run(name)) continue;
  if (skip[name]) { console.log(`\n(skipped: ${name}: ${skip[name]})`); continue; }
  try { await fn(); } catch (e) { R.fail(`group "${name}" stopped`, String(e && e.stack || e).split('\n').slice(0, 6).join('\n      ')); }
}
await browser.close();
await srv.close();
if (!process.env.E2E_KEEP) BUILT.cleanup();
const bad = R.summary();
process.exit(bad ? 1 : 0);
