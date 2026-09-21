"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Save, Upload, Trash2, CheckCircle, AlertCircle, Building, CreditCard, QrCode, MessageCircle, Settings, Cloud, Mail, HardDrive, Zap, Tag, Image as ImageIcon, Sparkles, RefreshCw, Eye, Award, PenTool, Eraser, FileCheck } from "lucide-react";
import { useApp } from "@/context/AppContext";

const PRESET_LOGOS = [
  {
    id: "symbol-redblue-2",
    title: "DIDIKARA Dynamic Flame (Rekomendasi)",
    tag: "Modern Red & Blue Mark",
    url: "/logos/didikara-symbol-redblue-2.jpg",
    desc: "Simbol kobaran api/buku modern dengan gradasi biru elektrik dan merah cerah tanpa teks."
  },
  {
    id: "symbol-redblue-1",
    title: "DIDIKARA Hexagon Spark",
    tag: "Modern Red & Blue Mark",
    url: "/logos/didikara-symbol-redblue-1.jpg",
    desc: "Simbol heksagon presisi geometris dengan perpaduan biru safir dan merah ruby."
  },
  {
    id: "symbol-redblue-3",
    title: "DIDIKARA Infinity Arc",
    tag: "Modern Red & Blue Mark",
    url: "/logos/didikara-symbol-redblue-3.jpg",
    desc: "Simbol kurva pertumbuhan tak terbatas dengan aksen warna merah menyala dan biru kobalt."
  },
  {
    id: "konsep-1",
    title: "DIDIKARA Premium Badge 1",
    tag: "Full Monogram & Typography",
    url: "/logos/didikara-logo-konsep-1.jpg",
    desc: "Logo lengkap dengan ikon heksagon dan tipografi DIDIKARA bergaya korporat teknologi."
  },
  {
    id: "konsep-2",
    title: "DIDIKARA Premium Badge 2",
    tag: "Full Monogram & Typography",
    url: "/logos/didikara-logo-konsep-2.jpg",
    desc: "Logo lengkap dengan siluet mahkota keunggulan dan teks emas-oranye profesional."
  },
  {
    id: "konsep-3",
    title: "DIDIKARA Premium Badge 3",
    tag: "Full Monogram & Typography",
    url: "/logos/didikara-logo-konsep-3.jpg",
    desc: "Logo lengkap dengan emblem pita sertifikasi modern dan gradasi warna berenergi."
  },
];

const TABS = [
  { key: "branding",    label: "Branding & Logo",     icon: ImageIcon   },
  { key: "cert",        label: "Sertifikat & E-Sign", icon: Award       },
  { key: "payment",     label: "Rekening & QRIS",     icon: CreditCard  },
  { key: "membership",  label: "Tarif Langganan",     icon: Zap         },
  { key: "integration", label: "Integrasi & Storage",  icon: Cloud       },
  { key: "general",     label: "Pengaturan Umum",     icon: Settings    },
];

export default function PlatformSettingsPanelV2() {
  const { refreshPlatformSettings } = useApp();
  const [tab, setTab]           = useState("branding");
  const [settings, setSettings] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState("");
  const [ujiJalan, setUjiJalan] = useState(false);
  const [hasilUji, setHasilUji] = useState(null);

  // Satu-satunya cara memastikan setelan SMTP benar-benar bekerja: mengirim
  // email sungguhan dan menampilkan pesan galat apa adanya bila gagal.
  const kirimUji = async () => {
    setUjiJalan(true); setHasilUji(null);
    try {
      const res  = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      setHasilUji(await res.json());
    } catch (err) {
      setHasilUji({ success: false, error: err.message });
    }
    setUjiJalan(false);
  };

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const res  = await fetch("/api/settings");
      const data = await res.json();
      if (data.success) setSettings(data.settings);
    } catch { setError("Gagal memuat pengaturan"); }
  };

  const set = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true); setError(""); setSaved(false);
    try {
      const res  = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      setSaved(true);
      if (refreshPlatformSettings) refreshPlatformSettings();
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleQrisUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { setError("Gambar QRIS maksimal 500KB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => set("qris_image", ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Maksimal 2MB file asli sebelum kompresi
    if (file.size > 2 * 1024 * 1024) {
      setError("Ukuran file logo maksimal 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 480;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Export as webp/png compressed data URL
        const dataUrl = canvas.toDataURL("image/webp", 0.9);
        set("platform_logo", dataUrl);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  if (!settings) return (
    <div style={{ padding:40, textAlign:"center", color:"var(--text-muted)" }}>Memuat pengaturan...</div>
  );

  const BankCard = ({ idx }) => {
    const n = idx + 1;
    return (
      <div className="glass-card" style={{ padding:16, marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontWeight:600, fontSize:"0.85rem", display:"flex", alignItems:"center", gap:6 }}>
            <Building size={14} style={{ color:"var(--primary)" }}/>
            Rekening Bank {n}
            {n > 2 && <span style={{ fontSize:"0.7rem", color:"var(--text-muted)" }}>(opsional)</span>}
          </div>
          {n > 2 && settings[`bank${n}_name`] && (
            <button onClick={() => { set(`bank${n}_name`,""); set(`bank${n}_account`,""); set(`bank${n}_holder`,""); }}
              style={{ background:"none", border:"none", cursor:"pointer", color:"#f87171" }}>
              <Trash2 size={14}/>
            </button>
          )}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label style={{ fontSize:"0.75rem" }}>Nama Bank</label>
            <input className="input-field" placeholder="BCA" value={settings[`bank${n}_name`]||""} onChange={e=>set(`bank${n}_name`,e.target.value)}/>
          </div>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label style={{ fontSize:"0.75rem" }}>Nomor Rekening</label>
            <input className="input-field" placeholder="1234567890" value={settings[`bank${n}_account`]||""} onChange={e=>set(`bank${n}_account`,e.target.value)}/>
          </div>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label style={{ fontSize:"0.75rem" }}>Atas Nama</label>
            <input className="input-field" placeholder="PT. SDI" value={settings[`bank${n}_holder`]||""} onChange={e=>set(`bank${n}_holder`,e.target.value)}/>
          </div>
        </div>
      </div>
    );
  };

  const provider = settings.storage_provider || "mock";

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                display:"flex", alignItems:"center", gap:6, padding:"7px 16px",
                borderRadius:8, cursor:"pointer", fontSize:"0.82rem", fontWeight: tab===t.key ? 700 : 400,
                background: tab===t.key ? "var(--primary)" : "var(--glass-bg)",
                color: tab===t.key ? "white" : "var(--text-secondary)",
                border:`1px solid ${tab===t.key ? "var(--primary)" : "var(--border-color)"}`,
              }}>
              <Icon size={14}/>{t.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Rekening & QRIS ── */}
      {tab === "payment" && (
        <div>
          <div style={{ marginBottom:20 }}>
            <h4 style={{ fontSize:"0.9rem", fontWeight:600, marginBottom:4 }}>Rekening Bank Tujuan Transfer</h4>
            <p style={{ fontSize:"0.78rem", color:"var(--text-secondary)" }}>
              Rekening ini ditampilkan ke user saat checkout. Maksimal 3 rekening.
            </p>
          </div>
          <BankCard idx={0}/>
          <BankCard idx={1}/>
          <BankCard idx={2}/>

          {/* QRIS */}
          <div className="glass-card" style={{ padding:16, marginBottom:16 }}>
            <div style={{ fontWeight:600, fontSize:"0.85rem", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
              <QrCode size={14} style={{ color:"var(--primary)" }}/>
              Gambar QRIS
            </div>
            <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
              <div style={{ flexShrink:0 }}>
                {settings.qris_image ? (
                  <div style={{ position:"relative" }}>
                    <img src={settings.qris_image} alt="QRIS"
                      style={{ width:130, height:130, objectFit:"contain", borderRadius:8, border:"2px solid var(--border-color)", background:"white", padding:4 }}/>
                    <button onClick={() => set("qris_image","")}
                      style={{ position:"absolute", top:-6, right:-6, background:"#f87171", border:"none", borderRadius:"50%", width:20, height:20, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Trash2 size={10} style={{ color:"white" }}/>
                    </button>
                  </div>
                ) : (
                  <div style={{ width:130, height:130, borderRadius:8, border:"2px dashed var(--border-color)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"var(--text-muted)" }}>
                    <QrCode size={28} style={{ marginBottom:6 }}/>
                    <span style={{ fontSize:"0.7rem" }}>Belum ada</span>
                  </div>
                )}
              </div>
              <div style={{ flex:1 }}>
                <label style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", border:"1px solid var(--border-color)", borderRadius:8, cursor:"pointer", fontSize:"0.8rem", color:"var(--text-secondary)", marginBottom:10, width:"fit-content" }}>
                  <Upload size={14}/> Upload gambar QRIS (maks. 500KB)
                  <input type="file" accept="image/*" onChange={handleQrisUpload} style={{ display:"none" }}/>
                </label>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label style={{ fontSize:"0.75rem" }}>Atau masukkan URL gambar</label>
                  <input className="input-field" placeholder="https://... atau /qris.png"
                    value={settings.qris_image?.startsWith("data:") ? "" : (settings.qris_image||"")}
                    onChange={e => set("qris_image", e.target.value)}/>
                </div>
                <p style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginTop:6 }}>
                  Letakkan file di <code>/public/</code> lalu isi <code>/nama-file.png</code>
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding:16, marginBottom:16 }}>
            <div style={{ fontWeight:600, fontSize:"0.85rem", marginBottom:10 }}>Instruksi Pembayaran</div>
            <textarea className="input-field" rows={3} style={{ resize:"vertical", fontFamily:"inherit" }}
              value={settings.payment_instructions||""} onChange={e => set("payment_instructions", e.target.value)}/>
          </div>

          <div className="glass-card" style={{ padding:16, marginBottom:16 }}>
            <div style={{ fontWeight:600, fontSize:"0.85rem", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
              <MessageCircle size={14} style={{ color:"#25d366" }}/>
              WhatsApp Admin (opsional)
            </div>
            <input className="input-field" placeholder="628123456789 (format internasional tanpa +)"
              value={settings.admin_whatsapp||""} onChange={e => set("admin_whatsapp", e.target.value)}/>
          </div>

          <div className="glass-card" style={{ padding:16, marginBottom:20 }}>
            <div style={{ fontWeight:600, fontSize:"0.85rem", marginBottom:10 }}>Batas Waktu Pembayaran</div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <input className="input-field" type="number" min={1} max={72} style={{ width:80 }}
                value={settings.payment_expiry_hours||"24"} onChange={e => set("payment_expiry_hours", e.target.value)}/>
              <span style={{ color:"var(--text-secondary)", fontSize:"0.85rem" }}>jam setelah order dibuat</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Tarif Langganan (All-Access Membership) ── */}
      {tab === "membership" && (
        <div>
          <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <Zap size={18} style={{ color: "var(--primary)" }} />
              Pengaturan Paket Langganan (All-Access Membership)
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 18 }}>
              Tentukan nominal harga berlangganan paket All-Access untuk peserta mandiri. Nilai ini akan otomatis diterapkan pada katalog marketplace dan sistem pembayaran.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              {/* Paket Bulanan */}
              <div style={{
                background: "var(--bg-secondary)", padding: 16, borderRadius: 10,
                border: "1px solid var(--border-color)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(249,115,22,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                    📅
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "0.88rem" }}>Paket Langganan Bulanan</h4>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Billing per bulan (fleksibel)</span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>Harga Bulanan (Rp / Bulan)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    className="input-field"
                    placeholder="149000"
                    value={settings.membership_monthly_price || "149000"}
                    onChange={e => set("membership_monthly_price", e.target.value)}
                  />
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Tampilan User: <strong style={{ color: "var(--primary)" }}>Rp {Number(settings.membership_monthly_price || 149000).toLocaleString("id-ID")} / bulan</strong>
                </div>
              </div>

              {/* Paket Tahunan */}
              <div style={{
                background: "var(--bg-secondary)", padding: 16, borderRadius: 10,
                border: "1px solid var(--border-color)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--success)" }}>
                    ⭐
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "0.88rem" }}>Paket Langganan Tahunan</h4>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Billing per tahun (hemat)</span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>Harga Tahunan (Rp / Tahun)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    className="input-field"
                    placeholder="999000"
                    value={settings.membership_annual_price || "999000"}
                    onChange={e => set("membership_annual_price", e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600 }}>Badge Label Diskon (opsional)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="HEMAT 44%"
                    value={settings.membership_annual_badge || "HEMAT 44%"}
                    onChange={e => set("membership_annual_badge", e.target.value)}
                  />
                </div>

                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Tampilan User: <strong style={{ color: "var(--primary)" }}>Rp {Number(settings.membership_annual_price || 999000).toLocaleString("id-ID")} / tahun</strong> (~Rp {Math.round(Number(settings.membership_annual_price || 999000) / 12).toLocaleString("id-ID")}/bln)
                </div>
              </div>
            </div>

            {/* Rekap Benefit */}
            <div style={{
              background: "var(--accent-badge-bg)", border: "1px solid var(--accent-badge-border)",
              borderRadius: 8, padding: "12px 16px", fontSize: "0.78rem", color: "var(--text-secondary)"
            }}>
              💡 <strong>Catatan:</strong> Paket All-Access memberikan hak akses tak terbatas bagi siswa ke seluruh modul materi, ujian kompetensi, sertifikat digital resmi, dan live class.
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Integrasi & Storage ── */}
      {tab === "integration" && (
        <div>
          {/* Storage provider selector */}
          <div className="glass-card" style={{ padding:16, marginBottom:16 }}>
            <div style={{ fontWeight:600, fontSize:"0.85rem", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
              <HardDrive size={14} style={{ color:"var(--primary)" }}/>
              Penyimpanan File Materi (PDF & PPTX)
            </div>
            <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
              {[["mock","Demo (Tanpa Upload)"],["drive","Google Drive"],["s3","AWS S3 / R2"]].map(([val,label])=>(
                <button key={val} onClick={()=>set("storage_provider",val)}
                  style={{ padding:"8px 18px", borderRadius:8, cursor:"pointer", fontSize:"0.82rem", border:"none",
                    fontWeight: provider===val ? 700 : 400,
                    background: provider===val ? "var(--primary)" : "var(--glass-bg)",
                    color: provider===val ? "white" : "var(--text-secondary)",
                    outline: provider===val ? "none" : "1px solid var(--border-color)" }}>
                  {label}
                </button>
              ))}
            </div>
            <p style={{ fontSize:"0.75rem", color:"var(--text-muted)", margin:0 }}>
              Video menggunakan YouTube URL — tidak perlu storage.
            </p>
          </div>

          {/* Google Drive */}
          {provider === "drive" && (
            <div className="glass-card" style={{ padding:16, marginBottom:16 }}>
              <div style={{ fontWeight:600, fontSize:"0.85rem", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
                <Cloud size={14} style={{ color:"#4285f4" }}/>
                Google Drive
              </div>
              <div style={{ fontSize:"0.78rem", color:"var(--text-secondary)", marginBottom:12, lineHeight:1.7,
                background:"rgba(66,133,244,0.08)", border:"1px solid rgba(66,133,244,0.2)", borderRadius:8, padding:"10px 14px" }}>
                <b>Setup:</b> Google Cloud Console → Enable Drive API → IAM & Admin → Service Accounts → Create → Download JSON.
                Kemudian share folder Drive ke email service account sebagai <b>Editor</b>.
              </div>
              <div className="form-group" style={{ marginBottom:12 }}>
                <label style={{ fontSize:"0.8rem" }}>Folder ID Google Drive</label>
                <input className="input-field" placeholder="1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
                  value={settings.google_drive_folder_id||""} onChange={e=>set("google_drive_folder_id",e.target.value)}/>
                <p style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginTop:4 }}>
                  Dari URL: drive.google.com/drive/folders/<b style={{color:"var(--primary)"}}>FOLDER_ID</b>
                </p>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label style={{ fontSize:"0.8rem" }}>Service Account JSON</label>
                <textarea className="input-field" rows={7}
                  style={{ resize:"vertical", fontFamily:"monospace", fontSize:"0.7rem" }}
                  placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key": "-----BEGIN RSA PRIVATE KEY-----\\n...",\n  "client_email": "xxx@project.iam.gserviceaccount.com"\n}'}
                  value={settings.google_service_account_json||""}
                  onChange={e=>set("google_service_account_json",e.target.value)}/>
              </div>
            </div>
          )}

          {/* S3 / R2 */}
          {provider === "s3" && (
            <div className="glass-card" style={{ padding:16, marginBottom:16 }}>
              <div style={{ fontWeight:600, fontSize:"0.85rem", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
                <Cloud size={14} style={{ color:"#ff9900" }}/>
                AWS S3 / Cloudflare R2
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label style={{ fontSize:"0.8rem" }}>Nama Bucket</label>
                  <input className="input-field" placeholder="ailms-files"
                    value={settings.s3_bucket||""} onChange={e=>set("s3_bucket",e.target.value)}/>
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label style={{ fontSize:"0.8rem" }}>Region</label>
                  <input className="input-field" placeholder="ap-southeast-1"
                    value={settings.s3_region||""} onChange={e=>set("s3_region",e.target.value)}/>
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label style={{ fontSize:"0.8rem" }}>Access Key ID</label>
                  <input className="input-field" placeholder="AKIAIOSFODNN7EXAMPLE" type="password"
                    value={settings.s3_access_key_id||""} onChange={e=>set("s3_access_key_id",e.target.value)}/>
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label style={{ fontSize:"0.8rem" }}>Secret Access Key</label>
                  <input className="input-field" placeholder="••••••••••••••••" type="password"
                    value={settings.s3_secret_access_key||""} onChange={e=>set("s3_secret_access_key",e.target.value)}/>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom:12 }}>
                <label style={{ fontSize:"0.8rem" }}>Custom Endpoint (opsional — R2/MinIO)</label>
                <input className="input-field" placeholder="https://xxx.r2.cloudflarestorage.com"
                  value={settings.s3_endpoint||""} onChange={e=>set("s3_endpoint",e.target.value)}/>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label style={{ fontSize:"0.8rem" }}>CDN URL (opsional)</label>
                <input className="input-field" placeholder="https://cdn.ailms.id"
                  value={settings.cdn_url||""} onChange={e=>set("cdn_url",e.target.value)}/>
              </div>
            </div>
          )}

          {/* SMTP */}
          <div className="glass-card" style={{ padding:16, marginBottom:16 }}>
            <div style={{ fontWeight:600, fontSize:"0.85rem", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
              <Mail size={14} style={{ color:"#34d399" }}/>
              Email / SMTP
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label style={{ fontSize:"0.8rem" }}>SMTP Host</label>
                <input className="input-field" placeholder="smtp.gmail.com"
                  value={settings.smtp_host||""} onChange={e=>set("smtp_host",e.target.value)}/>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label style={{ fontSize:"0.8rem" }}>Port</label>
                <input className="input-field" placeholder="587" type="number"
                  value={settings.smtp_port||""} onChange={e=>set("smtp_port",e.target.value)}/>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label style={{ fontSize:"0.8rem" }}>Username / Email</label>
                <input className="input-field" placeholder="noreply@ailms.id"
                  value={settings.smtp_user||""} onChange={e=>set("smtp_user",e.target.value)}/>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label style={{ fontSize:"0.8rem" }}>Password / App Password</label>
                <input className="input-field" placeholder="••••••••••••" type="password"
                  value={settings.smtp_pass||""} onChange={e=>set("smtp_pass",e.target.value)}/>
              </div>
              <div className="form-group" style={{ marginBottom:0, gridColumn:"1 / -1" }}>
                <label style={{ fontSize:"0.8rem" }}>From Address</label>
                <input className="input-field" placeholder="DIDIKARA <noreply@didikara.id>"
                  value={settings.smtp_from||""} onChange={e=>set("smtp_from",e.target.value)}/>
              </div>
            </div>
            <p style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginTop:10 }}>
              Gmail: aktifkan 2FA lalu buat App Password di myaccount.google.com/apppasswords
            </p>
          </div>
        </div>
      )}

      {/* ── Tab: Branding & Logo ── */}
      {tab === "branding" && (
        <div>
          {/* Header Banner */}
          <div className="glass-card" style={{ padding: 20, marginBottom: 20, borderLeft: "4px solid var(--primary)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: 8 }}>
                  <Sparkles size={18} style={{ color: "var(--primary)" }} />
                  Kustomisasi Branding &amp; Logo Platform
                </h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, maxWidth: 650, lineHeight: 1.6 }}>
                  Atur logo resmi platform DIDIKARA secara dinamis. Anda dapat memilih dari 6 preset desain logo eksklusif, mengunggah logo kustom dari komputer, atau memasukkan URL gambar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => set("platform_logo", "/logos/didikara-symbol-redblue-2.jpg")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px",
                  borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                  background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
                  color: "var(--text-secondary)", transition: "all 0.2s"
                }}>
                <RefreshCw size={13} /> Reset ke Logo Default
              </button>
            </div>
          </div>

          {/* Section 1: Live Preview Studio */}
          <div className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <Eye size={16} style={{ color: "var(--primary)" }} />
              Live Preview Studio
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {/* Preview 1: Header / Navbar Mockup */}
              <div style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
              }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 10 }}>
                  Preview Navbar Platform (Header)
                </div>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "var(--bg-secondary)", padding: "10px 16px", borderRadius: 8,
                  border: "1px solid var(--border-color)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {settings.platform_logo ? (
                      <img
                        src={settings.platform_logo}
                        alt="Logo"
                        style={{ width: 34, height: 34, objectFit: "contain", borderRadius: 8 }}
                      />
                    ) : (
                      <div style={{
                        width: 34, height: 34, borderRadius: 8,
                        background: "var(--primary-gradient)", display: "flex",
                        alignItems: "center", justifyContent: "center", color: "#fff"
                      }}>
                        <Sparkles size={18} />
                      </div>
                    )}
                    <div>
                      <span style={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.02em" }}>
                        {settings.platform_name || "DIDIKARA"}
                      </span>
                      <span style={{ display: "block", fontSize: "0.65rem", color: "var(--primary)", fontWeight: 600, marginTop: -2 }}>
                        LEARNING ECOSYSTEM
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <div style={{ width: 45, height: 6, borderRadius: 3, background: "var(--border-color)" }}></div>
                    <div style={{ width: 30, height: 6, borderRadius: 3, background: "var(--primary)", opacity: 0.8 }}></div>
                  </div>
                </div>
              </div>

              {/* Preview 2: Dark Surface vs Light Surface */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Dark preview */}
                <div style={{
                  background: "#0f172a", color: "#f8fafc", padding: 14, borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)", textAlign: "center"
                }}>
                  <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginBottom: 8, fontWeight: 600 }}>
                    Latar Gelap (Dark Mode)
                  </div>
                  <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {settings.platform_logo ? (
                      <img src={settings.platform_logo} alt="Logo" style={{ maxHeight: 52, maxWidth: 80, objectFit: "contain", borderRadius: 6 }} />
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Tidak Ada Logo</span>
                    )}
                  </div>
                </div>

                {/* Light preview */}
                <div style={{
                  background: "#ffffff", color: "#0f172a", padding: 14, borderRadius: 10,
                  border: "1px solid #e2e8f0", textAlign: "center"
                }}>
                  <div style={{ fontSize: "0.68rem", color: "#64748b", marginBottom: 8, fontWeight: 600 }}>
                    Latar Terang (Light Mode)
                  </div>
                  <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {settings.platform_logo ? (
                      <img src={settings.platform_logo} alt="Logo" style={{ maxHeight: 52, maxWidth: 80, objectFit: "contain", borderRadius: 6 }} />
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Tidak Ada Logo</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Upload File & URL Input */}
          <div className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <Upload size={16} style={{ color: "var(--primary)" }} />
              Unggah Logo Kustom Anda
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "center" }}>
              <div>
                <label style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  padding: "24px 16px", border: "2px dashed var(--border-color)", borderRadius: 12,
                  cursor: "pointer", background: "var(--bg-secondary)", transition: "all 0.2s",
                  textAlign: "center"
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%", background: "rgba(249,115,22,0.1)",
                    color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 10
                  }}>
                    <Upload size={20} />
                  </div>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                    Pilih File dari Komputer / Laptop
                  </span>
                  <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                    Format: PNG, JPG, WEBP, SVG (Maks. 2MB, otomatis dikompres)
                  </span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
                </label>
              </div>

              <div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600 }}>Atau Masukkan URL Logo</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="https://domain.com/logo.png atau /logos/file.jpg"
                    value={settings.platform_logo?.startsWith("data:") ? "" : (settings.platform_logo || "")}
                    onChange={e => set("platform_logo", e.target.value)}
                  />
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 6, margin: 0 }}>
                    💡 Anda bisa meletakkan file di folder <code>public/logos/</code> lalu memasukkan path seperti <code>/logos/nama-logo.png</code>.
                  </p>
                </div>

                {settings.platform_logo && (
                  <button
                    type="button"
                    onClick={() => set("platform_logo", "")}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px",
                      background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                      color: "#ef4444", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer"
                    }}>
                    <Trash2 size={13} /> Hapus Logo Saat Ini
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: 6 Preset Logo Koleksi DIDIKARA */}
          <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.92rem", display: "flex", alignItems: "center", gap: 6 }}>
                  <Sparkles size={16} style={{ color: "var(--primary)" }} />
                  Koleksi Preset Logo DIDIKARA (1-Klik Terapkan)
                </div>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
                  Klik salah satu desain logo di bawah untuk langsung menjadikannya logo resmi platform.
                </p>
              </div>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16
            }}>
              {PRESET_LOGOS.map((preset) => {
                const isSelected = settings.platform_logo === preset.url;
                return (
                  <div
                    key={preset.id}
                    onClick={() => set("platform_logo", preset.url)}
                    style={{
                      borderRadius: 12,
                      border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border-color)",
                      background: isSelected ? "rgba(249,115,22,0.06)" : "var(--bg-secondary)",
                      padding: 14,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      boxShadow: isSelected ? "0 4px 14px rgba(249,115,22,0.18)" : "none"
                    }}
                  >
                    <div>
                      {/* Logo Image Preview */}
                      <div style={{
                        width: "100%",
                        height: 140,
                        background: "#0b0f19",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 12,
                        overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.08)"
                      }}>
                        <img
                          src={preset.url}
                          alt={preset.title}
                          style={{
                            maxHeight: "100%",
                            maxWidth: "100%",
                            objectFit: "contain",
                            transition: "transform 0.2s"
                          }}
                        />
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{
                          fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                          background: preset.id.includes("symbol") ? "rgba(59,130,246,0.15)" : "rgba(249,115,22,0.15)",
                          color: preset.id.includes("symbol") ? "#60a5fa" : "var(--primary)"
                        }}>
                          {preset.tag}
                        </span>
                        {isSelected && (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.7rem",
                            fontWeight: 700, color: "var(--primary)"
                          }}>
                            <CheckCircle size={13} /> Aktif
                          </span>
                        )}
                      </div>

                      <h4 style={{ margin: "0 0 4px 0", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {preset.title}
                      </h4>
                      <p style={{ margin: 0, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        {preset.desc}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        set("platform_logo", preset.url);
                      }}
                      style={{
                        marginTop: 12,
                        width: "100%",
                        padding: "7px 0",
                        borderRadius: 6,
                        border: "none",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        background: isSelected ? "var(--primary)" : "var(--glass-bg)",
                        color: isSelected ? "#ffffff" : "var(--text-primary)",
                        border: `1px solid ${isSelected ? "var(--primary)" : "var(--border-color)"}`
                      }}
                    >
                      {isSelected ? "✓ Logo Terpilih" : "Gunakan Logo Ini"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Sertifikat & E-Sign ── */}
      {tab === "cert" && (
        <div>
          <div className="glass-card" style={{ padding: 20, marginBottom: 20, borderLeft: "4px solid var(--primary)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: 8 }}>
                  <Award size={18} style={{ color: "var(--primary)" }} />
                  Tanda Tangan Digital &amp; Pengesahan Sertifikat
                </h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, maxWidth: 650, lineHeight: 1.6 }}>
                  Kelola tanda tangan digital resmi (E-Sign) asesor / instruktur kepala yang akan dicantumkan secara otomatis pada sertifikat kelulusan digital seluruh peserta didik.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginBottom: 24 }}>
            {/* Form Informasi Penandatangan */}
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <FileCheck size={16} style={{ color: "var(--primary)" }} />
                Identitas Pejabat / Asesor Penandatangan
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>Nama Lengkap &amp; Gelar Penandatangan</label>
                <input
                  className="input-field"
                  placeholder="Prof. Dr. Kadir, M.Kom"
                  value={settings.cert_signer_name || ""}
                  onChange={e => set("cert_signer_name", e.target.value)}
                />
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
                  Nama yang tercetak di bawah garis tanda tangan sertifikat.
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>Jabatan / LSP Penandatangan</label>
                <input
                  className="input-field"
                  placeholder="Direktur LSP &amp; Penjamin Mutu"
                  value={settings.cert_signer_title || ""}
                  onChange={e => set("cert_signer_title", e.target.value)}
                />
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
                  Keterangan wewenang atau peran legal pengesah sertifikat.
                </p>
              </div>

              {/* Upload Berkas Scan Tanda Tangan */}
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border-color)" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: 8 }}>
                  Atau Upload File Gambar Tanda Tangan (PNG Transparan):
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 1024 * 1024) { setError("Gambar tanda tangan maksimal 1MB"); return; }
                    const reader = new FileReader();
                    reader.onload = (ev) => set("cert_signature", ev.target.result);
                    reader.readAsDataURL(file);
                  }}
                  style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
                />
              </div>
            </div>

            {/* Canvas E-Sign Pad Interaktif */}
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 6 }}>
                  <PenTool size={16} style={{ color: "var(--primary)" }} />
                  Kanvas Goresan Tanda Tangan (Digital E-Sign Pad)
                </div>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: 12 }}>
                Goreskan tanda tangan langsung menggunakan kursor mouse atau layar sentuh (HP / Tablet).
              </p>

              {/* Drawing Canvas Container */}
              <div style={{
                background: "#ffffff",
                border: "2px dashed #cbd5e1",
                borderRadius: 10,
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                touchAction: "none"
              }}>
                <canvas
                  id="cert-signature-canvas"
                  width={360}
                  height={140}
                  style={{ cursor: "crosshair", touchAction: "none", width: "100%", maxWidth: 360, height: 140 }}
                  onMouseDown={(e) => {
                    const canvas = e.currentTarget;
                    const ctx = canvas.getContext("2d");
                    const rect = canvas.getBoundingClientRect();
                    ctx.lineWidth = 2.5;
                    ctx.lineCap = "round";
                    ctx.lineJoin = "round";
                    ctx.strokeStyle = "#0f172a";
                    ctx.beginPath();
                    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                    canvas.dataset.drawing = "true";
                  }}
                  onMouseMove={(e) => {
                    const canvas = e.currentTarget;
                    if (canvas.dataset.drawing !== "true") return;
                    const ctx = canvas.getContext("2d");
                    const rect = canvas.getBoundingClientRect();
                    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                    ctx.stroke();
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.dataset.drawing = "false";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.dataset.drawing = "false";
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    const canvas = e.currentTarget;
                    const ctx = canvas.getContext("2d");
                    const rect = canvas.getBoundingClientRect();
                    const touch = e.touches[0];
                    ctx.lineWidth = 2.5;
                    ctx.lineCap = "round";
                    ctx.lineJoin = "round";
                    ctx.strokeStyle = "#0f172a";
                    ctx.beginPath();
                    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
                    canvas.dataset.drawing = "true";
                  }}
                  onTouchMove={(e) => {
                    e.preventDefault();
                    const canvas = e.currentTarget;
                    if (canvas.dataset.drawing !== "true") return;
                    const ctx = canvas.getContext("2d");
                    const rect = canvas.getBoundingClientRect();
                    const touch = e.touches[0];
                    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
                    ctx.stroke();
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.dataset.drawing = "false";
                  }}
                />
              </div>

              {/* Action Buttons Canvas */}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    const canvas = document.getElementById("cert-signature-canvas");
                    if (canvas) {
                      const ctx = canvas.getContext("2d");
                      ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: "8px 12px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Eraser size={14} /> Bersihkan Kanvas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const canvas = document.getElementById("cert-signature-canvas");
                    if (canvas) {
                      const dataUrl = canvas.toDataURL("image/png");
                      set("cert_signature", dataUrl);
                    }
                  }}
                  className="btn btn-primary"
                  style={{ flex: 1.3, padding: "8px 12px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <CheckCircle size={14} /> Terapkan Goresan
                </button>
              </div>
            </div>
          </div>

          {/* Section: Live Preview Tanda Tangan pada Sertifikat */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <Eye size={16} style={{ color: "var(--primary)" }} />
              Pratinjau Tanda Tangan pada Dokumen Sertifikat Resmi
            </div>

            <div style={{
              background: "#ffffff",
              color: "#1e293b",
              borderRadius: 12,
              padding: 24,
              border: "2px solid #e2e8f0",
              maxWidth: 520,
              boxShadow: "0 6px 20px rgba(0,0,0,0.06)"
            }}>
              <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginBottom: 12 }}>
                Blok Pengesahan Sertifikat DIDIKARA
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ textAlign: "center", minWidth: 200 }}>
                  <div style={{ height: 65, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
                    {settings.cert_signature ? (
                      <img
                        src={settings.cert_signature}
                        alt="E-Signature"
                        style={{ maxHeight: 60, maxWidth: 180, objectFit: "contain" }}
                      />
                    ) : (
                      <span style={{ fontFamily: "cursive", fontSize: "1.2rem", color: "#1e3a8a", fontStyle: "italic" }}>
                        {settings.cert_signer_name || "Prof. Dr. Kadir"}
                      </span>
                    )}
                  </div>
                  <div style={{ borderTop: "2px solid #334155", paddingTop: 4, fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>
                    {settings.cert_signer_name || "Prof. Dr. Kadir"}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>
                    {settings.cert_signer_title || "Direktur LSP & Penjamin Mutu"}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--primary)", fontWeight: 700, marginTop: 2 }}>
                    {settings.platform_name || "DIDIKARA"}
                  </div>
                </div>
              </div>

              {settings.cert_signature && (
                <button
                  type="button"
                  onClick={() => set("cert_signature", "")}
                  style={{
                    marginTop: 14,
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    fontSize: "0.72rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4
                  }}>
                  <Trash2 size={12} /> Hapus Tanda Tangan Gambar (Kembali ke Teks)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Pengaturan Umum ── */}
      {tab === "general" && (
        <div>
          <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Settings size={18} style={{ color: "var(--primary)" }} />
              Informasi Platform &amp; Metadata
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>Nama Platform</label>
                <input
                  className="input-field"
                  placeholder="DIDIKARA"
                  value={settings.platform_name || ""}
                  onChange={e => set("platform_name", e.target.value)}
                />
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
                  Nama utama yang tampil di seluruh header, navbar, dan sertifikat.
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>Tagline Platform</label>
                <input
                  className="input-field"
                  placeholder="Platform Pelatihan & Sertifikasi Profesional"
                  value={settings.platform_tagline || ""}
                  onChange={e => set("platform_tagline", e.target.value)}
                />
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
                  Deskripsi singkat di bawah nama platform pada landing page.
                </p>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>Support &amp; Helpdesk Email</label>
              <input
                className="input-field"
                placeholder="support@didikara.id"
                value={settings.support_email || ""}
                onChange={e => set("support_email", e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Save bar */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 0", borderTop:"1px solid var(--border-color)", marginTop:12 }}>
        <div>
          {saved && <span style={{ color:"var(--success)", fontSize:"0.85rem", fontWeight: 700, display:"flex", alignItems:"center", gap:6 }}><CheckCircle size={16}/>Tersimpan</span>}
          {error && <span style={{ color:"var(--danger)", fontSize:"0.85rem", fontWeight: 700, display:"flex", alignItems:"center", gap:6 }}><AlertCircle size={16}/>{error}</span>}
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ width:"auto", padding:"12px 28px", fontSize: "0.92rem", fontWeight: 700, borderRadius: 10, boxShadow: "0 4px 16px rgba(249,115,22,0.35)", display: "inline-flex", alignItems: "center", gap: 8 }}>
          {saving ? "Menyimpan..." : <><Save size={18} /><span>Simpan Pengaturan</span></>}
        </button>
      </div>
    </div>
  );
}
