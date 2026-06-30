import { Fragment } from "react";
import type { Match } from "../matches";
import { tvnzUrl as matchTvnzUrl } from "../matches";
import type { LiveScore, KnockoutFixture, GroupStandingsMap } from "../hooks/useLiveData";
import { knockoutPathForCountry } from "../hooks/useLiveData";
import { relativeDayLabel } from "../dateUtils";
import { FullCard } from "./BracketView";

interface Props {
  matches: Match[];
  knockoutFixtures: KnockoutFixture[];
  scores: Record<string, LiveScore>;
  tracked: string[];
  countryGroups: Record<string, string>;
  groupStandingsMap: GroupStandingsMap;
  nextGameId: string | null;
  onInfo: (country: string) => void;
}

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const TVNZ_BASE = "https://www.tvnz.co.nz";

function stageLabel(stage: string): string {
  return (
    ({
      "Round of 32": "R32", "Round of 16": "R16",
      "Quarter-final": "QF", "Semi-final": "SF",
      "Final": "Final", "3rd Place": "3rd",
    } as Record<string, string>)[stage] ?? null
  );
}

function localDayKey(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: LOCAL_TZ });
}

function localTimeKey(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: LOCAL_TZ, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(iso));
}

function localTimeLabel(iso: string): string {
  const d = new Date(iso);
  const mins = d.getMinutes();
  return new Intl.DateTimeFormat(undefined, {
    timeZone: LOCAL_TZ,
    hour: "numeric",
    ...(mins !== 0 ? { minute: "2-digit" } : {}),
    hour12: true,
  }).format(d);
}

function isoWeekMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function weekKey(iso: string): string {
  return localDayKey(isoWeekMonday(new Date(iso)));
}

function weekRangeLabel(dayKeys: string[]): string {
  if (!dayKeys.length) return "";
  const fmt = (k: string) =>
    new Date(k + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return dayKeys.length === 1
    ? fmt(dayKeys[0])
    : `${fmt(dayKeys[0])} – ${fmt(dayKeys[dayKeys.length - 1])}`;
}

/** Adapt a group-stage Match + LiveScore into the KnockoutFixture shape FullCard expects. */
function matchToFixture(m: Match, score?: LiveScore): KnockoutFixture {
  const fullUrl = matchTvnzUrl(m);
  const tvnzPath = fullUrl ? fullUrl.replace(TVNZ_BASE, "") : null;
  return {
    id: m.id,
    stage: `Group ${m.group}`,
    startUtc: m.startUtc,
    venue: m.venue,
    home: m.home,
    away: m.away,
    score,
    tvnzPath,
  };
}

interface CalEntry {
  fixture: KnockoutFixture;   // FullCard always gets a KnockoutFixture
  timeKey: string;
  dayKey: string;
  weekKey: string;
  highlighted: boolean;       // tracked team is in this match
}

export function CalendarView({
  matches, knockoutFixtures, scores, tracked, countryGroups, groupStandingsMap, nextGameId, onInfo: _onInfo,
}: Props) {
  const seenIds = new Set<string>();
  const entries: CalEntry[] = [];

  const trackedLower = tracked.map(c => c.toLowerCase());

  // ── Group stage matches ────────────────────────────────────────────────────
  for (const m of matches) {
    if (seenIds.has(m.id)) continue;
    seenIds.add(m.id);
    const highlighted = trackedLower.some(c => m.home.toLowerCase() === c || m.away.toLowerCase() === c);
    entries.push({
      fixture: matchToFixture(m, scores[m.id]),
      timeKey: localTimeKey(m.startUtc),
      dayKey: localDayKey(new Date(m.startUtc)),
      weekKey: weekKey(m.startUtc),
      highlighted,
    });
  }

  // ── Knockout path for each tracked country (includes all potential fixtures
  //    through the Final even when teams are not yet decided) ─────────────────
  for (const country of tracked) {
    const group = countryGroups[country] ?? "?";
    if (group === "?") continue;
    const path = knockoutPathForCountry(country, group, knockoutFixtures);
    for (const f of path) {
      if (seenIds.has(f.id)) continue;
      seenIds.add(f.id);
      const highlighted = trackedLower.some(c => f.home.toLowerCase() === c || f.away.toLowerCase() === c);
      entries.push({
        fixture: f,
        timeKey: localTimeKey(f.startUtc),
        dayKey: localDayKey(new Date(f.startUtc)),
        weekKey: weekKey(f.startUtc),
        highlighted,
      });
    }
  }

  if (!entries.length) return null;

  // ── All unique time slots across ALL weeks ─────────────────────────────────
  const allTimeSlots = [...new Set(entries.map(e => e.timeKey))].sort();
  const timeKeyToIso: Record<string, string> = {};
  for (const e of entries) {
    if (!timeKeyToIso[e.timeKey]) timeKeyToIso[e.timeKey] = e.fixture.startUtc;
  }

  // ── Collect weeks + days ──────────────────────────────────────────────────
  const weekOrder: string[] = [];
  const weekDayMap: Record<string, string[]> = {};
  for (const e of entries) {
    if (!weekDayMap[e.weekKey]) { weekDayMap[e.weekKey] = []; weekOrder.push(e.weekKey); }
    if (!weekDayMap[e.weekKey].includes(e.dayKey)) weekDayMap[e.weekKey].push(e.dayKey);
  }
  weekOrder.sort();
  for (const wk of weekOrder) weekDayMap[wk].sort();

  // ── Flat column layout ────────────────────────────────────────────────────
  const colTemplate: string[] = ["auto"]; // col 1 = time (sticky left)
  const dayColIndex: Record<string, number> = {};
  const weekHeaderCols: Record<string, { start: number; end: number }> = {};
  let nextCol = 2;
  for (let wi = 0; wi < weekOrder.length; wi++) {
    const wk = weekOrder[wi];
    if (wi > 0) { colTemplate.push("1px"); nextCol++; }
    const weekStart = nextCol;
    for (const dayKey of weekDayMap[wk]) {
      colTemplate.push("minmax(160px, 1fr)");
      dayColIndex[dayKey] = nextCol++;
    }
    weekHeaderCols[wk] = { start: weekStart, end: nextCol };
  }

  const allDays = weekOrder.flatMap(wk => weekDayMap[wk]);

  const cellMap: Record<string, CalEntry[]> = {};
  for (const e of entries) {
    const k = `${e.timeKey}|${e.dayKey}`;
    if (!cellMap[k]) cellMap[k] = [];
    cellMap[k].push(e);
  }

  const todayKey = localDayKey(new Date());
  const tzLabel = LOCAL_TZ.replace(/_/g, " ");
  const totalRows = allTimeSlots.length + 2;
  const WEEK_ROW_H = 26; // px — must match CSS .cal-week-label height

  return (
    <div className="cal-outer">
      <p className="cal-tz">Times in <strong>{tzLabel}</strong></p>
      <div
        className="cal-grid"
        style={{
          gridTemplateColumns: colTemplate.join(" "),
          gridTemplateRows: `${WEEK_ROW_H}px auto repeat(${allTimeSlots.length}, auto)`,
        }}
      >
        {/* ── Row 1: week range labels (sticky top: 0) ── */}
        {/* corner for row 1 */}
        <div style={{ gridColumn: 1, gridRow: 1, position: "sticky", top: 0, left: 0, zIndex: 5, background: "var(--pitch)" }} />
        {weekOrder.map(wk => (
          <div
            key={wk}
            className="cal-week-label"
            style={{ gridColumn: `${weekHeaderCols[wk].start} / ${weekHeaderCols[wk].end}`, gridRow: 1 }}
          >
            {weekRangeLabel(weekDayMap[wk])}
          </div>
        ))}

        {/* ── Row 2: day headers (sticky top: WEEK_ROW_H) ── */}
        {/* corner for row 2 */}
        <div style={{ gridColumn: 1, gridRow: 2, position: "sticky", top: WEEK_ROW_H, left: 0, zIndex: 5, background: "var(--pitch)", borderBottom: "1px solid var(--border)" }} />
        {allDays.map(dayKey => {
          const rel = relativeDayLabel(dayKey);
          const label = new Date(dayKey + "T12:00:00")
            .toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
          return (
            <div
              key={dayKey}
              style={{ gridColumn: dayColIndex[dayKey], gridRow: 2 }}
              className={`cal-grid-day-header${dayKey === todayKey ? " cal-grid-day-header--today" : ""}`}
            >
              {rel ?? label}
            </div>
          );
        })}

        {/* ── Rows 3+: time slots ── */}
        {allTimeSlots.map((slot, si) => {
          const row = si + 3;
          return (
            <Fragment key={slot}>
              <div className="cal-grid-time" style={{ gridColumn: 1, gridRow: row }}>
                {localTimeLabel(timeKeyToIso[slot])}
              </div>
              {allDays.map(dayKey => {
                const cell = cellMap[`${slot}|${dayKey}`] ?? [];
                return (
                  <div
                    key={dayKey}
                    style={{ gridColumn: dayColIndex[dayKey], gridRow: row }}
                    className="cal-grid-cell"
                  >
                    {cell.map(e => {
                      const sl = stageLabel(e.fixture.stage);
                      return (
                        <div key={e.fixture.id} className="cal-card-wrap">
                          {sl && <div className="cal-card-stage">{sl}</div>}
                          <FullCard
                            fixture={e.fixture}
                            highlighted={e.highlighted}
                            gsMap={groupStandingsMap}
                            tracked={tracked}
                            knockoutFixtures={knockoutFixtures}
                            isNext={e.fixture.id === nextGameId}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </Fragment>
          );
        })}

        {/* ── Separator columns ── */}
        {weekOrder.slice(0, -1).map(wk => (
          <div
            key={`sep-${wk}`}
            className="cal-week-sep"
            style={{ gridColumn: weekHeaderCols[wk].end, gridRow: `1 / ${totalRows + 1}` }}
          />
        ))}
      </div>
    </div>
  );
}
