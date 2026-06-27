/**
 * Fetches live FIFA World Cup 2026 scores from ESPN's public scoreboard API.
 * No API key required. Runs on every page load.
 *
 * Returns:
 *   scores    — { [matchId]: { home, away } } populated for finished matches
 *   standings — live Group G table (computed from fetched results)
 *   loading   — true while fetching
 *   error     — human-readable message if all fetches failed
 */

import { useState, useEffect } from "react";
import type { GroupRow } from "../countryInfo";
import { ALL_MATCHES } from "../matches";

export interface LiveScore {
  home: number;
  away: number;
  status: "scheduled" | "in_progress" | "finished";
}

export interface LiveData {
  scores: Record<string, LiveScore>;
  standings: GroupRow[] | null;
  loading: boolean;
  error: string | null;
}

// ESPN's public soccer scoreboard (no auth, CORS-enabled)
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

// Dates that have Group G matches (YYYYMMDD)
const GROUP_G_DATES = [
  "20260615", // Belgium vs Egypt
  "20260616", // IR Iran vs New Zealand
  "20260621", // Belgium vs IR Iran
  "20260622", // New Zealand vs Egypt
  "20260626", // Egypt vs IR Iran
  "20260627", // New Zealand vs Belgium
];

// Normalise a team name for fuzzy matching (ESPN uses "Iran" we use "IR Iran")
function norm(name: string): string {
  return name.toLowerCase().replace(/^ir\s+/, "").trim();
}

// Build a key "home|away" normalised — matches our ALL_MATCHES entries
function pairKey(home: string, away: string): string {
  return `${norm(home)}|${norm(away)}`;
}

// Pre-build lookup: pair-key → match id
const PAIR_TO_ID: Record<string, string> = {};
for (const m of ALL_MATCHES) {
  PAIR_TO_ID[pairKey(m.home, m.away)] = m.id;
}

function parseEvents(events: unknown[]): Record<string, LiveScore> {
  const out: Record<string, LiveScore> = {};
  for (const event of events) {
    const e = event as Record<string, unknown>;
    const competitions = (e.competitions ?? []) as unknown[];
    if (!competitions.length) continue;
    const comp = competitions[0] as Record<string, unknown>;

    const statusRaw = (comp.status ?? {}) as Record<string, unknown>;
    const statusType = (statusRaw.type ?? {}) as Record<string, unknown>;
    const isFinished = !!statusType.completed;
    const isLive = !!statusType.inProgress;
    const status: LiveScore["status"] = isFinished
      ? "finished"
      : isLive
      ? "in_progress"
      : "scheduled";

    const competitors = (comp.competitors ?? []) as unknown[];
    let homeTeam = "";
    let awayTeam = "";
    let homeScore = 0;
    let awayScore = 0;

    for (const c of competitors) {
      const comp_c = c as Record<string, unknown>;
      const teamName = ((comp_c.team as Record<string, unknown>)?.displayName ?? "") as string;
      const score = parseInt((comp_c.score as string) ?? "0", 10) || 0;
      if (comp_c.homeAway === "home") {
        homeTeam = teamName;
        homeScore = score;
      } else {
        awayTeam = teamName;
        awayScore = score;
      }
    }

    const key = pairKey(homeTeam, awayTeam);
    const id = PAIR_TO_ID[key];
    if (id) {
      out[id] = { home: homeScore, away: awayScore, status };
    }
  }
  return out;
}

function computeStandings(scores: Record<string, LiveScore>): GroupRow[] {
  const teams = ["Belgium", "Egypt", "IR Iran", "New Zealand"];
  const rows: Record<string, GroupRow> = {};
  for (const t of teams) {
    rows[t] = { pos: 0, team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
  }

  for (const m of ALL_MATCHES) {
    if (m.group !== "G") continue;
    const s = scores[m.id];
    if (!s || s.status === "scheduled") continue;

    const home = m.home === "IR Iran" ? "IR Iran" : m.home;
    const away = m.away === "IR Iran" ? "IR Iran" : m.away;
    if (!rows[home] || !rows[away]) continue;

    rows[home].p++;
    rows[away].p++;
    rows[home].gf += s.home;
    rows[home].ga += s.away;
    rows[away].gf += s.away;
    rows[away].ga += s.home;

    if (s.home > s.away) {
      rows[home].w++;
      rows[home].pts += 3;
      rows[away].l++;
    } else if (s.home < s.away) {
      rows[away].w++;
      rows[away].pts += 3;
      rows[home].l++;
    } else {
      rows[home].d++;
      rows[away].d++;
      rows[home].pts++;
      rows[away].pts++;
    }
  }

  return Object.values(rows)
    .sort((a, b) => b.pts - a.pts || b.gf - b.ga - (a.gf - a.ga))
    .map((r, i) => ({ ...r, pos: i + 1 }));
}

export function useLiveData(): LiveData {
  const [scores, setScores] = useState<Record<string, LiveScore>>({});
  const [standings, setStandings] = useState<GroupRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      setError(null);

      try {
        const results = await Promise.allSettled(
          GROUP_G_DATES.map((d) =>
            fetch(`${ESPN_BASE}?dates=${d}&limit=20`).then((r) => r.json())
          )
        );

        if (cancelled) return;

        const merged: Record<string, LiveScore> = {};
        let anySuccess = false;

        for (const r of results) {
          if (r.status === "fulfilled") {
            anySuccess = true;
            const events = (r.value?.events ?? []) as unknown[];
            Object.assign(merged, parseEvents(events));
          }
        }

        if (!anySuccess) {
          setError("Live scores unavailable — showing scheduled times only.");
        } else {
          setScores(merged);
          setStandings(computeStandings(merged));
        }
      } catch {
        if (!cancelled) setError("Live scores unavailable — showing scheduled times only.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, []);

  return { scores, standings, loading, error };
}
