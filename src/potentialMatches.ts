/**
 * Potential knockout-stage placeholders for Group G teams.
 * Dates/venues are fixed by the FIFA 2026 schedule.
 * Opponents are TBD until each round is decided.
 *
 * Group G Winner  → R32 Match 10: July 1, 20:00 UTC, Lumen Field, Seattle
 * Group G Runner-up → R32 Match 16: July 3, 18:00 UTC, AT&T Stadium, Dallas
 */

export interface PotentialMatch {
  id: string;
  stage: string;
  stageCode: "R32" | "R16" | "QF" | "SF" | "F";
  // One entry per possible path (e.g. if 1st vs if 2nd in group)
  options: {
    condition: string;      // "If 1st in Group G"
    startUtc: string;       // ISO date/time
    dateLabel: string;      // human-readable NZT hint
    venue: string;
    opponent: string;       // "TBD — 3rd place (Group A/H/I/J)"
  }[];
}

// ── Group G knockout paths ────────────────────────────────────────────────
// R16 and beyond: we use the midpoint of the date window as the startUtc,
// since the exact slot depends on the R32 result.

export const GROUP_G_POTENTIAL: PotentialMatch[] = [
  {
    id: "pot-r32",
    stage: "Round of 32",
    stageCode: "R32",
    options: [
      {
        condition: "If 1st in Group G",
        startUtc: "2026-07-02T00:00:00Z",  // Jul 1 8pm EDT = Jul 2 00:00 UTC
        dateLabel: "Wed 1 Jul, midday NZT",
        venue: "Lumen Field, Seattle",
        opponent: "TBD — 3rd place from Group A, H, I, or J",
      },
      {
        condition: "If 2nd in Group G",
        startUtc: "2026-07-03T18:00:00Z",  // Jul 3 2pm EDT = Jul 3 18:00 UTC
        dateLabel: "Fri 3 Jul, 6:00 am NZT",
        venue: "AT&T Stadium, Dallas",
        opponent: "TBD — Australia (runner-up Group D)",
      },
    ],
  },
  {
    id: "pot-r16",
    stage: "Round of 16",
    stageCode: "R16",
    options: [
      {
        condition: "If through R32",
        startUtc: "2026-07-06T20:00:00Z",  // approx midpoint Jul 4-7
        dateLabel: "Mon–Wed 6–8 Jul (TBC)",
        venue: "TBD",
        opponent: "TBD",
      },
    ],
  },
  {
    id: "pot-qf",
    stage: "Quarter-final",
    stageCode: "QF",
    options: [
      {
        condition: "If through R16",
        startUtc: "2026-07-10T20:00:00Z",  // approx midpoint Jul 9-11
        dateLabel: "Thu–Sat 9–11 Jul (TBC)",
        venue: "TBD",
        opponent: "TBD",
      },
    ],
  },
  {
    id: "pot-sf",
    stage: "Semi-final",
    stageCode: "SF",
    options: [
      {
        condition: "If through QF",
        startUtc: "2026-07-14T19:00:00Z",  // Jul 14-15 3pm EDT
        dateLabel: "Tue–Wed 14–15 Jul (TBC)",
        venue: "AT&T Stadium, Dallas or Mercedes-Benz Stadium, Atlanta",
        opponent: "TBD",
      },
    ],
  },
  {
    id: "pot-final",
    stage: "The Final",
    stageCode: "F",
    options: [
      {
        condition: "If through SF",
        startUtc: "2026-07-19T19:00:00Z",  // Jul 19 3pm EDT = 19:00 UTC
        dateLabel: "Sun 19 Jul, 7:00 am NZT",
        venue: "MetLife Stadium, East Rutherford NJ",
        opponent: "TBD",
      },
    ],
  },
];

// Countries for which we have knockout path data
export const COUNTRIES_WITH_POTENTIAL = new Set([
  "Belgium", "New Zealand", "Egypt", "IR Iran",
]);
