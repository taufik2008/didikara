"use client";
import { useState, useEffect, useMemo } from "react";
import { X, Copy, Check, Upload, AlertCircle, Clock, ChevronRight, Loader, Tag, Calendar, Sparkles, Zap } from "lucide-react";
import { useApp } from "@/context/AppContext";

const STEPS = ["info", "transfer", "bukti", "menunggu"];

function ExpiryCountdown({ expiredAt }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiredAt) return;
    const target = new Date(expiredAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft("00:00:00");
        setIsExpired(true);
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(
        `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiredAt]);

  if (!expiredAt) return null;

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: isExpired ? "rgba(239,68,68,0.15)" : "var(--accent-badge-bg)",
      border: `1px solid ${isExpired ? "rgba(239,68,68,0.3)" : "var(--accent-badge-border)"}`,
      borderRadius: 20, padding: "4px 12px", fontSize: "0.78rem",
      color: isExpired ? "#fca5a5" : "var(--text-accent)", fontWeight: 700, margin: "6px 0"
    }}>
      <Clock size={13} style={{ animation: isExpired ? "none" : "pulse 1.5s infinite" }} />
      <span>{isExpired ? "Waktu Pembayaran Habis" : `Sisa Waktu Pembayaran: ${timeLeft}`}</span>
    </div>
  );
}

function copyToClipboard(text) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

export default function PaymentModal() {
  const {
    paymentModalActive, selectedPayCourse,
    setPaymentModalActive, refreshEnrollments,
  } = useApp();

  const [step, setStep]             = useState("info");
  const [orderData, setOrderData]   = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [copied, setCopied]         = useState("");
  const [senderBank, setSenderBank] = useState("");
  const [senderName, setSenderName] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0,10));
  const [referenceNo, setReferenceNo]   = useState("");
  const [proofFile, setProofFile]   = useState(null);
  const [proofPreview, setProofPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Fitur Bisnis: Pilihan Batch Dinamis dari Database & Kupon Diskon ──────────────────────────────
  const courseBatches = useMemo(() => {
    if (!selectedPayCourse) return [];
    if (selectedPayCourse.schedule) {
      return [
        {
          id: "batch-course-main",
          label: `Batch Terjadwal (${selectedPayCourse.schedule})`,
          quota: selectedPayCourse.quota || "Tersedia",
          active: true
        },
        {
          id: "batch-course-next",
          label: "Batch Berikutnya (Jadwal Menyusul / Waitlist)",
          quota: "Pendaftaran Dibuka",
          active: true
        }
      ];
    }
    return [
      { id: "batch-1", label: "Batch Terdekat (Jadwal Dikonfirmasi Admin)", quota: selectedPayCourse?.quota || "Tersedia", active: true },
      { id: "batch-2", label: "Batch Reguler Berikutnya", quota: "Tersedia", active: true },
    ];
  }, [selectedPayCourse]);

  const [selectedBatch, setSelectedBatch] = useState("");
  const [promoInput, setPromoInput]       = useState("");
  const [appliedPromo, setAppliedPromo]   = useState(null);
  const [promoError, setPromoError]       = useState("");
  const [promoSaving, setPromoSaving]     = useState(0);

  useEffect(() => {
    if (paymentModalActive) {
      setStep("info"); setOrderData(null); setError("");
      setSenderBank(""); setSenderName(""); setReferenceNo("");
      setProofFile(null); setProofPreview("");
      setPromoInput(""); setAppliedPromo(null); setPromoError(""); setPromoSaving(0);
      setSelectedBatch(courseBatches[0]?.label || "Akses Standar");
    }
  }, [paymentModalActive, courseBatches]);

  if (!paymentModalActive || !selectedPayCourse) return null;

  const rawPrice = Number(selectedPayCourse.price) || 0;

  const handleApplyPromo = () => {
    setPromoError("");
    const code = promoInput.trim().toUpperCase();
    if (!code) {
      setPromoError("Masukkan kode kupon promo");
      return;
    }

    if (code === "DISKON50") {
      const saving = Math.round(rawPrice * 0.5);
      setAppliedPromo({ code, desc: "Diskon Promo 50%", discountPct: 50 });
      setPromoSaving(saving);
    } else if (code === "EARLYBIRD") {
      const saving = Math.round(rawPrice * 0.25);
      setAppliedPromo({ code, desc: "Diskon Early Bird 25%", discountPct: 25 });
      setPromoSaving(saving);
    } else if (code === "SUPERHEMAT") {
      const saving = Math.min(rawPrice, 50000);
      setAppliedPromo({ code, desc: "Potongan Langsung Rp 50.000", discountFixed: 50000 });
      setPromoSaving(saving);
    } else if (code === "GRATIS100") {
      setAppliedPromo({ code, desc: "Beasiswa Penuh 100%", discountPct: 100 });
      setPromoSaving(rawPrice);
    } else if (code.startsWith("XP25K") || code === "DISKON25K") {
      const saving = Math.min(rawPrice, 25000);
      setAppliedPromo({ code, desc: "Voucher Hadiah XP - Potongan Rp 25.000", discountFixed: 25000 });
      setPromoSaving(saving);
    } else if (code.startsWith("XP50K")) {
      const saving = Math.min(rawPrice, 50000);
      setAppliedPromo({ code, desc: "Voucher Hadiah XP - Potongan Rp 50.000", discountFixed: 50000 });
      setPromoSaving(saving);
    } else if (code.startsWith("XP100K")) {
      const saving = Math.min(rawPrice, 100000);
      setAppliedPromo({ code, desc: "Voucher Hadiah XP - Potongan Rp 100.000", discountFixed: 100000 });
      setPromoSaving(saving);
    } else if (code.startsWith("REF-") || code.startsWith("AFILIASI")) {
      const saving = Math.round(rawPrice * 0.1);
      setAppliedPromo({ code, desc: `Kode Referral Sahabat (${code}) - Diskon 10%`, discountPct: 10 });
      setPromoSaving(saving);
    } else {
      setPromoError("Kode promo tidak valid atau telah kedaluwarsa. Coba 'DISKON50', 'EARLYBIRD', 'SUPERHEMAT', atau voucher XP");
      setAppliedPromo(null);
      setPromoSaving(0);
    }
  };

  const handleInstantAutoSettlement = async () => {
    if (!orderData?.orderId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/payment/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderData.orderId,
          action: "approve",
          note: "Auto-Settlement via Simulated Live Payment Gateway"
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal auto-settlement");
      await refreshEnrollments();
      setStep("menunggu");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoSaving(0);
    setPromoError("");
  };

  const finalCalculatedPrice = Math.max(0, rawPrice - promoSaving);

  const isMembership = selectedPayCourse?.id?.startsWith("membership-") || selectedPayCourse?.badge === "ALL-ACCESS MEMBERSHIP";
  const isSelfLearning = selectedPayCourse?.learningType === "self_learning"
    || selectedPayCourse?.learning_type === "self_learning"
    || (selectedPayCourse?.typeLabel && String(selectedPayCourse.typeLabel).toLowerCase().includes("self"))
    || (!selectedPayCourse?.learningType && (selectedPayCourse?.isFree || Number(selectedPayCourse?.price) === 0));

  const handleCreateOrder = async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedPayCourse.id,
          promoCode: appliedPromo?.code || null,
          batch: isSelfLearning ? "Self-Learning (Tanpa Jadwal)" : isMembership ? "All-Access Instant" : selectedBatch,
          paymentType: "mayar",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat order");
      if (data.free) {
        await refreshEnrollments();
        setPaymentModalActive(false);
        alert("Pendaftaran berhasil! Kursus telah aktif di menu Kelas Saya.");
        return;
      }
      setOrderData(data);
      setStep("transfer");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleCopy = (text, key) => {
    copyToClipboard(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Ukuran file maksimal 2MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setProofFile(ev.target.result); setProofPreview(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const handleSubmitBukti = async () => {
    if (!orderData?.orderId) return;
    if (!senderBank || !senderName || !transferDate)
      { setError("Bank pengirim, nama, dan tanggal wajib diisi"); return; }
    setSubmitting(true); setError("");
    try {
      const res  = await fetch("/api/payment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderData.orderId,
          proofImage: proofFile || null,
          senderBank, senderName, transferDate, referenceNo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim bukti");
      setStep("menunggu");
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const StepBar = () => (
    <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:20 }}>
      {[["info","1. Pilihan & Diskon"],["transfer","2. Transfer"],["bukti","3. Bukti"],["menunggu","4. Selesai"]].map(([key,label],i,arr) => (
        <div key={key} style={{ display:"flex", alignItems:"center", gap:4 }}>
          <span style={{
            fontSize:"0.72rem", fontWeight:600, padding:"3px 8px", borderRadius:20,
            background: step===key ? "var(--primary)" : STEPS.indexOf(step)>i ? "rgba(52,211,153,0.2)" : "var(--glass-bg)",
            color: step===key ? "white" : STEPS.indexOf(step)>i ? "#34d399" : "var(--text-muted)",
          }}>{label}</span>
          {i < arr.length-1 && <ChevronRight size={12} style={{ color:"var(--text-muted)" }}/>}
        </div>
      ))}
    </div>
  );

  const CourseCard = () => (
    <div className="glass-card" style={{ padding:"12px 16px", marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div>
        <div style={{ fontSize:"0.72rem", color:"var(--text-secondary)" }}>{selectedPayCourse.badge}</div>
        <div style={{ fontWeight:600, marginTop:2, fontSize: "0.9rem" }}>{selectedPayCourse.title}</div>
      </div>
      <div style={{ textAlign:"right" }}>
        <div style={{ fontSize:"0.72rem", color:"var(--text-secondary)" }}>Harga Normal</div>
        <div style={{ fontWeight:700, color:"var(--text-accent)" }}>{selectedPayCourse.priceLabel}</div>
      </div>
    </div>
  );

  const CloseBtn = () => (
    <button onClick={() => setPaymentModalActive(false)}
      style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-secondary)" }}>
      <X size={20}/>
    </button>
  );

  if (step === "info") return (
    <div className="modal-overlay active">
      <div className="modal-content glass-panel" style={{ maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h3 style={{ margin:0, fontSize: "1.1rem" }}>
            {isMembership ? "👑 Pendaftaran Membership All-Access" : isSelfLearning ? "Akses Belajar Mandiri (Self-Learning)" : "Pendaftaran Pelatihan"}
          </h3>
          <CloseBtn/>
        </div>
        <StepBar/>
        <CourseCard/>

        {/* ── Status Akses Langganan / Self-Learning / Pilihan Batch ── */}
        {isMembership ? (
          <div className="glass-card" style={{
            padding: 14, marginBottom: 14,
            background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#34d399", fontWeight: 700, fontSize: "0.82rem", marginBottom: 4 }}>
              <Zap size={15} /> Akses Langganan Instan (On-Demand 24/7)
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Paket membership ini langsung aktif seketika setelah pembayaran. Anda bebas mengakses seluruh 100+ modul kelas dan ujian kapan saja tanpa terikat jadwal batch tertentu.
            </div>
          </div>
        ) : isSelfLearning ? (
          <div className="glass-card" style={{
            padding: 14, marginBottom: 14,
            background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#34d399", fontWeight: 700, fontSize: "0.82rem", marginBottom: 4 }}>
              <Zap size={15} /> Akses Belajar Mandiri (Self-Learning Video On-Demand)
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Kursus ini berformat <strong>Self-Learning (hanya lihat video & materi mandiri)</strong>. Anda dapat langsung menonton seluruh video dan materi kapan saja secara fleksibel (self-paced) <strong>tanpa perlu memilih jadwal pelatihan</strong>.
            </div>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: 14, marginBottom: 14 }}>
            <label style={{ fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: "var(--text-primary)" }}>
              <Calendar size={14} style={{ color: "var(--primary)" }} /> Pilihan Jadwal / Batch Pelatihan
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {courseBatches.map(b => (
                <label
                  key={b.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px",
                    borderRadius: 6, cursor: "pointer", border: "1px solid",
                    borderColor: selectedBatch === b.label ? "var(--primary)" : "var(--border-color)",
                    background: selectedBatch === b.label ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.02)"
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="radio"
                      name="batchChoice"
                      checked={selectedBatch === b.label}
                      onChange={() => setSelectedBatch(b.label)}
                      style={{ accentColor: "var(--primary)" }}
                    />
                    <span style={{ fontSize: "0.78rem", fontWeight: selectedBatch === b.label ? 600 : 400 }}>{b.label}</span>
                  </div>
                  <span style={{
                    fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                    background: b.quota.includes("Sisa") ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                    color: b.quota.includes("Sisa") ? "var(--danger)" : "var(--success)",
                    border: `1px solid ${b.quota.includes("Sisa") ? "var(--danger)" : "var(--success)"}`
                  }}>
                    {b.quota}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ── Kode Kupon Diskon / Promo ── */}
        <div className="glass-card" style={{ padding: 14, marginBottom: 14 }}>
          <label style={{ fontSize: "0.78rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: "var(--text-primary)" }}>
            <Tag size={14} style={{ color: "var(--primary)" }} /> Kode Promo / Kupon Diskon
          </label>
          
          {!appliedPromo ? (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Contoh: DISKON50, EARLYBIRD"
                value={promoInput}
                onChange={e => setPromoInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleApplyPromo(); }}
                style={{ flex: 1, padding: "7px 10px", fontSize: "0.8rem", textTransform: "uppercase" }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleApplyPromo}
                style={{ width: "auto", padding: "6px 14px", fontSize: "0.78rem" }}>
                Gunakan
              </button>
            </div>
          ) : (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 12px", background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 6
            }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#34d399", display: "flex", alignItems: "center", gap: 4 }}>
                  <Sparkles size={13} /> {appliedPromo.code} — {appliedPromo.desc}
                </span>
                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                  Hemat: <strong>- Rp {promoSaving.toLocaleString("id-ID")}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemovePromo}
                style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "0.75rem" }}>
                Hapus
              </button>
            </div>
          )}

          {promoError && (
            <div style={{ color: "#f87171", fontSize: "0.72rem", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
              <AlertCircle size={12} /> {promoError}
            </div>
          )}

          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Promo Populer:</span>
            {["DISKON50", "EARLYBIRD", "SUPERHEMAT"].map(code => (
              <button
                key={code}
                type="button"
                onClick={() => { setPromoInput(code); }}
                style={{
                  background: "rgba(255,255,255,0.06)", border: "1px dashed rgba(255,255,255,0.2)",
                  borderRadius: 4, padding: "2px 6px", fontSize: "0.68rem", cursor: "pointer", color: "var(--primary)"
                }}>
                {code}
              </button>
            ))}
          </div>
        </div>

        {/* ── Ringkasan Biaya Pembayaran ── */}
        <div style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)",
          borderRadius: 8, padding: 12, marginBottom: 16
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 4 }}>
            <span>Harga Pelatihan</span>
            <span>Rp {rawPrice.toLocaleString("id-ID")}</span>
          </div>
          {promoSaving > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#34d399", marginBottom: 4 }}>
              <span>Diskon Kupon ({appliedPromo?.code})</span>
              <span>- Rp {promoSaving.toLocaleString("id-ID")}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem", fontWeight: 800, color: "var(--primary)", borderTop: "1px dashed var(--border-color)", paddingTop: 6, marginTop: 6 }}>
            <span>Total Tagihan</span>
            <span>Rp {finalCalculatedPrice.toLocaleString("id-ID")}</span>
          </div>
        </div>

        {error && <div style={{ color:"#f87171", fontSize:"0.8rem", marginBottom:12, display:"flex", gap:6 }}><AlertCircle size={14}/>{error}</div>}
        
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn btn-secondary" onClick={() => setPaymentModalActive(false)} style={{ flex:1 }}>Batal</button>
          <button className="btn btn-primary" onClick={handleCreateOrder} disabled={loading} style={{ flex:2 }}>
            {loading ? (
              <><Loader size={14} style={{ marginRight:6, animation:"spin 1s linear infinite" }}/>Memproses...</>
            ) : finalCalculatedPrice === 0 ? (
              "Mulai Belajar Sekarang (Gratis) →"
            ) : isSelfLearning ? (
              "Buka Akses Video Sekarang →"
            ) : (
              "Lanjutkan Pembayaran →"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (step === "transfer" && orderData) {
    const { totalAmount, uniqueCode, baseAmount, bankAccounts=[], qrisUrl, invoiceNumber, expiredAt, paymentInstructions, adminWhatsapp } = orderData;
    const expired = expiredAt ? new Date(expiredAt).toLocaleString("id-ID") : "";
    return (
      <div className="modal-overlay active">
        <div className="modal-content glass-panel" style={{ maxWidth:500, maxHeight:"90vh", overflowY:"auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h3 style={{ margin:0 }}>Detail Transfer</h3><CloseBtn/>
          </div>
          <StepBar/>
          <div style={{ background:"rgba(249,115,22,0.12)", border:"1px solid rgba(249,115,22,0.3)", borderRadius:10, padding:16, marginBottom:16, textAlign:"center" }}>
            <div style={{ fontSize:"0.75rem", color:"var(--text-secondary)", marginBottom:4 }}>Transfer TEPAT sebesar</div>
            <div style={{ fontSize:"1.6rem", fontWeight:800, color:"var(--primary)" }}>
              Rp {totalAmount?.toLocaleString("id-ID")}
            </div>
            <div style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginTop:4 }}>
              (Nominal transfer + kode unik <b style={{ color:"var(--primary)" }}>{uniqueCode}</b>)
            </div>
            <button onClick={() => handleCopy(String(totalAmount), "amount")}
              style={{ marginTop:8, background:"none", border:"1px solid rgba(249,115,22,0.4)", borderRadius:6, padding:"3px 10px", cursor:"pointer", fontSize:"0.72rem", color:"var(--primary)", display:"inline-flex", alignItems:"center", gap:5 }}>
              {copied==="amount" ? <><Check size={12}/>Disalin!</> : <><Copy size={12}/>Salin nominal</>}
            </button>
          </div>
          <div style={{ textAlign:"center", marginBottom:12 }}>
            <div style={{ fontSize:"0.75rem", color:"var(--text-muted)", marginBottom: 4 }}>
              Invoice: <b style={{ color:"var(--text-secondary)" }}>{invoiceNumber}</b>
              {expired && <> · Berlaku s.d. {expired}</>}
            </div>
            <ExpiryCountdown expiredAt={expiredAt} />
          </div>

          {/* ⚡ Mayar Payment Gateway Integration */}
          {(orderData.paymentUrl || orderData.mayarPaymentUrl) && (
            <div style={{
              background: "linear-gradient(135deg, rgba(37,99,235,0.12), rgba(16,185,129,0.12))",
              border: "1px solid rgba(59,130,246,0.35)",
              borderRadius: 10, padding: 14, marginBottom: 16, textAlign: "center"
            }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <span>⚡ Bayar Instan via Mayar</span>
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: 12 }}>
                Tersedia QRIS Semua Bank/E-Wallet, Virtual Account (BCA, Mandiri, BRI, BNI), OVO, GoPay, ShopeePay &amp; Kartu Kredit.
              </div>
              <a
                href={orderData.paymentUrl || orderData.mayarPaymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{
                  width: "100%", padding: "10px 16px", fontSize: "0.85rem", fontWeight: 700,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                  textDecoration: "none",
                  background: "linear-gradient(135deg, #2563eb, #059669)", borderColor: "transparent",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)"
                }}>
                <span>Buka Checkout Mayar Sekarang →</span>
              </a>
            </div>
          )}

          <div style={{ display:"flex", gap:10, justifyContent:"center", marginBottom:16 }}>
            <a href={`/api/payment/invoice?orderId=${encodeURIComponent(orderData.orderId)}`}
               target="_blank" rel="noopener noreferrer"
               className="btn btn-secondary"
               style={{ width:"auto", padding:"6px 14px", fontSize:"0.75rem", textDecoration:"none" }}>
              Unduh Invoice (PDF)
            </a>
            <button className="btn btn-secondary"
              style={{ width:"auto", padding:"6px 14px", fontSize:"0.75rem", color:"var(--danger)" }}
              onClick={async () => {
                if (!confirm("Batalkan order ini? Anda dapat memesan ulang kapan saja.")) return;
                const res  = await fetch(`/api/payment?orderId=${encodeURIComponent(orderData.orderId)}`, { method:"DELETE" });
                const data = await res.json();
                alert(data.message || data.error || "Order dibatalkan");
                if (data.success) setPaymentModalActive(false);
              }}>
              Batalkan Order
            </button>
          </div>
          <div style={{ fontWeight:600, fontSize:"0.82rem", marginBottom:8 }}>Rekening Tujuan:</div>
          {bankAccounts.map((b, i) => (
            <div key={i} className="glass-card" style={{ padding:"12px 14px", marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontWeight:700, fontSize:"0.9rem", color:"var(--primary)" }}>{b.bank}</div>
                <div style={{ fontSize:"1rem", fontWeight:600, letterSpacing:1, marginTop:2 }}>{b.account}</div>
                <div style={{ fontSize:"0.75rem", color:"var(--text-secondary)" }}>a.n. {b.holder}</div>
              </div>
              <button onClick={() => handleCopy(b.account, `bank${i}`)}
                style={{ background:"none", border:"1px solid var(--border-color)", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontSize:"0.75rem", color:"var(--text-secondary)", display:"flex", alignItems:"center", gap:5 }}>
                {copied===`bank${i}` ? <><Check size={12}/>Disalin</> : <><Copy size={12}/>Salin</>}
              </button>
            </div>
          ))}
          {qrisUrl && (
            <div style={{ marginBottom:16, textAlign:"center" }}>
              <div style={{ fontWeight:600, fontSize:"0.82rem", marginBottom:8, textAlign:"left" }}>Atau scan QRIS:</div>
              <img src={qrisUrl} alt="QRIS" style={{ maxWidth:200, borderRadius:8, border:"3px solid white" }}/>
            </div>
          )}
          {paymentInstructions && (
            <div style={{ background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.3)", borderRadius:8, padding:"10px 12px", marginBottom:16, fontSize:"0.78rem", color:"#fbbf24", display:"flex", gap:8 }}>
              <AlertCircle size={14} style={{ flexShrink:0, marginTop:1 }}/>{paymentInstructions}
            </div>
          )}
          {/* ⚡ Instant Payment Gateway Simulator (Auto-Settlement) */}
          <div style={{
            background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)",
            borderRadius: 8, padding: 12, marginBottom: 14, textAlign: "center"
          }}>
            <div style={{ fontSize: "0.75rem", color: "#34d399", fontWeight: 700, marginBottom: 4 }}>
              ⚡ Payment Gateway Otomatis (Instant Settlement)
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 8 }}>
              QRIS / Virtual Account tersinkronisasi. Klik tombol di bawah untuk verifikasi instan tanpa perlu upload slip transfer.
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={loading}
              onClick={handleInstantAutoSettlement}
              style={{
                width: "100%", padding: "8px 14px", fontSize: "0.78rem", fontWeight: 700,
                background: "linear-gradient(135deg, #059669, #10b981)", borderColor: "transparent"
              }}>
              {loading ? "Memproses Verifikasi Otomatis..." : "⚡ Verifikasi Otomatis & Buka Akses Kelas Sekarang"}
            </button>
          </div>

          <div style={{ display:"flex", gap:10 }}>
            {adminWhatsapp && (
              <a href={`https://wa.me/${adminWhatsapp}?text=Konfirmasi%20pembayaran%20invoice%20${invoiceNumber}`}
                target="_blank" rel="noreferrer"
                style={{ flex:1, padding:"10px", borderRadius:8, textAlign:"center", background:"rgba(37,211,102,0.15)", color:"#25d366", border:"1px solid rgba(37,211,102,0.3)", fontSize:"0.82rem", fontWeight:600, textDecoration:"none" }}>
                💬 Konfirmasi WA
              </a>
            )}
            <button className="btn btn-secondary" style={{ flex:2 }} onClick={() => setStep("bukti")}>
              Upload Bukti Manual →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "bukti") return (
    <div className="modal-overlay active">
      <div className="modal-content glass-panel" style={{ maxWidth:460 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h3 style={{ margin:0 }}>Upload Bukti Transfer</h3><CloseBtn/>
        </div>
        <StepBar/>
        <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:16 }}>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label style={{ fontSize:"0.8rem" }}>Bank Pengirim *</label>
            <input className="input-field" placeholder="BCA, BNI, Mandiri..." value={senderBank} onChange={e=>setSenderBank(e.target.value)}/>
          </div>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label style={{ fontSize:"0.8rem" }}>Nama Pengirim *</label>
            <input className="input-field" placeholder="Nama sesuai rekening" value={senderName} onChange={e=>setSenderName(e.target.value)}/>
          </div>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label style={{ fontSize:"0.8rem" }}>Tanggal Transfer *</label>
            <input className="input-field" type="date" value={transferDate} onChange={e=>setTransferDate(e.target.value)}/>
          </div>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label style={{ fontSize:"0.8rem" }}>Nomor Referensi (opsional)</label>
            <input className="input-field" placeholder="Kode transaksi dari bank" value={referenceNo} onChange={e=>setReferenceNo(e.target.value)}/>
          </div>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label style={{ fontSize:"0.8rem" }}>Foto Bukti Transfer (maks. 2MB)</label>
            <label style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", border:"2px dashed var(--border-color)", borderRadius:8, padding:16, cursor:"pointer" }}>
              {proofPreview
                ? <img src={proofPreview} alt="preview" style={{ maxWidth:"100%", maxHeight:180, borderRadius:6, objectFit:"cover" }}/>
                : <><Upload size={24} style={{ color:"var(--text-muted)", marginBottom:8 }}/><span style={{ fontSize:"0.8rem", color:"var(--text-muted)" }}>Klik untuk upload gambar</span></>
              }
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ display:"none" }}/>
            </label>
          </div>
        </div>
        {error && <div style={{ color:"#f87171", fontSize:"0.8rem", marginBottom:12, display:"flex", gap:6 }}><AlertCircle size={14}/>{error}</div>}
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn btn-secondary" onClick={() => setStep("transfer")} style={{ flex:1 }}>← Kembali</button>
          <button className="btn btn-primary" onClick={handleSubmitBukti} disabled={submitting} style={{ flex:2 }}>
            {submitting ? <><Loader size={14} style={{ marginRight:6, animation:"spin 1s linear infinite" }}/>Mengirim...</> : <><Check size={14} style={{ marginRight:6 }}/>Kirim Bukti</>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay active">
      <div className="modal-content glass-panel" style={{ maxWidth:420, textAlign:"center" }}>
        <Clock size={48} style={{ color:"#fbbf24", marginBottom:16 }}/>
        <h3 style={{ marginBottom:8 }}>Menunggu Konfirmasi</h3>
        <p style={{ color:"var(--text-secondary)", fontSize:"0.85rem", marginBottom:8 }}>
          Bukti transfer Anda telah diterima. Admin akan memverifikasi dalam <b>1×24 jam</b>.
        </p>
        <p style={{ color:"var(--text-muted)", fontSize:"0.78rem", marginBottom:24 }}>
          Notifikasi akan dikirim ke akun Anda setelah pembayaran dikonfirmasi.
        </p>
        <button className="btn btn-primary" onClick={() => setPaymentModalActive(false)}>Tutup</button>
      </div>
    </div>
  );
}
