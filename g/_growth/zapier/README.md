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
   node g/_growth/zapier/zap1.test.mjs        # 244 checks
   node g/_growth/zapier/zap1-it.test.mjs     # 669 checks, Italy (after zap1's build)
   node g/_growth/zapier/zap2-it.test.mjs     # 98 checks, Italy (after zap2's build)
   ```

   The two `-it` tests build copies of the source with values put into the Italy entry (test ids for Aurora, who is not
   in ClickUp or Slack yet, and for the failure checks the list or the channel taken out) and import those copies from
   `out/`. The shipped Italy entry has its list, its Slack channel and its Calendly event type. They also check that
   the UK output is unchanged in the same build. A strict type check also passes with `tsc --strict --noEmit` against
   stub declarations for the two Zapier packages (esbuild strips types without checking them, Zapier compiles the
   file for real).

   `truth.json` is a snapshot of the ClickUp field and option ids the tests check the mappings against.
   Refresh it when a field or option in ClickUp changes.
3. Put the file into the workflow as `workflow.ts` through a Zapier draft and check that the draft holds it byte for
   byte (sha256 of `source_files["workflow.ts"]`). Run the draft against made-up data: the campaign you changed, and
   one UK test lead, because the two campaigns share the code (a draft run changes nothing in Zapier; a test lead
   makes a ClickUp task, archive it afterwards). Then publish it. Leave `enabled` out of the publish call: the
   workflow stays as it is. Both workflows have been switched on since 26 Oct 2026 and carry live UK leads, so a
   publish is a change to production. Read the published version back and compare the sha256 again.
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

Italy (`it-ict-growth`, added 23 Oct 2026, wired and published 3 Nov 2026) was added the same way and is the first entry
that differs from the UK in more than ids. What an entry can say beyond the ids (all optional, the UK entries say none
of it and behave as before): `lang: "en"` (ClickUp description, comments and Slack in English, through `tr()` and the
`EN` table; the labels and Norwegian texts stay the source), `reviewer` (who reads the not-a-fit leads; ClickUp id 0 or
no Slack id means nobody is assigned or pinged), `slackChannel` (empty fails the run on purpose), `register: false` (no
company register rows or Slack line), `phonePrefix`, `otherSpecialism`, `reasonText` (zap 1, the reason codes in the
words of the country, also for fit and review), `answersEn` (zap 1, the Italian form's answer words in English),
`slackDetail` (zap 1, more lines in the Slack posts), `zones` (zap 2, the time zones the meeting time is written in).

**The Italy entries are published.** The list `IT - ITALY - Commission` (`1201270000004918`, made 3 Nov 2026 with the nine
statuses of the UK list, and the UK list's custom fields added to it as the same fields, so every field and option id is
the UK one), the Slack channel `#leads-it` (`C0CEKL5H4LC`) and Aurora's Calendly event type
(`82a67d1d-2a3b-4bd4-b892-97c41d4a47ad`) are in the source. Aurora has no ClickUp or Slack account yet, so `reviewer` says
ClickUp id 0 and no Slack id: nobody is assigned or pinged until she is invited, and then her ids go into the entry in the
source and in a new publish. The funnel itself is `live: false`, so no Italian lead reaches the workflow before
`g/it-ict-growth/LAUNCH.md` says so.

**What runs is the source file, byte for byte** (since 3 Nov 2026; the `published/` folder that held the pre-Italy copy
is gone). To check: read the workflow's current version with `get_workflow` and compare the sha256 of its `workflow.ts`
with the file here. To go back to an older version, read its `workflow.ts` with `get_workflow_version`, put it into a
draft and publish that.

**The Slack posts for Italy are in English and carry the answers in English** (3 Nov 2026, Erlend: "the Slack
notifications must give us as much English info as possible"). The Italian form sends its own Italian option words, so
`answersEn` turns each of the 42 into English (the UK form's wording, euro for pound). The Slack posts show the English;
the ClickUp description shows the English with the visitor's own word after it in brackets. `zap1-it.test.mjs` fails if
an option of `g/it-ict-growth/core.mjs` has no entry, or an entry no option. A word the table does not know is shown as it
came in. With `slackDetail` the full post also carries the IT area, the years trading, the target, the website and a
"Why" line (the reason codes in English), and the one-line not-a-fit post carries the website. What the visitor wrote in
their own words (the target, what they want from the meeting) is shown as written: a table cannot translate it. Still no
name, e-mail address or phone number in Slack, as for the UK.

26 Oct 2026: health tag `growth-health` (was `growth-5m`), the new spend bands, words for the new reason codes, the
marketing spend in the fit and review posts, flags left out of the not-a-fit reason, IT team size 50 to 99. Drafts of both
workflows were test-run against the real ClickUp lists (three test tasks, archived afterwards).
Published 26 Oct 2026 at 16:41 UTC with Erlend's go-ahead: Zap 1 version `01a17916-b4d5-78e6-a84f-8170b7afe520`, Zap 2
version `01a17916-bf88-7565-8896-5a0da61d5704`, both still switched on. The three health tasks that had `growth-5m` were
retagged.

3 Nov 2026: Italy wired and published, as part of Erlend's request to set up the technical side for Italy. Drafts of
both workflows were run in Zapier against the real ClickUp lists and #leads-it (Italy: fit with a Slack post, not a fit,
booking linked on the lead id, booking without a form, a cancellation, another event; UK: fit, booking, booking without
a form; the test tasks were archived, never deleted). The enabled state was not touched. Published at 13:31 UTC: Zap 1
version `01a1a19b-6314-7084-94f5-76efe8d6b7d2`, Zap 2 version `01a1a19b-6f1d-7b23-ace8-1fdda467c5a0`, both switched on with
their triggers active. The published sources were read back and were identical to the files then (Zap 1 sha256
`3f4aeaf2...`, Zap 2 `c7b20394...`). The versions before, for going back: Zap 1 `01a17916-b4d5-78e6-a84f-8170b7afe520`,
Zap 2 `01a17916-bf88-7565-8896-5a0da61d5704`.

3 Nov 2026, second publish (the English Slack posts for Italy, described above): Zap 1 only. A draft of the new file was
run in Zapier against the real ClickUp list and #leads-it with four made-up leads: Italy fit with a Slack post (read back
from Slack, line for line the expected text), Italy review, Italy not a fit (both checked in `slack.preview`), and a UK fit.
The UK result was also compared offline with the previous version on 238 UK payloads (three campaigns, every status, test
and real leads) and is identical (that comparison script is not kept in the repo). The four test tasks were archived,
never deleted; the one `[TEST]` post stays in #leads-it. Published at 13:56 UTC: Zap 1 version
`01a1a1b2-6ec3-76d0-9053-de5d83f2804f`, sha256 `64c61e5f...`, read back and identical to the file here, still switched on
with its trigger active (the enabled state was not touched). Zap 2 was not changed (`01a1a19b-6f1d-7b23-ace8-1fdda467c5a0`,
`c7b20394...`). To go back: Zap 1 `01a1a19b-6314-7084-94f5-76efe8d6b7d2`.

3 Nov 2026, third publish (Erlend's two rules for Italy, PR #127): Zap 1 only. The Italy `reasonText` gained
`turnover_below_1m`, `turnover_1m_2m` and `spend_5k_plus` (`turnover_below_2m` stays, for the leads made before). A draft of
the new file was run in Zapier against the real ClickUp lists with four made-up test leads: Italy fit by the 5,000 euro rule,
Italy fit at 1 to under 2 million euro, Italy not a fit under 1 million euro (all three read in `slack.preview`, with the
"Why" and "Reason" lines as expected) and a UK fit (unchanged, Norwegian post). Nothing was posted to Slack. The four test
tasks were archived, never deleted. Published at 22:02 UTC: Zap 1 version `01a1a36f-7dd5-7ec9-8f10-59f31b925a5b`, sha256
`7d54ea49...`, read back and identical to the file here, still switched on with its trigger active (the enabled state was
not touched). Zap 2 was not changed (`01a1a19b-6f1d-7b23-ace8-1fdda467c5a0`, `c7b20394...`). To go back: Zap 1
`01a1a1b2-6ec3-76d0-9053-de5d83f2804f`.

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

6 Nov 2026: leads nobody promised commission (PR #131). The lead function sends two more keys, `entry` and
`commission_promised` (44 keys; see `g/uk-it-growth/LAUNCH.md` section 4). A `no` lead (first: the form on the C-Medical case
page, `/case/c-medical/apply/`, which says nothing about how we are paid) gets the task name prefix `[INGEN KOMMISJON LOVET]`,
the tag `ingen-kommisjon-lovet` (made in the EM space, red, 6 Nov 2026), a warning block first in the ClickUp description,
a "Skjema på" row in the source block, and a second line on every Slack post (fit, review, not a fit, quote request). A `yes`
lead, and a lead from before the key existed, is unchanged (`zap1.test.mjs` section 18, 265 checks; Italy 669). A draft of
the file was run in Zapier against the real health list and #leads-uk (one `no` lead with `slack_test`, read back from
ClickUp and Slack line for line) and the real IT list (one plain `yes` lead, no warning anywhere); both test tasks were
archived, never deleted; the one `[TEST]` post stays in #leads-uk. Published at 23:18 UTC: Zap 1 version
`01a1ae01-93e0-7556-ac7e-acd19b365cd7`, sha256 `0947d256...`, read back and identical to the file here, still switched on
with its trigger active (the enabled state was not touched). Zap 2 was not changed. To go back: the version before,
`01a1a36f-7dd5-7ec9-8f10-59f31b925a5b`. The Zap was published before the function (PR #131 merged after): a lead without the
two keys is read as `yes`, so the order did not matter.
