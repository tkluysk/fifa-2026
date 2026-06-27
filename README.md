# FIFA World Cup 2026 — Match Tracker

React + Vite web app to track World Cup matches for countries you care about.
Pick any of the 32 teams, see all three group-stage games, live scores, TVNZ stream links, and potential knockout paths.

Deployed via **AWS Amplify** (see below).

## Features

- **All 72 group-stage fixtures** across Groups A–L, all three matchdays
- **Live scores** via ESPN's public scoreboard API — no key needed, auto-polls every 5 min when a match is in progress
- **TVNZ+ links** for matches with NZ broadcast rights
- **Google Calendar export** — one-click `.ics` download for all selected matches (import into Google Cal, Apple Calendar, or Outlook to replace existing entries)
- **Potential knockout cards** placeholder blocks for R32 → Final for Group G teams
- **List view** (times in NZT) and **Calendar view** (times in your local timezone)
- **Country info modal** — group standings, results, AI-generated tournament analysis (needs `VITE_ANTHROPIC_API_KEY`)
- **Dark sporty theme** — flag-derived colour gradients on each match card

## Running locally

```bash
npm install
npm run dev
```

Runs on `http://localhost:5173` by default.

### Optional: AI country analysis

```bash
# .env.local (gitignored)
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

Get a key at [console.anthropic.com](https://console.anthropic.com). Without it, the ⓘ modal shows structured stats only. With it, Claude Haiku generates a live tournament analysis on every click.

## Deploying to AWS Amplify

1. Push this repo to GitHub
2. Go to [AWS Amplify Console](https://us-east-1.console.aws.amazon.com/amplify/home)
3. **New app → Host web app → GitHub** → select this repo + `main` branch
4. Amplify auto-detects the `amplify.yml` build config — no manual setup needed
5. Add environment variable `VITE_ANTHROPIC_API_KEY` in Amplify → App settings → Environment variables (optional)
6. Deploy

The build output (`dist/`) is a fully static site — no server required.

## Calendar export

The **⬇ Export to Calendar** button downloads `fifa-2026.ics` containing:
- All confirmed group-stage matches for selected countries
- Potential knockout slots (R32 → Final) for Group G teams

To "replace" entries in Google Calendar: delete the old imported calendar, then import the new `.ics`. Full OAuth sync (write access) is planned as a future phase.

## Fixture data

All 72 group-stage fixtures are in [src/matches.ts](src/matches.ts). Matchday 1 dates/venues are confirmed; later matchdays use the official schedule and may shift slightly. TVNZ stream paths are only populated for matches with confirmed NZ broadcast rights.

## Adding or correcting a match

Edit [src/matches.ts](src/matches.ts):

```ts
{
  id: "grp-x-n",
  home: "Country Name",
  away: "Country Name",
  group: "A",
  startUtc: "2026-06-15T19:00:00Z",   // UTC ISO string
  venue: "Stadium, City",
  tvnzPath: "/liveevent/slug",          // or null
}
```

---

## Archive — Python calendar sync (deprecated)

The original approach was a Python script using the **Google Calendar API** (OAuth2) to write events server-side. It's been superseded by the `.ics` export.

The scripts are kept in [`archive/`](archive/) for reference:

| File | Purpose |
|---|---|
| `archive/matches.py` | Match data (Python version) |
| `archive/calendar_sync.py` | OAuth2 → Google Calendar API sync |
| `archive/requirements.txt` | Python dependencies |
| `archive/SETUP.md` | Python setup instructions |
