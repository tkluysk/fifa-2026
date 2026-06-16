"""
FIFA World Cup 2026 match data.
Times are in UTC. Add countries to TRACKED_COUNTRIES to include them.
"""

from datetime import datetime, timezone

TRACKED_COUNTRIES = ["New Zealand", "Belgium"]

TVNZ_BASE = "https://www.tvnz.co.nz"

MATCHES = [
    # ── Group A ──────────────────────────────────────────────────────────
    {
        "id": "grp-a-1",
        "home": "Mexico",
        "away": "South Africa",
        "group": "A",
        "start_utc": datetime(2026, 6, 12, 23, 0, tzinfo=timezone.utc),
        "venue": "AT&T Stadium, Dallas",
        "tvnz_path": "/liveevent/mexico-v-southafrica-group-a",
    },
    {
        "id": "grp-a-2",
        "home": "Korea Republic",
        "away": "Czechia",
        "group": "A",
        "start_utc": datetime(2026, 6, 13, 5, 0, tzinfo=timezone.utc),
        "venue": "SoFi Stadium, Los Angeles",
        "tvnz_path": "/liveevent/korea-v-czechia-group-a",
    },
    # ── Group B ──────────────────────────────────────────────────────────
    {
        "id": "grp-b-1",
        "home": "Canada",
        "away": "Bosnia-Herzegovina",
        "group": "B",
        "start_utc": datetime(2026, 6, 13, 23, 0, tzinfo=timezone.utc),
        "venue": "MetLife Stadium, New York",
        "tvnz_path": "/liveevent/canada-v-bosniaherzegovina-group-b",
    },
    {
        "id": "grp-b-2",
        "home": "Qatar",
        "away": "Switzerland",
        "group": "B",
        "start_utc": datetime(2026, 6, 14, 5, 0, tzinfo=timezone.utc),
        "venue": "Rose Bowl, Los Angeles",
        "tvnz_path": "/liveevent/qatar-v-swiss-group-b",
    },
    # ── Group C ──────────────────────────────────────────────────────────
    {
        "id": "grp-c-1",
        "home": "Brazil",
        "away": "Morocco",
        "group": "C",
        "start_utc": datetime(2026, 6, 14, 22, 0, tzinfo=timezone.utc),
        "venue": "Hard Rock Stadium, Miami",
        "tvnz_path": "/liveevent/brazil-v-morocco-groupc",
    },
    {
        "id": "grp-c-2",
        "home": "Haiti",
        "away": "Scotland",
        "group": "C",
        "start_utc": datetime(2026, 6, 15, 2, 0, tzinfo=timezone.utc),
        "venue": "Allegiant Stadium, Las Vegas",
        "tvnz_path": "/liveevent/haiti-v-scotland-groupc",
    },
    # ── Group D ──────────────────────────────────────────────────────────
    {
        "id": "grp-d-1",
        "home": "USA",
        "away": "Paraguay",
        "group": "D",
        "start_utc": datetime(2026, 6, 15, 23, 0, tzinfo=timezone.utc),
        "venue": "AT&T Stadium, Dallas",
        "tvnz_path": "/liveevent/usa-v-para-group-d",
    },
    {
        "id": "grp-d-2",
        "home": "Australia",
        "away": "Türkiye",
        "group": "D",
        "start_utc": datetime(2026, 6, 16, 5, 0, tzinfo=timezone.utc),
        "venue": "MetLife Stadium, New York",
        "tvnz_path": "/liveevent/australia-v-turkiye-groupd",
    },
    # ── Group E ──────────────────────────────────────────────────────────
    {
        "id": "grp-e-1",
        "home": "Germany",
        "away": "Curaçao",
        "group": "E",
        "start_utc": datetime(2026, 6, 16, 23, 0, tzinfo=timezone.utc),
        "venue": "Levi's Stadium, San Francisco",
        "tvnz_path": "/liveevent/germany-v-curacao-groupe",
    },
    {
        "id": "grp-e-2",
        "home": "Ivory Coast",
        "away": "Ecuador",
        "group": "E",
        "start_utc": datetime(2026, 6, 17, 5, 0, tzinfo=timezone.utc),
        "venue": "Gillette Stadium, Boston",
        "tvnz_path": "/liveevent/ivory-coast-v-ecuador-groupe",
    },
    # ── Group F ──────────────────────────────────────────────────────────
    {
        "id": "grp-f-1",
        "home": "Netherlands",
        "away": "Japan",
        "group": "F",
        "start_utc": datetime(2026, 6, 17, 23, 0, tzinfo=timezone.utc),
        "venue": "Arrowhead Stadium, Kansas City",
        "tvnz_path": "/liveevent/netherlands-v-japan-groupf",
    },
    {
        "id": "grp-f-2",
        "home": "Sweden",
        "away": "Tunisia",
        "group": "F",
        "start_utc": datetime(2026, 6, 18, 5, 0, tzinfo=timezone.utc),
        "venue": "BC Place, Vancouver",
        "tvnz_path": "/liveevent/sweden-v-tunisia-groupf",
    },
    # ── Group G ──────────────────────────────────────────────────────────
    {
        "id": "grp-g-1",
        "home": "Belgium",
        "away": "Egypt",
        "group": "G",
        "start_utc": datetime(2026, 6, 15, 19, 0, tzinfo=timezone.utc),
        "venue": "SoFi Stadium, Los Angeles",
        "tvnz_path": "/liveevent/belgium-v-egypt-groupg",
    },
    {
        "id": "grp-g-2",
        "home": "IR Iran",
        "away": "New Zealand",
        "group": "G",
        "start_utc": datetime(2026, 6, 16, 1, 0, tzinfo=timezone.utc),
        "venue": "BC Place, Vancouver",
        "tvnz_path": "/liveevent/ir-iran-v-new-zealand-groupg",
    },
    {
        "id": "grp-g-3",
        "home": "Belgium",
        "away": "IR Iran",
        "group": "G",
        "start_utc": datetime(2026, 6, 21, 19, 0, tzinfo=timezone.utc),
        "venue": "SoFi Stadium, Los Angeles",
        "tvnz_path": "/liveevent/belgium-v-ir-iran",
    },
    {
        "id": "grp-g-4",
        "home": "New Zealand",
        "away": "Egypt",
        "group": "G",
        "start_utc": datetime(2026, 6, 22, 1, 0, tzinfo=timezone.utc),
        "venue": "BC Place, Vancouver",
        "tvnz_path": "/liveevent/new-zealand-v-egypt",
    },
    {
        "id": "grp-g-5",
        "home": "Egypt",
        "away": "IR Iran",
        "group": "G",
        "start_utc": datetime(2026, 6, 26, 1, 0, tzinfo=timezone.utc),
        "venue": "Levi's Stadium, San Francisco",
        "tvnz_path": "/liveevent/egypt-v-ir-iran",
    },
    {
        "id": "grp-g-6",
        "home": "New Zealand",
        "away": "Belgium",
        "group": "G",
        "start_utc": datetime(2026, 6, 27, 3, 0, tzinfo=timezone.utc),
        "venue": "BC Place, Vancouver",
        "tvnz_path": "/liveevent/new-zealand-v-belgium",
    },
    # ── Group H ──────────────────────────────────────────────────────────
    {
        "id": "grp-h-1",
        "home": "Spain",
        "away": "Cape Verde",
        "group": "H",
        "start_utc": datetime(2026, 6, 18, 23, 0, tzinfo=timezone.utc),
        "venue": "Estadio Akron, Guadalajara",
        "tvnz_path": "/liveevent/spain-v-cape-verde-grouph",
    },
    {
        "id": "grp-h-2",
        "home": "Saudi Arabia",
        "away": "Uruguay",
        "group": "H",
        "start_utc": datetime(2026, 6, 19, 5, 0, tzinfo=timezone.utc),
        "venue": "Estadio BBVA, Monterrey",
        "tvnz_path": "/liveevent/saudi-arabia-v-uruguay-grouph",
    },
]


def get_country_matches(countries: list[str]) -> list[dict]:
    """Return all matches where any tracked country is playing."""
    normalised = {c.lower() for c in countries}
    result = []
    for m in MATCHES:
        teams = {m["home"].lower(), m["away"].lower()}
        # Also match "IR Iran" when user passes "Iran"
        expanded = set()
        for t in teams:
            expanded.add(t)
            if t.startswith("ir "):
                expanded.add(t[3:])
        if normalised & expanded:
            result.append(m)
    return sorted(result, key=lambda x: x["start_utc"])


def tvnz_url(match: dict) -> str | None:
    path = match.get("tvnz_path")
    return f"{TVNZ_BASE}{path}" if path else None
