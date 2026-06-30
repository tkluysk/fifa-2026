import type { Match } from "../matches";
import { gcalUrl, tvnzUrl } from "../matches";
import { flag, countryColor } from "../countryInfo";
import type { LiveScore, GoalEvent, MatchCard as CardEvent, SubEvent } from "../hooks/useLiveData";
import { tempForCity } from "../cityTemps";
import { formatLocalDate, userCity, isNewZealand } from "../dateUtils";

function CalIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1" y="2.5" width="12" height="10.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="1" y1="5.5" x2="13" y2="5.5" stroke="currentColor" strokeWidth="1.1"/>
      <line x1="4" y1="1" x2="4" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="10" y1="1" x2="10" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="7" y1="8" x2="7" y2="11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="5.5" y1="9.5" x2="8.5" y2="9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

interface Props {
  match: Match;
  tracked: string[];
  score?: LiveScore;
  onInfo: (country: string) => void;
  isNext?: boolean;
}

function matchStatus(iso: string, live?: LiveScore): "upcoming" | "live" | "past" {
  if (live?.status === "in_progress") return "live";
  if (live?.status === "finished") return "past";
  const now = Date.now();
  const start = new Date(iso).getTime();
  const end = start + 2 * 60 * 60 * 1000;
  if (now < start) return "upcoming";
  if (now <= end) return "live";
  return "past";
}

function isTracked(team: string, trackedLower: string[]): boolean {
  const t = team.toLowerCase();
  return trackedLower.includes(t) || (t.startsWith("ir ") && trackedLower.includes(t.slice(3)));
}


export function MatchCard({ match, tracked, score, onInfo, isNext }: Props) {
  const status = matchStatus(match.startUtc, score);
  const stream = tvnzUrl(match);
  const cal = gcalUrl(match);
  const trackedLower = tracked.map((c) => c.toLowerCase());

  const homeColor = countryColor(match.home);
  const awayColor = countryColor(match.away);
  const cardStyle = {
    background: `linear-gradient(105deg, ${homeColor.bg} 0%, ${homeColor.bg} 45%, var(--surface) 50%, ${awayColor.bg} 55%, ${awayColor.bg} 100%)`,
    borderLeft: `3px solid ${homeColor.accent}`,
    borderRight: `3px solid ${awayColor.accent}`,
  };

  return (
    <li id={`match-${match.id}`} className={`match-card ${status}`} style={cardStyle}>
      {/* Corner status badge */}
      {status === "live" && <span className="card-corner-badge card-corner-badge--live">LIVE</span>}
      {isNext && status !== "live" && <span className="card-corner-badge card-corner-badge--next">NEXT</span>}
      {/* Background flags */}
      <span className="team-flag team-flag--home" aria-hidden="true">{flag(match.home)}</span>
      <span className="team-flag team-flag--away" aria-hidden="true">{flag(match.away)}</span>
      {/* Meta row */}
      <div className="match-meta">
        <span className="group-badge">Group {match.group}</span>
        {status === "past" && <span className="past-badge">FT</span>}
        <span className="match-date--next">{formatLocalDate(match.startUtc)}</span>
        <span className="match-tz-label">{userCity()} time</span>
        {stream && isNewZealand() && (
          <a className="btn-tvnz-inline" href={stream} target="_blank" rel="noreferrer">📺 TVNZ+</a>
        )}
        <a className="btn-cal-side" href={cal} target="_blank" rel="noreferrer" title="Add to Google Calendar">
          <CalIcon />
        </a>
      </div>

      {/* Teams + score */}
      <div className="match-body">
        <div className="match-teams">
          <div className={`team home${isTracked(match.home, trackedLower) ? " tracked" : ""}`}>
            <span className="team-name">{match.home}</span>
            <button className="info-btn" style={{ marginLeft: 6 }} aria-label={`Info about ${match.home}`} onClick={() => onInfo(match.home)} />
          </div>

          <div className="score-block">
            {status !== "upcoming" && score ? (
              <>
                {score.clock && status === "live" && <span className="score-clock">{score.clock}</span>}
                <div className="score-nums">
                  <span className="score-num">{score.home}</span>
                  <span className="score-sep">–</span>
                  <span className="score-num">{score.away}</span>
                </div>
              </>
            ) : (
              <span className="vs">vs</span>
            )}
          </div>

          <div className={`team away${isTracked(match.away, trackedLower) ? " tracked" : ""}`}>
            <button className="info-btn" style={{ marginRight: 6 }} aria-label={`Info about ${match.away}`} onClick={() => onInfo(match.away)} />
            <span className="team-name">{match.away}</span>
          </div>
        </div>
      </div>

      {/* Unified timeline */}
      {score && status !== "upcoming" && (
        <MatchTimeline score={score} isLive={status === "live"} />
      )}

      <p className="match-venue">📍 <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.venue)}`} target="_blank" rel="noreferrer" className="venue-link">{match.venue}</a>{tempForCity(match.venue) ? ` · 🌡 ${tempForCity(match.venue)}` : ""}</p>
    </li>
  );
}

type TimelineKind = "goal" | "card" | "sub";
interface TimelineEvent {
  minute: string;
  minuteNum: number;
  kind: TimelineKind;
  side: "home" | "away";
  goal?: GoalEvent;
  card?: CardEvent;
  sub?: SubEvent;
}

function parseMinute(m: string): number {
  const n = parseInt(m, 10);
  return isNaN(n) ? 999 : n;
}

function buildTimeline(score: LiveScore): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  const addGoals = (goals: GoalEvent[] | undefined, side: "home" | "away") => {
    (goals ?? []).forEach(g => events.push({ minute: g.minute, minuteNum: parseMinute(g.minute), kind: "goal", side, goal: g }));
  };
  addGoals(score.homeGoals, "home");
  addGoals(score.awayGoals, "away");

  const addCards = (cards: CardEvent[] | undefined, side: "home" | "away") => {
    (cards ?? []).forEach(c => events.push({ minute: c.minute, minuteNum: parseMinute(c.minute), kind: "card", side, card: c }));
  };
  addCards(score.homeCards, "home");
  addCards(score.awayCards, "away");

  const addSubs = (subs: SubEvent[] | undefined, side: "home" | "away") => {
    (subs ?? []).forEach(s => events.push({ minute: s.minute, minuteNum: parseMinute(s.minute), kind: "sub", side, sub: s }));
  };
  addSubs(score.homeSubs, "home");
  addSubs(score.awaySubs, "away");

  return events.sort((a, b) => a.minuteNum - b.minuteNum || (a.side === "home" ? -1 : 1));
}

function EventCell({ ev }: { ev: TimelineEvent }) {
  if (ev.kind === "goal") {
    const g = ev.goal!;
    const label = g.ownGoal ? "OG" : g.penalty ? "P" : "";
    const badge = label ? <span className="match-goal-type" title={g.ownGoal ? "Own goal" : "Penalty"}>{label}</span> : null;
    return (
      <span className="match-goal-chip">
        {ev.side === "home"
          ? <>⚽ <span className="match-goal-player">{g.player}</span>{badge} <span className="match-card-min">{g.minute}</span></>
          : <><span className="match-card-min">{g.minute}</span> <span className="match-goal-player">{g.player}</span>{badge} ⚽</>}
      </span>
    );
  }
  if (ev.kind === "card") {
    const c = ev.card!;
    const icon = c.type === "yellow" ? "🟨" : c.type === "red" ? "🟥" : "🟨🟥";
    const cardTitle = c.type === "yellow" ? "Yellow card" : c.type === "red" ? "Red card" : "Yellow-red card";
    return (
      <span className={`match-card-chip match-card-chip--${c.type}`} title={cardTitle}>
        {ev.side === "home"
          ? <>{icon} <span className="match-card-player">{c.player}</span> <span className="match-card-min">{c.minute}</span></>
          : <><span className="match-card-min">{c.minute}</span> <span className="match-card-player">{c.player}</span> {icon}</>}
      </span>
    );
  }
  if (ev.kind === "sub") {
    const s = ev.sub!;
    return (
      <span className="match-sub-chip" title={`${s.playerOn} on · ${s.playerOff} off`}>
        {ev.side === "home"
          ? <>🔄 <span className="match-sub-on">{s.playerOn}</span> <span className="match-sub-off">↓{s.playerOff}</span> <span className="match-card-min">{s.minute}</span></>
          : <><span className="match-card-min">{s.minute}</span> <span className="match-sub-off">{s.playerOff}↓</span> <span className="match-sub-on">{s.playerOn}</span> 🔄</>}
      </span>
    );
  }
  return null;
}

export function MatchTimeline({ score, isLive }: { score: LiveScore; isLive: boolean }) {
  const events = buildTimeline(score);
  if (!events.length) return null;

  return (
    <div className="match-timeline">
      {events.map((ev, i) => (
        <div key={i} className={`match-timeline-row match-timeline-row--${ev.side}`}>
          <div className="match-timeline-home">
            {ev.side === "home" && <EventCell ev={ev} />}
          </div>
          <div className="match-timeline-away">
            {ev.side === "away" && <EventCell ev={ev} />}
          </div>
        </div>
      ))}
      {isLive && score.stats && (score.stats.homeShots !== undefined || score.stats.homePossession !== undefined) && (
        <div className="match-stats-row">
          {score.stats.homePossession !== undefined && (
            <span className="match-stat-item">
              <span className="match-stat-val">{score.stats.homePossession}%</span>
              <span className="match-stat-label">poss</span>
              <span className="match-stat-val">{score.stats.awayPossession}%</span>
            </span>
          )}
          {score.stats.homeShots !== undefined && (
            <span className="match-stat-item">
              <span className="match-stat-val">{score.stats.homeShots}</span>
              <span className="match-stat-label">shots</span>
              <span className="match-stat-val">{score.stats.awayShots}</span>
            </span>
          )}
          {score.stats.homeShotsOnTarget !== undefined && (
            <span className="match-stat-item">
              <span className="match-stat-val">{score.stats.homeShotsOnTarget}</span>
              <span className="match-stat-label">on target</span>
              <span className="match-stat-val">{score.stats.awayShotsOnTarget}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
