# Launch notes · /g/uk-geo

GEO alone on a fixed monthly price, for UK companies with £1m or more in turnover, any sector: content, technical
fixes and third-party mentions so that ChatGPT, Gemini and Google's AI Mode name the company, with the same 25
questions measured every month. No ChatGPT ads. Built 28 Nov 2026 as a copy of `/g/uk-ai-visibility`, which sells
GEO together with ChatGPT ads and is a different page with a different price. Read `g/uk-it-growth/LAUNCH.md`
first: the endpoint, storage, delivery, alerts, Meta and the daily check are the same code.

```
npm run build          # or: node scripts/build-g-growth.mjs
npm run test:g-growth  # g/uk-geo/test/funnel.test.mjs is in it
```

## 1. The offer (owner, 28 Nov 2026)

- From £1,000 a month, excluding VAT. A larger scope is priced on the call.
- Month to month from the start, 30 days' notice. A named contact (Sondre). A status report every month.
- No guarantee of any kind, and no ChatGPT ads in the package.
- **A fixed fee, never commission.** Nothing on these pages may describe commission; the page test checks it.

## 2. What is different from /g/uk-ai-visibility

| | |
|---|---|
| Price | From £1,000 a month. The other page: from £1,500 with £500 of ChatGPT ad spend. |
| Form | The same nine steps and the same payload keys. |
| Routing | The same, without the two flags about ChatGPT ads (`legal_no_chatgpt_ads`, `health_ads_check`). |
| ClickUp | The same list, `AI VISIBILITY - UK - Retainer` (1201270000005380). Tags `geo-alone` and `retainer`, never `ai-visibility`. Zap 1 writes "SELG: KUN GEO" first in the task block and on line 2 of the Slack post; leads from the other page get "SELG: GEO + CHATGPT-ANNONSER". |
| Calendly | The same event as the other page (`2b6f4168-ecb4-45a4-b565-aadb51fe96ce`, owned by Sondre). An own event could not be made under his user through the API. Zap 2 is not changed: it reads a booking from this page as `uk-ai-visibility` and finds the task by `lead_id` in the shared list. Zap 2 posts nothing to Slack. The task keeps its `geo-alone` tag. A booking made without a lead id (somebody opens the Calendly link directly) gets a task without that tag. |
| Test | No A/B test and no ten to one module. |
| Case | A Norwegian private clinic group, not named (owner's rule of 27 Nov 2026). Bookings from AI assistants are GA4 `booking_completed`, Norwegian pages, all AI sources: 35 from Sept to 27 Nov 2026 against 3 in Sept to Nov 2025. The 20 question table is Search Atlas analysis `ff77201a-04b2-4fc9-a931-9068a0d96863`, one run on 28 Nov 2026: named in 42 of 58 answers. There is no earlier run, so the page never says how far the share has moved. The page says that a new website went live in August 2026 and that its effect cannot be separated from the rest. Never write "from nothing": AI assistants sent 83 visits to Norwegian topic pages in Feb to Nov 2025. No ChatGPT ad figure may stand on this page. |

## 3. Launch (done 28 Nov 2026)

1. Zap 1 published with the `uk-geo` entry: version `01a222a6-b255-7007-b866-cd2eafaefc9d`, see
   `g/_growth/zapier/README.md`. The tag `geo-alone` was made by the first task.
2. Two draft runs with made-up leads (`@example.invalid`), one per page: both made a `[RETAINER]` task in the shared
   list with the right tag and the right "SELG" line. Both tasks were set to `ukvalifisert - archive`.
3. `"live": true`.
4. Ads: none exist for this page yet. Angles and stop rules are in the project doc
   `claude/plan-geo-fastpris-2026-11-28.md`.

## 4. Before the next update of the figures

- November 2026 is counted to the 27th. When the month is over, update 35 and the three places it stands
  (hero, panel, strip), and the dates beside it.
- Run the same 20 questions again before quoting a change in the 72%. Say what was measured and when.
- Stop rule for ads to this page: no signed client after 10 meetings held, counting those of the first round on
  the other page, means the offer or the meeting is the problem. Stop the ads then, do not only change the creatives.
- Reddit and other community posts for UK clients must say who is posting (Reddit's rules, and hidden advertising
  under the DMCC Act 2024). Nothing about them goes on the page.
