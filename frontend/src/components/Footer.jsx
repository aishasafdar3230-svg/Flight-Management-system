const Footer = () => (
  <footer style={{ background: "var(--color-midnight)", color: "#94a3b8", padding: "26px 0", marginTop: "40px" }}>
    <div className="container" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
      <span>© {new Date().getFullYear()} Wingspan. All rights reserved.</span>
      <span>Built with React, Node.js & MongoDB</span>
    </div>
  </footer>
);

export default Footer;
