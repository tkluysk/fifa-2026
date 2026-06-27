import { STAGES } from "../countryInfo";
import { flag } from "../countryInfo";

interface Props {
  countries: string[];
  // In future: pass current stage per country from live data
}

// All Group G teams are still in the group stage
const CURRENT_STAGE_ID = "group";

export function TournamentPath({ countries }: Props) {
  const currentIdx = STAGES.findIndex((s) => s.id === CURRENT_STAGE_ID);

  return (
    <div className="tournament-path-wrap">
      <p className="picker-label">Path to glory</p>
      <div className="tournament-path">
        {STAGES.map((stage, idx) => {
          const isPast = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isFuture = idx > currentIdx;

          return (
            <div key={stage.id} className="path-item">
              {idx > 0 && (
                <div className={`path-connector${isPast || isCurrent ? " path-connector--active" : ""}`} />
              )}
              <div className={`path-node${isCurrent ? " path-node--current" : ""}${isPast ? " path-node--past" : ""}${isFuture ? " path-node--future" : ""}`}>
                {isPast ? "✓" : isCurrent ? "●" : "○"}
              </div>
              <div className={`path-label${isCurrent ? " path-label--current" : ""}${isFuture ? " path-label--future" : ""}`}>
                {stage.label}
              </div>
              {isCurrent && countries.length > 0 && (
                <div className="path-flags">
                  {countries.map((c) => (
                    <span key={c} title={c}>{flag(c)}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
