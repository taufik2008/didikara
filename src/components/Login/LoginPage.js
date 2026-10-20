"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Cpu, User, Mail, Lock, ArrowRight, Award, CheckCircle2, KeyRound, X, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function LoginPage() {
  const router = useRouter();
  const { loginEmail, loginPassword, setLoginEmail, setLoginPassword, handlePrefill, handleLoginSubmit, platformSettings } = useApp();

  const handleCustomLoginSubmit = async (e) => {
    e.preventDefault();
    await handleLoginSubmit(e, () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect");
        if (redirect) {
          router.push(redirect);
        }
      }
    });
  };

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
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [regHoneypot, setRegHoneypot] = useState("");

  const [googleLoading, setGoogleLoading] = useState(false);
  const [oauthNotice, setOauthNotice] = useState({ type: "", message: "" });

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);

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

      const err = params.get("error");
      const msg = params.get("message");
      if (err) {
        setOauthNotice({
          type: "error",
          message: msg || "Autentikasi dengan akun Google tidak berhasil.",
        });
      }
    }
  }, []);

  const handleGoogleAuth = () => {
    setGoogleLoading(true);
    let redirectTarget = "/dashboard";
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      if (redirect) redirectTarget = redirect;
      window.location.href = `/api/auth/google?redirect=${encodeURIComponent(redirectTarget)}`;
    }
  };

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

    if (!privacyConsent) {
      setRegError("Anda wajib menyetujui Kebijakan Privasi dan Syarat & Ketentuan");
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
          privacyConsent: true,
          website_url: regHoneypot,
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


  const features = [
    "Sertifikasi Kompetensi Nasional",
    "Program Pelatihan Industri",
    "Koneksi Karir Strategis",
  ];

  const renderGoogleButton = (text) => (
    <button
      type="button"
      onClick={handleGoogleAuth}
      disabled={googleLoading}
      className="btn-google-auth"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "11px 16px",
        borderRadius: 8,
        border: "1.5px solid var(--border-color)",
        background: "rgba(255, 255, 255, 0.05)",
        color: "var(--text-primary)",
        fontWeight: 600,
        fontSize: "0.9rem",
        cursor: googleLoading ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
        opacity: googleLoading ? 0.7 : 1,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        />
      </svg>
      <span>{googleLoading ? "Menghubungkan ke Google..." : text}</span>
    </button>
  );

  const renderDivider = (text) => (
    <div style={{ display: "flex", alignItems: "center", margin: "16px 0", gap: 10 }}>
      <div style={{ flex: 1, height: 1, background: "var(--border-color)", opacity: 0.6 }} />
      <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
        {text}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--border-color)", opacity: 0.6 }} />
    </div>
  );

  const renderPasswordToggle = (show, toggleFn) => (
    <button
      type="button"
      onClick={toggleFn}
      aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
      tabIndex={-1}
      style={{
        position: "absolute",
        right: 12,
        top: "50%",
        transform: "translateY(-50%)",
        background: "none",
        border: "none",
        padding: 4,
        cursor: "pointer",
        color: "var(--text-muted)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "color 0.15s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
    >
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

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

          {oauthNotice.message && (
            <div style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#f87171",
              padding: "10px 14px",
              borderRadius: 8,
              marginBottom: 16,
              fontSize: "0.82rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{oauthNotice.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setOauthNotice({ type: "", message: "" })}
                style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: 2 }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {resetToken ? (
            /* Formulir Reset Password */
            <form onSubmit={handleResetSubmit}>
              <div className="form-group">
                <label htmlFor="new-password">Kata Sandi Baru</label>
                <div className="input-wrapper">
                  <Lock size={16} className="input-icon" />
                  <input
                    type={showResetNewPassword ? "text" : "password"}
                    id="new-password"
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    style={{ paddingRight: 40 }}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  {renderPasswordToggle(showResetNewPassword, () => setShowResetNewPassword(prev => !prev))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password">Konfirmasi Kata Sandi Baru</label>
                <div className="input-wrapper">
                  <Lock size={16} className="input-icon" />
                  <input
                    type={showResetConfirmPassword ? "text" : "password"}
                    id="confirm-password"
                    required
                    minLength={6}
                    placeholder="Ulangi kata sandi baru"
                    style={{ paddingRight: 40 }}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {renderPasswordToggle(showResetConfirmPassword, () => setShowResetConfirmPassword(prev => !prev))}
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
            <div>
              <div style={{ marginBottom: 14 }}>
                {renderGoogleButton("Daftar dengan Google (Gmail)")}
                <div style={{ textAlign: "center", marginTop: 6, fontSize: "0.74rem", color: "var(--text-secondary)" }}>
                  Registrasi instan &amp; resmi menggunakan Akun Google (Peserta Mandiri)
                </div>
              </div>

              {renderDivider("atau daftar manual dengan email")}

              <form onSubmit={handleRegisterSubmit}>
                {/* Anti-bot Honeypot field - Tersembunyi dari pengguna manusia */}
                <div style={{ display: "none", opacity: 0, position: "absolute", left: "-9999px" }} aria-hidden="true">
                  <input
                    type="text"
                    name="website_url"
                    tabIndex="-1"
                    autoComplete="off"
                  value={regHoneypot}
                  onChange={(e) => setRegHoneypot(e.target.value)}
                />
              </div>

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
                    type={showRegPassword ? "text" : "password"}
                    id="reg-password"
                    required
                    minLength={8}
                    placeholder="Minimal 8 karakter"
                    style={{ paddingRight: 40 }}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                  />
                  {renderPasswordToggle(showRegPassword, () => setShowRegPassword(prev => !prev))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reg-confirm">Konfirmasi Kata Sandi</label>
                <div className="input-wrapper">
                  <Lock size={16} className="input-icon" />
                  <input
                    type={showRegConfirmPassword ? "text" : "password"}
                    id="reg-confirm"
                    required
                    minLength={8}
                    placeholder="Ketik ulang kata sandi"
                    style={{ paddingRight: 40 }}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                  />
                  {renderPasswordToggle(showRegConfirmPassword, () => setShowRegConfirmPassword(prev => !prev))}
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

              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: "0.82rem", color: "var(--text-secondary)", cursor: "pointer", margin: "14px 0" }}>
                <input
                  type="checkbox"
                  required
                  checked={privacyConsent}
                  onChange={(e) => setPrivacyConsent(e.target.checked)}
                  style={{ marginTop: 3, cursor: "pointer" }}
                />
                <span style={{ lineHeight: 1.4 }}>
                  Saya telah membaca dan menyetujui{" "}
                  <a href="/legal/privasi" target="_blank" rel="noopener noreferrer" style={{ color: "#38bdf8", textDecoration: "underline" }}>
                    Kebijakan Privasi
                  </a>{" "}
                  dan{" "}
                  <a href="/legal/syarat-ketentuan" target="_blank" rel="noopener noreferrer" style={{ color: "#38bdf8", textDecoration: "underline" }}>
                    Syarat & Ketentuan
                  </a>{" "}
                  DIDIKARA sesuai UU No. 27/2022 (UU PDP).
                </span>
              </label>

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
            </div>
          ) : (
            /* Formulir Login Utama */
            <>
              <div style={{ marginBottom: 14 }}>
                {renderGoogleButton("Masuk dengan Google (Gmail)")}
              </div>

              {renderDivider("atau masuk dengan akun email")}


              <form onSubmit={handleCustomLoginSubmit}>
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
                      type={showLoginPassword ? "text" : "password"}
                      id="login-password"
                      required
                      autoComplete="current-password"
                      style={{ paddingRight: 40 }}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                    {renderPasswordToggle(showLoginPassword, () => setShowLoginPassword(prev => !prev))}
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
