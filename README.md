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

## Live URL

**https://main.day41fc43vtko.amplifyapp.com**

## Deploying to AWS Amplify

1. Push this repo to GitHub
2. Go to [AWS Amplify Console](https://us-east-1.console.aws.amazon.com/amplify/home) — **use us-east-1**, other regions may hit app limits
3. **New app → Host web app → GitHub** → select this repo + `main` branch
4. Amplify auto-detects the `amplify.yml` build config — no manual setup needed
5. Add environment variable `VITE_ANTHROPIC_API_KEY` in Amplify → App settings → Environment variables (optional)
6. Deploy
7. If the deployed URL returns 404: go to **Deployments** → click the latest deployment → **Redeploy this version**

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

## Serving at a custom subdomain (e.g. `worldcup2026.mergence.io`)

This is the recommended approach when the root domain (`mergence.io`) already serves another app. No path-prefix config changes are needed — the app runs at the root of its own subdomain.

### Step 1 — Deploy the app to Amplify (if not already done)

> **Region:** Use **us-east-1** (N. Virginia). Other regions (e.g. ap-southeast-2) may hit app limits even with few apps due to an Amplify quota bug.

Follow the "Deploying to AWS Amplify" steps above. Once deployed, Amplify assigns a URL like `https://main.d1abc123.amplifyapp.com`.

### Step 2 — Add a custom domain in Amplify

1. In the Amplify Console → your app → **Custom domains → Add domain**
2. Enter `mergence.io` (the root domain you own)
3. Under "Configure subdomains", set:
   - Subdomain: `worldcup2026`
   - Branch: `main`
4. Click **Save**

Amplify will show DNS records to add. It needs one of:
- A **CNAME** for `worldcup2026` → Amplify's verification/proxy domain, **or**
- Amplify can manage DNS automatically if your domain is in **Route 53**

### Step 3 — Add DNS record

`mergence.io` is registered at **iwantmyname.com**, so use **Manual configuration** (not Route 53) when Amplify asks.

After clicking **Configure domain**, Amplify shows a CNAME record. Add it in iwantmyname:

1. Log in to [iwantmyname.com](https://iwantmyname.com) → **Domains** → `mergence.io` → **Manage DNS records**
2. Add a record:
   ```
   Type:  CNAME
   Name:  worldcup2026
   Value: <the value Amplify gave you, e.g. d1abc123.cloudfront.net>
   TTL:   3600
   ```
3. Save, then back in Amplify click **Verify DNS** — propagation usually takes a few minutes to an hour

### Step 4 — HTTPS certificate

Amplify provisions an ACM certificate automatically once DNS verifies. No action needed — the subdomain will be HTTPS-only.

### Step 5 — SPA routing (already handled)

The `amplify.yml` includes a catch-all rewrite rule so deep links (e.g. refreshing on a modal) don't 404. This is already in place.

### Result

- `mergence.io` → yoga-booking app (unchanged)
- `worldcup2026.mergence.io` → this app

No changes to either codebase, no proxy config, no path prefix.

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
