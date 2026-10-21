// Shared fixtures for the /g/uk-it-growth tests. Run with: npm run test:g-growth
//
// Nothing here talks to the network. The handler is given a fetch that answers for Zapier,
// Companies House, Meta, Resend and Slack from a table, and a real store (store.mjs) on top
// of an in-memory stand-in for Netlify Blobs, so the code that decides what is kept and what
// is sent is the code that runs in production.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import * as core from '../core.mjs';
import * as route from '../route.mjs';
import { renderForm } from '../render-form.mjs';
import { createHandler } from '../../../netlify/functions/lead/index.mjs';
import { campaigns as realCampaigns } from '../../../netlify/functions/lead/campaigns.mjs';
import { createStore } from '../../../netlify/functions/lead/store.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const SRC = join(here, '..');
export const ROOT = join(here, '..', '..', '..');
const json = (f) => JSON.parse(readFileSync(join(SRC, f), 'utf8'));

export { core, route, renderForm, createStore };
export const cfg = json('config.json');
export const copy = json('copy.json');
export const OPTIONS = core.OPTIONS;
export const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');

/** A complete, valid submission as the page posts it, with consent given and a fit-sized firm. */
export const GOOD = {
  campaign: 'uk-it-growth',
  company_website: 'northbridge-it.co.uk',
  company_name: 'Northbridge IT Limited',
  specialism: OPTIONS.area[1],
  specialism_other: '',
  turnover_band: OPTIONS.turnover[2],
  trading_years: OPTIONS.trading[2],
  employees_or_fee_earners: OPTIONS.people[2],
  marketing_spend: OPTIONS.spend[1],
  first_year_value: OPTIONS.worth[2],
  sales_cycle: OPTIONS.cycle[1],
  target_next_year: '',
  decision_maker: OPTIONS.decider[0],
  capacity: OPTIONS.capacity[1],
  meeting_goal: 'A straight answer on whether this can work for a firm our size.',
  first_name: 'Alex',
  last_name: 'Morgan',
  job_title: 'Managing Director',
  email: 'alex@northbridge-it.co.uk',
  mobile: '07700 900123',
  lead_id: 'l_test123',
  page_slug: 'uk-it-growth',
  utm_source: 'meta',
  utm_medium: 'paid',
  utm_campaign: 'itq4',
  utm_content: 'ad7',
  utm_term: 'managed',
  fbclid: 'FB1',
  referrer: 'https://l.facebook.com/',
  consent: 'accepted',
  fbp: 'fb.1.1700000000000.123456789',
  fbc: '',
};

export const NOW = new Date('2026-10-19T09:00:00Z');
export const HOOK = 'https://hooks.zapier.com/hooks/catch/1111/abcdef/';

/** What the register says about Northbridge when nothing else is set. */
export const CH_PROFILE = {
  company_number: '01234567', company_name: 'NORTHBRIDGE IT LIMITED', company_status: 'active',
  date_of_creation: '2012-03-01', accounts: { last_accounts: { type: 'full' } },
};

export const ok = (body = 'ok', status = 200) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** An in-memory stand-in for the part of Netlify Blobs that store.mjs uses. */
export function fakeBlobs() {
  const m = new Map();
  const b = {
    m,
    fail: null, // set to a function (op, key) => throw to simulate storage trouble
    async setJSON(key, value, opts = {}) {
      if (b.fail) b.fail('set', key);
      if (opts.onlyIfNew && m.has(key)) return { modified: false };
      m.set(key, JSON.stringify(value));
      return { modified: true, etag: 'e' };
    },
    async get(key, opts = {}) {
      if (b.fail) b.fail('get', key);
      if (!m.has(key)) return null;
      return opts.type === 'json' ? JSON.parse(m.get(key)) : m.get(key);
    },
    async delete(key) { if (b.fail) b.fail('delete', key); m.delete(key); },
    async list({ prefix = '' } = {}) {
      if (b.fail) b.fail('list', prefix);
      return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) };
    },
    leads() { return [...m.entries()].filter(([k]) => k.startsWith('lead/')).map(([, v]) => JSON.parse(v)); },
    lead(id) { return m.has('lead/' + id) ? JSON.parse(m.get('lead/' + id)) : null; },
  };
  return b;
}

const kindOf = (host) => {
  if (host === 'hooks.zapier.com') return 'zapier';
  if (host === 'api.company-information.service.gov.uk') return 'ch';
  if (host === 'graph.facebook.com') return 'capi';
  if (host === 'api.resend.com') return 'resend';
  if (host === 'hooks.slack.com') return 'slack';
  if (host === 'api.clickup.com') return 'clickup';
  return 'other';
};

/** The default answer from the register: one company, matching Northbridge, active, full accounts. */
export function chResponder(profile = CH_PROFILE) {
  return (call) => {
    const u = new URL(call.url);
    if (u.pathname === '/search/companies') {
      return ok({ items: [{ title: profile.company_name, company_number: profile.company_number, company_status: profile.company_status }] });
    }
    return ok(profile);
  };
}

/**
 * A handler wired to fakes. over.responders replaces the answer for one service
 * (zapier, ch, capi, resend, slack); over.env adds or overrides settings; over.live sets
 * the funnel's live flag (default true here; the shipped config is false).
 */
export function rig(over = {}) {
  const calls = [];
  const logs = [];
  const blobs = over.blobs || fakeBlobs();
  const responders = Object.assign({
    zapier: () => ok('{"status":"success"}'),
    ch: chResponder(),
    capi: () => ok({ events_received: 1 }),
    resend: () => ok({ id: 'm1' }),
    slack: () => ok('ok'),
  }, over.responders || {});

  const fetch = async (url, init = {}) => {
    const u = new URL(url);
    let body = null;
    if (init.body) { try { body = JSON.parse(init.body); } catch (e) { body = init.body; } }
    const call = { url: String(url), host: u.host, kind: kindOf(u.host), method: init.method || 'GET', headers: init.headers || {}, body, init };
    calls.push(call);
    const fn = responders[call.kind];
    if (!fn) throw new Error('unexpected request to ' + u.host);
    return fn(call);
  };

  const env = Object.assign({
    ZAPIER_LEAD_HOOK: HOOK,
    COMPANIES_HOUSE_API_KEY: 'ch-test-key',
    META_CAPI_TOKEN: 'capi-test-token',
    META_PIXEL_ID: cfg.funnel.pixelId,
    RESEND_API_KEY: 'resend-test-key',
    ALERT_EMAIL_FROM: 'alerts@example.test',
    SLACK_ALERT_WEBHOOK_URL: 'https://hooks.slack.com/services/T0/B0/xyz',
  }, over.env || {});
  for (const k of Object.keys(env)) if (env[k] === undefined) delete env[k];

  // The rig is a consistent deployment: the notice says the register is checked exactly when a key is set
  // (the daily check reports the two disagreeing, and its tests set that up on purpose).
  const base = realCampaigns[cfg.campaign];
  const campaigns = {
    [cfg.campaign]: Object.assign({}, base, {
      cfg: Object.assign({}, base.cfg, { live: over.live !== false, legal: { registerCheck: over.registerCheck !== undefined ? over.registerCheck : Boolean(env.COMPANIES_HOUSE_API_KEY) } }),
    }),
  };

  let clock = NOW.getTime();
  const handler = createHandler({
    campaigns,
    env: () => env,
    fetch,
    now: over.now || (() => new Date(clock)),
    uuid: over.uuid || (() => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'),
    sleep: async () => {},
    log: (o) => logs.push(o),
    store: over.store || (() => createStore({ blobs })),
  });
  return {
    handler, calls, logs, blobs, env, campaigns,
    of: (kind) => calls.filter((c) => c.kind === kind),
    tick: (ms) => { clock += ms; },
  };
}

/** A POST like the page's script sends it (JSON) or like a browser sends a plain form. */
export function post(fields, { asJson = true, accept, headers = {}, ip = '203.0.113.7', type, url = 'https://getelevateleads.com/api/lead' } = {}) {
  const f = Object.assign({}, fields);
  for (const k of Object.keys(f)) if (f[k] === undefined) delete f[k];
  const isJson = asJson !== false;
  const h = Object.assign({
    'Content-Type': type || (isJson ? 'application/json' : 'application/x-www-form-urlencoded'),
    Accept: accept || (isJson ? 'application/json' : 'text/html'),
    'user-agent': 'node-test/1.0',
  }, headers);
  if (ip !== null) h['x-nf-client-connection-ip'] = ip;   // ip: null sends no address header at all
  return new Request(url, {
    method: 'POST',
    headers: h,
    body: isJson ? JSON.stringify(f) : new URLSearchParams(f).toString(),
  });
}

export const bodyOf = async (res) => JSON.parse(await res.text());
export const visible = (html) => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ');
