# Spec drafts (`drafts/<dir>/spec.json`)

A spec draft is a homepage draft for a prospect that `scripts/build-drafts.mjs` renders
from JSON with `scripts/lib/draft-page.mjs`, instead of from an HTML export. It exists so
that an unattended run (the `forsideutkast` scheduled task, recipe in the project doc
`claude/forsideutkast/OPPSKRIFT.md`) can produce a draft without the Claude Design canvas.
The page follows one of three styles derived from the Elevate Marketing design system
and from what the best sites in each sector share (research 28 Oct 2026: one dramatic
element per page, credibility above the fold, real people, a frictionless path to
contact). The colours, logo and photographs come from the prospect's current site.

| `style` | For | Type and feel |
| --- | --- | --- |
| `editorial` | law, finance, consultancy, default | Fraunces display on paper, hairline service rows, floating figure on the photograph |
| `technical` | IT, MSP, software | Montserrat display, deep hero band in the brand colour, bordered cards |
| `clinical` | health | Geist display, soft tint from the brand colour, rounded cards |

`style` is picked from `industry` when absent (health → clinical, IT → technical,
otherwise editorial).

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
| `industry` | no | Free text, e.g. `law`, `it`, `health`, `finance`. Picks the style. |
| `style` | no | `editorial`, `technical` or `clinical`. Overrides `industry`. |
| `images` | no | `{ "hero": {...}, "proof": {...}, "about": {...} }`, each `{ "file", "alt", "position" }`. Files sit next to spec.json, max 400 KB each (resize to 1600 px, jpg quality 80). Only photographs taken from the prospect's own site; never stock found elsewhere, never AI imagery. Skip the gavel, the handshake and the stethoscope: the sector research says clichés cost trust. With `hero` the page gets the photograph hero with the `hero.stat` or `hero.quote` floating on it; without it the typographic hero. `proof` adds an image tile to the figures; `about` a portrait next to the about text. |
| `trust` | no | Up to 4 accreditation marks `{ "file", "alt" }` or `{ "text" }` shown in a strip under the hero (regulator, professional body, certification). Only marks the prospect shows on their own site. |
| `trustLabel`, `trustText` | no | Label before the marks ("Regulated by") and a short line after them. |
| `site` | yes | The prospect's current site (informational, shown in the build log). |
| `lang` | no | Default `en-GB`. |
| `logo` | no | `{ "file": "logo.png", "height": 44 }`. File sits next to spec.json (svg/png/jpg/webp), copied to the draft folder. Without it a text wordmark is rendered. |
| `palette` | yes | `{ "theme": "light" or "dark", "primary": "#hex", "secondary": "#hex" }`. Primary is the CTA colour; the renderer derives accent shades that pass contrast on the page and on the deep band. |
| `nav` | yes | 2 to 5 `{ "label", "href" }`. Hash links to section ids or absolute links to the prospect's own site. |
| `cta` | yes | Header button label. |
| `hero` | yes | `eyebrow`, `title`, `sub`, `cta`, `ctaHref`, optional `secondary`/`secondaryHref`, optional `note`, and either `stat` (`{ value, label }`) or `quote` (`{ text, who }`). |
| `stats` | no | Up to 3 `{ value, label }`. Only figures that are on the prospect's site. Rendered with `why.quote` and `images.proof` as a bento grid under the hero. |
| `services` | yes | `id`, `eyebrow`, `title`, `lead`, 3 `items` (`{ title, text, image? }`; editorial allows 4). |
| `why` | yes | `id`, `eyebrow`, `title`, 3 `items` (`{ title, text }`), optional `quote` (`{ text, who }`, shown in the proof grid). |
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
6. `[[TO CONFIRM]]` without a reason is allowed but renders as a bare "to confirm"; give the
   reason.
5. British spelling, no hype, no emoji.

## Guarantees enforced by the build

`noindex,nofollow,noarchive,nosnippet`, `no-referrer`, title starting with "Draft", the
`.dc-banner`, no `<script>`, no external requests (fonts are self-hosted under `/nevari/fonts/`
and `/g/_assets/fonts/`, every image is copied next to the page).
`netlify.toml` adds `X-Robots-Tag` on `/draft/*` and a 404 on the bare `/draft` path. Drafts
are never linked from the site and never listed in the sitemap.
