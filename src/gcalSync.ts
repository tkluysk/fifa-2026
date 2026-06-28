/**
 * Google Calendar sync — find/create a "FIFA World Cup 2026" calendar,
 * purge all existing events, then insert fresh ones for selected matches
 * and knockout potentials.
 */

import type { Match } from "./matches";
import type { KnockoutFixture, GroupStandingsMap } from "./hooks/useLiveData";
import { resolveSlot } from "./hooks/useLiveData";

const CAL_NAME = "FIFA World Cup 2026";
const CAL_COLOR = "#0B8043"; // Google's "Sage" green

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

function matchToEvent(m: Match): GEvent {
  return {
    summary: `⚽ ${m.home} vs ${m.away}`,
    location: m.venue,
    description: `Group ${m.group} — FIFA World Cup 2026`,
    start: { dateTime: m.startUtc, timeZone: "UTC" },
    end: { dateTime: endTime(m.startUtc), timeZone: "UTC" },
  };
}

function knockoutToEvent(f: KnockoutFixture, gsMap: GroupStandingsMap): GEvent {
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
    start: { dateTime: f.startUtc, timeZone: "UTC" },
    end: { dateTime: endTime(f.startUtc), timeZone: "UTC" },
    colorId: "5", // banana yellow for potential matches
  };
}

async function gapi<T>(
  method: string,
  url: string,
  token: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google API ${method} ${url}: ${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function findOrCreateCalendar(token: string): Promise<string> {
  const list = await gapi<{ items: { id: string; summary: string }[] }>(
    "GET",
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    token
  );
  const existing = list.items.find((c) => c.summary === CAL_NAME);
  if (existing) return existing.id;

  const created = await gapi<{ id: string }>(
    "POST",
    "https://www.googleapis.com/calendar/v3/calendars",
    token,
    { summary: CAL_NAME, timeZone: "UTC", backgroundColor: CAL_COLOR }
  );
  return created.id;
}

async function purgeCalendar(calId: string, token: string): Promise<void> {
  // Fetch all events
  let pageToken: string | undefined;
  const eventIds: string[] = [];
  do {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?maxResults=250${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const page = await gapi<{ items: { id: string }[]; nextPageToken?: string }>(
      "GET", url, token
    );
    for (const e of page.items ?? []) eventIds.push(e.id);
    pageToken = page.nextPageToken;
  } while (pageToken);

  // Delete all in parallel (batched to avoid rate limits)
  const BATCH = 10;
  for (let i = 0; i < eventIds.length; i += BATCH) {
    await Promise.all(
      eventIds.slice(i, i + BATCH).map((id) =>
        gapi<void>(
          "DELETE",
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${id}`,
          token
        )
      )
    );
  }
}

async function insertEvents(calId: string, token: string, events: GEvent[]): Promise<void> {
  const BATCH = 5;
  for (let i = 0; i < events.length; i += BATCH) {
    await Promise.all(
      events.slice(i, i + BATCH).map((ev) =>
        gapi<void>(
          "POST",
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`,
          token,
          ev
        )
      )
    );
  }
}

export interface SyncOptions {
  token: string;
  matches: Match[];         // all group stage matches for selected countries
  knockouts: KnockoutFixture[];  // knockout path fixtures for selected countries
  gsMap: GroupStandingsMap;
}

export async function syncToGoogleCalendar(opts: SyncOptions): Promise<void> {
  const { token, matches, knockouts, gsMap } = opts;
  const calId = await findOrCreateCalendar(token);
  await purgeCalendar(calId, token);
  const events: GEvent[] = [
    ...matches.map(matchToEvent),
    ...knockouts.map((f) => knockoutToEvent(f, gsMap)),
  ];
  await insertEvents(calId, token, events);
}
