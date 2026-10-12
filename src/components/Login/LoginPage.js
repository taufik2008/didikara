"use client";
import { useState, useEffect } from "react";
import { Cpu, User, Briefcase, Landmark, ShieldCheck, Mail, Lock, ArrowRight, Award, CheckCircle2, KeyRound, X, AlertCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function LoginPage() {
  const { activeRole, loginEmail, loginPassword, setLoginEmail, setLoginPassword, handleRoleTabChange, handlePrefill, handleLoginSubmit, platformSettings } = useApp();

  const brandName = (platformSettings?.platform_name && !platformSettings.platform_name.includes("SDI") && platformSettings.platform_name !== "AI LMS")
    ? platformSettings.platform_name
    : "DIDIKARA";
  const brandLogo = platformSettings?.platform_logo || "/logos/didikara-symbol-redblue-2.jpg";
  const brandTagline = platformSettings?.platform_tagline || "Platform Pelatihan & Sertifikasi Profesional";

  const [authMode, setAuthMode] = useState("login"); // 'login' | 'register'
  const [regFullname, setRegFullname] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

  const [resetToken, setResetToken] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("resetToken");
      if (token) setResetToken(token);
    }
  }, []);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegError("");
    setRegSuccess("");

    if (!regFullname.trim() || !regEmail.trim() || !regPassword) {
      setRegError("Semua field wajib diisi");
      return;
    }

    if (regPassword.length < 8) {
      setRegError("Kata sandi minimal 8 karakter");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError("Konfirmasi kata sandi tidak cocok");
      return;
    }

    setRegLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullname: regFullname.trim(),
          email: regEmail.trim().toLowerCase(),
          password: regPassword,
          role: "student",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal melakukan pendaftaran akun");
      }

      setRegSuccess("Pendaftaran berhasil! Silakan masuk dengan akun baru Anda.");
      setLoginEmail(regEmail.trim().toLowerCase());
      setLoginPassword(regPassword);

      setTimeout(() => {
        setAuthMode("login");
        setRegSuccess("");
        setRegFullname("");
        setRegPassword("");
        setRegConfirmPassword("");
      }, 1500);
    } catch (err) {
      setRegError(err.message);
    } finally {
      setRegLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError("");
    setForgotMessage("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Gagal memproses permintaan");
      setForgotMessage(data.message || "Tautan reset telah dikirim ke email Anda.");
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setResetError("Konfirmasi kata sandi tidak cocok");
      return;
    }
    setResetLoading(true);
    setResetError("");
    setResetMessage("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Gagal mengatur ulang kata sandi");
      setResetMessage(data.message || "Kata sandi berhasil diubah!");
      setTimeout(() => {
        setResetToken(null);
        if (typeof window !== "undefined") {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }, 2500);
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const roles = [
    { key: "student", label: "Peserta", icon: User },
    { key: "corporate", label: "Korporat", icon: Briefcase },
    { key: "government", label: "Pemerintah", icon: Landmark },
    { key: "admin", label: "Admin", icon: ShieldCheck },
  ];

  const features = [
    "Sertifikasi Kompetensi Nasional",
    "Program Pelatihan Industri",
    "Koneksi Karir Strategis",
  ];

  return (
    <div className="login-container">
      <div className="login-card glass-panel">
        <div className="login-hero">
          <div className="brand" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {brandLogo ? (
              <div style={{ width: 38, height: 38, borderRadius: 10, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "#090d16", border: "1px solid var(--border-color)", flexShrink: 0 }}>
                <img src={brandLogo} alt={brandName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ) : (
              <div className="brand-icon"><Cpu size={20} /></div>
            )}
            <span className="brand-name">{brandName}</span>
          </div>

          <div>
            <h1 style={{ color: "#ffffff" }}>
              Pusat Keunggulan <span className="hero-accent">Sertifikasi</span> &amp; Pelatihan Nasional
            </h1>
            <p>
              Membangun standar kompetensi industri masa depan melalui ekosistem
              sertifikasi digital yang terintegrasi dan diakui secara nasional.
            </p>

            <ul className="login-features">
              {features.map(f => (
                <li key={f} className="login-feature">
                  <CheckCircle2 size={16} className="login-feature-icon" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="partner-label">Platform Resmi</div>
            <div className="partner-badges">
              <div className="partner-badge"><Award size={14} /> {brandName}</div>
            </div>
          </div>
        </div>

        <div className="login-form-side">
          {/* Header Switcher: Masuk vs Daftar */}
          {!resetToken && (
            <div style={{
              display: "flex", background: "var(--bg-tertiary)", padding: 4,
              borderRadius: 8, marginBottom: 20, border: "1.5px solid var(--border-color)",
            }}>
              <button
                type="button"
                onClick={() => { setAuthMode("login"); setRegError(""); setRegSuccess(""); }}
                style={{
                  flex: 1, padding: "9px 14px", borderRadius: 6, border: "none",
                  fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s",
                  background: authMode === "login" ? "var(--primary)" : "transparent",
                  color: authMode === "login" ? "#ffffff" : "var(--text-secondary)",
                  boxShadow: authMode === "login" ? "0 2px 8px rgba(249, 115, 22, 0.25)" : "none",
                }}>
                Masuk
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("register"); setRegError(""); setRegSuccess(""); }}
                style={{
                  flex: 1, padding: "9px 14px", borderRadius: 6, border: "none",
                  fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s",
                  background: authMode === "register" ? "var(--primary)" : "transparent",
                  color: authMode === "register" ? "#ffffff" : "var(--text-secondary)",
                  boxShadow: authMode === "register" ? "0 2px 8px rgba(249, 115, 22, 0.25)" : "none",
                }}>
                Daftar Peserta
              </button>
            </div>
          )}

          <h2 style={{ marginBottom: 6, fontSize: "1.45rem", color: "var(--text-primary)", fontWeight: 800 }}>
            {resetToken
              ? "Atur Ulang Kata Sandi"
              : authMode === "register"
              ? "Pendaftaran Peserta Baru"
              : "Selamat Datang Kembali"}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 20, lineHeight: 1.5 }}>
            {resetToken
              ? "Masukkan kata sandi baru untuk akun Anda."
              : authMode === "register"
              ? "Buat akun peserta baru untuk mengakses modul dan sertifikasi digital."
              : "Silakan masuk dengan akun Anda untuk melanjutkan."}
          </p>

          {resetToken ? (
            /* Formulir Reset Password */
            <form onSubmit={handleResetSubmit}>
              <div className="form-group">
                <label htmlFor="new-password">Kata Sandi Baru</label>
                <div className="input-wrapper">
                  <Lock size={16} className="input-icon" />
                  <input
                    type="password"
                    id="new-password"
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password">Konfirmasi Kata Sandi Baru</label>
                <div className="input-wrapper">
                  <Lock size={16} className="input-icon" />
                  <input
                    type="password"
                    id="confirm-password"
                    required
                    minLength={6}
                    placeholder="Ulangi kata sandi baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              {resetError && (
                <div style={{ color: "#f87171", fontSize: "0.8rem", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={14} /> {resetError}
                </div>
              )}
              {resetMessage && (
                <div style={{ color: "#34d399", fontSize: "0.8rem", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={14} /> {resetMessage}
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={resetLoading}>
                <span>{resetLoading ? "Menyimpan..." : "Simpan Kata Sandi"}</span>
                <ArrowRight size={16} />
              </button>

              <div style={{ marginTop: 16, textAlign: "center" }}>
                <button
                  type="button"
                  onClick={() => setResetToken(null)}
                  style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.8rem", cursor: "pointer" }}>
                  ← Kembali ke Login
                </button>
              </div>
            </form>
          ) : authMode === "register" ? (
            /* Formulir Registrasi Peserta Baru */
            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <label htmlFor="reg-fullname">Nama Lengkap Peserta</label>
                <div className="input-wrapper">
                  <User size={16} className="input-icon" />
                  <input
                    type="text"
                    id="reg-fullname"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={regFullname}
                    onChange={(e) => setRegFullname(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reg-email">Alamat Email</label>
                <div className="input-wrapper">
                  <Mail size={16} className="input-icon" />
                  <input
                    type="email"
                    id="reg-email"
                    required
                    autoComplete="email"
                    placeholder="nama@email.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reg-password">Kata Sandi (Minimal 8 Karakter)</label>
                <div className="input-wrapper">
                  <Lock size={16} className="input-icon" />
                  <input
                    type="password"
                    id="reg-password"
                    required
                    minLength={8}
                    placeholder="Minimal 8 karakter"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reg-confirm">Konfirmasi Kata Sandi</label>
                <div className="input-wrapper">
                  <Lock size={16} className="input-icon" />
                  <input
                    type="password"
                    id="reg-confirm"
                    required
                    minLength={8}
                    placeholder="Ketik ulang kata sandi"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              {regError && (
                <div style={{ color: "#f87171", fontSize: "0.8rem", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={14} /> {regError}
                </div>
              )}
              {regSuccess && (
                <div style={{ color: "#34d399", fontSize: "0.8rem", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={14} /> {regSuccess}
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={regLoading}>
                <span>{regLoading ? "Mendaftarkan..." : "Daftar Akun Sekarang"}</span>
                <ArrowRight size={16} />
              </button>

              <div style={{ marginTop: 16, textAlign: "center", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Sudah memiliki akun?{" "}
                <button
                  type="button"
                  onClick={() => { setAuthMode("login"); setRegError(""); setRegSuccess(""); }}
                  style={{ background: "none", border: "none", padding: 0, color: "var(--primary)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
                  Masuk di sini
                </button>
              </div>
            </form>
          ) : (
            /* Formulir Login Utama */
            <>
              <div className="role-selector">
                {roles.map(r => {
                  const Icon = r.icon;
                  return (
                    <button type="button"
                      key={r.key}
                      className={`role-tab ${activeRole === r.key ? "active" : ""}`}
                      onClick={() => handleRoleTabChange(r.key)}
                    >
                      <Icon size={16} /><span>{r.label}</span>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleLoginSubmit}>
                <div className="form-group">
                  <label htmlFor="login-email">Alamat Email</label>
                  <div className="input-wrapper">
                    <Mail size={16} className="input-icon" />
                    <input
                      type="email"
                      id="login-email"
                      required
                      autoComplete="email"
                      placeholder="nama@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label htmlFor="login-password">Kata Sandi</label>
                    <button
                      type="button"
                      onClick={() => { setShowForgotModal(true); setForgotEmail(loginEmail); }}
                      style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.75rem", cursor: "pointer", padding: 0 }}>
                      Lupa Kata Sandi?
                    </button>
                  </div>
                  <div className="input-wrapper">
                    <Lock size={16} className="input-icon" />
                    <input
                      type="password"
                      id="login-password"
                      required
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary">
                  <span>Masuk</span><ArrowRight size={16} />
                </button>
              </form>

              <div className="prefilled-hint">
                Gunakan akun uji coba cepat:{" "}
                <button type="button" onClick={handlePrefill}
                  style={{ background:"none", border:"none", padding:0, font:"inherit", color:"inherit", cursor:"pointer", textDecoration:"underline" }}>
                  Isi Otomatis
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Lupa Kata Sandi */}
      {showForgotModal && (
        <div className="modal-overlay active">
          <div className="modal-content glass-panel" style={{ maxWidth: 420 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <KeyRound size={20} style={{ color: "var(--primary)" }} />
                <h3 style={{ margin: 0 }}>Reset Kata Sandi</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 16 }}>
              Masukkan alamat email Anda yang terdaftar. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi.
            </p>

            <form onSubmit={handleForgotSubmit}>
              <div className="form-group">
                <label htmlFor="forgot-email">Alamat Email</label>
                <div className="input-wrapper">
                  <Mail size={16} className="input-icon" />
                  <input
                    type="email"
                    id="forgot-email"
                    required
                    placeholder="nama@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>
              </div>

              {forgotError && (
                <div style={{ color: "#f87171", fontSize: "0.8rem", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={14} /> {forgotError}
                </div>
              )}
              {forgotMessage && (
                <div style={{ color: "#34d399", fontSize: "0.8rem", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={14} /> {forgotMessage}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForgotModal(false)}
                  style={{ flex: 1 }}>
                  Tutup
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={forgotLoading}
                  style={{ flex: 2 }}>
                  {forgotLoading ? "Mengirim..." : "Kirim Tautan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
