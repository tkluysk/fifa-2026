import type { KnockoutFixture, GroupStandingsMap } from "../hooks/useLiveData";
import { resolveSlot } from "../hooks/useLiveData";
import { countryColor, flag } from "../countryInfo";
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

const TVNZ_BASE = "https://www.tvnz.co.nz";
const NZT = "Pacific/Auckland";

interface Props {
  fixture: KnockoutFixture;
  country: string;
  groupStandingsMap: GroupStandingsMap;
  onInfo?: (country: string) => void;
}

function gcalUrl(f: KnockoutFixture, country: string): string {
  const start = f.startUtc.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const endDate = new Date(new Date(f.startUtc).getTime() + 2 * 60 * 60 * 1000);
  const end = endDate.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const opponent = f.home.toLowerCase() === country.toLowerCase() ? f.away : f.home;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `⚽ [Potential] ${f.stage} — FIFA World Cup 2026`,
    dates: `${start}/${end}`,
    location: f.venue,
    details: `${country} potential ${f.stage}\nOpponent: ${opponent}\n\nDate may change depending on group stage results.`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function isKnownTeam(name: string): boolean {
  return !/(group|round of|winner|place|runner|loser|quarterfinal|semifinal)/i.test(name);
}

function stageCode(stage: string): string {
  if (stage.includes("32")) return "R32";
  if (stage.includes("16")) return "R16";
  if (stage.includes("Quarter")) return "QF";
  if (stage.includes("Semi")) return "SF";
  if (stage === "Final") return "F";
  if (stage.includes("3rd")) return "3P";
  return stage.slice(0, 3).toUpperCase();
}

export function PotentialMatchCard({ fixture, country, groupStandingsMap, onInfo }: Props) {
  const homeColor = countryColor(country);
  const isHome = fixture.home.toLowerCase() === country.toLowerCase();
  const opponentSlot = isHome ? fixture.away : fixture.home;
  const opponentKnown = isKnownTeam(opponentSlot);
  const candidates = opponentKnown ? [] : resolveSlot(opponentSlot, groupStandingsMap);
  const awayColor = opponentKnown ? countryColor(opponentSlot) : { bg: "var(--surface)", accent: "var(--border)" };
  const tvnzLink = fixture.tvnzPath ? `${TVNZ_BASE}${fixture.tvnzPath}` : null;

  const nzt = new Intl.DateTimeFormat("en-NZ", {
    timeZone: NZT,
    weekday: "short", day: "numeric", month: "short",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(fixture.startUtc));

  const isScored = fixture.score && (fixture.score.status === "finished" || fixture.score.status === "in_progress");
  const myScore = fixture.score ? (isHome ? fixture.score.home : fixture.score.away) : undefined;
  const theirScore = fixture.score ? (isHome ? fixture.score.away : fixture.score.home) : undefined;

  return (
    <li className="match-card potential" style={{
      background: `linear-gradient(105deg, ${homeColor.bg} 0%, ${homeColor.bg} 45%, var(--surface) 50%, ${awayColor.bg} 55%, ${awayColor.bg} 100%)`,
      borderLeft: `3px solid ${homeColor.accent}`,
      borderRight: `3px solid ${awayColor.accent}`,
    }}>
      {/* Background flags */}
      <span className="team-flag team-flag--home" aria-hidden="true">{flag(country)}</span>
      {opponentKnown && <span className="team-flag team-flag--away" aria-hidden="true">{flag(opponentSlot)}</span>}
      {/* Meta row — matches group game layout */}
      <div className="match-meta">
        <span className="potential-badge">{stageCode(fixture.stage)}</span>
        <span className="potential-label">{fixture.stage}</span>
        <span>{nzt} NZT</span>
        {tvnzLink && <a href={tvnzLink} target="_blank" rel="noreferrer" className="btn-tvnz-inline">📺 TVNZ+</a>}
        <a className="btn-cal-side" href={gcalUrl(fixture, country)} target="_blank" rel="noreferrer" title="Add to Google Calendar">
          <CalIcon />
        </a>
      </div>

      {/* Teams row */}
      <div className="match-body">
        <div className="match-teams">
          <div className="team home tracked">
            <span className="team-name">{country}</span>
            {onInfo && <button className="info-btn" style={{ marginLeft: 6 }} aria-label={`Info about ${country}`} onClick={() => onInfo(country)} />}
          </div>

          <div className="score-block">
            {isScored && myScore !== undefined ? (
              <span className="score">{myScore}–{theirScore}</span>
            ) : (
              <span className="vs">vs</span>
            )}
          </div>

          <div className="team away">
            {opponentKnown ? (
              <>
                {onInfo && <button className="info-btn" style={{ marginRight: 6 }} aria-label={`Info about ${opponentSlot}`} onClick={() => onInfo(opponentSlot)} />}
                <span className="team-name">{opponentSlot}</span>
              </>
            ) : (
              <span className="team-name potential-tbd">{opponentSlot}</span>
            )}
          </div>
        </div>

      </div>

      {/* Candidates row */}
      {candidates.length > 0 && (
        <div className="potential-candidates">
          <span className="potential-candidates-label">Candidates:</span>
          {candidates.map((c) => (
            <span key={c} className="potential-candidate">
              {flag(c)} {c}
              {onInfo && (
                <button className="bracket-cand-info" onClick={() => onInfo(c)} title={`Info: ${c}`} />
              )}
            </span>
          ))}
        </div>
      )}

      {/* Venue row */}
      {fixture.venue && (
        <p className="match-venue">📍 {fixture.venue}{tempForCity(fixture.venue) ? ` · 🌡 ${tempForCity(fixture.venue)}` : ""}</p>
      )}
    </li>
  );
}
