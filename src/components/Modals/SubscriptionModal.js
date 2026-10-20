"use client";
import { useState, useEffect } from "react";
import { Zap, Check, X, ShieldCheck, Sparkles, Award, BookOpen, Layers } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function SubscriptionModal() {
  const {
    showSubscriptionModal,
    setShowSubscriptionModal,
    handleEnrollCourse,
    currentUser,
    platformSettings,
  } = useApp();

  const [plan, setPlan] = useState("annual"); // "monthly" | "annual"
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState({
    monthlyPrice: 149000,
    annualPrice: 999000,
    annualBadge: "HEMAT 44%",
  });

  useEffect(() => {
    if (showSubscriptionModal) {
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => {
          if (data?.settings) {
            setPricing({
              monthlyPrice: Number(data.settings.membership_monthly_price) || 149000,
              annualPrice: Number(data.settings.membership_annual_price) || 999000,
              annualBadge: data.settings.membership_annual_badge || "HEMAT 44%",
            });
          }
        })
        .catch(() => {});
    }
  }, [showSubscriptionModal]);

  if (!showSubscriptionModal) return null;

  const handleSelectPlanAndPay = () => {
    const isAnnual = plan === "annual";
    const finalPrice = isAnnual ? pricing.annualPrice : pricing.monthlyPrice;
    const membershipItem = {
      id: `membership-${plan}`,
      title: `Paket Langganan All-Access (${isAnnual ? "Tahunan" : "Bulanan"})`,
      badge: "ALL-ACCESS MEMBERSHIP",
      price: finalPrice,
      priceLabel: `Rp ${finalPrice.toLocaleString("id-ID")} / ${isAnnual ? "tahun" : "bulan"}`,
      desc: "Akses tanpa batas ke seluruh program pelatihan, modul kurikulum, ujian akhir, dan sertifikat resmi.",
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
          maxWidth: 540,
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
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>Langganan Belajar</h3>
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
                  ALL-ACCESS
                </span>
              </div>
              <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Akses seluruh kursus di platform {brandName} tanpa batasan
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

        {/* Informasi Wajib Berlangganan */}
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
            Untuk mengakses materi kursus (baik kursus <strong>Gratis</strong> maupun <strong>Berbayar</strong>), Anda wajib memiliki status langganan aktif.
          </div>
        </div>

        {/* Pemilih Paket: Bulanan vs Tahunan */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
          {/* Bulanan */}
          <div
            onClick={() => setPlan("monthly")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setPlan("monthly"); }}
            style={{
              border: `2px solid ${plan === "monthly" ? "var(--primary)" : "var(--border-color)"}`,
              background: plan === "monthly" ? "rgba(249, 115, 22, 0.1)" : "rgba(255, 255, 255, 0.02)",
              borderRadius: 12,
              padding: 16,
              cursor: "pointer",
              transition: "all 0.2s ease",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>Paket Bulanan</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 6 }}>
              Rp {pricing.monthlyPrice.toLocaleString("id-ID")}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>/ bulan (Fleksibel)</div>
          </div>

          {/* Tahunan */}
          <div
            onClick={() => setPlan("annual")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setPlan("annual"); }}
            style={{
              border: `2px solid ${plan === "annual" ? "var(--primary)" : "var(--border-color)"}`,
              background: plan === "annual" ? "rgba(249, 115, 22, 0.1)" : "rgba(255, 255, 255, 0.02)",
              borderRadius: 12,
              padding: 16,
              cursor: "pointer",
              transition: "all 0.2s ease",
              textAlign: "center",
              position: "relative",
            }}
          >
            {pricing.annualBadge && (
              <div
                style={{
                  position: "absolute",
                  top: -10,
                  right: 12,
                  background: "var(--primary)",
                  color: "#ffffff",
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 20,
                  letterSpacing: "0.5px",
                }}
              >
                {pricing.annualBadge}
              </div>
            )}
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--primary)" }}>Paket Tahunan ⭐</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 6 }}>
              Rp {pricing.annualPrice.toLocaleString("id-ID")}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
              / tahun (~Rp {Math.round(pricing.annualPrice / 12 / 1000)}rb/bln)
            </div>
          </div>
        </div>

        {/* Daftar Keuntungan */}
        <div className="glass-card" style={{ padding: 16, marginBottom: 22, borderRadius: 10 }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: 12, color: "var(--text-primary)" }}>
            Fasilitas &amp; Keuntungan Langganan:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "Akses penuh tanpa batas ke SELURUH modul kursus, video pembelajaran, & materi slide",
              "Sertifikat Digital resmi ber-QR Code untuk setiap kelas yang diselesaikan",
              "Akses latihan soal, kuis interaktif, & ujian sertifikasi",
              "Forum diskusi komunitas dan tanya jawab dengan instruktur ahli",
              "Dukungan beragam metode pembayaran (QRIS, Mayar, Transfer Bank, E-Wallet)",
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
            onClick={handleSelectPlanAndPay}
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
            <span>
              Berlangganan Sekarang ({plan === "annual" ? `Rp ${(pricing.annualPrice / 1000).toFixed(0)}k/Thn` : `Rp ${(pricing.monthlyPrice / 1000).toFixed(0)}k/Bln`})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
