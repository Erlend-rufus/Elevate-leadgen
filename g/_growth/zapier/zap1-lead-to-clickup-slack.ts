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
 *     Nobody is contacted because of this: the visitor is only e-mailed after pressing the button on the page.
 *   - That press arrives here as the same lead again with event: "website_interest" (and interest_at). The task is
 *     found, or made if the application never got to ClickUp, tagged "ønsker-nettsidetilbud", given a comment that
 *     notifies Sondre, and #leads-uk gets a post that pings him. A second delivery of the same press is ignored.
 *   - A test lead is never assigned, never notifies and never pings, whatever slack_test says.
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
const REVIEWER = { clickupId: 106690144, slackId: "U0AR2CM4NTZ", name: "Sondre" };
const REVIEW_TAG = "vurder-nettside";
const INTEREST_TAG = "ønsker-nettsidetilbud";
const INTEREST_EVENT = "website_interest";

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
    tag: "growth-5m",
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
        "£5,000 to under £20,000": "7364943c-da47-4d59-bb44-e79faeeaac5a", // £5k+/mth
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
        "£5,000 to under £15,000": "7364943c-da47-4d59-bb44-e79faeeaac5a", // £5k+/mth
        "£15,000 or more": "7364943c-da47-4d59-bb44-e79faeeaac5a", // £5k+/mth
        "I do not know": "feaf2b0d-079a-4ffa-a48b-67e79c280458", // Unknown
      },
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

function normalizePhone(v: string): string {
  let digits = "";
  for (const ch of v) if (ch >= "0" && ch <= "9") digits += ch;
  if (digits.startsWith("440")) digits = `44${digits.slice(3)}`;
  const inRange = (d: string) => d.length >= 8 && d.length <= 15;
  if (v.trim().startsWith("+")) return inRange(digits) ? `+${digits}` : "";
  if (digits.startsWith("00")) return inRange(digits.slice(2)) ? `+${digits.slice(2)}` : "";
  if (digits.startsWith("0") && digits.length === 11) return `+44${digits.slice(1)}`;
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
  const specialism = lead.specialism.startsWith("Other") ? "Other" : lead.specialism;
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

function describe(c: Campaign, lead: Lead, route: RouteRule, isTest: boolean): string {
  const row = (label: string, value: string) => (value ? `- ${label}: ${value}` : "");
  const block = (title: string, rows: string[]) => {
    const body = rows.filter(Boolean);
    return body.length ? [`**${title}**`, ...body].join("\n") : "";
  };
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
    `**${route.heading}** · ${c.label}${isTest ? " · TEST" : ""} · skjema levert ${lead.submitted_at}`,
    block("Selskap", [
      row("Navn", lead.company_name),
      row("Nettside", lead.company_website),
      row("Companies House", register),
      row("Sjekk mot registeret", lead.ch_check),
    ]),
    block("Svar i skjemaet", [
      row("Spesialisering", lead.specialism),
      row("Fagområder", lead.practice_areas),
      row("SRA-nummer", lead.sra_number),
      row("Registreringsnummer hos tilsynet", lead.regulator_number),
      row("Spesialiteter", lead.specialties),
      row("Andel selvbetalende", lead.self_pay_share),
      row("Verdi av førstekonsultasjon", lead.first_consultation_value),
      row("Omsetning", lead.turnover_band),
      row("Hvor lenge i drift", lead.trading_years),
      row("Antall folk", lead.employees_or_fee_earners),
      row("Markedsføring per måned", lead.marketing_spend),
      row("Verdi første år", lead.first_year_value),
      row("Salgssyklus", lead.sales_cycle),
      row("Mål neste år", lead.target_next_year),
      row("Beslutter", lead.decision_maker),
      row("Kapasitet", lead.capacity),
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
  const head = `${isTest ? "[TEST] " : ""}*${route.heading}* · ${c.label} · ${esc(lead.company_name || "uten navn")}`;
  const people = lead.employees_or_fee_earners ? `${lead.employees_or_fee_earners} ${c.peopleWord}` : "";
  const year = lead.ch_incorporated.slice(0, 4);
  let register: string;
  if (lead.ch_check === "ok" || lead.ch_check === "mismatch") {
    register = `Companies House: ${lead.ch_accounts_type || "ukjent regnskapstype"}${year ? `, stiftet ${year}` : ""}`;
  } else if (lead.ch_check === "not_found") {
    register = "Companies House: ikke funnet";
  } else if (lead.ch_check === "timeout") {
    register = "Companies House: ikke sjekket (tidsavbrudd)";
  } else {
    register = "Companies House: ikke sjekket";
  }
  const line2 = [lead.turnover_band, people, register].filter(Boolean).join(" · ");
  const line3 = [
    lead.first_year_value && `Verdi første år: ${lead.first_year_value}`,
    lead.first_consultation_value && `Verdi førstekonsultasjon: ${lead.first_consultation_value}`,
    lead.self_pay_share && `Selvbetalende: ${lead.self_pay_share}`,
    lead.specialties && `Spesialiteter: ${lead.specialties}`,
    lead.practice_areas && `Fagområder: ${lead.practice_areas}`,
    lead.sales_cycle && `Salgssyklus: ${lead.sales_cycle}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const line4 = [lead.capacity && `Kapasitet: ${lead.capacity}`, lead.decision_maker && `Beslutter: ${lead.decision_maker}`]
    .filter(Boolean)
    .join(" · ");
  let goal = "";
  if (lead.meeting_goal) {
    const flat = lead.meeting_goal.replace(/\s+/g, " ").trim();
    const cut = flat.length > SLACK_GOAL_MAX ? `${flat.slice(0, SLACK_GOAL_MAX - 1).trimEnd()}…` : flat;
    goal = `Vil ha ut av møtet: _${esc(cut)}_`;
  }
  const source = [lead.utm_source, lead.utm_content].filter(Boolean).join(" / ") || "ukjent";
  const lines = [head, esc(line2), esc(line3), esc(line4), goal, `Kilde: ${esc(source)}`, `ClickUp: <${taskUrl}|åpne oppgaven>`];
  if (lead.ch_check === "mismatch" || lead.ch_check === "timeout" || lead.ch_check === "not_found") {
    lines.push("⚠ Størrelse ikke bekreftet, sjekk før møtet");
  }
  if (lead.route_reason.includes("fertility")) lines.push("⚠ Fertilitet: HFEA-regulert, sjekk før annonser");
  if (lead.route_reason.includes("personal_injury_ticked")) lines.push("⚠ Personskade er krysset av: avtalen må unnta personskadesaker");
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
  ch_micro_or_dormant: "mikro eller sovende regnskap",
};

const slackEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Not a fit: short, no ping. The assignment in ClickUp is what tells Sondre.
function slackCompact(c: Campaign, lead: Lead, route: RouteRule, taskUrl: string, isTest: boolean): string {
  const people = lead.employees_or_fee_earners ? `${lead.employees_or_fee_earners} ${c.peopleWord}` : "";
  const why = lead.route_reason
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean)
    .map((code) => (Object.prototype.hasOwnProperty.call(REASON_TEXT, code) ? REASON_TEXT[code] : code))
    .join(", ");
  const head = `${isTest ? "[TEST] " : ""}*${route.heading}* · ${c.label} · ${slackEscape(lead.company_name || "uten navn")}`;
  const line2 = [lead.turnover_band, people, why && `Grunn: ${why}`].filter(Boolean).join(" · ");
  return [head, slackEscape(line2), `${REVIEWER.name} vurderer nettside eller retainer · ClickUp: <${taskUrl}|åpne oppgaven>`]
    .filter(Boolean)
    .join("\n");
}

// The visitor pressed "Yes, send me a quote". This one does ping Sondre (not on a test lead).
function slackInterest(c: Campaign, lead: Lead, taskUrl: string, isTest: boolean): string {
  const who = isTest ? REVIEWER.name : `<@${REVIEWER.slackId}>`;
  const head = `${isTest ? "[TEST] " : ""}*ØNSKER NETTSIDETILBUD* · ${c.label} · ${slackEscape(lead.company_name || "uten navn")}`;
  return [head, `${who} sender ett tilbud på e-post innen to virkedager · ClickUp: <${taskUrl}|åpne oppgaven>`].join("\n");
}

function interestComment(lead: Lead): string {
  return [
    "Ønsker tilbud på ny nettside eller månedlig retainer. Trykket på knappen på siden «ikke treff».",
    `Send ett tilbud på e-post${validEmail(lead.email) ? ` til ${validEmail(lead.email)}` : ""} innen to virkedager.`,
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
  const name = [lead.company_name, personName(lead)].filter(Boolean).join(" · ") || lead.lead_id;
  const body: Record<string, unknown> = {
    name,
    markdown_description: describe(campaign, lead, route, isTest),
    status: route.status,
    tags: [campaign.tag, ...route.tags, ...(isTest ? ["test"] : [])],
    custom_fields: fields,
  };
  if (route.priority !== null) body.priority = route.priority;
  if (route.reviewer && !isTest) body.assignees = [REVIEWER.clickupId];
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
      const r = await clickup("POST", `/task/${found.id}/comment`, { comment_text: interestComment(lead), notify_all: !isTest });
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
          inputs: { channel: SLACK_CHANNEL, text: message, as_bot: "yes", unfurl: "no", link_names: "no", add_edit_link: "no" },
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

const workflow = defineDurable<unknown, unknown>("leads-v3-skjema-til-clickup-og-slack", async (ctx, rawInput) => {
  // Validate before anything is written. An unknown campaign or route fails the run on purpose,
  // so it shows in the run history and the e-mail alert instead of vanishing.
  const parsed = LeadSchema.parse(unwrap(rawInput));
  const lead = toLead(parsed as Record<string, unknown>);
  const campaign = Object.prototype.hasOwnProperty.call(CAMPAIGNS, lead.campaign) ? CAMPAIGNS[lead.campaign] : null;
  if (!campaign) throw new Error(`Unknown campaign "${lead.campaign}". Add it to CAMPAIGNS.`);
  if (!campaign.listId) throw new Error(`Campaign "${lead.campaign}" has no ClickUp list yet. Duplicate IT - UK - Commision and fill in CAMPAIGNS.`);
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
          inputs: { channel: SLACK_CHANNEL, text: slackMessage, as_bot: "yes", unfurl: "no", link_names: "no", add_edit_link: "no" },
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
            comment_text: `Disse feltene ble ikke satt automatisk: ${failed.join(", ")}. Svarene står i beskrivelsen.`,
            notify_all: false,
          });
        }
        return { set: fields.length - failed.length, failed };
      },
    });
  }

  // 4. The phone number, best effort: ClickUp is strict about the format, and the number is in the
  //    description anyway.
  const phone = normalizePhone(lead.mobile);
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
  };
});

export default workflow;
