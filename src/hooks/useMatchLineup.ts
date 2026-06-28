import { useState, useEffect } from "react";
import type { SubEvent } from "./useLiveData";

export interface LineupEntry {
  athleteId: string;
  name: string;
  jersey: string;
  starter: boolean;
  subbedIn: boolean;
  subbedOut: boolean;
  positionAbbr: string;
}

export interface MatchLineup {
  formation: string | null;
  players: LineupEntry[];
  teamDisplayName: string;
}

export interface MatchSummaryData {
  homeSubs: SubEvent[];
  awaySubs: SubEvent[];
  homeTeamId: string;
}

interface CacheEntry {
  lineup: MatchLineup | null;
  summary: MatchSummaryData | null;
}

const cache: Record<string, CacheEntry> = {};

const ESPN_SUMMARY = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary";
const LIVE_POLL_MS = 5 * 60 * 1000;

function shortName(athlete: Record<string, unknown>): string {
  return (athlete.shortName as string) ?? (athlete.displayName as string) ?? "";
}

async function fetchSummary(eventId: string, teamName: string): Promise<CacheEntry> {
  const r = await fetch(`${ESPN_SUMMARY}?event=${eventId}`);
  const d = await r.json();

  // --- Lineup ---
  const rosters = (d.rosters ?? []) as {
    homeAway: string;
    team: { id: string; displayName: string };
    formation?: string;
    roster: {
      jersey?: string;
      starter: boolean;
      subbedIn?: boolean;
      subbedOut?: boolean;
      athlete: { id: string; displayName: string };
      position?: { abbreviation?: string };
    }[];
  }[];

  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const teamRoster = rosters.find(r =>
    normalise(r.team.displayName) === normalise(teamName) ||
    r.team.displayName.toLowerCase().includes(teamName.toLowerCase().split(" ")[0])
  ) ?? rosters[0];

  const lineup: MatchLineup | null = teamRoster?.roster.length ? {
    formation: teamRoster.formation ?? null,
    teamDisplayName: teamRoster.team.displayName,
    players: teamRoster.roster.map(p => ({
      athleteId: p.athlete.id,
      name: p.athlete.displayName,
      jersey: p.jersey ?? "",
      starter: p.starter,
      subbedIn: p.subbedIn ?? false,
      subbedOut: p.subbedOut ?? false,
      positionAbbr: p.position?.abbreviation ?? "",
    })),
  } : null;

  // --- Subs from keyEvents ---
  const homeTeamId = rosters.find(r => r.homeAway === "home")?.team.id ?? "";
  const keyEvents = (d.keyEvents ?? []) as Record<string, unknown>[];
  const homeSubs: SubEvent[] = [];
  const awaySubs: SubEvent[] = [];

  for (const ev of keyEvents) {
    if ((ev.type as Record<string, unknown>)?.type !== "substitution") continue;
    const minute = (ev.clock as Record<string, unknown>)?.displayValue as string ?? "";
    const participants = (ev.participants ?? []) as Record<string, unknown>[];
    const playerOn = shortName((participants[0]?.athlete ?? {}) as Record<string, unknown>);
    const playerOff = shortName((participants[1]?.athlete ?? {}) as Record<string, unknown>);
    const teamId = (ev.team as Record<string, unknown>)?.id as string ?? "";
    const sub: SubEvent = { playerOn, playerOff, minute };
    (teamId === homeTeamId ? homeSubs : awaySubs).push(sub);
  }

  return { lineup, summary: { homeSubs, awaySubs, homeTeamId } };
}

export function useMatchLineup(eventId: string | null, teamName: string, isLive: boolean) {
  const [entry, setEntry] = useState<CacheEntry>({ lineup: null, summary: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eventId) { setEntry({ lineup: null, summary: null }); return; }
    const key = `${eventId}:${teamName}`;

    if (!isLive && cache[key] !== undefined) { setEntry(cache[key]); return; }

    let cancelled = false;

    const load = () => {
      setLoading(true);
      fetchSummary(eventId, teamName)
        .then(result => {
          if (cancelled) return;
          if (!isLive) cache[key] = result;
          setEntry(result);
        })
        .catch(() => { if (!cancelled) setEntry({ lineup: null, summary: null }); })
        .finally(() => { if (!cancelled) setLoading(false); });
    };

    load();

    if (!isLive) return;
    const interval = setInterval(load, LIVE_POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [eventId, teamName, isLive]);

  return { lineup: entry.lineup, summary: entry.summary, loading };
}
