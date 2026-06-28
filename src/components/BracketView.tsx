/**
 * Road to Final bracket.
 * Focused mode: per-country flow row (R32→Final).
 * Full mode: proper tournament bracket with SVG connectors, matches
 *            vertically centred between their two feeders.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { KnockoutFixture, GroupStandingsMap } from "../hooks/useLiveData";
import { resolveSlot, knockoutPathForCountry } from "../hooks/useLiveData";
import { flag, countryColor } from "../countryInfo";
const TVNZ_BASE = "https://www.tvnz.co.nz";

function CandidateTooltip({ candidates, tracked }: { candidates: string[]; tracked?: string[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const reposition = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({
      top: r.top + window.scrollY - 8,
      left: r.left + window.scrollX + r.width / 2,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    reposition();
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    document.addEventListener("click", close);
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
      document.removeEventListener("click", close);
    };
  }, [open, reposition]);

  const label = candidates.slice(0, 3).map(c => flag(c)).join("") + (candidates.length > 3 ? ` +${candidates.length - 3}` : "");

  return (
    <>
      <span
        ref={triggerRef}
        className="bracket-cand-trigger"
        onMouseEnter={() => { reposition(); setOpen(true); }}
        onMouseLeave={() => setOpen(false)}
        onClick={e => { e.stopPropagation(); reposition(); setOpen(v => !v); }}
      >
        {label}
      </span>
      {open && createPortal(
        <div className="bracket-cand-popup" style={{ top: pos.top, left: pos.left }}>
          {candidates.map(c => (
            <div key={c} className={`bracket-cand-popup-row${tracked?.map(t => t.toLowerCase()).includes(c.toLowerCase()) ? " bracket-cand-popup-row--tracked" : ""}`}>
              {flag(c)} {c}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

interface Props {
  fixtures: KnockoutFixture[];
  tracked: string[];
  groupStandingsMap: GroupStandingsMap;
  countryGroups: Record<string, string>;
}

const STAGES = ["Round of 32", "Round of 16", "Quarter-final", "Semi-final", "Final"];

function isKnownTeam(name: string): boolean {
  return !/(group|round of|winner|place|runner|loser|quarterfinal|semifinal|third)/i.test(name);
}

function stageShort(stage: string): string {
  return (
    { "Round of 32": "R32", "Round of 16": "R16", "Quarter-final": "QF", "Semi-final": "SF", "Final": "Final" }
  )[stage] ?? stage;
}

function tvnzUrl(fixture: KnockoutFixture): string | null {
  return fixture.tvnzPath ? `${TVNZ_BASE}${fixture.tvnzPath}` : null;
}

// ── Card dimensions (px) ──────────────────────────────────────────────────
const CARD_W = 148;
const CARD_H = 72;
const COL_GAP = 28; // horizontal gap between columns

// ── Main export ───────────────────────────────────────────────────────────

export function BracketView({ fixtures, tracked, groupStandingsMap, countryGroups }: Props) {
  const [showFull, setShowFull] = useState(false);

  if (!fixtures.length || !tracked.length) return null;

  const paths = tracked
    .map(country => {
      const group = countryGroups[country] ?? "?";
      if (group === "?") return null;
      const path = knockoutPathForCountry(country, group, fixtures);
      if (!path.length) return null;
      return { country, path };
    })
    .filter((p): p is { country: string; path: KnockoutFixture[] } => p !== null);

  if (!paths.length && !showFull) return null;

  const byStage: Record<string, KnockoutFixture[]> = {};
  for (const f of fixtures) {
    if (!byStage[f.stage]) byStage[f.stage] = [];
    byStage[f.stage].push(f);
  }
  const trackedIds = new Set(paths.flatMap(p => p.path.map(f => f.id)));

  return (
    <div className="bracket-wrap">
      <div className="bracket-header">
        <p className="picker-label" style={{ margin: 0 }}>Road to the Final</p>
        <button className="bracket-toggle-btn" onClick={() => setShowFull(v => !v)}>
          {showFull ? "↙ My countries" : "⊞ Full bracket"}
        </button>
      </div>

      {showFull ? (
        <FullBracket byStage={byStage} trackedIds={trackedIds} tracked={tracked} gsMap={groupStandingsMap} />
      ) : (
        <FocusedBracket paths={paths} gsMap={groupStandingsMap} />
      )}
    </div>
  );
}

// ── Focused view ──────────────────────────────────────────────────────────

function FocusedBracket({ paths, gsMap }: {
  paths: { country: string; path: KnockoutFixture[] }[];
  gsMap: GroupStandingsMap;
}) {
  const stagesPresent = STAGES.filter(s => paths.some(p => p.path.some(f => f.stage === s)));

  return (
    <div className="bracket-scroll">
      <div className="bracket-focused">
        <div className="bracket-focused-headers" style={{ gridTemplateColumns: `90px repeat(${stagesPresent.length}, 1fr)` }}>
          <div />
          {stagesPresent.map(s => (
            <div key={s} className="bracket-col-header">{stageShort(s)}</div>
          ))}
        </div>

        {paths.map(({ country, path }) => {
          const { accent } = countryColor(country);
          return (
            <div key={country} className="bracket-focused-row" style={{ gridTemplateColumns: `90px repeat(${stagesPresent.length}, 1fr)` }}>
              <div className="bracket-country-label" style={{ borderLeftColor: accent }}>
                <span>{flag(country)}</span>
                <span className="bracket-country-name">{country}</span>
              </div>
              {stagesPresent.map((stage, colIdx) => {
                const fixture = path.find(f => f.stage === stage);
                const isLast = colIdx === stagesPresent.length - 1;
                return (
                  <div key={stage} className="bracket-flow-cell">
                    {fixture ? (
                      <FlowCard fixture={fixture} country={country} gsMap={gsMap} accent={accent} />
                    ) : (
                      <div className="bracket-flow-empty">?</div>
                    )}
                    {!isLast && <div className="bracket-flow-arrow">→</div>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FlowCard({ fixture, country, gsMap, accent }: {
  fixture: KnockoutFixture;
  country: string;
  gsMap: GroupStandingsMap;
  accent: string;
}) {
  const isHome = fixture.home.toLowerCase() === country.toLowerCase();
  const opponentSlot = isHome ? fixture.away : fixture.home;
  const known = isKnownTeam(opponentSlot);
  const candidates = known ? [] : resolveSlot(opponentSlot, gsMap);

  const finished = fixture.score?.status === "finished";
  const live = fixture.score?.status === "in_progress";
  const myScore = fixture.score ? (isHome ? fixture.score.home : fixture.score.away) : undefined;
  const theirScore = fixture.score ? (isHome ? fixture.score.away : fixture.score.home) : undefined;
  const won = finished && myScore !== undefined && theirScore !== undefined && myScore > theirScore;
  const lost = finished && myScore !== undefined && theirScore !== undefined && myScore < theirScore;

  const nzt = new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    day: "numeric", month: "short",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(fixture.startUtc));

  const tvnz = tvnzUrl(fixture);

  return (
    <div
      className={`bracket-flow-card${won ? " bracket-flow-card--won" : lost ? " bracket-flow-card--lost" : live ? " bracket-flow-card--live" : ""}`}
      style={{ borderColor: accent }}
    >
      {live && <div className="bracket-live-pip">LIVE</div>}
      {myScore !== undefined ? (
        <div className={`bracket-flow-score${won ? " bracket-flow-score--won" : lost ? " bracket-flow-score--lost" : ""}`}>
          {myScore}–{theirScore}
        </div>
      ) : (
        <div className="bracket-flow-date">{nzt}</div>
      )}
      <div className="bracket-flow-opp">
        {known ? (
          <><span>{flag(opponentSlot)}</span> <span>{opponentSlot}</span></>
        ) : candidates.length > 0 ? (
          <CandidateTooltip candidates={candidates} />
        ) : (
          <span className="bracket-flow-tbd">TBD</span>
        )}
      </div>
      {tvnz && <a className="bracket-flow-tvnz" href={tvnz} target="_blank" rel="noreferrer">📺</a>}
    </div>
  );
}

// ── Full bracket with geometric positioning + SVG connectors ──────────────

/**
 * Layout strategy:
 *   - 9 R32 matches. Slot spacing = CARD_H + vertical gap.
 *   - Each later round has 2× the slot spacing of the previous.
 *   - Each card is centred in its slot vertically.
 *   - SVG polylines connect the right edge of each feeder to the left
 *     edge of the next-round card it feeds into.
 */

const SLOT_GAP = 10;   // vertical gap between adjacent cards in R32
const SLOT_H = CARD_H + SLOT_GAP; // height of one R32 slot

// Number of R32 slots each stage card spans
const STAGE_SPAN: Record<string, number> = {
  "Round of 32": 1,
  "Round of 16": 2,
  "Quarter-final": 4,
  "Semi-final": 8,
  "Final": 16,
};

function cardTop(slotIndex: number, span: number): number {
  // Centre a card of CARD_H within span * SLOT_H
  const blockH = span * SLOT_H;
  return slotIndex * SLOT_H + (blockH - CARD_H) / 2;
}

// R32 slot assignments — matches appear in draw order (sorted by startUtc)
// Each subsequent round's match i occupies slot pairs from R32: match 0 → slots 0+1, match 1 → slots 2+3, etc.
function r32SlotStart(stageMatchIndex: number, span: number): number {
  return stageMatchIndex * span;
}

interface MatchLayout {
  fixture: KnockoutFixture;
  col: number;    // 0-based column index
  top: number;    // px from top of canvas
  left: number;   // px from left of canvas
}

interface ConnectorLine {
  x1: number; y1: number;
  x2: number; y2: number;
  mid: number; // x of mid-point for the bent connector
}

function buildLayout(byStage: Record<string, KnockoutFixture[]>, stages: string[]): {
  layouts: MatchLayout[];
  connectors: ConnectorLine[];
  totalW: number;
  totalH: number;
} {
  const layouts: MatchLayout[] = [];
  const connectors: ConnectorLine[] = [];
  const colCount = stages.length;
  const totalW = colCount * CARD_W + (colCount - 1) * COL_GAP;
  const totalH = 9 * SLOT_H;

  // Map stageMatchIndex → top for later stages to compute connectors
  const stageTops: Record<string, number[]> = {};

  stages.forEach((stage, colIdx) => {
    const stageFixtures = (byStage[stage] ?? []).slice(); // already sorted by startUtc
    const span = STAGE_SPAN[stage] ?? 1;
    const tops: number[] = [];

    stageFixtures.forEach((fixture, i) => {
      const slotStart = r32SlotStart(i, span);
      const top = cardTop(slotStart, span);
      const left = colIdx * (CARD_W + COL_GAP);
      tops.push(top);
      layouts.push({ fixture, col: colIdx, top, left });
    });

    stageTops[stage] = tops;

    // Draw connectors from previous stage into this one
    if (colIdx > 0) {
      const prevStage = stages[colIdx - 1];
      const prevTops = stageTops[prevStage] ?? [];
      const prevLeft = (colIdx - 1) * (CARD_W + COL_GAP);
      const curLeft = colIdx * (CARD_W + COL_GAP);

      // Each card in this stage receives 2 feeder cards from previous stage
      stageFixtures.forEach((_f, i) => {
        const feeder1Idx = i * 2;
        const feeder2Idx = i * 2 + 1;
        const curTop = tops[i];
        if (curTop === undefined) return;

        const curMidY = curTop + CARD_H / 2;
        const midX = prevLeft + CARD_W + COL_GAP / 2;

        [feeder1Idx, feeder2Idx].forEach(fi => {
          const feederTop = prevTops[fi];
          if (feederTop === undefined) return;
          const feederMidY = feederTop + CARD_H / 2;
          // elbow: right edge of feeder → midX at feeder Y → midX at cur Y → left edge of cur
          connectors.push({ x1: prevLeft + CARD_W, y1: feederMidY, x2: curLeft, y2: curMidY, mid: midX });
        });
      });
    }
  });

  return { layouts, connectors, totalW, totalH };
}

function FullBracket({ byStage, trackedIds, tracked, gsMap }: {
  byStage: Record<string, KnockoutFixture[]>;
  trackedIds: Set<string>;
  tracked: string[];
  gsMap: GroupStandingsMap;
}) {
  const stages = STAGES.filter(s => byStage[s]?.length);
  const { layouts, connectors, totalW, totalH } = buildLayout(byStage, stages);

  // Column headers: evenly spaced
  const colW = CARD_W;

  return (
    <div className="bracket-scroll">
      {/* Column headers */}
      <div style={{ display: "flex", gap: 0, marginBottom: 6, minWidth: totalW }}>
        {stages.map((stage, i) => (
          <div
            key={stage}
            className="bracket-col-header"
            style={{ width: colW, marginLeft: i > 0 ? COL_GAP : 0, flexShrink: 0 }}
          >
            {stageShort(stage)}
          </div>
        ))}
      </div>

      {/* Canvas with absolute-positioned cards + SVG connectors */}
      <div style={{ position: "relative", width: totalW, height: totalH, minWidth: totalW }}>
        {/* SVG connector lines */}
        <svg
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", overflow: "visible" }}
          width={totalW}
          height={totalH}
        >
          {connectors.map((c, i) => {
            const path = `M ${c.x1} ${c.y1} L ${c.mid} ${c.y1} L ${c.mid} ${c.y2} L ${c.x2} ${c.y2}`;
            return <path key={i} d={path} fill="none" stroke="var(--border)" strokeWidth={1.5} />;
          })}
        </svg>

        {/* Match cards */}
        {layouts.map(({ fixture, top, left }) => {
          const highlighted = trackedIds.has(fixture.id);
          const trackedCountry = tracked.find(c => {
            const cl = c.toLowerCase();
            if (fixture.home.toLowerCase() === cl || fixture.away.toLowerCase() === cl) return true;
            const hc = resolveSlot(fixture.home, gsMap).map(x => x.toLowerCase());
            const ac = resolveSlot(fixture.away, gsMap).map(x => x.toLowerCase());
            return hc.includes(cl) || ac.includes(cl);
          });
          const accent = trackedCountry ? countryColor(trackedCountry).accent : undefined;

          return (
            <div
              key={fixture.id}
              style={{ position: "absolute", top, left, width: CARD_W, height: CARD_H }}
            >
              <FullCard fixture={fixture} highlighted={highlighted} accent={accent} gsMap={gsMap} tracked={tracked} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FullCard({ fixture, highlighted, accent, gsMap, tracked }: {
  fixture: KnockoutFixture;
  highlighted: boolean;
  accent?: string;
  gsMap: GroupStandingsMap;
  tracked: string[];
}) {
  const finished = fixture.score?.status === "finished";
  const live = fixture.score?.status === "in_progress";
  const homeWon = finished && (fixture.score!.home > fixture.score!.away);
  const awayWon = finished && (fixture.score!.away > fixture.score!.home);
  const tvnz = tvnzUrl(fixture);

  const nzt = new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    day: "numeric", month: "short",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(fixture.startUtc));

  return (
    <div
      className={`bracket-full-card${highlighted ? " bracket-full-card--highlighted" : ""}`}
      style={{
        width: "100%", height: "100%",
        ...(highlighted && accent ? { borderLeftColor: accent } : {}),
      }}
    >
      {live && <div className="bracket-live-pip">LIVE</div>}
      <FullTeamRow name={fixture.home} score={fixture.score?.home} won={homeWon} lost={finished && !homeWon} gsMap={gsMap} tracked={tracked} />
      <div className="bracket-divider" />
      <FullTeamRow name={fixture.away} score={fixture.score?.away} won={awayWon} lost={finished && !awayWon} gsMap={gsMap} tracked={tracked} />
      <div className="bracket-full-footer">
        <span className="bracket-full-date">{nzt}</span>
        {tvnz && <a className="bracket-flow-tvnz" href={tvnz} target="_blank" rel="noreferrer">📺</a>}
      </div>
    </div>
  );
}

function FullTeamRow({ name, score, won, lost, gsMap, tracked }: {
  name: string; score?: number; won: boolean; lost: boolean; gsMap: GroupStandingsMap; tracked: string[];
}) {
  const known = isKnownTeam(name);
  const candidates = known ? [] : resolveSlot(name, gsMap);
  const isTracked = tracked.some(c => c.toLowerCase() === name.toLowerCase());
  const trackedCand = candidates.find(c => tracked.map(t => t.toLowerCase()).includes(c.toLowerCase()));

  return (
    <div className={`bracket-full-team${isTracked || trackedCand ? " bracket-full-team--tracked" : ""}${won ? " bracket-full-team--won" : lost ? " bracket-full-team--lost" : ""}`}>
      <span className="bracket-full-team-name">
        {known
          ? <><span>{flag(name)}</span> <span className={isTracked ? "bracket-name-bold" : ""}>{name}</span></>
          : candidates.length > 0
            ? <CandidateTooltip candidates={candidates} tracked={tracked} />
            : <span className="bracket-tbd">
                {name.replace(/Round of (32|16) /i, 'R$1 ').replace(/Quarterfinal /i, 'QF ').replace(/Semifinal /i, 'SF ')}
              </span>
        }
      </span>
      {score !== undefined && (
        <span className={`bracket-score${won ? " bracket-score--won" : lost ? " bracket-score--lost" : ""}`}>{score}</span>
      )}
    </div>
  );
}
