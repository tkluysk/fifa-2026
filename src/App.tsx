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

const DEFAULT_COUNTRIES = ["New Zealand", "Belgium"];

export default function App() {
  const [selected, setSelected] = useState<string[]>(DEFAULT_COUNTRIES);
  const [infoCountry, setInfoCountry] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "calendar">("list");
  const handleInfo = useCallback((c: string) => setInfoCountry(c), []);
  const { scores, standings, loading: liveLoading, error: liveError } = useLiveData();

  const matches = matchesForCountries(selected);

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
        {liveLoading && <p className="live-status">Fetching live scores…</p>}
        {liveError && <p className="live-status live-status--error">{liveError}</p>}
      </header>

      <CountryPicker
        countries={ALL_COUNTRIES}
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
            {matches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                tracked={selected}
                score={scores[m.id]}
                onInfo={setInfoCountry}
              />
            ))}

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
          standings={standings}
          scores={scores}
          onClose={() => setInfoCountry(null)}
        />
      )}
    </div>
  );
}
