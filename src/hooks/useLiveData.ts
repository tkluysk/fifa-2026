/**
 * Fetches the full FIFA World Cup 2026 schedule + live scores from ESPN.
 * Two requests: group stage + knockout stage.
 * No static match data anywhere.
 */

import { useState, useEffect } from "react";
import type { Match } from "../matches";
import { normaliseTeamName, tvnzPathForMatch } from "../matches";

export interface LiveScore {
  home: number;
  away: number;
  status: "scheduled" | "in_progress" | "finished";
}

export interface KnockoutFixture {
  id: string;
  stage: string;        // "Round of 32", "Round of 16", "Quarterfinals", "Semifinals", "Final"
  startUtc: string;
  venue: string;
  home: string;         // may be "Group G Winner", "Round of 32 3 Winner", etc.
  away: string;
  score?: LiveScore;
  tvnzPath?: string | null;
}

// group letter → ranked list of team names (1st, 2nd, 3rd, 4th)
export type GroupStandingsMap = Record<string, string[]>;

export interface LiveData {
  matches: Match[];
  knockoutFixtures: KnockoutFixture[];
  scores: Record<string, LiveScore>;
  groupStandingsMap: GroupStandingsMap;
  advancedSet: Set<string>;    // confirmed advanced to knockout
  eliminatedSet: Set<string>;  // mathematically eliminated (4th place with all GP done)
  loading: boolean;
  error: string | null;
}

/**
 * Resolves a bracket slot label like "Third Place Group A/E/H/I/J" or
 * "Group G Winner" into a list of candidate team names from live standings.
 * Returns [] for abstract labels like "Round of 32 2 Winner".
 */
export function resolveSlot(slot: string, gsMap: GroupStandingsMap): string[] {
  const lower = slot.toLowerCase();

  // "Group X Winner" → 1st in that group
  const winnerMatch = lower.match(/^group ([a-l]) winner$/);
  if (winnerMatch) {
    const t = gsMap[winnerMatch[1].toUpperCase()]?.[0];
    return t ? [t] : [];
  }

  // "Group X 2nd Place" / "Group X Runner-up"
  const secondMatch = lower.match(/^group ([a-l]) (2nd place|runner)/);
  if (secondMatch) {
    const t = gsMap[secondMatch[1].toUpperCase()]?.[1];
    return t ? [t] : [];
  }

  // "Third Place Group A/E/H/I/J" — list 3rd-place teams from those groups
  const thirdMatch = slot.match(/Third Place Group ([A-L/]+)/i);
  if (thirdMatch) {
    const groups = thirdMatch[1].split("/");
    return groups
      .map((g) => gsMap[g.trim()]?.[2])
      .filter((t): t is string => !!t);
  }

  return [];
}

const ESPN_BASE      = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const ESPN_STANDINGS = "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings";
const TVNZ_SPORT     = "https://www.tvnz.co.nz/sport";
const GROUP_RANGE    = "20260612-20260630";
const KNOCKOUT_RANGE = "20260625-20260720"; // starts June 25 to catch early R32 matches
const POLL_INTERVAL_LIVE_MS = 60 * 1000;
const POLL_INTERVAL_IDLE_MS = 5 * 60 * 1000;

// Normalise a team name to the slug-style tokens TVNZ uses:
// "IR Iran" → "ir-iran", "Korea Republic" → "korea", "USA" → "usa", etc.
function teamToSlugTokens(name: string): string[] {
  const n = name.toLowerCase()
    .replace(/\bkorea republic\b/, "korea")
    .replace(/\bir iran\b/, "ir-iran")
    .replace(/\bivory coast\b/, "ivory-coast")
    .replace(/\bcape verde\b/, "cape-verde")
    .replace(/\bsaudi arabia\b/, "saudi-arabia")
    .replace(/\bsouth africa\b/, "southafrica")
    .replace(/\bcongo dr\b/, "congodr")
    .replace(/\bbosnia-herzegovina\b/, "bosniaherzegovina")
    .replace(/\bcosta rica\b/, "costa-rica")
    .replace(/ü/g, "u")   // Türkiye → turkiye
    .replace(/ç/g, "c")   // Curaçao → curacao
    .replace(/[^a-z0-9-]/g, "");
  return [n];
}

// Build a TVNZ slug lookup: "home-slug|away-slug" → "/liveevent/..."
// by fetching the TVNZ sport page and parsing liveevent hrefs
async function fetchTvnzSlugMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const res = await fetch(TVNZ_SPORT);
    if (!res.ok) return map;
    const html = await res.text();
    // Extract all liveevent paths, e.g. /liveevent/argentina-v-algeria
    const re = /\/liveevent\/([\w-]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const slug = m[1];
      // Must contain "-v-" to be a match event
      const vIdx = slug.indexOf("-v-");
      if (vIdx === -1) continue;
      const homePart = slug.slice(0, vIdx);
      // away part: strip trailing group identifiers like "-groupg", "-group-a"
      const awayFull = slug.slice(vIdx + 3);
      const awayPart = awayFull.replace(/-group[a-l]$/, "").replace(/-group-[a-l]$/, "").replace(/-r32$/, "").replace(/-r16$/, "");
      map.set(`${homePart}|${awayPart}`, `/liveevent/${slug}`);
    }
  } catch { /* silently ignore */ }
  return map;
}

// Given two canonical team names, look up the TVNZ path from the slug map
function tvnzPathFromSlugMap(home: string, away: string, slugMap: Map<string, string>): string | null {
  const [hSlug] = teamToSlugTokens(home);
  const [aSlug] = teamToSlugTokens(away);
  // Try exact home|away
  const direct = slugMap.get(`${hSlug}|${aSlug}`);
  if (direct) return direct;
  // Try scanning all entries where both team tokens appear
  for (const [key, path] of slugMap) {
    const [kHome, kAway] = key.split("|");
    if (kHome.includes(hSlug) && kAway.includes(aSlug)) return path;
    if (kHome.includes(aSlug) && kAway.includes(hSlug)) return path; // reversed
  }
  return null;
}

function parseGroup(note: string): string {
  const m = note.match(/Group ([A-L])\b/);
  return m ? m[1] : "?";
}

function parseGroupMatches(events: unknown[]): { matches: Match[]; scores: Record<string, LiveScore> } {
  const matches: Match[] = [];
  const scores: Record<string, LiveScore> = {};

  for (const event of events) {
    const e = event as Record<string, unknown>;
    const competitions = (e.competitions ?? []) as unknown[];
    if (!competitions.length) continue;
    const comp = competitions[0] as Record<string, unknown>;

    const altGameNote = (comp.altGameNote as string) ?? "";
    if (!altGameNote.match(/Group [A-L]/)) continue;

    const statusType = ((comp.status as Record<string, unknown>)?.type ?? {}) as Record<string, unknown>;
    const isFinished = !!statusType.completed;
    const isLive = (statusType.state as string) === "in";
    const liveStatus: LiveScore["status"] = isFinished ? "finished" : isLive ? "in_progress" : "scheduled";

    const competitors = (comp.competitors ?? []) as unknown[];
    let home = "", away = "";
    let homeScore = 0, awayScore = 0;

    for (const c of competitors) {
      const cc = c as Record<string, unknown>;
      const name = normaliseTeamName(((cc.team as Record<string, unknown>)?.displayName ?? "") as string);
      const score = parseInt((cc.score as string) ?? "0", 10) || 0;
      if (cc.homeAway === "home") { home = name; homeScore = score; }
      else { away = name; awayScore = score; }
    }

    if (!home || !away) continue;

    const id = e.id as string;
    const venueObj = comp.venue as Record<string, unknown> | undefined;
    const city = ((venueObj?.address as Record<string, unknown>)?.city as string)
      || (venueObj?.fullName as string) || "";
    matches.push({
      id, home, away,
      group: parseGroup(altGameNote),
      startUtc: (e.date as string) ?? "",
      venue: city,
      tvnzPath: tvnzPathForMatch(home, away),
    });

    if (isFinished || isLive) {
      scores[id] = { home: homeScore, away: awayScore, status: liveStatus };
    }
  }

  matches.sort((a, b) => a.startUtc.localeCompare(b.startUtc));
  return { matches, scores };
}

const STAGE_LABELS: Record<string, string> = {
  "Round of 32":   "Round of 32",
  "Round of 16":   "Round of 16",
  "Quarterfinals": "Quarter-final",
  "Semifinals":    "Semi-final",
  "Final":         "Final",
  "3rd-Place Match": "3rd Place",
};

function parseKnockoutFixtures(events: unknown[]): KnockoutFixture[] {
  const fixtures: KnockoutFixture[] = [];

  for (const event of events) {
    const e = event as Record<string, unknown>;
    const competitions = (e.competitions ?? []) as unknown[];
    if (!competitions.length) continue;
    const comp = competitions[0] as Record<string, unknown>;

    const note = (comp.altGameNote as string) ?? "";
    // Match stage label from note: "FIFA World Cup, Round of 32" etc.
    const stageMatch = note.match(/FIFA World Cup,\s*(.+)/);
    if (!stageMatch) continue;
    const rawStage = stageMatch[1].trim();
    // Skip group-stage matches (date ranges overlap) — only process known knockout stages
    if (!(rawStage in STAGE_LABELS)) continue;
    const stage = STAGE_LABELS[rawStage];

    const statusType = ((comp.status as Record<string, unknown>)?.type ?? {}) as Record<string, unknown>;
    const isFinished = !!statusType.completed;
    const isLive = (statusType.state as string) === "in";
    const liveStatus: LiveScore["status"] = isFinished ? "finished" : isLive ? "in_progress" : "scheduled";

    const competitors = (comp.competitors ?? []) as unknown[];
    let home = "", away = "";
    let homeScore = 0, awayScore = 0;

    for (const c of competitors) {
      const cc = c as Record<string, unknown>;
      const name = normaliseTeamName(((cc.team as Record<string, unknown>)?.displayName ?? "") as string);
      const score = parseInt((cc.score as string) ?? "0", 10) || 0;
      if (cc.homeAway === "home") { home = name; homeScore = score; }
      else { away = name; awayScore = score; }
    }

    if (!home || !away) continue;

    const koVenueObj = comp.venue as Record<string, unknown> | undefined;
    const koCity = ((koVenueObj?.address as Record<string, unknown>)?.city as string)
      || (koVenueObj?.fullName as string) || "";
    const fixture: KnockoutFixture = {
      id: e.id as string,
      stage,
      startUtc: (e.date as string) ?? "",
      venue: koCity,
      home,
      away,
    };
    if (isFinished || isLive) {
      fixture.score = { home: homeScore, away: awayScore, status: liveStatus };
    }
    fixtures.push(fixture);
  }

  return fixtures.sort((a, b) => a.startUtc.localeCompare(b.startUtc));
}

/**
 * Returns the full bracket path for a country — from their R32 all the way
 * to the Final — by chaining slot labels forward.
 *
 * ESPN encodes the bracket as:
 *   R32 #2: Belgium vs Third Place ...
 *   R16 #11: Round of 32 2 Winner vs Round of 32 5 Winner
 *   QF  #19: Round of 16 5 Winner vs Round of 16 6 Winner
 *   SF  #22: Quarterfinal 1 Winner vs Quarterfinal 2 Winner
 *   F   #25: Semifinal 1 Winner vs Semifinal 2 Winner
 *
 * We start by finding the fixture where the country is named (or is in a
 * group slot), then derive the "winner label" for that fixture's position
 * and recursively find the next fixture that mentions it.
 */
/**
 * Extract a single number from a slot label like "Round of 32 2 Winner" → 2.
 * Returns null if not found.
 */
function slotNum(label: string): number | null {
  const m = label.match(/\b(\d+)\s+winner\b/i);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Given a fixture and which side (home/away) the country is on,
 * return the slot label they'd become as a winner, e.g. "Round of 32 2 Winner".
 * We look at the QF/SF/Final fixtures to find which slot number references this fixture.
 */
function winnerSlotLabel(fixture: KnockoutFixture, fixtures: KnockoutFixture[]): string | null {
  const stagePrefix: Record<string, string> = {
    "Round of 32":   "Round of 32",
    "Round of 16":   "Round of 16",
    "Quarter-final": "Quarterfinal",
    "Semi-final":    "Semifinal",
  };
  const prefix = stagePrefix[fixture.stage];
  if (!prefix) return null;

  const nextStageName: Record<string, string> = {
    "Round of 32":   "Round of 16",
    "Round of 16":   "Quarter-final",
    "Quarter-final": "Semi-final",
    "Semi-final":    "Final",
  };
  const nextStage = nextStageName[fixture.stage];
  if (!nextStage) return null;

  // Sort this stage's fixtures by date — gives us a stable 1-based index
  const sameStage = fixtures
    .filter(f => f.stage === fixture.stage)
    .sort((a, b) => a.startUtc.localeCompare(b.startUtc));
  const myIdx = sameStage.findIndex(f => f.id === fixture.id);
  if (myIdx === -1) return null;

  // Scan next-round fixtures: find which slot label references `prefix N Winner`
  // where the Nth date-sorted fixture in our stage is this fixture.
  // We collect all slot numbers mentioned in next-round fixtures, then find which
  // number N satisfies: sameStage[N-1].id === fixture.id.
  const nextFixtures = fixtures.filter(f => f.stage === nextStage);
  const prefixLower = prefix.toLowerCase();

  for (const nf of nextFixtures) {
    for (const slot of [nf.home, nf.away]) {
      if (!slot.toLowerCase().startsWith(prefixLower)) continue;
      const num = slotNum(slot);
      if (num === null) continue;
      // num is ESPN's slot number. Check if the num-th fixture (1-based, date-sorted)
      // in our stage is this fixture.
      if (sameStage[num - 1]?.id === fixture.id) {
        return slot; // return the exact slot label ESPN uses (preserving capitalisation)
      }
    }
  }

  // Fallback: if no downstream fixture found yet (e.g. early in tournament),
  // use date-sort index. This will work once R16+ fixtures populate.
  return `${prefix} ${myIdx + 1} Winner`;
}

export function knockoutPathForCountry(
  country: string,
  group: string,
  fixtures: KnockoutFixture[]
): KnockoutFixture[] {
  const lower = country.toLowerCase();
  const groupSlots = [
    `group ${group} winner`,
    `group ${group} 2nd place`,
    `group ${group} runner`,
  ];

  function slotMatches(slot: string, label: string): boolean {
    return slot.toLowerCase().includes(label.toLowerCase());
  }

  function findFixtureContaining(label: string): KnockoutFixture | undefined {
    return fixtures.find(f =>
      slotMatches(f.home, label) || slotMatches(f.away, label)
    );
  }

  // Find R32 fixture
  const r32 = fixtures.find(f => {
    const h = f.home.toLowerCase();
    const a = f.away.toLowerCase();
    return h === lower || a === lower ||
      groupSlots.some(slot => h.includes(slot) || a.includes(slot));
  });
  if (!r32) return [];

  const path: KnockoutFixture[] = [r32];

  // Chain: each step we find the winner-slot label for the current fixture,
  // then search for the next fixture that contains that label.
  let current = r32;
  for (let depth = 0; depth < 4; depth++) {
    const lbl = winnerSlotLabel(current, fixtures);
    if (!lbl) break;
    const next = findFixtureContaining(lbl);
    if (!next) break;
    path.push(next);
    current = next;
  }

  return path;
}

export function useLiveData(): LiveData {
  const [matches, setMatches] = useState<Match[]>([]);
  const [knockoutFixtures, setKnockoutFixtures] = useState<KnockoutFixture[]>([]);
  const [scores, setScores] = useState<Record<string, LiveScore>>({});
  const [groupStandingsMap, setGroupStandingsMap] = useState<GroupStandingsMap>({});
  const [advancedSet, setAdvancedSet] = useState<Set<string>>(new Set());
  const [eliminatedSet, setEliminatedSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    async function fetchAll(background = false) {
      if (!background) setLoading(true);
      setError(null);

      let fetchedScores: Record<string, LiveScore> = {};
      try {
        const [groupRes, knockoutRes, standingsRes, tvnzSlugMap] = await Promise.all([
          fetch(`${ESPN_BASE}?dates=${GROUP_RANGE}&limit=200`),
          fetch(`${ESPN_BASE}?dates=${KNOCKOUT_RANGE}&limit=200`),
          fetch(ESPN_STANDINGS),
          fetchTvnzSlugMap(),
        ]);

        if (cancelled) return;

        const groupJson = await groupRes.json();
        const knockoutJson = await knockoutRes.json();
        const standingsJson = await standingsRes.json();

        if (cancelled) return;

        const { matches: fetched, scores: parsed } = parseGroupMatches(groupJson.events ?? []);
        const knockouts = parseKnockoutFixtures(knockoutJson.events ?? []);

        // Apply dynamic TVNZ links to group matches and knockout fixtures
        for (const m of fetched) {
          if (!m.tvnzPath) {
            m.tvnzPath = tvnzPathFromSlugMap(m.home, m.away, tvnzSlugMap);
          }
        }
        for (const f of knockouts) {
          if (!f.tvnzPath) {
            f.tvnzPath = tvnzPathFromSlugMap(f.home, f.away, tvnzSlugMap);
          }
        }
        fetchedScores = parsed;

        // Build group standings map + advanced/eliminated sets
        const gsMap: GroupStandingsMap = {};
        const advanced = new Set<string>();
        const eliminated = new Set<string>();

        for (const group of standingsJson.children ?? []) {
          const name: string = group.name ?? "";
          const letter = name.match(/Group ([A-L])/)?.[1];
          if (!letter) continue;
          const entries: {
            team: { displayName: string };
            stats: { abbreviation: string; value: number; displayValue: string }[];
          }[] = group.standings?.entries ?? [];

          const ranked = entries.map((e) => {
            const sm: Record<string, number> = {};
            for (const s of e.stats) sm[s.abbreviation] = s.value;
            return {
              team: normaliseTeamName(e.team.displayName),
              adv: (sm["ADV"] ?? 0) === 1,
              gp: sm["GP"] ?? sm["gamesPlayed"] ?? 0,
            };
          });

          gsMap[letter] = ranked.map(r => r.team);

          const allDone = ranked.every(r => r.gp >= 3);
          ranked.forEach((r, idx) => {
            if (r.adv) {
              advanced.add(r.team);
            } else if (allDone && idx === ranked.length - 1) {
              // 4th place with all games played → definitely eliminated
              eliminated.add(r.team);
            }
          });
        }

        setMatches(fetched);
        setScores(parsed);
        setKnockoutFixtures(knockouts);
        setGroupStandingsMap(gsMap);
        setAdvancedSet(advanced);
        setEliminatedSet(eliminated);
      } catch (err) {
        if (!cancelled) setError(`Live data unavailable: ${err}`);
      } finally {
        if (!background && !cancelled) setLoading(false);
      }

      if (!cancelled) {
        const hasLive = Object.values(fetchedScores).some((s) => s.status === "in_progress");
        const delay = hasLive ? POLL_INTERVAL_LIVE_MS : POLL_INTERVAL_IDLE_MS;
        timerId = setTimeout(() => fetchAll(true), delay);
      }
    }

    fetchAll();
    return () => { cancelled = true; if (timerId) clearTimeout(timerId); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { matches, knockoutFixtures, scores, groupStandingsMap, advancedSet, eliminatedSet, loading, error };
}
