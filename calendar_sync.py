"""
Google Calendar sync for FIFA 2026 matches.

First run will open a browser for OAuth consent. The token is cached in
token.json so subsequent runs are silent.

Required env / files:
  - credentials.json  (OAuth 2.0 Desktop client downloaded from Google Cloud Console)
  - CALENDAR_ID env var, or leave blank to use the primary calendar

Usage:
  python calendar_sync.py [--dry-run] [--calendar-id <id>] [--countries NZ Belgium ...]
"""

import argparse
import json
import os
import sys
from datetime import timedelta
from zoneinfo import ZoneInfo

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from matches import TRACKED_COUNTRIES, get_country_matches, tvnz_url

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]
TOKEN_FILE = "token.json"
CREDS_FILE = "credentials.json"
NZT = ZoneInfo("Pacific/Auckland")
MATCH_DURATION = timedelta(hours=2)
EVENT_SOURCE_TAG = "fifa2026-sync"  # stored in extendedProperties to identify our events


def get_credentials() -> Credentials:
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDS_FILE):
                sys.exit(
                    f"Missing {CREDS_FILE}. "
                    "Download an OAuth 2.0 Desktop client JSON from "
                    "https://console.cloud.google.com/apis/credentials and save it here."
                )
            flow = InstalledAppFlow.from_client_secrets_file(CREDS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
    return creds


def build_event(match: dict) -> dict:
    home, away = match["home"], match["away"]
    start = match["start_utc"]
    end = start + MATCH_DURATION
    stream = tvnz_url(match)

    lines = [
        f"🏟️  {match['venue']}",
        f"📺 Group {match['group']} — FIFA World Cup 2026",
    ]
    if stream:
        lines.append(f"\n🔴 Watch live on TVNZ+:\n{stream}")
    lines.append(
        "\n📱 TVNZ+ Event Pass required for non-free-to-air matches.\n"
        "Free-to-air on TVNZ 1: All Whites (NZ) group games + Final."
    )

    return {
        "summary": f"⚽ {home} vs {away}",
        "location": match["venue"],
        "description": "\n".join(lines),
        "start": {
            "dateTime": start.isoformat(),
            "timeZone": "UTC",
        },
        "end": {
            "dateTime": end.isoformat(),
            "timeZone": "UTC",
        },
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "popup", "minutes": 60},
                {"method": "popup", "minutes": 15},
            ],
        },
        "extendedProperties": {
            "private": {
                "source": EVENT_SOURCE_TAG,
                "match_id": match["id"],
            }
        },
    }


def get_existing_events(service, calendar_id: str) -> dict[str, str]:
    """Return {match_id: event_id} for events we previously created."""
    existing = {}
    page_token = None
    while True:
        resp = (
            service.events()
            .list(
                calendarId=calendar_id,
                privateExtendedProperty=f"source={EVENT_SOURCE_TAG}",
                pageToken=page_token,
                maxResults=250,
            )
            .execute()
        )
        for item in resp.get("items", []):
            mid = (
                item.get("extendedProperties", {})
                .get("private", {})
                .get("match_id")
            )
            if mid:
                existing[mid] = item["id"]
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return existing


def sync(
    countries: list[str],
    calendar_id: str = "primary",
    dry_run: bool = False,
) -> None:
    matches = get_country_matches(countries)
    if not matches:
        print("No matches found for the given countries.")
        return

    print(f"Found {len(matches)} match(es) for: {', '.join(countries)}\n")

    if dry_run:
        for m in matches:
            nzt_time = m["start_utc"].astimezone(NZT)
            stream = tvnz_url(m) or "—"
            print(
                f"  [{m['id']}] {m['home']} vs {m['away']}"
                f"  |  {nzt_time.strftime('%a %d %b %Y %H:%M NZT')}"
                f"  |  {stream}"
            )
        print("\n(dry-run — no calendar changes made)")
        return

    creds = get_credentials()
    service = build("calendar", "v3", credentials=creds)

    existing = get_existing_events(service, calendar_id)
    created = updated = skipped = 0

    for match in matches:
        event_body = build_event(match)
        mid = match["id"]
        nzt_time = match["start_utc"].astimezone(NZT)
        label = f"{match['home']} vs {match['away']} ({nzt_time.strftime('%d %b %H:%M NZT')})"

        try:
            if mid in existing:
                service.events().update(
                    calendarId=calendar_id,
                    eventId=existing[mid],
                    body=event_body,
                ).execute()
                print(f"  ✏️  Updated : {label}")
                updated += 1
            else:
                service.events().insert(
                    calendarId=calendar_id, body=event_body
                ).execute()
                print(f"  ✅ Created : {label}")
                created += 1
        except HttpError as e:
            print(f"  ❌ Failed  : {label}  ({e})")
            skipped += 1

    print(
        f"\nDone — {created} created, {updated} updated, {skipped} failed."
    )


def delete_all(calendar_id: str = "primary", dry_run: bool = False) -> None:
    """Remove all events previously created by this tool."""
    creds = get_credentials()
    service = build("calendar", "v3", credentials=creds)
    existing = get_existing_events(service, calendar_id)
    if not existing:
        print("No FIFA 2026 events found to delete.")
        return
    print(f"Found {len(existing)} event(s) to delete.")
    if dry_run:
        print("(dry-run — nothing deleted)")
        return
    for mid, eid in existing.items():
        service.events().delete(calendarId=calendar_id, eventId=eid).execute()
        print(f"  🗑️  Deleted match_id={mid}")
    print("Done.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Sync FIFA World Cup 2026 matches to Google Calendar"
    )
    parser.add_argument(
        "--countries",
        nargs="+",
        default=TRACKED_COUNTRIES,
        metavar="COUNTRY",
        help="Countries to track (default: %(default)s)",
    )
    parser.add_argument(
        "--calendar-id",
        default=os.getenv("CALENDAR_ID", "primary"),
        help="Google Calendar ID (default: primary)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would happen without touching the calendar",
    )
    parser.add_argument(
        "--delete",
        action="store_true",
        help="Remove all events previously added by this tool",
    )
    args = parser.parse_args()

    if args.delete:
        delete_all(calendar_id=args.calendar_id, dry_run=args.dry_run)
    else:
        sync(
            countries=args.countries,
            calendar_id=args.calendar_id,
            dry_run=args.dry_run,
        )


if __name__ == "__main__":
    main()
