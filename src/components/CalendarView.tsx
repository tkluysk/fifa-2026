import type { Match } from "../matches";
import { gcalUrl, tvnzUrl } from "../matches";
import { flag, countryColor } from "../countryInfo";
import type { LiveScore } from "../hooks/useLiveData";
import type { KnockoutFixture } from "../hooks/useLiveData";

interface Props {
  matches: Match[];
  knockoutFixtures: KnockoutFixture[];
  scores: Record<string, LiveScore>;
  tracked: string[];
  onInfo: (country: string) => void;
}

// Viewer's local timezone
const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

function localDate(iso: string): Date {
  return new Date(iso);
}

function localDayKey(d: Date): string {
  // "2026-06-15" in local tz
  return d.toLocaleDateString("sv-SE", { timeZone: LOCAL_TZ }); // sv-SE gives YYYY-MM-DD
}

function localTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: LOCAL_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
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

// Build calendar grid for a given year/month
function calendarGrid(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const offset = (firstDow + 6) % 7; // shift to Mon=0
  const days = new Date(year, month + 1, 0).getDate();
  return [
    ...Array(offset).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
}

interface CalEntry {
  id: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  isPotential: boolean;
  condition?: string;
  homeAccent: string;
  awayAccent: string;
  status: "upcoming" | "live" | "past";
  href: string; // gcal link
  tvnz?: string;
  score?: { home: number; away: number };
}

export function CalendarView({ matches, knockoutFixtures, scores, tracked, onInfo }: Props) {
  // Build a map: "YYYY-MM-DD" → CalEntry[]
  const dayMap: Record<string, CalEntry[]> = {};

  function add(key: string, entry: CalEntry) {
    if (!dayMap[key]) dayMap[key] = [];
    dayMap[key].push(entry);
  }

  // Confirmed matches
  for (const m of matches) {
    const d = localDate(m.startUtc);
    const key = localDayKey(d);
    const live = scores[m.id];
    const status = matchStatus(m.startUtc, live);
    add(key, {
      id: m.id,
      time: localTime(m.startUtc),
      homeTeam: m.home,
      awayTeam: m.away,
      isPotential: false,
      homeAccent: countryColor(m.home).accent,
      awayAccent: countryColor(m.away).accent,
      status,
      href: gcalUrl(m),
      tvnz: tvnzUrl(m) ?? undefined,
      score: live && live.status !== "scheduled" ? { home: live.home, away: live.away } : undefined,
    });
  }

  // Knockout fixtures — show for tracked teams
  for (const f of knockoutFixtures) {
    // Only include if a tracked team is directly named (not just a slot placeholder)
    const trackedInFixture = tracked.filter(c => {
      const cl = c.toLowerCase();
      return f.home.toLowerCase() === cl || f.away.toLowerCase() === cl;
    });
    if (trackedInFixture.length === 0) continue;

    const d = localDate(f.startUtc);
    const key = localDayKey(d);
    const live = f.score;
    const status = live?.status === "finished" ? "past" : live?.status === "in_progress" ? "live" : "upcoming";

    const country = trackedInFixture[0];
    const opponent = f.home.toLowerCase() === country.toLowerCase() ? f.away : f.home;
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
    add(key, {
      id: `${f.id}-${country}`,
      time: localTime(f.startUtc),
      homeTeam: country,
      awayTeam: opponent,
      isPotential: true,
      homeAccent: countryColor(country).accent,
      awayAccent: "#aaa",
      status,
      href: `https://calendar.google.com/calendar/render?${params.toString()}`,
      score: live ? { home: f.home.toLowerCase() === country.toLowerCase() ? live.home : live.away, away: f.home.toLowerCase() === country.toLowerCase() ? live.away : live.home } : undefined,
    });
  }

  // Months to render: June + July 2026
  const months: { year: number; month: number; label: string }[] = [
    { year: 2026, month: 5, label: "June 2026" },
    { year: 2026, month: 6, label: "July 2026" },
  ];

  const tzLabel = LOCAL_TZ.replace(/_/g, " ");

  return (
    <div className="cal-wrap">
      <p className="cal-tz">Times shown in your local timezone: <strong>{tzLabel}</strong></p>
      {months.map(({ year, month, label }) => {
        const grid = calendarGrid(year, month);
        return (
          <div key={label} className="cal-month">
            <h3 className="cal-month-title">{label}</h3>
            <div className="cal-grid">
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                <div key={d} className="cal-dow">{d}</div>
              ))}
              {grid.map((day, i) => {
                const key = day
                  ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                  : null;
                const entries = key ? (dayMap[key] ?? []) : [];
                const isToday = key === localDayKey(new Date());
                return (
                  <div
                    key={i}
                    className={`cal-day${!day ? " cal-day--empty" : ""}${isToday ? " cal-day--today" : ""}${entries.length ? " cal-day--has-matches" : ""}`}
                  >
                    {day && <span className="cal-day-num">{day}</span>}
                    {entries.map((e) => (
                      <CalEntry key={e.id} entry={e} tracked={tracked} onInfo={onInfo} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalEntry({ entry: e, tracked, onInfo }: { entry: CalEntry; tracked: string[]; onInfo: (c: string) => void }) {
  const homeTracked = isTracked(e.homeTeam, tracked);
  const awayTracked = isTracked(e.awayTeam, tracked);

  return (
    <div className={`cal-entry${e.isPotential ? " cal-entry--potential" : ""}${e.status === "live" ? " cal-entry--live" : ""}${e.status === "past" ? " cal-entry--past" : ""}`}
      style={{ borderLeftColor: e.homeAccent }}>

      <div className="cal-entry-time">{e.time}{e.status === "live" && <span className="cal-live-dot" />}</div>

      {e.isPotential && e.condition && (
        <div className="cal-entry-condition">{e.condition}</div>
      )}

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
