# FIFA 2026 Google Calendar Sync — Setup

## 1. Install dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 2. Enable the Google Calendar API

1. Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Create a project (or pick an existing one)
3. Enable **Google Calendar API**: APIs & Services → Library → search "Google Calendar API" → Enable
4. Create credentials: APIs & Services → Credentials → **+ Create Credentials** → **OAuth client ID**
   - Application type: **Desktop app**
   - Name anything, e.g. "FIFA Sync"
5. Download the JSON and save it as **`credentials.json`** in this directory

## 3. Run a dry-run to preview

```bash
python calendar_sync.py --dry-run
```

This prints every match that would be added (NZ + Belgium by default) with their NZT kick-off times and TVNZ stream links — no calendar changes made.

## 4. Sync to your primary calendar

```bash
python calendar_sync.py
```

Your browser will open for Google OAuth on the first run. After approving, a `token.json` is saved locally so future runs are silent.

## Options

| Flag | Description |
|---|---|
| `--countries NZ Belgium Argentina` | Override which countries to track |
| `--calendar-id <id>` | Use a specific calendar instead of primary |
| `--dry-run` | Preview without writing |
| `--delete` | Remove all events this tool created |

You can also set `CALENDAR_ID` as an environment variable instead of the flag.

## Re-sync / update

Just re-run `python calendar_sync.py`. It uses Google Calendar's `extendedProperties` to identify events it owns, so existing events are updated in-place rather than duplicated.

## TVNZ stream links

All NZ + Belgium group-stage games have a TVNZ+ live stream link embedded in the calendar event description. TVNZ holds exclusive NZ broadcast rights for the 2026 World Cup.

- **Free to air (TVNZ 1):** All Whites (NZ) group games + the Final
- **TVNZ+ Event Pass required:** all other matches
