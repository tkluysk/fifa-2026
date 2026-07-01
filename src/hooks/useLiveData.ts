/**
 * Fetches the full FIFA World Cup 2026 schedule + live scores from ESPN.
 * Two requests: group stage + knockout stage.
 * No static match data anywhere.
 */

import { useState, useEffect } from "react";
import type { Match } from "../matches";
import { normaliseTeamName, tvnzPathForMatch } from "../matches";
import { BRACKET_2026, DEFINITE_SLOT_TO_MATCH } from "../bracket2026";
import type { Round, Feeder } from "../bracket2026";

export interface MatchCard {
  player: string;
  minute: string;
  type: "yellow" | "red" | "yellow-red";
}

export interface GoalEvent {
  player: string;
  minute: string;
  ownGoal: boolean;
  penalty: boolean;
}

export interface SubEvent {
  playerOn: string;
  playerOff: string;
  minute: string;
}

export interface MatchStats {
  homePossession?: number;
  awayPossession?: number;
  homeShots?: number;
  awayShots?: number;
  homeShotsOnTarget?: number;
  awayShotsOnTarget?: number;
}

export interface LiveScore {
  home: number;
  away: number;
  status: "scheduled" | "in_progress" | "finished";
  clock?: string;
  homeCards?: MatchCard[];
  awayCards?: MatchCard[];
  homeGoals?: GoalEvent[];
  awayGoals?: GoalEvent[];
  homeSubs?: SubEvent[];
  awaySubs?: SubEvent[];
  stats?: MatchStats;
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
  bracketTree: BracketTree;
  scores: Record<string, LiveScore>;
  groupStandingsMap: GroupStandingsMap;
  advancedSet: Set<string>;    // confirmed advanced to knockout
  eliminatedSet: Set<string>;  // mathematically eliminated (4th place with all GP done)
  loading: boolean;
  error: string | null;
}

/**
 * Resolves a group-stage slot label ("Group G Winner", "Group G 2nd Place",
 * "Third Place Group A/E/H") to candidate team names from live standings.
 * Never touches knockout slot labels — those are handled by the bracket tree.
 */
export function resolveSlot(slot: string, gsMap: GroupStandingsMap): string[] {
  const lower = slot.toLowerCase();

  const winnerMatch = lower.match(/^group ([a-l]) winner$/);
  if (winnerMatch) {
    const t = gsMap[winnerMatch[1].toUpperCase()]?.[0];
    return t ? [t] : [];
  }

  const secondMatch = lower.match(/^group ([a-l]) (2nd place|runner)/);
  if (secondMatch) {
    const t = gsMap[secondMatch[1].toUpperCase()]?.[1];
    return t ? [t] : [];
  }

  const thirdMatch = slot.match(/Third Place Group ([A-L/]+)/i);
  if (thirdMatch) {
    const groups = thirdMatch[1].split("/");
    return groups
      .map((g) => gsMap[g.trim()]?.[2])
      .filter((t): t is string => !!t);
  }

  return [];
}

const isTBDSlot = (s: string) =>
  /(group|round of|winner|place|runner|loser|quarterfinal|semifinal|third)/i.test(s);

/**
 * Bracket tree: maps each fixture ID to its two feeder fixture IDs.
 * Built once from the raw ESPN data at fetch time. Navigation is by ID only —
 * no slot label strings are parsed at query time.
 *
 * feedersOf[id] = [homeFeederFixtureId, awayFeederFixtureId]  (either may be null)
 * parentOf[id]  = parentFixtureId  (undefined for Final)
 */
export interface BracketTree {
  feedersOf: Map<string, [string | null, string | null]>;
  parentOf:  Map<string, string>;
}

/** Normalised stage string → bracket round. */
function roundOfStage(stage: string): Round | null {
  if (/32/.test(stage)) return "R32";
  if (/16/.test(stage)) return "R16";
  if (/quarter/i.test(stage)) return "QF";
  if (/semi/i.test(stage)) return "SF";
  if (/3rd|third|bronze/i.test(stage)) return "BRONZE";
  if (/final/i.test(stage)) return "FINAL";
  return null;
}

/** Real team name → its group slot ("1A" winner, "2B" runner-up, "3C" third),
 *  from the live group standings. Null if the team isn't found. */
function teamGroupSlot(team: string, gsMap: GroupStandingsMap): string | null {
  const t = team.toLowerCase();
  for (const [g, ranked] of Object.entries(gsMap)) {
    if (ranked[0]?.toLowerCase() === t) return `1${g}`;
    if (ranked[1]?.toLowerCase() === t) return `2${g}`;
    if (ranked[2]?.toLowerCase() === t) return `3${g}`;
  }
  return null;
}

/** A group-placement placeholder label → slot. "Group A Winner" → "1A",
 *  "Group C Runner-up"/"Group C 2nd Place" → "2C". These are real tournament
 *  mechanics (resolvable from standings), unlike ESPN's brittle
 *  "Round of N Winner" bracket bookkeeping, which we never parse. */
function parseGroupSlotLabel(label: string): string | null {
  const win = label.match(/group ([a-l]) winner/i);
  if (win) return `1${win[1].toUpperCase()}`;
  const run = label.match(/group ([a-l]) (runner|2nd)/i);
  if (run) return `2${run[1].toUpperCase()}`;
  return null;
}

/**
 * Build the bracket tree by anchoring each ESPN fixture onto the fixed FIFA
 * match numbers (73–104) from the bracket model (src/bracket2026.ts), then
 * reading parent/feeder wiring straight from that model. ESPN supplies only team
 * identities and outcomes — never the tournament structure. No "Round of N
 * Winner" strings and no reliance on ESPN's fixture ordering are involved.
 *
 * Anchoring:
 *  1. R32 — identify each fixture by its *definite* group slot (a specific group
 *     winner or runner-up), resolved from standings or a group-slot placeholder.
 *  2. R16→Final — propagate: a real team in a later-round fixture is the winner
 *     of an already-anchored feeder match, whose model `.next` names this match.
 *  3. Leftover all-unplayed fixtures — assign to the remaining model matches of
 *     their round by kick-off order (best-effort; self-corrects as games play).
 */
export function buildBracketTree(fixtures: KnockoutFixture[], gsMap: GroupStandingsMap = {}): BracketTree {
  const matchToFixture = new Map<number, string>();
  const fixtureToMatch = new Map<string, number>();
  const byId = new Map(fixtures.map(f => [f.id, f]));

  const anchor = (fixtureId: string, match: number) => {
    if (matchToFixture.has(match) || fixtureToMatch.has(fixtureId)) return;
    matchToFixture.set(match, fixtureId);
    fixtureToMatch.set(fixtureId, match);
  };

  const byRound = new Map<Round, KnockoutFixture[]>();
  for (const f of fixtures) {
    const r = roundOfStage(f.stage);
    if (!r) continue;
    if (!byRound.has(r)) byRound.set(r, []);
    byRound.get(r)!.push(f);
  }

  // 1. Anchor R32 by its definite group slot.
  for (const f of byRound.get("R32") ?? []) {
    for (const team of [f.home, f.away]) {
      const slot = teamGroupSlot(team, gsMap) ?? parseGroupSlotLabel(team);
      if (slot && (slot[0] === "1" || slot[0] === "2")) {
        const m = DEFINITE_SLOT_TO_MATCH[slot];
        if (m) { anchor(f.id, m); break; }
      }
    }
  }

  // 2. Propagate up: a later-round fixture carrying a real team is identified by
  //    the already-anchored feeder match that team won (model `.next`). Repeat
  //    so QF/SF/Final resolve as their feeders get anchored.
  const laterRounds: Round[] = ["R16", "QF", "SF", "FINAL", "BRONZE"];
  for (let pass = 0; pass < laterRounds.length; pass++) {
    for (const round of laterRounds) {
      for (const f of byRound.get(round) ?? []) {
        if (fixtureToMatch.has(f.id)) continue;
        for (const team of [f.home, f.away]) {
          if (isTBDSlot(team)) continue;
          const t = team.toLowerCase();
          let feederMatch: number | undefined;
          for (const [m, fid] of matchToFixture) {
            const ff = byId.get(fid);
            if (ff && fixtureWinner(ff)?.toLowerCase() === t) { feederMatch = m; break; }
          }
          const next = feederMatch != null ? BRACKET_2026[feederMatch]?.next : null;
          if (next != null && !matchToFixture.has(next)) { anchor(f.id, next); break; }
        }
      }
    }
  }

  // 3. Leftover fixtures (both feeders still unplayed) → remaining model matches
  //    of that round, paired by kick-off time. Best-effort only; the structure
  //    still comes from the model, and this self-corrects as games resolve.
  for (const round of ["R32", ...laterRounds] as Round[]) {
    const free = Object.values(BRACKET_2026)
      .filter(m => m.round === round && !matchToFixture.has(m.match))
      .map(m => m.match)
      .sort((a, b) => a - b);
    const orphans = (byRound.get(round) ?? [])
      .filter(f => !fixtureToMatch.has(f.id))
      .sort((a, b) => a.startUtc.localeCompare(b.startUtc));
    orphans.forEach((f, i) => { if (free[i] != null) anchor(f.id, free[i]); });
  }

  // Read parent/feeder wiring straight from the model.
  const feedersOf = new Map<string, [string | null, string | null]>();
  const parentOf  = new Map<string, string>();
  const feederMatchOf = (side: Feeder): number | null =>
    side.kind === "winnerOf" ? side.match : null; // loserOf (bronze) has no bracket feeder

  for (const [match, fixtureId] of matchToFixture) {
    const model = BRACKET_2026[match];
    if (!model) continue;
    const homeM = feederMatchOf(model.home);
    const awayM = feederMatchOf(model.away);
    if (homeM == null && awayM == null) continue; // R32: fed by the group stage
    const homeFid = homeM != null ? matchToFixture.get(homeM) ?? null : null;
    const awayFid = awayM != null ? matchToFixture.get(awayM) ?? null : null;
    feedersOf.set(fixtureId, [homeFid, awayFid]);
    if (homeFid) parentOf.set(homeFid, fixtureId);
    if (awayFid) parentOf.set(awayFid, fixtureId);
  }

  return { feedersOf, parentOf };
}

/**
 * Given a fixture and the bracket tree, return the winner of that fixture
 * (if finished), or null if still TBD.
 */
function fixtureWinner(f: KnockoutFixture): string | null {
  if (f.score?.status !== "finished") return null;
  if (f.score.home > f.score.away) return f.home;
  if (f.score.away > f.score.home) return f.away;
  return null;
}

/**
 * Recursively collects all possible teams that could appear in a fixture slot
 * by walking the bracket tree upward (toward R32 leaves).
 *
 * Returns a single-element array when the outcome is confirmed, or multiple
 * candidates when the slot is still undecided.
 */
export function upstreamTeams(
  fixtureId: string,
  side: "home" | "away",
  fixtureMap: Map<string, KnockoutFixture>,
  tree: BracketTree,
  gsMap: GroupStandingsMap,
  depth = 0
): string[] {
  if (depth > 6) return [];

  const f = fixtureMap.get(fixtureId);
  if (!f) return [];

  const slot = side === "home" ? f.home : f.away;

  // Already a real team name
  if (!isTBDSlot(slot)) return [slot];

  // Group-stage slot: resolve from standings
  if (/^(group |third place group)/i.test(slot)) {
    return resolveSlot(slot, gsMap);
  }

  // Knockout slot: look up the feeder fixture from the tree
  const feeders = tree.feedersOf.get(fixtureId);
  const feederId = feeders?.[side === "home" ? 0 : 1] ?? null;
  if (!feederId) return []; // no feeder linked yet

  const feeder = fixtureMap.get(feederId);
  if (!feeder) return [];

  // If the feeder is finished, return the winner
  const winner = fixtureWinner(feeder);
  if (winner) return [winner];

  // Feeder not yet finished — recurse into both of its slots
  return [
    ...upstreamTeams(feederId, "home", fixtureMap, tree, gsMap, depth + 1),
    ...upstreamTeams(feederId, "away", fixtureMap, tree, gsMap, depth + 1),
  ];
}

const ESPN_BASE      = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const ESPN_SUMMARY   = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary";
const ESPN_STANDINGS = "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings";
const GROUP_RANGE    = "20260611-20260630";
const KNOCKOUT_RANGE = "20260625-20260720"; // starts June 25 to catch early R32 matches
const POLL_INTERVAL_LIVE_MS = 60 * 1000;
const POLL_INTERVAL_IDLE_MS = 5 * 60 * 1000;

// Cache subs for finished games — they never change, no need to re-fetch each poll
const finishedSubsCache = new Map<string, { homeSubs: SubEvent[]; awaySubs: SubEvent[] }>();

// Run promises with at most `limit` in-flight at once — avoids ESPN rate-limiting
// when fetching subs for 70+ finished games on first load.
async function pMap<T>(ids: string[], fn: (id: string) => Promise<T>, limit = 5): Promise<T[]> {
  const results: T[] = new Array(ids.length);
  let next = 0;
  async function worker() {
    while (next < ids.length) {
      const i = next++;
      results[i] = await fn(ids[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, ids.length) }, worker));
  return results;
}

async function fetchSubsForEvent(eventId: string): Promise<{ homeSubs: SubEvent[]; awaySubs: SubEvent[] }> {
  try {
    const r = await fetch(`${ESPN_SUMMARY}?event=${eventId}`);
    const d = await r.json();
    const rosters = (d.rosters ?? []) as { homeAway: string; team: { id: string } }[];
    const homeTeamId = rosters.find(r => r.homeAway === "home")?.team.id ?? "";
    const keyEvents = (d.keyEvents ?? []) as Record<string, unknown>[];
    const homeSubs: SubEvent[] = [];
    const awaySubs: SubEvent[] = [];
    for (const ev of keyEvents) {
      if ((ev.type as Record<string, unknown>)?.type !== "substitution") continue;
      const minute = (ev.clock as Record<string, unknown>)?.displayValue as string ?? "";
      const participants = (ev.participants ?? []) as Record<string, unknown>[];
      const a0 = (participants[0]?.athlete ?? {}) as Record<string, unknown>;
      const a1 = (participants[1]?.athlete ?? {}) as Record<string, unknown>;
      const playerOn = (a0.shortName as string) ?? (a0.displayName as string) ?? "";
      const playerOff = (a1.shortName as string) ?? (a1.displayName as string) ?? "";
      const teamId = (ev.team as Record<string, unknown>)?.id as string ?? "";
      (teamId === homeTeamId ? homeSubs : awaySubs).push({ playerOn, playerOff, minute });
    }
    return { homeSubs, awaySubs };
  } catch {
    return { homeSubs: [], awaySubs: [] };
  }
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
    const venueAddr = (venueObj?.address as Record<string, unknown>) ?? {};
    const stadiumName = (venueObj?.fullName as string) || "";
    const venueCity = (venueAddr.city as string) || "";
    const venueCountry = (venueAddr.country as string) || "";
    const venueParts = [stadiumName, venueCity, venueCountry].filter(Boolean);
    const venue = venueParts.join(", ");
    matches.push({
      id, home, away,
      group: parseGroup(altGameNote),
      startUtc: (e.date as string) ?? "",
      venue,
      tvnzPath: tvnzPathForMatch(home, away),
    });

    if (isFinished || isLive) {
      const clock = ((comp.status as Record<string, unknown>)?.displayClock as string) ?? undefined;
      const details = (comp.details ?? []) as Record<string, unknown>[];
      const homeTeamId = (() => {
        for (const c of competitors) {
          const cc = c as Record<string, unknown>;
          if (cc.homeAway === "home") return ((cc.team as Record<string, unknown>)?.id as string) ?? "";
        }
        return "";
      })();

      const homeCards: MatchCard[] = [];
      const awayCards: MatchCard[] = [];
      const homeGoals: GoalEvent[] = [];
      const awayGoals: GoalEvent[] = [];
      const homeSubs: SubEvent[] = [];
      const awaySubs: SubEvent[] = [];
      for (const d of details) {
        const isYellow = !!(d.yellowCard);
        const isRed = !!(d.redCard);
        const isGoal = !!(d.scoringPlay);
        const isSub = !!(d.substitution);
        const minute = ((d.clock as Record<string, unknown>)?.displayValue as string) ?? "";
        const athletes = (d.athletesInvolved ?? []) as Record<string, unknown>[];
        const player = (athletes[0]?.shortName as string) ?? (athletes[0]?.displayName as string) ?? "";
        const teamId = ((d.team as Record<string, unknown>)?.id as string) ?? "";
        if (isGoal) {
          const goal: GoalEvent = { player, minute, ownGoal: !!(d.ownGoal), penalty: !!(d.penaltyKick) };
          (teamId === homeTeamId ? homeGoals : awayGoals).push(goal);
        } else if (isSub) {
          const playerOff = (athletes[1]?.shortName as string) ?? (athletes[1]?.displayName as string) ?? "";
          const sub: SubEvent = { playerOn: player, playerOff, minute };
          (teamId === homeTeamId ? homeSubs : awaySubs).push(sub);
        } else if (isYellow || isRed) {
          const type: MatchCard["type"] = isRed && isYellow ? "yellow-red" : isRed ? "red" : "yellow";
          (teamId === homeTeamId ? homeCards : awayCards).push({ player, minute, type });
        }
      }

      // Parse team stats from competitors
      let stats: MatchStats | undefined;
      for (const c of competitors) {
        const cc = c as Record<string, unknown>;
        const isHome = cc.homeAway === "home";
        const statsList = (cc.statistics ?? []) as Record<string, unknown>[];
        for (const s of statsList) {
          const name = s.name as string;
          const val = parseFloat(s.value as string);
          if (isNaN(val)) continue;
          if (!stats) stats = {};
          if (name === "possessionPct") isHome ? (stats.homePossession = val) : (stats.awayPossession = val);
          if (name === "totalShots") isHome ? (stats.homeShots = val) : (stats.awayShots = val);
          if (name === "shotsOnTarget") isHome ? (stats.homeShotsOnTarget = val) : (stats.awayShotsOnTarget = val);
        }
      }

      scores[id] = { home: homeScore, away: awayScore, status: liveStatus, clock, homeCards, awayCards, homeGoals, awayGoals, homeSubs, awaySubs, stats };
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
    const koVenueAddr = (koVenueObj?.address as Record<string, unknown>) ?? {};
    const koStadiumName = (koVenueObj?.fullName as string) || "";
    const koCity = (koVenueAddr.city as string) || "";
    const koCountry = (koVenueAddr.country as string) || "";
    const koVenue = [koStadiumName, koCity, koCountry].filter(Boolean).join(", ");
    const fixture: KnockoutFixture = {
      id: e.id as string,
      stage,
      startUtc: (e.date as string) ?? "",
      venue: koVenue,
      home,
      away,
      tvnzPath: tvnzPathForMatch(home, away),
    };
    if (isFinished || isLive) {
      const clock = ((comp.status as Record<string, unknown>)?.displayClock as string) ?? undefined;
      const details = (comp.details ?? []) as Record<string, unknown>[];
      const homeTeamId = (() => {
        for (const c of competitors) {
          const cc = c as Record<string, unknown>;
          if (cc.homeAway === "home") return ((cc.team as Record<string, unknown>)?.id as string) ?? "";
        }
        return "";
      })();
      const homeCards: MatchCard[] = [];
      const awayCards: MatchCard[] = [];
      const homeGoals: GoalEvent[] = [];
      const awayGoals: GoalEvent[] = [];
      const homeSubs: SubEvent[] = [];
      const awaySubs: SubEvent[] = [];
      for (const d of details) {
        const isYellow = !!(d.yellowCard);
        const isRed = !!(d.redCard);
        const isGoal = !!(d.scoringPlay);
        const isSub = !!(d.substitution);
        const minute = ((d.clock as Record<string, unknown>)?.displayValue as string) ?? "";
        const athletes = (d.athletesInvolved ?? []) as Record<string, unknown>[];
        const player = (athletes[0]?.shortName as string) ?? (athletes[0]?.displayName as string) ?? "";
        const teamId = ((d.team as Record<string, unknown>)?.id as string) ?? "";
        if (isGoal) {
          const goal: GoalEvent = { player, minute, ownGoal: !!(d.ownGoal), penalty: !!(d.penaltyKick) };
          (teamId === homeTeamId ? homeGoals : awayGoals).push(goal);
        } else if (isSub) {
          const playerOff = (athletes[1]?.shortName as string) ?? (athletes[1]?.displayName as string) ?? "";
          const sub: SubEvent = { playerOn: player, playerOff, minute };
          (teamId === homeTeamId ? homeSubs : awaySubs).push(sub);
        } else if (isYellow || isRed) {
          const type: MatchCard["type"] = isRed && isYellow ? "yellow-red" : isRed ? "red" : "yellow";
          (teamId === homeTeamId ? homeCards : awayCards).push({ player, minute, type });
        }
      }
      let stats: MatchStats | undefined;
      for (const c of competitors) {
        const cc = c as Record<string, unknown>;
        const isHome = cc.homeAway === "home";
        const statsList = (cc.statistics ?? []) as Record<string, unknown>[];
        for (const s of statsList) {
          const name = s.name as string;
          const val = parseFloat(s.value as string);
          if (isNaN(val)) continue;
          if (!stats) stats = {};
          if (name === "possessionPct") isHome ? (stats.homePossession = val) : (stats.awayPossession = val);
          if (name === "totalShots") isHome ? (stats.homeShots = val) : (stats.awayShots = val);
          if (name === "shotsOnTarget") isHome ? (stats.homeShotsOnTarget = val) : (stats.awayShotsOnTarget = val);
        }
      }
      fixture.score = { home: homeScore, away: awayScore, status: liveStatus, clock, homeCards, awayCards, homeSubs, awaySubs, homeGoals, awayGoals, stats };
    }
    fixtures.push(fixture);
  }

  return fixtures.sort((a, b) => a.startUtc.localeCompare(b.startUtc));
}

/**
 * Returns the full bracket path for a country from R32 to the Final,
 * walking the bracket tree forward by fixture ID — no slot label parsing.
 */
export function knockoutPathForCountry(
  country: string,
  group: string,
  fixtures: KnockoutFixture[],
  tree?: BracketTree
): KnockoutFixture[] {
  const lower = country.toLowerCase();
  const groupSlotPrefixes = [
    `group ${group.toLowerCase()} winner`,
    `group ${group.toLowerCase()} 2nd`,
    `group ${group.toLowerCase()} runner`,
  ];

  // Find the R32 fixture this country is in (by real name or group slot)
  const r32 = fixtures.find(f => {
    const h = f.home.toLowerCase();
    const a = f.away.toLowerCase();
    return h === lower || a === lower ||
      groupSlotPrefixes.some(p => h.startsWith(p) || a.startsWith(p));
  });
  if (!r32) return [];

  const path: KnockoutFixture[] = [r32];
  const fixtureById = new Map(fixtures.map(f => [f.id, f]));
  const t = tree ?? buildBracketTree(fixtures);

  let currentId = r32.id;
  for (let depth = 0; depth < 4; depth++) {
    const parentId = t.parentOf.get(currentId);
    if (!parentId) break;
    const parent = fixtureById.get(parentId);
    if (!parent) break;
    path.push(parent);
    currentId = parentId;
  }

  return path;
}

export function useLiveData(): LiveData {
  const [matches, setMatches] = useState<Match[]>([]);
  const [knockoutFixtures, setKnockoutFixtures] = useState<KnockoutFixture[]>([]);
  const [bracketTree, setBracketTree] = useState<BracketTree>(() => ({ feedersOf: new Map(), parentOf: new Map() }));
  const [scores, setScores] = useState<Record<string, LiveScore>>({});
  const [groupStandingsMap, setGroupStandingsMap] = useState<GroupStandingsMap>({});
  const [advancedSet, setAdvancedSet] = useState<Set<string>>(new Set());
  const [eliminatedSet, setEliminatedSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    async function fetchAll(background = false, retryDelayMs?: number) {
      if (!background) setLoading(true);
      if (!background) setError(null);

      let fetchedScores: Record<string, LiveScore> = {};
      try {
        const [groupRes, knockoutRes, standingsRes] = await Promise.all([
          fetch(`${ESPN_BASE}?dates=${GROUP_RANGE}&limit=200`),
          fetch(`${ESPN_BASE}?dates=${KNOCKOUT_RANGE}&limit=200`),
          fetch(ESPN_STANDINGS),
        ]);

        if (cancelled) return;

        // Detect rate-limiting — back off and keep showing existing data
        if (groupRes.status === 429 || knockoutRes.status === 429 || standingsRes.status === 429) {
          const delay = retryDelayMs ?? POLL_INTERVAL_IDLE_MS * 2;
          if (!cancelled) timerId = setTimeout(() => fetchAll(true, Math.min(delay * 2, 10 * 60 * 1000)), delay);
          return;
        }

        const groupJson = await groupRes.json();
        const knockoutJson = await knockoutRes.json();
        const standingsJson = await standingsRes.json();

        if (cancelled) return;

        const { matches: fetched, scores: parsed } = parseGroupMatches(groupJson.events ?? []);
        const knockouts = parseKnockoutFixtures(knockoutJson.events ?? []);
        fetchedScores = parsed;

        // Fetch subs from summary for live + finished group games
        // (scoreboard comp.details has cards/goals but not subs for finished games)
        const liveIds = Object.entries(parsed)
          .filter(([, s]) => s.status === "in_progress")
          .map(([id]) => id);
        const finishedUncachedIds = Object.entries(parsed)
          .filter(([id, s]) => s.status === "finished" && !finishedSubsCache.has(id))
          .map(([id]) => id);
        const groupSubIds = [...liveIds, ...finishedUncachedIds];
        if (groupSubIds.length > 0) {
          const subsResults = await pMap(groupSubIds, fetchSubsForEvent);
          for (let i = 0; i < groupSubIds.length; i++) {
            const id = groupSubIds[i];
            fetchedScores[id] = { ...fetchedScores[id], ...subsResults[i] };
            if (parsed[id]?.status === "finished") finishedSubsCache.set(id, subsResults[i]);
          }
        }
        // Apply cached subs for already-cached finished games
        for (const [id, subs] of finishedSubsCache) {
          if (fetchedScores[id]) fetchedScores[id] = { ...fetchedScores[id], ...subs };
        }

        // Fetch subs from summary for live + finished knockout games
        const liveKoIds = knockouts
          .filter(f => f.score?.status === "in_progress")
          .map(f => f.id);
        const finishedUncachedKoIds = knockouts
          .filter(f => f.score?.status === "finished" && !finishedSubsCache.has(f.id))
          .map(f => f.id);
        const koSubIds = [...liveKoIds, ...finishedUncachedKoIds];
        if (koSubIds.length > 0) {
          const koSubsResults = await pMap(koSubIds, fetchSubsForEvent);
          for (let i = 0; i < koSubIds.length; i++) {
            const id = koSubIds[i];
            const fixture = knockouts.find(f => f.id === id);
            if (fixture?.score) {
              fixture.score = { ...fixture.score, ...koSubsResults[i] };
              if (fixture.score.status === "finished") finishedSubsCache.set(id, koSubsResults[i]);
            }
          }
        }
        // Apply cached subs for already-cached finished KO games
        for (const fixture of knockouts) {
          if (fixture.score?.status === "finished" && finishedSubsCache.has(fixture.id)) {
            fixture.score = { ...fixture.score, ...finishedSubsCache.get(fixture.id)! };
          }
        }

        // Build group standings map, sorted by ESPN's R (rank) field.
        // We do NOT use array position — ESPN does not guarantee sorted order.
        const gsMap: GroupStandingsMap = {};

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
              rank: sm["R"] ?? 999,
              gp: sm["GP"] ?? sm["gamesPlayed"] ?? 0,
            };
          });

          gsMap[letter] = [...ranked].sort((a, b) => a.rank - b.rank).map(r => r.team);
        }

        // Advancement source of truth: teams with confirmed real names in R32 fixtures.
        //
        // Why not ESPN's ADV flag?
        //   In a 48-team tournament, 1st and 2nd place advance automatically, but the
        //   best 8 of 12 third-place teams also advance. ESPN sets ADV=1 for 1st/2nd
        //   immediately, but does NOT reliably set ADV=1 for qualifying 3rd-place teams.
        //   Using ADV alone caused false "still in it" for 3rd-placers that didn't qualify.
        //
        // Why R32 fixtures?
        //   Once the group stage ends, ESPN populates the R32 bracket with real team names.
        //   Any team with a real (non-placeholder) name in a Round of 32 slot has confirmed
        //   advancement. This works dynamically for any future tournament.
        const isTBDSlot = (s: string) => /(group|round of|winner|place|runner|loser|quarterfinal|semifinal|third)/i.test(s);
        const advanced = new Set<string>();
        for (const f of knockouts) {
          if (f.stage !== "Round of 32") continue;
          if (!isTBDSlot(f.home)) advanced.add(normaliseTeamName(f.home));
          if (!isTBDSlot(f.away)) advanced.add(normaliseTeamName(f.away));
        }

        // A team is eliminated when their group is fully complete (all teams at GP≥3)
        // and they are not confirmed in the R32. Teams whose group is still playing are
        // never marked eliminated, even if they can't mathematically advance.
        const eliminated = new Set<string>();
        for (const group of standingsJson.children ?? []) {
          const entries: { team: { displayName: string }; stats: { abbreviation: string; value: number }[] }[] =
            group.standings?.entries ?? [];
          const teams = entries.map(e => ({
            team: normaliseTeamName(e.team.displayName),
            gp: e.stats.find(s => s.abbreviation === "GP")?.value ?? 0,
          }));
          const groupDone = teams.every(t => t.gp >= 3);
          if (!groupDone) continue;
          for (const { team } of teams) {
            if (!advanced.has(team)) eliminated.add(team);
          }
        }

        setMatches(fetched);
        setScores(fetchedScores);
        setKnockoutFixtures(knockouts);
        setBracketTree(buildBracketTree(knockouts, gsMap));
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

  return { matches, knockoutFixtures, bracketTree, scores, groupStandingsMap, advancedSet, eliminatedSet, loading, error };
}
