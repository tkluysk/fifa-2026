import { flag, COUNTRY_DATA } from "../countryInfo";

interface Props {
  countries: string[];
  selected: string[];
  onToggle: (country: string) => void;
  onInfo: (country: string) => void;
}

export function CountryPicker({ countries, selected, onToggle, onInfo }: Props) {
  return (
    <div className="picker">
      <p className="picker-label">Track countries</p>
      <div className="picker-chips">
        {countries.map((c) => (
          <span key={c} className={`chip${selected.includes(c) ? " active" : ""}`}>
            <button
              className="chip-toggle"
              onClick={() => onToggle(c)}
              aria-pressed={selected.includes(c)}
            >
              <span className="chip-flag">{flag(c)}</span>
              {c}
            </button>
            {c in COUNTRY_DATA && (
              <button
                className="chip-info"
                aria-label={`Info about ${c}`}
                onClick={(e) => { e.stopPropagation(); onInfo(c); }}
              >
                ⓘ
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
