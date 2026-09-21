/**
 * /verify/[certId]
 * Halaman publik verifikasi sertifikat — tidak memerlukan login.
 * Menampilkan status keabsahan, masa berlaku (recertification cycle), dan detail kompetensi.
 */

import Link from "next/link";

async function getCertificate(certId) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/verify/${encodeURIComponent(certId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.certificate || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { certId } = await params;
  return {
    title: `Verifikasi Sertifikat Resmi — DIDIKARA`,
    description: `Verifikasi keaslian dan masa berlaku sertifikat kompetensi DIDIKARA ID ${certId}`,
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
      maxWidth: 620,
      width: "100%",
      overflow: "hidden",
    },
    header: {
      background: "linear-gradient(135deg, #1e3a8a, #ea580c)",
      padding: "32px 40px",
      textAlign: "center",
      color: "white",
    },
    logoText: {
      fontSize: "1.6rem",
      fontWeight: 800,
      letterSpacing: "-0.02em",
      marginBottom: 4,
    },
    subLogo: {
      fontSize: "0.8rem",
      opacity: 0.9,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      fontWeight: 600,
    },
    body: {
      padding: "32px 36px",
    },
    statusBadgeActive: {
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
      marginBottom: 20,
    },
    statusBadgeExpiring: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      background: "rgba(245,158,11,0.1)",
      border: "1.5px solid rgba(245,158,11,0.4)",
      borderRadius: 24,
      padding: "6px 16px",
      color: "#d97706",
      fontWeight: 700,
      fontSize: "0.85rem",
      marginBottom: 20,
    },
    statusBadgeExpired: {
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
      marginBottom: 20,
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
      marginBottom: 16,
    },
    titleValue: {
      fontSize: "1.15rem",
      fontWeight: 800,
      color: "#1e3a8a",
      marginBottom: 18,
      lineHeight: 1.4,
    },
    idBox: {
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      padding: "10px 14px",
      fontFamily: "monospace",
      fontSize: "0.88rem",
      color: "#475569",
      letterSpacing: "0.05em",
      wordBreak: "break-all",
      marginBottom: 16,
    },
    footer: {
      borderTop: "1px solid #e2e8f0",
      padding: "16px 36px",
      background: "#f8fafc",
      textAlign: "center",
      fontSize: "0.75rem",
      color: "#94a3b8",
    },
    divider: {
      borderTop: "1px solid #f1f5f9",
      margin: "4px 0 16px 0",
    },
  };

  if (!cert) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.logoText}>LMS PINTAR</div>
            <div style={styles.subLogo}>Sistem Verifikasi Sertifikat Resmi</div>
          </div>
          <div style={{ ...styles.body, textAlign: "center", padding: "40px 30px" }}>
            <div style={styles.statusBadgeExpired}>
              <span>✕</span> Sertifikat Tidak Ditemukan
            </div>
            <h2 style={{ color: "#1e293b", marginBottom: 12 }}>Data Sertifikat Tidak Valid</h2>
            <p style={{ color: "#64748b", lineHeight: 1.6, fontSize: "0.9rem" }}>
              ID sertifikat <strong style={{ fontFamily: "monospace", color: "#1e3a8a" }}>{certId}</strong> tidak
              ditemukan dalam basis data registrasi kami. Pastikan tautan atau QR Code yang Anda pindai sudah benar.
            </p>
          </div>
          <div style={styles.footer}>
            Diterbitkan oleh PT. SDI & Lembaga Sertifikasi © 2026
          </div>
        </div>
      </div>
    );
  }

  const isExpired = cert.status === "EXPIRED";
  const isExpiring = cert.status === "EXPIRING_SOON";

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoText}>LMS PINTAR</div>
          <div style={styles.subLogo}>Sistem Verifikasi Sertifikat &amp; Kompetensi Nasional</div>
        </div>

        <div style={styles.body}>
          {/* Status Badge */}
          {isExpired ? (
            <div style={styles.statusBadgeExpired}>
              <span>⚠️</span> Masa Berlaku Telah Berakhir (Kedaluwarsa)
            </div>
          ) : isExpiring ? (
            <div style={styles.statusBadgeExpiring}>
              <span>⏳</span> {cert.statusLabel || "Segera Berakhir"}
            </div>
          ) : (
            <div style={styles.statusBadgeActive}>
              <span>✓</span> Sertifikat Sah &amp; Aktif Terdaftar
            </div>
          )}

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

          <span style={styles.label}>Program Sertifikasi &amp; Pelatihan</span>
          <div style={styles.titleValue}>{cert.title}</div>

          <div style={styles.divider} />

          {/* Grid Masa Berlaku & Terbit */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
            <div>
              <span style={styles.label}>Tanggal Terbit</span>
              <div style={{ ...styles.value, fontSize: "0.9rem" }}>{cert.date}</div>
            </div>
            <div>
              <span style={styles.label}>Masa Berlaku Hingga</span>
              <div style={{ ...styles.value, fontSize: "0.9rem", color: isExpired ? "#dc2626" : isExpiring ? "#d97706" : "#059669" }}>
                {cert.validUntil || "3 Tahun Sejak Terbit"}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
            <div>
              <span style={styles.label}>Lembaga Penerbit</span>
              <div style={{ ...styles.value, fontSize: "0.85rem" }}>{cert.issuer || "DIDIKARA"}</div>
            </div>
            <div>
              <span style={styles.label}>Standar Sertifikasi</span>
              <div style={{ ...styles.value, fontSize: "0.85rem" }}>{cert.accreditation || "BNSP / Standar Profesi"}</div>
            </div>
          </div>

          <span style={styles.label}>Kode ID Verifikasi Digital</span>
          <div style={styles.idBox}>{cert.idCode || cert.id}</div>

          {/* Recertification Action if Expired / Expiring */}
          {(isExpired || isExpiring) && (
            <div style={{
              marginTop: 12, padding: "14px 18px", borderRadius: 8,
              background: isExpired ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)",
              border: `1px solid ${isExpired ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`,
              textAlign: "center",
            }}>
              <p style={{ fontSize: "0.82rem", color: isExpired ? "#b91c1c" : "#b45309", margin: "0 0 10px 0", fontWeight: 600 }}>
                {isExpired
                  ? "Sertifikat ini telah melewati batas 3 tahun masa berlaku. Ikuti program uji resertifikasi kompetensi untuk memperbarui sertifikat Anda."
                  : "Masa berlaku sertifikat Anda akan segera berakhir. Lakukan perpanjangan sertifikasi kompetensi tepat waktu."}
              </p>
              <Link
                href="/marketplace"
                style={{
                  display: "inline-block", padding: "6px 16px", borderRadius: 6,
                  background: isExpired ? "#dc2626" : "#ea580c", color: "#fff",
                  textDecoration: "none", fontSize: "0.8rem", fontWeight: 700,
                }}>
                🔄 Ambil Uji Resertifikasi
              </Link>
            </div>
          )}
        </div>

        <div style={styles.footer}>
          Dokumen ini diverifikasi secara digital oleh sistem integritas DIDIKARA &nbsp;|&nbsp;
          DIDIKARA Platform Nasional © 2026
        </div>
      </div>
    </div>
  );
}
