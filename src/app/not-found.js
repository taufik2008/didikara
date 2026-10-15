import Link from "next/link";

export default function RootNotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--bg-primary, #0a0f1d)",
        color: "var(--text-primary, #f8fafc)",
        fontFamily: "var(--font-body, 'Inter', sans-serif)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          maxWidth: "500px",
          width: "100%",
          padding: "40px 24px",
          borderRadius: "16px",
          background: "var(--bg-card, rgba(20, 28, 48, 0.75))",
          border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            fontSize: "4rem",
            fontWeight: 900,
            lineHeight: 1,
            marginBottom: "12px",
            background: "var(--primary-gradient, linear-gradient(135deg, #f97316 0%, #fb923c 100%))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontFamily: "var(--font-heading, 'Outfit', sans-serif)",
          }}
        >
          404
        </div>

        <h1
          style={{
            fontSize: "1.4rem",
            fontWeight: 700,
            marginBottom: "12px",
            color: "var(--text-primary, #f8fafc)",
            fontFamily: "var(--font-heading, 'Outfit', sans-serif)",
          }}
        >
          Halaman Tidak Ditemukan
        </h1>

        <p
          style={{
            color: "var(--text-secondary, #94a3b8)",
            fontSize: "0.92rem",
            lineHeight: 1.6,
            marginBottom: "28px",
          }}
        >
          Tautan yang Anda tuju mungkin salah ketik, telah dipindahkan, atau
          sudah tidak lagi tersedia di sistem platform DIDIKARA.
        </p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/"
            style={{
              padding: "10px 22px",
              borderRadius: "10px",
              background: "var(--primary-gradient, linear-gradient(135deg, #f97316 0%, #fb923c 100%))",
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "0.9rem",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(249, 115, 22, 0.35)",
              minHeight: "44px",
            }}
          >
            Kembali ke Beranda
          </Link>

          <Link
            href="/dashboard"
            style={{
              padding: "10px 22px",
              borderRadius: "10px",
              background: "transparent",
              color: "var(--text-secondary, #94a3b8)",
              textDecoration: "none",
              border: "1px solid var(--border-color, rgba(255, 255, 255, 0.15))",
              fontWeight: 600,
              fontSize: "0.9rem",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "44px",
            }}
          >
            Buka Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
