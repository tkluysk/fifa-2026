/**
 * Road to Final bracket.
 * Focused mode: per-country flow row (R32→Final).
 * Full mode: proper tournament bracket with SVG connectors, matches
 *            vertically centred between their two feeders.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { KnockoutFixture, GroupStandingsMap } from "../hooks/useLiveData";
import { upstreamTeams, knockoutPathForCountry } from "../hooks/useLiveData";
import { flag, countryColor } from "../countryInfo"; // countryColor used in FocusedBracket
import { isNewZealand } from "../dateUtils";

function bracketDate(iso: string): string {
  const d = new Date(iso);
  const gameDay = d.toLocaleDateString("sv-SE");
  const todayDay = new Date().toLocaleDateString("sv-SE");
  const tomorrowDay = new Date(Date.now() + 864e5).toLocaleDateString("sv-SE");
  const mins = d.getMinutes();
  const timeStr = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    ...(mins !== 0 ? { minute: "2-digit" } : {}),
    hour12: true,
  }).format(d);
  if (gameDay === todayDay) return `Today, ${timeStr}`;
  if (gameDay === tomorrowDay) return `Tomorrow, ${timeStr}`;
  const datePart = new Intl.DateTimeFormat(undefined, {
    weekday: "short", day: "numeric", month: "short",
  }).format(d);
  return `${datePart}, ${timeStr}`;
}
const TVNZ_BASE = "https://www.tvnz.co.nz";

function CalIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1" y="2.5" width="12" height="10.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="1" y1="5.5" x2="13" y2="5.5" stroke="currentColor" strokeWidth="1.1"/>
      <line x1="4" y1="1" x2="4" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="10" y1="1" x2="10" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="7" y1="8" x2="7" y2="11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="5.5" y1="9.5" x2="8.5" y2="9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

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

  const label = candidates.length > 4 ? "?" : candidates.map(c => flag(c)).join("");

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
  nextGameId?: string | null;
}

const STAGES = ["Round of 32", "Round of 16", "Quarter-final", "Semi-final", "Final", "3rd Place"];

function isKnownTeam(name: string): boolean {
  return !/(group|round of|winner|place|runner|loser|quarterfinal|semifinal|third)/i.test(name);
}

function stageShort(stage: string): string {
  return (
    { "Round of 32": "R32", "Round of 16": "R16", "Quarter-final": "QF", "Semi-final": "SF", "Final": "Final", "3rd Place": "3rd" }
  )[stage] ?? stage;
}

function tvnzUrl(fixture: KnockoutFixture): string | null {
  return fixture.tvnzPath ? `${TVNZ_BASE}${fixture.tvnzPath}` : null;
}

function gcalUrl(f: KnockoutFixture): string {
  const start = f.startUtc.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const endDate = new Date(new Date(f.startUtc).getTime() + 2 * 60 * 60 * 1000);
  const end = endDate.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `⚽ ${f.stage} — FIFA World Cup 2026`,
    dates: `${start}/${end}`,
    location: f.venue,
    details: `${f.home} vs ${f.away}\nFIFA World Cup 2026`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function scrollToMatch(id: string) {
  const el = document.getElementById(`match-${id}`);
  if (!el) return;
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    if (node.tagName === "DETAILS") (node as HTMLDetailsElement).open = true;
    node = node.parentElement;
  }
  setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
}

// ── Card dimensions (px) ──────────────────────────────────────────────────
const CARD_W = 148;
const CARD_H = 72;
const COL_GAP = 28; // horizontal gap between columns

// ── Main export ───────────────────────────────────────────────────────────

export function BracketView({ fixtures, tracked, groupStandingsMap, countryGroups, showFull = false, nextGameId = null }: Props & { showFull?: boolean }) {
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
      {showFull ? (
        <FullBracket byStage={byStage} trackedIds={trackedIds} tracked={tracked} gsMap={groupStandingsMap} knockoutFixtures={fixtures} nextGameId={nextGameId} />
      ) : (
        <FocusedBracket paths={paths} gsMap={groupStandingsMap} knockoutFixtures={fixtures} nextGameId={nextGameId} />
      )}
    </div>
  );
}

// ── Focused view ──────────────────────────────────────────────────────────

function FocusedBracket({ paths, gsMap, knockoutFixtures, nextGameId }: {
  paths: { country: string; path: KnockoutFixture[] }[];
  gsMap: GroupStandingsMap;
  knockoutFixtures: KnockoutFixture[];
  nextGameId: string | null;
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
                      <FlowCard fixture={fixture} country={country} gsMap={gsMap} accent={accent} knockoutFixtures={knockoutFixtures} isNext={fixture.id === nextGameId} />
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

function FlowCard({ fixture, country, gsMap, accent, knockoutFixtures, isNext }: {
  fixture: KnockoutFixture;
  country: string;
  gsMap: GroupStandingsMap;
  accent: string;
  knockoutFixtures: KnockoutFixture[];
  isNext?: boolean;
}) {
  const countryLower = country.toLowerCase();
  const isHome =
    fixture.home.toLowerCase() === countryLower ||
    (!isKnownTeam(fixture.home) &&
      upstreamTeams(fixture.home, gsMap, knockoutFixtures)
        .some(t => t.toLowerCase() === countryLower));
  const opponentSlot = isHome ? fixture.away : fixture.home;
  const known = isKnownTeam(opponentSlot);
  const candidates = known ? [] : upstreamTeams(opponentSlot, gsMap, knockoutFixtures);

  const finished = fixture.score?.status === "finished";
  const live = fixture.score?.status === "in_progress";
  const myScore = fixture.score ? (isHome ? fixture.score.home : fixture.score.away) : undefined;
  const theirScore = fixture.score ? (isHome ? fixture.score.away : fixture.score.home) : undefined;
  const won = finished && myScore !== undefined && theirScore !== undefined && myScore > theirScore;
  const lost = finished && myScore !== undefined && theirScore !== undefined && myScore < theirScore;

  const nzt = bracketDate(fixture.startUtc);

  const tvnz = tvnzUrl(fixture);

  return (
    <div
      className={`bracket-flow-card${won ? " bracket-flow-card--won" : lost ? " bracket-flow-card--lost" : live ? " bracket-flow-card--live" : ""}`}
      style={{ borderColor: accent, position: "relative", cursor: "pointer" }}
      onClick={() => scrollToMatch(fixture.id)}
      title="Jump to match details"
    >
      {live && <span className="card-corner-badge card-corner-badge--live">LIVE</span>}
      {isNext && !live && <span className="card-corner-badge card-corner-badge--next">NEXT</span>}
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
          <span className="bracket-flow-tbd">?</span>
        )}
      </div>
      <div className="bracket-flow-footer">
        {tvnz && known && isNewZealand() && <a className="bracket-flow-tvnz" href={tvnz} target="_blank" rel="noreferrer">📺</a>}
        <a className="bracket-cal-btn" href={gcalUrl(fixture)} target="_blank" rel="noreferrer" title="Add to Google Calendar">
          <CalIcon size={11} />
        </a>
      </div>
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

// Extract 1-based ESPN slot number from a label like "Round of 32 3 Winner" → 3
function extractSlotNum(label: string): number | null {
  const m = label.match(/\b(\d+)\s+winner\b/i);
  return m ? parseInt(m[1], 10) : null;
}


/**
 * For a given fixture in stage N, find the two feeder fixtures from stage N-1.
 * Uses slot labels in the fixture's home/away to look up feeders.
 * Falls back to matching by winner name for resolved slots.
 */
function findFeeders(
  fixture: KnockoutFixture,
  prevFixtures: KnockoutFixture[],
  prevStagePrefixes: string[],
): KnockoutFixture[] {
  const feeders: KnockoutFixture[] = [];

  for (const slot of [fixture.home, fixture.away]) {
    const slotL = slot.toLowerCase();
    if (prevStagePrefixes.some(p => slotL.startsWith(p))) {
      // Slot label: "Round of 32 N Winner" → look up Nth date-sorted fixture
      const num = extractSlotNum(slot);
      if (num !== null) {
        const f = prevFixtures[num - 1];
        if (f) feeders.push(f);
      }
    } else if (!/(group|round of|winner|place|runner|loser|quarterfinal|semifinal|third)/i.test(slot)) {
      // Real team name — find which prev fixture they won
      const f = prevFixtures.find(pf => {
        if (pf.score?.status !== "finished") return false;
        const w = pf.score.home > pf.score.away ? pf.home : pf.away;
        return w.toLowerCase() === slotL;
      });
      if (f) feeders.push(f);
    }
  }

  return feeders;
}

const STAGE_ORDER = ["Round of 32", "Round of 16", "Quarter-final", "Semi-final", "Final"];

const STAGE_PREFIXES: Record<string, string[]> = {
  "Round of 32":   ["round of 32"],
  "Round of 16":   ["round of 16"],
  "Quarter-final": ["quarterfinal", "quarter-final"],
  "Semi-final":    ["semifinal", "semi-final"],
};

/**
 * Layout by DFS from the Final.
 *
 * Each R32 game is a leaf and gets a sequential row (0..15) in DFS traversal
 * order. Non-leaf rows are the average of their children. This guarantees a
 * perfect non-overlapping binary-tree layout regardless of how ESPN numbers
 * the slots or which pairs are adjacent.
 */
function buildLayout(byStage: Record<string, KnockoutFixture[]>, stages: string[]): {
  layouts: MatchLayout[];
  connectors: ConnectorLine[];
  totalW: number;
  totalH: number;
} {
  // Sort every stage by ESPN event ID — ID order == bracket slot order
  const byStageById: Record<string, KnockoutFixture[]> = {};
  for (const stage of stages) {
    byStageById[stage] = (byStage[stage] ?? []).slice().sort((a, b) => parseInt(a.id) - parseInt(b.id));
  }

  // Precompute feeders for every fixture (id → KnockoutFixture[])
  const feedersOf: Record<string, KnockoutFixture[]> = {};
  for (const stage of stages) {
    const si = STAGE_ORDER.indexOf(stage);
    const prevStage = si > 0 ? STAGE_ORDER[si - 1] : null;
    const prevFixtures = prevStage ? (byStageById[prevStage] ?? []) : [];
    const prefixes = prevStage ? (STAGE_PREFIXES[prevStage] ?? [prevStage.toLowerCase()]) : [];
    for (const fixture of byStageById[stage]) {
      feedersOf[fixture.id] = prevFixtures.length ? findFeeders(fixture, prevFixtures, prefixes) : [];
    }
  }

  // DFS from Final — assign sequential leaf (R32) rows as encountered
  const final = (byStageById["Final"] ?? [])[0];
  const fixtureRow: Record<string, number> = {};
  let nextLeaf = 0;

  function dfs(id: string): number {
    const feeders = feedersOf[id] ?? [];
    if (feeders.length === 0) {
      // Leaf: this R32 game gets the next available row
      fixtureRow[id] = nextLeaf++;
      return fixtureRow[id];
    }
    const childRows = feeders.map(f => dfs(f.id));
    const avg = childRows.reduce((a, b) => a + b, 0) / childRows.length;
    fixtureRow[id] = avg;
    return avg;
  }

  if (final) dfs(final.id);

  // Any fixture not reached (e.g. 3rd-place match) — append below
  for (const stage of stages) {
    for (const f of byStageById[stage]) {
      if (fixtureRow[f.id] === undefined) fixtureRow[f.id] = nextLeaf++;
    }
  }

  const colCount = stages.length;
  const totalW = colCount * CARD_W + (colCount - 1) * COL_GAP;
  const totalH = Math.max(nextLeaf, 16) * SLOT_H;

  const layouts: MatchLayout[] = [];
  const connectors: ConnectorLine[] = [];

  for (const [stageIdx, stage] of stages.entries()) {
    const left = stageIdx * (CARD_W + COL_GAP);
    for (const fixture of byStage[stage] ?? []) {
      const row = fixtureRow[fixture.id] ?? 0;
      const top = row * SLOT_H;
      layouts.push({ fixture, col: stageIdx, top, left });

      const feeders = feedersOf[fixture.id] ?? [];
      if (feeders.length && stageIdx > 0) {
        const prevLeft = (stageIdx - 1) * (CARD_W + COL_GAP);
        const midX = prevLeft + CARD_W + COL_GAP / 2;
        const curMidY = top + CARD_H / 2;
        for (const feeder of feeders) {
          const feederRow = fixtureRow[feeder.id];
          if (feederRow === undefined) continue;
          const feederMidY = feederRow * SLOT_H + CARD_H / 2;
          connectors.push({ x1: prevLeft + CARD_W, y1: feederMidY, x2: left, y2: curMidY, mid: midX });
        }
      }
    }
  }

  return { layouts, connectors, totalW, totalH };
}

function FullBracket({ byStage, trackedIds, tracked, gsMap, knockoutFixtures, nextGameId }: {
  byStage: Record<string, KnockoutFixture[]>;
  trackedIds: Set<string>;
  tracked: string[];
  gsMap: GroupStandingsMap;
  knockoutFixtures: KnockoutFixture[];
  nextGameId: string | null;
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

          return (
            <div
              key={fixture.id}
              style={{ position: "absolute", top, left, width: CARD_W, height: CARD_H }}
            >
              <FullCard fixture={fixture} highlighted={highlighted} gsMap={gsMap} tracked={tracked} knockoutFixtures={knockoutFixtures} isNext={fixture.id === nextGameId} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FullCard({ fixture, highlighted, gsMap, tracked, knockoutFixtures, isNext }: {
  fixture: KnockoutFixture;
  highlighted: boolean;
  gsMap: GroupStandingsMap;
  tracked: string[];
  knockoutFixtures: KnockoutFixture[];
  isNext?: boolean;
}) {
  const finished = fixture.score?.status === "finished";
  const live = fixture.score?.status === "in_progress";
  const homeWon = finished && (fixture.score!.home > fixture.score!.away);
  const awayWon = finished && (fixture.score!.away > fixture.score!.home);
  const tvnz = tvnzUrl(fixture);

  const nzt = bracketDate(fixture.startUtc);

  return (
    <div
      className={`bracket-full-card${highlighted ? " bracket-full-card--highlighted" : ""}`}
      style={{ width: "100%", height: "100%", position: "relative", cursor: "pointer" }}
      onClick={() => scrollToMatch(fixture.id)}
      title="Jump to match details"
    >
      {live && <span className="card-corner-badge card-corner-badge--live">LIVE</span>}
      {isNext && !live && <span className="card-corner-badge card-corner-badge--next">NEXT</span>}
      <FullTeamRow name={fixture.home} score={fixture.score?.home} won={homeWon} lost={finished && !homeWon} gsMap={gsMap} tracked={tracked} knockoutFixtures={knockoutFixtures} />
      <div className="bracket-divider" />
      <FullTeamRow name={fixture.away} score={fixture.score?.away} won={awayWon} lost={finished && !awayWon} gsMap={gsMap} tracked={tracked} knockoutFixtures={knockoutFixtures} />
      <div className="bracket-full-footer">
        <span className="bracket-full-date">{nzt}</span>
        {tvnz && isKnownTeam(fixture.home) && isKnownTeam(fixture.away) && isNewZealand() && <a className="bracket-flow-tvnz" href={tvnz} target="_blank" rel="noreferrer">📺</a>}
        <a className="bracket-cal-btn" href={gcalUrl(fixture)} target="_blank" rel="noreferrer" title="Add to Google Calendar">
          <CalIcon />
        </a>
      </div>
    </div>
  );
}

function FullTeamRow({ name, score, won, lost, gsMap, tracked, knockoutFixtures }: {
  name: string; score?: number; won: boolean; lost: boolean; gsMap: GroupStandingsMap; tracked: string[]; knockoutFixtures: KnockoutFixture[];
}) {
  const known = isKnownTeam(name);
  const candidates = known ? [] : upstreamTeams(name, gsMap, knockoutFixtures);
  const isTracked = tracked.some(c => c.toLowerCase() === name.toLowerCase());
  const trackedCand = candidates.find(c => tracked.map(t => t.toLowerCase()).includes(c.toLowerCase()));

  return (
    <div className={`bracket-full-team${isTracked || trackedCand ? " bracket-full-team--tracked" : ""}${won ? " bracket-full-team--won" : lost ? " bracket-full-team--lost" : ""}`}>
      <span className="bracket-full-team-name">
        {known
          ? <><span>{flag(name)}</span> <span className={isTracked ? "bracket-name-bold" : ""}>{name}</span></>
          : candidates.length > 0
            ? <CandidateTooltip candidates={candidates} tracked={tracked} />
            : <span className="bracket-tbd">?</span>
        }
      </span>
      {score !== undefined && (
        <span className={`bracket-score${won ? " bracket-score--won" : lost ? " bracket-score--lost" : ""}`}>{score}</span>
      )}
    </div>
  );
}
