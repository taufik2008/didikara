"use client";
import { useState, useEffect } from "react";
import { X, Copy, Check, Upload, AlertCircle, Clock, ChevronRight, Loader } from "lucide-react";
import { useApp } from "@/context/AppContext";

const STEPS = ["info", "transfer", "bukti", "menunggu"];

function copyToClipboard(text) {
  navigator.clipboard?.writeText(text).catch(() => {});
}

export default function PaymentModal() {
  const {
    paymentModalActive, selectedPayCourse,
    setPaymentModalActive, setEnrolledCourses, enrolledCourses,
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

  useEffect(() => {
    if (paymentModalActive) {
      setStep("info"); setOrderData(null); setError("");
      setSenderBank(""); setSenderName(""); setReferenceNo("");
      setProofFile(null); setProofPreview("");
    }
  }, [paymentModalActive]);

  if (!paymentModalActive || !selectedPayCourse) return null;

  const handleCreateOrder = async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: selectedPayCourse.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat order");
      if (data.free) {
        if (!enrolledCourses.includes(selectedPayCourse.id))
          setEnrolledCourses(prev => [...prev, selectedPayCourse.id]);
        setPaymentModalActive(false);
        alert("Kursus gratis berhasil diaktifkan!");
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
      {[["info","1. Info"],["transfer","2. Transfer"],["bukti","3. Bukti"],["menunggu","4. Selesai"]].map(([key,label],i,arr) => (
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
    <div className="glass-card" style={{ padding:"12px 16px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div>
        <div style={{ fontSize:"0.72rem", color:"var(--text-secondary)" }}>{selectedPayCourse.badge}</div>
        <div style={{ fontWeight:600, marginTop:2 }}>{selectedPayCourse.title}</div>
      </div>
      <div style={{ textAlign:"right" }}>
        <div style={{ fontSize:"0.72rem", color:"var(--text-secondary)" }}>Harga</div>
        <div style={{ fontWeight:700, color:"#a5b4fc" }}>{selectedPayCourse.priceLabel}</div>
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
      <div className="modal-content glass-panel" style={{ maxWidth:460 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h3 style={{ margin:0 }}>Pembayaran Manual</h3><CloseBtn/>
        </div>
        <StepBar/>
        <CourseCard/>
        <div className="glass-card" style={{ padding:14, marginBottom:16, fontSize:"0.82rem", lineHeight:1.6 }}>
          <div style={{ fontWeight:600, marginBottom:8 }}>Cara Pembayaran:</div>
          <div style={{ color:"var(--text-secondary)" }}>
            1. Klik <b>Lanjutkan</b> untuk mendapatkan nominal transfer unik<br/>
            2. Transfer ke rekening bank atau QRIS yang tersedia<br/>
            3. Upload foto bukti transfer<br/>
            4. Admin akan konfirmasi dalam 1×24 jam
          </div>
        </div>
        {error && <div style={{ color:"#f87171", fontSize:"0.8rem", marginBottom:12, display:"flex", gap:6 }}><AlertCircle size={14}/>{error}</div>}
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn btn-secondary" onClick={() => setPaymentModalActive(false)} style={{ flex:1 }}>Batal</button>
          <button className="btn btn-primary" onClick={handleCreateOrder} disabled={loading} style={{ flex:2 }}>
            {loading ? <><Loader size={14} style={{ marginRight:6, animation:"spin 1s linear infinite" }}/>Memproses...</> : "Lanjutkan →"}
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
              (Rp {baseAmount?.toLocaleString("id-ID")} + kode unik <b style={{ color:"var(--primary)" }}>{uniqueCode}</b>)
            </div>
            <button onClick={() => handleCopy(String(totalAmount), "amount")}
              style={{ marginTop:8, background:"none", border:"1px solid rgba(249,115,22,0.4)", borderRadius:6, padding:"3px 10px", cursor:"pointer", fontSize:"0.72rem", color:"var(--primary)", display:"inline-flex", alignItems:"center", gap:5 }}>
              {copied==="amount" ? <><Check size={12}/>Disalin!</> : <><Copy size={12}/>Salin nominal</>}
            </button>
          </div>
          <div style={{ fontSize:"0.75rem", color:"var(--text-muted)", textAlign:"center", marginBottom:12 }}>
            Invoice: <b style={{ color:"var(--text-secondary)" }}>{invoiceNumber}</b>
            {expired && <> · Berlaku s.d. {expired}</>}
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
          <div style={{ display:"flex", gap:10 }}>
            {adminWhatsapp && (
              <a href={`https://wa.me/${adminWhatsapp}?text=Konfirmasi%20pembayaran%20invoice%20${invoiceNumber}`}
                target="_blank" rel="noreferrer"
                style={{ flex:1, padding:"10px", borderRadius:8, textAlign:"center", background:"rgba(37,211,102,0.15)", color:"#25d366", border:"1px solid rgba(37,211,102,0.3)", fontSize:"0.82rem", fontWeight:600, textDecoration:"none" }}>
                💬 Konfirmasi WA
              </a>
            )}
            <button className="btn btn-primary" style={{ flex:2 }} onClick={() => setStep("bukti")}>
              Sudah Transfer → Upload Bukti
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
