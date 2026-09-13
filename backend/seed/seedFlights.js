const dotenv = require("dotenv");
const connectDB = require("../config/db");
const Flight = require("../models/Flight");

dotenv.config();

// City -> Country map. NOTE: countries are stored in plain, commonly-typed English
// spelling ("Turkey", not "Türkiye") on purpose -- the search box lets users type a
// country name, and a diacritic mismatch there silently returns zero results.
const CITY_COUNTRY = {
  Multan: "Pakistan",
  Lahore: "Pakistan",
  Karachi: "Pakistan",
  Islamabad: "Pakistan",
  Peshawar: "Pakistan",
  Quetta: "Pakistan",
  Sialkot: "Pakistan",
  Dubai: "United Arab Emirates",
  "Abu Dhabi": "United Arab Emirates",
  Sharjah: "United Arab Emirates",
  London: "United Kingdom",
  Manchester: "United Kingdom",
  Istanbul: "Turkey",
  Doha: "Qatar",
  Jeddah: "Saudi Arabia",
  Riyadh: "Saudi Arabia",
  Medina: "Saudi Arabia",
  "Kuala Lumpur": "Malaysia",
  Bangkok: "Thailand",
  Toronto: "Canada",
};

// How many upcoming days to generate flights for. Search is an exact-day match, so a
// single hard-coded date (the old approach) goes stale the moment "today" moves past it.
// Generating a rolling window means almost any near-term date a user picks will have flights.
const DAYS_AHEAD = 45;

// Each route lists the airlines that fly it and, per airline, the classes offered with
// their base (day-1) price. Business/First are included wherever real airlines would
// plausibly offer them, so class filters and "show me other airlines" both have real data.
const ROUTES = [
  // ---- Domestic ---- (more airlines per route + Business added to short hops, so a
  // plain city-to-city domestic search no longer looks thin next to the international ones)
  {
    origin: "Multan", destination: "Lahore", duration: 60, stops: 0,
    airlines: [
      { name: "Wingspan Air", code: "WS", num: 101, classes: { Economy: 15000, Business: 28000 } },
      { name: "PIA", code: "PK", num: 212, classes: { Economy: 13500 } },
      { name: "AirBlue", code: "PA", num: 305, classes: { Economy: 12800 } },
      { name: "SereneAir", code: "ER", num: 118, classes: { Economy: 13200 } },
      { name: "AirSial", code: "PF", num: 260, classes: { Economy: 12500 } },
    ],
  },
  {
    origin: "Multan", destination: "Karachi", duration: 120, stops: 0,
    airlines: [
      { name: "Wingspan Air", code: "WS", num: 204, classes: { Economy: 22000, Business: 42000 } },
      { name: "PIA", code: "PK", num: 330, classes: { Economy: 20500 } },
      { name: "AirBlue", code: "PA", num: 412, classes: { Economy: 19800 } },
      { name: "SereneAir", code: "ER", num: 224, classes: { Economy: 19500 } },
    ],
  },
  {
    origin: "Multan", destination: "Islamabad", duration: 75, stops: 0,
    airlines: [
      { name: "Wingspan Air", code: "WS", num: 132, classes: { Economy: 16500, Business: 30000 } },
      { name: "PIA", code: "PK", num: 244, classes: { Economy: 15200 } },
      { name: "AirSial", code: "PF", num: 190, classes: { Economy: 14600 } },
    ],
  },
  {
    origin: "Multan", destination: "Peshawar", duration: 90, stops: 0,
    airlines: [
      { name: "PIA", code: "PK", num: 268, classes: { Economy: 17500 } },
      { name: "AirBlue", code: "PA", num: 349, classes: { Economy: 16800 } },
    ],
  },
  {
    origin: "Lahore", destination: "Karachi", duration: 110, stops: 0,
    airlines: [
      { name: "Wingspan Air", code: "WS", num: 150, classes: { Economy: 21000, Business: 40000 } },
      { name: "PIA", code: "PK", num: 260, classes: { Economy: 19500 } },
      { name: "AirBlue", code: "PA", num: 370, classes: { Economy: 18800 } },
      { name: "SereneAir", code: "ER", num: 132, classes: { Economy: 18500 } },
      { name: "AirSial", code: "PF", num: 305, classes: { Economy: 18200 } },
    ],
  },
  {
    origin: "Lahore", destination: "Islamabad", duration: 55, stops: 0,
    airlines: [
      { name: "Wingspan Air", code: "WS", num: 112, classes: { Economy: 14000, Business: 26000 } },
      { name: "PIA", code: "PK", num: 230, classes: { Economy: 12800 } },
      { name: "AirBlue", code: "PA", num: 318, classes: { Economy: 12200 } },
      { name: "SereneAir", code: "ER", num: 104, classes: { Economy: 12000 } },
    ],
  },
  {
    origin: "Lahore", destination: "Peshawar", duration: 80, stops: 0,
    airlines: [
      { name: "PIA", code: "PK", num: 276, classes: { Economy: 16200 } },
      { name: "AirBlue", code: "PA", num: 388, classes: { Economy: 15600 } },
      { name: "AirSial", code: "PF", num: 214, classes: { Economy: 15200 } },
    ],
  },
  {
    origin: "Karachi", destination: "Islamabad", duration: 130, stops: 0,
    airlines: [
      { name: "Wingspan Air", code: "WS", num: 172, classes: { Economy: 21500, Business: 41000 } },
      { name: "PIA", code: "PK", num: 285, classes: { Economy: 20200 } },
      { name: "AirBlue", code: "PA", num: 395, classes: { Economy: 19600 } },
      { name: "SereneAir", code: "ER", num: 148, classes: { Economy: 19300 } },
    ],
  },
  {
    origin: "Karachi", destination: "Peshawar", duration: 145, stops: 0,
    airlines: [
      { name: "PIA", code: "PK", num: 298, classes: { Economy: 22800 } },
      { name: "AirBlue", code: "PA", num: 406, classes: { Economy: 21900 } },
    ],
  },
  {
    origin: "Islamabad", destination: "Peshawar", duration: 45, stops: 0,
    airlines: [
      { name: "PIA", code: "PK", num: 214, classes: { Economy: 11500 } },
      { name: "SereneAir", code: "ER", num: 96, classes: { Economy: 10900 } },
    ],
  },
  {
    origin: "Karachi", destination: "Quetta", duration: 95, stops: 0,
    airlines: [
      { name: "PIA", code: "PK", num: 322, classes: { Economy: 18500 } },
      { name: "AirSial", code: "PF", num: 240, classes: { Economy: 17800 } },
    ],
  },
  {
    origin: "Lahore", destination: "Sialkot", duration: 40, stops: 0,
    airlines: [
      { name: "AirBlue", code: "PA", num: 356, classes: { Economy: 9800 } },
      { name: "SereneAir", code: "ER", num: 88, classes: { Economy: 9500 } },
    ],
  },

  // ---- UAE ----
  {
    origin: "Peshawar", destination: "Dubai", duration: 175, stops: 0,
    airlines: [
      { name: "Emirates", code: "EK", num: 880, classes: { Economy: 62000, Business: 175000 } },
      { name: "Wingspan Air", code: "WS", num: 340, classes: { Economy: 58000 } },
      { name: "flydubai", code: "FZ", num: 388, classes: { Economy: 54500 } },
    ],
  },
  {
    origin: "Islamabad", destination: "Dubai", duration: 180, stops: 0,
    airlines: [
      { name: "Wingspan Air", code: "WS", num: 310, classes: { Economy: 65000, Business: 150000 } },
      { name: "Emirates", code: "EK", num: 607, classes: { Economy: 71000, Business: 190000, First: 320000 } },
      { name: "PIA", code: "PK", num: 756, classes: { Economy: 59500 } },
      { name: "flydubai", code: "FZ", num: 415, classes: { Economy: 55000 } },
      { name: "Air Arabia", code: "G9", num: 502, classes: { Economy: 51500 } },
    ],
  },
  {
    origin: "Lahore", destination: "Dubai", duration: 195, stops: 0,
    airlines: [
      { name: "Wingspan Air", code: "WS", num: 729, classes: { Economy: 58000, Business: 138000 } },
      { name: "Emirates", code: "EK", num: 624, classes: { Economy: 66500, Business: 182000 } },
      { name: "flydubai", code: "FZ", num: 209, classes: { Economy: 52000 } },
      { name: "Air Arabia", code: "G9", num: 481, classes: { Economy: 49500 } },
    ],
  },
  {
    origin: "Karachi", destination: "Dubai", duration: 150, stops: 0,
    airlines: [
      { name: "Emirates", code: "EK", num: 611, classes: { Economy: 63500, Business: 178000, First: 340000 } },
      { name: "Wingspan Air", code: "WS", num: 244, classes: { Economy: 56000, Business: 132000 } },
      { name: "flydubai", code: "FZ", num: 350, classes: { Economy: 50500 } },
      { name: "Air Arabia", code: "G9", num: 466, classes: { Economy: 48000 } },
    ],
  },
  {
    origin: "Lahore", destination: "Sharjah", duration: 190, stops: 0,
    airlines: [
      { name: "Air Arabia", code: "G9", num: 424, classes: { Economy: 46500 } },
      { name: "Wingspan Air", code: "WS", num: 690, classes: { Economy: 49500 } },
    ],
  },
  {
    origin: "Islamabad", destination: "Abu Dhabi", duration: 185, stops: 0,
    airlines: [
      { name: "Etihad Airways", code: "EY", num: 244, classes: { Economy: 60500, Business: 168000 } },
      { name: "Wingspan Air", code: "WS", num: 512, classes: { Economy: 55000 } },
    ],
  },

  // ---- UK ----
  {
    origin: "Lahore", destination: "London", duration: 540, stops: 1,
    airlines: [
      { name: "Wingspan Air", code: "WS", num: 415, classes: { Economy: 145000, Business: 260000 } },
      { name: "British Airways", code: "BA", num: 259, classes: { Economy: 176000, Business: 310000 } },
      { name: "PIA", code: "PK", num: 791, classes: { Economy: 132000 } },
      { name: "Emirates", code: "EK", num: 613, classes: { Economy: 168000, Business: 298000 } },
    ],
  },
  {
    origin: "Islamabad", destination: "London", duration: 540, stops: 0,
    airlines: [
      { name: "Wingspan Air", code: "WS", num: 618, classes: { Economy: 148000, First: 380000 } },
      { name: "British Airways", code: "BA", num: 262, classes: { Economy: 181000, Business: 320000 } },
      { name: "PIA", code: "PK", num: 803, classes: { Economy: 136000 } },
    ],
  },
  {
    origin: "Karachi", destination: "London", duration: 600, stops: 1,
    airlines: [
      { name: "Wingspan Air", code: "WS", num: 833, classes: { Economy: 168000, Business: 295000 } },
      { name: "Qatar Airways", code: "QR", num: 616, classes: { Economy: 155000, Business: 305000 } },
      { name: "Emirates", code: "EK", num: 602, classes: { Economy: 172000, Business: 312000, First: 520000 } },
    ],
  },
  {
    origin: "Lahore", destination: "Manchester", duration: 560, stops: 1,
    airlines: [
      { name: "Wingspan Air", code: "WS", num: 448, classes: { Economy: 140000, Business: 250000 } },
      { name: "PIA", code: "PK", num: 785, classes: { Economy: 128000 } },
    ],
  },

  // ---- Turkey ----
  {
    origin: "Karachi", destination: "Istanbul", duration: 360, stops: 0,
    airlines: [
      { name: "Wingspan Air", code: "WS", num: 522, classes: { Economy: 98000, Business: 210000 } },
      { name: "Turkish Airlines", code: "TK", num: 716, classes: { Economy: 104500, Business: 240000 } },
      { name: "PIA", code: "PK", num: 785, classes: { Economy: 92000 } },
      { name: "Qatar Airways", code: "QR", num: 118, classes: { Economy: 112000 } },
    ],
  },
  {
    origin: "Lahore", destination: "Istanbul", duration: 370, stops: 0,
    airlines: [
      { name: "Turkish Airlines", code: "TK", num: 704, classes: { Economy: 108000, Business: 245000 } },
      { name: "Wingspan Air", code: "WS", num: 546, classes: { Economy: 101000 } },
      { name: "PIA", code: "PK", num: 812, classes: { Economy: 95500 } },
    ],
  },
  {
    origin: "Islamabad", destination: "Istanbul", duration: 355, stops: 0,
    airlines: [
      { name: "Turkish Airlines", code: "TK", num: 726, classes: { Economy: 106000, Business: 238000 } },
      { name: "Wingspan Air", code: "WS", num: 561, classes: { Economy: 99000 } },
    ],
  },
  {
    origin: "London", destination: "Istanbul", duration: 240, stops: 0,
    airlines: [
      { name: "Turkish Airlines", code: "TK", num: 1979, classes: { Economy: 92000, Business: 210000 } },
      { name: "British Airways", code: "BA", num: 677, classes: { Economy: 98000, Business: 225000 } },
      { name: "Wingspan Air", code: "WS", num: 754, classes: { Economy: 85000 } },
    ],
  },

  // ---- Qatar ----
  {
    origin: "Karachi", destination: "Doha", duration: 150, stops: 0,
    airlines: [
      { name: "Qatar Airways", code: "QR", num: 601, classes: { Economy: 68000, Business: 160000 } },
      { name: "PIA", code: "PK", num: 305, classes: { Economy: 60000 } },
      { name: "Wingspan Air", code: "WS", num: 278, classes: { Economy: 62500 } },
    ],
  },
  {
    origin: "Lahore", destination: "Doha", duration: 165, stops: 0,
    airlines: [
      { name: "Qatar Airways", code: "QR", num: 634, classes: { Economy: 71000, Business: 165000 } },
      { name: "Wingspan Air", code: "WS", num: 291, classes: { Economy: 64500 } },
    ],
  },

  // ---- Saudi Arabia ----
  {
    origin: "Lahore", destination: "Jeddah", duration: 250, stops: 0,
    airlines: [
      { name: "Saudia", code: "SV", num: 754, classes: { Economy: 88000, Business: 195000 } },
      { name: "PIA", code: "PK", num: 743, classes: { Economy: 78000 } },
      { name: "Wingspan Air", code: "WS", num: 364, classes: { Economy: 82000 } },
    ],
  },
  {
    origin: "Karachi", destination: "Riyadh", duration: 220, stops: 0,
    airlines: [
      { name: "Saudia", code: "SV", num: 762, classes: { Economy: 84000, Business: 188000 } },
      { name: "PIA", code: "PK", num: 719, classes: { Economy: 75000 } },
    ],
  },
  {
    origin: "Islamabad", destination: "Medina", duration: 260, stops: 0,
    airlines: [
      { name: "Saudia", code: "SV", num: 771, classes: { Economy: 90000, Business: 198000 } },
      { name: "PIA", code: "PK", num: 727, classes: { Economy: 80000 } },
    ],
  },

  // ---- Southeast Asia ----
  {
    origin: "Islamabad", destination: "Kuala Lumpur", duration: 420, stops: 1,
    airlines: [
      { name: "Wingspan Air", code: "WS", num: 592, classes: { Economy: 118000, Business: 230000 } },
      { name: "PIA", code: "PK", num: 869, classes: { Economy: 108000 } },
    ],
  },
  {
    origin: "Karachi", destination: "Bangkok", duration: 300, stops: 0,
    airlines: [
      { name: "Thai Airways", code: "TG", num: 350, classes: { Economy: 96000, Business: 205000 } },
      { name: "Wingspan Air", code: "WS", num: 481, classes: { Economy: 88000 } },
    ],
  },

  // ---- North America ----
  {
    origin: "Lahore", destination: "Toronto", duration: 900, stops: 1,
    airlines: [
      { name: "Wingspan Air", code: "WS", num: 902, classes: { Economy: 210000, Business: 420000 } },
      { name: "Qatar Airways", code: "QR", num: 774, classes: { Economy: 225000, Business: 460000 } },
    ],
  },
];

// Small deterministic "hash" so each flight gets a stable-but-varied departure hour/price
// wobble instead of everything departing at the same minute or costing the exact same.
const hashOf = (str) => str.split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7);

const buildFlights = () => {
  const flights = [];

  for (const route of ROUTES) {
    // Real airlines fly a route both ways -- a "Karachi -> Istanbul" entry above also
    // implies "Istanbul -> Karachi" exists. Previously only the listed direction was
    // generated, so searching the reverse of ANY route (e.g. the return leg of a trip)
    // silently returned zero flights even though the airline objectively flies it.
    // numOffset keeps the return leg's flight numbers distinct from the outbound ones.
    const directions = [
      { origin: route.origin, destination: route.destination, numOffset: 0 },
      { origin: route.destination, destination: route.origin, numOffset: 1 },
    ];

    for (const dir of directions) {
      const originCountry = CITY_COUNTRY[dir.origin];
      const destinationCountry = CITY_COUNTRY[dir.destination];

      for (const airline of route.airlines) {
        for (const [travelClass, basePrice] of Object.entries(airline.classes)) {
          const flightNum = airline.num + dir.numOffset;
          const seed = hashOf(`${airline.code}${flightNum}${travelClass}`);
          const baseHour = seed % 20; // 0-19, keeps departures out of the 20-23 "red-eye only" band

          for (let day = 1; day <= DAYS_AHEAD; day++) {
            const departureTime = new Date();
            departureTime.setDate(departureTime.getDate() + day);
            departureTime.setHours(baseHour, (seed % 4) * 15, 0, 0);

            const arrivalTime = new Date(departureTime.getTime() + route.duration * 60000);

            // Gentle day-to-day price wobble (+/-6%) so sort-by-price isn't identical every day.
            const wobble = 1 + (((seed + day) % 13) - 6) / 100;
            const price = Math.round((basePrice * wobble) / 100) * 100;

            flights.push({
              flightNumber: `${airline.code}-${flightNum}`,
              airline: airline.name,
              origin: dir.origin,
              originCountry,
              destination: dir.destination,
              destinationCountry,
              departureTime,
              arrivalTime,
              durationMinutes: route.duration,
              price,
              seatsAvailable: 40 + (seed % 80),
              travelClass,
              stops: route.stops,
              tripType: "one-way",
            });
          }
        }
      }
    }
  }

  return flights;
};

const importData = async () => {
  try {
    await connectDB();
    const sampleFlights = buildFlights();
    await Flight.deleteMany();
    await Flight.insertMany(sampleFlights);
    const airlineCount = new Set(sampleFlights.map((f) => f.airline)).size;
    const routeCount = ROUTES.length * 2; // each route now generates both directions
    console.log(
      `Sample flights imported successfully (${sampleFlights.length} flights - ${routeCount} routes (both directions) - ${airlineCount} airlines - next ${DAYS_AHEAD} days)`
    );
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

importData();
