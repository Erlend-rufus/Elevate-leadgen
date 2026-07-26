/** Single source of truth for the audit Typeform. Every primary CTA links here. */
export const TYPEFORM_URL = 'https://form.typeform.com/to/Ps2ivRIT'

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
const STORE_KEY = 'elevate:utm'

/** SPA navigations drop the query string, so the landing UTMs are persisted
 *  for the session and reused by every CTA on every route. */
function utmFragment(): string {
  const params = new URLSearchParams(window.location.search)
  const fromUrl = UTM_KEYS.filter((k) => params.get(k)).map(
    (k) => `${k}=${encodeURIComponent(params.get(k) as string)}`,
  )
  try {
    if (fromUrl.length) {
      window.sessionStorage.setItem(STORE_KEY, fromUrl.join('&'))
      return fromUrl.join('&')
    }
    return window.sessionStorage.getItem(STORE_KEY) ?? ''
  } catch {
    return fromUrl.join('&')
  }
}

/**
 * Typeform reads hidden fields from the hash fragment only, so UTM parameters
 * are appended after '#', never as a query string.
 */
export function typeformUrl(): string {
  const utm = utmFragment()
  return utm ? `${TYPEFORM_URL}#${utm}` : TYPEFORM_URL
}
