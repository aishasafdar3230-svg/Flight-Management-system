const express = require("express");
const {
  searchFlights,
  getFlightById,
  createFlight,
  getCities,
  getCountries,
  getAirlines,
} = require("../controllers/flightController");

const router = express.Router();

router.get("/", searchFlights);
router.get("/meta/cities", getCities);
router.get("/meta/countries", getCountries);
router.get("/meta/airlines", getAirlines);
router.get("/:id", getFlightById);
router.post("/", createFlight);

module.exports = router;
