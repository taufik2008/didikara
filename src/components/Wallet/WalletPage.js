"use client";
import { useState, useEffect } from "react";
import { CreditCard, Award, ExternalLink, RefreshCw, CheckCircle, Clock, XCircle, AlertCircle, Gift, Zap, Copy, Check, Sparkles, Tag } from "lucide-react";
import { useApp } from "@/context/AppContext";

const STATUS_CONFIG = {
  paid:    { icon: CheckCircle, color: "#34d399", label: "Berhasil" },
  Berhasil:{ icon: CheckCircle, color: "#34d399", label: "Berhasil" },
  pending: { icon: Clock,       color: "#fbbf24", label: "Pending"  },
  failed:  { icon: XCircle,     color: "#f87171", label: "Gagal"    },
  Gagal:   { icon: XCircle,     color: "#f87171", label: "Gagal"    },
};

export default function WalletPage() {
  const { certificates, transactions, handleViewCert, currentUser, refreshEnrollments, setActivePage } = useApp();
  const [tab, setTab]         = useState("certs");
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [mockMode, setMockMode] = useState(true);

  // Gamification & Rewards state
  const [userPoints, setUserPoints] = useState({ points: 0, total_points: 0, level: 1 });
  const [redeemCatalog, setRedeemCatalog] = useState([]);
  const [redeemedVouchers, setRedeemedVouchers] = useState([]);
  const [redeemingId, setRedeemingId] = useState(null);
  const [redeemSuccessMsg, setRedeemSuccessMsg] = useState("");
  const [copiedCode, setCopiedCode] = useState("");

  const loadGamificationData = async () => {
    try {
      const res = await fetch("/api/gamification");
      const data = await res.json();
      if (data.success && data.points) {
        setUserPoints(data.points);
      }
      const catRes = await fetch("/api/gamification/redeem");
      const catData = await catRes.json();
      if (catData.success) {
        setRedeemCatalog(catData.catalog || []);
      }
    } catch {}
  };

  useEffect(() => {
    if (tab === "payments") loadOrders();
    if (tab === "rewards") loadGamificationData();
  }, [tab]);

  // Muat voucher tersimpan di localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lms_my_vouchers");
      if (saved) setRedeemedVouchers(JSON.parse(saved));
    } catch {}
  }, []);

  const handleRedeemReward = async (reward) => {
    if (userPoints.points < reward.cost) {
      alert(`Poin XP tidak cukup! Dibutuhkan ${reward.cost} XP.`);
      return;
    }

    setRedeemingId(reward.id);
    setRedeemSuccessMsg("");
    try {
      const res = await fetch("/api/gamification/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId: reward.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || "Gagal menukarkan poin.");
      } else {
        setUserPoints(prev => ({ ...prev, points: data.remainingPoints }));
        setRedeemSuccessMsg(data.message);
        if (data.voucherCode) {
          const newVoucher = {
            code: data.voucherCode,
            title: reward.title,
            discount: reward.discountAmount,
            createdAt: new Date().toISOString(),
          };
          const updated = [newVoucher, ...redeemedVouchers];
          setRedeemedVouchers(updated);
          try {
            localStorage.setItem("lms_my_vouchers", JSON.stringify(updated));
          } catch {}
        }
      }
    } catch {
      alert("Terjadi kendala jaringan saat penukaran.");
    } finally {
      setRedeemingId(null);
    }
  };

  const copyVoucherCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 3000);
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/payment");
      const data = await res.json();
      if (data.success) {
        const daftar = data.orders || [];
        setOrders(daftar);
        setMockMode(!data.clientKey || data.clientKey.includes("xxxx"));

        // Admin mengonfirmasi transfer di sisinya; peserta baru tahu saat
        // membuka riwayat ini. Bila ada order yang sudah lunas, segarkan daftar
        // kelas agar akses langsung muncul tanpa perlu memuat ulang halaman.
        if (daftar.some(o => o.status === "paid")) refreshEnrollments();
      }
    } catch { /* fallback ke context transactions */ }
    finally { setLoading(false); }
  };

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

  const tabs = [
    { key: "certs",    label: "Sertifikat",        icon: Award       },
    { key: "rewards",  label: "Toko Hadiah XP",    icon: Gift        },
    { key: "payments", label: "Riwayat Pembayaran", icon: CreditCard  },
  ];

  return (
    <main className="page-view active">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: "1.8rem", marginBottom: 6 }}>Dompet Digital</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          Sertifikat kelulusan, penukaran poin hadiah XP, dan riwayat transaksi pembayaran Anda.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontSize: "0.85rem",
                fontWeight: tab === t.key ? 700 : 400,
                background: tab === t.key ? "var(--primary)" : "var(--glass-bg)",
                color: tab === t.key ? "white" : "var(--text-secondary)",
                border: `1px solid ${tab === t.key ? "var(--primary)" : "var(--border-color)"}`,
              }}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Sertifikat ── */}
      {tab === "certs" && (
        <div className="wallet-grid">
          {certificates.length === 0 && (
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Belum ada sertifikat. Selesaikan kursus untuk mendapatkan sertifikat.
            </div>
          )}
          {certificates.map(cert => (
            <div key={cert.id} className="glass-card certificate-card">
              <div>
                <span style={{ fontSize: "0.65rem", color: "var(--primary)", textTransform: "uppercase", fontWeight: 600 }}>Sertifikat Kelulusan</span>
                <h4 style={{ marginTop: 4 }}>{cert.title}</h4>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Diberikan pada {cert.date}</p>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: 12 }}>
                <span style={{ fontSize: "0.7rem", fontFamily: "monospace", color: "var(--text-muted)" }}>{cert.idCode}</span>
                <button className="btn btn-primary" style={{ width: "auto", padding: "6px 12px", fontSize: "0.75rem" }} onClick={() => handleViewCert(cert)}>Lihat</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Toko Hadiah XP ── */}
      {tab === "rewards" && (
        <div>
          {/* Header Poin User */}
          <div className="glass-card" style={{
            padding: 20, marginBottom: 24,
            background: "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,88,12,0.05))",
            border: "1px solid rgba(249,115,22,0.3)",
            display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: "linear-gradient(135deg, #f97316, #ea580c)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", boxShadow: "0 8px 16px rgba(249,115,22,0.3)"
              }}>
                <Sparkles size={26} />
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Saldo Hadiah Gamifikasi
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  {(userPoints.points || 0).toLocaleString("id-ID")} <span style={{ fontSize: "1rem", color: "var(--text-accent)" }}>XP</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  Level {userPoints.level || 1} Pembelajar &nbsp;•&nbsp; Total XP Terkumpul: {(userPoints.total_points || 0).toLocaleString("id-ID")} XP
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={loadGamificationData}
              style={{ width: "auto", padding: "6px 14px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <RefreshCw size={13} /> Segarkan XP
            </button>
          </div>

          {redeemSuccessMsg && (
            <div style={{
              padding: "12px 16px", borderRadius: 8, marginBottom: 20,
              background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)",
              color: "#6ee7b7", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 8
            }}>
              <CheckCircle size={16} /> {redeemSuccessMsg}
            </div>
          )}

          {/* Grid Katalog Hadiah */}
          <h3 style={{ fontSize: "1.1rem", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Gift size={18} style={{ color: "var(--primary)" }} /> Katalog Penukaran Hadiah
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: 16 }}>
            Tukarkan poin XP hasil belajar, kuis, dan kehadiran Anda dengan kupon diskon langsung atau lencana kehormatan.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
            {redeemCatalog.map(item => {
              const canAfford = (userPoints.points || 0) >= item.cost;
              return (
                <div key={item.id} className="glass-card" style={{
                  padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between",
                  border: canAfford ? "1px solid rgba(249,115,22,0.3)" : "1px solid var(--border-color)",
                  position: "relative", overflow: "hidden"
                }}>
                  {item.discountAmount && (
                    <div style={{
                      position: "absolute", top: 12, right: -28, transform: "rotate(45deg)",
                      background: "var(--primary)", color: "white", fontSize: "0.6rem", fontWeight: 800,
                      padding: "2px 30px", textTransform: "uppercase"
                    }}>
                      VOUCHER
                    </div>
                  )}

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: canAfford ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.05)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: canAfford ? "var(--text-accent)" : "var(--text-muted)"
                      }}>
                        {item.prefix ? <Tag size={18} /> : <Award size={18} />}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "0.92rem", color: "var(--text-primary)" }}>{item.title}</h4>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: canAfford ? "#f97316" : "var(--text-muted)" }}>
                          {item.cost} XP
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 16 }}>
                      {item.desc}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!canAfford || redeemingId === item.id}
                    onClick={() => handleRedeemReward(item)}
                    style={{
                      width: "100%", padding: "8px 14px", fontSize: "0.8rem",
                      opacity: canAfford ? 1 : 0.5,
                      cursor: canAfford ? "pointer" : "not-allowed"
                    }}>
                    {redeemingId === item.id ? "Memproses..." : canAfford ? `Tukar (${item.cost} XP)` : `XP Kurang (${item.cost - (userPoints.points || 0)} XP lagi)`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Riwayat Kupon Saya */}
          <div className="glass-card" style={{ padding: 20, border: "1px solid var(--border-color)" }}>
            <h3 style={{ fontSize: "1rem", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Tag size={16} style={{ color: "#34d399" }} /> Kupon &amp; Voucher Aktif Saya ({redeemedVouchers.length})
            </h3>
            {redeemedVouchers.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: 0 }}>
                Belum ada kupon yang ditukarkan. Tukarkan XP di atas untuk mendapatkan kode voucher diskon.
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                {redeemedVouchers.map((v, idx) => (
                  <div key={idx} style={{
                    padding: "12px 14px", borderRadius: 8,
                    background: "rgba(16,185,129,0.06)", border: "1px dashed rgba(16,185,129,0.4)",
                    display: "flex", justifyContent: "space-between", alignItems: "center"
                  }}>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "var(--success)", fontWeight: 600 }}>{v.title}</div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: 1, fontFamily: "monospace", marginTop: 2 }}>
                        {v.code}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 2 }}>
                        Ditukar: {new Date(v.createdAt).toLocaleDateString("id-ID")}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyVoucherCode(v.code)}
                      style={{
                        background: copiedCode === v.code ? "var(--success)" : "var(--bg-secondary)",
                        border: "1px solid var(--border-color)", borderRadius: 6, padding: "6px 10px",
                        color: copiedCode === v.code ? "#ffffff" : "var(--text-primary)", cursor: "pointer", fontSize: "0.72rem",
                        display: "flex", alignItems: "center", gap: 4
                      }}>
                      {copiedCode === v.code ? <><Check size={12} /> Tersalin</> : <><Copy size={12} /> Salin</>}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Riwayat Pembayaran ── */}
      {tab === "payments" && (
        <div>
          {/* Mode indicator */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600,
              background: mockMode ? "rgba(251,191,36,0.15)" : "rgba(52,211,153,0.15)",
              color: mockMode ? "#fbbf24" : "#34d399",
              border: `1px solid ${mockMode ? "rgba(251,191,36,0.3)" : "rgba(52,211,153,0.3)"}`,
            }}>
              {mockMode
                ? <><AlertCircle size={13} /> Mode Simulasi (Mock)</>
                : <><CheckCircle size={13} /> Mode Real — Midtrans Aktif</>}
            </div>
            <button onClick={loadOrders} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem" }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {loading && <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Memuat...</div>}

          {!loading && allOrders.length === 0 && (
            <div className="glass-card" style={{ padding: 32, textAlign: "center" }}>
              <CreditCard size={40} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Belum ada transaksi.</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: 4 }}>Beli kursus di halaman Marketplace untuk memulai.</p>
            </div>
          )}

          {!loading && allOrders.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {allOrders.map((order, i) => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                const Icon = cfg.icon;
                return (
                  <div key={order.id || i} className="glass-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: `${cfg.color}22`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <Icon size={20} style={{ color: cfg.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{order.course_title || order.program || "—"}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2 }}>
                        {order.invoice_number} &nbsp;·&nbsp; {order.payment_method || "—"}
                        {order.created_at && <> &nbsp;·&nbsp; {new Date(order.created_at).toLocaleDateString("id-ID")}</>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                        {order.amount ? `Rp ${Number(order.amount).toLocaleString("id-ID")}` : "Gratis"}
                      </div>
                      <div style={{ fontSize: "0.72rem", fontWeight: 600, color: cfg.color, marginTop: 4 }}>
                        {cfg.label}
                      </div>
                    </div>
                    {order.snap_redirect_url && order.status === "pending" && (
                      <a href={order.snap_redirect_url} target="_blank" rel="noreferrer"
                        style={{ color: "var(--primary)", flexShrink: 0 }}>
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
