import type { Match } from "../matches";
import { gcalUrl, tvnzUrl } from "../matches";
import { flag, countryColor } from "../countryInfo";
import type { LiveScore } from "../hooks/useLiveData";
import type { KnockoutFixture } from "../hooks/useLiveData";
import { isNewZealand } from "../dateUtils";

interface Props {
  matches: Match[];
  knockoutFixtures: KnockoutFixture[];
  scores: Record<string, LiveScore>;
  tracked: string[];
  onInfo: (country: string) => void;
}

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

function localDayKey(d: Date): string {
  return d.toLocaleDateString("sv-SE", { timeZone: LOCAL_TZ }); // YYYY-MM-DD
}

function localTimeKey(iso: string): string {
  // "HH:MM" in local tz — used as row key
  return new Intl.DateTimeFormat(undefined, {
    timeZone: LOCAL_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function localTimeLabel(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: LOCAL_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function isoWeekMonday(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day);
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function weekKey(iso: string): string {
  const d = new Date(iso);
  const mon = isoWeekMonday(d);
  return localDayKey(mon);
}

function matchStatus(iso: string, live?: LiveScore): "upcoming" | "live" | "past" {
  if (live?.status === "in_progress") return "live";
  if (live?.status === "finished") return "past";
  const now = Date.now();
  const start = new Date(iso).getTime();
  if (now < start) return "upcoming";
  if (now <= start + 2 * 60 * 60 * 1000) return "live";
  return "past";
}

function isTracked(team: string, tracked: string[]): boolean {
  const t = team.toLowerCase();
  return tracked.map(c => c.toLowerCase()).some(c => c === t || (t.startsWith("ir ") && c === t.slice(3)));
}

function isKnownTeam(name: string): boolean {
  return !/(group|round of|winner|place|runner|loser|quarterfinal|semifinal)/i.test(name);
}

interface CalEntry {
  id: string;
  startUtc: string;
  timeKey: string;   // "HH:MM" local
  dayKey: string;    // "YYYY-MM-DD" local
  weekKey: string;   // "YYYY-MM-DD" of week's Monday
  homeTeam: string;
  awayTeam: string;
  isPotential: boolean;
  homeAccent: string;
  awayAccent: string;
  status: "upcoming" | "live" | "past";
  href: string;
  tvnz?: string;
  score?: { home: number; away: number };
}

export function CalendarView({ matches, knockoutFixtures, scores, tracked, onInfo }: Props) {
  const entries: CalEntry[] = [];
  const nz = isNewZealand();

  for (const m of matches) {
    const live = scores[m.id];
    const status = matchStatus(m.startUtc, live);
    const tvnzLink = nz ? (tvnzUrl(m) ?? undefined) : undefined;
    entries.push({
      id: m.id,
      startUtc: m.startUtc,
      timeKey: localTimeKey(m.startUtc),
      dayKey: localDayKey(new Date(m.startUtc)),
      weekKey: weekKey(m.startUtc),
      homeTeam: m.home,
      awayTeam: m.away,
      isPotential: false,
      homeAccent: countryColor(m.home).accent,
      awayAccent: countryColor(m.away).accent,
      status,
      href: gcalUrl(m),
      tvnz: tvnzLink,
      score: live && live.status !== "scheduled" ? { home: live.home, away: live.away } : undefined,
    });
  }

  for (const f of knockoutFixtures) {
    const trackedInFixture = tracked.filter(c => {
      const cl = c.toLowerCase();
      return f.home.toLowerCase() === cl || f.away.toLowerCase() === cl;
    });
    if (trackedInFixture.length === 0) continue;

    const country = trackedInFixture[0];
    const opponent = f.home.toLowerCase() === country.toLowerCase() ? f.away : f.home;
    const live = f.score;
    const status = live?.status === "finished" ? "past" : live?.status === "in_progress" ? "live" : "upcoming";
    const tvnzLink = nz && isKnownTeam(f.home) && isKnownTeam(f.away) ? (f.tvnzPath ? `https://www.tvnz.co.nz${f.tvnzPath}` : undefined) : undefined;

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `⚽ [Potential] ${f.stage} — FIFA World Cup 2026`,
      dates: [
        f.startUtc.replace(/[-:]/g, "").replace(/\.\d{3}/, ""),
        new Date(new Date(f.startUtc).getTime() + 7200000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""),
      ].join("/"),
      location: f.venue,
      details: `${country} vs ${opponent}`,
    });

    entries.push({
      id: `${f.id}-${country}`,
      startUtc: f.startUtc,
      timeKey: localTimeKey(f.startUtc),
      dayKey: localDayKey(new Date(f.startUtc)),
      weekKey: weekKey(f.startUtc),
      homeTeam: country,
      awayTeam: opponent,
      isPotential: true,
      homeAccent: countryColor(country).accent,
      awayAccent: isKnownTeam(opponent) ? countryColor(opponent).accent : "#aaa",
      status,
      href: `https://calendar.google.com/calendar/render?${params.toString()}`,
      tvnz: tvnzLink,
      score: live ? {
        home: f.home.toLowerCase() === country.toLowerCase() ? live.home : live.away,
        away: f.home.toLowerCase() === country.toLowerCase() ? live.away : live.home,
      } : undefined,
    });
  }

  // Group entries by week, then collect unique time slots and day keys per week
  const weekOrder: string[] = [];
  const weekEntries: Record<string, CalEntry[]> = {};
  for (const e of entries) {
    if (!weekEntries[e.weekKey]) {
      weekEntries[e.weekKey] = [];
      weekOrder.push(e.weekKey);
    }
    weekEntries[e.weekKey].push(e);
  }
  weekOrder.sort();

  const tzLabel = LOCAL_TZ.replace(/_/g, " ");
  const todayKey = localDayKey(new Date());

  return (
    <div className="cal-wrap">
      <p className="cal-tz">Times shown in your local timezone: <strong>{tzLabel}</strong></p>
      {weekOrder.map(wk => {
        const wkEntries = weekEntries[wk];

        // Columns: only days that have at least one entry; plus fill Mon–Sun of that week
        const monDate = new Date(wk + "T00:00:00");
        const weekDays: { key: string; label: string; date: Date }[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(monDate);
          d.setDate(monDate.getDate() + i);
          const key = localDayKey(d);
          // Only include days that have entries OR are in the tournament window
          const hasEntries = wkEntries.some(e => e.dayKey === key);
          if (hasEntries) {
            weekDays.push({
              key,
              label: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }),
              date: d,
            });
          }
        }

        // Rows: unique time slots sorted
        const timeSlots = [...new Set(wkEntries.map(e => e.timeKey))].sort();

        // Cell lookup: timeKey + dayKey → entries
        const cellMap: Record<string, CalEntry[]> = {};
        for (const e of wkEntries) {
          const k = `${e.timeKey}|${e.dayKey}`;
          if (!cellMap[k]) cellMap[k] = [];
          cellMap[k].push(e);
        }

        return (
          <div key={wk} className="cal-week-section">
            <div
              className="cal-time-grid"
              style={{ gridTemplateColumns: `3.5rem repeat(${weekDays.length}, 1fr)` }}
            >
              {/* Header row */}
              <div className="cal-grid-corner" />
              {weekDays.map(day => (
                <div
                  key={day.key}
                  className={`cal-grid-day-header${day.key === todayKey ? " cal-grid-day-header--today" : ""}`}
                >
                  {day.label}
                </div>
              ))}

              {/* Time slot rows */}
              {timeSlots.map(slot => (
                <>
                  <div key={`slot-${slot}`} className="cal-grid-time">{localTimeLabel(wkEntries.find(e => e.timeKey === slot)!.startUtc)}</div>
                  {weekDays.map(day => {
                    const cell = cellMap[`${slot}|${day.key}`] ?? [];
                    return (
                      <div key={`${slot}|${day.key}`} className={`cal-grid-cell${cell.length ? " cal-grid-cell--has" : ""}`}>
                        {cell.map(e => (
                          <CalEntryCard key={e.id} entry={e} tracked={tracked} onInfo={onInfo} />
                        ))}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalEntryCard({ entry: e, tracked, onInfo }: { entry: CalEntry; tracked: string[]; onInfo: (c: string) => void }) {
  const homeTracked = isTracked(e.homeTeam, tracked);
  const awayTracked = isTracked(e.awayTeam, tracked);

  return (
    <div
      className={`cal-entry${e.isPotential ? " cal-entry--potential" : ""}${e.status === "live" ? " cal-entry--live" : ""}${e.status === "past" ? " cal-entry--past" : ""}`}
      style={{ borderLeftColor: e.homeAccent }}
    >
      {e.status === "live" && <span className="cal-live-dot" />}
      <div className="cal-entry-teams">
        <span
          className={`cal-team${homeTracked ? " cal-team--tracked" : ""}`}
          onClick={() => onInfo(e.homeTeam)}
          title={e.homeTeam}
        >
          {flag(e.homeTeam)} {e.homeTeam}
        </span>
        <span className="cal-entry-score">
          {e.score ? `${e.score.home}–${e.score.away}` : "vs"}
        </span>
        <span
          className={`cal-team${awayTracked ? " cal-team--tracked" : ""}`}
          onClick={() => onInfo(e.awayTeam)}
          title={e.awayTeam}
        >
          {flag(e.awayTeam)} {e.awayTeam}
        </span>
      </div>
      <div className="cal-entry-actions">
        {e.tvnz && (
          <a className="cal-btn cal-btn--tvnz" href={e.tvnz} target="_blank" rel="noreferrer">📺</a>
        )}
        <a className="cal-btn cal-btn--gcal" href={e.href} target="_blank" rel="noreferrer">+ Cal</a>
      </div>
    </div>
  );
}
