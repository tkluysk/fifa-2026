import type { PotentialMatch } from "../potentialMatches";
import { countryColor } from "../countryInfo";

interface Props {
  potential: PotentialMatch;
  country: string;
}

function gcalUrlForPotential(p: PotentialMatch, opt: PotentialMatch["options"][0]): string {
  const start = opt.startUtc.replace(/[-:]/g, "").replace(".000", "");
  const endDate = new Date(new Date(opt.startUtc).getTime() + 2 * 60 * 60 * 1000);
  const end = endDate.toISOString().replace(/[-:]/g, "").replace(".000", "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `⚽ [Potential] ${p.stage} — FIFA World Cup 2026`,
    dates: `${start}/${end}`,
    location: opt.venue,
    details: `${opt.condition}\nOpponent: ${opt.opponent}\n\nDate may change depending on group stage results.`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function PotentialMatchCard({ potential, country }: Props) {
  const { accent } = countryColor(country);

  return (
    <li className="match-card potential" style={{ borderLeftColor: accent }}>
      <div className="match-meta">
        <span className="potential-badge">{potential.stageCode}</span>
        <span className="potential-label">{potential.stage}</span>
      </div>

      {potential.options.map((opt, i) => (
        <div key={i} className={`potential-option${potential.options.length > 1 ? " potential-option--multi" : ""}`}>
          {potential.options.length > 1 && (
            <span className="potential-condition">{opt.condition}</span>
          )}

          <div className="match-body">
            <div className="match-teams">
              <div className="team home">
                <span className="team-name">{country}</span>
              </div>
              <div className="score-block">
                <span className="vs">vs</span>
              </div>
              <div className="team away">
                <span className="team-name potential-tbd">{opt.opponent}</span>
              </div>
            </div>

            <a className="btn-cal-side" href={gcalUrlForPotential(potential, opt)} target="_blank" rel="noreferrer" title="Block in Google Calendar">
              <span className="btn-cal-icon">+</span>
              <span className="btn-cal-label">Cal</span>
            </a>
          </div>

          <div className="potential-details">
            <span>🗓 {opt.dateLabel}</span>
            {opt.venue !== "TBD" && <span>📍 {opt.venue}</span>}
          </div>
        </div>
      ))}
    </li>
  );
}
