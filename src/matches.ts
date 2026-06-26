export interface Match {
  id: string;
  home: string;
  away: string;
  group: string;
  startUtc: string; // ISO 8601
  venue: string;
  tvnzPath: string | null;
}

export const TVNZ_BASE = "https://www.tvnz.co.nz";

export const ALL_MATCHES: Match[] = [
  // ── Group A ────────────────────────────────────────────────────────────
  { id: "grp-a-1", home: "Mexico", away: "South Africa", group: "A", startUtc: "2026-06-12T23:00:00Z", venue: "AT&T Stadium, Dallas", tvnzPath: "/liveevent/mexico-v-southafrica-group-a" },
  { id: "grp-a-2", home: "Korea Republic", away: "Czechia", group: "A", startUtc: "2026-06-13T05:00:00Z", venue: "SoFi Stadium, Los Angeles", tvnzPath: "/liveevent/korea-v-czechia-group-a" },
  // ── Group B ────────────────────────────────────────────────────────────
  { id: "grp-b-1", home: "Canada", away: "Bosnia-Herzegovina", group: "B", startUtc: "2026-06-13T23:00:00Z", venue: "MetLife Stadium, New York", tvnzPath: "/liveevent/canada-v-bosniaherzegovina-group-b" },
  { id: "grp-b-2", home: "Qatar", away: "Switzerland", group: "B", startUtc: "2026-06-14T05:00:00Z", venue: "Rose Bowl, Los Angeles", tvnzPath: "/liveevent/qatar-v-swiss-group-b" },
  // ── Group C ────────────────────────────────────────────────────────────
  { id: "grp-c-1", home: "Brazil", away: "Morocco", group: "C", startUtc: "2026-06-14T22:00:00Z", venue: "Hard Rock Stadium, Miami", tvnzPath: "/liveevent/brazil-v-morocco-groupc" },
  { id: "grp-c-2", home: "Haiti", away: "Scotland", group: "C", startUtc: "2026-06-15T02:00:00Z", venue: "Allegiant Stadium, Las Vegas", tvnzPath: "/liveevent/haiti-v-scotland-groupc" },
  // ── Group D ────────────────────────────────────────────────────────────
  { id: "grp-d-1", home: "USA", away: "Paraguay", group: "D", startUtc: "2026-06-15T23:00:00Z", venue: "AT&T Stadium, Dallas", tvnzPath: "/liveevent/usa-v-para-group-d" },
  { id: "grp-d-2", home: "Australia", away: "Türkiye", group: "D", startUtc: "2026-06-16T05:00:00Z", venue: "MetLife Stadium, New York", tvnzPath: "/liveevent/australia-v-turkiye-groupd" },
  // ── Group E ────────────────────────────────────────────────────────────
  { id: "grp-e-1", home: "Germany", away: "Curaçao", group: "E", startUtc: "2026-06-16T23:00:00Z", venue: "Levi's Stadium, San Francisco", tvnzPath: "/liveevent/germany-v-curacao-groupe" },
  { id: "grp-e-2", home: "Ivory Coast", away: "Ecuador", group: "E", startUtc: "2026-06-17T05:00:00Z", venue: "Gillette Stadium, Boston", tvnzPath: "/liveevent/ivory-coast-v-ecuador-groupe" },
  // ── Group F ────────────────────────────────────────────────────────────
  { id: "grp-f-1", home: "Netherlands", away: "Japan", group: "F", startUtc: "2026-06-17T23:00:00Z", venue: "Arrowhead Stadium, Kansas City", tvnzPath: "/liveevent/netherlands-v-japan-groupf" },
  { id: "grp-f-2", home: "Sweden", away: "Tunisia", group: "F", startUtc: "2026-06-18T05:00:00Z", venue: "BC Place, Vancouver", tvnzPath: "/liveevent/sweden-v-tunisia-groupf" },
  // ── Group G ────────────────────────────────────────────────────────────
  { id: "grp-g-1", home: "Belgium", away: "Egypt", group: "G", startUtc: "2026-06-15T19:00:00Z", venue: "SoFi Stadium, Los Angeles", tvnzPath: "/liveevent/belgium-v-egypt-groupg" },
  { id: "grp-g-2", home: "IR Iran", away: "New Zealand", group: "G", startUtc: "2026-06-16T01:00:00Z", venue: "BC Place, Vancouver", tvnzPath: "/liveevent/ir-iran-v-new-zealand-groupg" },
  { id: "grp-g-3", home: "Belgium", away: "IR Iran", group: "G", startUtc: "2026-06-21T19:00:00Z", venue: "SoFi Stadium, Los Angeles", tvnzPath: "/liveevent/belgium-v-ir-iran" },
  { id: "grp-g-4", home: "New Zealand", away: "Egypt", group: "G", startUtc: "2026-06-22T01:00:00Z", venue: "BC Place, Vancouver", tvnzPath: "/liveevent/new-zealand-v-egypt" },
  { id: "grp-g-5", home: "Egypt", away: "IR Iran", group: "G", startUtc: "2026-06-26T01:00:00Z", venue: "Levi's Stadium, San Francisco", tvnzPath: "/liveevent/egypt-v-ir-iran" },
  { id: "grp-g-6", home: "New Zealand", away: "Belgium", group: "G", startUtc: "2026-06-27T03:00:00Z", venue: "BC Place, Vancouver", tvnzPath: "/liveevent/new-zealand-v-belgium" },
  // ── Group H ────────────────────────────────────────────────────────────
  { id: "grp-h-1", home: "Spain", away: "Cape Verde", group: "H", startUtc: "2026-06-18T23:00:00Z", venue: "Estadio Akron, Guadalajara", tvnzPath: "/liveevent/spain-v-cape-verde-grouph" },
  { id: "grp-h-2", home: "Saudi Arabia", away: "Uruguay", group: "H", startUtc: "2026-06-19T05:00:00Z", venue: "Estadio BBVA, Monterrey", tvnzPath: "/liveevent/saudi-arabia-v-uruguay-grouph" },
];

export const ALL_COUNTRIES = Array.from(
  new Set(ALL_MATCHES.flatMap((m) => [m.home, m.away]))
).sort();

export function matchesForCountries(countries: string[]): Match[] {
  const lower = countries.map((c) => c.toLowerCase());
  return ALL_MATCHES.filter((m) => {
    const teams = [m.home, m.away].map((t) => t.toLowerCase());
    // "IR Iran" should match "iran"
    const expanded = teams.flatMap((t) =>
      t.startsWith("ir ") ? [t, t.slice(3)] : [t]
    );
    return lower.some((c) => expanded.includes(c));
  }).sort((a, b) => a.startUtc.localeCompare(b.startUtc));
}

export function tvnzUrl(match: Match): string | null {
  return match.tvnzPath ? `${TVNZ_BASE}${match.tvnzPath}` : null;
}

export function gcalUrl(match: Match): string {
  const start = match.startUtc.replace(/[-:]/g, "").replace(".000", "");
  const endDate = new Date(new Date(match.startUtc).getTime() + 2 * 60 * 60 * 1000);
  const end = endDate.toISOString().replace(/[-:]/g, "").replace(".000", "");
  const stream = tvnzUrl(match);
  const details = [
    `Group ${match.group} — FIFA World Cup 2026`,
    stream ? `Watch on TVNZ+: ${stream}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `⚽ ${match.home} vs ${match.away}`,
    dates: `${start}/${end}`,
    location: match.venue,
    details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
