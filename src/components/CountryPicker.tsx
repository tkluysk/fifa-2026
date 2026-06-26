interface Props {
  countries: string[];
  selected: string[];
  onToggle: (country: string) => void;
}

export function CountryPicker({ countries, selected, onToggle }: Props) {
  return (
    <div className="picker">
      <p className="picker-label">Track countries</p>
      <div className="picker-chips">
        {countries.map((c) => (
          <button
            key={c}
            className={`chip${selected.includes(c) ? " active" : ""}`}
            onClick={() => onToggle(c)}
            aria-pressed={selected.includes(c)}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
