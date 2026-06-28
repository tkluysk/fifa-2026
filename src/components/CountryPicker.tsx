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
  return (
    <div className="picker">
      <p className="picker-label">Track countries</p>
      <div className="picker-chips">
        {countries.map((c) => {
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
