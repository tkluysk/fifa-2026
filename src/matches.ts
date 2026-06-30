export interface Match {
  id: string;         // ESPN event id
  home: string;       // normalised team name
  away: string;
  group: string;      // "A"–"L"
  startUtc: string;   // ISO 8601 from ESPN
  venue: string;      // from ESPN
  tvnzPath: string | null;
}

export const TVNZ_BASE = "https://www.tvnz.co.nz";

// Verified TVNZ paths for group games (URL includes round suffix).
// Knockout games use auto-generated slugs below.
const TVNZ_PATH_OVERRIDES: Record<string, string> = {
  "IR Iran|New Zealand":  "/liveevent/ir-iran-v-new-zealand-groupg",
  "Belgium|Egypt":        "/liveevent/belgium-v-egypt-groupg",
  "New Zealand|Egypt":    "/liveevent/new-zealand-v-egypt",
  "Belgium|IR Iran":      "/liveevent/belgium-v-ir-iran",
  "Egypt|IR Iran":        "/liveevent/egypt-v-ir-iran",
  "New Zealand|Belgium":  "/liveevent/new-zealand-v-belgium",
};

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// ESPN uses different names for some teams — map to our canonical names
const ESPN_NAME_MAP: Record<string, string> = {
  "Iran":          "IR Iran",
  "United States": "USA",
  "South Korea":   "Korea Republic",
  "Ivory Coast":   "Ivory Coast",
  "Cote d'Ivoire": "Ivory Coast",
  "Turkey":        "Türkiye",
  "Curacao":       "Curaçao",
};

export function normaliseTeamName(name: string): string {
  return ESPN_NAME_MAP[name] ?? name;
}

export function tvnzPathForMatch(home: string, away: string): string | null {
  const override = TVNZ_PATH_OVERRIDES[`${home}|${away}`];
  if (override) return override;
  // TVNZ+ has NZ broadcast rights for all WC matches — generate likely URL from team slugs.
  // Some pages may not exist yet until closer to kick-off.
  if (!home || !away || home.startsWith("Round") || home.startsWith("Winner") || home.startsWith("Group")) return null;
  return `/liveevent/${toSlug(home)}-v-${toSlug(away)}`;
}

export function tvnzUrl(match: Match): string | null {
  return match.tvnzPath ? `${TVNZ_BASE}${match.tvnzPath}` : null;
}

export function gcalUrl(match: Match): string {
  const start = match.startUtc.replace(/[-:]/g, "").replace(".000", "").replace(/\.\d+/, "");
  const endDate = new Date(new Date(match.startUtc).getTime() + 2 * 60 * 60 * 1000);
  const end = endDate.toISOString().replace(/[-:]/g, "").replace(".000", "").replace(/\.\d+/, "");
  const details = `Group ${match.group} — FIFA World Cup 2026`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `⚽ ${match.home} vs ${match.away}`,
    dates: `${start}/${end}`,
    location: match.venue,
    details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function matchesForCountries(matches: Match[], countries: string[]): Match[] {
  const lower = countries.map((c) => c.toLowerCase());

  function teamMatches(team: string): boolean {
    const t = team.toLowerCase();
    return lower.includes(t) || (t.startsWith("ir ") && lower.includes(t.slice(3)));
  }

  const trackedGroups = new Set(
    matches.filter((m) => teamMatches(m.home) || teamMatches(m.away)).map((m) => m.group)
  );

  return matches.filter((m) => trackedGroups.has(m.group));
}

// ALL_COUNTRIES derived at runtime from the fetched schedule — exported as a stub
// that App.tsx replaces with the live list. Kept for backward compat during transition.
export const ALL_COUNTRIES: string[] = [
  "Albania", "Angola", "Argentina", "Australia", "Belgium", "Bosnia-Herzegovina",
  "Brazil", "Cameroon", "Canada", "Cape Verde", "Chile", "Colombia", "Croatia",
  "Curaçao", "Czechia", "Denmark", "Ecuador", "Egypt", "England", "France",
  "Germany", "Haiti", "IR Iran", "Ivory Coast", "Japan", "Korea Republic",
  "Mexico", "Morocco", "Netherlands", "New Zealand", "Nigeria", "Panama",
  "Paraguay", "Portugal", "Qatar", "Saudi Arabia", "Scotland", "Senegal",
  "Serbia", "South Africa", "Spain", "Sweden", "Switzerland", "Tunisia",
  "Türkiye", "USA", "Uruguay", "Uzbekistan",
];
