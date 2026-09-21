"use client";
import { useState, useEffect } from "react";
import { CreditCard, CheckCircle, Clock, XCircle, AlertCircle, RefreshCw, Download, Eye, Check, X } from "lucide-react";
import { useApp } from "@/context/AppContext";

const STATUS = {
  paid:                  { icon: CheckCircle, color: "#34d399", label: "Berhasil"  },
  Berhasil:              { icon: CheckCircle, color: "#34d399", label: "Berhasil"  },
  waiting_confirmation:  { icon: Clock,       color: "#fbbf24", label: "Menunggu"  },
  pending:               { icon: Clock,       color: "var(--primary)", label: "Pending"   },
  failed:                { icon: XCircle,     color: "#f87171", label: "Ditolak"   },
  Gagal:                 { icon: XCircle,     color: "#f87171", label: "Ditolak"   },
};

export default function PaymentHistoryPanel() {
  const { transactions } = useApp();
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [filter, setFilter]       = useState("all");
  const [selected, setSelected]   = useState(null); // detail modal
  const [notes, setNotes]         = useState("");
  const [confirming, setConfirming] = useState(false);
  const [proofModal, setProofModal] = useState(null);

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/payment");
      const data = await res.json();
      if (data.success) setOrders(data.orders || []);
    } catch {
      // fallback: context transactions
      const ctx = (transactions || []).map(tx => ({
        id: tx.invoice, invoice_number: tx.invoice, course_title: tx.program,
        amount: tx.amount, payment_method: tx.type, status: tx.status,
        user_email: tx.user, created_at: null, metadata: null,
      }));
      setOrders(ctx);
    }
    setLoading(false);
  };

  const handleConfirm = async (orderId, action) => {
    setConfirming(true);
    try {
      const res  = await fetch("/api/payment/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action, notes }),
      });
      const data = await res.json();
      if (data.success) { setSelected(null); setNotes(""); await loadOrders(); }
      else alert(data.error || "Gagal");
    } catch (e) { alert(e.message); }
    finally { setConfirming(false); }
  };

  const parseMetadata = (raw) => {
    if (!raw) return {};
    try { return typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return {}; }
  };

  const allOrders = orders;
  const filtered  = filter === "all" ? allOrders : allOrders.filter(o => {
    if (filter === "waiting") return o.status === "waiting_confirmation";
    if (filter === "paid")    return ["paid","Berhasil"].includes(o.status);
    if (filter === "pending") return o.status === "pending";
    if (filter === "failed")  return ["failed","Gagal"].includes(o.status);
    return true;
  });

  const waitingCount = allOrders.filter(o => o.status === "waiting_confirmation").length;
  const paidCount    = allOrders.filter(o => ["paid","Berhasil"].includes(o.status)).length;
  const revenue      = allOrders.filter(o => ["paid","Berhasil"].includes(o.status))
                                .reduce((s,o) => s + (Number(o.amount)||0), 0);

  const exportCsv = () => {
    const rows = [["Invoice","User","Kursus","Jumlah","Metode","Status","Tanggal"]];
    allOrders.forEach(o => rows.push([
      o.invoice_number||"", o.user_email||"", o.course_title||"",
      o.amount||"", o.payment_method||"", o.status||"",
      o.created_at ? new Date(o.created_at).toLocaleDateString("id-ID") : "",
    ]));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `transaksi-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <div>
      {/* Actions */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ fontSize:"0.85rem", color:"var(--text-secondary)" }}>
          {waitingCount > 0 && (
            <span style={{ background:"rgba(251,191,36,0.2)", color:"#fbbf24", padding:"4px 10px", borderRadius:20, fontSize:"0.75rem", fontWeight:600 }}>
              ⏳ {waitingCount} menunggu konfirmasi
            </span>
          )}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={loadOrders} className="btn btn-secondary" style={{ padding:"6px 12px", fontSize:"0.8rem", width:"auto" }}>
            <RefreshCw size={13} style={{ marginRight:5 }}/>Refresh
          </button>
          <button onClick={exportCsv} className="btn btn-secondary" style={{ padding:"6px 12px", fontSize:"0.8rem", width:"auto" }}>
            <Download size={13} style={{ marginRight:5 }}/>Export CSV
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Total Order",      value: allOrders.length, color:"var(--primary)" },
          { label:"Menunggu",         value: waitingCount,     color:"#fbbf24" },
          { label:"Berhasil",         value: paidCount,        color:"#34d399" },
          { label:"Total Pendapatan", value:`Rp ${revenue.toLocaleString("id-ID")}`, color:"var(--primary)" },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding:"14px 16px" }}>
            <div style={{ fontSize:"0.72rem", color:"var(--text-secondary)", marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:"1.1rem", fontWeight:700, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[
          { key:"all",     label:"Semua" },
          { key:"waiting", label:"⏳ Menunggu" },
          { key:"paid",    label:"✓ Berhasil" },
          { key:"pending", label:"Pending" },
          { key:"failed",  label:"Ditolak" },
        ].map(f => (
          <div key={f.key} className={`filter-pill ${filter===f.key?"active":""}`}
            onClick={() => setFilter(f.key)} style={{ fontSize:"0.75rem" }}>
            {f.label}
          </div>
        ))}
      </div>

      {loading && <div style={{ color:"var(--text-muted)", padding:20 }}>Memuat data...</div>}

      {!loading && filtered.length === 0 && (
        <div className="glass-card" style={{ padding:32, textAlign:"center", color:"var(--text-muted)" }}>
          <CreditCard size={36} style={{ marginBottom:10 }}/>
          <p>Belum ada transaksi.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="glass-card" style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.82rem" }}>
            <thead>
              <tr style={{ borderBottom:"1px solid var(--border-color)" }}>
                {["Invoice","User","Kursus","Nominal","Metode","Status","Tanggal","Aksi"].map(h => (
                  <th key={h} style={{ padding:"10px 14px", textAlign:"left", color:"var(--text-secondary)", fontWeight:600, fontSize:"0.75rem" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, i) => {
                const cfg  = STATUS[o.status] || STATUS.pending;
                const Icon = cfg.icon;
                const meta = parseMetadata(o.metadata);
                const isWaiting = o.status === "waiting_confirmation";
                return (
                  <tr key={o.id||i} style={{ borderBottom:"1px solid var(--border-color)", background: isWaiting ? "rgba(251,191,36,0.04)" : "transparent" }}>
                    <td style={{ padding:"10px 14px", fontFamily:"monospace", fontSize:"0.72rem" }}>{o.invoice_number||"—"}</td>
                    <td style={{ padding:"10px 14px", maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.user_email||"—"}</td>
                    <td style={{ padding:"10px 14px", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{o.course_title||"—"}</td>
                    <td style={{ padding:"10px 14px", fontWeight:600 }}>
                      Rp {Number(o.amount||0).toLocaleString("id-ID")}
                      {meta.unique_code && <span style={{ fontSize:"0.68rem", color:"var(--primary)", marginLeft:4 }}>+{meta.unique_code}</span>}
                    </td>
                    <td style={{ padding:"10px 14px" }}>{meta.sender_bank || o.payment_method || "—"}</td>
                    <td style={{ padding:"10px 14px" }}>
                      <span className={`badge-status ${(o.status === "paid" || o.status === "Berhasil") ? "badge-status-active" : (o.status === "failed" || o.status === "Gagal") ? "badge-status-suspended" : "badge-status-pending"}`} style={{ display:"inline-flex", alignItems:"center", gap:5 }}>
                        <Icon size={12}/>{cfg.label}
                      </span>
                    </td>
                    <td style={{ padding:"10px 14px", color:"var(--text-muted)", fontSize:"0.75rem" }}>
                      {o.created_at ? new Date(o.created_at).toLocaleDateString("id-ID") : "—"}
                    </td>
                    <td style={{ padding:"10px 14px" }}>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => { setSelected(o); setNotes(""); }}
                          style={{ background:"var(--accent-badge-bg)", border:"1px solid var(--accent-badge-border)", borderRadius:6, padding:"4px 8px", cursor:"pointer", fontSize:"0.72rem", color:"var(--text-accent)", display:"flex", alignItems:"center", gap:4 }}>
                          <Eye size={12}/>Detail
                        </button>
                        {isWaiting && (
                          <>
                            <button onClick={() => handleConfirm(o.id, "approve")}
                              style={{ background:"rgba(52,211,153,0.15)", border:"1px solid rgba(52,211,153,0.3)", borderRadius:6, padding:"4px 8px", cursor:"pointer", fontSize:"0.72rem", color:"#34d399", display:"flex", alignItems:"center", gap:4 }}>
                              <Check size={12}/>OK
                            </button>
                            <button onClick={() => { setSelected(o); setNotes(""); }}
                              style={{ background:"rgba(248,113,113,0.15)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:6, padding:"4px 8px", cursor:"pointer", fontSize:"0.72rem", color:"#f87171", display:"flex", alignItems:"center", gap:4 }}>
                              <X size={12}/>Tolak
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail / Konfirmasi Modal */}
      {selected && (() => {
        const meta = parseMetadata(selected.metadata);
        const isWaiting = selected.status === "waiting_confirmation";
        return (
          <div className="modal-overlay active" style={{ zIndex:9999 }}>
            <div className="modal-content glass-panel" style={{ maxWidth:480 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <h3 style={{ margin:0 }}>Detail Pembayaran</h3>
                <button onClick={() => setSelected(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-secondary)" }}><X size={20}/></button>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16, fontSize:"0.82rem" }}>
                {[
                  ["Invoice",       selected.invoice_number||"—"],
                  ["Dokumen",       <a key="inv" href={`/api/payment/invoice?orderId=${encodeURIComponent(selected.id)}`}
                                       target="_blank" rel="noopener noreferrer"
                                       style={{ color:"var(--primary)" }}>Unduh invoice PDF</a>],
                  ["User",          selected.user_email||"—"],
                  ["Kursus",        selected.course_title||"—"],
                  ["Nominal",       `Rp ${Number(selected.amount||0).toLocaleString("id-ID")}`],
                  ["Kode Unik",     meta.unique_code ? `+${meta.unique_code}` : "—"],
                  ["Bank Pengirim", meta.sender_bank||"—"],
                  ["Nama Pengirim", meta.sender_name||"—"],
                  ["Tgl Transfer",  meta.transfer_date||"—"],
                  ["No. Referensi", meta.reference_no||"—"],
                ].map(([k,v]) => (
                  <div key={k}>
                    <div style={{ fontSize:"0.7rem", color:"var(--text-secondary)" }}>{k}</div>
                    <div style={{ fontWeight:600, marginTop:2, wordBreak:"break-all" }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Foto bukti */}
              {meta.proof_image && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:"0.78rem", color:"var(--text-secondary)", marginBottom:6 }}>Bukti Transfer:</div>
                  <img src={meta.proof_image} alt="bukti"
                    style={{ width:"100%", borderRadius:8, cursor:"pointer", maxHeight:200, objectFit:"cover" }}
                    onClick={() => setProofModal(meta.proof_image)}/>
                </div>
              )}
              {!meta.proof_image && (
                <div style={{ color:"var(--text-muted)", fontSize:"0.8rem", marginBottom:16, padding:12, background:"var(--glass-bg)", borderRadius:8, textAlign:"center" }}>
                  <AlertCircle size={14} style={{ marginRight:6, verticalAlign:"middle" }}/>
                  Belum ada foto bukti transfer
                </div>
              )}

              {isWaiting && (
                <>
                  <div className="form-group" style={{ marginBottom:14 }}>
                    <label style={{ fontSize:"0.8rem" }}>Catatan (opsional)</label>
                    <input className="input-field" placeholder="Contoh: sudah cek mutasi rekening" value={notes} onChange={e=>setNotes(e.target.value)}/>
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <button className="btn btn-secondary" onClick={() => setSelected(null)} style={{ flex:1 }}>Batal</button>
                    <button
                      style={{ flex:1, padding:"10px", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:"0.85rem", background:"rgba(248,113,113,0.2)", color:"#f87171", border:"1px solid rgba(248,113,113,0.4)" }}
                      onClick={() => handleConfirm(selected.id, "reject")} disabled={confirming}>
                      {confirming ? "..." : "✕ Tolak"}
                    </button>
                    <button className="btn btn-primary" style={{ flex:1 }}
                      onClick={() => handleConfirm(selected.id, "approve")} disabled={confirming}>
                      {confirming ? "..." : "✓ Konfirmasi"}
                    </button>
                  </div>
                </>
              )}
              {!isWaiting && (
                <button className="btn btn-secondary" onClick={() => setSelected(null)}>Tutup</button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Proof fullscreen */}
      {proofModal && (
        <div className="modal-overlay active" style={{ zIndex:10000 }} onClick={() => setProofModal(null)}>
          <img src={proofModal} alt="bukti" style={{ maxWidth:"90vw", maxHeight:"90vh", borderRadius:8, objectFit:"contain" }}/>
        </div>
      )}
    </div>
  );
}
