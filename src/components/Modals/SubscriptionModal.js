"use client";
import { useState, useEffect } from "react";
import { Zap, Check, X, Sparkles, ShieldCheck, Award, BookOpen, Infinity } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function SubscriptionModal() {
  const {
    showSubscriptionModal,
    setShowSubscriptionModal,
    handleEnrollCourse,
    currentUser,
    platformSettings,
  } = useApp();

  const [pricing, setPricing] = useState({
    price: 499000,
  });

  useEffect(() => {
    if (showSubscriptionModal) {
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => {
          if (data?.settings) {
            const rawPrice =
              Number(data.settings.membership_price) ||
              Number(data.settings.membership_monthly_price) ||
              499000;
            setPricing({ price: rawPrice });
          }
        })
        .catch(() => {});
    }
  }, [showSubscriptionModal]);

  if (!showSubscriptionModal) return null;

  const handlePayOneTime = () => {
    const membershipItem = {
      id: "membership-lifetime",
      title: "Paket Akses Kursus Penuh (One-Time Charge)",
      badge: "ONE-TIME CHARGE",
      price: pricing.price,
      priceLabel: `Rp ${pricing.price.toLocaleString("id-ID")} (Sekali Bayar)`,
      desc: "Akses penuh tanpa batas seumur hidup ke seluruh modul pelatihan, kurikulum, kuis, ujian sertifikasi, dan materi presentasi.",
    };
    setShowSubscriptionModal(false);
    handleEnrollCourse(membershipItem);
  };

  const brandName = platformSettings?.platform_name || "DIDIKARA";

  return (
    <div className="modal-overlay active" style={{ zIndex: 9999 }}>
      <div
        className="modal-content glass-panel"
        style={{
          maxWidth: 500,
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "24px 28px",
          border: "1.5px solid var(--border-color)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Header Modal */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 88, 12, 0.05))",
                border: "1px solid rgba(249, 115, 22, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--primary)",
              }}
            >
              <Zap size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>Akses Kursus Penuh</h3>
                <span
                  style={{
                    background: "rgba(249, 115, 22, 0.15)",
                    color: "var(--primary)",
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                  }}
                >
                  ONE-TIME CHARGE
                </span>
              </div>
              <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Akses seluruh kursus di platform {brandName} seumur hidup
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSubscriptionModal(false)}
            aria-label="Tutup Modal"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              padding: 4,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Informasi Wajib Berlangganan (Sekali Bayar) */}
        <div
          style={{
            background: "rgba(249, 115, 22, 0.08)",
            border: "1px solid rgba(249, 115, 22, 0.2)",
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 20,
            fontSize: "0.82rem",
            color: "var(--text-primary)",
            lineHeight: 1.5,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <Sparkles size={18} style={{ color: "var(--primary)", flexShrink: 0, marginTop: 2 }} />
          <div>
            Untuk mengakses materi kursus (baik kelas <strong>Gratis</strong> maupun <strong>Berbayar</strong>), Anda cukup membayar <strong>satu kali (one-time charge)</strong> untuk akses selamanya tanpa biaya iuran bulanan atau tahunan.
          </div>
        </div>

        {/* Kartu Harga One-Time Charge */}
        <div
          style={{
            border: "2px solid var(--primary)",
            background: "linear-gradient(135deg, rgba(249, 115, 22, 0.12), rgba(249, 115, 22, 0.03))",
            borderRadius: 14,
            padding: "20px 24px",
            textAlign: "center",
            marginBottom: 20,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -11,
              left: "50%",
              transform: "translateX(-50%)",
              background: "var(--primary)",
              color: "#ffffff",
              fontSize: "0.65rem",
              fontWeight: 800,
              padding: "3px 12px",
              borderRadius: 20,
              letterSpacing: "0.6px",
              textTransform: "uppercase",
            }}
          >
            Sekali Bayar · Akses Selamanya
          </div>

          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)", marginTop: 4 }}>
            Biaya Aktivasi Sekali Saja (One-Time)
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", margin: "8px 0 4px" }}>
            Rp {pricing.price.toLocaleString("id-ID")}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            ✓ Tanpa langganan bulanan &bull; ✓ Tanpa perpanjangan tahunan &bull; ✓ Akses seumur hidup
          </div>
        </div>

        {/* Daftar Keuntungan */}
        <div className="glass-card" style={{ padding: 16, marginBottom: 22, borderRadius: 10 }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: 12, color: "var(--text-primary)" }}>
            Fasilitas &amp; Keuntungan Termasuk:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "Akses tak terbatas ke SELURUH materi kursus, kurikulum, & video pembelajaran HD",
              "Akses bebas ke kursus free maupun kursus berbayar selamanya",
              "Sertifikat Digital resmi ber-QR Code untuk setiap kelas yang diselesaikan",
              "Akses latihan soal, kuis interaktif, & ujian sertifikasi",
              "Forum diskusi komunitas dan tanya jawab langsung dengan instruktur ahli",
              "Dukungan beragam metode pembayaran aman (Mayar, QRIS, Transfer Bank, E-Wallet)",
            ].map((item, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                <Check size={16} style={{ color: "#34d399", flexShrink: 0, marginTop: 2 }} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowSubscriptionModal(false)}
            style={{ flex: 1, padding: "12px 16px", borderRadius: 8 }}
          >
            Nanti Saja
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePayOneTime}
            style={{
              flex: 2,
              padding: "12px 16px",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontWeight: 700,
            }}
          >
            <Zap size={16} />
            <span>Bayar Sekali &amp; Aktifkan Akses (Rp {(pricing.price / 1000).toFixed(0)}k)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
