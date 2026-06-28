import type { Match } from "../matches";
import { gcalUrl, tvnzUrl } from "../matches";
import { flag, countryColor } from "../countryInfo";
import type { LiveScore, GoalEvent } from "../hooks/useLiveData";
import { tempForCity } from "../cityTemps";

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

const NZT = "Pacific/Auckland";

function formatNZT(iso: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    timeZone: NZT,
    weekday: "short",
    day: "numeric",
    month: "short",
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
  // Past matches use a dimmed version of the colour so they stay faded
  const opacity = status === "past" ? 0.5 : 1;
  const cardStyle = {
    background: `linear-gradient(105deg, ${homeColor.bg} 0%, ${homeColor.bg} 45%, var(--surface) 50%, ${awayColor.bg} 55%, ${awayColor.bg} 100%)`,
    borderLeft: `3px solid ${homeColor.accent}`,
    borderRight: `3px solid ${awayColor.accent}`,
    opacity,
  };

  return (
    <li className={`match-card ${status}${isNext ? " match-card--next" : ""}`} style={cardStyle}>
      {/* Background flags */}
      <span className="team-flag team-flag--home" aria-hidden="true">{flag(match.home)}</span>
      <span className="team-flag team-flag--away" aria-hidden="true">{flag(match.away)}</span>
      {/* Meta row */}
      <div className="match-meta">
        <span className="group-badge">Group {match.group}</span>
        {isNext && <span className="next-badge">NEXT</span>}
        {status === "live" && <span className="live-badge">LIVE</span>}
        {status === "past" && <span className="past-badge">FT</span>}
        <span>{formatNZT(match.startUtc)} NZT</span>
        {stream && (
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
                <span className="score-num">{score.home}</span>
                <span className="score-sep">–</span>
                <span className="score-num">{score.away}</span>
                {score.clock && status === "live" && <span className="score-clock">{score.clock}</span>}
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

      {/* Cards row — only shown when cards exist */}
      {((score?.homeCards?.length ?? 0) > 0 || (score?.awayCards?.length ?? 0) > 0) && (
        <div className="match-cards-row">
          <div className="match-cards-team">
            {score!.homeCards!.map((c, i) => (
              <span key={i} className={`match-card-chip match-card-chip--${c.type}`} title={`${c.player} ${c.minute}`}>
                {c.type === "yellow" ? "🟨" : c.type === "red" ? "🟥" : "🟨🟥"} <span className="match-card-player">{c.player}</span> <span className="match-card-min">{c.minute}</span>
              </span>
            ))}
          </div>
          <div className="match-cards-spacer" />
          <div className="match-cards-team match-cards-team--away">
            {score!.awayCards!.map((c, i) => (
              <span key={i} className={`match-card-chip match-card-chip--${c.type}`} title={`${c.player} ${c.minute}`}>
                <span className="match-card-min">{c.minute}</span> <span className="match-card-player">{c.player}</span> {c.type === "yellow" ? "🟨" : c.type === "red" ? "🟥" : "🟨🟥"}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Goals row */}
      {((score?.homeGoals?.length ?? 0) > 0 || (score?.awayGoals?.length ?? 0) > 0) && (
        <div className="match-goals-row">
          <div className="match-goals-team">
            {score!.homeGoals!.map((g, i) => <GoalChip key={i} goal={g} side="home" />)}
          </div>
          <div className="match-cards-spacer" />
          <div className="match-goals-team match-goals-team--away">
            {score!.awayGoals!.map((g, i) => <GoalChip key={i} goal={g} side="away" />)}
          </div>
        </div>
      )}

      {/* Match stats row */}
      {score?.stats && (score.stats.homeShots !== undefined || score.stats.homePossession !== undefined) && (
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

      <p className="match-venue">📍 {match.venue}{tempForCity(match.venue) ? ` · 🌡 ${tempForCity(match.venue)}` : ""}</p>
    </li>
  );
}

function GoalChip({ goal, side }: { goal: GoalEvent; side: "home" | "away" }) {
  const label = goal.ownGoal ? "OG" : goal.penalty ? "P" : "";
  const icon = <span>⚽</span>;
  const player = <span className="match-goal-player">{goal.player}</span>;
  const badge = label ? <span className="match-goal-type">{label}</span> : null;
  const minute = <span className="match-card-min">{goal.minute}</span>;
  return (
    <span className="match-goal-chip">
      {side === "home"
        ? <>{icon} {player}{badge} {minute}</>
        : <>{minute} {player}{badge} {icon}</>}
    </span>
  );
}
