import { defineDurable } from "@zapier/zapier-durable";
import { createZapierSdk } from "@zapier/zapier-sdk";

const sdk = createZapierSdk();

/*
 * Leads v3: Calendly-booking (Zap 2).
 *
 * Fires when someone books (or reschedules) a meeting in Calendly. It finds the lead's task in
 * ClickUp on the lead_id the booking page put in utm_content, moves it to "møte booket" and sets
 * the meeting time as due date. Contract: the project document "Løsning: eget skjema, Zapier,
 * ClickUp og Slack" (section 8) and g/uk-it-growth/LAUNCH.md in the repository.
 *
 * Which bookings count: the trigger listens to the whole Calendly organisation (the collective
 * event "Elevate Marketing | Commission I IT" cannot be picked in the trigger's own dropdown).
 * This code then skips everything that is not one of our events, or does not carry one of our
 * lead ids, before it touches ClickUp.
 *
 * Add a campaign: one more entry in CAMPAIGNS (list id, field ids, the Calendly event type ids).
 *
 * Lookup order: lead_id from utm_content; then, for a reschedule or a booking without a usable
 * lead_id, the e-mail address on a recent task; else a new task tagged "booket-uten-skjema".
 * A lead id that came from the form (l_...) but has no task yet is waited for (the form's Zap
 * may still be running) before a new task is made. Test bookings (an e-mail ending in
 * @example.invalid) get the tag "test".
 */

// ---------------------------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------------------------

const CLICKUP_API = "https://api.clickup.com/api/v2";
const CLICKUP = "clickup_main";
const CALENDLY = "calendly_main";
const BOOKED = "møte booket";
const DAY_MS = 24 * 60 * 60 * 1000;
const WAIT_ROUNDS = 3; // extra looks for a form task that is not there yet
const WAIT_SECONDS = 40;
const EMAIL_LOOKBACK_DAYS = 90;

// What the booking page puts in utm_content: l_ (a form lead, from the server) or d_ (a booking
// without the form, made by /book). The same shape is accepted for test ids.
const LEAD_ID = /^[ld]_[A-Za-z0-9_]{3,40}$/;

// A task in one of these statuses may be moved to "møte booket". Later stages are left alone,
// the booking is then only noted in a comment.
const MOVABLE = new Set(["ny lead", "kontaktet", "møte booket", "møte booket - noshow", "ukvalifisert - archive"]);
const ARCHIVE = "ukvalifisert - archive";

type Campaign = {
  label: string;
  listId: string;
  tag: string;
  eventTypes: string[]; // Calendly event type ids (the uuid at the end of the event type URI)
  field: { leadId: string; email: string; contactName: string; crmItemType: string; salesStage: string };
  option: { crmItemType: string; salesStage: string };
};

const CAMPAIGNS: Record<string, Campaign> = {
  "uk-it-growth": {
    label: "UK IT",
    listId: "901522580321", // IT - UK - Commision
    tag: "growth-2m",
    eventTypes: ["769980c2-23c5-4a60-8f1e-462e5e4ea12e"], // Elevate Marketing | Commission I IT
    field: {
      leadId: "08cf9ecc-ff51-4296-9e03-c5250ebb7abf",
      email: "78c13487-0fee-46d2-893f-68b212b09e6b",
      contactName: "8fb666f4-c213-4f7a-a8ce-627e496a8313",
      crmItemType: "8289eaa9-7492-40eb-a35d-092c51bd01ac",
      salesStage: "f4bfea58-b05c-4427-ba1c-b4aa61200583",
    },
    option: {
      crmItemType: "0b565b82-9090-45fa-8bf9-67f2a7d2eca3", // Lead
      salesStage: "819060db-e6c9-43ab-a7f9-be1322061f3f", // Lead Qualification
    },
  },
  // Health and law (20 Oct 2026): their own ClickUp lists (duplicates of the IT list, same field ids) and
  // their own Calendly collective events. With listId empty a campaign is skipped when a booking is matched
  // by event type, and a lead id from one of these forms finds no list to search.
  "uk-private-hospitals": {
    label: "UK HEALTH",
    listId: "1201270000003578", // HEALTH - UK - Commission
    tag: "growth-health", // was "growth-5m" until 26 Oct 2026; see Zap 1
    eventTypes: ["516ab30e-089f-49dc-a8e6-0e1071a71a1d"], // Elevate Marketing | Health | 30 minute bookings review
    field: {
      leadId: "08cf9ecc-ff51-4296-9e03-c5250ebb7abf",
      email: "78c13487-0fee-46d2-893f-68b212b09e6b",
      contactName: "8fb666f4-c213-4f7a-a8ce-627e496a8313",
      crmItemType: "8289eaa9-7492-40eb-a35d-092c51bd01ac",
      salesStage: "f4bfea58-b05c-4427-ba1c-b4aa61200583",
    },
    option: {
      crmItemType: "0b565b82-9090-45fa-8bf9-67f2a7d2eca3", // Lead
      salesStage: "819060db-e6c9-43ab-a7f9-be1322061f3f", // Lead Qualification
    },
  },
  "uk-law-firms": {
    label: "UK LAW",
    listId: "1201270000003579", // LAW - UK - Commission
    tag: "growth-law",
    eventTypes: ["1a655d87-d08d-4b52-a8fa-2120472d584d"], // Elevate Marketing | Law | 30 minute instruction review
    field: {
      leadId: "08cf9ecc-ff51-4296-9e03-c5250ebb7abf",
      email: "78c13487-0fee-46d2-893f-68b212b09e6b",
      contactName: "8fb666f4-c213-4f7a-a8ce-627e496a8313",
      crmItemType: "8289eaa9-7492-40eb-a35d-092c51bd01ac",
      salesStage: "f4bfea58-b05c-4427-ba1c-b4aa61200583",
    },
    option: {
      crmItemType: "0b565b82-9090-45fa-8bf9-67f2a7d2eca3", // Lead
      salesStage: "819060db-e6c9-43ab-a7f9-be1322061f3f", // Lead Qualification
    },
  },
};

// ---------------------------------------------------------------------------------------------
// Reading the booking. The trigger may hand the invitee over nested, flattened with "__", or
// inside the webhook envelope, so everything is flattened to dotted paths and looked up by name.
// ---------------------------------------------------------------------------------------------

type Flat = Record<string, unknown>;

function flatten(node: unknown, prefix: string, out: Flat, depth: number): Flat {
  if (depth > 7) return out;
  if (Array.isArray(node)) {
    if (prefix) out[prefix] = node;
    return out;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      flatten(v, (prefix ? `${prefix}.${k}` : k).split("__").join("."), out, depth + 1);
    }
    return out;
  }
  if (prefix) out[prefix] = node;
  return out;
}

const WRAPPERS = ["payload", "data", "invitee", "resource"];

function usable(v: unknown): boolean {
  return (typeof v === "string" && v.trim() !== "") || typeof v === "number";
}

// The first of `names` that is present at the top, or one wrapper level down. With a validator
// the search goes deeper too, because a strict test cannot pick a wrong field.
function pick(flat: Flat, names: string[], test?: (v: string) => boolean, skip?: RegExp): string {
  for (const name of names) {
    for (const key of [name, ...WRAPPERS.map((w) => `${w}.${name}`)]) {
      const v = flat[key];
      if (usable(v) && (!test || test(String(v)))) return String(v).trim();
    }
  }
  if (test) {
    for (const name of names) {
      const hits = Object.keys(flat)
        .filter((k) => k.endsWith(`.${name}`) && usable(flat[k]) && test(String(flat[k])) && !(skip && skip.test(k)))
        .sort((a, b) => a.length - b.length);
      if (hits.length > 0) return String(flat[hits[0]]).trim();
    }
  }
  return "";
}

// Any string anywhere in the payload that looks like this.
function scan(flat: Flat, re: RegExp, skip?: RegExp): string {
  const keys = Object.keys(flat).sort((a, b) => a.length - b.length);
  for (const k of keys) {
    const v = flat[k];
    if (typeof v === "string" && re.test(v.trim()) && !(skip && skip.test(k))) return v.trim();
  }
  return "";
}

// Calendly ids are UUIDs today; the pattern also takes the shorter alphanumeric form in Calendly's docs.
const INVITEE_URI = /^https:\/\/api\.calendly\.com\/scheduled_events\/([0-9a-z_-]{8,64})\/invitees\/([0-9a-z_-]{8,64})$/i;
const EVENT_URI = /^https:\/\/api\.calendly\.com\/scheduled_events\/([0-9a-z_-]{8,64})$/i;
const EVENT_TYPE_URI = /^https:\/\/api\.calendly\.com\/event_types\/([0-9a-z_-]{8,64})$/i;
const isIso = (v: string) => /^\d{4}-\d{2}-\d{2}T/.test(v) && !Number.isNaN(Date.parse(v));

function clean(v: unknown, max = 300): string {
  const s = v === null || v === undefined ? "" : String(v);
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    out += code < 32 || code === 127 ? " " : ch;
  }
  return out.trim().slice(0, max);
}

type Booking = {
  inviteeUri: string;
  inviteeKey: string; // 20 hex characters from the invitee uuid
  eventUri: string;
  eventTypeId: string;
  eventName: string;
  start: string;
  end: string;
  email: string;
  name: string;
  timezone: string;
  mobile: string;
  leadId: string;
  utm: Record<string, string>;
  rescheduled: boolean;
  status: string;
  keys: string[];
};

function unwrapInput(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function parseBooking(raw: unknown): Booking {
  const flat = flatten(unwrapInput(raw), "", {}, 0);
  const skipOld = /(^|\.)(old_invitee|new_invitee)(\.|$)/;
  const inviteeUri = pick(flat, ["uri"], (v) => INVITEE_URI.test(v), skipOld) || scan(flat, INVITEE_URI, skipOld);
  const eventUri = pick(flat, ["scheduled_event.uri", "event"], (v) => EVENT_URI.test(v));
  const eventTypeUri = pick(flat, ["scheduled_event.event_type", "event_type", "event_type.uri"], (v) => EVENT_TYPE_URI.test(v));
  const inviteeId = (INVITEE_URI.exec(inviteeUri)?.[2] ?? "").split("-").join("").toLowerCase();
  const eventTypeId = (EVENT_TYPE_URI.exec(eventTypeUri)?.[1] ?? "").toLowerCase();
  const utm: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term"]) {
    const v = pick(flat, [`tracking.${k}`]);
    if (v) utm[k] = clean(v, 120);
  }
  const content = clean(pick(flat, ["tracking.utm_content"], (v) => LEAD_ID.test(v.trim())) || pick(flat, ["tracking.utm_content"]), 120);
  const oldInvitee = pick(flat, ["old_invitee", "old_invitee.uri"]);
  return {
    inviteeUri,
    inviteeKey: inviteeId.slice(0, 20),
    eventUri,
    eventTypeId,
    eventName: clean(pick(flat, ["scheduled_event.name", "event_type.name", "event_type_name"]), 120),
    start: pick(flat, ["scheduled_event.start_time", "start_time"], isIso),
    end: pick(flat, ["scheduled_event.end_time", "end_time"], isIso),
    email: clean(pick(flat, ["email"], (v) => v.includes("@")), 254),
    name: clean(pick(flat, ["name"]) || [pick(flat, ["first_name"]), pick(flat, ["last_name"])].filter(Boolean).join(" "), 120),
    timezone: clean(pick(flat, ["timezone"]), 60),
    mobile: clean(pick(flat, ["text_reminder_number"]), 40),
    leadId: LEAD_ID.test(content) ? content : "",
    utm,
    rescheduled: Boolean(oldInvitee) || flat["rescheduled"] === true || flat["payload.rescheduled"] === true,
    status: pick(flat, ["status"]).toLowerCase(),
    keys: Object.keys(flat).sort().slice(0, 80),
  };
}

// ---------------------------------------------------------------------------------------------
// Times, in the words of the people who read the ClickUp task
// ---------------------------------------------------------------------------------------------

const WEEKDAYS = ["søn", "man", "tir", "ons", "tor", "fre", "lør"];

function local(ms: number, timeZone: string): { text: string; hm: string } {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(ms);
    const p: Record<string, string> = {};
    for (const part of parts) p[part.type] = part.value;
    const day = Math.floor(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)) / DAY_MS);
    const weekday = WEEKDAYS[(((day + 4) % 7) + 7) % 7];
    const hm = `${p.hour}:${p.minute}`;
    return { text: `${weekday} ${p.day}.${p.month}.${p.year} kl. ${hm}`, hm };
  } catch {
    return { text: `${new Intl.DateTimeFormat("en-GB").format(ms)} UTC`, hm: "" };
  }
}

function when(startMs: number, endMs: number): string {
  const london = local(startMs, "Europe/London");
  const oslo = local(startMs, "Europe/Oslo");
  const minutes = endMs > startMs ? Math.round((endMs - startMs) / 60000) : 0;
  const both = oslo.hm && oslo.hm !== london.hm ? ` (London) / ${oslo.hm} (Oslo)` : " (London)";
  return `${london.text}${both}${minutes ? `, ${minutes} min` : ""}`;
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

type Found = { id: string; url: string; status: string };

function asFound(task: any): Found {
  const id = String(task.id);
  return { id, url: taskLink(id, task.url), status: String(task.status?.status ?? "").toLowerCase() };
}

// The task for this lead_id, if there is one. The value is checked on what comes back, so a
// search that ignored the filter can never be mistaken for a match.
async function findByLeadId(c: Campaign, leadId: string): Promise<Found | null> {
  const filter = encodeURIComponent(JSON.stringify([{ field_id: c.field.leadId, operator: "=", value: leadId }]));
  const r = await clickup("GET", `/list/${c.listId}/task?custom_fields=${filter}&include_closed=true&page=0`);
  if (!r.ok) throw new Error(`ClickUp search failed: HTTP ${r.status} ${r.text}`);
  for (const task of r.json?.tasks ?? []) {
    const value = (task.custom_fields ?? []).find((f: any) => f.id === c.field.leadId)?.value;
    if (value === leadId) return asFound(task);
  }
  return null;
}

// A recent task with this e-mail address: the newest one. Best effort, never a reason to fail.
async function findByEmail(c: Campaign, email: string): Promise<{ found: Found | null; note: string }> {
  const filter = encodeURIComponent(JSON.stringify([{ field_id: c.field.email, operator: "=", value: email }]));
  const r = await clickup("GET", `/list/${c.listId}/task?custom_fields=${filter}&include_closed=true&page=0`);
  if (!r.ok) return { found: null, note: `search HTTP ${r.status}` };
  const since = Date.now() - EMAIL_LOOKBACK_DAYS * DAY_MS;
  const wanted = email.trim().toLowerCase();
  const hits = (r.json?.tasks ?? [])
    .filter((t: any) => String((t.custom_fields ?? []).find((f: any) => f.id === c.field.email)?.value ?? "").trim().toLowerCase() === wanted)
    .filter((t: any) => Number(t.date_created) >= since)
    .sort((a: any, b: any) => Number(b.date_created) - Number(a.date_created));
  return hits.length > 0 ? { found: asFound(hits[0]), note: `${hits.length} task(s) with this e-mail` } : { found: null, note: "no recent task with this e-mail" };
}

function newTaskDescription(c: Campaign, b: Booking, leadId: string, formId: string, startMs: number, endMs: number, isTest: boolean): string {
  const row = (label: string, value: string) => (value ? `- ${label}: ${value}` : "");
  const block = (title: string, rows: string[]) => {
    const body = rows.filter(Boolean);
    return body.length ? [`**${title}**`, ...body].join("\n") : "";
  };
  const why = formId
    ? `Personen booket møtet i Calendly, men skjemaet med id ${formId} var ikke kommet inn i ClickUp da bookingen kom. Sjekk om det finnes en egen oppgave for samme e-post.`
    : "Personen booket møtet i Calendly uten å fylle ut skjemaet.";
  return [
    `**BOOKET UTEN SKJEMA** · ${c.label}${isTest ? " · TEST" : ""}`,
    `${why} Vi har ingen svar å vise, så be om tallene i møtet: omsetning, antall folk, hva en ny kunde er verdt og hvor lang salgssyklusen er.`,
    block("Møte", [row("Tid", when(startMs, endMs)), row("Type", b.eventName), row("Flyttet fra en tidligere tid", b.rescheduled ? "ja" : "")]),
    block("Kontakt", [row("Navn", b.name), row("E-post", b.email), row("Mobil", b.mobile), row("Tidssone", b.timezone)]),
    block("Kilde", [
      row("utm_source", b.utm.utm_source ?? ""),
      row("utm_medium", b.utm.utm_medium ?? ""),
      row("utm_campaign", b.utm.utm_campaign ?? ""),
      row("utm_term", b.utm.utm_term ?? ""),
    ]),
    `lead_id: ${leadId}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function commentText(b: Booking, found: Found, how: string, startMs: number, endMs: number, moved: boolean): string {
  const lines = [`Møte booket i Calendly: ${when(startMs, endMs)}`];
  if (b.eventName) lines.push(`Type: ${b.eventName}`);
  if (b.rescheduled) lines.push("Flyttet fra en tidligere tid.");
  if (how === "email") lines.push("Koblet på e-postadressen, ikke på lead_id. Sjekk at det er riktig oppgave.");
  if (moved) lines.push(`Status flyttet fra «${found.status || "ukjent"}» til «${BOOKED}».`);
  else if (found.status === BOOKED) {
    lines.push(b.rescheduled ? "Status er fortsatt «møte booket»." : "Oppgaven sto allerede i «møte booket». Sjekk om dette er en ny booking eller en dobbel.");
  } else lines.push(`Status ikke endret (${found.status || "ukjent"}), fordi oppgaven er lenger frem i løpet.`);
  if (found.status === ARCHIVE) lines.push("⚠ Skjemaet rutet dette som ikke aktuelt. Sjekk før møtet.");
  lines.push(`Calendly-ref: ${b.inviteeKey.slice(0, 8)}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------------------------
// The workflow
// ---------------------------------------------------------------------------------------------

const workflow = defineDurable<Record<string, unknown>, unknown>("leads-v3-calendly-booking", async (ctx, rawInput) => {
  let b = parseBooking(rawInput);
  if (b.status === "canceled") return { skipped: "not_active" };

  // The event details are normally in the trigger data. If not, read them from Calendly.
  if ((!b.start || !b.eventTypeId) && b.eventUri) {
    const event = await ctx.step({
      name: "read-calendly-event",
      maxAttempts: 3,
      retryDelaySeconds: 10,
      run: async () => {
        const res = await sdk.fetch(b.eventUri, { connection: CALENDLY, method: "GET" } as any);
        const text = await res.text();
        if (!res.ok) throw new Error(`Calendly event lookup failed: HTTP ${res.status}`);
        const e = (JSON.parse(text) as any)?.resource ?? {};
        return {
          start: String(e.start_time ?? ""),
          end: String(e.end_time ?? ""),
          eventType: String(e.event_type ?? ""),
          name: String(e.name ?? ""),
        };
      },
    });
    b = {
      ...b,
      start: b.start || event.start,
      end: b.end || event.end,
      eventTypeId: b.eventTypeId || (EVENT_TYPE_URI.exec(event.eventType)?.[1] ?? "").toLowerCase(),
      eventName: b.eventName || clean(event.name, 120),
    };
  }

  // A booking we cannot place at all is a failure to show, never a silent skip.
  if (!b.eventTypeId && !b.leadId) {
    throw new Error(`Cannot tell which Calendly event was booked. Keys seen: ${b.keys.join(", ")}`);
  }

  // Which campaign is this? By the event that was booked, and an event that is not ours is skipped.
  // With one of our lead ids on an event that is not in CAMPAIGNS (or when the event cannot be
  // read), the lead id decides: the task is linked if it exists, and never created or guessed.
  const entries = Object.entries(CAMPAIGNS).filter(([, c]) => c.listId); // a campaign without a list yet cannot be searched
  const byEvent = entries.filter(([, c]) => b.eventTypeId && c.eventTypes.includes(b.eventTypeId));
  const candidates = byEvent.length > 0 ? byEvent : b.leadId ? entries : [];
  if (candidates.length === 0) {
    return { skipped: "other_event", eventType: b.eventTypeId || null, hasLeadId: false };
  }
  const idOnly = byEvent.length === 0;

  // From here on it is ours: a booking we cannot read is a failure to show, not to skip.
  const startMs = Date.parse(b.start);
  const endMs = b.end ? Date.parse(b.end) : 0;
  if (Number.isNaN(startMs) || !b.inviteeKey || !b.email) {
    throw new Error(
      `Unreadable Calendly booking: start=${b.start ? "ok" : "missing"}, invitee=${b.inviteeKey ? "ok" : "missing"}, email=${b.email ? "ok" : "missing"}. Keys seen: ${b.keys.join(", ")}`,
    );
  }
  const isTest = b.email.toLowerCase().endsWith("@example.invalid");

  // 1. Find the task. First on lead_id, waiting a little for the form's Zap if the id came from
  //    the form; then, if that is not the way in, on the e-mail address.
  let campaign = candidates[0][1];
  let found: Found | null = null;
  let how = "";
  let looked = 0;
  if (b.leadId) {
    const rounds = b.leadId.startsWith("l_") ? WAIT_ROUNDS + 1 : 1;
    for (let i = 0; i < rounds && !found; i++) {
      if (i > 0) await ctx.wait(`wait-for-form-task-${i}`, WAIT_SECONDS);
      const hit = await ctx.step({
        name: `find-task-by-lead-id-${i}`,
        maxAttempts: 3,
        retryDelaySeconds: 10,
        run: async () => {
          for (const [key, c] of candidates) {
            const f = await findByLeadId(c, b.leadId);
            if (f) return { key, found: f };
          }
          return null;
        },
      });
      looked++;
      if (hit) {
        found = hit.found;
        campaign = CAMPAIGNS[hit.key];
        how = "lead_id";
      }
    }
  }
  if (!found && idOnly) {
    // Not ours by event, and no task to show for the id: never create or guess, show the failure.
    throw new Error(
      `A booking with lead id ${b.leadId} has no task, and its event type (${b.eventTypeId || "unknown"}) is not in CAMPAIGNS. Add the event type to CAMPAIGNS if it belongs to one of the pages.`,
    );
  }
  let emailNote = "";
  const formIdMissing = Boolean(b.leadId) && b.leadId.startsWith("l_") && !found;
  if (!found && !formIdMissing) {
    const hit = await ctx.step({
      name: "find-task-by-email",
      maxAttempts: 2,
      retryDelaySeconds: 10,
      run: async () => {
        try {
          return await findByEmail(campaign, b.email);
        } catch (e) {
          return { found: null, note: `search error ${String(e).slice(0, 120)}` };
        }
      },
    });
    emailNote = hit.note;
    if (hit.found) {
      found = hit.found;
      how = "email";
    }
  }

  // 2a. Nothing to link to: a task of its own, tagged so it shows.
  if (!found) {
    // d_ ids are the booking page's own, so they are kept; anything else gets an id of its own.
    const leadId = b.leadId.startsWith("d_") ? b.leadId : `c_${b.inviteeKey}`;
    const formId = formIdMissing ? b.leadId : "";
    const created = await ctx.step({
      name: "create-booking-task",
      maxAttempts: 3,
      retryDelaySeconds: 10,
      run: async () => {
        // Looks again right before creating, so a retry or a second delivery never makes two.
        const again = await findByLeadId(campaign, leadId);
        if (again) return { ...again, created: false };
        const fields: { id: string; value: string }[] = [
          { id: campaign.field.leadId, value: leadId },
          { id: campaign.field.crmItemType, value: campaign.option.crmItemType },
          { id: campaign.field.salesStage, value: campaign.option.salesStage },
        ];
        if (b.name) fields.push({ id: campaign.field.contactName, value: b.name });
        if (b.email.includes("@") && !b.email.includes(" ")) fields.push({ id: campaign.field.email, value: b.email });
        const body: Record<string, unknown> = {
          name: `${b.name || b.email} · booket uten skjema`,
          markdown_description: newTaskDescription(campaign, b, leadId, formId, startMs, endMs, isTest),
          status: BOOKED,
          tags: [campaign.tag, "booket-uten-skjema", ...(isTest ? ["test"] : [])],
          due_date: startMs,
          due_date_time: true,
          custom_fields: fields,
        };
        let r = await clickup("POST", `/list/${campaign.listId}/task`, body);
        if (r.status === 400) {
          // A custom field ClickUp does not accept must not cost us the booking.
          const { custom_fields: _dropped, ...withoutFields } = body;
          r = await clickup("POST", `/list/${campaign.listId}/task`, withoutFields);
        }
        if (!r.ok) throw new Error(`ClickUp create failed: HTTP ${r.status} ${r.text}`);
        const id = String(r.json?.id ?? "");
        if (!id) throw new Error("ClickUp create returned no task id.");
        return { id, url: taskLink(id, r.json?.url), status: BOOKED, created: true };
      },
    });
    return {
      outcome: created.created ? "created_without_form" : "already_there",
      leadId,
      formIdMissing: Boolean(formId),
      eventType: b.eventTypeId,
      start: b.start,
      rescheduled: b.rescheduled,
      test: isTest,
      taskId: created.id,
      taskUrl: created.url,
      emailLookup: emailNote || null,
      lookedByLeadId: looked,
    };
  }

  // 2b. The lead's own task: status, meeting time, and a note.
  const before = found.status;
  const move = MOVABLE.has(before) && before !== BOOKED;
  const update = await ctx.step({
    name: "update-task",
    maxAttempts: 3,
    retryDelaySeconds: 10,
    run: async () => {
      const body: Record<string, unknown> = { due_date: startMs, due_date_time: true };
      if (move) body.status = BOOKED;
      const r = await clickup("PUT", `/task/${found!.id}`, body);
      if (!r.ok) throw new Error(`ClickUp update failed: HTTP ${r.status} ${r.text}`);
      return { updated: true, moved: move };
    },
  });
  const note = await ctx.step({
    name: "comment-on-task",
    maxAttempts: 2,
    retryDelaySeconds: 10,
    run: async () => {
      // The same booking delivered twice must not give two comments.
      const ref = `Calendly-ref: ${b.inviteeKey.slice(0, 8)}`;
      const existing = await clickup("GET", `/task/${found!.id}/comment`);
      const already = (existing.json?.comments ?? []).some((cm: any) => String(cm.comment_text ?? "").includes(ref));
      if (already) return { commented: false, reason: "already commented" };
      const r = await clickup("POST", `/task/${found!.id}/comment`, {
        comment_text: commentText(b, found!, how, startMs, endMs, move),
        notify_all: false,
      });
      if (!r.ok) throw new Error(`ClickUp comment failed: HTTP ${r.status} ${r.text}`);
      return { commented: true };
    },
  });

  return {
    outcome: "linked",
    how,
    leadId: b.leadId || null,
    eventType: b.eventTypeId,
    start: b.start,
    rescheduled: b.rescheduled,
    test: isTest,
    taskId: found.id,
    taskUrl: found.url,
    statusBefore: before,
    statusMoved: update.moved,
    commented: note.commented,
    lookedByLeadId: looked,
    eventNotInCampaigns: idOnly,
  };
});

export default workflow;
