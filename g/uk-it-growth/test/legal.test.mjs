import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, cfg, visible } from './helpers.mjs';
import { renderLegalBlocks } from '../../_growth/legal.mjs';
import { RETENTION_DAYS } from '../../../netlify/functions/lead/store.mjs';

/* The privacy notice and the website terms: the words are in legal.json, the page is built by the generator.
   These tests are about what the notice SAYS being true of what the page and the function DO. */
const OUT = mkdtempSync(join(tmpdir(), 'g-growth-legal-'));
const legal = JSON.parse(readFileSync(join(ROOT, 'g', 'uk-it-growth', 'legal.json'), 'utf8'));
const built = {};
const ALL = ['index.html', 'book/index.html', 'takk/index.html', 'review/index.html', 'not-now/index.html', 'not-a-fit/index.html', 'privacy/index.html', 'terms/index.html'];

before(() => {
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'build-g-growth.mjs')], {
    cwd: ROOT, encoding: 'utf8',
    env: Object.assign({}, process.env, { G_GROWTH_OUT: OUT, G_GROWTH_FUNCTION_DATA: join(OUT, 'data.generated.mjs') }),
  });
  for (const p of ALL) built[p] = readFileSync(join(OUT, cfg.slug, p), 'utf8');
});

const text = (html) => visible(html);
const render = (key, register) => visible(renderLegalBlocks(legal[key], cfg, { register }));

test('the notice and the terms are numbered parts, in order, and say when they were last changed', () => {
  const parts = (html) => [...html.matchAll(/<h2>(\d+)\. /g)].map((m) => Number(m[1]));
  assert.deepEqual(parts(built['privacy/index.html']), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(parts(built['terms/index.html']), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  for (const p of ['privacy/index.html', 'terms/index.html']) {
    assert.match(built[p], /<p class="lg-date">Last updated: \d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) 20\d\d<\/p>/, p);
  }
});

test('nothing in the published text is still open: no square bracket, no note to the solicitor, no "to confirm"', () => {
  for (const p of ['privacy/index.html', 'terms/index.html']) {
    const t = text(built[p]);
    assert.equal(/[\[\]]/.test(t), false, p + ': a square bracket');
    assert.equal(/solicitor|elevate to confirm|to be confirmed|tbc|todo|lorem/i.test(t), false, p);
  }
});

test('the controller is named as the footer names it, with the contact address', () => {
  const t = text(built['privacy/index.html']);
  assert.ok(t.includes('EngeCo AS'));
  assert.ok(t.includes('924 490 926'));
  assert.ok(t.includes('Midtfjellet 66, 5363 Ågotnes, Norway'));
  assert.ok(built['privacy/index.html'].includes(`<a href="mailto:${cfg.contact.email}">${cfg.contact.email}</a>`));
  assert.ok(text(built['terms/index.html']).includes('924 490 926'));
});

test('the notice never describes a Companies House check that the settings say is not made', () => {
  assert.equal(typeof cfg.legal.registerCheck, 'boolean');
  const pages = ['index.html', 'book/index.html', 'takk/index.html', 'review/index.html', 'not-now/index.html', 'not-a-fit/index.html', 'privacy/index.html', 'terms/index.html'];
  for (const p of pages) {
    const mentions = /companies house|public records/i.test(text(built[p]));
    if (cfg.legal.registerCheck) continue;
    assert.equal(mentions, false, `${p} mentions the register while legal.registerCheck is false`);
  }
});

test('with the check switched on, the notice and the terms say so, in every place that matters', () => {
  const on = (key) => render(key, true);
  const off = (key) => render(key, false);
  for (const key of ['privacy', 'terms']) {
    assert.equal(/companies house/i.test(off(key)), false, key + ' (off)');
    assert.equal(/companies house/i.test(on(key)), true, key + ' (on)');
  }
  // the notice: collected, why, and who receives it; the terms: the check, and the service run by others
  assert.equal((on('privacy').match(/Companies House/g) || []).length >= 3, true);
  assert.ok(on('terms').includes('We check the company name you give against public records'));
  assert.ok(on('privacy').includes('a booking page, a page saying that we will review'));
  assert.equal(off('privacy').includes('a booking page'), false);
});

test('every system that receives a lead is named in Part 4 of the notice', () => {
  const part4 = text(built['privacy/index.html']);
  for (const name of ['Netlify', 'Zapier', 'ClickUp', 'Slack', 'Calendly', 'Meta Platforms Ireland', 'Typeform']) {
    assert.ok(part4.includes(name), name);
  }
  // and the notice says what Slack gets: the company name, the decision and the free text, never contact details
  assert.ok(part4.includes('what you told us you want from the meeting. No email address or phone number.'));
  assert.ok(text(built['privacy/index.html']).includes('what you want to get out of the meeting'), 'Part 2 lists the free text');
});

test('the cookie table matches what the pages do: one choice in localStorage by the consent script, tab storage by the page, no cookie written by us', () => {
  for (const p of ALL) {
    const code = [...built[p].matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
    assert.equal(/document\.cookie\s*=/.test(code), false, p + ' writes a cookie');
    assert.equal(/localStorage\.setItem/.test(code), false, p + ' writes to localStorage (only /js/consent.js may)');
  }
  const t = text(built['privacy/index.html']);
  assert.ok(t.includes('Until you close the tab'));
  assert.ok(t.includes('Until you clear your browser'));
  // the prefill really is held in the tab and not in localStorage
  const landing = built['index.html'];
  assert.match(landing, /sessionStorage/);
});

test('the privacy page can change the cookie choice, and no other page has the button', () => {
  const privacy = built['privacy/index.html'];
  assert.equal((privacy.match(/id="cookie-reset"/g) || []).length, 1);
  assert.match(privacy, /<button class="lg-btn" type="button" id="cookie-reset" hidden>Change your cookie choice<\/button>/);
  assert.match(privacy, /localStorage\.removeItem\('elevate-cookie-consent'\)/);
  for (const p of ALL.filter((x) => x !== 'privacy/index.html')) assert.equal(built[p].includes('cookie-reset'), false, p);
});

test('the notice does not promise to keep an application longer than the function does', () => {
  // "12 months after our last contact": the store deletes 365 days after receipt, which is never later.
  assert.ok(RETENTION_DAYS <= 366);
  assert.ok(text(built['privacy/index.html']).includes('12 months after our last contact'));
});

test('the terms point at the privacy page the footer points at, and choose English law as the draft did', () => {
  const t = built['terms/index.html'];
  assert.ok(t.includes(`<a href="${cfg.links.privacy}">privacy notice</a>`));
  assert.ok(text(t).includes('governed by the law of England and Wales'));
  assert.equal(cfg.links.privacy, '/g/uk-it-growth/privacy/');
  assert.equal(cfg.links.terms, '/g/uk-it-growth/terms/');
});

test('the legal pages share the funnel\'s shell: header, one reading column, the same footer and cookie bar', () => {
  for (const p of ['privacy/index.html', 'terms/index.html']) {
    const h = built[p];
    assert.match(h, /<header class="hd">/);
    assert.match(h, /<article class="lg-doc">/);
    assert.match(h, /<footer class="ft" data-theme="marine">/);
    assert.match(h, /<nav class="ft-links" aria-label="Legal"><a href="\/g\/uk-it-growth\/privacy\/">Privacy<\/a><a href="\/g\/uk-it-growth\/terms\/">Website terms<\/a><\/nav>/);
    assert.match(h, /id="g-consent"/);
  }
});

test('a table row with the wrong number of cells, and a condition the build does not know, are refused', () => {
  const doc = { blocks: [{ table: { label: 'x', head: ['a', 'b'], rows: [['one']] } }] };
  assert.throws(() => renderLegalBlocks(doc, cfg, { register: false }), /does not have 2 cells/);
  assert.throws(() => renderLegalBlocks({ blocks: [{ p: 'x', when: 'weekend' }] }, cfg, { register: false }), /not one the build knows/);
  assert.throws(() => renderLegalBlocks({ blocks: [{ p: '[[x|https://example.com]]' }] }, cfg, { register: false }), /path on this site/);
});
