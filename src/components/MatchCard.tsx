import type { Match } from "../matches";
import { gcalUrl, tvnzUrl } from "../matches";

interface Props {
  match: Match;
  tracked: string[];
}

const NZT = "Pacific/Auckland";

function formatNZT(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-NZ", {
    timeZone: NZT,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function matchStatus(iso: string): "upcoming" | "live" | "past" {
  const now = Date.now();
  const start = new Date(iso).getTime();
  const end = start + 2 * 60 * 60 * 1000;
  if (now < start) return "upcoming";
  if (now <= end) return "live";
  return "past";
}

export function MatchCard({ match, tracked }: Props) {
  const status = matchStatus(match.startUtc);
  const stream = tvnzUrl(match);
  const cal = gcalUrl(match);
  const trackedLower = tracked.map((c) => c.toLowerCase());

  function isTracked(team: string) {
    const t = team.toLowerCase();
    return trackedLower.includes(t) || (t.startsWith("ir ") && trackedLower.includes(t.slice(3)));
  }

  return (
    <li className={`match-card ${status}`}>
      <div className="match-meta">
        <span className="group-badge">Group {match.group}</span>
        {status === "live" && <span className="live-badge">LIVE</span>}
        <span>{formatNZT(match.startUtc)} NZT</span>
      </div>

      <div className="match-teams">
        <span className={`team home${isTracked(match.home) ? " tracked" : ""}`}>
          {match.home}
        </span>
        <span className="vs">vs</span>
        <span className={`team away${isTracked(match.away) ? " tracked" : ""}`}>
          {match.away}
        </span>
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
