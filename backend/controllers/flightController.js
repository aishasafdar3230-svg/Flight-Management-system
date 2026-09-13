const Flight = require("../models/Flight");

// A handful of common short forms people actually type, so "UK", "UAE", "USA" etc.
// resolve to the full country name stored in the DB instead of matching nothing.
const COUNTRY_ALIASES = {
  uk: "United Kingdom",
  "u.k.": "United Kingdom",
  england: "United Kingdom",
  britain: "United Kingdom",
  uae: "United Arab Emirates",
  "u.a.e.": "United Arab Emirates",
  emirates: "United Arab Emirates",
  turkiye: "Turkey",
  pak: "Pakistan",
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Turns whatever the user typed into a single case-insensitive "contains" pattern.
// This is what lets someone just type "Pakistan" (or "pakistan", "PAKISTAN ", "pak")
// into a plain text box and get every flight that touches that country or city,
// instead of needing an exact/anchored match to one specific spelling.
const buildLocationMatch = (raw) => {
  const trimmed = raw.trim();
  const alias = COUNTRY_ALIASES[trimmed.toLowerCase()];
  const safe = escapeRegex(alias || trimmed);
  return new RegExp(safe, "i");
};

// @desc  Search/list flights with filters
// @route GET /api/flights?origin=&destination=&date=&travelClass=&sortBy=&stops=&airline=
// "origin"/"destination" are free text -- each can be a city ("Multan") or a country
// ("Pakistan"); we match it against both the city and country fields so either works
// from a single plain input box, which is what actually fixes tickets not showing up.
const searchFlights = async (req, res) => {
  try {
    const { origin, destination, date, travelClass, sortBy, sortOrder, stops, airline, maxPrice } = req.query;
    const and = [];

    if (origin && origin.trim()) {
      const match = buildLocationMatch(origin);
      and.push({ $or: [{ origin: match }, { originCountry: match }] });
    }

    if (destination && destination.trim()) {
      const match = buildLocationMatch(destination);
      and.push({ $or: [{ destination: match }, { destinationCountry: match }] });
    }

    // "airline" is a comma-separated list from the sidebar checkboxes (e.g. "PIA,Emirates"),
    // so a person can tick more than one airline at once instead of picking just one.
    if (airline && airline.trim()) {
      const names = airline
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      if (names.length) {
        and.push({ airline: { $in: names.map((n) => new RegExp(`^${escapeRegex(n)}$`, "i")) } });
      }
    }
    if (travelClass) and.push({ travelClass });
    if (stops === "non-stop") and.push({ stops: 0 });
    if (stops === "1-stop") and.push({ stops: 1 });
    if (maxPrice && !Number.isNaN(Number(maxPrice))) and.push({ price: { $lte: Number(maxPrice) } });

    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      and.push({ departureTime: { $gte: start, $lt: end } });
    }

    const query = and.length ? { $and: and } : {};

    // "sortOrder" flips the direction of whichever field "sortBy" picks -- without this,
    // every sort was hard-coded to ascending (1) and there was no way to view flights in
    // reverse (e.g. latest departure first, or most expensive first).
    const direction = sortOrder === "desc" ? -1 : 1;
    let sortField = "departureTime";
    if (sortBy === "price") sortField = "price";
    if (sortBy === "duration") sortField = "durationMinutes";
    if (sortBy === "departureTime") sortField = "departureTime";
    const sort = { [sortField]: direction };

    const flights = await Flight.find(query).sort(sort);
    res.json(flights);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get single flight
// @route GET /api/flights/:id
const getFlightById = async (req, res) => {
  try {
    const flight = await Flight.findById(req.params.id);
    if (!flight) return res.status(404).json({ message: "Flight not found" });
    res.json(flight);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Create a flight (admin/seed use)
// @route POST /api/flights
const createFlight = async (req, res) => {
  try {
    const flight = await Flight.create(req.body);
    res.status(201).json(flight);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  List distinct cities available (for search dropdowns)
// @route GET /api/flights/meta/cities
const getCities = async (req, res) => {
  try {
    const origins = await Flight.distinct("origin");
    const destinations = await Flight.distinct("destination");
    const cities = [...new Set([...origins, ...destinations])].sort();
    res.json(cities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  List countries with the cities served in each (for the country-level search UI)
// @route GET /api/flights/meta/countries
const getCountries = async (req, res) => {
  try {
    const flights = await Flight.find({}, "origin originCountry destination destinationCountry");
    const map = {};

    flights.forEach((f) => {
      if (!map[f.originCountry]) map[f.originCountry] = new Set();
      map[f.originCountry].add(f.origin);
      if (!map[f.destinationCountry]) map[f.destinationCountry] = new Set();
      map[f.destinationCountry].add(f.destination);
    });

    const countries = Object.keys(map)
      .sort()
      .map((country) => ({ country, cities: [...map[country]].sort() }));

    res.json(countries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  List distinct airlines (for the results-page filter)
// @route GET /api/flights/meta/airlines?origin=&destination=
// When origin/destination are passed, only airlines that actually serve that route are
// returned -- otherwise the sidebar lists airlines (e.g. a domestic-only carrier) that can
// never produce a result for the current search, which looks like a broken checkbox.
const getAirlines = async (req, res) => {
  try {
    const { origin, destination } = req.query;
    const and = [];
    if (origin && origin.trim()) {
      const match = buildLocationMatch(origin);
      and.push({ $or: [{ origin: match }, { originCountry: match }] });
    }
    if (destination && destination.trim()) {
      const match = buildLocationMatch(destination);
      and.push({ $or: [{ destination: match }, { destinationCountry: match }] });
    }
    const query = and.length ? { $and: and } : {};
    const airlines = await Flight.distinct("airline", query);
    res.json(airlines.sort());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { searchFlights, getFlightById, createFlight, getCities, getCountries, getAirlines };
