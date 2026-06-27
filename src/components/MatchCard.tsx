import type { Match } from "../matches";
import { gcalUrl, tvnzUrl } from "../matches";
import { flag, countryColor } from "../countryInfo";
import type { LiveScore } from "../hooks/useLiveData";

interface Props {
  match: Match;
  tracked: string[];
  score?: LiveScore;
  onInfo: (country: string) => void;
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


export function MatchCard({ match, tracked, score, onInfo }: Props) {
  const status = matchStatus(match.startUtc, score);
  const stream = tvnzUrl(match);
  const cal = gcalUrl(match);
  const trackedLower = tracked.map((c) => c.toLowerCase());

  // Build split background from both teams' colors
  const homeColor = countryColor(match.home);
  const awayColor = countryColor(match.away);
  const cardStyle = {
    background: `linear-gradient(105deg, ${homeColor.bg} 0%, ${homeColor.bg} 45%, white 50%, ${awayColor.bg} 55%, ${awayColor.bg} 100%)`,
    borderLeft: `3px solid ${homeColor.accent}`,
    borderRight: `3px solid ${awayColor.accent}`,
  };

  return (
    <li className={`match-card ${status}`} style={cardStyle}>
      <div className="match-meta">
        <span className="group-badge">Group {match.group}</span>
        {status === "live" && <span className="live-badge">LIVE</span>}
        {status === "past" && <span className="past-badge">FT</span>}
        <span>{formatNZT(match.startUtc)} NZT</span>
      </div>

      <div className="match-teams">
        {/* Home — flag · name · ⓘ, right-aligned */}
        <div className={`team home${isTracked(match.home, trackedLower) ? " tracked" : ""}`}>
          <span className="team-flag">{flag(match.home)}</span>
          <span className="team-name">{match.home}</span>
          <button className="info-btn" aria-label={`Info about ${match.home}`} onClick={() => onInfo(match.home)} />
        </div>

        {/* Centre — score or vs */}
        <div className="score-block">
          {status !== "upcoming" && score ? (
            <>
              <span className="score-num">{score.home}</span>
              <span className="score-sep">–</span>
              <span className="score-num">{score.away}</span>
            </>
          ) : (
            <span className="vs">vs</span>
          )}
        </div>

        {/* Away — ⓘ · name · flag, left-aligned */}
        <div className={`team away${isTracked(match.away, trackedLower) ? " tracked" : ""}`}>
          <button className="info-btn" aria-label={`Info about ${match.away}`} onClick={() => onInfo(match.away)} />
          <span className="team-name">{match.away}</span>
          <span className="team-flag">{flag(match.away)}</span>
        </div>
      </div>

      <p className="match-venue">📍 {match.venue}</p>

      <div className="match-actions">
        {stream && (
          <a className="btn btn-tvnz" href={stream} target="_blank" rel="noreferrer">
            📺 Watch on TVNZ+
          </a>
        )}
        <a className="btn btn-gcal" href={cal} target="_blank" rel="noreferrer">
          + Add to Google Calendar
        </a>
      </div>
    </li>
  );
}
