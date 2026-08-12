# Client GEO-audit reports

One URL per client, sent as a link instead of a PDF or PowerPoint attachment.
Live at `https://getelevateleads.com/report/<slug>/`.

## Publishing a new audit

No code changes needed.

1. **Pick a slug with a random suffix.** The suffix stops anyone guessing
   `/report/a-competitor/` and reading another client's report. Generate one:

   ```bash
   node -e "const c='abcdefghijkmnpqrstuvwxyz23456789';let s='';for(const b of require('crypto').randomBytes(6))s+=c[b%c.length];console.log(s)"
   ```

   Slug format: `<company-slug>-<suffix>`, e.g. `mollis-group-k7f3q`. The build
   fails if the suffix is shorter than 5 characters.

2. **Copy an existing JSON** as a starting point:
   `cp smcps-consulting-vd93js.json mollis-group-k7f3q.json`
   The filename must match the `slug` field exactly.

3. **Drop the screenshots** in `audits/<slug>/`, filenames matching the
   `screenshots[].file` values. JPG, PNG or WebP. Export at roughly 1400 px wide:
   they are the evidence, so legibility matters more than a few kB. Any file that
   is missing renders a visible "screenshot pending" placeholder and prints a
   build warning rather than failing the build.

4. **Build and check locally:** `npm run build`, then open
   `dist/report/<slug>/index.html`.

5. Commit, push, merge. Netlify regenerates on deploy (`prebuild`).

## Required sections

`company`, `slug`, `date`, `lede`, `headline`, `visibility`, `queries`,
`accuracy`, `gaps`, `fixes`, `method`, `cta`. `screenshots` and `signature` are
optional. A missing required section fails the build with a named error rather
than shipping half a report.

Useful optional fields:

| Field | Effect |
|---|---|
| `headline.stat` as `"N of M"` | Renders M indicator dots, first N green, rest red |
| `visibility.rival_count` | Renders the dark tally card with a count-up animation |
| `accuracy.flag_quote_index` | Marks that quote "Worth watching" with a warm highlight |
| `queries[].named_instead` | Array of competitor names, rendered as chips |
| `queries[].named_instead_note` | Trailing note after the chips, e.g. "topped the list" |
| `queries[].named: true` | Green "Named" card instead of red "Not named" |

## These reports must never be indexed

They name a specific client's weaknesses. Publishing one to the open web would
be damaging for them and worse for us. Five independent layers, none of which
should be removed:

1. `<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">` in the page.
2. `X-Robots-Tag` on `/report/*` in `netlify.toml` — works even if the markup changes.
3. No index page. Bare `/report` and unknown slugs return HTTP 404.
4. No links from navigation, sitemap or any other page. Direct link only.
5. `<meta name="referrer" content="no-referrer">` so the URL does not leak
   through outbound clicks.

**Do not add `Disallow: /report/` to robots.txt.** `Disallow` blocks crawling,
not indexing: a crawler that cannot fetch the page never reads the `noindex`, so
the URL can still be indexed as a bare link if it surfaces anywhere. `robots.txt`
is also public, which would advertise that a hidden section exists.

## Design notes

Deliberately a standalone static page rather than a React route: the app is
client-rendered, so a route there would serve an empty page to anything that
does not run JavaScript, and would not print cleanly. These pages carry no
external font or script requests, read fine with JavaScript off, and `Ctrl+P`
gives a clean PDF (animations off, CTA button hidden, no cards split across
pages). Animations are progressive enhancement only and respect
`prefers-reduced-motion`.
