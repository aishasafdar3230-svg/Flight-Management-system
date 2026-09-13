import { useState } from "react";
import SearchWidget from "../components/SearchWidget";
import "../styles/Home.css";

const DEALS = [
  { icon: "🌍", title: "Global Sale", desc: "20% off all international routes", code: "SUMMER20", badge: "HOT" },
  { icon: "🎁", title: "New User Bonus", desc: "10% off your very first booking", code: "WELCOME10" },
  { icon: "💰", title: "Flat Rs 1000 Off", desc: "On bookings above Rs 20,000", code: "FLAT1000" },
  { icon: "⏰", title: "Early Bird Special", desc: "Book 30 days early, save 15%", code: "EARLYBIRD" },
];

const Home = () => {
  const [copied, setCopied] = useState(null);

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div>
      <section className="hero">
        <svg className="hero-flight-path" viewBox="0 0 600 300" preserveAspectRatio="none" aria-hidden="true">
          <path d="M -20 260 C 150 220, 280 280, 420 160 S 640 40, 660 20" />
          <circle cx="420" cy="160" r="3" />
        </svg>
        <div className="container hero-inner">
          <div className="hero-text">
            <span className="hero-eyebrow">✈ Wingspan Travel</span>
            <h1>Fly Further, Worry Less.</h1>
            <p>Search hundreds of routes, lock in the best fares, and manage every trip from one clean dashboard — powered by Wingspan.</p>
          </div>
          <div className="hero-search">
            <SearchWidget />
          </div>
        </div>
      </section>

      <section className="deals-section">
        <div className="container">
          <h2 className="section-title">Today's Best Deals</h2>
          <p className="section-subtitle">Use these codes at checkout and save on your next trip.</p>
          <div className="deals-grid">
            {DEALS.map((deal) => (
              <div className="card deal-card" key={deal.code}>
                {deal.badge && <span className="deal-badge">{deal.badge}</span>}
                <div className="deal-icon">{deal.icon}</div>
                <h4>{deal.title}</h4>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", marginTop: 6 }}>{deal.desc}</p>
                <div className="deal-code-row">
                  <span>{deal.code}</span>
                  <button onClick={() => copyCode(deal.code)}>{copied === deal.code ? "Copied!" : "Copy"}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="why-section">
        <div className="container">
          <h2 className="section-title">Why Wingspan</h2>
          <p className="section-subtitle">Everything you need for stress-free travel planning.</p>
          <div className="why-grid">
            <div className="card" style={{ padding: 22 }}>
              <div className="deal-icon">🤖</div>
              <h4>AI Travel Assistant</h4>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>Talk or type to our assistant for instant help finding flights and deals.</p>
            </div>
            <div className="card" style={{ padding: 22 }}>
              <div className="deal-icon">🔒</div>
              <h4>Secure Booking</h4>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>Your account and payments are protected end-to-end.</p>
            </div>
            <div className="card" style={{ padding: 22 }}>
              <div className="deal-icon">📊</div>
              <h4>Full Travel History</h4>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>Track every trip, price paid, and status in one dashboard.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
