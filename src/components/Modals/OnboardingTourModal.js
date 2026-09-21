"use client";
import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Award, BookOpen, ShieldCheck, CreditCard, Sparkles, CheckCircle } from "lucide-react";

const TOUR_STEPS = [
  {
    icon: BookOpen,
    title: "1. Katalog Pelatihan & Instruktur Ahli",
    desc: "Jelajahi beragam program pelatihan bersertifikasi standar BNSP & LKPP. Cari materi berdasarkan kategori atau pilih kelas langsung dari instruktur favorit Anda.",
    tip: "Gunakan filter 'Berdasarkan Instruktur Ahli' untuk melihat profil dan kelas mentor terbaik."
  },
  {
    icon: Sparkles,
    title: "2. Ruang Kelas & Pemutar Video Interaktif",
    desc: "Belajar fleksibel dengan pemutar video pintar: atur kecepatan putar (0.75x - 2x), lompat mundur/maju 10 detik, dan buat catatan berpenanda waktu (timestamped notes).",
    tip: "Posisi belajar Anda otomatis disimpan sehingga Anda dapat melanjutkan kapan saja tanpa terputus."
  },
  {
    icon: ShieldCheck,
    title: "3. Asesmen & Ujian Sertifikasi Terproteksi",
    desc: "Uji pemahaman Anda melalui kuis modul dan Ujian Akhir Sertifikasi dengan sistem proteksi integritas (anti-cheating) dan pengacakan soal di server.",
    tip: "Fokus pada layar selama ujian berlangsung untuk menjaga integritas asesmen Anda."
  },
  {
    icon: Award,
    title: "4. Digital Wallet & Klaim Sertifikat Resmi",
    desc: "Setelah seluruh modul selesai dan lulus passing score, klaim sertifikat digital Anda dengan QR-Code verifikasi resmi yang dapat langsung diunduh dalam format PDF.",
    tip: "Sertifikat tersimpan aman di menu 'Digital Wallet' dan dapat dicetak kapan saja."
  }
];

export default function OnboardingTourModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) setCurrentStep(0);
  }, [isOpen]);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const IconComponent = step.icon;

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="modal-overlay active" style={{ zIndex: 99999 }}>
      <div className="modal-content glass-panel" style={{ maxWidth: 520, padding: 28, position: "relative" }}>
        {/* Header with Close */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: 1 }}>
            Panduan Pengguna • Langkah {currentStep + 1} dari {TOUR_STEPS.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1, height: 4, borderRadius: 2,
                background: i === currentStep ? "var(--primary)" : i < currentStep ? "#34d399" : "rgba(255,255,255,0.1)",
                transition: "all 0.3s ease"
              }}
            />
          ))}
        </div>

        {/* Step Visual & Content */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "rgba(249, 115, 22, 0.15)", border: "1px solid rgba(249, 115, 22, 0.3)",
            display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16
          }}>
            <IconComponent size={32} style={{ color: "var(--primary)" }} />
          </div>

          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 10, color: "var(--text-primary)" }}>
            {step.title}
          </h3>

          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
            {step.desc}
          </p>

          <div style={{
            background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.2)",
            borderRadius: 8, padding: "10px 14px", fontSize: "0.78rem", color: "#93c5fd", textAlign: "left"
          }}>
            💡 <strong>Tips:</strong> {step.tip}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handlePrev}
            disabled={currentStep === 0}
            style={{ width: "auto", padding: "8px 16px", fontSize: "0.8rem", opacity: currentStep === 0 ? 0.3 : 1, display: "flex", alignItems: "center", gap: 4 }}>
            <ChevronLeft size={16} /> Sebelumnya
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleNext}
            style={{ width: "auto", padding: "8px 24px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 6 }}>
            {currentStep === TOUR_STEPS.length - 1 ? (
              <><CheckCircle size={16} /> Mulai Belajar Sekarang</>
            ) : (
              <>Lanjut <ChevronRight size={16} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
