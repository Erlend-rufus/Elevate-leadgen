// Shared fixtures for the /italy tests. Run with: npm run test:italy
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

/** A complete, valid submission as the form posts it. Passes every routing rule, so it lands on /book. */
export const GOOD = {
  offers: '0', employees: '1', source: '0', priority: '0', budget: '0',
  details_name: 'Marco Rossi', details_company: 'Rossi Cyber Srl', details_email: 'marco@rossicyber.it', details_consent: '1',
  lead_id: 'l_test123', page_slug: 'canoni',
  utm_source: 'meta', utm_medium: 'paid', utm_campaign: 'it-q4', utm_content: 'ad7', utm_term: 'x',
  fbclid: 'FB1', referrer: 'https://l.facebook.com/',
};

export const SHELL = { before: '<!doctype html><html><body><main>', after: '</main></body></html>' };

export function post(fields, { json: asJson = true, headers = {}, type } = {}) {
  const body = new URLSearchParams(fields).toString();
  return new Request('https://example.test/italy/api/lead', {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': type || 'application/x-www-form-urlencoded', Accept: asJson ? 'application/json' : 'text/html' }, headers),
    body,
  });
}
