// Structured match/standings data — no prose; Claude generates analysis on demand.

export interface GroupRow {
  pos: number;
  team: string;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
}

export interface MatchResult {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  scorers: string; // human-readable goal list
}

export interface CountryData {
  flag: string;
  group: string;
  groupTable: GroupRow[];
  results: MatchResult[];      // completed matches involving this team
  nextGame: string | null;     // human-readable upcoming fixture
}

// ── Flags ─────────────────────────────────────────────────────────────────
export const FLAGS: Record<string, string> = {
  "Mexico": "🇲🇽", "South Africa": "🇿🇦", "Korea Republic": "🇰🇷",
  "Czechia": "🇨🇿", "Canada": "🇨🇦", "Bosnia-Herzegovina": "🇧🇦",
  "Qatar": "🇶🇦", "Switzerland": "🇨🇭", "Brazil": "🇧🇷",
  "Morocco": "🇲🇦", "Haiti": "🇭🇹", "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "USA": "🇺🇸", "Paraguay": "🇵🇾", "Australia": "🇦🇺",
  "Türkiye": "🇹🇷", "Germany": "🇩🇪", "Curaçao": "🇨🇼",
  "Ivory Coast": "🇨🇮", "Ecuador": "🇪🇨", "Netherlands": "🇳🇱",
  "Japan": "🇯🇵", "Sweden": "🇸🇪", "Tunisia": "🇹🇳",
  "Belgium": "🇧🇪", "Egypt": "🇪🇬", "IR Iran": "🇮🇷",
  "New Zealand": "🇳🇿", "Spain": "🇪🇸", "Cape Verde": "🇨🇻",
  "Saudi Arabia": "🇸🇦", "Uruguay": "🇺🇾",
};

export function flag(team: string): string {
  return FLAGS[team] ?? "🏳️";
}

// ── Group G (after matchday 2) ─────────────────────────────────────────────
const GROUP_G_TABLE: GroupRow[] = [
  { pos: 1, team: "Egypt",       p: 2, w: 1, d: 1, l: 0, gf: 4, ga: 2, pts: 4 },
  { pos: 2, team: "IR Iran",     p: 2, w: 0, d: 2, l: 0, gf: 2, ga: 2, pts: 2 },
  { pos: 3, team: "Belgium",     p: 2, w: 0, d: 2, l: 0, gf: 1, ga: 1, pts: 2 },
  { pos: 4, team: "New Zealand", p: 2, w: 0, d: 1, l: 1, gf: 3, ga: 5, pts: 1 },
];

const GROUP_G_RESULTS: MatchResult[] = [
  {
    home: "Belgium", away: "Egypt", homeScore: 1, awayScore: 1,
    scorers: "Ashour 19' (EGY) · Hany OG 66' (BEL)",
  },
  {
    home: "IR Iran", away: "New Zealand", homeScore: 2, awayScore: 2,
    scorers: "Just 7' 54' (NZL) · Rezaeian 32', Mohebi 64' (IRN)",
  },
  {
    home: "Belgium", away: "IR Iran", homeScore: 0, awayScore: 0,
    scorers: "No goals — Belgium played 70+ min with 10 men (Ngoy red card)",
  },
  {
    home: "New Zealand", away: "Egypt", homeScore: 1, awayScore: 3,
    scorers: "Surman (NZL) · Ziko, Salah, Trézéguet (EGY)",
  },
];

// ── Structured data per country ────────────────────────────────────────────
export const COUNTRY_DATA: Record<string, CountryData> = {
  "Belgium": {
    flag: "🇧🇪",
    group: "G",
    groupTable: GROUP_G_TABLE,
    results: GROUP_G_RESULTS.filter(r => r.home === "Belgium" || r.away === "Belgium"),
    nextGame: "vs New Zealand — Sat 27 Jun, 15:00 NZT · BC Place, Vancouver",
  },
  "New Zealand": {
    flag: "🇳🇿",
    group: "G",
    groupTable: GROUP_G_TABLE,
    results: GROUP_G_RESULTS.filter(r => r.home === "New Zealand" || r.away === "New Zealand"),
    nextGame: "vs Belgium — Sat 27 Jun, 15:00 NZT · BC Place, Vancouver",
  },
  "Egypt": {
    flag: "🇪🇬",
    group: "G",
    groupTable: GROUP_G_TABLE,
    results: GROUP_G_RESULTS.filter(r => r.home === "Egypt" || r.away === "Egypt"),
    nextGame: "vs IR Iran — Sat 27 Jun, 01:00 NZT · Levi's Stadium, San Francisco",
  },
  "IR Iran": {
    flag: "🇮🇷",
    group: "G",
    groupTable: GROUP_G_TABLE,
    results: GROUP_G_RESULTS.filter(r => r.home === "IR Iran" || r.away === "IR Iran"),
    nextGame: "vs Egypt — Sat 27 Jun, 01:00 NZT · Levi's Stadium, San Francisco",
  },
};

// ── Tournament stages ──────────────────────────────────────────────────────
export const STAGES = [
  { id: "group", label: "Group Stage" },
  { id: "r32",   label: "Round of 32" },
  { id: "r16",   label: "Round of 16" },
  { id: "qf",    label: "Quarter-final" },
  { id: "sf",    label: "Semi-final" },
  { id: "final", label: "Final" },
  { id: "champ", label: "🏆 Champions" },
];

// All Group G teams are still in the group stage
export function currentStage(_country: string): string {
  return "group";
}
