import { useGoogleCalendar } from "../hooks/useGoogleCalendar";
import type { Match } from "../matches";
import type { KnockoutFixture, GroupStandingsMap, BracketTree } from "../hooks/useLiveData";
import { knockoutPathForCountry } from "../hooks/useLiveData";

interface Props {
  matches: Match[];
  knockoutFixtures: KnockoutFixture[];
  bracketTree?: BracketTree;
  selected: string[];
  countryGroups: Record<string, string>;
  groupStandingsMap: GroupStandingsMap;
  loading: boolean;
}

export function GoogleCalendarButton({ matches, knockoutFixtures, bracketTree, selected, countryGroups, groupStandingsMap, loading }: Props) {
  const { hasClientId, status, error, lastSync, sync } = useGoogleCalendar();

  if (!hasClientId) return null;

  function handleSync() {
    // Collect knockout paths for all selected countries
    const knockouts = selected.flatMap((country) => {
      const group = countryGroups[country] ?? "?";
      if (group === "?") return [];
      return knockoutPathForCountry(country, group, knockoutFixtures, bracketTree);
    });
    // Deduplicate by fixture id
    const seen = new Set<string>();
    const uniqueKnockouts = knockouts.filter((f) => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });

    sync({ matches, knockouts: uniqueKnockouts, gsMap: groupStandingsMap });
  }

  const isBusy = status === "syncing";

  return (
    <div className="gcal-wrap">
      <button
        className={`gcal-btn gcal-btn--${status}`}
        onClick={handleSync}
        disabled={isBusy || loading || selected.length === 0}
        title={loading ? "Waiting for match data to load…" : selected.length === 0 ? "Select countries first" : "Sync to Google Calendar"}
      >
        <span className="gcal-icon">
          {status === "syncing" ? <span className="spinner" /> : "📅"}
        </span>
        <span className="gcal-label">
          {status === "syncing" ? "Syncing…" :
           status === "done"    ? "Synced ✓" :
           status === "error"   ? "Retry sync" :
                                  "Sync to Google Cal"}
        </span>
      </button>
      {lastSync && (
        <span className="gcal-lastsync">Last synced {lastSync.toLocaleTimeString()}</span>
      )}
      {error && <span className="gcal-error">{error}</span>}
    </div>
  );
}
