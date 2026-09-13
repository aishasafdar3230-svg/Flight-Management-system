const Booking = require("../models/Booking");
const Flight = require("../models/Flight");

const PROMO_CODES = {
  SUMMER20: 0.2,
  WELCOME10: 0.1,
  FLAT1000: 1000, // flat rupees off
  EARLYBIRD: 0.15,
};

// @desc  Create a booking
// @route POST /api/bookings
const createBooking = async (req, res) => {
  try {
    const { flightId, passengers, travelClass, promoCode } = req.body;

    const flight = await Flight.findById(flightId);
    if (!flight) return res.status(404).json({ message: "Flight not found" });

    const totalPassengers =
      (passengers?.adults || 1) + (passengers?.children || 0) + (passengers?.infants || 0);

    if (flight.seatsAvailable < totalPassengers) {
      return res.status(400).json({ message: "Not enough seats available" });
    }

    let basePrice = flight.price * totalPassengers;
    let amountSaved = 0;

    if (promoCode && PROMO_CODES[promoCode.toUpperCase()]) {
      const discount = PROMO_CODES[promoCode.toUpperCase()];
      if (discount < 1) {
        amountSaved = Math.round(basePrice * discount);
      } else {
        amountSaved = discount;
      }
    }

    const pricePaid = Math.max(basePrice - amountSaved, 0);

    const booking = await Booking.create({
      user: req.user._id,
      flight: flight._id,
      passengers,
      travelClass: travelClass || flight.travelClass,
      pricePaid,
      promoCodeUsed: promoCode || null,
      amountSaved,
    });

    flight.seatsAvailable -= totalPassengers;
    await flight.save();

    const populated = await booking.populate("flight");
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get logged-in user's travel history
// @route GET /api/bookings/my
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate("flight")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Cancel a booking
// @route PUT /api/bookings/:id/cancel
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    booking.status = "Cancelled";
    await booking.save();
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createBooking, getMyBookings, cancelBooking, PROMO_CODES };
