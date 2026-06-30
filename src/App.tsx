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
import { flag, countryColor } from "./countryInfo";
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

  // Single NEXT badge across the whole selection — earliest upcoming confirmed game
  const globalNextGameId = (() => {
    const candidates: { id: string; t: number }[] = [];
    for (const c of selected) {
      const g = groupForCountry(c);
      const gms = allMatches.filter(m => m.home === c || m.away === c);
      const liveIds = new Set(gms.filter(m => scores[m.id]?.status === "in_progress").map(m => m.id));
      gms
        .filter(m => !liveIds.has(m.id) && scores[m.id]?.status !== "finished" && (scores[m.id]?.status === "scheduled" || !scores[m.id]))
        .forEach(m => candidates.push({ id: m.id, t: new Date(m.startUtc).getTime() }));
      if (g !== "?") {
        const p = knockoutPathForCountry(c, g, knockoutFixtures);
        const upKO = p.filter(f => f.score?.status !== "finished");
        upKO
          .filter((f) => p.slice(0, p.indexOf(f)).every(prev => prev.score?.status === "finished"))
          .filter(f => f.score?.status !== "in_progress")
          .forEach(f => candidates.push({ id: f.id, t: new Date(f.startUtc).getTime() }));
      }
    }
    return candidates.sort((a, b) => a.t - b.t)[0]?.id ?? null;
  })();

  return (
    <div className="app">
      <header className="site-header">
        <a href="/privacy.html" target="_blank" rel="noreferrer" className="header-privacy-link">Privacy Policy</a>
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

      <details className="bracket-section">
        <summary className="bracket-section-summary">Road to the Final</summary>
        <BracketView
          fixtures={knockoutFixtures}
          tracked={selected}
          groupStandingsMap={groupStandingsMap}
          countryGroups={countryGroups}
          showFull={false}
        />
      </details>
      <details className="bracket-section">
        <summary className="bracket-section-summary">Full bracket</summary>
        <BracketView
          fixtures={knockoutFixtures}
          tracked={selected}
          groupStandingsMap={groupStandingsMap}
          countryGroups={countryGroups}
          showFull={true}
        />
      </details>

      <div className="toolbar">
        <div className="toolbar-left">
          <button className="view-btn view-btn--ics" onClick={handleIcsDownload} disabled={matches.length === 0} title="Download as .ics — import into Google Cal, Apple Cal or Outlook">
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
      </div>

      <main className="main">
        {liveLoading && (
          <div className="scores-loading">
            <span className="spinner" /> Fetching live scores…
          </div>
        )}
        {selected.length === 0 ? (
          <p className="empty">Select at least one country above.</p>
        ) : (
          <>
          <details className="bracket-section">
            <summary className="bracket-section-summary">📅 Calendar</summary>
            <CalendarView
              matches={matches}
              knockoutFixtures={knockoutFixtures}
              scores={scores}
              tracked={selected}
              onInfo={handleInfo}
            />
          </details>
          <div className="country-sections">
            {selected.map((country) => {
              const group = groupForCountry(country);
              const accent = countryColor(country).accent;

              // Group stage matches
              const countryGroupMatches = allMatches.filter(m => m.home === country || m.away === country);
              const liveGroup = countryGroupMatches.filter(m => scores[m.id]?.status === "in_progress");
              const liveGroupIds = new Set(liveGroup.map(m => m.id));
              const pastGroup = countryGroupMatches.filter(m => scores[m.id]?.status === "finished");
              const upcomingGroup = countryGroupMatches.filter(m =>
                !liveGroupIds.has(m.id) && scores[m.id]?.status !== "finished" &&
                (scores[m.id]?.status === "scheduled" || !scores[m.id])
              );

              // Knockout path
              const path = group !== "?" ? knockoutPathForCountry(country, group, knockoutFixtures) : [];
              const pastKO = path.filter(f => f.score?.status === "finished");
              const upcomingKO = path.filter(f => f.score?.status !== "finished");
              const confirmedKO = upcomingKO.filter((f) => {
                const idx = path.indexOf(f);
                return path.slice(0, idx).every(g => g.score?.status === "finished");
              });
              const potentialKO = upcomingKO.filter((f) => {
                const idx = path.indexOf(f);
                return !path.slice(0, idx).every(g => g.score?.status === "finished");
              });

              return (
                <section key={country} className="country-section">
                  <div className="country-section-header" style={{ borderLeftColor: accent }}>
                    <span className="country-section-flag">{flag(country)}</span>
                    <span className="country-section-name">{country}</span>
                    {group !== "?" && <span className="country-section-group-badge">Group {group}</span>}
                  </div>

                  {/* Group Stage */}
                  <div className="country-sub-section">
                    <div className="country-sub-label">Group Stage</div>
                    {liveGroup.length > 0 && (
                      <ul className="match-list ko-confirmed-list">
                        {liveGroup.map(m => (
                          <MatchCard key={m.id} match={m} tracked={selected} score={scores[m.id]} onInfo={setInfoCountry} isNext={m.id === globalNextGameId} />
                        ))}
                      </ul>
                    )}
                    {upcomingGroup.length > 0 && (
                      <ul className="match-list ko-confirmed-list">
                        {upcomingGroup.map(m => (
                          <MatchCard key={m.id} match={m} tracked={selected} score={scores[m.id]} onInfo={setInfoCountry} isNext={m.id === globalNextGameId} />
                        ))}
                      </ul>
                    )}
                    {pastGroup.length > 0 && (
                      <details className="ko-details">
                        <summary className="ko-details-summary">Past matches ({pastGroup.length})</summary>
                        <ul className="match-list ko-details-list">
                          {pastGroup.map(m => (
                            <MatchCard key={m.id} match={m} tracked={selected} score={scores[m.id]} onInfo={setInfoCountry} />
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>

                  {/* Knockout Path */}
                  {path.length > 0 && (
                    <div className="country-sub-section country-sub-section--knockout">
                      <div className="country-sub-label">Knockout Path</div>

                      {/* Past knockout — collapsible */}
                      {pastKO.length > 0 && (
                        <details className="ko-details">
                          <summary className="ko-details-summary">Past knockout ({pastKO.length})</summary>
                          <ul className="match-list ko-details-list">
                            {pastKO.map(f => (
                              <PotentialMatchCard key={`${f.id}-${country}-past`} fixture={f} country={country} groupStandingsMap={groupStandingsMap} knockoutFixtures={knockoutFixtures} onInfo={setInfoCountry} />
                            ))}
                          </ul>
                        </details>
                      )}

                      {/* Confirmed next game(s) — shown directly, not collapsible */}
                      {confirmedKO.length > 0 && (
                        <ul className="match-list ko-confirmed-list">
                          {confirmedKO.map(f => (
                            <PotentialMatchCard key={`${f.id}-${country}-conf`} fixture={f} country={country} groupStandingsMap={groupStandingsMap} knockoutFixtures={knockoutFixtures} onInfo={setInfoCountry} isNext={f.id === globalNextGameId} />
                          ))}
                        </ul>
                      )}

                      {/* Potential — collapsible */}
                      {potentialKO.length > 0 && (
                        <details className="ko-details">
                          <summary className="ko-details-summary">Potential ({potentialKO.length})</summary>
                          <ul className="match-list ko-details-list">
                            {potentialKO.map(f => (
                              <PotentialMatchCard key={`${f.id}-${country}`} fixture={f} country={country} groupStandingsMap={groupStandingsMap} knockoutFixtures={knockoutFixtures} onInfo={setInfoCountry} />
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
          </>
        )}
      </main>

      <footer className="site-footer">
        <a href="/privacy.html" target="_blank" rel="noreferrer">Privacy Policy</a>
        {" · "}
        <a href="/terms.html" target="_blank" rel="noreferrer">Terms of Service</a>
      </footer>

{infoCountry && (
        <CountryModal
          country={infoCountry}
          scores={scores}
          allMatches={allMatches}
          knockoutFixtures={knockoutFixtures}
          onClose={() => setInfoCountry(null)}
        />
      )}
    </div>
  );
}
