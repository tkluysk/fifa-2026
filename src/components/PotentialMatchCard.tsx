import type { KnockoutFixture, GroupStandingsMap } from "../hooks/useLiveData";
import { resolveSlot } from "../hooks/useLiveData";
import { countryColor, flag } from "../countryInfo";
import { tempForCity } from "../cityTemps";

const TVNZ_BASE = "https://www.tvnz.co.nz";

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

export function PotentialMatchCard({ fixture, country, groupStandingsMap, onInfo }: Props) {
  const { accent } = countryColor(country);
  const isHome = fixture.home.toLowerCase() === country.toLowerCase();
  const opponentSlot = isHome ? fixture.away : fixture.home;
  const opponentKnown = isKnownTeam(opponentSlot);

  // Resolve slot to candidate teams from live standings
  const candidates = opponentKnown ? [] : resolveSlot(opponentSlot, groupStandingsMap);
  const tvnzLink = fixture.tvnzPath ? `${TVNZ_BASE}${fixture.tvnzPath}` : null;

  const nzt = new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    weekday: "short", day: "numeric", month: "short",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(fixture.startUtc));

  return (
    <li className="match-card potential" style={{ borderLeftColor: accent }}>
      <div className="match-meta">
        <span className="potential-badge">{stageCode(fixture.stage)}</span>
        <span className="potential-label">{fixture.stage}</span>
      </div>

      <div className="match-body">
        <div className="match-teams">
          <div className="team home">
            <span className="team-name">{flag(country)} {country}</span>
          </div>
          <div className="score-block">
            {fixture.score ? (
              <span className="score">
                {isHome ? fixture.score.home : fixture.score.away}
                –
                {isHome ? fixture.score.away : fixture.score.home}
              </span>
            ) : (
              <span className="vs">vs</span>
            )}
          </div>
          <div className="team away">
            {opponentKnown ? (
              <span className="team-name">{flag(opponentSlot)} {opponentSlot}</span>
            ) : (
              <span className="team-name potential-tbd">{opponentSlot}</span>
            )}
          </div>
        </div>

        <a className="btn-cal-side" href={gcalUrl(fixture, country)} target="_blank" rel="noreferrer" title="Block in Google Calendar">
          <span className="btn-cal-icon">+</span>
          <span className="btn-cal-label">Cal</span>
        </a>
      </div>

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

      <div className="potential-details">
        <span>🗓 {nzt} NZT</span>
        {fixture.venue && <span>📍 {fixture.venue}{tempForCity(fixture.venue) ? ` · 🌡 ${tempForCity(fixture.venue)}` : ""}</span>}
        {tvnzLink && <a href={tvnzLink} target="_blank" rel="noreferrer" className="btn-tvnz-inline">📺 TVNZ+</a>}
      </div>
    </li>
  );
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
