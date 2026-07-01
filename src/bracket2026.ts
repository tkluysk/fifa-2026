/**
 * FIFA World Cup 2026 knockout bracket — the fixed tournament structure.
 *
 * Source of truth: FIFA's official match schedule (match numbers 73–104).
 * https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026
 *
 * This structure is defined by the tournament regulations and NEVER changes
 * with results. ESPN is used only for actual game metadata (teams, scores,
 * dates, venues) and outcomes — never for knockout-path logic.
 *
 * How teams are identified:
 *   Every R32 match has at least one "definite" slot — a specific group winner
 *   (1X) or runner-up (2X). Only the third-place side is a wildcard (resolved
 *   via FIFA's combination table once the group stage ends). We anchor each
 *   real ESPN R32 fixture onto its FIFA match number using the definite slot,
 *   then propagate winners up the fixed tree. No slot-label strings, no
 *   reliance on ESPN's fixture ordering.
 */

export type Round = "R32" | "R16" | "QF" | "SF" | "BRONZE" | "FINAL";

/** A group placement: "1A" = Group A winner, "2B" = Group B runner-up. */
export type GroupSlot = string; // e.g. "1A", "2C"

/** One side of a match: a fixed group slot, a set of possible third-place
 *  groups, or the winner/loser of an earlier match. */
export type Feeder =
  | { kind: "groupWinner"; group: string }          // 1X
  | { kind: "groupRunnerUp"; group: string }         // 2X
  | { kind: "thirdPlace"; groups: string[] }         // 3rd from one of these groups
  | { kind: "winnerOf"; match: number }              // W##
  | { kind: "loserOf"; match: number };              // L## (bronze final)

export interface BracketMatch {
  match: number;      // FIFA match number (73–104)
  round: Round;
  home: Feeder;
  away: Feeder;
  next: number | null;      // match its winner feeds into (null for final)
}

const gw = (group: string): Feeder => ({ kind: "groupWinner", group });
const ru = (group: string): Feeder => ({ kind: "groupRunnerUp", group });
const tp = (groups: string): Feeder => ({ kind: "thirdPlace", groups: groups.split("") });
const w  = (match: number): Feeder => ({ kind: "winnerOf", match });
const l  = (match: number): Feeder => ({ kind: "loserOf", match });

/**
 * The complete FIFA 2026 knockout bracket, keyed by match number.
 * Verified against the official FIFA match-schedule PDF (05.09.2025 edition).
 */
export const BRACKET_2026: Record<number, BracketMatch> = {
  // ── Round of 32 (73–88) ────────────────────────────────────────────────
  73: { match: 73, round: "R32", home: ru("A"), away: ru("B"),        next: 90 },
  74: { match: 74, round: "R32", home: gw("E"), away: tp("ABCDF"),    next: 89 },
  75: { match: 75, round: "R32", home: gw("F"), away: ru("C"),        next: 90 },
  76: { match: 76, round: "R32", home: gw("C"), away: ru("F"),        next: 91 },
  77: { match: 77, round: "R32", home: gw("I"), away: tp("CDFGH"),    next: 89 },
  78: { match: 78, round: "R32", home: ru("E"), away: ru("I"),        next: 91 },
  79: { match: 79, round: "R32", home: gw("A"), away: tp("CEFHI"),    next: 92 },
  80: { match: 80, round: "R32", home: gw("L"), away: tp("EHIJK"),    next: 92 },
  81: { match: 81, round: "R32", home: gw("D"), away: tp("BEFIJ"),    next: 94 },
  82: { match: 82, round: "R32", home: gw("G"), away: tp("AEHIJ"),    next: 94 },
  83: { match: 83, round: "R32", home: ru("K"), away: ru("L"),        next: 93 },
  84: { match: 84, round: "R32", home: gw("H"), away: ru("J"),        next: 93 },
  85: { match: 85, round: "R32", home: gw("B"), away: tp("EFGIJ"),    next: 96 },
  86: { match: 86, round: "R32", home: gw("J"), away: ru("H"),        next: 95 },
  87: { match: 87, round: "R32", home: gw("K"), away: tp("DEIJL"),    next: 96 },
  88: { match: 88, round: "R32", home: ru("D"), away: ru("G"),        next: 95 },

  // ── Round of 16 (89–96) ────────────────────────────────────────────────
  89: { match: 89, round: "R16", home: w(74), away: w(77), next: 97 },
  90: { match: 90, round: "R16", home: w(73), away: w(75), next: 97 },
  91: { match: 91, round: "R16", home: w(76), away: w(78), next: 99 },
  92: { match: 92, round: "R16", home: w(79), away: w(80), next: 99 },
  93: { match: 93, round: "R16", home: w(83), away: w(84), next: 98 },
  94: { match: 94, round: "R16", home: w(81), away: w(82), next: 98 },
  95: { match: 95, round: "R16", home: w(86), away: w(88), next: 100 },
  96: { match: 96, round: "R16", home: w(85), away: w(87), next: 100 },

  // ── Quarter-finals (97–100) ────────────────────────────────────────────
  97:  { match: 97,  round: "QF", home: w(89), away: w(90),  next: 101 },
  98:  { match: 98,  round: "QF", home: w(93), away: w(94),  next: 101 },
  99:  { match: 99,  round: "QF", home: w(91), away: w(92),  next: 102 },
  100: { match: 100, round: "QF", home: w(95), away: w(96),  next: 102 },

  // ── Semi-finals (101–102) ──────────────────────────────────────────────
  101: { match: 101, round: "SF", home: w(97), away: w(98),   next: 104 },
  102: { match: 102, round: "SF", home: w(99), away: w(100),  next: 104 },

  // ── Bronze final (103) & Final (104) ───────────────────────────────────
  103: { match: 103, round: "BRONZE", home: l(101), away: l(102), next: null },
  104: { match: 104, round: "FINAL",  home: w(101), away: w(102), next: null },
};

/** Map every definite group slot → the R32 match number it appears in.
 *  Used to anchor real ESPN R32 fixtures onto FIFA match numbers. */
export const DEFINITE_SLOT_TO_MATCH: Record<GroupSlot, number> = (() => {
  const map: Record<string, number> = {};
  for (const m of Object.values(BRACKET_2026)) {
    if (m.round !== "R32") continue;
    for (const side of [m.home, m.away]) {
      if (side.kind === "groupWinner")   map[`1${side.group}`] = m.match;
      if (side.kind === "groupRunnerUp") map[`2${side.group}`] = m.match;
    }
  }
  return map;
})();
