"use client";
import { useState, useEffect } from "react";
import { Save, Upload, Trash2, CheckCircle, AlertCircle, Building, CreditCard, QrCode, MessageCircle, Settings, Cloud, Mail, HardDrive } from "lucide-react";

const TABS = [
  { key: "payment",     label: "Rekening & QRIS",    icon: CreditCard  },
  { key: "integration", label: "Integrasi & Storage", icon: Cloud       },
  { key: "general",     label: "Umum",               icon: Settings    },
];

export default function PlatformSettingsPanel() {
  const [tab, setTab]         = useState("payment");
  const [settings, setSettings] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

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
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      setSaved(true);
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
            <input className="input-field" placeholder="PT NHCIE Indonesia" value={settings[`bank${n}_holder`]||""} onChange={e=>set(`bank${n}_holder`,e.target.value)}/>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:24 }}>
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
              Rekening ini akan ditampilkan ke user saat checkout. Maksimal 3 rekening.
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
              {/* Preview */}
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
              {/* Upload + URL */}
              <div style={{ flex:1 }}>
                <label style={{
                  display:"flex", alignItems:"center", gap:8, padding:"8px 14px",
                  border:"1px solid var(--border-color)", borderRadius:8, cursor:"pointer",
                  fontSize:"0.8rem", color:"var(--text-secondary)", marginBottom:10, width:"fit-content",
                }}>
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
                  Letakkan file di folder <code>/public/</code> lalu masukkan <code>/nama-file.png</code>
                </p>
              </div>
            </div>
          </div>

          {/* Instruksi pembayaran */}
          <div className="glass-card" style={{ padding:16, marginBottom:16 }}>
            <div style={{ fontWeight:600, fontSize:"0.85rem", marginBottom:10 }}>Instruksi Pembayaran</div>
            <textarea
              className="input-field"
              rows={3}
              style={{ resize:"vertical", fontFamily:"inherit" }}
              value={settings.payment_instructions||""}
              onChange={e => set("payment_instructions", e.target.value)}
            />
          </div>

          {/* WhatsApp */}
          <div className="glass-card" style={{ padding:16, marginBottom:16 }}>
            <div style={{ fontWeight:600, fontSize:"0.85rem", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
              <MessageCircle size={14} style={{ color:"#25d366" }}/>
              WhatsApp Admin (opsional)
            </div>
            <input className="input-field"
              placeholder="628123456789 (format internasional tanpa +)"
              value={settings.admin_whatsapp||""}
              onChange={e => set("admin_whatsapp", e.target.value)}/>
            <p style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginTop:6 }}>
              Jika diisi, tombol "Konfirmasi via WA" akan muncul di halaman pembayaran user.
            </p>
          </div>

          {/* Expiry */}
          <div className="glass-card" style={{ padding:16, marginBottom:20 }}>
            <div style={{ fontWeight:600, fontSize:"0.85rem", marginBottom:10 }}>Batas Waktu Pembayaran</div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <input className="input-field" type="number" min={1} max={72}
                style={{ width:80 }}
                value={settings.payment_expiry_hours||"24"}
                onChange={e => set("payment_expiry_hours", e.target.value)}/>
              <span style={{ color:"var(--text-secondary)", fontSize:"0.85rem" }}>jam setelah order dibuat</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Integrasi & Storage ── */}
      {tab === "integration" && (
        <div>
          {/* Storage Provider */}
          <div className="glass-card" style={{ padding:16, marginBottom:16 }}>
            <div style={{ fontWeight:600, fontSize:"0.85rem", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
              <HardDrive size={14} style={{ color:"var(--primary)" }}/>
              Penyimpanan File Materi
            </div>
            <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
              {[["mock","Demo (Tanpa Upload)"],["drive","Google Drive"],["s3","AWS S3 / R2"]].map(([val,label])=>(
                <label key={val} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 16px", borderRadius:8, cursor:"pointer",
                  border:`1px solid ${(settings.storage_provider||"mock")===val?"var(--primary)":"var(--border-color)"}`,
                  background:(settings.storage_provider||"mock")===val?"rgba(99,102,241,0.1)":"var(--glass-bg)",
                  fontSize:"0.82rem", color:(settings.storage_provider||"mock")===val?"#a5b4fc":"var(--text-secondary)" }}>
                  <input type="radio" name="storage" value={val} checked={(settings.storage_provider||"mock")===val} onChange={()=>set("storage_provider",val)} style={{ display:"none" }}/>
                  {label}
                </label>
              ))}
            </div>
            <p style={{ fontSize:"0.75rem", color:"var(--text-muted)", margin:0 }}>
              Video tetap menggunakan YouTube URL. Storage digunakan untuk PDF dan PPTX.
            </p>
          </div>

          {/* Google Drive */}
          {(settings.storage_provider||"mock") === "drive" && (
            <div className="glass-card" style={{ padding:16, marginBottom:16 }}>
              <div style={{ fontWeight:600, fontSize:"0.85rem", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
                <Cloud size={14} style={{ color:"#4285f4" }}/>
                Konfigurasi Google Drive
              </div>
              <div style={{ fontSize:"0.78rem", color:"var(--text-secondary)", marginBottom:12, lineHeight:1.6,
                background:"rgba(66,133,244,0.08)", border:"1px solid rgba(66,133,244,0.2)", borderRadius:8, padding:"10px 12px" }}>
                <b>Cara setup:</b> Google Cloud Console → IAM & Admin → Service Accounts → Create → Download JSON.
                Lalu share folder Drive ke email service account sebagai Editor.
              </div>
              <div className="form-group" style={{ marginBottom:12 }}>
                <label style={{ fontSize:"0.8rem" }}>Folder ID Google Drive</label>
                <input className="input-field" placeholder="1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
                  value={settings.google_drive_folder_id||""} onChange={e=>set("google_drive_folder_id",e.target.value)}/>
                <p style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginTop:4 }}>
                  Dari URL: drive.google.com/drive/folders/<b>[FOLDER_ID]</b>
                </p>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label style={{ fontSize:"0.8rem" }}>Service Account JSON</label>
                <textarea className="input-field" rows={6}
                  style={{ resize:"vertical", fontFamily:"monospace", fontSize:"0.72rem" }}
                  placeholder={'{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'}
                  value={settings.google_service_account_json||""}
                  onChange={e=>set("google_service_account_json",e.target.value)}/>
                <p style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginTop:4 }}>
                  Paste isi file JSON dari Service Account Google Cloud. Disimpan terenkripsi di database.
                </p>
              </div>
            </div>
          )}

          {/* AWS S3 / R2 */}
          {(settings.storage_provider||"mock") === "s3" && (
            <div className="glass-card" style={{ padding:16, marginBottom:16 }}>
              <div style={{ fontWeight:600, fontSize:"0.85rem", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
                <Cloud size={14} style={{ color:"#ff9900" }}/>
                Konfigurasi AWS S3 / Cloudflare R2
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label style={{ fontSize:"0.8rem" }}>Nama Bucket</label>
                  <input className="input-field" placeholder="nhcie-lms-files"
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
                <label style={{ fontSize:"0.8rem" }}>Custom Endpoint (opsional — untuk R2/MinIO)</label>
                <input className="input-field" placeholder="https://xxx.r2.cloudflarestorage.com"
                  value={settings.s3_endpoint||""} onChange={e=>set("s3_endpoint",e.target.value)}/>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label style={{ fontSize:"0.8rem" }}>CDN URL (opsional)</label>
                <input className="input-field" placeholder="https://cdn.nhcie.id"
                  value={settings.cdn_url||""} onChange={e=>set("cdn_url",e.target.value)}/>
              </div>
            </div>
          )}

          {/* Email SMTP */}
          <div className="glass-card" style={{ padding:16, marginBottom:16 }}>
            <div style={{ fontWeight:600, fontSize:"0.85rem", marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
              <Mail size={14} style={{ color:"#34d399" }}/>
              Konfigurasi Email (SMTP)
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
                <input className="input-field" placeholder="noreply@nhcie.id"
                  value={settings.smtp_user||""} onChange={e=>set("smtp_user",e.target.value)}/>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label style={{ fontSize:"0.8rem" }}>Password / App Password</label>
                <input className="input-field" placeholder="••••••••••••" type="password"
                  value={settings.smtp_pass||""} onChange={e=>set("smtp_pass",e.target.value)}/>
              </div>
              <div className="form-group" style={{ marginBottom:0, gridColumn:"1 / -1" }}>
                <label style={{ fontSize:"0.8rem" }}>From Address</label>
                <input className="input-field" placeholder="NHCIE Learning <noreply@nhcie.id>"
                  value={settings.smtp_from||""} onChange={e=>set("smtp_from",e.target.value)}/>
              </div>
            </div>
            <p style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginTop:10 }}>
              Gmail: gunakan App Password (bukan password biasa). Aktifkan 2FA dulu di akun Google.
            </p>
          </div>
        </div>
      )}

      {/* ── Tab: Umum ── */}
      {tab === "general" && (
        <div>
          <div className="glass-card" style={{ padding:16, marginBottom:16 }}>
            <div style={{ fontWeight:600, fontSize:"0.85rem", marginBottom:12 }}>Informasi Platform</div>
            <div className="form-group" style={{ marginBottom:12 }}>
              <label style={{ fontSize:"0.8rem" }}>Nama Platform</label>
              <input className="input-field" placeholder="NHCIE Learning"
                value={settings.platform_name||""} onChange={e=>set("platform_name",e.target.value)}/>
            </div>
          </div>
        </div>
      )}

      {/* Save bar */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 0", borderTop:"1px solid var(--border-color)", marginTop:8 }}>
        <div>
          {saved && <span style={{ color:"#34d399", fontSize:"0.82rem", display:"flex", alignItems:"center", gap:6 }}><CheckCircle size={14}/>Pengaturan berhasil disimpan</span>}
          {error && <span style={{ color:"#f87171", fontSize:"0.82rem", display:"flex", alignItems:"center", gap:6 }}><AlertCircle size={14}/>{error}</span>}
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ width:"auto", padding:"8px 24px" }}>
          {saving ? "Menyimpan..." : <><Save size={14} style={{ marginRight:6 }}/>Simpan Pengaturan</>}
        </button>
      </div>
    </div>
  );
}
