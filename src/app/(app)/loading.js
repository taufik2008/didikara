export default function AppRouteLoading() {
  return (
    <main className="page-view active" style={{ padding: "24px" }}>
      {/* Skeleton Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <div className="skeleton" style={{ width: "220px", height: "28px", borderRadius: "8px", marginBottom: "8px" }} />
          <div className="skeleton" style={{ width: "320px", height: "16px", borderRadius: "6px" }} />
        </div>
        <div className="skeleton" style={{ width: "120px", height: "38px", borderRadius: "8px" }} />
      </div>

      {/* Skeleton Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              padding: "20px",
              borderRadius: "14px",
              background: "var(--bg-card, rgba(20, 28, 48, 0.7))",
              border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
            }}
          >
            <div className="skeleton" style={{ width: "40px", height: "40px", borderRadius: "10px", marginBottom: "12px" }} />
            <div className="skeleton" style={{ width: "60%", height: "24px", borderRadius: "6px", marginBottom: "8px" }} />
            <div className="skeleton" style={{ width: "40%", height: "14px", borderRadius: "4px" }} />
          </div>
        ))}
      </div>

      {/* Skeleton Content Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
        }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              padding: "20px",
              borderRadius: "14px",
              background: "var(--bg-card, rgba(20, 28, 48, 0.7))",
              border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
            }}
          >
            <div className="skeleton" style={{ width: "100%", height: "140px", borderRadius: "10px", marginBottom: "16px" }} />
            <div className="skeleton" style={{ width: "80%", height: "20px", borderRadius: "6px", marginBottom: "10px" }} />
            <div className="skeleton" style={{ width: "100%", height: "14px", borderRadius: "4px", marginBottom: "6px" }} />
            <div className="skeleton" style={{ width: "70%", height: "14px", borderRadius: "4px" }} />
          </div>
        ))}
      </div>
    </main>
  );
}
