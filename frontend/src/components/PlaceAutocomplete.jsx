import { useEffect, useRef, useState } from "react";

// A plain text box you can type into (e.g. "Pakistan", "Multan", "dubai") that shows a
// live list of matching cities/countries as you type, built from the real flight data.
// Picking a suggestion isn't required -- whatever text is left in the box on submit is
// sent to the backend as-is, which now does a case-insensitive "contains" match against
// both the city and country fields. So typing "Pakistan" and hitting search works even
// if no suggestion was ever clicked.
const PlaceAutocomplete = ({ label, value, onChange, placeholder, countries }) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef(null);

  // Flatten the country -> cities map into one suggestion list: every country once,
  // plus every city once, each tagged with the country it belongs to.
  const allOptions = (() => {
    const options = [];
    countries.forEach(({ country, cities }) => {
      options.push({ label: country, sub: `Whole country`, key: `country:${country}` });
      cities.forEach((city) => options.push({ label: city, sub: country, key: `city:${city}:${country}` }));
    });
    return options;
  })();

  const query = value.trim().toLowerCase();
  const suggestions =
    query.length === 0
      ? []
      : allOptions.filter((opt) => opt.label.toLowerCase().includes(query)).slice(0, 8);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const pick = (opt) => {
    onChange(opt.label);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      pick(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="field place-field" ref={wrapRef}>
      <label className="label">{label}</label>
      <input
        className="input place-input"
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && suggestions.length > 0 && (
        <ul className="place-suggestions">
          {suggestions.map((opt, i) => (
            <li
              key={opt.key}
              className={`place-suggestion-item ${i === activeIndex ? "active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault(); // keep input focus, avoid blur closing list before click registers
                pick(opt);
              }}
            >
              <span className="place-suggestion-main">{opt.label}</span>
              <span className="place-suggestion-sub">{opt.sub}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PlaceAutocomplete;
