"use client";
import { useState } from "react";
import { X, Printer, ExternalLink, Download, Loader } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function CertModal() {
  const { certModalActive, activeCert, currentUser, setCertModalActive } = useApp();
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (!activeCert) return;
    setDownloadingPdf(true);
    try {
      const res = await fetch(`/api/certificate/pdf?certId=${encodeURIComponent(activeCert.idCode)}`);
      if (!res.ok) throw new Error("Gagal generate PDF");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `Sertifikat-${activeCert.idCode}.pdf`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (err) {
      alert("Gagal download PDF: " + err.message);
    }
    setDownloadingPdf(false);
  };

  // Buat URL verifikasi publik — pakai window.location.origin agar dinamis
  const verifyUrl = activeCert
    ? (typeof window !== "undefined"
        ? `${window.location.origin}/verify/${activeCert.idCode}`
        : `/verify/${activeCert.idCode}`)
    : "";

  // QR code via API publik — tidak perlu install library
  const qrUrl = verifyUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(verifyUrl)}&bgcolor=ffffff&color=000000&margin=4`
    : "";

  return (
    <div className={`modal-overlay ${certModalActive ? "active" : ""}`}>
      {activeCert && (
        <div className="modal-content glass-panel" style={{ width: 860, maxWidth: "95%" }}>
          <h3 style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Digital Wallet - Sertifikat Kompetensi</span>
            <X size={20} style={{ cursor: "pointer" }} onClick={() => setCertModalActive(false)} />
          </h3>

          <div id="certificate-print-area" className="cert-document">
            <div className="cert-document-header">
              <h2 style={{ fontFamily: "Outfit", color: "#1e3a8a", textAlign: "center" }}>Trisakti AI Solutions</h2>
              <p style={{ fontSize: "0.85rem", color: "#475569", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", textAlign: "center" }}>
                National Human Capital Intelligence Ecosystem
              </p>
              <div style={{ width: 100, height: 2, backgroundColor: "#4f46e5", margin: "12px auto 0 auto" }} />
            </div>

            <div className="cert-document-body" style={{ textAlign: "center", marginTop: 24 }}>
              <p style={{ fontSize: "1.1rem", color: "#475569", fontStyle: "italic", marginBottom: 12 }}>Diberikan secara terhormat kepada:</p>
              <div className="cert-recipient">{currentUser?.fullname}</div>
              <p style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.6, maxWidth: 550, margin: "12px auto" }}>
                Atas kelulusan dan keberhasilan menyelesaikan program pelatihan profesional dan sertifikasi keahlian pada topik:
              </p>
              <h3 style={{ fontSize: "1.4rem", color: "#1e3a8a", margin: "16px 0", fontFamily: "Outfit" }}>{activeCert.title}</h3>
              <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
                Diverifikasi secara digital pada tanggal <span>{activeCert.date}</span><br />
                ID Sertifikat: <span style={{ fontFamily: "monospace" }}>{activeCert.idCode}</span>
              </p>
            </div>

            <div className="cert-footer-layout">
              {/* QR Code — mengarah ke halaman verifikasi publik */}
              <div style={{ textAlign: "left" }}>
                {qrUrl ? (
                  <img
                    src={qrUrl}
                    alt="QR Verifikasi Sertifikat"
                    width={80}
                    height={80}
                    style={{ border: "2px solid #94a3b8", borderRadius: 4, display: "block" }}
                    onError={(e) => {
                      // Fallback jika QR API tidak tersedia
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                {/* Fallback kotak kosong jika gambar gagal */}
                <div style={{
                  display: qrUrl ? "none" : "flex",
                  border: "2px solid #94a3b8", width: 60, height: 60,
                  padding: 2, alignItems: "center", justifyContent: "center"
                }}>
                  <div style={{ width: "100%", height: "100%", border: "2px solid black", background: "#eee" }} />
                </div>
                <span style={{ fontSize: "0.62rem", color: "#64748b", display: "block", marginTop: 4, maxWidth: 80 }}>
                  Pindai untuk Verifikasi
                </span>
              </div>

              <div style={{ display: "flex", gap: 40 }}>
                <div className="cert-signature">
                  <div className="cert-signature-img">Prof. Dr. Kadir</div>
                  <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: 4, fontWeight: 700, color: "#1e293b" }}>Universitas Trisakti</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Academic Partner</div>
                </div>
                <div className="cert-signature">
                  <div className="cert-signature-img">Royal Artindo</div>
                  <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: 4, fontWeight: 700, color: "#1e293b" }}>PT Royal Artindo Kreasi</div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Technology Partner</div>
                </div>
              </div>
            </div>
          </div>

          {/* Info URL verifikasi */}
          {verifyUrl && (
            <div style={{ marginTop: 16, padding: "8px 14px", borderRadius: 6, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", gap: 8, fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              <ExternalLink size={12} style={{ color: "#a5b4fc", flexShrink: 0 }} />
              <span>URL Verifikasi Publik:</span>
              <a href={verifyUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#a5b4fc", fontFamily: "monospace", wordBreak: "break-all" }}>{verifyUrl}</a>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="btn btn-secondary"
              style={{ width: "auto", padding: "8px 16px", display: "flex", alignItems: "center", gap: 6 }}>
              {downloadingPdf ? <Loader size={14} className="spin" /> : <Download size={14} />}
              {downloadingPdf ? "Membuat PDF..." : "Download PDF"}
            </button>
            <button
              onClick={() => window.print()}
              className="btn btn-primary"
              style={{ width: "auto", padding: "8px 16px", display: "flex", alignItems: "center", gap: 6 }}>
              <Printer size={14} /> Cetak
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
