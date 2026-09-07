# Green funnel: Typeform and Calendly colours

The commission funnel (`/lp` → `/takk.html`) and the GEO funnel (`/geo-audit/*`)
run on a green accent, not the site's cyan gradient. Two of the things a visitor
sees on those pages are rendered by someone else and cannot be styled with our
CSS: the embedded Typeform, and the embedded Calendly. Both ship blue by
default, which is the mismatch this file fixes.

Calendly is set in the markup and is already done. Typeform is set in the
Typeform admin UI and has to be typed in by hand, which is why the values are
written down here rather than only in a commit message.

## The palette these values come from

From `public/css/styles.css` (commission funnel) and `public/css/geo.css`:

| Token | Hex | Where it is used |
| --- | --- | --- |
| `--green` | `#00D47E` | Eyebrows, bullet dots, tick marks, primary button fill |
| `--green-hover` | `#00E88A` | Button hover |
| `--bg` | `#0A0F2E` | Page ground (`/lp`) |
| `--card` | `#141833` | The box the Typeform sits in on `/lp` |
| `--surface` | `#0B0B2E` | The box the Typeform sits in on `/uk-recruitment` |
| `--white` | `#FFFFFF` | Body text |
| `--grey` | `#9CA3BF` | Muted text |

The green is a fill colour, never a text colour on white, and the page already
treats it that way: `.btn-g` is `background: var(--green); color: #000`. Dark
ink on bright green, not white on bright green. That single rule is what makes
the rest of this file make sense.

## Contrast, measured

WCAG 2.1 ratios, computed from the hex values above.

| Foreground | Background | Ratio | AA normal text |
| --- | --- | --- | --- |
| `#FFFFFF` | `#00D47E` | 1.96:1 | fails |
| `#04241A` | `#00D47E` | 8.42:1 | passes |
| `#0A0F2E` | `#00D47E` | 9.59:1 | passes |
| `#00D47E` | `#0A0F2E` | 9.59:1 | passes |
| `#00D47E` | `#141833` | 8.87:1 | passes |
| `#FFFFFF` | `#141833` | 17.4:1 | passes |
| `#9CA3BF` | `#141833` | 6.96:1 | passes |
| `#FFFFFF` | `#007F4C` | 5.07:1 | passes |

`#00D47E` is a light colour. It works as a background under dark ink and as
text on the dark navy. It does not work under white text, and that constraint
decides the Calendly value below.

## Typeform

Form `OtjHHRlg` ("IT / UK / Growwithelevate"), live id `01KN2053F8KF4QQ632YVB99B1S`,
embedded on `/lp`. Design → theme "My new theme (Copy)".

| Tab | Field | Value |
| --- | --- | --- |
| Background | Background | `#141833` |
| Font | Questions | `#FFFFFF` |
| Buttons | Buttons | `#00D47E` |
| Buttons | Button text | `#04241A` |
| Buttons | Answers | `#FFFFFF` |
| Buttons | Corner radius | the middle option |
| Logo | — | none |

Notes on the choices:

- **Background `#141833`** is the exact colour of `.tfbox`, the card the embed
  sits inside. The form then has no visible edge of its own, which is the point:
  it should read as part of the page, not as a widget dropped onto it.
- **Button text `#04241A`** rather than `#000000`. It is the `--green-ink` token
  the UK recruitment funnel already uses on green buttons, a very dark green
  instead of flat black, and it passes at 8.42:1.
- **Answers `#FFFFFF`.** Typeform derives the fill of choice blocks from this
  colour at low opacity, so white gives a neutral lift on the navy. Setting it
  to `#00D47E` also passes contrast and is a legitimate alternative if the form
  should carry more green, but it then competes with the button for attention.
- **Corner radius: middle.** Buttons on the page are 6 to 8px. The pill option
  is wrong for the page, the square option is wrong for the card it sits in.
- **No logo.** The embed is 500px tall on `/lp` and the brand is already on the
  page above it. A logo inside the frame would take a third of the first
  question.
- The blue back-arrow and the blue Submit button are both driven by the Buttons
  colour, so both are fixed by that one field.

### The second form

`/uk-recruitment` uses a different form (`01M0SDA0DGYFWWYMF3C94YM82M`) inside
`.tf-card`, which is `#0B0B2E`, not `#141833`. Duplicate the theme and change
only the background to `#0B0B2E`. Everything else on that page is the same green
on the same navy, so every other field above carries over unchanged.

## The cookie banner

`public/js/consent.js` draws the consent bar on every static page, and its
Accept button shipped the cyan brand gradient everywhere. On the green pages it
was the only blue element left once Calendly was fixed.

The button now takes its skin from a `data-accent` attribute on the script tag:

```html
<script src="/js/consent.js" data-pixel="..." data-accent="green"></script>
```

`green` is `#00D47E` fill with `#04241A` ink, 8.42:1. Anything else, including
a missing attribute, keeps the gradient with white text, so a page that never
opts in is unchanged rather than broken.

Fifteen pages opt in: `/lp` and its privacy and terms pages, `/takk.html`,
`/not-a-fit.html`, the three `/geo-audit` pages, the four `/uk-recruitment`
pages, and `/case/be-shaping`, `/case/cruxit` and `/case/ignite`. Those three
case pages are on the green palette too, less obviously: they pull
`css/styles.css` through `case-study.css` and their CTA is a `.btn-g` pointing
at `/lp/#form`.

Left on the gradient: `/journey` and the four `/case/what-a-client-costs` pages,
which run on the cyan brand and are correct as they are.

`/audit`, the Visibility Dossier, is neither. It has a palette of its own, teal
`#00d4aa` on `#1a1a2e` with cream text, so the gradient is wrong there but the
funnel green would be too. Left alone deliberately; it needs its own value if
anyone wants it matched.

## Calendly

Set in the markup, already applied to `public/takk.html` and
`public/geo-audit/thanks/index.html`.

| Page | Parameters |
| --- | --- |
| `/takk.html` | `background_color=141833&text_color=ffffff&primary_color=007f4c` |
| `/geo-audit/thanks` | `background_color=111d2e&text_color=f6f1e7&primary_color=007f4c` |

Hex without the `#`. The GEO page values differ because its card is
`rgba(246,241,231,.03)` over `#0A1628`, which resolves to `#111D2E`, and its
body text is cream `#F6F1E7` rather than white.

**`primary_color` is `#007F4C`, not `#00D47E`, and that is deliberate.**
Calendly draws white text on the primary colour and gives us no control over it.
White on `#00D47E` is 1.96:1. `#007F4C` is the same hue, 156 degrees, darkened
until white clears AA at 5.07:1. The button will look darker than the green on
the rest of the page. That is the trade, and it is the right way round: the
bright green stays everywhere the page owns the text colour, and only the one
element whose text colour we cannot set gets the darker shade.

The blue Calendly on the other pages (`/journey`, `/case/what-a-client-costs`,
and the React site via `site.calendlyUrl`) is correct as it is. Those run on the
cyan brand gradient, not the funnel green.

**Plan requirement.** Calendly ignores these parameters on the free plan;
colour customisation needs Standard or above. If the widget still renders white
with a blue button after this ships, that is the reason, not the markup.
