import type { Player } from "../hooks/useCountryData";
import type { LineupEntry, MatchLineup } from "../hooks/useMatchLineup";
import { PlayerCard } from "./PlayerCard";

interface Props {
  roster: Player[];
  accentColor: string;
  lineup?: MatchLineup | null;
}

// Collapse ESPN's detailed position abbreviations into G/D/M/F
function lineGroup(pos: string): "G" | "D" | "M" | "F" {
  const p = pos.toUpperCase();
  if (p === "G" || p === "GK") return "G";
  // Forwards: CF (centre forward), ST (striker), SS, WF, LF, RF, FW
  if (p.startsWith("CF") || p.startsWith("ST") || p.startsWith("SS") || p.startsWith("WF") ||
      p.startsWith("LF") || p.startsWith("RF") || p === "FW" || p.startsWith("F-")) return "F";
  // Defenders: CD (centre-back), LB, RB, WB, SW, D-
  if (p.startsWith("CD") || p.startsWith("LB") || p.startsWith("RB") || p.startsWith("WB") ||
      p.startsWith("SW") || p === "D" || p.startsWith("D-")) return "D";
  return "M";
}

function stubPlayer(entry: LineupEntry): Player {
  return {
    id: entry.athleteId,
    name: entry.name,
    shortName: entry.name,
    jersey: entry.jersey,
    position: entry.positionAbbr,
    positionAbbr: lineGroup(entry.positionAbbr),
    age: 0, nationality: "", clubTeam: "",
    status: "active", injuryNote: "",
    apps: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0,
  };
}

function groupByLineup(roster: Player[], lineup: MatchLineup): {
  gk: Player[]; def: Player[]; mid: Player[]; fwd: Player[]; bench: Player[];
} {
  const byId = new Map(roster.map(p => [p.id, p]));
  const subs: Player[] = [];
  const starterGroups: Record<"G" | "D" | "M" | "F", Player[]> = { G: [], D: [], M: [], F: [] };

  for (const entry of lineup.players) {
    const player = byId.get(entry.athleteId) ?? stubPlayer(entry);
    if (entry.starter) {
      starterGroups[lineGroup(entry.positionAbbr)].push(player);
    } else {
      subs.push(player);
    }
  }

  // Players in roster but not in lineup go to bench
  const lineupIds = new Set(lineup.players.map(e => e.athleteId));
  const unlisted = roster.filter(p => !lineupIds.has(p.id));

  return {
    gk: starterGroups.G,
    def: starterGroups.D,
    mid: starterGroups.M,
    fwd: starterGroups.F,
    bench: [...subs, ...unlisted],
  };
}

function groupByHeuristic(roster: Player[]): {
  gk: Player[]; def: Player[]; mid: Player[]; fwd: Player[]; bench: Player[];
} {
  const started = (p: Player) => p.apps > 0;
  const byPos: Record<string, Player[]> = { G: [], D: [], M: [], F: [] };
  for (const p of roster) {
    const pos = p.positionAbbr in byPos ? p.positionAbbr : "M";
    byPos[pos].push(p);
  }
  for (const g of Object.values(byPos)) {
    g.sort((a, b) => b.apps - a.apps || parseInt(a.jersey) - parseInt(b.jersey));
  }
  const gk = byPos.G.slice(0, 1);
  const def = byPos.D.slice(0, 4);
  const mid = byPos.M.slice(0, 4);
  const fwd = byPos.F.slice(0, 3);
  const startingIds = new Set([...gk, ...def, ...mid, ...fwd].map(p => p.id));
  const bench = roster.filter(p => !startingIds.has(p.id) && started(p)).concat(
    roster.filter(p => !startingIds.has(p.id) && !started(p))
  );
  return { gk, def, mid, fwd, bench };
}

export function PitchView({ roster, accentColor, lineup }: Props) {
  const { gk, def, mid, fwd, bench } = lineup?.players.length
    ? groupByLineup(roster, lineup)
    : groupByHeuristic(roster);

  return (
    <div className="pitch-wrap">
      {lineup?.formation && (
        <div className="pitch-formation-label">{lineup.formation}</div>
      )}
      <div className="pitch-field">
        <div className="pitch-centre-circle" />
        <div className="pitch-halfway" />
        <div className="pitch-penalty-top" />
        <div className="pitch-penalty-bot" />

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
