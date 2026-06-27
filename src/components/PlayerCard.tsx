import { useState, useEffect } from "react";
import type { Player } from "../hooks/useCountryData";
import { useCountryAnalysis } from "../hooks/useCountryAnalysis";

interface Props {
  player: Player;
  accentColor: string;
}

const POS_COLORS: Record<string, string> = {
  G: "#f59e0b",
  D: "#3b82f6",
  M: "#22c55e",
  F: "#ef4444",
};

export function PlayerCard({ player, accentColor }: Props) {
  const [showBio, setShowBio] = useState(false);
  const posColor = POS_COLORS[player.positionAbbr] ?? "#86a98e";

  return (
    <div className={`player-card${player.status === "out" ? " player-card--out" : ""}`}>
      {/* Jersey avatar */}
      <div className="player-avatar" style={{ borderColor: posColor }}>
        <span className="player-jersey" style={{ color: posColor }}>{player.jersey}</span>
        <span className="player-pos-abbr" style={{ color: posColor }}>{player.positionAbbr}</span>
      </div>

      <div className="player-info">
        <div className="player-name-row">
          <span className="player-name">{player.name}</span>
          <button
            className="info-btn player-info-btn"
            aria-label={`AI profile for ${player.name}`}
            onClick={() => setShowBio((v) => !v)}
          />
          {player.status === "injured" && <span className="player-badge player-badge--injury" title={player.injuryNote}>🤕</span>}
          {player.status === "suspended" && <span className="player-badge player-badge--suspended" title="Suspended">🟥</span>}
          {player.status === "out" && <span className="player-badge player-badge--out" title={player.injuryNote || "Out"}>❌</span>}
        </div>

        <div className="player-meta">
          {player.clubTeam && <span className="player-club">{player.clubTeam}</span>}
          {player.age > 0 && <span className="player-age">age {player.age}</span>}
        </div>

        <div className="player-stats">
          <Stat label="Apps" value={player.apps} tooltip="Appearances" />
          {player.positionAbbr === "G" ? (
            <>
              <Stat label="Saves" value={player.saves ?? 0} tooltip="Saves" />
              <Stat label="GA" value={player.goalsConceded ?? 0} tooltip="Goals Against" />
            </>
          ) : (
            <>
              <Stat label="G" value={player.goals} tooltip="Goals" />
              <Stat label="A" value={player.assists} tooltip="Assists" />
            </>
          )}
          {player.yellowCards > 0 && <Stat label="YC" value={player.yellowCards} tooltip="Yellow Cards" warn />}
          {player.redCards > 0 && <Stat label="RC" value={player.redCards} tooltip="Red Cards" danger />}
        </div>

        {showBio && (
          <PlayerBio player={player} accentColor={accentColor} onClose={() => setShowBio(false)} />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tooltip, warn, danger }: { label: string; value: number; tooltip?: string; warn?: boolean; danger?: boolean }) {
  return (
    <span
      className={`pstat${warn ? " pstat--warn" : ""}${danger ? " pstat--danger" : ""}`}
      title={tooltip ?? label}
      style={{ cursor: "help" }}
    >
      <span className="pstat-val">{value}</span>
      <span className="pstat-label">{label}</span>
    </span>
  );
}

function PlayerBio({ player, onClose }: { player: Player; accentColor: string; onClose: () => void }) {
  const { data: analysis, loading, error, hasKey, fetchAnalysis } = useCountryAnalysis();

  useEffect(() => {
    if (hasKey) {
      fetchAnalysis(
        player.name,
        null,
        {},
        `Generate a brief player profile for ${player.name} (${player.position}, ${player.nationality || "unknown nationality"}, age ${player.age}, club: ${player.clubTeam || "unknown"}). Focus on: their career highlights, how they got to this World Cup, their role in the national team, and what to watch for. Keep it to 3-4 sentences, punchy and insightful.`
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.id]);

  return (
    <div className="player-bio">
      <button className="player-bio-close" onClick={onClose}>✕</button>
      {!hasKey ? (
        <p className="player-bio-hint">Add <code>VITE_ANTHROPIC_API_KEY</code> for AI player profiles.</p>
      ) : loading ? (
        <div className="analysis-loading"><span className="spinner" /> Generating profile…</div>
      ) : error ? (
        <p className="analysis-error">⚠️ {error}</p>
      ) : analysis ? (
        <p className="player-bio-text">{analysis.summary}</p>
      ) : null}
    </div>
  );
}
