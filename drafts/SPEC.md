# Spec drafts (`drafts/<dir>/spec.json`)

A spec draft is a homepage draft for a prospect that `scripts/build-drafts.mjs` renders
from JSON with `scripts/lib/draft-page.mjs`, instead of from an HTML export. It exists so
that an unattended run (the `forsideutkast` scheduled task, recipe in the project doc
`claude/forsideutkast/OPPSKRIFT.md`) can produce a draft without the Claude Design canvas.
The layout and type follow the Elevate Marketing design system (Montserrat display,
Poppins body, hairlines, one accent, big-number motif, no imagery); the colours and logo
come from the prospect's current site.

## Entry in `drafts/drafts.json`

```json
{ "dir": "acme-ltd", "company": "Acme Ltd", "slug": "acme-ltd-k3f9q2", "spec": "spec.json", "clickup": "124hhvu5xxx" }
```

`slug` must match `^[a-z0-9-]+-[a-z0-9]{5,}$`: company slug plus a random suffix so the URL
cannot be guessed. `clickup` is the task id the draft was made for (informational).

## Fields

| Field | Required | Notes |
| --- | --- | --- |
| `company` | yes | Must equal `company` in drafts.json. Used in the banner and `<title>`. |
| `site` | yes | The prospect's current site (informational, shown in the build log). |
| `lang` | no | Default `en-GB`. |
| `logo` | no | `{ "file": "logo.png", "height": 44 }`. File sits next to spec.json (svg/png/jpg/webp), copied to the draft folder. Without it a text wordmark is rendered. |
| `palette` | yes | `{ "theme": "light" or "dark", "primary": "#hex", "secondary": "#hex" }`. Primary is the CTA colour; the renderer derives accent shades that pass contrast on the page and on the deep band. |
| `nav` | yes | 2 to 5 `{ "label", "href" }`. Hash links to section ids or absolute links to the prospect's own site. |
| `cta` | yes | Header button label. |
| `hero` | yes | `eyebrow`, `title`, `sub`, `cta`, `ctaHref`, optional `secondary`/`secondaryHref`, optional `note`, and either `stat` (`{ value, label }`) or `quote` (`{ text, who }`). |
| `stats` | no | Up to 3 `{ value, label }`. Only figures that are on the prospect's site. |
| `services` | yes | `id`, `eyebrow`, `title`, `lead`, exactly 3 `items` (`{ title, text }`). |
| `why` | yes | `id`, `eyebrow`, `title`, 3 `items` (`{ title, text }`), optional `quote`. |
| `about` | yes | `id`, `eyebrow`, `title`, 1 to 3 `paragraphs`. |
| `band` | yes | `eyebrow`, `title`, `text`, `cta`, `ctaHref`, optional `secondary`/`secondaryHref`. |
| `contact` | yes | `phone`, `email`, `address` (any may be omitted; omitted rows are not rendered). |
| `footer` | yes | `legal`, optional `note`. |

## Copy rules (the build fails on the first two)

1. No exclamation marks anywhere.
2. No `http(s)://` URL in copy other than getelevateleads.com; links belong in `href` fields.
3. Nothing stated as fact that is not on the prospect's own site. Anything uncertain is
   written as `[[TO CONFIRM: what needs checking]]`, which renders as a discreet dotted
   underline and is counted in the build log. Never invent figures, client names or quotes.
4. No commission percentage, no Elevate Marketing prices, no mention of Elevate Marketing
   outside the banner.
5. British spelling, no hype, no emoji.

## Guarantees enforced by the build

`noindex,nofollow,noarchive,nosnippet`, `no-referrer`, title starting with "Draft", the
`.dc-banner`, no `<script>`, no external requests (fonts are self-hosted at `/nevari/fonts/`).
`netlify.toml` adds `X-Robots-Tag` on `/draft/*` and a 404 on the bare `/draft` path. Drafts
are never linked from the site and never listed in the sitemap.
