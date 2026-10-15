"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, X, CheckCheck, Info, CheckCircle, AlertTriangle, BookOpen, Award, Megaphone } from "lucide-react";

const TYPE_ICONS = {
  info:         Info,
  success:      CheckCircle,
  warning:      AlertTriangle,
  enrollment:   BookOpen,
  certificate:  Award,
  announcement: Megaphone,
};
const TYPE_COLORS = {
  info:         "var(--text-accent)",
  success:      "#6ee7b7",
  warning:      "#fde68a",
  enrollment:   "#93c5fd",
  certificate:  "#f9a8d4",
  announcement: "#fbbf24",
};

export default function NotificationCenter() {
  const [open, setOpen]           = useState(false);
  const [notifs, setNotifs]       = useState([]);
  const [unread, setUnread]       = useState(0);
  const [loading, setLoading]     = useState(false);
  const dropdownRef               = useRef(null);
  const pollRef                   = useRef(null);

  const fetchNotifs = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    try {
      const res  = await fetch("/api/notifications");
      if (res.status === 401) return;
      const data = await res.json();
      if (data.success) {
        setNotifs(data.notifications || []);
        setUnread(data.unreadCount || 0);
      }
    } catch { /* ignore */ }
  }, []);

  // Poll setiap 30 detik
  useEffect(() => {
    fetchNotifs();
    pollRef.current = setInterval(fetchNotifs, 30000);
    return () => clearInterval(pollRef.current);
  }, [fetchNotifs]);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = async () => {
    setLoading(true);
    await fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    setUnread(0);
    setLoading(false);
  };

  const markOneRead = async (id) => {
    await fetch(`/api/notifications?id=${id}`, { method: "PATCH" }).catch(() => {});
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const timeAgo = (ts) => {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return "Baru saja";
    if (m < 60) return `${m} mnt lalu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} jam lalu`;
    return `${Math.floor(h / 24)} hari lalu`;
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      {/* Bell Button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifs(); }}
        style={{
          background: "none", border: "none", cursor: "pointer",
          position: "relative", padding: "6px 8px",
          color: "var(--text-secondary)", display: "flex", alignItems: "center",
        }}
        title="Notifikasi"
      >
        <Bell size={20} style={{ color: unread > 0 ? "var(--text-accent)" : "var(--text-muted)" }} />
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            background: "#ef4444", color: "#fff",
            fontSize: "0.6rem", fontWeight: 700,
            borderRadius: "50%", width: 16, height: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            lineHeight: 1,
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: 360, maxHeight: 480,
          background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
          borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          zIndex: 1000, overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-color)",
            display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>
              Notifikasi {unread > 0 && <span style={{ color: "var(--text-accent)" }}>({unread} baru)</span>}
            </span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {unread > 0 && (
                <button onClick={markAllRead} disabled={loading}
                  style={{ background: "none", border: "none", cursor: "pointer",
                    fontSize: "0.72rem", color: "var(--text-accent)", display: "flex", alignItems: "center", gap: 4 }}>
                  <CheckCheck size={12} /> Tandai semua dibaca
                </button>
              )}
              <button onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifs.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                <Bell size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                <p>Tidak ada notifikasi</p>
              </div>
            ) : notifs.map(n => {
              const Icon  = TYPE_ICONS[n.type] || Info;
              const color = TYPE_COLORS[n.type] || "var(--text-accent)";
              const isNew = !n.read_at;
              return (
                <div key={n.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (isNew) markOneRead(n.id);
                      if (n.link) window.location.href = n.link;
                    }
                  }}
                  onClick={() => { if (isNew) markOneRead(n.id); if (n.link) window.location.href = n.link; }}
                  style={{
                    padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)",
                    cursor: "pointer",
                    background: isNew ? "rgba(249, 115, 22,0.06)" : "transparent",
                    display: "flex", gap: 12, alignItems: "flex-start",
                    transition: "background 0.15s",
                  }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%",
                    background: color + "22", display: "flex", alignItems: "center",
                    justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
                      <p style={{ fontWeight: isNew ? 700 : 500, fontSize: "0.8rem",
                        color: "var(--text-primary)", margin: 0, lineHeight: 1.3 }}>{n.title}</p>
                      {isNew && <span style={{ width: 7, height: 7, borderRadius: "50%",
                        background: "#f97316", flexShrink: 0, marginTop: 3 }} />}
                    </div>
                    <p style={{ fontSize: "0.73rem", color: "var(--text-secondary)", margin: "3px 0 0 0",
                      lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis",
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {n.message}
                    </p>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
