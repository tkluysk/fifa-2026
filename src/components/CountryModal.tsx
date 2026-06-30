import { useEffect, useState } from "react";
import { flag } from "../countryInfo";
import type { LiveScore, KnockoutFixture } from "../hooks/useLiveData";
import type { Match } from "../matches";
import { useCountryAnalysis } from "../hooks/useCountryAnalysis";
import { useCountryData } from "../hooks/useCountryData";
import { useMatchLineup } from "../hooks/useMatchLineup";
import { PlayerCard } from "./PlayerCard";
import { PitchView } from "./PitchView";
import { Tip } from "./Tip";
import { countryColor } from "../countryInfo";

interface Props {
  country: string;
  scores: Record<string, LiveScore>;
  allMatches: Match[];
  knockoutFixtures: KnockoutFixture[];
  onClose: () => void;
}

const POS_ORDER: Record<string, number> = { G: 0, D: 1, M: 2, F: 3 };

export function CountryModal({ country, scores, allMatches, knockoutFixtures, onClose }: Props) {
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

  // Re-run AI analysis when standings finish loading OR when live scores change
  // for this country's matches. Stringify only relevant match scores as the dep key.
  const relevantScoreKey = allMatches
    .filter((m) => m.home === country || m.away === country)
    .map((m) => `${m.id}:${scores[m.id]?.home ?? ""}${scores[m.id]?.away ?? ""}${scores[m.id]?.status ?? ""}`)
    .join("|");

  useEffect(() => {
    if (cd && !cd.loading) {
      fetchAnalysis(country, cd.groupStandings, scores, undefined, allMatches);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, cd?.loading, relevantScoreKey]);

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

  // Split this country's matches into played and upcoming
  const countryMatches = allMatches.filter(
    (m) => m.home === country || m.away === country
  );
  const playedMatches = countryMatches.filter((m) => {
    const s = scores[m.id];
    return s && (s.status === "finished" || s.status === "in_progress");
  });
  const upcomingMatches = countryMatches.filter((m) => {
    const s = scores[m.id];
    return !s || s.status === "scheduled";
  });

  // Knockout fixtures involving this country (confirmed slot — real team name)
  const koCountryFixtures = knockoutFixtures.filter(
    f => f.home.toLowerCase() === country.toLowerCase() || f.away.toLowerCase() === country.toLowerCase()
  );
  const liveKoFixture = koCountryFixtures.find(f => f.score?.status === "in_progress");
  const lastFinishedKoFixture = [...koCountryFixtures]
    .filter(f => f.score?.status === "finished")
    .sort((a, b) => b.startUtc.localeCompare(a.startUtc))[0];

  // Group-stage lineup candidates
  const liveGroupMatch = countryMatches.find(m => scores[m.id]?.status === "in_progress");
  const lastFinishedGroup = [...playedMatches].sort((a, b) => b.startUtc.localeCompare(a.startUtc))[0];
  const nextScheduled = upcomingMatches[0];

  // Prefer: live KO > live group > last finished KO > last finished group > next group
  const lineupEventId: string | null =
    liveKoFixture?.id ?? liveGroupMatch?.id ?? lastFinishedKoFixture?.id ?? lastFinishedGroup?.id ?? nextScheduled?.id ?? null;
  const lineupIsLive = !!(liveKoFixture || liveGroupMatch);
  const lineupStatus: "in_progress" | "finished" | "scheduled" =
    (liveKoFixture || liveGroupMatch) ? "in_progress" :
    (lastFinishedKoFixture || lastFinishedGroup) ? "finished" : "scheduled";
  const lineupOpponent: string | null = liveKoFixture
    ? (liveKoFixture.home.toLowerCase() === country.toLowerCase() ? liveKoFixture.away : liveKoFixture.home)
    : liveGroupMatch
      ? (liveGroupMatch.home === country ? liveGroupMatch.away : liveGroupMatch.home)
      : lastFinishedKoFixture
        ? (lastFinishedKoFixture.home.toLowerCase() === country.toLowerCase() ? lastFinishedKoFixture.away : lastFinishedKoFixture.home)
        : lastFinishedGroup
          ? (lastFinishedGroup.home === country ? lastFinishedGroup.away : lastFinishedGroup.home)
          : nextScheduled
            ? (nextScheduled.home === country ? nextScheduled.away : nextScheduled.home)
            : null;

  // Keep legacy alias for the group-game label fallback (used below)
  const lineupMatch = !liveKoFixture && !lastFinishedKoFixture ? (liveGroupMatch ?? lastFinishedGroup ?? nextScheduled ?? null) : null;

  const { lineup } = useMatchLineup(lineupEventId, country, lineupIsLive);

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

        {/* Results + Upcoming */}
        {(() => {
          const koMatches = knockoutFixtures.filter(
            f => f.home === country || f.away === country
          );
          const koPlayed = koMatches.filter(f => f.score?.status === "finished" || f.score?.status === "in_progress");
          const koUpcoming = koMatches.filter(f => !f.score || f.score.status === "scheduled");
          const hasAnything = playedMatches.length > 0 || upcomingMatches.length > 0 || koPlayed.length > 0 || koUpcoming.length > 0;
          if (!hasAnything) return null;
          return (
            <section className="modal-section modal-results">
              {playedMatches.length > 0 && (
                <>
                  <h3>Group stage results</h3>
                  <div className="result-list-header">
                    <span>{country}</span>
                    <span>Opp</span>
                  </div>
                  <div className="result-list">
                    {playedMatches.map((m) => {
                      const s = scores[m.id]!;
                      const isHome = m.home === country;
                      const opponent = isHome ? m.away : m.home;
                      const goalsFor = isHome ? s.home : s.away;
                      const goalsAgainst = isHome ? s.away : s.home;
                      const outcome = goalsFor > goalsAgainst ? "W" : goalsFor < goalsAgainst ? "L" : "D";
                      return (
                        <div key={m.id} className={`result-row result-row--${outcome.toLowerCase()}`}>
                          <span className={`result-badge result-badge--${outcome.toLowerCase()}`}>{outcome}</span>
                          <span className="result-opponent">{flag(opponent)} {opponent}</span>
                          <span className="result-score">
                            <span className="result-score-us">{goalsFor}</span>
                            <span className="result-score-sep">–</span>
                            <span className="result-score-them">{goalsAgainst}</span>
                          </span>
                          {s.status === "in_progress" && <span className="live-badge" style={{fontSize:".65rem"}}>LIVE</span>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {upcomingMatches.length > 0 && (
                <>
                  <h3 style={{ marginTop: playedMatches.length > 0 ? 16 : 0 }}>Upcoming group games</h3>
                  <div className="result-list">
                    {upcomingMatches.map((m) => {
                      const opponent = m.home === country ? m.away : m.home;
                      const nzt = new Intl.DateTimeFormat("en-NZ", {
                        timeZone: "Pacific/Auckland",
                        weekday: "short", day: "numeric", month: "short",
                        hour: "numeric", minute: "2-digit", hour12: true,
                      }).format(new Date(m.startUtc));
                      return (
                        <div key={m.id} className="result-row result-row--upcoming">
                          <span className="result-badge result-badge--upcoming">vs</span>
                          <span className="result-opponent">{flag(opponent)} {opponent}</span>
                          <span className="result-date">{nzt} NZT</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {koPlayed.length > 0 && (
                <>
                  <h3 style={{ marginTop: 16 }}>Knockout results</h3>
                  <div className="result-list">
                    {koPlayed.map((f) => {
                      const s = f.score!;
                      const isHome = f.home === country;
                      const opponent = isHome ? f.away : f.home;
                      const goalsFor = isHome ? s.home : s.away;
                      const goalsAgainst = isHome ? s.away : s.home;
                      const outcome = goalsFor > goalsAgainst ? "W" : goalsFor < goalsAgainst ? "L" : "D";
                      return (
                        <div key={f.id} className={`result-row result-row--${outcome.toLowerCase()}`}>
                          <span className={`result-badge result-badge--${outcome.toLowerCase()}`}>{outcome}</span>
                          <span className="result-opponent">{flag(opponent)} {opponent}</span>
                          <span className="result-stage">{f.stage}</span>
                          <span className="result-score">
                            <span className="result-score-us">{goalsFor}</span>
                            <span className="result-score-sep">–</span>
                            <span className="result-score-them">{goalsAgainst}</span>
                          </span>
                          {s.status === "in_progress" && <span className="live-badge" style={{fontSize:".65rem"}}>LIVE</span>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {koUpcoming.length > 0 && (
                <>
                  <h3 style={{ marginTop: 16 }}>Upcoming knockout games</h3>
                  <div className="result-list">
                    {koUpcoming.map((f) => {
                      const opponent = f.home === country ? f.away : f.home;
                      const nzt = new Intl.DateTimeFormat("en-NZ", {
                        timeZone: "Pacific/Auckland",
                        weekday: "short", day: "numeric", month: "short",
                        hour: "numeric", minute: "2-digit", hour12: true,
                      }).format(new Date(f.startUtc));
                      return (
                        <div key={f.id} className="result-row result-row--upcoming">
                          <span className="result-badge result-badge--upcoming">vs</span>
                          <span className="result-opponent">{flag(opponent)} {opponent}</span>
                          <span className="result-stage">{f.stage}</span>
                          <span className="result-date">{nzt} NZT</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          );
        })()}

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
              <p className="ai-disclaimer">AI-generated — may contain inaccuracies. Based on data available at time of generation.</p>
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

            {squadView === "pitch" && lineupOpponent && lineup && (
              <p className="pitch-lineup-label">
                {lineupStatus === "in_progress" ? "🔴 Live lineup" :
                 lineupStatus === "finished" ? `Lineup vs ${lineupOpponent}` :
                 `Expected lineup vs ${lineupOpponent}`}
              </p>
            )}
            {squadView === "pitch" ? (
              <PitchView roster={roster} accentColor={accent} lineup={lineup} />
            ) : squadView === "cards" ? (
              <div className="squad-grid">
                {[...roster].sort((a, b) => parseInt(a.jersey) - parseInt(b.jersey)).map((p) => (
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
                    <Tip as="th" text="Shots attempted in this tournament (outfield players)">Sh</Tip>
                    <Tip as="th" text="Shots on target in this tournament (outfield players)">SoT</Tip>
                    <Tip as="th" text="Saves made in this tournament (goalkeepers only)">Sv</Tip>
                    <Tip as="th" text="Goals conceded in this tournament (goalkeepers only)">GA</Tip>
                    <Tip as="th" text="Yellow cards received — two yellows = red card suspension">🟨</Tip>
                    <Tip as="th" text="Red cards received — automatic one-match suspension">🟥</Tip>
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
                      <td>{p.positionAbbr !== "G" ? (p.shots ?? 0) : "—"}</td>
                      <td>{p.positionAbbr !== "G" ? (p.shotsOnTarget ?? 0) : "—"}</td>
                      <td>{p.positionAbbr === "G" ? (p.saves ?? 0) : "—"}</td>
                      <td>{p.positionAbbr === "G" ? (p.goalsConceded ?? 0) : "—"}</td>
                      <td className={p.yellowCards > 0 ? "squad-td-warn" : ""}>
                        {p.yellowCards > 0 ? `🟨×${p.yellowCards}` : "—"}
                      </td>
                      <td className={p.redCards > 0 ? "squad-td-danger" : ""}>
                        {p.redCards > 0 ? `🟥×${p.redCards}` : "—"}
                      </td>
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
