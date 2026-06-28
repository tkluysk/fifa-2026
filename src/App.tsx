import { useState, useCallback, useEffect } from "react";
import { ALL_COUNTRIES, matchesForCountries } from "./matches";
import { MatchCard } from "./components/MatchCard";
import { PotentialMatchCard } from "./components/PotentialMatchCard";
import { CalendarView } from "./components/CalendarView";
import { CountryPicker } from "./components/CountryPicker";
import { CountryModal } from "./components/CountryModal";
import { BracketView } from "./components/BracketView";
import { GoogleCalendarButton } from "./components/GoogleCalendarButton";
import { useLiveData, knockoutPathForCountry } from "./hooks/useLiveData";
import { buildIcs, downloadIcs } from "./icsExport";
import { flag } from "./countryInfo";
import "./App.css";

function countriesFromMatches(matches: import("./matches").Match[]): string[] {
  if (!matches.length) return ALL_COUNTRIES;
  const set = new Set<string>();
  for (const m of matches) { set.add(m.home); set.add(m.away); }
  return Array.from(set).sort();
}

const LS_KEY = "fifa2026-selected";
const LS_THEME = "fifa2026-theme";

function loadTheme(): "dark" | "light" {
  try { return (localStorage.getItem(LS_THEME) as "dark" | "light") ?? "dark"; }
  catch { return "dark"; }
}

function loadSelected(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export default function App() {
  const [selected, setSelected] = useState<string[]>(loadSelected);
  const [infoCountry, setInfoCountry] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [theme, setTheme] = useState<"dark" | "light">(loadTheme);
  const handleInfo = useCallback((c: string) => setInfoCountry(c), []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "");
    localStorage.setItem(LS_THEME, theme);
  }, [theme]);
  const { matches: allMatches, knockoutFixtures, scores, groupStandingsMap, advancedSet, eliminatedSet, loading: liveLoading, error: liveError } = useLiveData();

  const countries = countriesFromMatches(allMatches);
  const matches = matchesForCountries(allMatches, selected);

  function groupForCountry(country: string): string {
    const m = allMatches.find(m => m.home === country || m.away === country);
    return m?.group ?? "?";
  }

  // Build group map for selected countries
  const countryGroups: Record<string, string> = {};
  for (const c of selected) countryGroups[c] = groupForCountry(c);

  function handleIcsDownload() {
    const ics = buildIcs(matches, selected, knockoutFixtures);
    downloadIcs("fifa-2026.ics", ics);
  }

  function toggle(country: string) {
    setSelected((prev) => {
      const next = prev.includes(country) ? prev.filter((c) => c !== country) : [...prev, country];
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="app">
      <header className="site-header">
        <button
          className="theme-toggle"
          onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
          title="Toggle dark/light mode"
        >
          {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
        </button>
        <h1>
          <span className="ball">⚽</span> FIFA World Cup 2026
        </h1>
        <p className="subtitle">
          Pick countries &amp; plan game viewing
        </p>
        {liveError && <p className="live-status live-status--error">{liveError}</p>}
      </header>

      <CountryPicker
        countries={countries}
        selected={selected}
        onToggle={toggle}
        onInfo={setInfoCountry}
        advancedSet={advancedSet}
        eliminatedSet={eliminatedSet}
      />

      <BracketView
        fixtures={knockoutFixtures}
        tracked={selected}
        groupStandingsMap={groupStandingsMap}
        countryGroups={countryGroups}
      />

      <div className="view-toggle">
        <button className={`view-btn${view === "list" ? " view-btn--active" : ""}`} onClick={() => setView("list")}>≡ List</button>
        <button className={`view-btn${view === "calendar" ? " view-btn--active" : ""}`} onClick={() => setView("calendar")}>📅 Calendar</button>
        <button className="view-btn view-btn--ics" onClick={handleIcsDownload} disabled={matches.length === 0} title="Download as .ics — import into Google Cal, Apple Cal or Outlook to replace all entries">
          ⬇ Export .ics
        </button>
        <GoogleCalendarButton
          matches={matches}
          knockoutFixtures={knockoutFixtures}
          selected={selected}
          countryGroups={countryGroups}
          groupStandingsMap={groupStandingsMap}
        />
      </div>

      <main className="main">
        {liveLoading && (
          <div className="scores-loading">
            <span className="spinner" /> Fetching live scores…
          </div>
        )}
        {selected.length === 0 ? (
          <p className="empty">Select at least one country above.</p>
        ) : matches.length === 0 ? (
          <p className="empty">No group-stage matches found for the selected countries.</p>
        ) : view === "calendar" ? (
          <CalendarView
            matches={matches}
            knockoutFixtures={knockoutFixtures}
            scores={scores}
            tracked={selected}
            onInfo={handleInfo}
          />
        ) : (
          <ul className="match-list">
            {(() => {
              const now = Date.now();
              const live = matches.filter(m => scores[m.id]?.status === "in_progress");
              const liveIds = new Set(live.map(m => m.id));
              const past = matches.filter(m => !liveIds.has(m.id) && new Date(m.startUtc).getTime() <= now);
              const upcoming = matches.filter(m => !liveIds.has(m.id) && new Date(m.startUtc).getTime() > now);
              const upcomingNextSet = new Set(
                upcoming.slice(0, 2).map(m => m.id)
              );
              return (
                <>
                  {live.map(m => (
                    <MatchCard key={m.id} match={m} tracked={selected} score={scores[m.id]} onInfo={setInfoCountry} isNext={false} />
                  ))}
                  {past.length > 0 && (
                    <li className="past-matches-section">
                      <details>
                        <summary className="past-matches-summary">
                          Past group matches ({past.length})
                        </summary>
                        <ul className="match-list past-matches-list">
                          {past.map(m => (
                            <MatchCard key={m.id} match={m} tracked={selected} score={scores[m.id]} onInfo={setInfoCountry} isNext={false} />
                          ))}
                        </ul>
                      </details>
                    </li>
                  )}
                  {upcoming.map(m => (
                    <MatchCard key={m.id} match={m} tracked={selected} score={scores[m.id]} onInfo={setInfoCountry} isNext={upcomingNextSet.has(m.id)} />
                  ))}
                </>
              );
            })()}

            {selected.map((country) => {
              const group = groupForCountry(country);
              if (group === "?") return null;
              const path = knockoutPathForCountry(country, group, knockoutFixtures);
              if (path.length === 0) return null;
              const isTBD = (name: string) => /(group|round of|winner|place|runner|loser|quarterfinal|semifinal)/i.test(name);
              const opponentOf = (f: typeof path[0]) => f.home.toLowerCase() === country.toLowerCase() ? f.away : f.home;
              const pastKO = path.filter(f => f.score?.status === "finished");
              const upcomingKO = path.filter(f => f.score?.status !== "finished");
              const confirmedKO = upcomingKO.filter(f => !isTBD(opponentOf(f)));
              const potentialKO = upcomingKO.filter(f => isTBD(opponentOf(f)));
              return (
                <li key={`ko-section-${country}`} className="potential-section">
                  <ul className="match-list" style={{ listStyle: "none", padding: 0 }}>
                    <li className="potential-divider">
                      <span>{flag(country)} {country} · knockout path</span>
                    </li>
                    {pastKO.length > 0 && (
                      <li className="past-matches-section">
                        <details>
                          <summary className="past-matches-summary">
                            Past knockout games ({pastKO.length})
                          </summary>
                          <ul className="match-list past-matches-list">
                            {pastKO.map((f) => (
                              <PotentialMatchCard
                                key={`${f.id}-${country}-past`}
                                fixture={f}
                                country={country}
                                groupStandingsMap={groupStandingsMap}
                                onInfo={setInfoCountry}
                              />
                            ))}
                          </ul>
                        </details>
                      </li>
                    )}
                    {confirmedKO.map((f) => (
                      <PotentialMatchCard
                        key={`${f.id}-${country}-conf`}
                        fixture={f}
                        country={country}
                        groupStandingsMap={groupStandingsMap}
                        onInfo={setInfoCountry}
                      />
                    ))}
                    {potentialKO.length > 0 && (
                      <li className="past-matches-section">
                        <details>
                          <summary className="past-matches-summary">
                            Potential games ({potentialKO.length})
                          </summary>
                          <ul className="match-list past-matches-list">
                            {potentialKO.map((f) => (
                              <PotentialMatchCard
                                key={`${f.id}-${country}`}
                                fixture={f}
                                country={country}
                                groupStandingsMap={groupStandingsMap}
                                onInfo={setInfoCountry}
                              />
                            ))}
                          </ul>
                        </details>
                      </li>
                    )}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </main>


{infoCountry && (
        <CountryModal
          country={infoCountry}
          scores={scores}
          allMatches={allMatches}
          onClose={() => setInfoCountry(null)}
        />
      )}
    </div>
  );
}
