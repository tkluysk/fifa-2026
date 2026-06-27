import { useEffect } from "react";
import type { GroupRow } from "../countryInfo";
import { COUNTRY_DATA, flag } from "../countryInfo";
import type { LiveScore } from "../hooks/useLiveData";
import { useCountryAnalysis } from "../hooks/useCountryAnalysis";
import { ALL_MATCHES } from "../matches";

interface Props {
  country: string;
  standings: GroupRow[] | null;
  scores: Record<string, LiveScore>;
  onClose: () => void;
}

export function CountryModal({ country, standings, scores, onClose }: Props) {
  const data = COUNTRY_DATA[country];
  const { data: analysis, loading, error, hasKey, fetchAnalysis } = useCountryAnalysis();

  // Fetch AI analysis on mount (if key is set)
  useEffect(() => {
    fetchAnalysis(country, standings, scores);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!data) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>✕</button>
          <p className="modal-no-data">No detailed data available for {country} yet.</p>
        </div>
      </div>
    );
  }

  const table = standings ?? data.groupTable;
  const myRow = table.find((r) => r.team === country);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Header */}
        <div className="modal-header">
          <span className="modal-flag">{flag(country)}</span>
          <div>
            <h2 className="modal-title">{country}</h2>
            <span className="modal-pos">
              Group {data.group} · {myRow ? `${myRow.pos}${ordinal(myRow.pos)} · ${myRow.pts} pts` : "—"}
            </span>
          </div>
        </div>

        {/* Group G standings */}
        <section className="modal-section">
          <h3>Group {data.group} Standings</h3>
          <table className="standings-table">
            <thead>
              <tr>
                <th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th>
                <th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {table.map((r) => (
                <tr key={r.team} className={r.team === country ? "standings-highlight" : ""}>
                  <td>{r.pos}</td>
                  <td>{flag(r.team)} {r.team}</td>
                  <td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td>
                  <td>{r.gf}</td><td>{r.ga}</td><td>{r.gf - r.ga > 0 ? "+" : ""}{r.gf - r.ga}</td>
                  <td><strong>{r.pts}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Results */}
        <section className="modal-section">
          <h3>Results</h3>
          <div className="results-list">
            {data.results.map((r, i) => {
              const matchId = ALL_MATCHES.find(
                (m) =>
                  m.home.toLowerCase() === r.home.toLowerCase() &&
                  m.away.toLowerCase() === r.away.toLowerCase()
              )?.id;
              const live = matchId ? scores[matchId] : undefined;
              const hs = live?.status !== "scheduled" ? (live?.home ?? r.homeScore) : r.homeScore;
              const as_ = live?.status !== "scheduled" ? (live?.away ?? r.awayScore) : r.awayScore;
              return (
                <div key={i} className="result-row">
                  <span className={`result-team${r.home === country ? " result-focus" : ""}`}>
                    {flag(r.home)} {r.home}
                  </span>
                  <span className="result-score">{hs} – {as_}</span>
                  <span className={`result-team${r.away === country ? " result-focus" : ""}`}>
                    {flag(r.away)} {r.away}
                  </span>
                  <span className="result-scorers">{r.scorers}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Next game */}
        {data.nextGame && (
          <section className="modal-section">
            <h3>Next Game</h3>
            <p className="next-game">{data.nextGame}</p>
          </section>
        )}

        {/* AI analysis or structured fallback */}
        <section className="modal-section modal-analysis">
          {!hasKey ? (
            <div className="analysis-fallback">
              <p className="analysis-key-hint">
                💡 Add <code>VITE_ANTHROPIC_API_KEY</code> to unlock AI-generated tournament analysis.
              </p>
            </div>
          ) : loading ? (
            <div className="analysis-loading">
              <span className="spinner" /> Generating analysis…
            </div>
          ) : error ? (
            <p className="analysis-error">⚠️ {error}</p>
          ) : analysis ? (
            <div className="analysis-content">
              <h3>Tournament Analysis</h3>
              <p className="analysis-summary">{analysis.summary}</p>

              <h4>Highlights</h4>
              <ul className="highlights-list">
                {analysis.highlights.map((h, i) => (
                  <li key={i} className={`highlight-${h.type}`}>
                    {h.type === "good" ? "✅" : h.type === "bad" ? "❌" : "⚪"} {h.text}
                  </li>
                ))}
              </ul>

              <h4>What They Need</h4>
              <p>{analysis.whatTheyNeed}</p>

              <h4>Prognosis</h4>
              <p className="analysis-prognosis">{analysis.prognosis}</p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
