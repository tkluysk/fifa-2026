/**
 * Fetches live standings and roster data for any World Cup team from ESPN.
 * Works for all 32 teams, no hardcoded country data.
 */

import { useState, useCallback } from "react";

// ESPN team IDs for all 32 WC 2026 teams
export const ESPN_TEAM_IDS: Record<string, string> = {
  "Algeria": "624",
  "Argentina": "202",
  "Australia": "628",
  "Austria": "474",
  "Belgium": "459",
  "Bosnia-Herzegovina": "452",
  "Brazil": "205",
  "Canada": "206",
  "Cape Verde": "2597",
  "Colombia": "208",
  "Congo DR": "2850",
  "Croatia": "477",
  "Curaçao": "11678",
  "Czechia": "450",
  "Ecuador": "209",
  "Egypt": "2620",
  "England": "448",
  "France": "478",
  "Germany": "481",
  "Ghana": "4469",
  "Haiti": "2654",
  "IR Iran": "469",
  "Iraq": "4375",
  "Ivory Coast": "4789",
  "Japan": "627",
  "Jordan": "2917",
  "Korea Republic": "451",
  "Mexico": "203",
  "Morocco": "2869",
  "Netherlands": "449",
  "New Zealand": "2666",
  "Norway": "464",
  "Panama": "2659",
  "Paraguay": "210",
  "Portugal": "482",
  "Qatar": "4398",
  "Saudi Arabia": "655",
  "Scotland": "580",
  "Senegal": "654",
  "South Africa": "467",
  "Spain": "164",
  "Sweden": "466",
  "Switzerland": "475",
  "Tunisia": "659",
  "Türkiye": "465",
  "USA": "660",
  "Uruguay": "212",
  "Uzbekistan": "2570",
};

export interface StandingRow {
  pos: number;
  team: string;
  teamId: string;
  logoUrl: string;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  advanced: boolean;
}

export interface GroupStandings {
  groupName: string;
  rows: StandingRow[];
}

export interface Player {
  id: string;
  name: string;
  shortName: string;
  jersey: string;
  position: string;
  positionAbbr: string;
  age: number;
  nationality: string;
  clubTeam: string;
  status: "active" | "injured" | "suspended" | "out";
  injuryNote: string;
  // tournament stats
  apps: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  saves?: number;
  goalsConceded?: number;
  shots?: number;
  shotsOnTarget?: number;
}

export interface CountryData {
  groupStandings: GroupStandings | null;
  roster: Player[];
  loading: boolean;
  error: string | null;
}

const ESPN_STANDINGS = "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings";
const ESPN_ROSTER = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams";

// Cache to avoid re-fetching on every modal open
const standingsCache: { data: GroupStandings[] | null } = { data: null };
const rosterCache: Record<string, Player[]> = {};

function parseStat(stats: Record<string, string>, abbr: string): number {
  return parseFloat(stats[abbr] ?? "0") || 0;
}

function parseStandings(raw: unknown): GroupStandings[] {
  const d = raw as { children: unknown[] };
  return d.children.map((g) => {
    const group = g as { name: string; standings: { entries: unknown[] } };
    const rows: StandingRow[] = group.standings.entries.map((e, i) => {
      const entry = e as {
        team: { displayName: string; id: string; logos: { href: string }[] };
        stats: { abbreviation: string; value: number }[];
      };
      const statMap: Record<string, number> = {};
      for (const s of entry.stats) statMap[s.abbreviation] = s.value;
      return {
        pos: i + 1,
        team: entry.team.displayName,
        teamId: entry.team.id,
        logoUrl: entry.team.logos?.[0]?.href ?? "",
        p: statMap["GP"] ?? 0,
        w: statMap["W"] ?? 0,
        d: statMap["D"] ?? 0,
        l: statMap["L"] ?? 0,
        gf: statMap["F"] ?? 0,
        ga: statMap["A"] ?? 0,
        gd: statMap["GD"] ?? 0,
        pts: statMap["P"] ?? 0,
        advanced: (statMap["ADV"] ?? 0) === 1,
      };
    });
    return { groupName: group.name, rows };
  });
}

function parseRoster(raw: unknown): Player[] {
  const d = raw as { athletes: unknown[] };
  return d.athletes.map((a) => {
    const athlete = a as {
      id: string;
      displayName: string;
      shortName: string;
      jersey?: string;
      age?: number;
      citizenship?: string;
      position?: { displayName: string; abbreviation: string };
      status?: { type: string };
      injuries?: { type?: { name: string } }[];
      defaultTeam?: { displayName: string };
      statistics?: { splits?: { categories?: { stats: { abbreviation: string; displayValue: string }[] }[] } };
    };

    const statsMap: Record<string, string> = {};
    for (const cat of athlete.statistics?.splits?.categories ?? []) {
      for (const s of cat.stats) statsMap[s.abbreviation] = s.displayValue;
    }

    const statusType = athlete.status?.type ?? "active";
    const injury = athlete.injuries?.[0]?.type?.name ?? "";
    let status: Player["status"] = "active";
    if (statusType === "out" || injury.toLowerCase().includes("out")) status = "out";
    else if (injury) status = "injured";
    else if (statusType === "suspended") status = "suspended";

    return {
      id: athlete.id,
      name: athlete.displayName,
      shortName: athlete.shortName,
      jersey: athlete.jersey ?? "?",
      position: athlete.position?.displayName ?? "Unknown",
      positionAbbr: athlete.position?.abbreviation ?? "?",
      age: athlete.age ?? 0,
      nationality: athlete.citizenship ?? "",
      clubTeam: athlete.defaultTeam?.displayName ?? "",
      status,
      injuryNote: injury,
      apps: parseStat(statsMap, "APP"),
      goals: parseStat(statsMap, "G"),
      assists: parseStat(statsMap, "A"),
      yellowCards: parseStat(statsMap, "YC"),
      redCards: parseStat(statsMap, "RC"),
      saves: parseStat(statsMap, "SV") || undefined,
      goalsConceded: parseStat(statsMap, "GA") || undefined,
      shots: parseStat(statsMap, "SHOT") || undefined,
      shotsOnTarget: parseStat(statsMap, "SOG") || undefined,
    };
  });
}

// Normalise ESPN team names → our app names (ESPN uses "Iran", "South Korea", "United States")
function normaliseTeamName(espnName: string): string {
  const map: Record<string, string> = {
    "Iran": "IR Iran",
    "South Korea": "Korea Republic",
    "United States": "USA",
  };
  return map[espnName] ?? espnName;
}

export function useCountryData() {
  const [data, setData] = useState<Record<string, CountryData>>({});

  const fetch = useCallback(async (country: string) => {
    // Always re-fetch standings so group tables reflect live results.
    // Roster is stable during the tournament — skip if already loaded.
    const rosterAlreadyLoaded = data[country]?.roster.length > 0;
    standingsCache.data = null; // bust so ESPN standings are re-fetched

    setData((prev) => ({
      ...prev,
      [country]: { groupStandings: null, roster: [], loading: true, error: null },
    }));

    try {
      // Fetch standings (shared/cached across all countries)
      let allGroups: GroupStandings[];
      if (standingsCache.data) {
        allGroups = standingsCache.data;
      } else {
        const res = await globalThis.fetch(ESPN_STANDINGS);
        const raw = await res.json();
        allGroups = parseStandings(raw);
        standingsCache.data = allGroups;
      }

      // Find the group this country belongs to
      const groupStandings = allGroups.find((g) =>
        g.rows.some((r) => normaliseTeamName(r.team) === country || r.team === country)
      ) ?? null;

      // Normalise team names inside the found group
      if (groupStandings) {
        groupStandings.rows = groupStandings.rows.map((r) => ({
          ...r,
          team: normaliseTeamName(r.team),
        }));
      }

      // Fetch roster (cached per team — stable during the tournament)
      const teamId = ESPN_TEAM_IDS[country];
      let roster: Player[] = rosterAlreadyLoaded ? (data[country]?.roster ?? []) : [];

      if (teamId && !rosterAlreadyLoaded) {
        if (rosterCache[teamId]) {
          roster = rosterCache[teamId];
        } else {
          const rRes = await globalThis.fetch(`${ESPN_ROSTER}/${teamId}/roster`);
          if (rRes.ok) {
            const rRaw = await rRes.json();
            roster = parseRoster(rRaw);
            rosterCache[teamId] = roster;
          }
        }
      }

      setData((prev) => ({
        ...prev,
        [country]: { groupStandings, roster, loading: false, error: null },
      }));
    } catch (err) {
      setData((prev) => ({
        ...prev,
        [country]: {
          groupStandings: null,
          roster: [],
          loading: false,
          error: String(err),
        },
      }));
    }
  }, [data]);

  return { data, fetch };
}
