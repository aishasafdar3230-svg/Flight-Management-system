import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import FlightCard from "../components/FlightCard";

// Must stay at/above the highest fare in the seed data (Business/First on long-haul
// routes can reach ~520,000) -- otherwise those flights are silently excluded from
// every search by default, even before the user ever touches the slider.
const MAX_PRICE_CEILING = 600000;

const FlightResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tripType = searchParams.get("tripType") || "one-way";
  const travelClassParam = searchParams.get("travelClass") || "";

  // ---- Multi-city mode: "legs" is a JSON array of { origin, destination, date }. Each
  // leg is searched and shown as its own section, and booked as its own ticket -- same
  // as real airlines, which issue separate tickets per leg on a multi-city itinerary.
  const legsParam = searchParams.get("legs");
  const legs = useMemo(() => {
    if (!legsParam) return null;
    try {
      const parsed = JSON.parse(legsParam);
      return Array.isArray(parsed) && parsed.length ? parsed : null;
    } catch {
      return null;
    }
  }, [legsParam]);

  const [legResults, setLegResults] = useState([]); // [{ flights, loading }]

  useEffect(() => {
    if (!legs) return;
    setLegResults(legs.map(() => ({ flights: [], loading: true })));

    legs.forEach((leg, index) => {
      api
        .get("/flights", {
          params: {
            origin: leg.origin,
            destination: leg.destination,
            date: leg.date,
            travelClass: travelClassParam,
            sortBy: "departureTime",
          },
        })
        .then(({ data }) => {
          setLegResults((prev) => prev.map((entry, i) => (i === index ? { flights: data, loading: false } : entry)));
        })
        .catch((err) => {
          console.error(err);
          setLegResults((prev) => prev.map((entry, i) => (i === index ? { flights: [], loading: false } : entry)));
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legsParam]);

  // ---- Normal one-way / round-trip mode ----
  const [flights, setFlights] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("departureTime");
  const [sortOrder, setSortOrder] = useState("asc");
  const [stops, setStops] = useState("");
  const [selectedAirlines, setSelectedAirlines] = useState([]);
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE_CEILING);
  const [travelClass, setTravelClass] = useState(travelClassParam);
  const [origin, setOrigin] = useState(searchParams.get("origin") || "");
  const [destination, setDestination] = useState(searchParams.get("destination") || "");
  const date = searchParams.get("date") || "";

  useEffect(() => {
    if (legs) return;
    api
      .get("/flights/meta/airlines", { params: { origin, destination } })
      .then(({ data }) => setAirlines(data))
      .catch((err) => console.error(err));
    setSelectedAirlines([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, legs]);

  useEffect(() => {
    if (legs) return;
    const fetchFlights = async () => {
      setLoading(true);
      try {
        const params = {
          origin,
          destination,
          date,
          sortBy,
          sortOrder,
          stops,
          airline: selectedAirlines.join(","),
          travelClass,
          maxPrice,
        };
        const { data } = await api.get("/flights", { params });
        setFlights(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, date, sortBy, sortOrder, stops, selectedAirlines, travelClass, maxPrice, legs]);

  const handleModifySearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams({ origin, destination, date, travelClass });
    navigate(`/flights?${params.toString()}`);
  };

  const toggleAirline = (name) => {
    setSelectedAirlines((prev) => (prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]));
  };

  const clearFilters = () => {
    setSelectedAirlines([]);
    setMaxPrice(MAX_PRICE_CEILING);
    setStops("");
    setTravelClass("");
  };

  // ---- Multi-city render ----
  if (legs) {
    const allLoaded = legResults.length === legs.length && legResults.every((r) => !r.loading);
    const totalFound = legResults.reduce((sum, r) => sum + (r.flights?.length || 0), 0);

    return (
      <div className="page-wrap container">
        <h2 className="section-title">Multi-city Trip</h2>
        <p className="section-subtitle">
          {legs.length} flight{legs.length > 1 ? "s" : ""} in this trip
          {allLoaded ? ` · ${totalFound} flight(s) found in total` : " · searching..."}
        </p>

        {legs.map((leg, index) => {
          const entry = legResults[index] || { flights: [], loading: true };
          return (
            <div className="card" style={{ padding: 20, marginBottom: 20 }} key={index}>
              <h3 style={{ marginBottom: 2 }}>
                Flight {index + 1}: {leg.origin} → {leg.destination}
              </h3>
              <p className="section-subtitle" style={{ marginBottom: 14 }}>
                {leg.date ? new Date(leg.date).toLocaleDateString() : ""} ·{" "}
                {entry.loading ? "searching..." : `${entry.flights.length} flight(s) found`}
              </p>

              {entry.loading ? (
                <p>Loading flights...</p>
              ) : entry.flights.length === 0 ? (
                <div className="card" style={{ padding: 24, textAlign: "center" }}>
                  <p>No flights found for this leg. Try a different date, city, or country.</p>
                </div>
              ) : (
                entry.flights.map((flight) => <FlightCard key={flight._id} flight={flight} />)
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ---- Normal one-way / round-trip render ----
  return (
    <div className="page-wrap container">
      <h2 className="section-title">Available Flights</h2>
      <p className="section-subtitle">
        {origin && destination ? `${origin} → ${destination}` : "All routes"} · {flights.length} flight(s) found
      </p>

      <form className="card modify-search-bar" onSubmit={handleModifySearch}>
        <div className="modify-search-field">
          <label className="label">From</label>
          <input className="input" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="City or country" />
        </div>
        <div className="modify-search-field">
          <label className="label">To</label>
          <input className="input" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="City or country" />
        </div>
        <button type="submit" className="btn btn-accent">
          Modify Search
        </button>
      </form>

      <div className="results-layout">
        <aside className="card filter-sidebar">
          <div className="filter-group">
            <h4 className="filter-group-title">Airlines</h4>
            {airlines.map((a) => (
              <label className="filter-checkbox-row" key={a}>
                <input type="checkbox" checked={selectedAirlines.includes(a)} onChange={() => toggleAirline(a)} />
                <span>{a}</span>
              </label>
            ))}
          </div>

          <div className="filter-group">
            <h4 className="filter-group-title">Max Price</h4>
            <input
              type="range"
              className="price-slider"
              min="10000"
              max={MAX_PRICE_CEILING}
              step="5000"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
            />
            <div className="price-slider-value">Rs. {Number(maxPrice).toLocaleString()}</div>
          </div>

          <div className="filter-group">
            <h4 className="filter-group-title">Class</h4>
            <select className="input" value={travelClass} onChange={(e) => setTravelClass(e.target.value)}>
              <option value="">All classes</option>
              <option value="Economy">Economy</option>
              <option value="Business">Business</option>
              <option value="First">First</option>
            </select>
          </div>

          <div className="filter-group">
            <h4 className="filter-group-title">Stops</h4>
            <select className="input" value={stops} onChange={(e) => setStops(e.target.value)}>
              <option value="">All flights</option>
              <option value="non-stop">Non-stop</option>
              <option value="1-stop">1 Stop</option>
            </select>
          </div>

          <button type="button" className="btn btn-outline" style={{ width: "100%" }} onClick={clearFilters}>
            Clear All
          </button>
        </aside>

        <div className="results-main">
          <div className="results-toolbar">
            <select className="input sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="departureTime">Sort by: Departure</option>
              <option value="price">Sort by: Price</option>
              <option value="duration">Sort by: Duration</option>
            </select>
            <button
              type="button"
              className="btn btn-outline sort-order-btn"
              onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
              title={sortOrder === "asc" ? "Ascending (low to high) - click to reverse" : "Descending (high to low) - click to reverse"}
            >
              {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
            </button>
          </div>

          {loading ? (
            <p>Loading flights...</p>
          ) : flights.length === 0 ? (
            <div className="card" style={{ padding: 30, textAlign: "center" }}>
              <p>No flights found for this search. Try a different airline, class, city/country, or date.</p>
            </div>
          ) : (
            flights.map((flight) => <FlightCard key={flight._id} flight={flight} />)
          )}
        </div>
      </div>
    </div>
  );
};

export default FlightResults;
