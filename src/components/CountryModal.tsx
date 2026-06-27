import { useEffect, useState } from "react";
import { flag } from "../countryInfo";
import type { LiveScore } from "../hooks/useLiveData";
import { useCountryAnalysis } from "../hooks/useCountryAnalysis";
import { useCountryData } from "../hooks/useCountryData";
import { PlayerCard } from "./PlayerCard";
import { countryColor } from "../countryInfo";

interface Props {
  country: string;
  scores: Record<string, LiveScore>;
  onClose: () => void;
}

const POS_ORDER: Record<string, number> = { G: 0, D: 1, M: 2, F: 3 };

export function CountryModal({ country, scores, onClose }: Props) {
  const { data: countryMap, fetch: fetchCountryData } = useCountryData();
  const { data: analysis, loading: analysisLoading, error: analysisError, hasKey, fetchAnalysis } = useCountryAnalysis();
  const [squadView, setSquadView] = useState<"cards" | "table">("cards");

  const cd = countryMap[country];
  const accent = countryColor(country).accent;

  // Load country data on mount
  useEffect(() => {
    fetchCountryData(country);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);

  // Run AI analysis once standings are loaded
  useEffect(() => {
    if (cd && !cd.loading) {
      fetchAnalysis(country, cd.groupStandings, scores);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, cd?.loading]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const standings = cd?.groupStandings;
  const myRow = standings?.rows.find(
    (r) => r.team === country || (country === "IR Iran" && r.team === "Iran")
  );

  // Sort roster: GK → DEF → MID → FWD, then by jersey number
  const roster = [...(cd?.roster ?? [])].sort((a, b) => {
    const pa = POS_ORDER[a.positionAbbr] ?? 9;
    const pb = POS_ORDER[b.positionAbbr] ?? 9;
    if (pa !== pb) return pa - pb;
    return parseInt(a.jersey) - parseInt(b.jersey);
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Header */}
        <div className="modal-header">
          <span className="modal-flag">{flag(country)}</span>
          <div>
            <h2 className="modal-title">{country}</h2>
            {myRow && (
              <span className="modal-pos">
                {standings?.groupName} · {myRow.pos}{ordinal(myRow.pos)} · {myRow.pts} pts
                {myRow.advanced && <span className="advanced-badge">✓ Advanced</span>}
              </span>
            )}
          </div>
        </div>

        {/* Standings */}
        {cd?.loading ? (
          <div className="analysis-loading" style={{ padding: "20px 0" }}>
            <span className="spinner" /> Loading data…
          </div>
        ) : standings ? (
          <section className="modal-section">
            <h3>{standings.groupName} Standings</h3>
            <table className="standings-table">
              <thead>
                <tr>
                  <th title="Position">#</th>
                  <th>Team</th>
                  <th title="Played">P</th>
                  <th title="Won">W</th>
                  <th title="Drawn">D</th>
                  <th title="Lost">L</th>
                  <th title="Goals For">GF</th>
                  <th title="Goals Against">GA</th>
                  <th title="Goal Difference">GD</th>
                  <th title="Points">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.rows.map((r) => (
                  <tr key={r.team} className={r.team === country || (country === "IR Iran" && r.team === "IR Iran") ? "standings-highlight" : ""}>
                    <td>{r.pos}</td>
                    <td>
                      {r.logoUrl
                        ? <img src={r.logoUrl} alt={r.team} className="standings-flag-img" />
                        : flag(r.team)
                      } {r.team}
                    </td>
                    <td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td>
                    <td>{r.gf}</td><td>{r.ga}</td>
                    <td>{r.gd > 0 ? "+" : ""}{r.gd}</td>
                    <td><strong>{r.pts}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : cd?.error ? (
          <p className="analysis-error" style={{ marginTop: 16 }}>Failed to load standings.</p>
        ) : null}

        {/* AI Analysis */}
        <section className="modal-section modal-analysis">
          <h3>Tournament Analysis</h3>
          {!hasKey ? (
            <div className="analysis-fallback">
              <p className="analysis-key-hint">
                💡 Add <code>VITE_ANTHROPIC_API_KEY</code> to unlock AI-generated tournament analysis.
              </p>
            </div>
          ) : cd?.loading || analysisLoading ? (
            <div className="analysis-loading"><span className="spinner" /> Generating analysis…</div>
          ) : analysisError ? (
            <p className="analysis-error">⚠️ {analysisError}</p>
          ) : analysis ? (
            <div className="analysis-content">
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

        {/* Squad */}
        {roster.length > 0 && (
          <section className="modal-section">
            <div className="squad-header">
              <h3>Squad ({roster.length})</h3>
              <div className="squad-view-toggle">
                <button
                  className={`squad-view-btn${squadView === "cards" ? " squad-view-btn--active" : ""}`}
                  onClick={() => setSquadView("cards")}
                >Cards</button>
                <button
                  className={`squad-view-btn${squadView === "table" ? " squad-view-btn--active" : ""}`}
                  onClick={() => setSquadView("table")}
                >Table</button>
              </div>
            </div>

            {squadView === "cards" ? (
              <div className="squad-grid">
                {roster.map((p) => (
                  <PlayerCard key={p.id} player={p} accentColor={accent} />
                ))}
              </div>
            ) : (
              <table className="squad-table">
                <thead>
                  <tr>
                    <th title="Jersey">#</th>
                    <th title="Position">Pos</th>
                    <th style={{ textAlign: "left" }}>Name</th>
                    <th title="Club">Club</th>
                    <th title="Age">Age</th>
                    <th title="Appearances">Apps</th>
                    <th title="Goals">G</th>
                    <th title="Assists">A</th>
                    <th title="Saves (GK)">Sv</th>
                    <th title="Goals Against (GK)">GA</th>
                    <th title="Yellow Cards">YC</th>
                    <th title="Red Cards">RC</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((p) => (
                    <tr key={p.id} className={p.status === "out" ? "squad-row--out" : ""}>
                      <td className="squad-td-jersey">{p.jersey}</td>
                      <td className="squad-td-pos" title={p.position}>{p.positionAbbr}</td>
                      <td className="squad-td-name">
                        {p.name}
                        {p.status === "injured" && <span title={p.injuryNote}> 🤕</span>}
                        {p.status === "suspended" && <span title="Suspended"> 🟥</span>}
                        {p.status === "out" && <span title={p.injuryNote || "Out"}> ❌</span>}
                      </td>
                      <td className="squad-td-club">{p.clubTeam}</td>
                      <td>{p.age || "—"}</td>
                      <td>{p.apps}</td>
                      <td>{p.positionAbbr !== "G" ? p.goals : "—"}</td>
                      <td>{p.positionAbbr !== "G" ? p.assists : "—"}</td>
                      <td>{p.positionAbbr === "G" ? (p.saves ?? 0) : "—"}</td>
                      <td>{p.positionAbbr === "G" ? (p.goalsConceded ?? 0) : "—"}</td>
                      <td className={p.yellowCards > 0 ? "squad-td-warn" : ""}>{p.yellowCards || "—"}</td>
                      <td className={p.redCards > 0 ? "squad-td-danger" : ""}>{p.redCards || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
