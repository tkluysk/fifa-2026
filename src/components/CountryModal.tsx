import { useEffect, useState } from "react";
import { flag } from "../countryInfo";
import type { LiveScore } from "../hooks/useLiveData";
import { useCountryAnalysis } from "../hooks/useCountryAnalysis";
import { useCountryData } from "../hooks/useCountryData";
import { PlayerCard } from "./PlayerCard";
import { PitchView } from "./PitchView";
import { Tip } from "./Tip";
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
  const [squadView, setSquadView] = useState<"pitch" | "cards" | "table">("pitch");

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

  // Sort by points desc, then GD desc, then GF desc
  const standings = cd?.groupStandings
    ? {
        ...cd.groupStandings,
        rows: [...cd.groupStandings.rows].sort((a, b) =>
          b.pts - a.pts || b.gd - a.gd || b.gf - a.gf
        ).map((r, i) => ({ ...r, pos: i + 1 })),
      }
    : null;
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
                  <Tip as="th" text="Position in the group">#</Tip>
                  <th style={{ textAlign: "left" }}>Team</th>
                  <Tip as="th" text="Games played so far">P</Tip>
                  <Tip as="th" text="Matches won — 3 points each">W</Tip>
                  <Tip as="th" text="Matches drawn — 1 point each">D</Tip>
                  <Tip as="th" text="Matches lost — 0 points">L</Tip>
                  <Tip as="th" text="Goals scored by this team">GF</Tip>
                  <Tip as="th" text="Goals conceded by this team">GA</Tip>
                  <Tip as="th" text="Goals scored minus goals conceded — used as tiebreaker">GD</Tip>
                  <Tip as="th" text="Total points — top 2 teams advance automatically">Pts</Tip>
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
                <button className={`squad-view-btn${squadView === "pitch" ? " squad-view-btn--active" : ""}`} onClick={() => setSquadView("pitch")}>⚽ Pitch</button>
                <button className={`squad-view-btn${squadView === "cards" ? " squad-view-btn--active" : ""}`} onClick={() => setSquadView("cards")}>Cards</button>
                <button className={`squad-view-btn${squadView === "table" ? " squad-view-btn--active" : ""}`} onClick={() => setSquadView("table")}>Table</button>
              </div>
            </div>

            {squadView === "pitch" ? (
              <PitchView roster={roster} accentColor={accent} />
            ) : squadView === "cards" ? (
              <div className="squad-grid">
                {roster.map((p) => (
                  <PlayerCard key={p.id} player={p} accentColor={accent} />
                ))}
              </div>
            ) : (
              <table className="squad-table">
                <thead>
                  <tr>
                    <Tip as="th" text="Jersey number">#</Tip>
                    <Tip as="th" text="Position — GK Goalkeeper · D Defender · M Midfielder · F Forward">Pos</Tip>
                    <th style={{ textAlign: "left" }}>Name</th>
                    <th style={{ textAlign: "left" }}>Club</th>
                    <Tip as="th" text="Player's age">Age</Tip>
                    <Tip as="th" text="Appearances in this tournament">Apps</Tip>
                    <Tip as="th" text="Goals scored in this tournament (outfield players)">G</Tip>
                    <Tip as="th" text="Goal assists in this tournament (outfield players)">A</Tip>
                    <Tip as="th" text="Saves made in this tournament (goalkeepers only)">Sv</Tip>
                    <Tip as="th" text="Goals conceded in this tournament (goalkeepers only)">GA</Tip>
                    <Tip as="th" text="Yellow cards received — two yellows = red card suspension">YC</Tip>
                    <Tip as="th" text="Red cards received — automatic one-match suspension">RC</Tip>
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
