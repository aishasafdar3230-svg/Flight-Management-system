import { useNavigate } from "react-router-dom";
import "../styles/FlightCard.css";

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const initialsOf = (name) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const FlightCard = ({ flight }) => {
  const navigate = useNavigate();

  return (
    <div className="card flight-card">
      <div className="flight-card-left">
        <div className="airline-avatar">{initialsOf(flight.airline)}</div>
        <div>
          <div className="flight-airline-name">{flight.airline}</div>
          <div className="flight-airline-code">{flight.flightNumber}</div>
        </div>
      </div>

      <div className="flight-card-route">
        <div className="flight-time-block">
          <div className="flight-time">{formatTime(flight.departureTime)}</div>
          <div className="flight-city">{flight.origin}</div>
          <div className="flight-country">{flight.originCountry}</div>
        </div>
        <div className="flight-line">
          <div className="flight-duration">
            {Math.floor(flight.durationMinutes / 60)}h {flight.durationMinutes % 60}m
          </div>
          <hr />
          <div className="flight-duration">{flight.stops === 0 ? "Non-stop" : `${flight.stops} stop`}</div>
        </div>
        <div className="flight-time-block">
          <div className="flight-time">{formatTime(flight.arrivalTime)}</div>
          <div className="flight-city">{flight.destination}</div>
          <div className="flight-country">{flight.destinationCountry}</div>
        </div>
      </div>

      <div className="flight-price-block">
        <div className="flight-price">Rs {flight.price.toLocaleString()}</div>
        <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => navigate(`/booking/${flight._id}`)}>
          Select
        </button>
      </div>
    </div>
  );
};

export default FlightCard;
