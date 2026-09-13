import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import PlaceAutocomplete from "./PlaceAutocomplete";
import PassengerSelector from "./PassengerSelector";
import "../styles/SearchWidget.css";

const MAX_LEGS = 5;
const MIN_LEGS = 2;
const emptyLeg = () => ({ origin: "", destination: "", date: "" });

const SearchWidget = () => {
  const navigate = useNavigate();
  const [tripType, setTripType] = useState("one-way");

  // Suggestions only -- these are NOT required to submit a search. They come from the
  // real flight data (GET /flights/meta/countries) purely so the dropdown under each
  // box shows real places as you type. Whatever text is actually in the box is what
  // gets searched, even if you never picked a suggestion.
  const [countries, setCountries] = useState([]); // [{ country, cities: [...] }]

  // Used for one-way / round-trip.
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [returnDate, setReturnDate] = useState("");

  // Used for multi-city -- each leg is its own From/To/Date, searched and shown as its
  // own section on the results page (real airlines sell multi-city as separate tickets
  // per leg too, so each leg gets booked individually).
  const [legs, setLegs] = useState([emptyLeg(), emptyLeg()]);

  const [passengers, setPassengers] = useState({ adults: 1, childCount: 0, infants: 0, travelClass: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/flights/meta/countries")
      .then(({ data }) => setCountries(data))
      .catch((err) => console.error(err));
  }, []);

  const swapCities = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const updateLeg = (index, field, value) => {
    setLegs((prev) => prev.map((leg, i) => (i === index ? { ...leg, [field]: value } : leg)));
  };

  const swapLeg = (index) => {
    setLegs((prev) =>
      prev.map((leg, i) => (i === index ? { ...leg, origin: leg.destination, destination: leg.origin } : leg))
    );
  };

  const addLeg = () => {
    if (legs.length >= MAX_LEGS) return;
    // Prefill the new leg's "From" with the previous leg's "To" -- multi-city trips are
    // usually a chain (A→B, B→C, C→D), so this saves re-typing the city each time.
    setLegs((prev) => [...prev, { origin: prev[prev.length - 1]?.destination || "", destination: "", date: "" }]);
  };

  const removeLeg = (index) => {
    if (legs.length <= MIN_LEGS) return;
    setLegs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSearch = (e) => {
    e.preventDefault();

    if (tripType === "multi-city") {
      const cleanedLegs = legs.map((leg) => ({
        origin: leg.origin.trim(),
        destination: leg.destination.trim(),
        date: leg.date,
      }));
      const incomplete = cleanedLegs.some((leg) => !leg.origin || !leg.destination || !leg.date);
      if (incomplete) {
        setError("Please fill in the From, To and Date for every flight.");
        return;
      }
      setError("");

      const params = new URLSearchParams({
        tripType: "multi-city",
        legs: JSON.stringify(cleanedLegs),
        adults: passengers.adults,
        children: passengers.childCount,
        infants: passengers.infants,
        travelClass: passengers.travelClass,
      });
      navigate(`/flights?${params.toString()}`);
      return;
    }

    if (!origin.trim() || !destination.trim()) {
      setError("Please enter both a From and To city or country.");
      return;
    }
    setError("");

    const params = new URLSearchParams({
      origin: origin.trim(),
      destination: destination.trim(),
      date,
      tripType,
      returnDate: tripType === "round-trip" ? returnDate : "",
      adults: passengers.adults,
      children: passengers.childCount,
      infants: passengers.infants,
      travelClass: passengers.travelClass,
    });

    navigate(`/flights?${params.toString()}`);
  };

  return (
    <form className="card search-widget" onSubmit={handleSearch}>
      <div className="search-tabs">
        {["one-way", "round-trip", "multi-city"].map((type) => (
          <button
            type="button"
            key={type}
            className={`search-tab ${tripType === type ? "active" : ""}`}
            onClick={() => setTripType(type)}
          >
            {type === "one-way" ? "One-way" : type === "round-trip" ? "Round-trip" : "Multi-city"}
          </button>
        ))}
      </div>

      {tripType !== "multi-city" ? (
        <>
          <div className="search-row search-row-places">
            <PlaceAutocomplete
              label="From"
              value={origin}
              onChange={setOrigin}
              placeholder="City or country"
              countries={countries}
            />

            <button type="button" className="swap-btn" onClick={swapCities} title="Swap">
              ⇄
            </button>

            <PlaceAutocomplete
              label="To"
              value={destination}
              onChange={setDestination}
              placeholder="City or country"
              countries={countries}
            />
          </div>

          <div className="search-row">
            <div className="field">
              <label className="label">Departure</label>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            {tripType === "round-trip" && (
              <div className="field">
                <label className="label">Return</label>
                <input
                  type="date"
                  className="input"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="multi-city-legs">
          {legs.map((leg, index) => (
            <div className="multi-city-leg" key={index}>
              <div className="multi-city-leg-header">
                <span>Flight {index + 1}</span>
                {legs.length > MIN_LEGS && (
                  <button
                    type="button"
                    className="multi-city-remove-btn"
                    onClick={() => removeLeg(index)}
                    title="Remove this flight"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="search-row search-row-places">
                <PlaceAutocomplete
                  label="From"
                  value={leg.origin}
                  onChange={(val) => updateLeg(index, "origin", val)}
                  placeholder="City or country"
                  countries={countries}
                />

                <button type="button" className="swap-btn" onClick={() => swapLeg(index)} title="Swap">
                  ⇄
                </button>

                <PlaceAutocomplete
                  label="To"
                  value={leg.destination}
                  onChange={(val) => updateLeg(index, "destination", val)}
                  placeholder="City or country"
                  countries={countries}
                />
              </div>

              <div className="search-row">
                <div className="field">
                  <label className="label">Departure</label>
                  <input
                    type="date"
                    className="input"
                    value={leg.date}
                    onChange={(e) => updateLeg(index, "date", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}

          {legs.length < MAX_LEGS && (
            <button type="button" className="multi-city-add-btn" onClick={addLeg}>
              + Add another flight
            </button>
          )}
        </div>
      )}

      <div className="search-row">
        <PassengerSelector
          adults={Number(passengers.adults)}
          childCount={Number(passengers.childCount)}
          infants={Number(passengers.infants)}
          travelClass={passengers.travelClass}
          onChange={setPassengers}
        />
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 14 }}>{error}</div>}

      <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
        🔍 Search Flights
      </button>
    </form>
  );
};

export default SearchWidget;
