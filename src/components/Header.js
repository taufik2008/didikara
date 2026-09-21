"use client";
import { useState } from "react";
import { Search, Award, Sun, Moon, PanelLeft, HelpCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import NotificationCenter from "@/components/Notifications/NotificationCenter";
import OnboardingTourModal from "@/components/Modals/OnboardingTourModal";

export default function Header() {
  const { dbMode, currentUser, theme, toggleTheme, toggleSidebar, platformSettings } = useApp();
  const [showTour, setShowTour] = useState(false);
  const brandName = platformSettings?.platform_name || "DIDIKARA";

  const badge = (() => {
    if (dbMode === "postgresql") {
      return { bg: "rgba(16, 185, 129, 0.15)", color: "#10b981", dot: "#10b981", text: "DB Connected" };
    }
    if (dbMode === "demo") {
      return { bg: "rgba(234, 179, 8, 0.15)", color: "#eab308", dot: "#eab308", text: "Demo Mode" };
    }
    return { bg: "rgba(255, 255, 255, 0.05)", color: "var(--text-secondary)", dot: "#94a3b8", text: "Connecting DB..." };
  })();

  return (
    <header className="glass-panel" style={{ borderRadius: 0, border: "none", borderBottom: "1px solid var(--border-color)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          onClick={toggleSidebar}
          className="header-icon-btn"
          title="Buka/Tutup Sidebar"
          aria-label="Toggle Sidebar">
          <PanelLeft size={18} />
        </button>

        <div className="search-bar">
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input type="text" placeholder="Cari pelatihan, sertifikasi, dll..." />
        </div>
      </div>

      <div className="header-right" style={{ gap: 10 }}>
        {/* Onboarding / Guided Tour Button */}
        <button
          type="button"
          onClick={() => setShowTour(true)}
          className="header-icon-btn"
          style={{
            background: "rgba(59, 130, 246, 0.12)",
            color: "#60a5fa",
            border: "1px solid rgba(59, 130, 246, 0.3)",
          }}
          title="Buka Panduan / Tur Fitur LMS"
          aria-label="Panduan LMS">
          <HelpCircle size={16} />
        </button>

        {/* Theme Toggle Button (Light/Dark Mode) */}
        <button
          type="button"
          onClick={toggleTheme}
          className="header-icon-btn"
          style={{
            background: theme === "light" ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.06)",
            color: theme === "light" ? "var(--primary)" : "#fde047",
            border: `1px solid ${theme === "light" ? "rgba(249,115,22,0.3)" : "rgba(255,255,255,0.12)"}`,
          }}
          title={theme === "light" ? "Beralih ke Mode Gelap" : "Beralih ke Mode Terang"}
          aria-label="Ganti Tema">
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        <div style={{ borderRadius: 20, fontWeight: 600, fontSize: "0.75rem", padding: "4px 12px", backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.color}33`, display: "flex", alignItems: "center" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: badge.dot, marginRight: 6, display: "inline-block" }}></span>
          {badge.text}
        </div>
        <div className="partner-badge" style={{ borderRadius: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>
          <Award size={14} style={{ marginRight: 6 }} /> {brandName}
        </div>
        <div className="user-profile-badge">
          {/* Notification Center — bell dengan badge count */}
          <NotificationCenter />
          <div style={{ width: 1, height: 16, backgroundColor: "var(--border-color)" }} />
          <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{currentUser?.fullname}</span>
        </div>
      </div>

      <OnboardingTourModal isOpen={showTour} onClose={() => setShowTour(false)} />
    </header>
  );
}
