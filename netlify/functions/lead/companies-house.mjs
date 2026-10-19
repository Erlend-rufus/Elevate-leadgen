/**
 * Companies House lookup. The form asks for a company name and website, not a company
 * number, so the number is found by searching the register for the name and keeping only
 * an exact match once case, punctuation and the words "limited" and "the" are ignored.
 * Anything looser would attach one firm's accounts to another firm's lead.
 *
 * This file only fetches and matches. What the profile means for the answers is decided
 * in g/uk-it-growth/route.mjs (assessProfile), so the rules can be tested without a network.
 *
 * Authentication is HTTP Basic with the API key as the user name and an empty password.
 * Free; 600 requests per five minutes per key.
 */
const BASE = 'https://api.company-information.service.gov.uk';

/** A name reduced to what identifies it. */
export function normaliseName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !['the', 'limited', 'ltd', 'plc', 'llp'].includes(w))
    .join(' ');
}

/**
 * Returns {status: 'found', profile} | {status: 'not_found'} | {status: 'error', reason}.
 * profile: {number, name, status, created, accounts_type}.
 * timeoutMs covers the search and the profile request together.
 */
export async function lookup({ name, key, fetch: doFetch = globalThis.fetch, timeoutMs = 4000 }) {
  const wanted = normaliseName(name);
  if (!wanted) return { status: 'not_found' };
  if (!key) return { status: 'error', reason: 'no_key' };

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  const headers = { Authorization: 'Basic ' + Buffer.from(key + ':').toString('base64'), Accept: 'application/json' };
  try {
    const sres = await doFetch(`${BASE}/search/companies?q=${encodeURIComponent(String(name).slice(0, 160))}&items_per_page=20`, { headers, signal: ctl.signal });
    if (!sres.ok) return { status: 'error', reason: 'search_' + sres.status };
    const found = await sres.json();
    const hits = (found.items || []).filter((i) => normaliseName(i.title) === wanted);
    if (!hits.length) return { status: 'not_found' };
    const pick = hits.find((i) => i.company_status === 'active') || hits[0];

    const pres = await doFetch(`${BASE}/company/${encodeURIComponent(pick.company_number)}`, { headers, signal: ctl.signal });
    if (!pres.ok) return { status: 'error', reason: 'profile_' + pres.status };
    const p = await pres.json();
    const last = (p.accounts && p.accounts.last_accounts) || {};
    return {
      status: 'found',
      profile: {
        number: String(p.company_number || pick.company_number),
        name: String(p.company_name || pick.title || ''),
        status: String(p.company_status || ''),
        created: String(p.date_of_creation || ''),
        accounts_type: last.type && last.type !== 'null' ? String(last.type) : '',
      },
    };
  } catch (err) {
    return { status: 'error', reason: err && err.name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}
