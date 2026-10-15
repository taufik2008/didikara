"use client";

import { useEffect } from "react";

export default function RootError({ error, reset }) {
  useEffect(() => {
    // Log galat ke konsol untuk kebutuhan debugging & pemantauan
    console.error("[DIDIKARA Root Error Boundary]", error);
  }, [error]);

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
          maxWidth: "520px",
          width: "100%",
          padding: "36px 28px",
          borderRadius: "16px",
          background: "var(--bg-card, rgba(20, 28, 48, 0.75))",
          border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1.5px solid rgba(239, 68, 68, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px auto",
            color: "var(--danger, #ef4444)",
            fontSize: "2rem",
          }}
        >
          ⚠️
        </div>

        <h2
          style={{
            fontSize: "1.4rem",
            fontWeight: 800,
            marginBottom: "10px",
            fontFamily: "var(--font-heading, 'Outfit', sans-serif)",
            color: "var(--text-primary, #f8fafc)",
          }}
        >
          Terjadi Kendala Teknis
        </h2>

        <p
          style={{
            color: "var(--text-secondary, #94a3b8)",
            fontSize: "0.92rem",
            lineHeight: 1.6,
            marginBottom: "24px",
          }}
        >
          Sistem mendeteksi galat yang tidak terduga pada halaman ini.
          Silakan coba memuat ulang atau kembali ke halaman utama platform.
        </p>

        {error?.message && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "var(--text-muted, #64748b)",
              fontSize: "0.78rem",
              fontFamily: "monospace",
              textAlign: "left",
              marginBottom: "24px",
              overflowX: "auto",
              wordBreak: "break-all",
            }}
          >
            {error.message}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              background: "var(--primary-gradient, linear-gradient(135deg, #f97316 0%, #fb923c 100%))",
              color: "#ffffff",
              border: "none",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(249, 115, 22, 0.35)",
              minHeight: "44px",
            }}
          >
            Coba Lagi
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              background: "transparent",
              color: "var(--text-secondary, #94a3b8)",
              border: "1px solid var(--border-color, rgba(255, 255, 255, 0.15))",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              minHeight: "44px",
            }}
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
}
