/**
 * Fetches the full FIFA World Cup 2026 schedule + live scores from ESPN.
 * One request covers all group-stage matches (date range query).
 * No static match times — everything comes from ESPN.
 */

import { useState, useEffect } from "react";
import type { Match } from "../matches";
import { normaliseTeamName, tvnzPathForMatch } from "../matches";

export interface LiveScore {
  home: number;
  away: number;
  status: "scheduled" | "in_progress" | "finished";
}

export interface LiveData {
  matches: Match[];
  scores: Record<string, LiveScore>;
  loading: boolean;
  error: string | null;
}

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
// Covers all of group stage + buffer
const DATE_RANGE = "20260612-20260703";
const POLL_INTERVAL_MS = 5 * 60 * 1000;

function parseGroup(altGameNote: string): string {
  // "FIFA World Cup, Group G" → "G"
  const m = altGameNote.match(/Group ([A-Z])/);
  return m ? m[1] : "?";
}

function parseSchedule(events: unknown[]): { matches: Match[]; scores: Record<string, LiveScore> } {
  const matches: Match[] = [];
  const scores: Record<string, LiveScore> = {};

  for (const event of events) {
    const e = event as Record<string, unknown>;
    const competitions = (e.competitions ?? []) as unknown[];
    if (!competitions.length) continue;
    const comp = competitions[0] as Record<string, unknown>;

    // Only group stage
    const altGameNote = (comp.altGameNote as string) ?? "";
    if (!altGameNote.includes("Group")) continue;

    const statusRaw = (comp.status ?? {}) as Record<string, unknown>;
    const statusType = (statusRaw.type ?? {}) as Record<string, unknown>;
    const isFinished = !!statusType.completed;
    const isLive = (statusType.state as string) === "in";
    const liveStatus: LiveScore["status"] = isFinished ? "finished" : isLive ? "in_progress" : "scheduled";

    const competitors = (comp.competitors ?? []) as unknown[];
    let home = "";
    let away = "";
    let homeScore = 0;
    let awayScore = 0;

    for (const c of competitors) {
      const cc = c as Record<string, unknown>;
      const rawName = ((cc.team as Record<string, unknown>)?.displayName ?? "") as string;
      const name = normaliseTeamName(rawName);
      const score = parseInt((cc.score as string) ?? "0", 10) || 0;
      if (cc.homeAway === "home") { home = name; homeScore = score; }
      else { away = name; awayScore = score; }
    }

    if (!home || !away) continue;

    const id = e.id as string;
    const startUtc = (e.date as string) ?? "";
    const venue = ((comp.venue as Record<string, unknown>)?.fullName as string) ?? "";
    const group = parseGroup(altGameNote);

    matches.push({
      id,
      home,
      away,
      group,
      startUtc,
      venue,
      tvnzPath: tvnzPathForMatch(home, away),
    });

    if (isFinished || isLive) {
      scores[id] = { home: homeScore, away: awayScore, status: liveStatus };
    }
  }

  matches.sort((a, b) => a.startUtc.localeCompare(b.startUtc));
  return { matches, scores };
}

export function useLiveData(): LiveData {
  const [matches, setMatches] = useState<Match[]>([]);
  const [scores, setScores] = useState<Record<string, LiveScore>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    async function fetchAll(background = false) {
      if (!background) setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${ESPN_BASE}?dates=${DATE_RANGE}&limit=200`);
        if (!res.ok) throw new Error(`ESPN ${res.status}`);
        const json = await res.json();
        if (cancelled) return;

        const events = (json.events ?? []) as unknown[];
        const { matches: fetched, scores: fetchedScores } = parseSchedule(events);

        setMatches(fetched);
        setScores(fetchedScores);
      } catch (err) {
        if (!cancelled) setError(`Live data unavailable: ${err}`);
      } finally {
        if (!background && !cancelled) setLoading(false);
      }

      if (!cancelled) {
        const hasLive = Object.values(scores).some((s) => s.status === "in_progress");
        if (hasLive) timerId = setTimeout(() => fetchAll(true), POLL_INTERVAL_MS);
      }
    }

    fetchAll();
    return () => { cancelled = true; if (timerId) clearTimeout(timerId); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { matches, scores, loading, error };
}
