"use client";
import { Cpu, User, Briefcase, Landmark, ShieldCheck, Mail, Lock, ArrowRight, Award, CheckCircle2 } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function LoginPage() {
  const { activeRole, loginEmail, loginPassword, setLoginEmail, setLoginPassword, handleRoleTabChange, handlePrefill, handleLoginSubmit } = useApp();

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
          <div className="brand">
            <div className="brand-icon"><Cpu size={20} /></div>
            <span className="brand-name">NHCIE</span>
          </div>

          <div>
            <h1>
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

            <div className="partner-label">Diakui oleh institusi negara</div>
            <div className="partner-badges">
              <div className="partner-badge"><Award size={14} /> Univ. Trisakti</div>
              <div className="partner-badge"><Briefcase size={14} /> PT Royal Artindo Kreasi</div>
            </div>
          </div>

          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            v4.0 Enterprise &amp; Government Ready (React + Next.js App)
          </div>
        </div>

        <div className="login-form-side">
          <h2 style={{ marginBottom: 8, fontSize: "1.5rem" }}>Selamat Datang Kembali</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 24 }}>
            Silakan pilih peran Anda untuk melanjutkan.
          </p>

          <div className="role-selector">
            {roles.map(r => {
              const Icon = r.icon;
              return (
                <div
                  key={r.key}
                  className={`role-tab ${activeRole === r.key ? "active" : ""}`}
                  onClick={() => handleRoleTabChange(r.key)}
                >
                  <Icon size={16} /><span>{r.label}</span>
                </div>
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
              <label htmlFor="login-password">Kata Sandi</label>
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
            Gunakan akun uji coba cepat: <span onClick={handlePrefill}>Isi Otomatis</span>
          </div>
        </div>
      </div>
    </div>
  );
}
