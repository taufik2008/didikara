"use client";

import { useEffect } from "react";
import { captureException } from "@/lib/errorTracker";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    captureException(error, { source: "global-error.js" });
  }, [error]);

  return (
    <html lang="id">
      <head>
        <title>Sistem Sedang Mengalami Kendala — DIDIKARA</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          padding: "24px",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0f1d",
          color: "#f8fafc",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: "500px",
            width: "100%",
            padding: "36px 24px",
            borderRadius: "16px",
            background: "rgba(20, 28, 48, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div
            style={{
              fontSize: "2.8rem",
              marginBottom: "16px",
            }}
          >
            ⚠️
          </div>

          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              marginBottom: "12px",
              color: "#f8fafc",
            }}
          >
            Kendala Kritis Sistem
          </h1>

          <p
            style={{
              color: "#94a3b8",
              fontSize: "0.95rem",
              lineHeight: 1.6,
              marginBottom: "24px",
            }}
          >
            Kerangka dasar platform DIDIKARA mendeteksi galat yang menghentikan render.
            Silakan tekan tombol di bawah untuk menyegarkan sesi.
          </p>

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
                padding: "10px 24px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
                color: "#ffffff",
                border: "none",
                fontWeight: 700,
                fontSize: "0.92rem",
                cursor: "pointer",
                minHeight: "44px",
              }}
            >
              Muat Ulang Aplikasi
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              style={{
                padding: "10px 24px",
                borderRadius: "10px",
                background: "transparent",
                color: "#94a3b8",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                fontWeight: 600,
                fontSize: "0.92rem",
                cursor: "pointer",
                minHeight: "44px",
              }}
            >
              Ke Halaman Depan
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
