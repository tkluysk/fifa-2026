import type { Player } from "../hooks/useCountryData";
import { PlayerCard } from "./PlayerCard";

interface Props {
  roster: Player[];
  accentColor: string;
}

// Group players into rows based on position, ordered GK → DEF → MID → FWD
// Then bench = subs who didn't start (apps === 0 or SUB > 0) — we approximate
function groupByLine(roster: Player[]): {
  gk: Player[];
  def: Player[];
  mid: Player[];
  fwd: Player[];
  bench: Player[];
} {
  const started = (p: Player) => p.apps > 0;

  // Split into starters (by apps) and bench
  // Heuristic: pick the most-used per position as likely starters
  const byPos: Record<string, Player[]> = { G: [], D: [], M: [], F: [] };
  for (const p of roster) {
    const pos = p.positionAbbr in byPos ? p.positionAbbr : "M";
    byPos[pos].push(p);
  }

  // Sort each position group by appearances desc
  for (const g of Object.values(byPos)) {
    g.sort((a, b) => b.apps - a.apps || parseInt(a.jersey) - parseInt(b.jersey));
  }

  const gk = byPos.G.slice(0, 1);
  const def = byPos.D.slice(0, 4);
  const mid = byPos.M.slice(0, 4);
  const fwd = byPos.F.slice(0, 3);

  const startingIds = new Set([...gk, ...def, ...mid, ...fwd].map((p) => p.id));
  const bench = roster.filter((p) => !startingIds.has(p.id) && started(p)).concat(
    roster.filter((p) => !startingIds.has(p.id) && !started(p))
  );

  return { gk, def, mid, fwd, bench };
}

export function PitchView({ roster, accentColor }: Props) {
  const { gk, def, mid, fwd, bench } = groupByLine(roster);

  return (
    <div className="pitch-wrap">
      <div className="pitch-field">
        {/* Pitch markings */}
        <div className="pitch-centre-circle" />
        <div className="pitch-halfway" />
        <div className="pitch-penalty-top" />
        <div className="pitch-penalty-bot" />

        {/* Player rows — bottom to top: GK, DEF, MID, FWD */}
        <div className="pitch-row pitch-row--gk">
          {gk.map((p) => <PlayerCard key={p.id} player={p} accentColor={accentColor} compact />)}
        </div>
        <div className="pitch-row pitch-row--def">
          {def.map((p) => <PlayerCard key={p.id} player={p} accentColor={accentColor} compact />)}
        </div>
        <div className="pitch-row pitch-row--mid">
          {mid.map((p) => <PlayerCard key={p.id} player={p} accentColor={accentColor} compact />)}
        </div>
        <div className="pitch-row pitch-row--fwd">
          {fwd.map((p) => <PlayerCard key={p.id} player={p} accentColor={accentColor} compact />)}
        </div>
      </div>

      {/* Bench */}
      {bench.length > 0 && (
        <div className="pitch-bench">
          <span className="pitch-bench-label">Bench</span>
          <div className="pitch-bench-players">
            {bench.map((p) => <PlayerCard key={p.id} player={p} accentColor={accentColor} compact />)}
          </div>
        </div>
      )}
    </div>
  );
}
