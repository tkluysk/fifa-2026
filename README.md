# FIFA World Cup 2026 — Match Tracker

React + Vite web app that lets you pick countries and see their group-stage matches with TVNZ stream links and one-click Google Calendar add buttons.

Deployed via **AWS Amplify** (see below).

## Running locally

```bash
npm install
npm run dev
```

## Deploying to AWS Amplify

1. Push this repo to GitHub (already done)
2. Go to [AWS Amplify Console](https://us-east-1.console.aws.amazon.com/amplify/home)
3. **New app → Host web app → GitHub** → select this repo + `main` branch
4. Amplify auto-detects the `amplify.yml` build config — no manual setup needed
5. Deploy

The build output (`dist/`) is a fully static site — no server required.

## Adding more countries / matches

Edit [src/matches.ts](src/matches.ts). Each entry needs:

```ts
{
  id: "unique-id",
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

The original approach was a Python script that used the **Google Calendar API** (OAuth2) to write events server-side. It worked, but required credentials management and a local Python environment.

The web app replaces it with a purely static approach: the **"Add to Google Calendar"** button generates a pre-filled `calendar.google.com/calendar/render` URL, so no backend or credentials are needed.

The Python scripts are kept in [`archive/`](archive/) for reference:

| File | Purpose |
|---|---|
| `archive/matches.py` | Match data (Python version) |
| `archive/calendar_sync.py` | OAuth2 → Google Calendar API sync |
| `archive/requirements.txt` | Python dependencies |
| `archive/SETUP.md` | Python setup instructions |
