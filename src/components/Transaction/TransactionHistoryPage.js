"use client";
import { useState, useEffect } from "react";
import { CreditCard, ExternalLink, RefreshCw, CheckCircle, Clock, XCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";

const STATUS_CONFIG = {
  paid:     { icon: CheckCircle, color: "#34d399", label: "Berhasil" },
  Berhasil: { icon: CheckCircle, color: "#34d399", label: "Berhasil" },
  pending:  { icon: Clock,       color: "#fbbf24", label: "Pending"  },
  failed:   { icon: XCircle,     color: "#f87171", label: "Gagal"    },
  Gagal:    { icon: XCircle,     color: "#f87171", label: "Gagal"    },
};

export default function TransactionHistoryPage() {
  const { transactions, refreshEnrollments, setActivePage } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mockMode, setMockMode] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payment");
      const data = await res.json();
      if (data.success) {
        const daftar = data.orders || [];
        setOrders(daftar);
        setMockMode(!data.clientKey || data.clientKey.includes("xxxx"));
        if (daftar.some(o => o.status === "paid")) refreshEnrollments();
      }
    } catch {
      /* fallback ke context transactions */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Gabung: DB orders + context transactions (in-memory)
  const contextTx = (transactions || []).map(tx => ({
    invoice_number: tx.invoice,
    course_title:   tx.program,
    amount:         tx.amount,
    payment_method: tx.type,
    status:         tx.status,
    created_at:     null,
    source:         "memory",
  }));
  const allOrders = orders.length > 0 ? orders : contextTx;

  return (
    <main className="page-view active">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: "1.8rem", marginBottom: 6 }}>Riwayat Transaksi</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          Riwayat pemesanan pelatihan, status pembayaran, dan bukti invoice resmi Anda.
        </p>
      </div>

      {/* Mode indicator & Refresh */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 600,
          background: mockMode ? "rgba(251,191,36,0.15)" : "rgba(52,211,153,0.15)",
          color: mockMode ? "#fbbf24" : "#34d399",
          border: `1px solid ${mockMode ? "rgba(251,191,36,0.3)" : "rgba(52,211,153,0.3)"}`,
        }}>
          {mockMode
            ? <><AlertCircle size={14} /> Mode Simulasi (Sandbox)</>
            : <><CheckCircle size={14} /> Gateway Pembayaran Midtrans Aktif</>}
        </div>
        <button
          onClick={loadOrders}
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: 8,
            padding: "6px 14px",
            cursor: "pointer",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: "0.82rem"
          }}>
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Segarkan Data
        </button>
      </div>

      {loading && <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: 20 }}>Memuat riwayat transaksi...</div>}

      {!loading && allOrders.length === 0 && (
        <div className="glass-card" style={{ padding: 48, textAlign: "center", borderRadius: 16 }}>
          <CreditCard size={48} style={{ color: "var(--text-muted)", marginBottom: 14 }} />
          <h3 style={{ fontSize: "1.1rem", marginBottom: 6 }}>Belum Ada Riwayat Transaksi</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", maxWidth: 400, margin: "0 auto 16px auto" }}>
            Anda belum melakukan pemesanan pelatihan. Jelajahi katalog pelatihan untuk memulai belajar.
          </p>
          <button
            onClick={() => setActivePage("marketplace-page")}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 600
            }}>
            Buka Katalog Pelatihan
          </button>
        </div>
      )}

      {!loading && allOrders.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {allOrders.map((order, i) => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            return (
              <div
                key={order.id || i}
                className="glass-card"
                style={{
                  padding: "18px 20px",
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  border: "1px solid var(--border-color)"
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${cfg.color}1c`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  border: `1px solid ${cfg.color}33`
                }}>
                  <Icon size={22} style={{ color: cfg.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                    {order.course_title || order.program || "Pembelian Pelatihan"}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span>No. Invoice: <strong>{order.invoice_number}</strong></span>
                    <span>•</span>
                    <span>Metode: {order.payment_method || "Online"}</span>
                    {order.created_at && (
                      <>
                        <span>•</span>
                        <span>{new Date(order.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)" }}>
                    {order.amount ? `Rp ${Number(order.amount).toLocaleString("id-ID")}` : "Gratis"}
                  </div>
                  <div style={{
                    display: "inline-block",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: cfg.color,
                    background: `${cfg.color}15`,
                    border: `1px solid ${cfg.color}33`,
                    padding: "2px 8px",
                    borderRadius: 6,
                    marginTop: 4
                  }}>
                    {cfg.label}
                  </div>
                </div>
                {order.snap_redirect_url && order.status === "pending" && (
                  <a
                    href={order.snap_redirect_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: "var(--primary)",
                      background: "rgba(37,99,235,0.1)",
                      border: "1px solid rgba(37,99,235,0.25)",
                      padding: "8px 12px",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      textDecoration: "none",
                      flexShrink: 0
                    }}
                    title="Lanjutkan Pembayaran"
                  >
                    Bayar <ExternalLink size={14} />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
