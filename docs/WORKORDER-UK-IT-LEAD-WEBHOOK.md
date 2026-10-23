# Work order: where the /uk-it-firms leads go

For a Claude chat that has the Zapier, ClickUp and Netlify connectors (Cowork). Self-contained: you do not need the repo. **Do not edit the repo, commit, push, merge, or change `config.json`.** Everything below happens in Zapier, ClickUp and Netlify.

## Context

Elevate Marketing (EngeCo AS) has a landing page for UK IT services firms at `https://getelevateleads.com/uk-it-firms/`. A visitor answers 12 questions; the page's own server function (Netlify Function `uk-it-apply`, route `POST /uk-it-firms/apply`) checks the answers, decides which outcome page the visitor sees, and **posts the lead as JSON to one webhook URL**. That webhook does not exist yet. Until it does, the function answers every submission with a 503 and stores nothing, which is the intended fail-closed behaviour: a lead that is accepted and goes nowhere is the worst outcome on a paid funnel.

Your job: create the receiving side, give the function its address, and prove a test lead arrives.

## 1. The payload the function sends

`POST <webhook>` with `Content-Type: application/json`. If `UK_IT_LEAD_WEBHOOK_TOKEN` is set it also sends `Authorization: Bearer <token>`. Timeout 8 s. **Any non-2xx answer, a redirect, or a timeout makes the visitor see an error and the lead is NOT sent on**, so the receiver must answer 2xx quickly and only when it has really taken the lead.

```json
{
  "event": "uk_it_larger_firms.lead",
  "lead_id": "l_9f3c2a7e41b84d6f9a10",
  "received_at": "2026-10-14T12:00:00.000Z",
  "page_slug": "uk-it-larger-firms",
  "route": { "page": "book", "rule": null },
  "answers": {
    "website": "northbridge-it.co.uk",
    "company": "Northbridge IT",
    "area":      { "index": 1, "label": "Managed IT services", "other": "" },
    "turnover":  { "index": 2, "label": "£4m to £10m", "other": "" },
    "people":    { "index": 3, "label": "50 to 99", "other": "" },
    "marketing": { "index": 2, "label": "£5,000 to £15,000", "other": "" },
    "value":     { "index": 2, "label": "£25k to £50k", "other": "" },
    "cycle":     { "index": 1, "label": "One to three months", "other": "" },
    "target": "",
    "decider":   { "index": 0, "label": "Me", "other": "" },
    "capacity":  { "index": 1, "label": "One to three", "other": "" },
    "details": { "first": "Alex", "last": "Morgan", "title": "Managing Director", "email": "alex@northbridge-it.co.uk", "mobile": "07700 900123" }
  },
  "tracking": { "lead_id": "l_9f3c2a7e41b84d6f9a10", "utm_source": "meta", "utm_medium": "paid", "utm_campaign": "…", "utm_content": "…", "utm_term": "…", "fbclid": "…", "referrer": "https://l.facebook.com/" }
}
```

Notes the receiver must respect:

- `lead_id` is the idempotency key. A visitor who retries after an error sends the **same** `lead_id`. De-duplicate on it (find-or-update, not create) so a retry never makes two tasks.
- `route.page` is one of `book`, `review`, `not-now`, `not-a-fit`. `route.rule` names the routing rule that matched (`null` for the default `book`). Every lead is delivered, including the ones turned away: the visitor was shown a different page, the lead still arrives.
- `answers.target` is optional free text and is often `""`. `answers.area.other` holds free text only when "Other" was chosen.
- **Free text is passed on as typed.** `company`, `target`, `details.*` and `tracking.*` can begin with `=`, `+`, `-` or `@`. If any step writes to a spreadsheet (Google Sheets, Excel), prefix such values with `'` first. ClickUp task names/descriptions are fine.
- There is no rate limit or bot check in front of the endpoint beyond a hidden honeypot field. Put a safety net on the Zapier side (a task-usage alert, or a filter on obviously empty or repeated `lead_id`s) so a script cannot burn the plan.

## 2. What to build

1. **A Zapier workflow** triggered by "Webhooks by Zapier: Catch Hook" (it must answer 200 immediately), which:
   - finds a ClickUp task by `lead_id` (stored in a custom field or the task name) and updates it, otherwise creates one;
   - **asks Erlend which ClickUp Space/Folder/List the leads go in before creating anything.** Do not guess; if a list for "UK IT" or "commission" leads already exists, propose it and wait for a yes.
2. **Task shape (propose, confirm with Erlend):**
   - Name: `{company} · {details.first} {details.last} · {route.page}`
   - Description: every answer as `label: value`, then the tracking block (UTMs, fbclid, referrer, `lead_id`, `received_at`).
   - Custom fields if the list has them: email, mobile, website, turnover label, route page, route rule, `lead_id`, utm_campaign.
   - Status by `route.page`: `book` → "Booking offered" (the visitor is on the Calendly page, a booking may follow); `review` → "To review"; `not-now` → "Not now"; `not-a-fit` → "Not a fit".
   - **`review` has a promise attached:** the page tells the visitor "We will be in touch within one working day." Create those with a due date of the next working day and an assignee Erlend names, and notify that person. This is the one place the funnel promises something a person must do.
   - `not-now`: the page says "we will ask again in three months". Set a reminder or due date three months out if Erlend wants it.
3. **Give the function its address.** In Netlify, for the site that serves `getelevateleads.com`: Site configuration → Environment variables → add `UK_IT_LEAD_WEBHOOK_URL` = the Catch Hook URL (must start with `https://`), **scope: Functions** (also fine on all scopes), marked secret if the UI offers it. Optionally add `UK_IT_LEAD_WEBHOOK_TOKEN`; a Zapier Catch Hook does not check a bearer token, so skip it unless the receiver is changed to one that does. **Then trigger a new deploy** (Deploys → Trigger deploy → Deploy site); the function reads the variable per deploy.
4. If Netlify is not reachable from your tools, stop after step 2 and hand Erlend the exact variable name and value to paste, in a message that does not go anywhere public. Treat the Catch Hook URL as a secret: anyone holding it can inject fake leads.

## 3. Prove it

1. **Direct test.** POST the sample payload above to the Catch Hook yourself, with `lead_id` `l_workordertest01`, `company` `WORKORDER TEST`. Check: Zapier answers 2xx within a second or two; one ClickUp task appears with the right name, status and fields. POST the **same** payload again: still exactly one task (updated, not duplicated). Delete the test task afterwards.
2. **Each route.** Repeat with `route.page` = `review`, `not-now` and `not-a-fit` and different `lead_id`s; check the status (and for `review` the due date and the notification). Delete the test tasks.
3. **Failure behaviour.** Confirm the Zap answers a non-2xx (or does not answer) if it cannot create the task, rather than a 200 that drops the lead. If Zapier cannot do that for a Catch Hook, say so plainly: it means a lead can be lost silently and Erlend should know before ads run.
4. **End to end, after Erlend has merged the page change and turned the funnel on** (he will tell you; until then the page refuses submissions on purpose): submit the real form once at `https://getelevateleads.com/uk-it-firms/` with an obviously fake company, `alex.test@example.com`, and answers that route to `book`. Expect: you land on the Calendly page; one ClickUp task with `route.page = book`, the UTMs (add `?utm_source=test&utm_campaign=workorder` to the URL first) and a `lead_id` that also appears in the page URL after submit. Delete the task. Do not book a Calendly slot.

## 4. Report back

- The ClickUp list used and the task shape actually built.
- That steps 3.1 to 3.3 passed, with what you saw, or what failed.
- Whether the environment variable is set and a deploy ran (or the exact hand-over if not).
- Anything in the payload you needed that is missing.
- Never paste the webhook URL into a place other people can read.

## Out of scope

Changing the page, its routing rules (`g/uk-it-larger-firms/routing.json`), copy, Calendly, the Meta pixel, or turning the funnel live. If a routing rule looks wrong while you work with real payloads, tell Erlend; do not change it.
