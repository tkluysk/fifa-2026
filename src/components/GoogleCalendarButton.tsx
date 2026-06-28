import { useGoogleCalendar } from "../hooks/useGoogleCalendar";
import type { Match } from "../matches";
import type { KnockoutFixture, GroupStandingsMap } from "../hooks/useLiveData";
import { knockoutPathForCountry } from "../hooks/useLiveData";

interface Props {
  matches: Match[];
  knockoutFixtures: KnockoutFixture[];
  selected: string[];
  countryGroups: Record<string, string>;
  groupStandingsMap: GroupStandingsMap;
}

export function GoogleCalendarButton({ matches, knockoutFixtures, selected, countryGroups, groupStandingsMap }: Props) {
  const { hasClientId, status, error, lastSync, sync, disconnect } = useGoogleCalendar();

  if (!hasClientId) return null;

  function handleSync() {
    // Collect knockout paths for all selected countries
    const knockouts = selected.flatMap((country) => {
      const group = countryGroups[country] ?? "?";
      if (group === "?") return [];
      return knockoutPathForCountry(country, group, knockoutFixtures);
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
        disabled={isBusy || selected.length === 0}
        title={selected.length === 0 ? "Select countries first" : "Sync to Google Calendar"}
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
      {status === "connected" || status === "done" ? (
        <button className="gcal-disconnect" onClick={disconnect} title="Disconnect Google Calendar">✕</button>
      ) : null}
      {lastSync && (
        <span className="gcal-lastsync">Last synced {lastSync.toLocaleTimeString()}</span>
      )}
      {error && <span className="gcal-error">{error}</span>}
    </div>
  );
}
