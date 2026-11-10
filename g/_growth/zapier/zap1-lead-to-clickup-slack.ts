import { defineDurable } from "@zapier/zapier-durable";
import { createZapierSdk } from "@zapier/zapier-sdk";
import { z } from "zod";

const sdk = createZapierSdk();

/*
 * Leads v3: skjema til ClickUp og Slack (Zap 1).
 *
 * Receives one lead from POST /api/lead (the Netlify function) through a Catch Hook, puts it in
 * ClickUp and, for fit and review, tells #leads-uk. The decision about fit or not is made in the
 * function and arrives here as `route`; nothing here decides it again.
 * Contract: the project document "Løsning: eget skjema, Zapier, ClickUp og Slack" (16 Oct 2026),
 * and g/uk-it-growth/LAUNCH.md in the repository. Change the payload there first.
 *
 * Add a campaign: one more entry in CAMPAIGNS (list id, field ids, option ids). Nothing else.
 * The health and law entries (20 Oct 2026) point at their own ClickUp lists, made by duplicating "IT - UK -
 * Commision" (statuses and fields came with it). Duplicating does not change the field and option ids:
 * all three lists read the same ones, so the mappings below are shared. A campaign with an empty listId
 * fails the run on purpose and stays in the run history; the lead itself is safe in the function's store.
 * Test leads (an e-mail ending in @example.invalid) are tagged "test" in ClickUp and never post
 * to Slack, unless the payload carries slack_test: true.
 *
 * 21 Oct 2026: the form gained a required free text question, "What do you want to get out of this
 * meeting?", which arrives as `meeting_goal`. It goes into the task description and, by Erlend's
 * decision, into the Slack message as well (the privacy notice was changed to say so). Phone, e-mail
 * and everything else that identifies a person still stay out of Slack.
 * (This part was in the published workflow but missing from this file until 22 Oct 2026; the file was
 * brought back in line with what runs.)
 *
 * Added 22 Oct 2026, "not a fit" is no longer a dead end:
 *   - A not_a_fit lead gets the tag "vurder-nettside" and is assigned to Sondre, who reads it and decides whether
 *     a fixed-price website or a monthly retainer could suit the firm. It stays in "ukvalifisert - archive" (the
 *     pipeline routines read "ny lead"). #leads-uk gets one compact "IKKE TREFF" post, with no ping.
 *     The workflow itself contacts nobody. Sondre may e-mail a firm he has read once, by hand (the privacy notice
 *     says so since 22 Oct 2026, PR #84), and always does when the visitor presses the button on the page.
 *   - That press arrives here as the same lead again with event: "website_interest" (and interest_at). The task is
 *     found, or made if the application never got to ClickUp, tagged "ønsker-nettsidetilbud", given a comment that
 *     notifies Sondre, and #leads-uk gets a post that pings him. A second delivery of the same press is ignored.
 *   - A test lead is never assigned, never notifies and never pings, whatever slack_test says.
 *
 * Added 23 Oct 2026, Italy (it-ict-growth). The campaign entry carries what differs per country, and every
 * entry that does not say anything keeps the UK behaviour exactly:
 *   - lang: "en" writes the ClickUp description, the comments and the Slack posts in English (the UK ones are
 *     Norwegian, for the Norwegian team). Every Norwegian text below goes through tr(), which looks it up in EN.
 *   - reviewer: who reads the not-a-fit leads (Aurora for Italy). ClickUp id 0 or no Slack id means that nobody is
 *     assigned and nobody is pinged until she is invited to ClickUp and Slack and the ids are filled in.
 *   - slackChannel: the channel of the country. Empty fails the run on purpose, like an empty listId.
 *   - register: false for a country without a company register lookup (no register rows, no register line).
 *   - phonePrefix "39": a national Italian number becomes +39.
 *   - otherSpecialism: the form's own word for "Other" ("Altro").
 *   - reasonText: the reason codes in the language and the currency of the country.
 *
 * Changed 26 Oct 2026, after the workshop rules (PR #87):
 *   - Health leads are tagged "growth-health" (was "growth-5m"). The health threshold is £2m now, and a tag named
 *     after a threshold goes stale each time the rules move. Law has "growth-law", Italy "growth-it"; IT keeps
 *     "growth-2m", which the IT list has used since the start to tell funnel leads from older ones.
 *   - The spend bands changed. Law gained "£1,000 to under £2,000", which fits inside ClickUp's "£1-2.5k/mth".
 *     Health's lowest band now ends at £3,000, so "£5,000 to under £20,000" is no longer an answer.
 *   - REASON_TEXT knows the not-a-fit codes the new rules give (spend_under_1k, spend_under_3k,
 *     turnover_below_1m, budget_2k_no). Flags (fertility, personal_injury_ticked) are no longer shown as the reason
 *     for a refusal in the one-line post.
 *   - The fit and review posts show the marketing spend: it now decides whether a smaller firm is a fit.
 *   - IT team size "50 to 99" fits inside ClickUp's "50+" and is set.
 *
 * Changed 3 Nov 2026, Italy (Erlend: the Slack posts must give as much English information as possible). The
 * answers of the Italian form arrive as the form's own Italian words, so the English posts need a table for them:
 *   - answersEn: the form's answer words in English. The Slack posts show the English. The ClickUp description shows
 *     the English with the visitor's own word after it in brackets, so nothing is lost. A word the table does not
 *     know is shown as it came in. A test checks that every option of the Italian form has an entry.
 *   - slackDetail: the full post also carries the IT area, the years trading, the target, the website and a line
 *     saying why the lead was routed as it was (reasonText now has the codes of fit and review too); the one-line
 *     "not a fit" post carries the website, which is what the reviewer needs to judge it. Still no name, e-mail
 *     address or phone number in Slack.
 *   - What the visitor wrote in their own words (what they want from the meeting, the target) is shown as written:
 *     a table cannot translate it.
 *   An entry without these keys behaves exactly as before; the UK posts did not change.
 *
 * Added 10 Nov 2026, booking reminders (Erlend: "we want to nag a lot at the start, so they do not fall off").
 * A fit lead that has not booked a meeting gets an e-mail 2, 6, 12 and 48 hours after the form was sent, each
 * with the link to its own booking page. It applies to every campaign (REMIND has an entry for each one, and a
 * test fails if one is missing):
 *   - "Not booked" is read from ClickUp right before each e-mail: the task is still in "ny lead". The booking
 *     workflow (Zap 2) moves it to "møte booket"; a person who moves it anywhere else (kontaktet, archive) also
 *     stops the reminders. That is the off switch for one lead: move the task out of "ny lead".
 *   - The run waits between the e-mails (ctx.wait), so a fit lead's run now ends after up to 48 hours. Everything
 *     else (task, Slack, fields, phone) is done before the first wait, exactly as before.
 *   - The e-mails are sent from the shared mailbox post@elevatemarketing.no, the address the pages give, with the
 *     host of the meeting as Reply-To (Sondre for the UK, Aurora for Italy), and signed by the host. Each one is
 *     noted in a ClickUp comment without a notification. Nothing about them goes to Slack.
 *   - Nothing here can fail the run: a ClickUp read that fails skips that one reminder (never an e-mail on a guess),
 *     an e-mail that fails is noted and the next one is still tried.
 *   - A reminder whose time has passed when the lead arrives (a late delivery from the function's store) is skipped,
 *     so nobody gets three e-mails at once.
 *   - A test lead gets no e-mail and no wait: the four e-mails come back as a preview in the run's output. Two keys
 *     in the payload, read for test leads only, let a draft run exercise the real path: reminder_test_seconds (the
 *     gap between reminders, 1 to 30 seconds) and reminder_test_send (the e-mails are sent, to REMIND_TEST_TO and
 *     never to the lead).
 *   - The texts say nothing about how we are paid, so they are right for commission, retainer and
 *     "no commission promised" leads alike.
 */

// ---------------------------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------------------------

const CLICKUP_API = "https://api.clickup.com/api/v2";
const CLICKUP = "clickup_main";
const SLACK = "slack_main";
const SLACK_CHANNEL = "C0CAA3726DS"; // #leads-uk
const DAY_MS = 24 * 60 * 60 * 1000;
const SLACK_GOAL_MAX = 320;

// Who reads the leads that are not a fit. ClickUp member id, Slack user id and the name used in text.
type Reviewer = { clickupId: number; slackId: string; name: string };
const REVIEWER: Reviewer = { clickupId: 106690144, slackId: "U0AR2CM4NTZ", name: "Sondre" };
const REVIEW_TAG = "vurder-nettside";
const INTEREST_TAG = "ønsker-nettsidetilbud";
// A lead whose form stood on a page that says nothing about how we are paid (the function sends
// commission_promised: "no"; 6 Nov 2026, first the C-Medical case page). Nobody has promised it commission,
// so we are free to offer a retainer or commission on the call. The task name, a tag, the first block of
// the description and the second line of every Slack post say so, so that nobody promises it by habit.
const OPEN_TAG = "ingen-kommisjon-lovet";
const OPEN_PREFIX = "[INGEN KOMMISJON LOVET] ";
// A campaign that sells a retainer (6 Nov 2026, first /g/uk-ai-visibility) marks every lead the same way, so that
// nobody mixes it up with the commission funnels in the same CRM folder.
const RETAINER_PREFIX = "[RETAINER] ";
const RETAINER_TAG = "retainer";
const openTerms = (lead: Lead): boolean => lead.commission_promised === "no";
const INTEREST_EVENT = "website_interest";

// Booking reminders (10 Nov 2026): a fit lead that has not booked gets an e-mail this many hours after the form.
const REMIND_ON = true; // false: no reminders for anyone, nothing else changes
const REMIND_HOURS = [2, 6, 12, 48];
const REMIND_STATUS = "ny lead"; // a task still here has not booked and nobody has taken it by hand
const REMIND_MAX_WAIT_S = 6 * 60 * 60; // one wait is at most this long; a longer gap is several waits in a row
const REMIND_SITE = "https://getelevateleads.com";
const OUTLOOK = "outlook_main";
const REMIND_FROM = "post@elevatemarketing.no"; // the shared mailbox the pages give as the contact address
const REMIND_TEST_TO = "post@elevatemarketing.no"; // where a test lead's e-mails go when the payload asks for a real send

type Remind = {
  lang: "en" | "it";
  offer: string; // the meeting, in the words of the campaign's booking page
  prep: string; // one sentence about the meeting, also from the booking page
  host: string; // first name, in the text
  sign: string; // the name under the e-mail
  replyTo: string; // the host's own address
};

const REMIND: Record<string, Remind> = {
  "uk-it-growth": { lang: "en", offer: "30 minute pipeline review", prep: "Your own numbers are all we need, so there is nothing to prepare.", host: "Sondre", sign: "Sondre Henanger", replyTo: "sh@elevatemarketing.no" },
  "uk-private-hospitals": { lang: "en", offer: "30-minute bookings review", prep: "Your own numbers are all we need, so there is nothing to prepare.", host: "Sondre", sign: "Sondre Henanger", replyTo: "sh@elevatemarketing.no" },
  "uk-law-firms": { lang: "en", offer: "30 minute instruction review", prep: "Your own numbers are all we need, so there is nothing to prepare.", host: "Sondre", sign: "Sondre Henanger", replyTo: "sh@elevatemarketing.no" },
  "uk-ai-visibility": { lang: "en", offer: "30 minute AI visibility review", prep: "We put your buyers' questions to ChatGPT before we meet, so there is nothing to prepare.", host: "Sondre", sign: "Sondre Henanger", replyTo: "sh@elevatemarketing.no" },
  "it-ict-growth": { lang: "it", offer: "analisi della pipeline di 30 minuti", prep: "Bastano i vostri numeri, non c’è nulla da preparare.", host: "Aurora", sign: "Aurora", replyTo: "au@growwithelevate.eu" },
};

// The four e-mails, in order. Tokens: {hi} the greeting line, {company}, {offer}, {prep}, {host}, {link}.
// Plain text on purpose: it reads as a note from a person and needs no template.
type Mail = { subject: string; subjectNoName?: string; body: string };
const REMIND_MAIL: Record<"en" | "it", { hi: string; hiNoName: string; company: string; foot: string; mails: Mail[] }> = {
  en: {
    hi: "Hi {first},",
    hiNoName: "Hello,",
    company: "your firm",
    foot: "If you no longer want the call, reply and say so, and these reminders stop.",
    mails: [
      {
        subject: "Your {offer}: pick a time",
        body: "{hi}\n\nThank you for applying. From your answers, {company} looks like a fit, so the next step is the {offer} with {host}.\n\nYou have not picked a time yet. It takes under a minute:\n{link}\n\nIf none of the times suit you, reply to this email with two or three that do and we will find one.",
      },
      {
        subject: "No time booked yet for {company}",
        body: "{hi}\n\nA short reminder: your application went through, but there is no call in the calendar yet.\n\nThe {offer} is a call with {host}. {prep}\n\nPick a time here:\n{link}",
      },
      {
        subject: "Shall we find a time, {first}?",
        subjectNoName: "Shall we find a time?",
        body: "{hi}\n\nYou applied for a {offer} but have not chosen a time. The calendar is open here:\n{link}\n\nIf the times do not suit you, or something came up, reply to this email and tell us when would be better.",
      },
      {
        subject: "Last reminder: your {offer}",
        body: "{hi}\n\nThis is the last reminder from us. Your application for {company} is still open, and you can book the {offer} here:\n{link}\n\nIf now is not the right time, reply and tell us when to come back to you.",
      },
    ],
  },
  it: {
    hi: "Buongiorno {first},",
    hiNoName: "Buongiorno,",
    company: "la vostra azienda",
    foot: "Se la chiamata non vi interessa più, rispondete a questa email e i promemoria si fermano.",
    mails: [
      {
        subject: "Scegliete un orario per l’{offer}",
        body: "{hi}\n\ngrazie per la candidatura. Dalle vostre risposte, {company} rientra tra le aziende che seguiamo: il passo successivo è l’{offer} con {host}.\n\nNon avete ancora scelto un orario. Basta meno di un minuto:\n{link}\n\nSe nessun orario va bene, rispondete a questa email con due o tre alternative e ne troveremo uno.",
      },
      {
        subject: "Nessun orario prenotato per {company}",
        body: "{hi}\n\nun breve promemoria: la candidatura è arrivata, ma in calendario non c’è ancora una chiamata.\n\nL’{offer} è una chiamata con {host}. {prep}\n\nScegliete un orario qui:\n{link}",
      },
      {
        subject: "Troviamo un orario, {first}?",
        subjectNoName: "Troviamo un orario?",
        body: "{hi}\n\navete chiesto l’{offer}, ma non avete ancora scelto un orario. Il calendario è aperto qui:\n{link}\n\nSe gli orari non vanno bene, o è sopraggiunto un imprevisto, rispondete a questa email e diteci quando preferite.",
      },
      {
        subject: "Ultimo promemoria: l’{offer}",
        body: "{hi}\n\nquesto è il nostro ultimo promemoria. La vostra candidatura resta aperta e potete prenotare l’{offer} qui:\n{link}\n\nSe non è il momento giusto, rispondete e diteci quando risentirci.",
      },
    ],
  },
};

// The Norwegian text of the workflow is the source. A campaign with lang "en" reads it through this table; an
// entry that is missing falls back to the Norwegian text (a test checks that none is missing for what an
// English campaign prints). {name}-style tokens are filled in by tr() in either language.
const EN: Record<string, string> = {
  // headings and labels of the ClickUp description
  "skjema levert": "form submitted",
  "Selskap": "Company",
  "Navn": "Name",
  "Nettside": "Website",
  "Sjekk mot registeret": "Register check",
  "Svar i skjemaet": "Form answers",
  "Spesialisering": "Specialism",
  "Fagområder": "Practice areas",
  "SRA-nummer": "SRA number",
  "Registreringsnummer hos tilsynet": "Regulator registration number",
  "Spesialiteter": "Specialties",
  "Andel selvbetalende": "Self-pay share",
  "Verdi av førstekonsultasjon": "First consultation value",
  "Omsetning": "Turnover",
  "Hvor lenge i drift": "Years trading",
  "Antall folk": "People",
  "Markedsføring per måned": "Marketing spend per month",
  "Verdi første år": "First-year value",
  "Salgssyklus": "Sales cycle",
  "Mål neste år": "Target next year",
  "Beslutter": "Decision maker",
  "Kapasitet": "Capacity",
  "Kontakt": "Contact",
  "Rolle": "Role",
  "E-post": "E-mail",
  "Mobil": "Mobile",
  "Ruting": "Routing",
  "Rute": "Route",
  "Årsaker": "Reasons",
  "Kilde": "Source",
  "Side": "Page",
  "Skjema på": "Form on",
  // route headings
  "IKKE TREFF": "NOT A FIT",
  // Slack
  "uten navn": "no name",
  "Selvbetalende": "Self-pay",
  "Verdi førstekonsultasjon": "First consultation value",
  "Vil ha ut av møtet": "Wants from the meeting (their own words)",
  "Hvorfor": "Why",
  "ukjent": "unknown",
  "åpne oppgaven": "open the task",
  "⚠ Størrelse ikke bekreftet, sjekk før møtet": "⚠ Size not confirmed, check before the meeting",
  "⚠ Fertilitet: HFEA-regulert, sjekk før annonser": "⚠ Fertility: HFEA regulated, check before ads",
  "⚠ Personskade er krysset av: avtalen må unnta personskadesaker": "⚠ Personal injury is ticked: the agreement must exclude personal injury cases",
  "Grunn": "Reason",
  "{name} vurderer nettside eller retainer": "{name} reviews website or retainer",
  "ØNSKER NETTSIDETILBUD": "WANTS WEBSITE QUOTE",
  "{who} sender ett tilbud på e-post innen to virkedager": "{who} sends one quote by e-mail within two working days",
  // ClickUp comments
  "Ønsker tilbud på ny nettside eller månedlig retainer. Trykket på knappen på siden «ikke treff».":
    "Wants a quote for a new website or a monthly retainer. Pressed the button on the “not a fit” page.",
  "Send ett tilbud på e-post{to} innen to virkedager.": "Send one quote by e-mail{to} within two working days.",
  " til {email}": " to {email}",
  "Disse feltene ble ikke satt automatisk: {failed}. Svarene står i beskrivelsen.": "These fields were not set automatically: {failed}. The answers are in the description.",
  // a lead from a page that says nothing about how we are paid
  "INGEN KOMMISJON LOVET": "NO COMMISSION PROMISED",
  "Skjemaet sto på en side som ikke sier noe om hvordan vi tar betalt ({entry}). Ingen har lovet denne leaden kommisjon: vi står fritt til retainer eller kommisjon, og {name} velger modell i møtet. Ikke nevn kommisjon før det.":
    "The form stood on a page that says nothing about how we are paid ({entry}). Nobody has promised this lead commission: we are free to offer a retainer or commission, and {name} chooses the model on the call. Do not mention commission before then.",
  "fri til retainer eller kommisjon, {name} velger i møtet (via {entry})": "free to offer a retainer or commission, {name} chooses on the call (via {entry})",
  // booking reminders
  "Påminnelse {n} av {total} om å booke møte er sendt på e-post ({hours} t etter skjemaet).": "Reminder {n} of {total} to book a meeting was sent by e-mail ({hours} h after the form).",
  "Påminnelse {n} av {total} om å booke møte ble ikke sendt: {error}": "Reminder {n} of {total} to book a meeting was not sent: {error}",
};

function tr(c: Campaign, no: string, vars?: Record<string, string>): string {
  let text = c.lang === "en" && Object.prototype.hasOwnProperty.call(EN, no) ? EN[no] : no;
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(v);
  return text;
}

const reviewerOf = (c: Campaign): Reviewer => c.reviewer ?? REVIEWER;
const channelOf = (c: Campaign): string => (c.slackChannel === undefined ? SLACK_CHANNEL : c.slackChannel);

type Tier = "fit" | "review" | "other";
type RouteRule = {
  status: string;
  priority: number | null;
  tier: Tier;
  slack: boolean;
  heading: string;
  tags: string[];
  dueInDays: number;
  compact?: boolean; // a short Slack post, no ping
  reviewer?: boolean; // assigned to REVIEWER (never on a test lead)
};

const ROUTES: Record<string, RouteRule> = {
  fit: { status: "ny lead", priority: 2, tier: "fit", slack: true, heading: "FIT", tags: [], dueInDays: 0 },
  review: { status: "ny lead", priority: 3, tier: "review", slack: true, heading: "REVIEW", tags: ["sjekk-størrelse"], dueInDays: 0 },
  not_now: { status: "ukvalifisert - archive", priority: null, tier: "other", slack: false, heading: "NOT NOW", tags: ["ta-opp-om-3-mnd"], dueInDays: 90 },
  not_a_fit: { status: "ukvalifisert - archive", priority: null, tier: "other", slack: true, heading: "IKKE TREFF", tags: [REVIEW_TAG], dueInDays: 0, compact: true, reviewer: true },
};

type Campaign = {
  label: string;
  listId: string; // "" while the list does not exist yet: the run then fails on purpose
  tag: string;
  peopleWord: string;
  lang?: "no" | "en"; // default "no", the language of the UK workflow
  reviewer?: Reviewer; // default REVIEWER (Sondre)
  slackChannel?: string; // default SLACK_CHANNEL (#leads-uk); "" fails the run on purpose
  register?: boolean; // default true; false: no company register rows and no register line in Slack
  phonePrefix?: string; // default "44"; "39" for Italy
  otherSpecialism?: string; // default "Other"; the form's own word, "Altro" in Italy
  reasonText?: Record<string, string>; // default REASON_TEXT
  answersEn?: Record<string, string>; // the form's own answer words in English (Italy); a word that is missing is shown as it came in
  slackDetail?: boolean; // default false (the posts are as they were); true: the full post also carries area, years trading, target, website and why
  retainer?: { block: string; line: string }; // a retainer offer (6 Nov 2026): every lead is marked [RETAINER] in the name, a tag, a block first in the description and line 2 of each Slack post
  field: Record<string, string>;
  option: {
    crmItemType: string;
    salesStage: string;
    tier: Record<Tier, string>;
    specialism: Record<string, string>;
    teamSize: Record<string, string>;
    adSpend: Record<string, string>;
    contractValue: Record<string, string>;
  };
};

// Dropdowns in ClickUp are filled only when the visitor's answer fits inside one ClickUp option.
// The ClickUp bands are not the form's bands, and a wrong bucket is worse than an empty one.
// The exact answers are always in the task description.
const CAMPAIGNS: Record<string, Campaign> = {
  "uk-it-growth": {
    label: "UK IT",
    listId: "901522580321", // IT - UK - Commision
    tag: "growth-2m",
    peopleWord: "ansatte",
    field: {
      leadId: "08cf9ecc-ff51-4296-9e03-c5250ebb7abf",
      website: "09d8fbaa-d659-4b44-9738-39fcf5c6f25b",
      adSpend: "13229225-75e5-4729-bd8d-eb69c20e80b2",
      teamSize: "18957c8f-f573-4790-957c-11812dd3aa04",
      contractValue: "189cd0e5-2c7d-4c43-a94b-9ad280a4ad53",
      tier: "668b1a6a-4054-4b24-ac3c-55432d7c2b3e",
      email: "78c13487-0fee-46d2-893f-68b212b09e6b",
      crmItemType: "8289eaa9-7492-40eb-a35d-092c51bd01ac",
      contactName: "8fb666f4-c213-4f7a-a8ce-627e496a8313",
      phone: "a0c06e36-5028-4b86-af93-c57de3ad2418",
      specialism: "ce2deb01-0b47-45c6-8bf5-dbdc67f9962d",
      jobTitle: "cf254478-a92a-4805-921a-a89ba06c69a0",
      salesStage: "f4bfea58-b05c-4427-ba1c-b4aa61200583",
    },
    option: {
      crmItemType: "0b565b82-9090-45fa-8bf9-67f2a7d2eca3", // Lead
      salesStage: "819060db-e6c9-43ab-a7f9-be1322061f3f", // Lead Qualification
      tier: {
        fit: "153aea7a-a523-466a-997a-92e6b07e4c1f", // Tier 1
        review: "20a259b4-95a9-435f-86fa-88bf86d399cc", // Tier 2
        other: "1d991141-c31f-4a47-96c9-d6e2c025b29a", // Tier 3
      },
      specialism: {
        "IT strategy and digital transformation": "332d345f-0002-41e5-a3cc-b719e55bfbbb",
        "Managed IT services": "cbb8af7b-befb-4b56-ae0e-e9018a52c022",
        "Software development": "a5ca2f30-4bd7-4386-bace-86a239c71ff1",
        "Data and AI": "3fae402c-d23a-4338-b521-9e6369cce72d",
        "Cybersecurity": "48ac62c8-c7cb-48cb-8093-44018f5ad333",
        "Other": "a75ef23e-81ec-45a2-b98f-6fd366bd90f8",
      },
      teamSize: {
        "50 to 99": "58ab0f8c-b644-4cac-a29f-69765732b3fa", // 50+
        "100 or more": "58ab0f8c-b644-4cac-a29f-69765732b3fa", // 50+
      },
      adSpend: {
        "Under £1,000": "5482c305-7587-466a-bef4-ab15e6a70906", // Under £1k/mth
        "£5,000 to under £15,000": "7364943c-da47-4d59-bb44-e79faeeaac5a", // £5k+/mth
        "£15,000 or more": "7364943c-da47-4d59-bb44-e79faeeaac5a", // £5k+/mth
        "I do not know": "feaf2b0d-079a-4ffa-a48b-67e79c280458", // Unknown
      },
      contractValue: {
        "Under £10k": "4eec6f5e-b753-42c3-974e-ed62cd8347db", // Under £10k
        "£10k to under £25k": "39c63d70-0e37-41e5-87d9-fd1aa537e2c9", // £10k-£30k
        "£150k or more": "db0a1849-1833-46ae-ab83-a702144bb49f", // £150k+
      },
    },
  },
  // The duplicated lists carry the same field ids as the IT list (read back from ClickUp on 20 Oct 2026),
  // so truth.json covers them too. Only what fits inside one ClickUp band is set: a wrong bucket is worse
  // than an empty one. Health and law leave the "IT Specialism" dropdown alone (its options are IT
  // services), team size (no band of the form fits inside one band of ClickUp's) and contract value (the
  // exact answers are in the task description). The health form has no head count question.
  "uk-private-hospitals": {
    label: "UK HEALTH",
    listId: "1201270000003578", // HEALTH - UK - Commission
    tag: "growth-health",
    peopleWord: "ansatte",
    field: {
      leadId: "08cf9ecc-ff51-4296-9e03-c5250ebb7abf",
      website: "09d8fbaa-d659-4b44-9738-39fcf5c6f25b",
      adSpend: "13229225-75e5-4729-bd8d-eb69c20e80b2",
      teamSize: "",
      contractValue: "",
      tier: "668b1a6a-4054-4b24-ac3c-55432d7c2b3e",
      email: "78c13487-0fee-46d2-893f-68b212b09e6b",
      crmItemType: "8289eaa9-7492-40eb-a35d-092c51bd01ac",
      contactName: "8fb666f4-c213-4f7a-a8ce-627e496a8313",
      phone: "a0c06e36-5028-4b86-af93-c57de3ad2418",
      specialism: "",
      jobTitle: "cf254478-a92a-4805-921a-a89ba06c69a0",
      salesStage: "f4bfea58-b05c-4427-ba1c-b4aa61200583",
    },
    option: {
      crmItemType: "0b565b82-9090-45fa-8bf9-67f2a7d2eca3", // Lead
      salesStage: "819060db-e6c9-43ab-a7f9-be1322061f3f", // Lead Qualification
      tier: {
        fit: "153aea7a-a523-466a-997a-92e6b07e4c1f", // Tier 1
        review: "20a259b4-95a9-435f-86fa-88bf86d399cc", // Tier 2
        other: "1d991141-c31f-4a47-96c9-d6e2c025b29a", // Tier 3
      },
      specialism: {},
      teamSize: {},
      adSpend: {
        "£20,000 to under £50,000": "7364943c-da47-4d59-bb44-e79faeeaac5a", // £5k+/mth
        "£50,000 or more": "7364943c-da47-4d59-bb44-e79faeeaac5a", // £5k+/mth
        "I do not know": "feaf2b0d-079a-4ffa-a48b-67e79c280458", // Unknown
      },
      contractValue: {},
    },
  },
  "uk-law-firms": {
    label: "UK LAW",
    listId: "1201270000003579", // LAW - UK - Commission
    tag: "growth-law",
    peopleWord: "fee earners",
    field: {
      leadId: "08cf9ecc-ff51-4296-9e03-c5250ebb7abf",
      website: "09d8fbaa-d659-4b44-9738-39fcf5c6f25b",
      adSpend: "13229225-75e5-4729-bd8d-eb69c20e80b2",
      teamSize: "",
      contractValue: "",
      tier: "668b1a6a-4054-4b24-ac3c-55432d7c2b3e",
      email: "78c13487-0fee-46d2-893f-68b212b09e6b",
      crmItemType: "8289eaa9-7492-40eb-a35d-092c51bd01ac",
      contactName: "8fb666f4-c213-4f7a-a8ce-627e496a8313",
      phone: "a0c06e36-5028-4b86-af93-c57de3ad2418",
      specialism: "",
      jobTitle: "cf254478-a92a-4805-921a-a89ba06c69a0",
      salesStage: "f4bfea58-b05c-4427-ba1c-b4aa61200583",
    },
    option: {
      crmItemType: "0b565b82-9090-45fa-8bf9-67f2a7d2eca3", // Lead
      salesStage: "819060db-e6c9-43ab-a7f9-be1322061f3f", // Lead Qualification
      tier: {
        fit: "153aea7a-a523-466a-997a-92e6b07e4c1f", // Tier 1
        review: "20a259b4-95a9-435f-86fa-88bf86d399cc", // Tier 2
        other: "1d991141-c31f-4a47-96c9-d6e2c025b29a", // Tier 3
      },
      specialism: {},
      teamSize: {},
      adSpend: {
        "Under £1,000": "5482c305-7587-466a-bef4-ab15e6a70906", // Under £1k/mth
        "£1,000 to under £2,000": "20422aec-d6dd-4c76-8c34-fc60a00e0ea6", // £1-2.5k/mth
        "£5,000 to under £15,000": "7364943c-da47-4d59-bb44-e79faeeaac5a", // £5k+/mth
        "£15,000 or more": "7364943c-da47-4d59-bb44-e79faeeaac5a", // £5k+/mth
        "I do not know": "feaf2b0d-079a-4ffa-a48b-67e79c280458", // Unknown
      },
      contractValue: {},
    },
  },
  // Italy, IT and ICT firms (23 Oct 2026, wired 3 Nov 2026). The ClickUp list "IT - ITALY - Commission" sits in the CRM
  // folder with the nine statuses of "IT - UK - Commision", and the UK list's own fields were added to it as existing
  // fields (the fields are shared, not copied), so every field and option id below is the UK one. The Slack channel is
  // #leads-it. Aurora is not in ClickUp or Slack yet: nobody is assigned or pinged until her ids are filled in under
  // reviewer. With listId or slackChannel empty a run fails on purpose and shows in the run history; the lead itself
  // is safe in the function's store. The function answers 503 while the funnel's config says live: false, so no lead
  // reaches this entry before launch.
  // The ClickUp dropdowns are in pounds. Euro bands do not fit inside a pound band without a wrong bucket, so
  // ad spend and contract value are left empty (the exact answers are in the description). Specialism has no
  // currency and is set, team size only for "100 o più" (inside "50+"), "Non lo so" is "Unknown".
  "it-ict-growth": {
    label: "IT ITALY",
    listId: "1201270000004918", // IT - ITALY - Commission
    tag: "growth-it",
    peopleWord: "employees",
    lang: "en",
    reviewer: { clickupId: 0, slackId: "", name: "Aurora" }, // ids when she has been invited
    slackChannel: "C0CEKL5H4LC", // #leads-it
    register: false,
    phonePrefix: "39",
    otherSpecialism: "Altro",
    slackDetail: true,
    reasonText: {
      // not a fit
      turnover_below_1m: "turnover under €1m", // the limit since 3 Nov 2026
      turnover_below_2m: "turnover under €2m", // the limit before 3 Nov 2026: still on the leads made until then
      trading_under_2y: "under two years trading",
      value_under_10k: "client value under €10k",
      // review and fit (the codes of g/it-ict-growth/route.mjs; there is no register check in Italy)
      turnover_1m_2m: "turnover €1m to under €2m",
      spend_5k_plus: "marketing spend €5,000 a month or more (a call is worth having whatever else they said)",
      turnover_2m_plus: "turnover €2m or more",
      turnover_inferred: "turnover not stated, taken as €2m or more from headcount and marketing spend",
      turnover_not_stated: "turnover not stated",
      value_10k_to_25k: "client value €10k to under €25k",
      trading_2y_plus: "two years or more trading",
      register_not_used: "no company register check",
      register_off: "company register check switched off",
      capacity_none: "no capacity for new clients",
    },
    // The form's own words in English, for the Slack posts and the ClickUp description. The English is the UK form's
    // wording for the same position, with euro for pound. g/it-ict-growth/core.mjs is the source of the Italian words:
    // zap1-it.test.mjs fails if an option there has no entry here, or if an entry here is no option any more.
    answersEn: {
      "Strategia IT e trasformazione digitale": "IT strategy and digital transformation",
      "Servizi IT gestiti (MSP)": "Managed IT services (MSP)",
      "Sviluppo software": "Software development",
      "Dati e intelligenza artificiale": "Data and AI",
      "Cybersecurity": "Cybersecurity",
      "Altro": "Other",
      "Meno di 1 milione di €": "Under €1m",
      "Da 1 milione a meno di 2 milioni di €": "€1m to under €2m",
      "Da 2 a meno di 5 milioni di €": "€2m to under €5m",
      "Da 5 a meno di 10 milioni di €": "€5m to under €10m",
      "10 milioni di € o più": "€10m or more",
      "Preferisco non dirlo": "I would rather not say",
      "Meno di due anni": "Under two years",
      "Da due a cinque anni": "Two to five years",
      "Più di cinque anni": "More than five years",
      "Meno di 10": "Under 10",
      "Da 10 a 24": "10 to 24",
      "Da 25 a 49": "25 to 49",
      "Da 50 a 99": "50 to 99",
      "100 o più": "100 or more",
      "Meno di 1.000 €": "Under €1,000",
      "Da 1.000 € a meno di 5.000 €": "€1,000 to under €5,000",
      "Da 5.000 € a meno di 15.000 €": "€5,000 to under €15,000",
      "15.000 € o più": "€15,000 or more",
      "Non lo so": "I do not know",
      "Meno di 10.000 €": "Under €10k",
      "Da 10.000 € a meno di 25.000 €": "€10k to under €25k",
      "Da 25.000 € a meno di 50.000 €": "€25k to under €50k",
      "Da 50.000 € a meno di 150.000 €": "€50k to under €150k",
      "150.000 € o più": "€150k or more",
      "Meno di quattro settimane": "Under four weeks",
      "Da uno a meno di tre mesi": "One to under three months",
      "Da tre a sei mesi": "Three to six months",
      "Più di sei mesi": "Over six months",
      "Io": "Me",
      "Io, insieme a un socio o al consiglio": "Me, with a co-founder or board",
      "Qualcun altro, che coinvolgerei": "Someone else, I would bring them in",
      "Un processo di acquisto strutturato": "A procurement process",
      "Nessuno, siamo al limite": "None, we are at capacity",
      "Da uno a tre": "One to three",
      "Da quattro a dieci": "Four to ten",
      "Più di dieci": "More than ten",
    },
    field: {
      leadId: "08cf9ecc-ff51-4296-9e03-c5250ebb7abf",
      website: "09d8fbaa-d659-4b44-9738-39fcf5c6f25b",
      adSpend: "13229225-75e5-4729-bd8d-eb69c20e80b2",
      teamSize: "18957c8f-f573-4790-957c-11812dd3aa04",
      contractValue: "189cd0e5-2c7d-4c43-a94b-9ad280a4ad53",
      tier: "668b1a6a-4054-4b24-ac3c-55432d7c2b3e",
      email: "78c13487-0fee-46d2-893f-68b212b09e6b",
      crmItemType: "8289eaa9-7492-40eb-a35d-092c51bd01ac",
      contactName: "8fb666f4-c213-4f7a-a8ce-627e496a8313",
      phone: "a0c06e36-5028-4b86-af93-c57de3ad2418",
      specialism: "ce2deb01-0b47-45c6-8bf5-dbdc67f9962d",
      jobTitle: "cf254478-a92a-4805-921a-a89ba06c69a0",
      salesStage: "f4bfea58-b05c-4427-ba1c-b4aa61200583",
    },
    option: {
      crmItemType: "0b565b82-9090-45fa-8bf9-67f2a7d2eca3", // Lead
      salesStage: "819060db-e6c9-43ab-a7f9-be1322061f3f", // Lead Qualification
      tier: {
        fit: "153aea7a-a523-466a-997a-92e6b07e4c1f", // Tier 1
        review: "20a259b4-95a9-435f-86fa-88bf86d399cc", // Tier 2
        other: "1d991141-c31f-4a47-96c9-d6e2c025b29a", // Tier 3
      },
      specialism: {
        "Strategia IT e trasformazione digitale": "332d345f-0002-41e5-a3cc-b719e55bfbbb",
        "Servizi IT gestiti (MSP)": "cbb8af7b-befb-4b56-ae0e-e9018a52c022",
        "Sviluppo software": "a5ca2f30-4bd7-4386-bace-86a239c71ff1",
        "Dati e intelligenza artificiale": "3fae402c-d23a-4338-b521-9e6369cce72d",
        "Cybersecurity": "48ac62c8-c7cb-48cb-8093-44018f5ad333",
        "Altro": "a75ef23e-81ec-45a2-b98f-6fd366bd90f8",
      },
      teamSize: {
        "100 o più": "58ab0f8c-b644-4cac-a29f-69765732b3fa", // 50+
      },
      adSpend: {
        "Non lo so": "feaf2b0d-079a-4ffa-a48b-67e79c280458", // Unknown
      },
      contractValue: {},
    },
  },
  // The AI visibility retainer (6 Nov 2026): GEO and ChatGPT ads for UK companies with £1m or more in turnover, any
  // sector. The list "AI VISIBILITY - UK - Retainer" sits in the CRM folder with the statuses of the health and law
  // lists; lead_id and Nettside were added to it as the existing shared fields, the rest come from the folder. No Tier,
  // ad spend, team size or contract value dropdowns on this list: those stay empty (the answers are in the description).
  // The sector is sent as "specialism"; the IT Specialism dropdown is left alone.
  "uk-ai-visibility": {
    label: "UK AI VISIBILITY",
    listId: "1201270000005380", // AI VISIBILITY - UK - Retainer
    tag: "ai-visibility",
    peopleWord: "ansatte",
    slackDetail: true, // the sector, the website and why the lead was routed as it was belong in the post
    retainer: {
      block: "AI Visibility: fra £1 500 i måneden inkl. £500 i ChatGPT-annonser, månedlig fra start, 30 dagers oppsigelse. Ingen kommisjon og ingen garanti. Sondre er kontaktperson.",
      line: "AI Visibility fra £1 500/mnd inkl. £500 ChatGPT-annonser, ingen kommisjon",
    },
    field: {
      leadId: "08cf9ecc-ff51-4296-9e03-c5250ebb7abf",
      website: "09d8fbaa-d659-4b44-9738-39fcf5c6f25b",
      adSpend: "",
      teamSize: "",
      contractValue: "",
      tier: "",
      email: "78c13487-0fee-46d2-893f-68b212b09e6b",
      crmItemType: "8289eaa9-7492-40eb-a35d-092c51bd01ac",
      contactName: "8fb666f4-c213-4f7a-a8ce-627e496a8313",
      phone: "a0c06e36-5028-4b86-af93-c57de3ad2418",
      specialism: "",
      jobTitle: "cf254478-a92a-4805-921a-a89ba06c69a0",
      salesStage: "f4bfea58-b05c-4427-ba1c-b4aa61200583",
    },
    option: {
      crmItemType: "0b565b82-9090-45fa-8bf9-67f2a7d2eca3", // Lead
      salesStage: "819060db-e6c9-43ab-a7f9-be1322061f3f", // Lead Qualification
      tier: { fit: "", review: "", other: "" },
      specialism: {},
      teamSize: {},
      adSpend: {},
      contractValue: {},
    },
  },
};

// ---------------------------------------------------------------------------------------------
// The payload from the function: fixed keys, always all of them (empty when they do not apply)
// ---------------------------------------------------------------------------------------------

const KEYS = [
  "lead_id", "campaign", "route", "route_reason", "submitted_at",
  "company_name", "company_website", "company_number",
  "ch_status", "ch_accounts_type", "ch_incorporated", "ch_check",
  "specialism", "practice_areas", "sra_number",
  "regulator_number", "self_pay_share", "specialties", "first_consultation_value",
  "turnover_band", "trading_years", "employees_or_fee_earners", "marketing_spend",
  "first_year_value", "sales_cycle", "target_next_year", "decision_maker", "capacity",
  "meeting_goal",
  "first_name", "last_name", "job_title", "email", "mobile",
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "fbclid", "page_slug", "referrer",
  "entry", "commission_promised",
] as const;

type Lead = Record<(typeof KEYS)[number], string>;

const Scalar = z.union([z.string(), z.number(), z.boolean()]).nullable().optional();
const shape: Record<string, z.ZodTypeAny> = {};
for (const key of KEYS) shape[key] = Scalar;
const LeadSchema = z
  .object({
    ...shape,
    lead_id: z.string().min(3),
    campaign: z.string().min(1),
    route: z.string().min(1),
    slack_test: Scalar,
    event: Scalar,
    interest_at: Scalar,
  })
  .loose();

// The hook may hand the payload over as it is, as a JSON string, or inside a wrapper.
function unwrap(raw: unknown): unknown {
  let value: unknown = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return value;
    }
  }
  const seen = new Set<unknown>();
  const find = (node: unknown, depth: number): unknown => {
    if (!node || typeof node !== "object" || seen.has(node) || depth > 3) return null;
    seen.add(node);
    const rec = node as Record<string, unknown>;
    if (typeof rec.lead_id === "string") return rec;
    for (const k of Object.keys(rec)) {
      const hit = find(rec[k], depth + 1);
      if (hit) return hit;
    }
    return null;
  };
  return find(value, 0) ?? value;
}

function clean(v: unknown, max = 400): string {
  const s = v === null || v === undefined ? "" : String(v);
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    out += code < 32 || code === 127 ? " " : ch;
  }
  return out.trim().slice(0, max);
}

function toLead(raw: Record<string, unknown>): Lead {
  const lead = {} as Record<string, string>;
  for (const key of KEYS) lead[key] = clean(raw[key], key === "referrer" || key === "meeting_goal" ? 600 : 400);
  return lead as Lead;
}

function has(map: Record<string, string>, key: string): string {
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : "";
}

function truthy(v: unknown): boolean {
  return v === true || v === "true" || v === "yes" || v === "1" || v === 1;
}

function personName(lead: Lead): string {
  return [lead.first_name, lead.last_name].filter(Boolean).join(" ");
}

function validEmail(v: string): string {
  return v.includes("@") && !v.includes(" ") && v.length <= 254 ? v : "";
}

function websiteUrl(v: string): string {
  if (!v || v.includes(" ")) return "";
  const url = v.startsWith("http://") || v.startsWith("https://") ? v : `https://${v}`;
  return url.length <= 300 && url.includes(".") ? url : "";
}

function normalizePhone(v: string, country = "44"): string {
  let digits = "";
  for (const ch of v) if (ch >= "0" && ch <= "9") digits += ch;
  if (country === "44" && digits.startsWith("440")) digits = `44${digits.slice(3)}`;
  const inRange = (d: string) => d.length >= 8 && d.length <= 15;
  if (v.trim().startsWith("+")) return inRange(digits) ? `+${digits}` : "";
  if (digits.startsWith("00")) return inRange(digits.slice(2)) ? `+${digits.slice(2)}` : "";
  if (country === "44" && digits.startsWith("0") && digits.length === 11) return `+44${digits.slice(1)}`;
  // Italy keeps the leading 0 of a landline when it is dialled from abroad; a mobile starts with 3 and has 9 or 10 digits.
  if (country === "39") {
    if (digits.startsWith("3") && digits.length >= 9 && digits.length <= 10) return `+39${digits}`;
    if (digits.startsWith("0") && digits.length >= 6 && digits.length <= 11) return `+39${digits}`;
  }
  return "";
}

// ---------------------------------------------------------------------------------------------
// ClickUp
// ---------------------------------------------------------------------------------------------

type Reply = { ok: boolean; status: number; json: any; text: string };

async function clickup(method: string, path: string, body?: unknown): Promise<Reply> {
  const init: Record<string, unknown> = { connection: CLICKUP, method };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const res = await sdk.fetch(`${CLICKUP_API}${path}`, init as any);
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // not JSON
  }
  return { ok: res.ok, status: res.status, json, text: text.slice(0, 400) };
}

function taskLink(id: string, url: unknown): string {
  const u = typeof url === "string" ? url : "";
  return u.startsWith("https://app.clickup.com/") ? u : `https://app.clickup.com/t/${id}`;
}

// The task for this lead_id, if there is one. Checks the value on what comes back, so a search
// that ignored the filter could never be mistaken for a match.
async function findTask(c: Campaign, leadId: string): Promise<{ id: string; url: string; tags: string[] } | null> {
  const filter = encodeURIComponent(JSON.stringify([{ field_id: c.field.leadId, operator: "=", value: leadId }]));
  const r = await clickup("GET", `/list/${c.listId}/task?custom_fields=${filter}&include_closed=true&page=0`);
  if (!r.ok) throw new Error(`ClickUp search failed: HTTP ${r.status} ${r.text}`);
  const tasks: any[] = r.json?.tasks ?? [];
  for (const task of tasks) {
    const value = (task.custom_fields ?? []).find((f: any) => f.id === c.field.leadId)?.value;
    if (value === leadId) {
      const tags = (task.tags ?? []).map((tag: any) => String(tag?.name ?? "").toLowerCase());
      return { id: String(task.id), url: taskLink(String(task.id), task.url), tags };
    }
  }
  return null;
}

function customFields(c: Campaign, lead: Lead, route: RouteRule): { id: string; value: string }[] {
  const out: { id: string; value: string }[] = [];
  const add = (id: string, value: string) => {
    if (id && value) out.push({ id, value });
  };
  const otherWord = c.otherSpecialism ?? "Other";
  const specialism = lead.specialism.startsWith(otherWord) ? otherWord : lead.specialism;
  add(c.field.leadId, lead.lead_id);
  add(c.field.crmItemType, c.option.crmItemType);
  add(c.field.salesStage, c.option.salesStage);
  add(c.field.tier, c.option.tier[route.tier]);
  add(c.field.contactName, personName(lead));
  add(c.field.email, validEmail(lead.email));
  add(c.field.jobTitle, lead.job_title);
  add(c.field.website, websiteUrl(lead.company_website));
  add(c.field.specialism, has(c.option.specialism, specialism));
  add(c.field.teamSize, has(c.option.teamSize, lead.employees_or_fee_earners));
  add(c.field.adSpend, has(c.option.adSpend, lead.marketing_spend));
  add(c.field.contractValue, has(c.option.contractValue, lead.first_year_value));
  return out;
}

// The free text answer is the visitor's own words. It is shown as a quote so that nothing in it
// can be read as markdown structure, and so the routines that read the description find it under
// a heading of its own.
function goalBlock(lead: Lead): string {
  if (!lead.meeting_goal) return "";
  const quoted = lead.meeting_goal.split("\n").map((l) => `> ${l}`).join("\n");
  return ["**What do you want to get out of this meeting?**", quoted].join("\n");
}

// The form's own answer word in English, for a campaign that has a table for it (Italy). "Altro: text" keeps the
// visitor's text after the English word. A word the table does not know is shown as it came in, never dropped.
function english(c: Campaign, value: string): string {
  const map = c.answersEn;
  if (!map || !value) return value;
  if (Object.prototype.hasOwnProperty.call(map, value)) return map[value];
  const other = c.otherSpecialism;
  if (other && value.startsWith(`${other}: `) && Object.prototype.hasOwnProperty.call(map, other)) {
    return `${map[other]}: ${value.slice(other.length + 2)}`;
  }
  return value;
}

// The ClickUp description is the record: the English first, the visitor's own word after it in brackets.
function withOriginal(c: Campaign, value: string): string {
  const en = english(c, value);
  return en === value ? value : `${en} (${value})`;
}

function describe(c: Campaign, lead: Lead, route: RouteRule, isTest: boolean): string {
  const t = (no: string) => tr(c, no);
  const of = (value: string) => withOriginal(c, value);
  const row = (label: string, value: string) => (value ? `- ${t(label)}: ${value}` : "");
  const block = (title: string, rows: string[]) => {
    const body = rows.filter(Boolean);
    return body.length ? [`**${t(title)}**`, ...body].join("\n") : "";
  };
  const withRegister = c.register !== false;
  const number = /^[A-Za-z0-9]{6,10}$/.test(lead.company_number)
    ? `[${lead.company_number}](https://find-and-update.company-information.service.gov.uk/company/${lead.company_number})`
    : lead.company_number;
  const register = [
    number,
    lead.ch_status,
    lead.ch_accounts_type && `regnskap: ${lead.ch_accounts_type}`,
    lead.ch_incorporated && `stiftet ${lead.ch_incorporated}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const sections = [
    `**${t(route.heading)}** · ${c.label}${isTest ? " · TEST" : ""} · ${t("skjema levert")} ${lead.submitted_at}`,
    c.retainer ? `**💼 RETAINER**\n${c.retainer.block}` : "",
    openTerms(lead)
      ? `**⚠ ${t("INGEN KOMMISJON LOVET")}**\n${tr(
          c,
          "Skjemaet sto på en side som ikke sier noe om hvordan vi tar betalt ({entry}). Ingen har lovet denne leaden kommisjon: vi står fritt til retainer eller kommisjon, og {name} velger modell i møtet. Ikke nevn kommisjon før det.",
          { entry: lead.entry || "?", name: reviewerOf(c).name },
        )}`
      : "",
    block("Selskap", [
      row("Navn", lead.company_name),
      row("Nettside", lead.company_website),
      withRegister ? row("Companies House", register) : "",
      withRegister ? row("Sjekk mot registeret", lead.ch_check) : "",
    ]),
    block("Svar i skjemaet", [
      row("Spesialisering", of(lead.specialism)),
      row("Fagområder", lead.practice_areas),
      row("SRA-nummer", lead.sra_number),
      row("Registreringsnummer hos tilsynet", lead.regulator_number),
      row("Spesialiteter", lead.specialties),
      row("Andel selvbetalende", lead.self_pay_share),
      row("Verdi av førstekonsultasjon", lead.first_consultation_value),
      row("Omsetning", of(lead.turnover_band)),
      row("Hvor lenge i drift", of(lead.trading_years)),
      row("Antall folk", of(lead.employees_or_fee_earners)),
      row("Markedsføring per måned", of(lead.marketing_spend)),
      row("Verdi første år", of(lead.first_year_value)),
      row("Salgssyklus", of(lead.sales_cycle)),
      row("Mål neste år", lead.target_next_year),
      row("Beslutter", of(lead.decision_maker)),
      row("Kapasitet", of(lead.capacity)),
    ]),
    goalBlock(lead),
    block("Kontakt", [
      row("Navn", personName(lead)),
      row("Rolle", lead.job_title),
      row("E-post", lead.email),
      row("Mobil", lead.mobile),
    ]),
    block("Ruting", [row("Rute", lead.route), row("Årsaker", lead.route_reason)]),
    block("Kilde", [
      row("utm_source", lead.utm_source),
      row("utm_medium", lead.utm_medium),
      row("utm_campaign", lead.utm_campaign),
      row("utm_content", lead.utm_content),
      row("utm_term", lead.utm_term),
      row("fbclid", lead.fbclid),
      row("Side", lead.page_slug),
      row("Referrer", lead.referrer),
      row("Skjema på", lead.entry),
    ]),
    `lead_id: ${lead.lead_id}`,
  ];
  return sections.filter(Boolean).join("\n\n");
}

// ---------------------------------------------------------------------------------------------
// Slack: what a person needs to decide, plus the visitor's own words about the meeting.
// No phone, no e-mail.
// ---------------------------------------------------------------------------------------------

function slackText(c: Campaign, lead: Lead, route: RouteRule, taskUrl: string, isTest: boolean): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const t = (no: string) => tr(c, no);
  const en = (value: string) => english(c, value);
  const detail = c.slackDetail === true;
  const head = `${isTest ? "[TEST] " : ""}*${t(route.heading)}* · ${c.label} · ${esc(lead.company_name || t("uten navn"))}`;
  const people = lead.employees_or_fee_earners ? `${en(lead.employees_or_fee_earners)} ${c.peopleWord}` : "";
  const year = lead.ch_incorporated.slice(0, 4);
  let register = "";
  if (c.register === false) {
    // a country without a register lookup says nothing about one
  } else if (lead.ch_check === "ok" || lead.ch_check === "mismatch") {
    register = `Companies House: ${lead.ch_accounts_type || "ukjent regnskapstype"}${year ? `, stiftet ${year}` : ""}`;
  } else if (lead.ch_check === "not_found") {
    register = "Companies House: ikke funnet";
  } else if (lead.ch_check === "timeout") {
    register = "Companies House: ikke sjekket (tidsavbrudd)";
  } else {
    register = "Companies House: ikke sjekket";
  }
  const turnover = detail && lead.turnover_band ? `${t("Omsetning")}: ${en(lead.turnover_band)}` : en(lead.turnover_band);
  const line2 = [turnover, people, register].filter(Boolean).join(" · ");
  // Only with slackDetail: what the firm does and how long it has traded.
  const profile = detail
    ? [lead.specialism && `${t("Spesialisering")}: ${en(lead.specialism)}`, lead.trading_years && `${t("Hvor lenge i drift")}: ${en(lead.trading_years)}`]
        .filter(Boolean)
        .join(" · ")
    : "";
  const line3 = [
    lead.marketing_spend && `${t("Markedsføring per måned")}: ${en(lead.marketing_spend)}`,
    lead.first_year_value && `${t("Verdi første år")}: ${en(lead.first_year_value)}`,
    lead.first_consultation_value && `${t("Verdi førstekonsultasjon")}: ${lead.first_consultation_value}`,
    lead.self_pay_share && `${t("Selvbetalende")}: ${lead.self_pay_share}`,
    lead.specialties && `${t("Spesialiteter")}: ${lead.specialties}`,
    lead.practice_areas && `${t("Fagområder")}: ${lead.practice_areas}`,
    lead.sales_cycle && `${t("Salgssyklus")}: ${en(lead.sales_cycle)}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const line4 = [lead.capacity && `${t("Kapasitet")}: ${en(lead.capacity)}`, lead.decision_maker && `${t("Beslutter")}: ${en(lead.decision_maker)}`]
    .filter(Boolean)
    .join(" · ");
  // Only with slackDetail: the target in the visitor's own words, why the lead was routed as it was, the website.
  const target = detail && lead.target_next_year ? `${t("Mål neste år")}: ${lead.target_next_year}` : "";
  const reasons = detail ? reasonsShown(c, lead) : "";
  const why = reasons ? `${t("Hvorfor")}: ${reasons}` : "";
  const website = detail && lead.company_website ? `${t("Nettside")}: ${lead.company_website}` : "";
  let goal = "";
  if (lead.meeting_goal) {
    const flat = lead.meeting_goal.replace(/\s+/g, " ").trim();
    const cut = flat.length > SLACK_GOAL_MAX ? `${flat.slice(0, SLACK_GOAL_MAX - 1).trimEnd()}…` : flat;
    goal = `${t("Vil ha ut av møtet")}: _${esc(cut)}_`;
  }
  const source = [lead.utm_source, lead.utm_content].filter(Boolean).join(" / ") || t("ukjent");
  const lines = [
    head,
    openLine(c, lead),
    esc(line2),
    esc(profile),
    esc(line3),
    esc(line4),
    esc(target),
    esc(why),
    goal,
    esc(website),
    `${t("Kilde")}: ${esc(source)}`,
    `ClickUp: <${taskUrl}|${t("åpne oppgaven")}>`,
  ];
  if (c.register !== false && (lead.ch_check === "mismatch" || lead.ch_check === "timeout" || lead.ch_check === "not_found")) {
    lines.push(t("⚠ Størrelse ikke bekreftet, sjekk før møtet"));
  }
  if (lead.route_reason.includes("fertility")) lines.push(t("⚠ Fertilitet: HFEA-regulert, sjekk før annonser"));
  if (lead.route_reason.includes("personal_injury_ticked")) lines.push(t("⚠ Personskade er krysset av: avtalen må unnta personskadesaker"));
  if (lead.route_reason.includes("legal_no_chatgpt_ads")) lines.push("⚠ Juss: OpenAI tar ikke annonser for juridiske tjenester, bare GEO-delen kan selges");
  if (lead.route_reason.includes("health_ads_check")) lines.push("⚠ Helse: sjekk OpenAIs annonseregler for tjenesten før møtet");
  return lines.filter(Boolean).join("\n");
}

// What the function's reason codes mean, for the one-line "not a fit" post. An unknown code is shown as it is.
const REASON_TEXT: Record<string, string> = {
  turnover_below_2m: "omsetning under £2m",
  turnover_below_5m: "omsetning under £5m",
  trading_under_2y: "under to år i drift",
  value_under_10k: "kundeverdi under £10k",
  value_under_500: "førstekonsultasjon under £500",
  self_pay_under_10pc: "under 10 % selvbetalende",
  personal_injury_only: "bare personskade",
  turnover_below_1m: "omsetning under £1m",
  spend_under_1k: "markedsføring under £1 000 i måneden",
  spend_under_3k: "markedsføring under £3 000 i måneden",
  budget_2k_no: "kan ikke sette av £2 000 i måneden til annonser",
  ch_micro_or_dormant: "mikro eller sovende regnskap",
};

// Codes that mark a lead rather than refuse it. They stay in the description and the full post, never in "Grunn".
const FLAGS = new Set(["fertility", "personal_injury_ticked", "value_under_2k_volume_firm"]);

const slackEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The second line of every Slack post about a lead nobody promised commission. Empty for the others.
function openLine(c: Campaign, lead: Lead): string {
  if (c.retainer) return `💼 *RETAINER* · ${slackEscape(c.retainer.line)}`;
  if (!openTerms(lead)) return "";
  const rest = tr(c, "fri til retainer eller kommisjon, {name} velger i møtet (via {entry})", { entry: lead.entry || "?", name: reviewerOf(c).name });
  return `⚠ *${tr(c, "INGEN KOMMISJON LOVET")}* · ${slackEscape(rest)}`;
}

// The function's reason codes in the words of the country. A flag is not a reason, and a code that is not known is
// shown as it is.
function reasonsShown(c: Campaign, lead: Lead): string {
  const reasons = c.reasonText ?? REASON_TEXT;
  return lead.route_reason
    .split(",")
    .map((code) => code.trim())
    .filter((code) => code && !FLAGS.has(code))
    .map((code) => (Object.prototype.hasOwnProperty.call(reasons, code) ? reasons[code] : code))
    .join(", ");
}

// Not a fit: short, no ping. The assignment in ClickUp is what tells Sondre. With slackDetail the website is in the
// post too: the reviewer decides from it whether a website or a retainer could suit the firm.
function slackCompact(c: Campaign, lead: Lead, route: RouteRule, taskUrl: string, isTest: boolean): string {
  const people = lead.employees_or_fee_earners ? `${english(c, lead.employees_or_fee_earners)} ${c.peopleWord}` : "";
  const why = reasonsShown(c, lead);
  const head = `${isTest ? "[TEST] " : ""}*${tr(c, route.heading)}* · ${c.label} · ${slackEscape(lead.company_name || tr(c, "uten navn"))}`;
  const line2 = [english(c, lead.turnover_band), people, why && `${tr(c, "Grunn")}: ${why}`].filter(Boolean).join(" · ");
  const website = c.slackDetail === true && lead.company_website ? `${tr(c, "Nettside")}: ${lead.company_website}` : "";
  return [
    head,
    openLine(c, lead),
    slackEscape(line2),
    slackEscape(website),
    `${tr(c, "{name} vurderer nettside eller retainer", { name: reviewerOf(c).name })} · ClickUp: <${taskUrl}|${tr(c, "åpne oppgaven")}>`,
  ]
    .filter(Boolean)
    .join("\n");
}

// The visitor pressed "Yes, send me a quote". This one does ping Sondre (not on a test lead).
function slackInterest(c: Campaign, lead: Lead, taskUrl: string, isTest: boolean): string {
  const rev = reviewerOf(c);
  const who = isTest || !rev.slackId ? rev.name : `<@${rev.slackId}>`;
  const head = `${isTest ? "[TEST] " : ""}*${tr(c, "ØNSKER NETTSIDETILBUD")}* · ${c.label} · ${slackEscape(lead.company_name || tr(c, "uten navn"))}`;
  return [head, openLine(c, lead), `${tr(c, "{who} sender ett tilbud på e-post innen to virkedager", { who })} · ClickUp: <${taskUrl}|${tr(c, "åpne oppgaven")}>`]
    .filter(Boolean)
    .join("\n");
}

function interestComment(c: Campaign, lead: Lead): string {
  const to = validEmail(lead.email) ? tr(c, " til {email}", { email: validEmail(lead.email) }) : "";
  return [
    tr(c, "Ønsker tilbud på ny nettside eller månedlig retainer. Trykket på knappen på siden «ikke treff»."),
    tr(c, "Send ett tilbud på e-post{to} innen to virkedager.", { to }),
  ].join("\n");
}

// ---------------------------------------------------------------------------------------------
// The workflow
// ---------------------------------------------------------------------------------------------

type TaskRef = { id: string; url: string; existed: boolean; fieldsDropped: string };

// Looks again right before creating, so a retry never makes a second task.
async function createTask(
  campaign: Campaign,
  lead: Lead,
  route: RouteRule,
  fields: { id: string; value: string }[],
  isTest: boolean,
): Promise<TaskRef> {
  const existing = await findTask(campaign, lead.lead_id);
  if (existing) return { id: existing.id, url: existing.url, existed: true, fieldsDropped: "" };
  const name = (campaign.retainer ? RETAINER_PREFIX : openTerms(lead) ? OPEN_PREFIX : "") + ([lead.company_name, personName(lead)].filter(Boolean).join(" · ") || lead.lead_id);
  const body: Record<string, unknown> = {
    name,
    markdown_description: describe(campaign, lead, route, isTest),
    status: route.status,
    tags: [campaign.tag, ...route.tags, ...(campaign.retainer ? [RETAINER_TAG] : openTerms(lead) ? [OPEN_TAG] : []), ...(isTest ? ["test"] : [])],
    custom_fields: fields,
  };
  if (route.priority !== null) body.priority = route.priority;
  if (route.reviewer && !isTest && reviewerOf(campaign).clickupId) body.assignees = [reviewerOf(campaign).clickupId];
  if (route.dueInDays > 0) {
    body.due_date = Date.now() + route.dueInDays * DAY_MS;
    body.due_date_time = false;
  }
  let r = await clickup("POST", `/list/${campaign.listId}/task`, body);
  let fieldsDropped = "";
  if (r.status === 400 && fields.length > 0) {
    // A custom field ClickUp does not accept (a deleted option, say) must not cost us the lead.
    fieldsDropped = r.text;
    const { custom_fields: _dropped, ...withoutFields } = body;
    r = await clickup("POST", `/list/${campaign.listId}/task`, withoutFields);
  }
  if (!r.ok) throw new Error(`ClickUp create failed: HTTP ${r.status} ${r.text}`);
  const id = String(r.json?.id ?? "");
  if (!id) throw new Error("ClickUp create returned no task id.");
  return { id, url: taskLink(id, r.json?.url), existed: false, fieldsDropped };
}

// Adds a tag to a task that exists. A tag ClickUp does not know yet is made in the list's space and the add is tried once more.
async function addTag(campaign: Campaign, taskId: string, tag: string): Promise<{ tagged: boolean; status: number }> {
  const path = `/task/${taskId}/tag/${encodeURIComponent(tag)}`;
  let r = await clickup("POST", path);
  if (r.status >= 500) throw new Error(`ClickUp tag failed: HTTP ${r.status} ${r.text}`); // the step tries again
  if (!r.ok && r.status >= 400) {
    try {
      const list = await clickup("GET", `/list/${campaign.listId}`);
      const spaceId = String(list.json?.space?.id ?? "");
      if (spaceId) {
        await clickup("POST", `/space/${spaceId}/tag`, { tag: { name: tag, tag_fg: "#ffffff", tag_bg: "#2e7d32" } });
        r = await clickup("POST", path);
      }
    } catch {
      // the first answer stands
    }
  }
  return { tagged: r.ok, status: r.status };
}

// The quote button. The task is found, or made when the application never reached ClickUp, then tagged, commented and announced.
// The same press delivered twice does nothing the second time (the tag is the memory).
async function interest(
  ctx: any,
  campaign: Campaign,
  lead: Lead,
  route: RouteRule,
  fields: { id: string; value: string }[],
  isTest: boolean,
  slackTest: boolean,
): Promise<Record<string, unknown>> {
  const found = await ctx.step({
    name: "find-or-create-clickup-task",
    maxAttempts: 3,
    retryDelaySeconds: 10,
    run: async () => {
      const existing = await findTask(campaign, lead.lead_id);
      if (existing) return { id: existing.id, url: existing.url, created: false, already: existing.tags.includes(INTEREST_TAG), fieldsDropped: "" };
      const made = await createTask(campaign, lead, route, fields, isTest);
      return { id: made.id, url: made.url, created: true, already: false, fieldsDropped: made.fieldsDropped };
    },
  });
  if (found.already) {
    return { lead_id: lead.lead_id, campaign: lead.campaign, event: INTEREST_EVENT, deduped: true, taskId: found.id, taskUrl: found.url };
  }

  const tag = await ctx.step({
    name: "tag-website-interest",
    maxAttempts: 3,
    retryDelaySeconds: 10,
    run: async () => addTag(campaign, found.id, INTEREST_TAG),
  });

  const comment = await ctx.step({
    name: "comment-website-interest",
    maxAttempts: 3,
    retryDelaySeconds: 10,
    run: async () => {
      const r = await clickup("POST", `/task/${found.id}/comment`, { comment_text: interestComment(campaign, lead), notify_all: !isTest });
      if (!r.ok) throw new Error(`ClickUp comment failed: HTTP ${r.status} ${r.text}`);
      return { commented: true };
    },
  });

  const message = slackInterest(campaign, lead, found.url, isTest);
  let slack: Record<string, unknown> = { posted: false, reason: "test lead" };
  if (isTest) slack.preview = message;
  if (!isTest || slackTest) {
    slack = await ctx.step({
      name: "post-website-interest-to-slack",
      maxAttempts: 3,
      retryDelaySeconds: 10,
      run: async () => {
        const result = await sdk.runAction({
          appKey: "SlackCLIAPI",
          actionType: "write",
          actionKey: "channel_message",
          connection: SLACK,
          inputs: { channel: channelOf(campaign), text: message, as_bot: "yes", unfurl: "no", link_names: "no", add_edit_link: "no" },
        });
        const first: any = result.data?.[0] ?? {};
        return { posted: true, ts: first.ts ?? null, channel: first.channel ?? null };
      },
    });
  }

  return {
    lead_id: lead.lead_id,
    campaign: lead.campaign,
    event: INTEREST_EVENT,
    test: isTest,
    deduped: false,
    taskId: found.id,
    taskUrl: found.url,
    taskCreated: found.created,
    tagged: tag.tagged,
    tagStatus: tag.status,
    commented: comment.commented,
    slack,
  };
}

// ---------------------------------------------------------------------------------------------
// Booking reminders
// ---------------------------------------------------------------------------------------------

// A first name or a company name goes into an e-mail only when it looks like one. The form is public: somebody
// could put a link or a sales line in those fields and have us send it to an address that is not theirs.
function mailWord(v: string, max: number, name = false): string {
  const s = v.trim();
  if (!s || s.length > max) return "";
  if (/[<>@\/\\{}\[\]|:;=]/.test(s) || /https?|www\./i.test(s)) return "";
  if (name && /[0-9.,!?]/.test(s)) return "";
  return s;
}

// The lead's own booking page. The lead id ties the booking to the task (Zap 2 reads it back from Calendly);
// utm_medium=reminder tells the page that this visit is not a new qualified form.
function bookingLink(campaignKey: string, leadId: string, hours: number): string {
  return `${REMIND_SITE}/g/${campaignKey}/book/?lead_id=${encodeURIComponent(leadId)}&utm_source=email&utm_medium=reminder&utm_campaign=booking_${hours}h`;
}

function reminderMail(campaignKey: string, lead: Lead, index: number): { subject: string; body: string } {
  const r = REMIND[campaignKey];
  const t = REMIND_MAIL[r.lang];
  const mail = t.mails[index];
  const first = mailWord(lead.first_name, 40, true);
  const vars: [string, string][] = [
    ["hi", first ? t.hi : t.hiNoName],
    ["first", first],
    ["company", mailWord(lead.company_name, 80) || t.company],
    ["offer", r.offer],
    ["prep", r.prep],
    ["host", r.host],
    ["link", bookingLink(campaignKey, lead.lead_id, REMIND_HOURS[index])],
  ];
  const fill = (text: string): string => {
    let out = text;
    for (const [k, v] of vars) out = out.split(`{${k}}`).join(v);
    return out;
  };
  return {
    subject: fill(first ? mail.subject : mail.subjectNoName ?? mail.subject),
    body: `${fill(mail.body)}\n\n${r.sign}\nElevate Marketing\n\n${t.foot}`,
  };
}

type ReminderEntry = { n: number; hours: number; action: "sent" | "not_sent" | "skipped" | "stopped" | "preview"; reason?: string; status?: string; noted?: boolean };

// The reminders of one fit lead. Every step here answers with a value instead of throwing, so a ClickUp or
// Outlook error can never fail a run whose lead is already safe in ClickUp. The waits and the steps themselves
// are not wrapped in try and catch: the runtime must be free to pause the run there.
async function remind(
  ctx: any,
  campaignKey: string,
  campaign: Campaign,
  lead: Lead,
  taskId: string,
  isTest: boolean,
  parsed: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const total = REMIND_HOURS.length;
  if (!REMIND_ON) return { on: false, reason: "switched off" };
  if (!Object.prototype.hasOwnProperty.call(REMIND, campaignKey)) return { on: false, reason: "the campaign has no REMIND entry" };
  const to = validEmail(lead.email);
  if (!to) return { on: false, reason: "no usable e-mail address" };

  // A test lead: no wait and no e-mail, the four e-mails come back as text. With reminder_test_seconds a draft
  // run takes the real path with seconds for hours, and with reminder_test_send the e-mails go to REMIND_TEST_TO.
  const testGap = isTest ? Math.floor(Number(parsed.reminder_test_seconds)) : NaN;
  const realPath = !isTest || (testGap >= 1 && testGap <= 30);
  if (!realPath) {
    return { on: true, test: true, sent: 0, preview: REMIND_HOURS.map((hours, i) => ({ n: i + 1, hours, ...reminderMail(campaignKey, lead, i) })) };
  }
  const testSend = isTest && truthy(parsed.reminder_test_send);

  const started: number = await ctx.step({ name: "start-booking-reminders", run: async () => Date.now() });
  const submitted = Date.parse(lead.submitted_at);
  const base = !isTest && Number.isFinite(submitted) && submitted <= started && started - submitted < 7 * DAY_MS ? submitted : started;
  const log: ReminderEntry[] = [];
  let cursor = started;
  let sentCount = 0;

  for (let i = 0; i < total; i++) {
    const n = i + 1;
    const hours = REMIND_HOURS[i];
    const due = isTest ? started + n * testGap * 1000 : base + hours * 60 * 60 * 1000;
    if (due < cursor) {
      log.push({ n, hours, action: "skipped", reason: "its time had passed when the lead arrived" });
      continue;
    }
    let left = Math.ceil((due - cursor) / 1000);
    for (let part = 1; left > 0; part++) {
      const chunk = Math.min(left, REMIND_MAX_WAIT_S);
      await ctx.wait(`wait-before-reminder-${n}-part-${part}`, chunk);
      left -= chunk;
    }
    cursor = due;

    const state: { ok: boolean; status: string; gone: boolean } = await ctx.step({
      name: `check-booking-before-reminder-${n}`,
      run: async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const r = await clickup("GET", `/task/${taskId}`);
            if (r.ok) return { ok: true, status: String(r.json?.status?.status ?? "").toLowerCase(), gone: Boolean(r.json?.archived) };
          } catch {
            // tried again below
          }
        }
        return { ok: false, status: "", gone: false };
      },
    });
    if (!state.ok) {
      log.push({ n, hours, action: "skipped", reason: "ClickUp could not be read, so nothing was sent" });
      continue;
    }
    if (state.gone || state.status !== REMIND_STATUS) {
      log.push({ n, hours, action: "stopped", status: state.gone ? "archived" : state.status });
      break;
    }

    const mail = reminderMail(campaignKey, lead, i);
    if (isTest && !testSend) {
      log.push({ n, hours, action: "preview", status: state.status });
      continue;
    }
    // One attempt: a second try after an answer that got lost could send the same e-mail twice.
    const sent: { sent: boolean; error: string } = await ctx.step({
      name: `send-reminder-${n}`,
      run: async () => {
        try {
          await sdk.runAction({
            appKey: "MicrosoftOutlookCLIAPI",
            actionType: "write",
            actionKey: "send_email",
            connection: OUTLOOK,
            inputs: {
              sender: REMIND_FROM,
              recipients: [isTest ? REMIND_TEST_TO : to],
              replyTo: [REMIND[campaignKey].replyTo],
              subject: (isTest ? "[TEST] " : "") + mail.subject,
              body: mail.body,
              bodyFormat: "Text",
            },
          });
          return { sent: true, error: "" };
        } catch (e) {
          return { sent: false, error: clean((e as any)?.message ?? e, 200) || "unknown error" };
        }
      },
    });
    if (sent.sent) sentCount++;

    const note: { noted: boolean } = await ctx.step({
      name: `note-reminder-${n}`,
      run: async () => {
        const vars = { n: String(n), total: String(total), hours: String(hours), error: sent.error };
        const text = sent.sent
          ? tr(campaign, "Påminnelse {n} av {total} om å booke møte er sendt på e-post ({hours} t etter skjemaet).", vars)
          : tr(campaign, "Påminnelse {n} av {total} om å booke møte ble ikke sendt: {error}", vars);
        try {
          const r = await clickup("POST", `/task/${taskId}/comment`, { comment_text: text, notify_all: false });
          return { noted: r.ok };
        } catch {
          return { noted: false };
        }
      },
    });
    log.push({ n, hours, action: sent.sent ? "sent" : "not_sent", status: state.status, noted: note.noted });
  }

  return { on: true, test: isTest, sent: sentCount, log };
}

const workflow = defineDurable<unknown, unknown>("leads-v3-skjema-til-clickup-og-slack", async (ctx, rawInput) => {
  // Validate before anything is written. An unknown campaign or route fails the run on purpose,
  // so it shows in the run history and the e-mail alert instead of vanishing.
  const parsed = LeadSchema.parse(unwrap(rawInput));
  const lead = toLead(parsed as Record<string, unknown>);
  const campaign = Object.prototype.hasOwnProperty.call(CAMPAIGNS, lead.campaign) ? CAMPAIGNS[lead.campaign] : null;
  if (!campaign) throw new Error(`Unknown campaign "${lead.campaign}". Add it to CAMPAIGNS.`);
  if (!campaign.listId) throw new Error(`Campaign "${lead.campaign}" has no ClickUp list yet. Duplicate IT - UK - Commision and fill in CAMPAIGNS.`);
  if (!channelOf(campaign)) throw new Error(`Campaign "${lead.campaign}" has no Slack channel yet. Make the channel and fill in slackChannel in CAMPAIGNS.`);
  const routeKey = lead.route.toLowerCase();
  const route = Object.prototype.hasOwnProperty.call(ROUTES, routeKey) ? ROUTES[routeKey] : null;
  if (!route) throw new Error(`Unknown route "${lead.route}".`);

  const isTest = lead.email.toLowerCase().endsWith("@example.invalid");
  const fields = customFields(campaign, lead, route);

  // The visitor pressed the quote button on the "not a fit" page: a different branch, below.
  if (clean(parsed.event, 40) === INTEREST_EVENT) {
    if (routeKey !== "not_a_fit") throw new Error(`${INTEREST_EVENT} for a lead routed "${lead.route}". Only not_a_fit leads can ask for a quote.`);
    return await interest(ctx, campaign, lead, route, fields, isTest, truthy(parsed.slack_test));
  }

  // 1. The task. Looks again right before creating, so a retry never makes a second one.
  const task = await ctx.step({
    name: "create-clickup-task",
    maxAttempts: 3,
    retryDelaySeconds: 10,
    run: async () => createTask(campaign, lead, route, fields, isTest),
  });

  // The same lead_id again (a second delivery): the task is there, nothing more to do.
  if (task.existed) {
    return { lead_id: lead.lead_id, campaign: lead.campaign, route: lead.route, deduped: true, taskId: task.id, taskUrl: task.url };
  }

  // 2. Slack, straight after the task exists. Fit and review only; test leads only on request.
  const slackMessage = route.slack
    ? route.compact
      ? slackCompact(campaign, lead, route, task.url, isTest)
      : slackText(campaign, lead, route, task.url, isTest)
    : "";
  let slack: Record<string, unknown> = { posted: false, reason: route.slack ? "test lead" : `route ${lead.route}` };
  if (route.slack && isTest) slack.preview = slackMessage;
  if (route.slack && (!isTest || truthy(parsed.slack_test))) {
    slack = await ctx.step({
      name: "post-to-slack",
      maxAttempts: 3,
      retryDelaySeconds: 10,
      run: async () => {
        const result = await sdk.runAction({
          appKey: "SlackCLIAPI",
          actionType: "write",
          actionKey: "channel_message",
          connection: SLACK,
          inputs: { channel: channelOf(campaign), text: slackMessage, as_bot: "yes", unfurl: "no", link_names: "no", add_edit_link: "no" },
        });
        const first: any = result.data?.[0] ?? {};
        return { posted: true, ts: first.ts ?? null, channel: first.channel ?? null };
      },
    });
  }

  // 3. If ClickUp refused the custom fields, set them one at a time and say which did not take.
  let salvage: Record<string, unknown> | null = null;
  if (task.fieldsDropped) {
    salvage = await ctx.step({
      name: "set-custom-fields-one-by-one",
      maxAttempts: 2,
      retryDelaySeconds: 5,
      run: async () => {
        const failed: string[] = [];
        for (const f of fields) {
          const r = await clickup("POST", `/task/${task.id}/field/${f.id}`, { value: f.value });
          if (!r.ok) failed.push(`${f.id} (HTTP ${r.status})`);
        }
        if (failed.length > 0) {
          await clickup("POST", `/task/${task.id}/comment`, {
            comment_text: tr(campaign, "Disse feltene ble ikke satt automatisk: {failed}. Svarene står i beskrivelsen.", { failed: failed.join(", ") }),
            notify_all: false,
          });
        }
        return { set: fields.length - failed.length, failed };
      },
    });
  }

  // 4. The phone number, best effort: ClickUp is strict about the format, and the number is in the
  //    description anyway.
  const phone = normalizePhone(lead.mobile, campaign.phonePrefix ?? "44");
  let phoneResult: Record<string, unknown> = { set: false, reason: lead.mobile ? "not a usable number" : "none given" };
  if (phone) {
    phoneResult = await ctx.step({
      name: "set-clickup-phone",
      maxAttempts: 2,
      retryDelaySeconds: 5,
      run: async () => {
        try {
          const r = await clickup("POST", `/task/${task.id}/field/${campaign.field.phone}`, { value: phone });
          return { set: r.ok, status: r.status };
        } catch (e) {
          return { set: false, error: String(e).slice(0, 200) };
        }
      },
    });
  }

  // 5. Booking reminders, fit only: an e-mail 2, 6, 12 and 48 hours after the form while the task is still in
  //    "ny lead". Everything above is done by now. A real fit lead's run ends here after up to 48 hours.
  const reminders = routeKey === "fit" ? await remind(ctx, lead.campaign, campaign, lead, task.id, isTest, parsed as Record<string, unknown>) : null;

  return {
    lead_id: lead.lead_id,
    campaign: lead.campaign,
    route: lead.route,
    test: isTest,
    deduped: false,
    taskId: task.id,
    taskUrl: task.url,
    customFieldsSet: fields.length,
    fieldsDropped: Boolean(task.fieldsDropped),
    salvage,
    slack,
    phone: phoneResult,
    reminders,
  };
});

export default workflow;
