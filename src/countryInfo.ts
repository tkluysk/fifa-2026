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

// ── Flag-derived colors (bg = very subtle tint, accent = border/highlight) ─
export const COUNTRY_COLORS: Record<string, { bg: string; accent: string }> = {
  "Mexico":             { bg: "rgba(0,104,71,0.18)",    accent: "#006847" },
  "South Africa":       { bg: "rgba(0,122,61,0.18)",    accent: "#007A3D" },
  "Korea Republic":     { bg: "rgba(205,46,58,0.18)",   accent: "#CD2E3A" },
  "Czechia":            { bg: "rgba(215,20,26,0.18)",   accent: "#D7141A" },
  "Canada":             { bg: "rgba(255,0,0,0.18)",     accent: "#FF0000" },
  "Bosnia-Herzegovina": { bg: "rgba(0,70,127,0.18)",    accent: "#00467F" },
  "Qatar":              { bg: "rgba(141,2,40,0.18)",    accent: "#8D0228" },
  "Switzerland":        { bg: "rgba(255,0,0,0.18)",     accent: "#FF0000" },
  "Brazil":             { bg: "rgba(0,156,59,0.20)",    accent: "#009C3B" },
  "Morocco":            { bg: "rgba(196,30,58,0.18)",   accent: "#C41E3A" },
  "Haiti":              { bg: "rgba(0,104,166,0.18)",   accent: "#0068A6" },
  "Scotland":           { bg: "rgba(0,82,165,0.18)",    accent: "#0052A5" },
  "USA":                { bg: "rgba(60,59,110,0.18)",   accent: "#3C3B6E" },
  "Paraguay":           { bg: "rgba(214,16,26,0.18)",   accent: "#D6101A" },
  "Australia":          { bg: "rgba(0,0,139,0.18)",     accent: "#00008B" },
  "Türkiye":            { bg: "rgba(227,10,23,0.18)",   accent: "#E30A17" },
  "Germany":            { bg: "rgba(80,80,80,0.15)",    accent: "#555555" },
  "Curaçao":            { bg: "rgba(0,35,149,0.18)",    accent: "#002395" },
  "Ivory Coast":        { bg: "rgba(249,88,0,0.20)",    accent: "#F95800" },
  "Ecuador":            { bg: "rgba(255,215,0,0.20)",   accent: "#B8860B" },
  "Netherlands":        { bg: "rgba(255,103,0,0.20)",   accent: "#FF6700" },
  "Japan":              { bg: "rgba(188,0,45,0.18)",    accent: "#BC002D" },
  "Sweden":             { bg: "rgba(0,106,167,0.18)",   accent: "#006AA7" },
  "Tunisia":            { bg: "rgba(231,13,23,0.18)",   accent: "#E70D17" },
  "Belgium":            { bg: "rgba(255,215,0,0.20)",   accent: "#E8A000" },
  "Egypt":              { bg: "rgba(206,17,38,0.18)",   accent: "#CE1126" },
  "IR Iran":            { bg: "rgba(35,159,64,0.18)",   accent: "#239F40" },
  "New Zealand":        { bg: "rgba(0,36,125,0.18)",    accent: "#00247D" },
  "Spain":              { bg: "rgba(170,21,27,0.18)",   accent: "#AA151B" },
  "Cape Verde":         { bg: "rgba(0,116,195,0.18)",   accent: "#0074C3" },
  "Saudi Arabia":       { bg: "rgba(0,106,78,0.18)",    accent: "#006A4E" },
  "Uruguay":            { bg: "rgba(0,56,168,0.18)",    accent: "#0038A8" },
};

export function countryColor(team: string): { bg: string; accent: string } {
  return COUNTRY_COLORS[team] ?? { bg: "rgba(0,0,0,0.03)", accent: "#aaa" };
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
