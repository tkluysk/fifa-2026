/**
 * Google Calendar sync — find/create a "FIFA World Cup 2026" calendar,
 * purge all existing events, then insert fresh ones for selected matches
 * and knockout potentials.
 *
 * Safety: we only ever operate on a calendar we created ourselves, identified
 * by both a stored ID in localStorage AND a description marker we set at
 * creation time. If either check fails we create a new calendar rather than
 * touching anything else.
 */

import type { Match } from "./matches";
import type { KnockoutFixture, GroupStandingsMap } from "./hooks/useLiveData";
import { resolveSlot } from "./hooks/useLiveData";

const CAL_NAME   = "FIFA World Cup 2026";
const CAL_MARKER = "fifa-2026-app-managed"; // written into description at creation; checked before any write
const LS_CAL_ID  = "gcal-calendar-id";

interface GEvent {
  summary: string;
  location?: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  colorId?: string;
}

function endTime(startUtc: string): string {
  return new Date(new Date(startUtc).getTime() + 2 * 60 * 60 * 1000).toISOString();
}

function isValidDate(s: string): boolean {
  return !isNaN(new Date(s).getTime());
}

function matchToEvent(m: Match): GEvent | null {
  if (!m.startUtc || !isValidDate(m.startUtc)) return null;
  return {
    summary: `⚽ ${m.home} vs ${m.away}`,
    location: m.venue,
    description: `Group ${m.group} — FIFA World Cup 2026`,
    start: { dateTime: new Date(m.startUtc).toISOString(), timeZone: "UTC" },
    end: { dateTime: endTime(m.startUtc), timeZone: "UTC" },
  };
}

function knockoutToEvent(f: KnockoutFixture, gsMap: GroupStandingsMap): GEvent | null {
  if (!f.startUtc || !isValidDate(f.startUtc)) return null;
  const resolveTeam = (slot: string) => {
    const known = !/(group|round of|winner|place|runner|loser|quarterfinal|semifinal|third)/i.test(slot);
    if (known) return slot;
    const candidates = resolveSlot(slot, gsMap);
    return candidates.length > 0 ? candidates.join("/") : slot;
  };
  const home = resolveTeam(f.home);
  const away = resolveTeam(f.away);
  return {
    summary: `⚽ [Potential] ${f.stage} — ${home} vs ${away}`,
    location: f.venue,
    description: `${f.stage} — FIFA World Cup 2026\nMatch time may change based on group results.`,
    start: { dateTime: new Date(f.startUtc).toISOString(), timeZone: "UTC" },
    end: { dateTime: endTime(f.startUtc), timeZone: "UTC" },
    colorId: "5",
  };
}

async function gapi<T>(method: string, url: string, token: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google API ${method} ${url}: ${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function isOurCalendar(calId: string, token: string): Promise<boolean> {
  try {
    const cal = await gapi<{ description?: string }>(
      "GET",
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}`,
      token
    );
    return (cal.description ?? "").includes(CAL_MARKER);
  } catch {
    return false;
  }
}

async function createCalendar(token: string): Promise<string> {
  const created = await gapi<{ id: string }>(
    "POST",
    "https://www.googleapis.com/calendar/v3/calendars",
    token,
    { summary: CAL_NAME, description: CAL_MARKER, timeZone: "UTC" }
  );
  localStorage.setItem(LS_CAL_ID, created.id);
  return created.id;
}

async function findOrCreateCalendar(token: string): Promise<string> {
  // 1. Check stored ID first — verify it's still ours before using it
  const storedId = localStorage.getItem(LS_CAL_ID);
  if (storedId && await isOurCalendar(storedId, token)) {
    return storedId;
  }

  // 2. Stored ID missing/invalid — create a fresh calendar
  localStorage.removeItem(LS_CAL_ID);
  return createCalendar(token);
}

async function purgeCalendar(calId: string, token: string): Promise<void> {
  // Double-check marker before deleting anything
  if (!await isOurCalendar(calId, token)) {
    throw new Error("Safety check failed: calendar is not app-managed. Aborting.");
  }

  let pageToken: string | undefined;
  const eventIds: string[] = [];
  do {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?maxResults=250${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const page = await gapi<{ items: { id: string }[]; nextPageToken?: string }>("GET", url, token);
    for (const e of page.items ?? []) eventIds.push(e.id);
    pageToken = page.nextPageToken;
  } while (pageToken);

  for (const id of eventIds) {
    await gapi<void>("DELETE", `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${id}`, token);
    await new Promise(r => setTimeout(r, 100));
  }
}

async function insertEvents(calId: string, token: string, events: GEvent[]): Promise<void> {
  for (const ev of events) {
    try {
      await gapi<void>(
        "POST",
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`,
        token,
        ev
      );
    } catch (e) {
      throw new Error(`Failed inserting "${ev.summary}" (start: ${ev.start.dateTime}): ${e instanceof Error ? e.message : e}`);
    }
  }
}

export interface SyncOptions {
  token: string;
  matches: Match[];
  knockouts: KnockoutFixture[];
  gsMap: GroupStandingsMap;
}

export async function syncToGoogleCalendar(opts: SyncOptions): Promise<void> {
  const { token, matches, knockouts, gsMap } = opts;
  const calId = await findOrCreateCalendar(token);
  await purgeCalendar(calId, token);
  const events: GEvent[] = [
    ...matches.map(matchToEvent).filter((e): e is GEvent => e !== null),
    ...knockouts.map((f) => knockoutToEvent(f, gsMap)).filter((e): e is GEvent => e !== null),
  ];
  await insertEvents(calId, token, events);
}
