import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export const metadata = {
  title: "Dokumen Legalitas & Kepatuhan — DIDIKARA",
  description: "Kebijakan Privasi dan Ketentuan Layanan resmi platform pelatihan dan sertifikasi DIDIKARA.",
};

export default function LegalLayout({ children }) {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary, #090d16)", color: "var(--text-primary, #f8fafc)", display: "flex", flexDirection: "column" }}>
      {/* Top Navbar */}
      <header
        style={{
          borderBottom: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
          backgroundColor: "rgba(15, 23, 42, 0.8)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding: "16px 24px",
        }}
      >
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--text-secondary, #94a3b8)",
              textDecoration: "none",
              fontSize: "0.88rem",
              fontWeight: 600,
              transition: "color 0.2s ease",
            }}
          >
            <ArrowLeft size={18} />
            <span>Kembali ke Beranda</span>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <Shield size={16} />
            </div>
            <span style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "0.02em" }}>
              DIDIKARA <span style={{ color: "#38bdf8", fontWeight: 600, fontSize: "0.85rem" }}>LEGAL</span>
            </span>
          </div>

          <div style={{ display: "flex", gap: 16, fontSize: "0.85rem" }}>
            <Link
              href="/legal/privasi"
              style={{ color: "var(--text-secondary, #94a3b8)", textDecoration: "none", fontWeight: 500 }}
            >
              Privasi
            </Link>
            <Link
              href="/legal/syarat-ketentuan"
              style={{ color: "var(--text-secondary, #94a3b8)", textDecoration: "none", fontWeight: 500 }}
            >
              Ketentuan
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "48px 24px", maxWidth: 900, margin: "0 auto", width: "100%", lineHeight: 1.7 }}>
        {children}
      </main>

      {/* Legal Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
          padding: "24px",
          textAlign: "center",
          fontSize: "0.8rem",
          color: "var(--text-muted, #64748b)",
          backgroundColor: "rgba(10, 15, 29, 0.5)",
        }}
      >
        <p>© 2026 DIDIKARA. Seluruh hak cipta dilindungi undang-undang Republik Indonesia.</p>
      </footer>
    </div>
  );
}
