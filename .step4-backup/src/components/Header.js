"use client";
import { Search, Award } from "lucide-react";
import { useApp } from "@/context/AppContext";
import NotificationCenter from "@/components/Notifications/NotificationCenter";

export default function Header() {
  const { dbMode, currentUser } = useApp();

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
      <div className="search-bar">
        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input type="text" placeholder="Cari pelatihan, sertifikasi, dll..." />
      </div>
      <div className="header-right" style={{ gap: 12 }}>
        <div style={{ borderRadius: 20, fontWeight: 600, fontSize: "0.75rem", padding: "4px 12px", backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.color}33`, display: "flex", alignItems: "center" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: badge.dot, marginRight: 6, display: "inline-block" }}></span>
          {badge.text}
        </div>
        <div className="partner-badge" style={{ borderRadius: 20, fontWeight: 500 }}>
          <Award size={14} style={{ marginRight: 6 }} /> Trisakti AI Solutions
        </div>
        <div className="user-profile-badge">
          {/* Notification Center — bell dengan badge count */}
          <NotificationCenter />
          <div style={{ width: 1, height: 16, backgroundColor: "var(--border-color)" }} />
          <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{currentUser?.fullname}</span>
        </div>
      </div>
    </header>
  );
}
