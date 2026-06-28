import { useState } from "react";
import { flag } from "../countryInfo";

interface Props {
  countries: string[];
  selected: string[];
  onToggle: (country: string) => void;
  onInfo: (country: string) => void;
  advancedSet: Set<string>;
  eliminatedSet: Set<string>;
}

export function CountryPicker({ countries, selected, onToggle, onInfo, advancedSet, eliminatedSet }: Props) {
  const [showEliminated, setShowEliminated] = useState(false);

  const visible = countries.filter(c =>
    showEliminated || selected.includes(c) || !eliminatedSet.has(c)
  );

  const eliminatedCount = countries.filter(c => eliminatedSet.has(c) && !selected.includes(c)).length;

  return (
    <div className="picker">
      <div className="picker-header">
        <p className="picker-label">Track countries</p>
        {eliminatedCount > 0 && (
          <button
            className={`picker-elim-toggle${showEliminated ? " picker-elim-toggle--on" : ""}`}
            onClick={() => setShowEliminated(v => !v)}
          >
            {showEliminated ? `Hide eliminated` : `Show eliminated (${eliminatedCount})`}
          </button>
        )}
      </div>
      <div className="picker-chips">
        {visible.map((c) => {
          const isSelected = selected.includes(c);
          const isEliminated = eliminatedSet.has(c);
          const isAdvanced = advancedSet.has(c);
          return (
            <span
              key={c}
              className={`chip${isSelected ? " active" : ""}${isEliminated ? " chip--eliminated" : isAdvanced ? " chip--advanced" : ""}`}
            >
              <button
                className="chip-toggle"
                onClick={() => onToggle(c)}
                aria-pressed={isSelected}
              >
                <span className="chip-flag">{flag(c)}</span>
                {c}
              </button>
              <button
                className="chip-info"
                aria-label={`Info about ${c}`}
                onClick={(e) => { e.stopPropagation(); onInfo(c); }}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}
