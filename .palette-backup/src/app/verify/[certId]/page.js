/**
 * /verify/[certId]
 * Halaman publik verifikasi sertifikat — tidak memerlukan login.
 * Diakses via QR code atau link langsung.
 */

import { notFound } from "next/navigation";

async function getCertificate(certId) {
  try {
    // Pada build time / SSR, gunakan URL absolut
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/verify/${encodeURIComponent(certId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.valid ? data.certificate : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { certId } = await params;
  return {
    title: `Verifikasi Sertifikat — NHCIE`,
    description: `Verifikasi keaslian sertifikat kompetensi NHCIE dengan ID ${certId}`,
  };
}

export default async function VerifyPage({ params }) {
  const { certId } = await params;
  const cert = await getCertificate(certId);

  const styles = {
    page: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Outfit', 'Inter', sans-serif",
      padding: "40px 16px",
    },
    card: {
      background: "white",
      borderRadius: 16,
      boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
      maxWidth: 600,
      width: "100%",
      overflow: "hidden",
    },
    header: {
      background: "linear-gradient(135deg, #1e3a8a, #4f46e5)",
      padding: "32px 40px",
      textAlign: "center",
      color: "white",
    },
    logoText: {
      fontSize: "1.5rem",
      fontWeight: 800,
      letterSpacing: "-0.02em",
      marginBottom: 4,
    },
    subLogo: {
      fontSize: "0.8rem",
      opacity: 0.8,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
    },
    body: {
      padding: "36px 40px",
    },
    validBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      background: "rgba(16,185,129,0.1)",
      border: "1.5px solid rgba(16,185,129,0.4)",
      borderRadius: 24,
      padding: "6px 16px",
      color: "#059669",
      fontWeight: 700,
      fontSize: "0.85rem",
      marginBottom: 24,
    },
    invalidBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      background: "rgba(239,68,68,0.1)",
      border: "1.5px solid rgba(239,68,68,0.4)",
      borderRadius: 24,
      padding: "6px 16px",
      color: "#dc2626",
      fontWeight: 700,
      fontSize: "0.85rem",
      marginBottom: 24,
    },
    label: {
      fontSize: "0.72rem",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      color: "#64748b",
      marginBottom: 4,
      display: "block",
    },
    value: {
      fontSize: "1rem",
      fontWeight: 700,
      color: "#1e293b",
      marginBottom: 20,
    },
    titleValue: {
      fontSize: "1.1rem",
      fontWeight: 700,
      color: "#1e3a8a",
      marginBottom: 20,
    },
    idBox: {
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      padding: "12px 16px",
      fontFamily: "monospace",
      fontSize: "0.9rem",
      color: "#475569",
      letterSpacing: "0.05em",
      wordBreak: "break-all",
    },
    footer: {
      borderTop: "1px solid #e2e8f0",
      padding: "16px 40px",
      background: "#f8fafc",
      textAlign: "center",
      fontSize: "0.75rem",
      color: "#94a3b8",
    },
    divider: {
      borderTop: "1px solid #f1f5f9",
      margin: "4px 0 20px 0",
    },
  };

  if (!cert) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.logoText}>NHCIE</div>
            <div style={styles.subLogo}>National Human Capital Intelligence Ecosystem</div>
          </div>
          <div style={{ ...styles.body, textAlign: "center" }}>
            <div style={styles.invalidBadge}>
              <span>✕</span> Sertifikat Tidak Valid
            </div>
            <h2 style={{ color: "#1e293b", marginBottom: 12 }}>Sertifikat Tidak Ditemukan</h2>
            <p style={{ color: "#64748b", lineHeight: 1.6 }}>
              ID sertifikat <strong style={{ fontFamily: "monospace", color: "#1e3a8a" }}>{certId}</strong> tidak
              ditemukan dalam sistem kami. Pastikan kode yang Anda gunakan benar.
            </p>
          </div>
          <div style={styles.footer}>
            Diterbitkan oleh Trisakti AI Solutions © 2026 &nbsp;|&nbsp; nhcie.go.id
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoText}>NHCIE</div>
          <div style={styles.subLogo}>National Human Capital Intelligence Ecosystem</div>
        </div>

        <div style={styles.body}>
          <div style={styles.validBadge}>
            <span>✓</span> Sertifikat Terverifikasi &amp; Valid
          </div>

          {cert.recipientName && (
            <>
              <span style={styles.label}>Pemegang Sertifikat</span>
              <div style={styles.value}>{cert.recipientName}</div>
            </>
          )}

          {cert.organization && (
            <>
              <span style={styles.label}>Instansi / Organisasi</span>
              <div style={{ ...styles.value, fontSize: "0.95rem" }}>{cert.organization}</div>
            </>
          )}

          <span style={styles.label}>Program Pelatihan yang Diselesaikan</span>
          <div style={styles.titleValue}>{cert.title}</div>

          <div style={styles.divider} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <div>
              <span style={styles.label}>Tanggal Terbit</span>
              <div style={{ ...styles.value, fontSize: "0.9rem" }}>{cert.date}</div>
            </div>
            <div>
              <span style={styles.label}>Diterbitkan Oleh</span>
              <div style={{ ...styles.value, fontSize: "0.9rem" }}>Trisakti AI Solutions</div>
            </div>
          </div>

          <span style={styles.label}>ID Verifikasi Sertifikat</span>
          <div style={styles.idBox}>{cert.idCode}</div>
        </div>

        <div style={styles.footer}>
          Dokumen ini diverifikasi secara digital oleh sistem NHCIE &nbsp;|&nbsp;
          Trisakti AI Solutions © 2026
        </div>
      </div>
    </div>
  );
}
