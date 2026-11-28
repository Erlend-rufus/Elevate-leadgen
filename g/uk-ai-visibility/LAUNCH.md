# Launch notes · /g/uk-ai-visibility

The AI visibility retainer for UK companies with £1m or more in turnover, any sector: GEO (content, technical
fixes and third-party mentions so that ChatGPT, Gemini, Perplexity, Copilot and Google's AI answers name the
company). Built 6 Nov 2026 with ChatGPT ads in the package; since 28 Nov 2026 it is GEO alone (section 1). Built on the framework of `/g/uk-it-growth` (read `g/uk-it-growth/LAUNCH.md`
first: the endpoint, storage, delivery, alerts, Meta and the daily check are the same code). This file says what is
different.

```
npm run build          # or: node scripts/build-g-growth.mjs
npm run test:g-growth  # g/uk-ai-visibility/test/funnel.test.mjs is in it
```

## 1. The offer (owner, 6 Nov 2026; GEO alone from 28 Nov 2026)

- From £1,500 a month. A larger scope is priced on the call. Until 28 Nov 2026 the price included £500 of ChatGPT
  ad spend and the running of the ads. They came out when OpenAI's ads manager (one account, one campaign, started
  21 Oct 2026) showed no impressions, clicks, spend or payments, so there was nothing to show for them. The price
  itself was not changed in that rewrite: the owner sets a new one if he wants one.
- The measurement covers ChatGPT, Gemini and Google's AI Mode, the three the tool we use (Search Atlas) can ask.
  The page no longer names Perplexity or Copilot.
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
| Case | A Norwegian private clinic group, not named (owner's rule of 27 Nov 2026: every client is anonymous in marketing). Bookings from AI assistants are GA4 `booking_completed`, Norwegian pages, all AI sources: 35 from Sept to 27 Nov 2026 against 3 in Sept to Nov 2025. The 20 question table is Search Atlas analysis `ff77201a-04b2-4fc9-a931-9068a0d96863`, one run on 28 Nov 2026: named in 42 of 58 answers. There is no earlier run, so the page never says how far the share has moved. The page says that a new website went live in August 2026 and that its effect cannot be separated from the rest. Never write "from nothing": AI assistants sent 83 visits to Norwegian topic pages in Feb to Nov 2025. |
| Ads | Meta, `LEADS / UK / AI_VISIBILITY`, NOK 715 a day for 7 days (NOK 5,000), created paused. Success after one week: 2 booked meetings with companies that fit; a signed client is judged after 30 days. |

## 3. Before the next update of the figures

- November 2026 is counted to the 27th. When the month is over, update 35 and the three places it stands
  (hero, panel, strip), and the dates beside it.
- Run the same 20 questions again before quoting a change in the 72%. One run against one run is still thin:
  say what was measured and when.
- The Search Atlas LLM Visibility project `cmedical.no` exists but tracks nothing, and its prompts are English.
  Both tracked slots are in use. When one is free, track the 20 Norwegian questions so that there is a series.
- If ChatGPT ads are ever run for a client, tag them `utm_source=chatgpt&utm_medium=cpc` from the first click.
  The figures on the page before 28 Nov 2026 (£67 a booking, 420 clicks, £799) could not be traced to the ads
  manager and must not come back without a source.
- Stop rule for the ads to this page (28 Nov 2026): no signed client after 10 meetings held, counting those of the
  first round, means the offer or the meeting is the problem. Stop the ads then, do not only change the creatives.
- The routing flags `legal_no_chatgpt_ads` and `health_ads_check` are still sent. They no longer mean anything
  for the offer, and are left in because the Zap and the tests read them.
- Reddit and other community posts for UK clients must say who is posting (Reddit's rules, and hidden advertising
  under the DMCC Act 2024). Nothing about them goes on the page.
