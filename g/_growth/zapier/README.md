# Zapier workflows for the /g/ growth funnels

The two workflows that carry a lead from the form to ClickUp, Slack and Calendly. They are Zapier
durable workflows written in code. The `.ts` files here are the source of what runs in Zapier
(published there as `workflow.ts`), together with the tests they were checked with. Nothing in this
folder is part of the website build.

| | File | Zapier workflow | Trigger |
|---|---|---|---|
| Zap 1 | `zap1-lead-to-clickup-slack.ts` | "Leads v3: skjema til ClickUp og Slack", `01a150f8-009e-71cc-9696-fc8ec4119d57` | Webhooks by Zapier, Catch Hook |
| Zap 2 | `zap2-calendly-booking.ts` | "Leads v3: Calendly-booking", `01a15111-adb3-7400-b62c-803edc7657d3` | Calendly, Invitee Created, whole organisation |

The contract (payload keys, statuses, fields) is in `g/uk-it-growth/LAUNCH.md`, section 4. Which
state the workflows are in (switched on or off) is also kept there, not here.

## Changing one

1. Edit the `.ts` file.
2. Test it. The tests drive the real workflow code against fakes for ClickUp, Calendly and Slack:

   ```
   node g/_growth/zapier/build.mjs zap2-calendly-booking.ts
   node g/_growth/zapier/zap2.test.mjs        # 201 checks
   node g/_growth/zapier/build.mjs zap1-lead-to-clickup-slack.ts
   node g/_growth/zapier/zap1.test.mjs        # 235 checks
   node g/_growth/zapier/zap1-it.test.mjs     # 198 checks, Italy (after zap1's build)
   node g/_growth/zapier/zap2-it.test.mjs     # 93 checks, Italy (after zap2's build)
   ```

   The two `-it` tests build a copy of the source with test values put into the Italy entry (the shipped entry has no
   list, channel or ids yet) and import that copy from `out/`. They also check that the UK output is unchanged in the
   same build. A strict type check also passes with `tsc --strict --noEmit` against stub declarations for the two
   Zapier packages (esbuild strips types without checking them, Zapier compiles the file for real).

   `truth.json` is a snapshot of the ClickUp field and option ids the tests check the mappings against.
   Refresh it when a field or option in ClickUp changes.
3. Put the file into the workflow as `workflow.ts` through a Zapier draft, run the draft once against
   made-up data (a draft run is free and changes nothing in Zapier), then publish it. Publish with
   the workflow switched off. Switching a workflow on is a separate step and needs a person's yes.
4. If the payload keys change in `netlify/functions/lead/payload.mjs`, change Zap 1 in the same
   step. `g/uk-it-growth/test/units.test.mjs` fails on the function side until the key list is
   updated on purpose.

## Add a campaign (health, law)

One more entry in `CAMPAIGNS` in the workflow file: the ClickUp list id, the custom field ids, the
option ids, and for Zap 2 the Calendly event type id. Both workflows read the campaign from the
payload or the booking, so nothing else changes. A lead from a campaign that has no entry fails the
run on purpose, so it shows in the run history and does not disappear.

Health (`uk-private-hospitals`) and law (`uk-law-firms`) were added on 20 Oct 2026. Each has its own
ClickUp list, made by duplicating `IT - UK - Commision`, so all three lists share the same field and
option ids. A dropdown is set only when the form's band fits inside one ClickUp band, which leaves IT
Specialism, Team Size and Contract Value empty for health and law. Both workflows were published after
draft runs against all three lists (create, link on `l_` and `d_` ids, move from `ny lead`).

Italy (`it-ict-growth`, 23 Oct 2026) was added the same way and is the first entry that differs from the UK in
more than ids. What an entry can say beyond the ids (all optional, the UK entries say none of it and behave as
before): `lang: "en"` (ClickUp description, comments and Slack in English, through `tr()` and the `EN` table; the
labels and Norwegian texts stay the source), `reviewer` (who reads the not-a-fit leads; ClickUp id 0 or no Slack id
means nobody is assigned or pinged), `slackChannel` (empty fails the run on purpose), `register: false` (no company
register rows or Slack line), `phonePrefix`, `otherSpecialism`, `reasonText` (zap 1), `zones` (zap 2, the time zones
the meeting time is written in). **The Italy entries are in the source but are not published in Zapier**: the list,
the channel, Aurora's ids and the Calendly event type do not exist yet, and the shared workflows carry live UK leads.
Publish when `g/it-ict-growth/LAUNCH.md` section 4 says so, after a draft run against a UK test lead.

## Conventions

- A lead or a booking with an e-mail address ending `@example.invalid` is a test: it gets the tag
  `test` in ClickUp and never posts to Slack, unless the Zap 1 payload carries `slack_test: true`.
  A test lead is never assigned to Sondre, its comment does not notify and its Slack post does not ping,
  whatever `slack_test` says (22 Oct 2026, `not_a_fit` and the quote branch).
- Test tasks are archived afterwards (status `ukvalifisert - archive`, archived), never deleted.
- No secrets in these files. The Catch Hook URL is shown in Zap 1's trigger step in the Zapier
  editor and is pasted into Netlify as `ZAPIER_LEAD_HOOK`. It is not written down anywhere else.
- No names, e-mail addresses or phone numbers in a workflow's output or in Slack.

## What the tests cannot show

The exact shape of the data Zapier's Calendly trigger hands over. `parseBooking` in Zap 2 accepts
nested, flattened and wrapped forms and fails with the names of the keys it saw if it can not read the
booking; only a real booking on a switched-on workflow confirms which form it is.
