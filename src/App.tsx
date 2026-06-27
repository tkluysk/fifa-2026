import { useState, useCallback } from "react";
import { ALL_COUNTRIES, matchesForCountries } from "./matches";
import { MatchCard } from "./components/MatchCard";
import { PotentialMatchCard } from "./components/PotentialMatchCard";
import { CalendarView } from "./components/CalendarView";
import { CountryPicker } from "./components/CountryPicker";
import { CountryModal } from "./components/CountryModal";
import { TournamentPath } from "./components/TournamentPath";
import { useLiveData } from "./hooks/useLiveData";
import { GROUP_G_POTENTIAL, COUNTRIES_WITH_POTENTIAL } from "./potentialMatches";
import { buildIcs, downloadIcs } from "./icsExport";
import "./App.css";

// Derive country list from live schedule once loaded; fall back to static list
function countriesFromMatches(matches: import("./matches").Match[]): string[] {
  if (!matches.length) return ALL_COUNTRIES;
  const set = new Set<string>();
  for (const m of matches) { set.add(m.home); set.add(m.away); }
  return Array.from(set).sort();
}

const DEFAULT_COUNTRIES = ["New Zealand", "Belgium"];

export default function App() {
  const [selected, setSelected] = useState<string[]>(DEFAULT_COUNTRIES);
  const [infoCountry, setInfoCountry] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "calendar">("list");
  const handleInfo = useCallback((c: string) => setInfoCountry(c), []);
  const { matches: allMatches, scores, loading: liveLoading, error: liveError } = useLiveData();

  const countries = countriesFromMatches(allMatches);
  const matches = matchesForCountries(allMatches, selected);

  // One set of placeholder cards per selected country that has knockout path data
  const potentialCountries = selected.filter((c) => COUNTRIES_WITH_POTENTIAL.has(c));

  function handleIcsDownload() {
    const ics = buildIcs(matches, potentialCountries, GROUP_G_POTENTIAL);
    downloadIcs("fifa-2026.ics", ics);
  }

  function toggle(country: string) {
    setSelected((prev) =>
      prev.includes(country) ? prev.filter((c) => c !== country) : [...prev, country]
    );
  }

  return (
    <div className="app">
      <header className="site-header">
        <h1>
          <span className="ball">⚽</span> FIFA World Cup 2026
        </h1>
        <p className="subtitle">
          Pick countries · see live scores · watch on TVNZ+
        </p>
        {liveError && <p className="live-status live-status--error">{liveError}</p>}
      </header>

      <CountryPicker
        countries={countries}
        selected={selected}
        onToggle={toggle}
        onInfo={setInfoCountry}
      />

      <TournamentPath countries={selected} />

      <div className="view-toggle">
        <button className={`view-btn${view === "list" ? " view-btn--active" : ""}`} onClick={() => setView("list")}>≡ List</button>
        <button className={`view-btn${view === "calendar" ? " view-btn--active" : ""}`} onClick={() => setView("calendar")}>📅 Calendar</button>
        <button className="view-btn view-btn--ics" onClick={handleIcsDownload} disabled={matches.length === 0} title="Download as .ics — import into Google Cal, Apple Cal or Outlook to replace all entries">
          ⬇ Export to Calendar
        </button>
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
            potentialCountries={potentialCountries}
            potentialMatches={GROUP_G_POTENTIAL}
            scores={scores}
            tracked={selected}
            onInfo={handleInfo}
          />
        ) : (
          <ul className="match-list">
            {(() => {
              const now = Date.now();
              // Find indices of the two soonest upcoming/not-yet-started matches
              const upcomingIndices = matches
                .map((m, i) => ({ i, t: new Date(m.startUtc).getTime() }))
                .filter(({ t }) => t > now)
                .sort((a, b) => a.t - b.t)
                .slice(0, 2)
                .map(({ i }) => i);
              const nextSet = new Set(upcomingIndices);
              return matches.map((m, i) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  tracked={selected}
                  score={scores[m.id]}
                  onInfo={setInfoCountry}
                  isNext={nextSet.has(i)}
                />
              ));
            })()}

            {potentialCountries.map((country) => (
              <li key={`potential-section-${country}`} className="potential-section">
                <ul className="match-list" style={{ listStyle: "none", padding: 0 }}>
                  <li className="potential-divider">
                    <span>Potential knockout games · {country}</span>
                  </li>
                  {GROUP_G_POTENTIAL.map((p) => (
                    <PotentialMatchCard
                      key={p.id}
                      potential={p}
                      country={country}
                    />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="site-footer">
        TVNZ holds exclusive NZ broadcast rights.{" "}
        <a href="https://www.tvnz.co.nz/passes" target="_blank" rel="noreferrer">
          TVNZ+ Event Pass
        </a>{" "}
        required for most matches. All Whites group games &amp; the Final are free on TVNZ 1.
      </footer>

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
