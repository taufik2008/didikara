export default function RootLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        background: "var(--bg-primary, #0a0f1d)",
        color: "var(--text-secondary, #94a3b8)",
        fontFamily: "var(--font-body, 'Inter', sans-serif)",
      }}
    >
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          border: "3.5px solid rgba(249, 115, 22, 0.2)",
          borderTopColor: "var(--primary, #f97316)",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <p style={{ fontSize: "0.9rem", fontWeight: 500, margin: 0, letterSpacing: "0.2px" }}>
        Memuat DIDIKARA…
      </p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
