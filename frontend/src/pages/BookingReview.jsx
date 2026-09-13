import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const BookingReview = () => {
  const { flightId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [flight, setFlight] = useState(null);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [travelClass, setTravelClass] = useState("Economy");
  const [promoCode, setPromoCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/flights/${flightId}`).then(({ data }) => {
      setFlight(data);
      setTravelClass(data.travelClass);
    });
  }, [flightId]);

  const totalPassengers = Number(adults) + Number(children) + Number(infants);
  const estimatedTotal = flight ? flight.price * totalPassengers : 0;

  const handleConfirm = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post("/bookings", {
        flightId,
        passengers: { adults: Number(adults), children: Number(children), infants: Number(infants) },
        travelClass,
        promoCode: promoCode || undefined,
      });
      navigate(`/confirmation/${data._id}`, { state: { booking: data } });
    } catch (err) {
      setError(err.response?.data?.message || "Booking failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!flight) return <div className="page-wrap container">Loading flight details...</div>;

  return (
    <div className="page-wrap container" style={{ maxWidth: 640 }}>
      <div className="card booking-review-card" style={{ padding: 28 }}>
        <h2 className="section-title">Review & Confirm</h2>
        <p className="section-subtitle">Please verify your flight details before proceeding.</p>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, fontSize: "0.9rem" }}>
          <div>
            <strong>{flight.airline}</strong> <span style={{ color: "#94a3b8" }}>· {flight.flightNumber}</span>
            <div style={{ color: "var(--color-text-muted)", marginTop: 4 }}>
              {flight.origin} → {flight.destination}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div>{new Date(flight.departureTime).toLocaleDateString()}</div>
            <div style={{ color: "var(--color-text-muted)" }}>{new Date(flight.departureTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        </div>

        <div className="booking-passenger-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 18 }}>
          <div>
            <label className="label">Adults</label>
            <input type="number" min="1" className="input" value={adults} onChange={(e) => setAdults(e.target.value)} />
          </div>
          <div>
            <label className="label">Children</label>
            <input type="number" min="0" className="input" value={children} onChange={(e) => setChildren(e.target.value)} />
          </div>
          <div>
            <label className="label">Infants</label>
            <input type="number" min="0" className="input" value={infants} onChange={(e) => setInfants(e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label className="label">Travel Class</label>
          <select className="input" value={travelClass} onChange={(e) => setTravelClass(e.target.value)}>
            <option>Economy</option>
            <option>Business</option>
            <option>First</option>
          </select>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label className="label">Promo Code (optional)</label>
          <input className="input" placeholder="e.g. WELCOME10" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} />
        </div>

        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 14, marginBottom: 18, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
          <span>Estimated Total</span>
          <span>Rs {estimatedTotal.toLocaleString()}</span>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleConfirm} disabled={submitting}>
          {submitting ? "Booking..." : "Confirm Booking"}
        </button>
      </div>
    </div>
  );
};

export default BookingReview;
