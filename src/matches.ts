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
  // ── Group A: Mexico · South Africa · Korea Republic · Czechia ──────────
  { id: "grp-a-1", home: "Mexico",          away: "South Africa",   group: "A", startUtc: "2026-06-12T23:00:00Z", venue: "AT&T Stadium, Dallas",           tvnzPath: "/liveevent/mexico-v-southafrica-group-a" },
  { id: "grp-a-2", home: "Korea Republic",  away: "Czechia",         group: "A", startUtc: "2026-06-13T05:00:00Z", venue: "SoFi Stadium, Los Angeles",      tvnzPath: "/liveevent/korea-v-czechia-group-a" },
  { id: "grp-a-3", home: "Czechia",         away: "Mexico",          group: "A", startUtc: "2026-06-17T23:00:00Z", venue: "Gillette Stadium, Boston",        tvnzPath: null },
  { id: "grp-a-4", home: "South Africa",    away: "Korea Republic",  group: "A", startUtc: "2026-06-18T05:00:00Z", venue: "Arrowhead Stadium, Kansas City",  tvnzPath: null },
  { id: "grp-a-5", home: "South Africa",    away: "Czechia",         group: "A", startUtc: "2026-06-22T23:00:00Z", venue: "SoFi Stadium, Los Angeles",      tvnzPath: null },
  { id: "grp-a-6", home: "Mexico",          away: "Korea Republic",  group: "A", startUtc: "2026-06-23T05:00:00Z", venue: "Levi's Stadium, San Francisco",  tvnzPath: null },

  // ── Group B: Canada · Bosnia-Herzegovina · Qatar · Switzerland ─────────
  { id: "grp-b-1", home: "Canada",           away: "Bosnia-Herzegovina", group: "B", startUtc: "2026-06-13T23:00:00Z", venue: "MetLife Stadium, New York",      tvnzPath: "/liveevent/canada-v-bosniaherzegovina-group-b" },
  { id: "grp-b-2", home: "Qatar",            away: "Switzerland",        group: "B", startUtc: "2026-06-14T05:00:00Z", venue: "Rose Bowl, Los Angeles",         tvnzPath: "/liveevent/qatar-v-swiss-group-b" },
  { id: "grp-b-3", home: "Switzerland",      away: "Canada",             group: "B", startUtc: "2026-06-18T23:00:00Z", venue: "AT&T Stadium, Dallas",           tvnzPath: null },
  { id: "grp-b-4", home: "Bosnia-Herzegovina", away: "Qatar",            group: "B", startUtc: "2026-06-19T05:00:00Z", venue: "BC Place, Vancouver",            tvnzPath: null },
  { id: "grp-b-5", home: "Bosnia-Herzegovina", away: "Switzerland",      group: "B", startUtc: "2026-06-22T02:00:00Z", venue: "Rose Bowl, Los Angeles",         tvnzPath: null },
  { id: "grp-b-6", home: "Canada",           away: "Qatar",              group: "B", startUtc: "2026-06-22T02:00:00Z", venue: "Allegiant Stadium, Las Vegas",   tvnzPath: null },

  // ── Group C: Brazil · Morocco · Haiti · Scotland ───────────────────────
  { id: "grp-c-1", home: "Brazil",   away: "Morocco",  group: "C", startUtc: "2026-06-14T22:00:00Z", venue: "Hard Rock Stadium, Miami",      tvnzPath: "/liveevent/brazil-v-morocco-groupc" },
  { id: "grp-c-2", home: "Haiti",    away: "Scotland", group: "C", startUtc: "2026-06-15T02:00:00Z", venue: "Allegiant Stadium, Las Vegas",  tvnzPath: "/liveevent/haiti-v-scotland-groupc" },
  { id: "grp-c-3", home: "Scotland", away: "Brazil",   group: "C", startUtc: "2026-06-19T22:00:00Z", venue: "Levi's Stadium, San Francisco", tvnzPath: null },
  { id: "grp-c-4", home: "Morocco",  away: "Haiti",    group: "C", startUtc: "2026-06-20T02:00:00Z", venue: "MetLife Stadium, New York",     tvnzPath: null },
  { id: "grp-c-5", home: "Morocco",  away: "Scotland", group: "C", startUtc: "2026-06-24T02:00:00Z", venue: "Hard Rock Stadium, Miami",      tvnzPath: null },
  { id: "grp-c-6", home: "Brazil",   away: "Haiti",    group: "C", startUtc: "2026-06-24T02:00:00Z", venue: "Gillette Stadium, Boston",      tvnzPath: null },

  // ── Group D: USA · Paraguay · Australia · Türkiye ──────────────────────
  { id: "grp-d-1", home: "USA",       away: "Paraguay",  group: "D", startUtc: "2026-06-15T23:00:00Z", venue: "AT&T Stadium, Dallas",          tvnzPath: "/liveevent/usa-v-para-group-d" },
  { id: "grp-d-2", home: "Australia", away: "Türkiye",   group: "D", startUtc: "2026-06-16T05:00:00Z", venue: "MetLife Stadium, New York",     tvnzPath: "/liveevent/australia-v-turkiye-groupd" },
  { id: "grp-d-3", home: "Türkiye",   away: "USA",       group: "D", startUtc: "2026-06-20T23:00:00Z", venue: "Rose Bowl, Los Angeles",        tvnzPath: null },
  { id: "grp-d-4", home: "Paraguay",  away: "Australia", group: "D", startUtc: "2026-06-21T05:00:00Z", venue: "Hard Rock Stadium, Miami",      tvnzPath: null },
  { id: "grp-d-5", home: "Paraguay",  away: "Türkiye",   group: "D", startUtc: "2026-06-25T02:00:00Z", venue: "AT&T Stadium, Dallas",          tvnzPath: null },
  { id: "grp-d-6", home: "USA",       away: "Australia", group: "D", startUtc: "2026-06-25T02:00:00Z", venue: "SoFi Stadium, Los Angeles",     tvnzPath: null },

  // ── Group E: Germany · Curaçao · Ivory Coast · Ecuador ────────────────
  { id: "grp-e-1", home: "Germany",     away: "Curaçao",    group: "E", startUtc: "2026-06-16T23:00:00Z", venue: "Levi's Stadium, San Francisco", tvnzPath: "/liveevent/germany-v-curacao-groupe" },
  { id: "grp-e-2", home: "Ivory Coast", away: "Ecuador",    group: "E", startUtc: "2026-06-17T05:00:00Z", venue: "Gillette Stadium, Boston",       tvnzPath: "/liveevent/ivory-coast-v-ecuador-groupe" },
  { id: "grp-e-3", home: "Ecuador",     away: "Germany",    group: "E", startUtc: "2026-06-21T23:00:00Z", venue: "AT&T Stadium, Dallas",           tvnzPath: null },
  { id: "grp-e-4", home: "Curaçao",     away: "Ivory Coast",group: "E", startUtc: "2026-06-22T05:00:00Z", venue: "Allegiant Stadium, Las Vegas",   tvnzPath: null },
  { id: "grp-e-5", home: "Curaçao",     away: "Ecuador",    group: "E", startUtc: "2026-06-25T23:00:00Z", venue: "BC Place, Vancouver",            tvnzPath: null },
  { id: "grp-e-6", home: "Germany",     away: "Ivory Coast",group: "E", startUtc: "2026-06-26T05:00:00Z", venue: "MetLife Stadium, New York",      tvnzPath: null },

  // ── Group F: Netherlands · Japan · Sweden · Tunisia ────────────────────
  { id: "grp-f-1", home: "Netherlands", away: "Japan",        group: "F", startUtc: "2026-06-17T23:00:00Z", venue: "Arrowhead Stadium, Kansas City", tvnzPath: "/liveevent/netherlands-v-japan-groupf" },
  { id: "grp-f-2", home: "Sweden",      away: "Tunisia",      group: "F", startUtc: "2026-06-18T05:00:00Z", venue: "BC Place, Vancouver",            tvnzPath: "/liveevent/sweden-v-tunisia-groupf" },
  { id: "grp-f-3", home: "Tunisia",     away: "Netherlands",  group: "F", startUtc: "2026-06-22T23:00:00Z", venue: "Gillette Stadium, Boston",       tvnzPath: null },
  { id: "grp-f-4", home: "Japan",       away: "Sweden",       group: "F", startUtc: "2026-06-23T05:00:00Z", venue: "AT&T Stadium, Dallas",           tvnzPath: null },
  { id: "grp-f-5", home: "Japan",       away: "Tunisia",      group: "F", startUtc: "2026-06-27T02:00:00Z", venue: "Hard Rock Stadium, Miami",       tvnzPath: null },
  { id: "grp-f-6", home: "Netherlands", away: "Sweden",       group: "F", startUtc: "2026-06-27T02:00:00Z", venue: "Arrowhead Stadium, Kansas City", tvnzPath: null },

  // ── Group G: Belgium · Egypt · IR Iran · New Zealand ──────────────────
  { id: "grp-g-1", home: "Belgium",     away: "Egypt",       group: "G", startUtc: "2026-06-15T19:00:00Z", venue: "SoFi Stadium, Los Angeles",      tvnzPath: "/liveevent/belgium-v-egypt-groupg" },
  { id: "grp-g-2", home: "IR Iran",     away: "New Zealand", group: "G", startUtc: "2026-06-16T01:00:00Z", venue: "BC Place, Vancouver",            tvnzPath: "/liveevent/ir-iran-v-new-zealand-groupg" },
  { id: "grp-g-3", home: "Belgium",     away: "IR Iran",     group: "G", startUtc: "2026-06-21T19:00:00Z", venue: "SoFi Stadium, Los Angeles",      tvnzPath: "/liveevent/belgium-v-ir-iran" },
  { id: "grp-g-4", home: "New Zealand", away: "Egypt",       group: "G", startUtc: "2026-06-22T01:00:00Z", venue: "BC Place, Vancouver",            tvnzPath: "/liveevent/new-zealand-v-egypt" },
  { id: "grp-g-5", home: "Egypt",       away: "IR Iran",     group: "G", startUtc: "2026-06-26T01:00:00Z", venue: "Levi's Stadium, San Francisco",  tvnzPath: "/liveevent/egypt-v-ir-iran" },
  { id: "grp-g-6", home: "New Zealand", away: "Belgium",     group: "G", startUtc: "2026-06-27T03:00:00Z", venue: "BC Place, Vancouver",            tvnzPath: "/liveevent/new-zealand-v-belgium" },

  // ── Group H: Spain · Cape Verde · Saudi Arabia · Uruguay ───────────────
  { id: "grp-h-1", home: "Spain",         away: "Cape Verde",   group: "H", startUtc: "2026-06-18T23:00:00Z", venue: "Estadio Akron, Guadalajara",    tvnzPath: "/liveevent/spain-v-cape-verde-grouph" },
  { id: "grp-h-2", home: "Saudi Arabia",  away: "Uruguay",      group: "H", startUtc: "2026-06-19T05:00:00Z", venue: "Estadio BBVA, Monterrey",       tvnzPath: "/liveevent/saudi-arabia-v-uruguay-grouph" },
  { id: "grp-h-3", home: "Uruguay",       away: "Spain",        group: "H", startUtc: "2026-06-23T23:00:00Z", venue: "Estadio Ciudad de México",      tvnzPath: null },
  { id: "grp-h-4", home: "Cape Verde",    away: "Saudi Arabia", group: "H", startUtc: "2026-06-24T05:00:00Z", venue: "Estadio Akron, Guadalajara",    tvnzPath: null },
  { id: "grp-h-5", home: "Cape Verde",    away: "Uruguay",      group: "H", startUtc: "2026-06-28T02:00:00Z", venue: "Estadio BBVA, Monterrey",       tvnzPath: null },
  { id: "grp-h-6", home: "Spain",         away: "Saudi Arabia", group: "H", startUtc: "2026-06-28T02:00:00Z", venue: "Estadio Ciudad de México",      tvnzPath: null },

  // ── Group I: Argentina · Chile · Albania · Nigeria ─────────────────────
  { id: "grp-i-1", home: "Argentina", away: "Chile",   group: "I", startUtc: "2026-06-19T23:00:00Z", venue: "MetLife Stadium, New York",      tvnzPath: null },
  { id: "grp-i-2", home: "Albania",   away: "Nigeria", group: "I", startUtc: "2026-06-20T05:00:00Z", venue: "Rose Bowl, Los Angeles",         tvnzPath: null },
  { id: "grp-i-3", home: "Nigeria",   away: "Argentina",group: "I", startUtc: "2026-06-24T23:00:00Z", venue: "Hard Rock Stadium, Miami",      tvnzPath: null },
  { id: "grp-i-4", home: "Chile",     away: "Albania", group: "I", startUtc: "2026-06-25T05:00:00Z", venue: "Allegiant Stadium, Las Vegas",   tvnzPath: null },
  { id: "grp-i-5", home: "Chile",     away: "Nigeria", group: "I", startUtc: "2026-06-28T23:00:00Z", venue: "Rose Bowl, Los Angeles",         tvnzPath: null },
  { id: "grp-i-6", home: "Argentina", away: "Albania", group: "I", startUtc: "2026-06-29T05:00:00Z", venue: "MetLife Stadium, New York",      tvnzPath: null },

  // ── Group J: France · Colombia · Denmark · Senegal ─────────────────────
  { id: "grp-j-1", home: "France",   away: "Colombia", group: "J", startUtc: "2026-06-20T23:00:00Z", venue: "Allegiant Stadium, Las Vegas",   tvnzPath: null },
  { id: "grp-j-2", home: "Denmark",  away: "Senegal",  group: "J", startUtc: "2026-06-21T05:00:00Z", venue: "Arrowhead Stadium, Kansas City", tvnzPath: null },
  { id: "grp-j-3", home: "Senegal",  away: "France",   group: "J", startUtc: "2026-06-25T23:00:00Z", venue: "Levi's Stadium, San Francisco",  tvnzPath: null },
  { id: "grp-j-4", home: "Colombia", away: "Denmark",  group: "J", startUtc: "2026-06-26T05:00:00Z", venue: "AT&T Stadium, Dallas",           tvnzPath: null },
  { id: "grp-j-5", home: "Colombia", away: "Senegal",  group: "J", startUtc: "2026-06-29T23:00:00Z", venue: "Arrowhead Stadium, Kansas City", tvnzPath: null },
  { id: "grp-j-6", home: "France",   away: "Denmark",  group: "J", startUtc: "2026-06-30T05:00:00Z", venue: "Gillette Stadium, Boston",       tvnzPath: null },

  // ── Group K: Portugal · Angola · Croatia · Cameroon ────────────────────
  { id: "grp-k-1", home: "Portugal", away: "Angola",   group: "K", startUtc: "2026-06-21T02:00:00Z", venue: "Estadio Ciudad de México",       tvnzPath: null },
  { id: "grp-k-2", home: "Croatia",  away: "Cameroon", group: "K", startUtc: "2026-06-21T08:00:00Z", venue: "Estadio BBVA, Monterrey",        tvnzPath: null },
  { id: "grp-k-3", home: "Cameroon", away: "Portugal", group: "K", startUtc: "2026-06-26T02:00:00Z", venue: "Estadio Akron, Guadalajara",     tvnzPath: null },
  { id: "grp-k-4", home: "Angola",   away: "Croatia",  group: "K", startUtc: "2026-06-26T08:00:00Z", venue: "Estadio Ciudad de México",       tvnzPath: null },
  { id: "grp-k-5", home: "Angola",   away: "Cameroon", group: "K", startUtc: "2026-06-30T02:00:00Z", venue: "Estadio BBVA, Monterrey",        tvnzPath: null },
  { id: "grp-k-6", home: "Portugal", away: "Croatia",  group: "K", startUtc: "2026-06-30T08:00:00Z", venue: "Estadio Akron, Guadalajara",     tvnzPath: null },

  // ── Group L: England · Serbia · Uzbekistan · Panama ────────────────────
  { id: "grp-l-1", home: "England",    away: "Serbia",     group: "L", startUtc: "2026-06-22T23:00:00Z", venue: "Gillette Stadium, Boston",       tvnzPath: null },
  { id: "grp-l-2", home: "Uzbekistan", away: "Panama",     group: "L", startUtc: "2026-06-23T05:00:00Z", venue: "SoFi Stadium, Los Angeles",      tvnzPath: null },
  { id: "grp-l-3", home: "Panama",     away: "England",    group: "L", startUtc: "2026-06-27T23:00:00Z", venue: "Arrowhead Stadium, Kansas City", tvnzPath: null },
  { id: "grp-l-4", home: "Serbia",     away: "Uzbekistan", group: "L", startUtc: "2026-06-28T05:00:00Z", venue: "BC Place, Vancouver",            tvnzPath: null },
  { id: "grp-l-5", home: "Serbia",     away: "Panama",     group: "L", startUtc: "2026-07-01T23:00:00Z", venue: "Hard Rock Stadium, Miami",       tvnzPath: null },
  { id: "grp-l-6", home: "England",    away: "Uzbekistan", group: "L", startUtc: "2026-07-02T05:00:00Z", venue: "Levi's Stadium, San Francisco",  tvnzPath: null },
];

export const ALL_COUNTRIES = Array.from(
  new Set(ALL_MATCHES.flatMap((m) => [m.home, m.away]))
).sort();

export function matchesForCountries(countries: string[]): Match[] {
  const lower = countries.map((c) => c.toLowerCase());

  function teamMatches(team: string): boolean {
    const t = team.toLowerCase();
    return lower.includes(t) || (t.startsWith("ir ") && lower.includes(t.slice(3)));
  }

  // Find all groups that contain at least one selected team
  const trackedGroups = new Set(
    ALL_MATCHES
      .filter((m) => teamMatches(m.home) || teamMatches(m.away))
      .map((m) => m.group)
  );

  // Show every match in those groups — not just matches involving the tracked team
  return ALL_MATCHES
    .filter((m) => trackedGroups.has(m.group))
    .sort((a, b) => a.startUtc.localeCompare(b.startUtc));
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
