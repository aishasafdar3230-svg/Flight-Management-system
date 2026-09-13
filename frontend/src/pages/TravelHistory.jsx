import { useEffect, useState } from "react";
import api from "../api/axios";

const statusColor = {
  Booked: { bg: "#e6f7ee", color: "#157347" },
  Cancelled: { bg: "#fef2f2", color: "#b91c1c" },
  Completed: { bg: "#eef2ff", color: "#3730a3" },
};

const TravelHistory = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    setLoading(true);
    const { data } = await api.get("/bookings/my");
    setBookings(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = async (id) => {
    await api.put(`/bookings/${id}/cancel`);
    fetchBookings();
  };

  return (
    <div className="page-wrap container">
      <h2 className="section-title">My Travel History</h2>
      <p className="section-subtitle">All your bookings in one place.</p>

      {loading ? (
        <p>Loading...</p>
      ) : bookings.length === 0 ? (
        <div className="card" style={{ padding: 30, textAlign: "center" }}>No bookings yet — go search for a flight!</div>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-navy)", color: "#fff", textAlign: "left" }}>
                <th style={{ padding: 12 }}>Flight Details</th>
                <th style={{ padding: 12 }}>Route</th>
                <th style={{ padding: 12 }}>Date & Time</th>
                <th style={{ padding: 12 }}>Price Paid</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const flightMissing = !b.flight;
                return (
                  <tr key={b._id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: 12 }}>
                      {flightMissing ? (
                        <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>Flight details unavailable</span>
                      ) : (
                        <>
                          <strong>{b.flight.airline}</strong>
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{b.flight.flightNumber}</div>
                        </>
                      )}
                    </td>
                    <td style={{ padding: 12 }}>
                      {flightMissing ? "—" : `${b.flight.origin} → ${b.flight.destination}`}
                    </td>
                    <td style={{ padding: 12 }}>
                      {flightMissing ? (
                        "—"
                      ) : (
                        <>
                          {new Date(b.flight.departureTime).toLocaleDateString()}
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                            {new Date(b.flight.departureTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </>
                      )}
                    </td>
                    <td style={{ padding: 12, fontWeight: 700 }}>Rs {b.pricePaid?.toLocaleString()}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{ padding: "4px 10px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 600, ...statusColor[b.status] }}>
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>
                      {b.status === "Booked" && (
                        <button className="btn btn-outline" style={{ padding: "6px 12px", fontSize: "0.75rem" }} onClick={() => handleCancel(b._id)}>
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TravelHistory;
