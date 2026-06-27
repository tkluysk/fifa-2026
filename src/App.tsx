import { useState } from "react";
import { ALL_COUNTRIES, matchesForCountries } from "./matches";
import { MatchCard } from "./components/MatchCard";
import { CountryPicker } from "./components/CountryPicker";
import { CountryModal } from "./components/CountryModal";
import { TournamentPath } from "./components/TournamentPath";
import { useLiveData } from "./hooks/useLiveData";
import "./App.css";

const DEFAULT_COUNTRIES = ["New Zealand", "Belgium"];

export default function App() {
  const [selected, setSelected] = useState<string[]>(DEFAULT_COUNTRIES);
  const [infoCountry, setInfoCountry] = useState<string | null>(null);
  const { scores, standings, loading: liveLoading, error: liveError } = useLiveData();

  const matches = matchesForCountries(selected);

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

      <main className="main">
        {selected.length === 0 ? (
          <p className="empty">Select at least one country above.</p>
        ) : matches.length === 0 ? (
          <p className="empty">No group-stage matches found for the selected countries.</p>
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
