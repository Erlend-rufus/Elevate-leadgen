# Launch notes · /g/uk-ai-visibility

The AI visibility retainer for UK companies with £1m or more in turnover, any sector: GEO (content, technical
fixes and third-party mentions so that ChatGPT, Gemini, Perplexity, Copilot and Google's AI answers name the
company) and ChatGPT ads. Built 6 Nov 2026 on the framework of `/g/uk-it-growth` (read `g/uk-it-growth/LAUNCH.md`
first: the endpoint, storage, delivery, alerts, Meta and the daily check are the same code). This file says what is
different.

```
npm run build          # or: node scripts/build-g-growth.mjs
npm run test:g-growth  # g/uk-ai-visibility/test/funnel.test.mjs is in it
```

## 1. The offer (owner, 6 Nov 2026)

- From £1,500 a month, with £500 of ChatGPT ad spend included. A larger scope is priced on the call.
- Month to month from the start, 30 days' notice. A named contact (Sondre). A status report every month.
- No guarantee of any kind. The owner dropped the first idea (traffic and rankings on 10 keywords in 3 months or the
  money back) on 6 Nov 2026 because a position in an AI answer cannot be measured the same way twice.
- **A retainer, never commission.** Nothing on these pages may describe commission; the page test checks every page.
  Zap 1 marks every lead of this campaign `[RETAINER]` (task name prefix, tag `retainer`, a block first in the
  description, line 2 of every Slack post).
- Capacity: the owner delivers, about 10 hours a client a month; realistic ceiling about 5 clients until the work is
  systematised.

## 2. What is different from the other funnels

| | |
|---|---|
| Form | 9 steps: website, name, sector (sent as `specialism`), turnover, people, marketing spend, decider, "Which questions do your best clients ask before they buy?" (sent as `meeting_goal`), details. Every answer is an existing payload key: the Zapier contract did not change. |
| Routing | not a fit: under £1m. review: turnover not stated, unless 50+ people and £3,000+ a month on marketing (`turnover_inferred`). fit: the rest. Never `not_now`. Flags, never refusals: `legal_no_chatgpt_ads` (OpenAI takes no ads for legal services), `health_ads_check` (some health ads only). |
| Register | off, as the law funnel. |
| ClickUp | `AI VISIBILITY - UK - Retainer` (1201270000005380), CRM folder, statuses of the health and law lists, the shared fields. Tags `ai-visibility` and `retainer`. |
| Calendly | `https://calendly.com/sh-elevatemarketing/elevate-marketing-ai-visibility-30-minute-review`, event type `2b6f4168-ecb4-45a4-b565-aadb51fe96ce`, owned by Sondre. He is the host of every meeting and takes first meetings alone (owner's rule, 8 Nov 2026: Sondre hosts for the UK and the rest of the world except Italy, where Aurora does). The first event, `f1f1d78a-9b14-435d-8de6-3472da1df542` on the organisation account, was replaced on 8 Nov 2026. It stays in Zap 2's `eventTypes` so that a cancellation or a reschedule of a booking made on it (one, Wed 11 Nov 2026 at 10:00 Oslo time) still finds its lead; it can come out once that meeting is over. |
| Case | C-Medical, named with its written consent. AI assistant bookings by month from GA4 `booking_completed` (all AI sources, paid and unpaid together: the ChatGPT ads had no utm tags before 6 Nov 2026, so ad clicks are likely inside the count). ChatGPT ads figures are the owner's, from OpenAI's ads manager. The two are shown side by side and never added. |
| Ads | Meta, `LEADS / UK / AI_VISIBILITY`, NOK 715 a day for 7 days (NOK 5,000), created paused. Success after one week: 2 booked meetings with companies that fit; a signed client is judged after 30 days. |

## 3. Before the next update of the figures

- Tag the C-Medical ChatGPT ads with `utm_source=chatgpt_ads`, so paid and unpaid can be told apart.
- The Search Atlas LLM Visibility project `cmedical.no` exists but tracks nothing: the plan has two tracked slots,
  both in use. The owner buys a third (6 Nov 2026); then add the topics and queries.
- Reddit and other community posts for UK clients must say who is posting (Reddit's rules, and hidden advertising
  under the DMCC Act 2024). Nothing about them goes on the page.

## A/B test: ten to one (from 8 Nov 2026)

Variant b shows the module "Search shows ten results. AI gives one answer." after "Why now"; variant a is the page as before. Settings in `config.json` "ab", copy in `copy.json` "tenone", styles in `@section tenone` of `g/_growth/style.css`, events in `g/_growth/js/ab.js`.

- 50/50 per visit, drawn in the head, kept in sessionStorage for the session. No script: variant a.
- `?ab=a` or `?ab=b` forces a variant for checking. Forced views are sent with `forced: 1`; leave them out when reading.
- Meta custom events, after Accept only: `AbView`, `AbFormReach`, `AbFormStart`, `AbQualified`, each with `test` and `variant`.
- Main measure: `AbFormStart` per `AbView`, by variant. Guard: `AbQualified` per `AbView` must not fall in b.
- Decide on a number of views fixed beforehand, not when the figures look good. End the test by removing "ab" and either the module or the `data-ab-only` gate.
