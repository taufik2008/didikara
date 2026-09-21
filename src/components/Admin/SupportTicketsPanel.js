"use client";
/**
 * SupportTicketsPanel.js — tab "Tiket Dukungan" di Modul Admin.
 *
 * Menampilkan email balasan peserta yang masuk lewat /api/email/inbound, dan
 * memungkinkan admin menjawabnya langsung — jawaban dikirim kembali sebagai
 * email dengan penanda [TKT-xxxxxx] agar percakapan tetap satu utas.
 */
import { useCallback, useEffect, useState } from "react";
import { Mail, Send, CheckCircle, RefreshCw } from "lucide-react";

const WARNA_STATUS = {
  open:    { bg: "var(--accent-badge-bg)", color: "var(--text-accent)", label: "Terbuka" },
  pending: { bg: "rgba(59,130,246,0.15)", color: "#93c5fd", label: "Menunggu peserta" },
  closed:  { bg: "rgba(100,116,139,0.15)", color: "#94a3b8", label: "Selesai" },
};

export default function SupportTicketsPanel() {
  const [tiket, setTiket]       = useState([]);
  const [ringkas, setRingkas]   = useState(null);
  const [filter, setFilter]     = useState("");
  const [terpilih, setTerpilih] = useState(null);   // { ticket, messages }
  const [balasan, setBalasan]   = useState("");
  const [msg, setMsg]           = useState("");
  const [loading, setLoading]   = useState(true);
  const [mengirim, setMengirim] = useState(false);

  const muat = useCallback(async (spinner = true) => {
    if (spinner) setLoading(true);
    try {
      const res  = await fetch(`/api/support-tickets${filter ? `?status=${filter}` : ""}`);
      const data = await res.json();
      if (data.success) { setTiket(data.tickets || []); setRingkas(data.ringkas || null); }
      else setMsg("✕ " + (data.error || "Gagal memuat"));
    } catch { setMsg("✕ Gagal memuat tiket"); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { muat(false); }, [muat]);

  const buka = async (id) => {
    setBalasan(""); setMsg("");
    try {
      const res  = await fetch(`/api/support-tickets?id=${id}`);
      const data = await res.json();
      if (data.success) setTerpilih({ ticket: data.ticket, messages: data.messages || [] });
    } catch { setMsg("✕ Gagal membuka tiket"); }
  };

  const kirim = async (action, extra = {}) => {
    setMengirim(true); setMsg("");
    try {
      const res  = await fetch("/api/support-tickets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id: terpilih.ticket.id, ...extra }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg("✓ " + (action === "reply" ? "Balasan terkirim" : "Tiket diperbarui"));
        setBalasan("");
        await buka(terpilih.ticket.id);
        muat(false);
      } else setMsg("✕ " + (data.error || "Gagal"));
    } catch { setMsg("✕ Gagal menghubungi server"); }
    setMengirim(false);
  };

  const waktu = (t) => new Date(t).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div>
      {ringkas && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:20 }}>
          {[["Terbuka", ringkas.terbuka, "var(--primary)"],
            ["Menunggu peserta", ringkas.menunggu, "#93c5fd"],
            ["Selesai", ringkas.selesai, "#94a3b8"]].map(([l,v,c]) => (
            <div key={l} className="glass-card" style={{ padding:16, textAlign:"center" }}>
              <div style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>{l}</div>
              <div style={{ fontSize:"1.3rem", fontWeight:700, color:c, marginTop:4 }}>{v ?? 0}</div>
            </div>
          ))}
        </div>
      )}

      {msg && (
        <div style={{ fontSize:"0.78rem", padding:"8px 14px", borderRadius:8, marginBottom:14,
          background: msg.startsWith("✓") ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
          color: msg.startsWith("✓") ? "var(--success)" : "var(--danger)",
          border: `1px solid ${msg.startsWith("✓") ? "var(--success)" : "var(--danger)"}`, fontWeight: 600 }}>{msg}</div>
      )}

      <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center" }}>
        {[["","Semua"],["open","Terbuka"],["pending","Menunggu"],["closed","Selesai"]].map(([k,l]) => (
          <button key={k} className={`btn ${filter===k ? "btn-primary" : "btn-secondary"}`}
            style={{ width:"auto", padding:"5px 14px", fontSize:"0.76rem" }}
            onClick={() => setFilter(k)}>{l}</button>
        ))}
        <button className="btn btn-secondary" style={{ width:"auto", padding:"5px 12px", fontSize:"0.76rem", marginLeft:"auto" }}
          onClick={() => muat()}>
          <RefreshCw size={12} style={{ marginRight:5 }} />Muat ulang
        </button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns: terpilih ? "1fr 1.3fr" : "1fr", gap:16 }}>
        {/* ── Daftar tiket ── */}
        <div>
          {loading ? <p style={{ color:"var(--text-muted)", fontSize:"0.8rem" }}>Memuat…</p>
           : tiket.length === 0 ? (
            <div className="glass-card" style={{ padding:24, textAlign:"center" }}>
              <Mail size={32} style={{ color:"var(--text-muted)", marginBottom:8 }} />
              <p style={{ color:"var(--text-muted)", fontSize:"0.82rem" }}>
                Belum ada tiket. Tiket muncul otomatis ketika peserta membalas email dari sistem —
                selama webhook email masuk sudah dipasang di penyedia email Anda.
              </p>
            </div>
          ) : tiket.map(t => {
            const w = WARNA_STATUS[t.status] || WARNA_STATUS.open;
            return (
              <button key={t.id} type="button" onClick={() => buka(t.id)}
                className="glass-card"
                style={{ padding:14, marginBottom:10, width:"100%", textAlign:"left", cursor:"pointer",
                         font:"inherit", color:"inherit", background:"var(--bg-card)",
                         border: terpilih?.ticket?.id === t.id ? "1px solid var(--primary)" : "1px solid var(--border-color)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                  <span style={{ fontFamily:"monospace", fontSize:"0.72rem", color:"var(--text-muted)" }}>{t.ticket_no}</span>
                  <span style={{ fontSize:"0.65rem", background:w.bg, color:w.color, padding:"2px 8px", borderRadius:20 }}>
                    {w.label}
                  </span>
                </div>
                <div style={{ fontWeight:600, fontSize:"0.85rem", color:"var(--text-primary)", marginBottom:2 }}>{t.subject}</div>
                <div style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>
                  {t.from_name ? `${t.from_name} · ` : ""}{t.from_email} · {waktu(t.last_message_at)} · {t.jumlah_pesan} pesan
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Percakapan ── */}
        {terpilih && (
          <div className="glass-card" style={{ padding:18, alignSelf:"start" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div>
                <div style={{ fontWeight:700, color:"var(--text-primary)" }}>{terpilih.ticket.subject}</div>
                <div style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginTop:2 }}>
                  {terpilih.ticket.ticket_no} · {terpilih.ticket.from_email}
                  {terpilih.ticket.user_email && " · akun terdaftar"}
                </div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                {terpilih.ticket.status !== "closed" ? (
                  <button className="btn btn-secondary" style={{ width:"auto", padding:"4px 10px", fontSize:"0.72rem" }}
                    disabled={mengirim} onClick={() => kirim("close")}>
                    <CheckCircle size={12} style={{ marginRight:4 }} />Tutup
                  </button>
                ) : (
                  <button className="btn btn-secondary" style={{ width:"auto", padding:"4px 10px", fontSize:"0.72rem" }}
                    disabled={mengirim} onClick={() => kirim("reopen")}>Buka lagi</button>
                )}
              </div>
            </div>

            <div style={{ maxHeight:320, overflowY:"auto", marginBottom:14 }}>
              {terpilih.messages.map(m => (
                <div key={m.id} style={{
                  padding:"10px 12px", borderRadius:8, marginBottom:8, fontSize:"0.8rem",
                  background: m.direction === "inbound" ? "rgba(255,255,255,0.04)" : "rgba(249,115,22,0.08)",
                  borderLeft: `3px solid ${m.direction === "inbound" ? "var(--border-color)" : "var(--primary)"}`,
                }}>
                  <div style={{ fontSize:"0.7rem", color:"var(--text-muted)", marginBottom:4 }}>
                    {m.direction === "inbound" ? "Peserta" : `Admin (${m.author_email})`} · {waktu(m.created_at)}
                  </div>
                  <div style={{ whiteSpace:"pre-wrap", color:"var(--text-secondary)" }}>{m.body}</div>
                </div>
              ))}
            </div>

            <textarea value={balasan} onChange={e => setBalasan(e.target.value)} rows={4}
              placeholder="Tulis balasan — akan dikirim sebagai email ke pengirim."
              className="input-field" style={{ width:"100%", padding:12, marginBottom:10 }} />
            <button className="btn btn-primary" style={{ width:"auto" }}
              disabled={mengirim || !balasan.trim()} onClick={() => kirim("reply", { body: balasan })}>
              <Send size={14} style={{ marginRight:6 }} />
              {mengirim ? "Mengirim…" : "Kirim Balasan"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
