# Brief: deliver a GEO audit by pushing to a branch

For whoever assembles a client GEO audit (Claude co-work or another agent).
Deliver by pushing to a branch in this repo. Files never travel through chat.

**Repo:** `erlend-elevate/Elevate-leadgen`
**You need:** a fine-grained token for this repo only, `Contents: read/write`.
That is enough to push a branch. You do not need `Pull requests: write`: Claude
Code opens the PR, runs QA and publishes. Do not request wider scopes.

**Never push to `main`.** One audit per branch, branched from latest `main`:

```
cowork/audit-<slug>
```

**Touch nothing outside `audits/`.** Not `scripts/`, not `netlify.toml`, not
`public/`, not other clients' audit files. Publishing, routing, design, HTML and
the no-index protections are already built and verified. Changing them breaks
guarantees you cannot see from your side.

---

## 1. What you deliver

Exactly two things:

```
audits/<slug>.json          the whole audit as data
audits/<slug>/              the screenshot files
  S1-<something>.jpg
  S2-<something>.jpg
  ...
```

That is the entire deliverable. A page appears at
`https://getelevateleads.com/report/<slug>/` after review. No HTML, no CSS, no
templates. Write data only.

## 2. The slug

Format: `<company-slug>-<random suffix>`, e.g. `mollis-group-q4h7n`.

The random suffix is a security control, not decoration: without it anyone could
guess `/report/a-competitor/` and read another client's report. Minimum five
characters; the build rejects anything shorter. Generate one:

```bash
node -e "const c='abcdefghijkmnpqrstuvwxyz23456789';let s='';for(const b of require('crypto').randomBytes(6))s+=c[b%c.length];console.log(s)"
```

The JSON filename must equal the `slug` field exactly. The build checks this.

## 3. Screenshots, and why they matter most

Screenshots are the entire credibility of the product. The page says
*"Screenshots of every answer quoted"* and *"nothing in this report is
paraphrased from memory"*. Both must be literally true.

- **Real image files in `audits/<slug>/`.** JPG, PNG or WebP. Not base64 inline,
  not a Drive link, not a path into your own sandbox. Committed to the branch.
- **`screenshots[].file` is a bare filename.** `"S1-construction.jpg"`, never
  `/home/claude/…/S1-construction.jpg`. Only the basename is used, so a path
  will work, but write it clean.
- **About 1400 px wide or more.** They get downscaled on display, so extra
  resolution costs nothing, and illegible evidence is worthless.
- **Capture the whole answer, not just the viewport.** If the report quotes a
  sentence, that sentence must be visible in the image. A real example: an
  earlier report quoted a warning that sat below the fold in the capture, so the
  answer was documented but that specific quote was not.
- **One screenshot per query**, plus the brand test. Caption each one.
- **Check every image against its own caption before you commit.** Two audits
  once arrived with one client's screenshots labelled as another's. Caught before
  publishing, but it would have made a client document false.

## 4. The JSON

Required. The build fails with a named error if any is missing: `company`,
`slug`, `date`, `lede`, `headline`, `visibility`, `queries`, `accuracy`, `gaps`,
`fixes`, `method`.

Optional: `screenshots`, `cta`, `signature`, `how_it_works`, `pricing`.

Skeleton:

```json
{
  "company": "Example Ltd",
  "slug": "example-ltd-k7f3q",
  "date": "13 August 2026",
  "lede": "One sentence on what this audit answers.",

  "headline": {
    "stat": "0 of 3",
    "stat_label": "category questions named Example Ltd",
    "body": "A paragraph stating the main finding."
  },

  "visibility": {
    "title": "Who was named instead",
    "sub": "What we asked and why.",
    "close": "A closing observation.",
    "rival_count": "9",
    "rival_count_label": "rival firms named instead of you"
  },

  "queries": [
    {
      "text": "The question, word for word as it was asked.",
      "named": false,
      "named_instead": ["Firm A", "Firm B"],
      "named_instead_note": "topped the list"
    },
    { "text": "Is Example Ltd (example.co.uk) a good …?", "named": true }
  ],

  "accuracy": {
    "title": "…",
    "sub": "…",
    "quotes": ["Verbatim sentence from the AI answer."],
    "flag_quote_index": 2,
    "source": "Google AI Mode, brand test, 13 August 2026. Verbatim.",
    "body": ["Paragraph.", "Paragraph."]
  },

  "gaps": {
    "title": "…",
    "sub": "…",
    "items": [{ "title": "…", "body": "…" }],
    "already_works": "What genuinely works today."
  },

  "fixes": {
    "title": "…",
    "sub": "…",
    "items": [{ "title": "…", "how": "…", "effect": "…" }],
    "disclaimer": "No promises about rankings, mentions or timelines."
  },

  "screenshots": [{ "file": "S1-something.jpg", "caption": "…" }],

  "method": ["How this was measured.", "Caveats."]
}
```

What the optional fields do:

| Field | Effect on the page |
|---|---|
| `headline.stat` as `"N of M"` | M indicator dots, first N green, rest red |
| `visibility.rival_count` | Dark tally card, counts up. Use the same figure the `close` text states |
| `queries[].named_instead` | Competitor chips. Array or comma-separated string both work |
| `queries[].named: true` | Green "Named" card instead of red "Not named" |
| `accuracy.flag_quote_index` | Marks that quote "Worth watching" with a warm highlight |
| `how_it_works` | Four-step explainer flow. Generic and shared. Leave it out and it is copied from the previous report |
| `pricing` | Closing price cards. **Leave it out unless Erlend has said prices go on this report.** Sometimes price is discussed in the meeting instead |
| `cta` | Booking block plus signature. Leave it out for a report presented live in a meeting, where a booking CTA is redundant |

Section numbers are assigned automatically in render order. Omitting an optional
section renumbers the rest rather than leaving a gap, so never hard-code numbers
in your own prose: write "the fixes above", not "section 04".

## 5. Content rules

1. **Never invent a finding, a figure, a quote or a client.** Every number and
   every quotation must be verifiable in one of the screenshots you supply.
2. **Quote verbatim.** Do not tidy, shorten or correct AI answers, including
   their American spellings. They are evidence.
3. **Verify company facts against primary sources, not against AI answers.**
   Companies House for the register, the live website for what the site says.
   State in `method` which you checked and when.
4. **No promises** about rankings, mentions, traffic or timelines.
5. **British English** in your own prose. Quotes stay as captured.
6. **No exclamation marks. No em-dashes.** Site-wide convention: use commas,
   colons or parentheses. No hype words: skyrocket, game-changer, supercharge,
   unlock, revolutionise, dominate.
7. **Hedge what you cannot know.** If the website and LinkedIn disagree, report
   the disagreement; do not rule on which is correct. Findings about a named
   client's weaknesses have to survive that client reading them closely.
8. **Say what already works.** `gaps.already_works` is not a courtesy. A report
   that only lists failures reads as a sales document.

## 6. After you push

Say which branch you pushed. Claude Code then:

1. Reviews the data against these rules and opens each screenshot against its
   caption.
2. Builds and verifies the page: content present without JavaScript, all
   screenshots rendering, no placeholders, clean print, no horizontal overflow at
   375 px, and the no-index protections intact.
3. Opens a PR, and publishes once Erlend approves.

Expect to be sent back a specific list if anything fails. The most common causes
are missing screenshot files, a quoted sentence not visible in its capture, and
a figure with no evidence behind it.

## 7. These pages must never be indexed

You do not need to implement any of it, since it is already built and verified, but
know why the constraints exist, and do not work against them:

robots meta in the page, `X-Robots-Tag` on the route, no index page, no links
from anywhere on the site, no sitemap entry, `no-referrer`, and the random slug
suffix. There is deliberately **no** `Disallow: /report/` in `robots.txt`:
`Disallow` blocks crawling rather than indexing, so a blocked crawler never reads
the `noindex`, and `robots.txt` is public, which would advertise that a hidden
section exists.

Practical consequence for you: **never put a report URL anywhere public**: not
in a commit message body meant for release notes, not in an issue, not in
documentation. The link goes to the client and nowhere else.
