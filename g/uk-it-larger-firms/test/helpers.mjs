// Shared fixtures for the /uk-it-firms tests. Run with: npm run test:g-it
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const SRC = join(here, '..');
const require = createRequire(import.meta.url);
const json = (f) => JSON.parse(readFileSync(join(SRC, f), 'utf8'));

export const core = require(join(SRC, 'core.cjs'));
export const route = require(join(SRC, 'route.cjs'));
export const formMod = require(join(SRC, 'form.cjs'));
export const cfg = json('config.json');
export const copy = json('copy.json');
export const routing = json('routing.json');
export const Q = copy.form.questions;
export const M = copy.form.errors;

/**
 * A routing table for TESTS ONLY. It is not the real one: the real rules were
 * not supplied, and routing.json says so. Never copy this into routing.json.
 */
export const FIXTURE_ROUTING = {
  status: 'configured',
  rules: [
    { id: 'fixture-small', when: { turnover: [0, 1] }, then: 'not-a-fit' },
    { id: 'fixture-full', when: { capacity: [0] }, then: 'not-now' },
    { id: 'fixture-unsure', when: { turnover: [5], people: [0, 1] }, then: 'review' },
  ],
  fallback: 'book',
};

/** A complete, valid submission as the form posts it. */
export const GOOD = {
  website: 'northbridge-it.co.uk', company: 'Northbridge IT',
  area: '1', turnover: '2', people: '3', marketing: '2', value: '2', cycle: '1',
  target: '', decider: '0', capacity: '1',
  details_first: 'Alex', details_last: 'Morgan', details_title: 'Managing Director',
  details_email: 'alex@northbridge-it.co.uk', details_mobile: '07700 900123',
  lead_id: 'l_test123', page_slug: 'uk-it-larger-firms',
  utm_source: 'meta', utm_medium: 'paid', utm_campaign: 'itq4', utm_content: 'ad7', utm_term: 'solar',
  fbclid: 'FB1', referrer: 'https://l.facebook.com/',
};

export const SHELL = { before: '<!doctype html><html><body><main>', after: '</main></body></html>' };

export function post(fields, { json: asJson = true, headers = {}, type } = {}) {
  const body = new URLSearchParams(fields).toString();
  return new Request('https://example.test/uk-it-firms/apply', {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': type || 'application/x-www-form-urlencoded', Accept: asJson ? 'application/json' : 'text/html' }, headers),
    body,
  });
}
