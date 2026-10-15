"use client";

import { useEffect } from "react";

export default function AppRouteError({ error, reset }) {
  useEffect(() => {
    console.error("[DIDIKARA App Route Error Boundary]", error);
  }, [error]);

  return (
    <main className="page-view active" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          padding: "32px 24px",
          borderRadius: "14px",
          background: "var(--bg-card, rgba(20, 28, 48, 0.75))",
          border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px auto",
            color: "var(--danger, #ef4444)",
            fontSize: "1.6rem",
          }}
        >
          ⚠️
        </div>

        <h3
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            marginBottom: "8px",
            color: "var(--text-primary, #f8fafc)",
            fontFamily: "var(--font-heading, 'Outfit', sans-serif)",
          }}
        >
          Gagal Memuat Halaman Ini
        </h3>

        <p
          style={{
            color: "var(--text-secondary, #94a3b8)",
            fontSize: "0.88rem",
            lineHeight: 1.5,
            marginBottom: "20px",
          }}
        >
          Terjadi kesalahan saat memproses data tampilan ini. Navigasi menu tetap
          dapat digunakan, atau Anda dapat mencoba memuat ulang tampilan.
        </p>

        {error?.message && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              background: "rgba(0, 0, 0, 0.25)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "var(--text-muted, #64748b)",
              fontSize: "0.76rem",
              fontFamily: "monospace",
              textAlign: "left",
              marginBottom: "20px",
              wordBreak: "break-all",
            }}
          >
            {error.message}
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              background: "var(--primary-gradient, linear-gradient(135deg, #f97316 0%, #fb923c 100%))",
              color: "#ffffff",
              border: "none",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              minHeight: "44px",
            }}
          >
            Coba Lagi
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/dashboard";
            }}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              background: "transparent",
              color: "var(--text-secondary, #94a3b8)",
              border: "1px solid var(--border-color, rgba(255, 255, 255, 0.15))",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              minHeight: "44px",
            }}
          >
            Ke Dashboard
          </button>
        </div>
      </div>
    </main>
  );
}
