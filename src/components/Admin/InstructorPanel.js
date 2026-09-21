"use client";
/**
 * InstructorPanel.js — tab "Instruktur" di Modul Admin.
 *
 * Dipisahkan dari AdminPage.js yang sudah terlalu panjang. Berisi tiga bagian:
 *   1. Penugasan pengajar per kursus (menentukan kewenangan mengajar).
 *   2. Profil instruktur yang tertaut akun, dengan jadwal turunan dari Live Class.
 *   3. Rekap dan pencatatan pembayaran bagi hasil.
 */
import { useCallback, useEffect, useState, useRef } from "react";
import { Plus, Edit2, Trash2, Target, Upload, Link as LinkIcon, X, Check, Camera, RefreshCw, UserCheck, Phone, Award, Building2, User } from "lucide-react";
import { useApp } from "@/context/AppContext";

// ── Penugasan Pengajar per Kursus ─────────────────────────────────────────────
// Kewenangan mengajar (melihat peserta, menilai, mengumumkan, membuat live
// class) dulu melekat pada peran: siapa pun berperan corporate/government
// otomatis menjadi instruktur SETIAP kursus. Panel ini menjadikannya penugasan
// yang tercatat per kursus.
function CourseInstructorPanel() {
  const { courses, users } = useApp();
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState({ courseId:"", userEmail:"" });
  const [msg, setMsg]   = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (tampilkanSpinner = true) => {
    if (tampilkanSpinner) setLoading(true);
    try {
      const res  = await fetch("/api/course-instructors");
      const data = await res.json();
      if (data.success) setAssignments(data.assignments || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(false); }, [load]);

  const tugaskan = async () => {
    if (!form.courseId || !form.userEmail) return setMsg("✕ Kursus dan pengguna wajib dipilih");
    try {
      const res  = await fetch("/api/course-instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setMsg(data.success ? "✓ Pengajar ditugaskan" : "✕ " + (data.error || "Gagal"));
      if (data.success) { setForm({ courseId:"", userEmail:"" }); load(); }
    } catch { setMsg("✕ Gagal menugaskan"); }
  };

  const hapusPenugasan = async (courseId, userEmail) => {
    if (!confirm(`Hapus penugasan ${userEmail} atas kursus ini?`)) return;
    await fetch(`/api/course-instructors?courseId=${encodeURIComponent(courseId)}&userEmail=${encodeURIComponent(userEmail)}`,
      { method: "DELETE" });
    load();
  };

  const kandidat = (users || []).filter(u => u.role !== "student");

  return (
    <div className="glass-card" style={{ padding:20, marginBottom:24 }}>
      <h4 style={{ fontSize:"0.9rem", color:"var(--text-primary)", marginBottom:6 }}>Penugasan Pengajar Kursus</h4>
      <p style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginBottom:14 }}>
        Menentukan siapa yang boleh melihat peserta, menilai tugas, membuat pengumuman,
        dan menjadwalkan live class untuk sebuah kursus. Tanpa penugasan di sini, pengguna
        non-admin tidak punya kewenangan atas kursus mana pun.
      </p>
      {msg && (
        <div style={{ fontSize:"0.75rem", padding:"6px 12px", borderRadius:6, marginBottom:12,
          background: msg.startsWith("✓") ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
          color: msg.startsWith("✓") ? "#6ee7b7" : "#fca5a5" }}>{msg}</div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:12, alignItems:"end", marginBottom:16 }}>
        <div className="form-group" style={{ margin:0 }}>
          <label style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>Kursus</label>
          <select value={form.courseId} onChange={e => setForm(p => ({ ...p, courseId:e.target.value }))} style={{ paddingLeft:12 }}>
            <option value="">-- Pilih Kursus --</option>
            {(courses||[]).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ margin:0 }}>
          <label style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>Pengguna</label>
          <select value={form.userEmail} onChange={e => setForm(p => ({ ...p, userEmail:e.target.value }))} style={{ paddingLeft:12 }}>
            <option value="">-- Pilih Pengguna --</option>
            {kandidat.map(u => <option key={u.email} value={u.email}>{u.fullname} ({u.email})</option>)}
          </select>
        </div>
        <button className="btn btn-primary" style={{ width:"auto", padding:"8px 16px", fontSize:"0.8rem" }} onClick={tugaskan}>
          <Plus size={14} style={{ marginRight:6 }} />Tugaskan
        </button>
      </div>

      {loading ? <p style={{ fontSize:"0.78rem", color:"var(--text-muted)" }}>Memuat…</p> : assignments.length === 0 ? (
        <p style={{ fontSize:"0.78rem", color:"var(--text-muted)" }}>Belum ada penugasan.</p>
      ) : (
        <table style={{ width:"100%", fontSize:"0.76rem", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ textAlign:"left", color:"var(--text-secondary)", borderBottom:"1px solid var(--border-color)" }}>
              <th style={{ padding:8 }}>Kursus</th><th style={{ padding:8 }}>Pengajar</th>
              <th style={{ padding:8 }}>Ditugaskan</th><th style={{ padding:8, textAlign:"right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map(a => (
              <tr key={`${a.course_id}-${a.user_email}`} style={{ borderBottom:"1px solid var(--border-color)" }}>
                <td style={{ padding:8, color:"var(--text-primary)", fontWeight:600 }}>{a.course_title || a.course_id}</td>
                <td style={{ padding:8 }}>{a.fullname || "—"} <span style={{ color:"var(--text-muted)" }}>({a.user_email})</span></td>
                <td style={{ padding:8, color:"var(--text-muted)" }}>
                  {a.assigned_at ? new Date(a.assigned_at).toLocaleDateString("id-ID") : "—"}
                </td>
                <td style={{ padding:8, textAlign:"right" }}>
                  <button className="btn btn-secondary" style={{ width:"auto", padding:"4px 10px", fontSize:"0.7rem", color:"var(--danger)", borderColor:"rgba(239,68,68,0.2)" }}
                    onClick={() => hapusPenugasan(a.course_id, a.user_email)}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Profil Instruktur & Full CRUD & Photo Upload ──────────────────────────────
function InstructorManager() {
  const { users } = useApp();
  const [daftar, setDaftar]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [msg, setMsg]           = useState("");
  const [tab, setTab]           = useState("profil");   // profil | payout
  const [isEditing, setIsEditing] = useState(false);
  const [inputMode, setInputMode] = useState("select"); // "select" | "custom"
  const [imageUploadMode, setImageUploadMode] = useState("file"); // "file" | "url"
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const formRef = useRef(null);

  const initialForm = {
    userEmail: "",
    fullname: "",
    organization: "",
    specialty: "",
    bio: "",
    phone: "",
    avatar: "",
    revenueSharePct: 30,
    active: true,
  };

  const [form, setForm] = useState(initialForm);

  const muat = useCallback(async (tampilkanSpinner = true) => {
    if (tampilkanSpinner) setLoading(true);
    try {
      const res  = await fetch("/api/instructors");
      const data = await res.json();
      if (data.success) setDaftar(data.instructors || []);
      else setMsg("✕ " + (data.error || "Gagal memuat"));
    } catch { setMsg("✕ Gagal memuat profil instruktur"); }
    setLoading(false);
  }, []);

  useEffect(() => { muat(false); }, [muat]);

  const processImageFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Format file tidak valid. Silakan pilih file gambar (JPG, PNG, WebP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const maxDim = 800;
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
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setForm(prev => ({ ...prev, avatar: dataUrl }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const simpan = async () => {
    if (!form.userEmail) return setMsg("✕ Email instruktur wajib diisi");
    try {
      const res = await fetch("/api/instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          revenueSharePct: Number(form.revenueSharePct) || 0,
        }),
      });
      const data = await res.json();
      setMsg(data.success ? "✓ Profil instruktur tersimpan" : "✕ " + (data.error || "Gagal"));
      if (data.success) {
        setForm(initialForm);
        setIsEditing(false);
        muat();
      }
    } catch { setMsg("✕ Gagal menyimpan profil instruktur"); }
  };

  const editProfil = (ins) => {
    setForm({
      userEmail: ins.user_email,
      fullname: ins.fullname || "",
      organization: ins.organization || "",
      specialty: ins.specialty || "",
      bio: ins.bio || "",
      phone: ins.phone || "",
      avatar: ins.avatar || "",
      revenueSharePct: Number(ins.revenue_share_pct) || 30,
      active: ins.active !== false,
    });
    setIsEditing(true);
    setInputMode("custom");
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const toggleAktif = async (email, currentActive) => {
    const action = currentActive ? "deactivate" : "activate";
    await fetch(`/api/instructors?email=${encodeURIComponent(email)}&action=${action}`, { method: "DELETE" });
    muat();
  };

  const hapusPermanen = async (email) => {
    if (!confirm(`Hapus permanen profil instruktur ${email}? Data penugasan dan riwayat terkait akan disesuaikan.`)) return;
    await fetch(`/api/instructors?email=${encodeURIComponent(email)}&action=delete`, { method: "DELETE" });
    muat();
  };

  const batalEdit = () => {
    setForm(initialForm);
    setIsEditing(false);
  };

  const kandidat = (users || []).filter(u => u.role !== "student");
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {[["profil","Profil & Jadwal"],["payout","Bagi Hasil"]].map(([k,l]) => (
          <button key={k} className={`btn ${tab===k ? "btn-primary" : "btn-secondary"}`}
            style={{ width:"auto", padding:"6px 16px", fontSize:"0.8rem" }}
            onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "payout" ? <PayoutPanel /> : (
        <>
          <CourseInstructorPanel />

          {/* Form CRUD & Foto Profil Instruktur */}
          <div ref={formRef} className="glass-card" style={{ padding:20, marginBottom:24, border: isEditing ? "1px solid var(--primary)" : "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
              <h4 style={{ fontSize:"0.95rem", color:"var(--text-primary)", margin:0, display: "flex", alignItems: "center", gap: 6 }}>
                {isEditing ? <><Edit2 size={16} style={{ color: "var(--primary)" }} /> Edit Profil Instruktur: <span style={{ color: "var(--primary)" }}>{form.fullname || form.userEmail}</span></> : <><Plus size={16} style={{ color: "var(--primary)" }} /> Tambah Profil Instruktur Baru</>}
              </h4>
              {isEditing && (
                <button type="button" className="btn btn-secondary" style={{ width: "auto", padding: "4px 10px", fontSize: "0.72rem" }} onClick={batalEdit}>
                  <X size={12} style={{ marginRight: 4 }} /> Batal &amp; Buat Baru
                </button>
              )}
            </div>
            <p style={{ fontSize:"0.75rem", color:"var(--text-muted)", marginBottom:16 }}>
              Lengkapi data profil, bidang keahlian, nomor kontak WhatsApp, foto avatar, dan persentase bagi hasil pengajar.
            </p>

            {msg && (
              <div style={{ fontSize:"0.78rem", padding:"8px 14px", borderRadius:8, marginBottom:16,
                background: msg.startsWith("✓") ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                color: msg.startsWith("✓") ? "var(--success)" : "var(--danger)",
                border: `1px solid ${msg.startsWith("✓") ? "var(--success)" : "var(--danger)"}`, fontWeight: 600 }}>{msg}</div>
            )}

            {/* Input Mode Selector (Hanya saat tambah baru) */}
            {!isEditing && (
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <button
                  type="button"
                  onClick={() => { setInputMode("select"); setForm(initialForm); }}
                  style={{
                    padding: "4px 10px", fontSize: "0.74rem", borderRadius: 6, cursor: "pointer", border: "1px solid var(--border-color)",
                    background: inputMode === "select" ? "var(--primary)" : "transparent",
                    color: inputMode === "select" ? "#fff" : "var(--text-secondary)", fontWeight: 600
                  }}>
                  👤 Pilih dari Akun Pengguna Terdaftar
                </button>
                <button
                  type="button"
                  onClick={() => { setInputMode("custom"); setForm(initialForm); }}
                  style={{
                    padding: "4px 10px", fontSize: "0.74rem", borderRadius: 6, cursor: "pointer", border: "1px solid var(--border-color)",
                    background: inputMode === "custom" ? "var(--primary)" : "transparent",
                    color: inputMode === "custom" ? "#fff" : "var(--text-secondary)", fontWeight: 600
                  }}>
                  ➕ Buat Akun &amp; Instruktur Baru Langsung
                </button>
              </div>
            )}

            {/* Row 1: Email, Nama, Organisasi */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:12, marginBottom: 12 }}>
              {inputMode === "select" && !isEditing ? (
                <div className="form-group" style={{ margin:0 }}>
                  <label style={{ fontSize:"0.75rem", color:"var(--text-muted)", fontWeight: 600 }}>Pilih Akun Pengguna *</label>
                  <select
                    value={form.userEmail}
                    onChange={e => {
                      const uEmail = e.target.value;
                      const uObj = kandidat.find(k => k.email === uEmail);
                      setForm(p => ({
                        ...p,
                        userEmail: uEmail,
                        fullname: uObj ? uObj.fullname : "",
                        organization: uObj ? (uObj.organization || "") : "",
                        avatar: uObj && uObj.avatar && uObj.avatar.startsWith("http") ? uObj.avatar : p.avatar
                      }));
                    }}
                    style={{ paddingLeft:12 }}>
                    <option value="">-- Pilih Akun Terdaftar --</option>
                    {kandidat.map(u => <option key={u.email} value={u.email}>{u.fullname} ({u.email})</option>)}
                  </select>
                </div>
              ) : (
                <div className="form-group" style={{ margin:0 }}>
                  <label style={{ fontSize:"0.75rem", color:"var(--text-muted)", fontWeight: 600 }}>Alamat Email Instruktur *</label>
                  <input
                    type="email"
                    value={form.userEmail}
                    disabled={isEditing}
                    placeholder="instruktur@didikara.id"
                    onChange={e => set("userEmail", e.target.value)}
                    style={{ paddingLeft:12, opacity: isEditing ? 0.7 : 1 }}
                  />
                </div>
              )}

              <div className="form-group" style={{ margin:0 }}>
                <label style={{ fontSize:"0.75rem", color:"var(--text-muted)", fontWeight: 600 }}>Nama Lengkap &amp; Gelar</label>
                <input
                  type="text"
                  value={form.fullname}
                  placeholder="Contoh: Prof. Dr. Kadir, M.T."
                  onChange={e => set("fullname", e.target.value)}
                  style={{ paddingLeft:12 }}
                />
              </div>

              <div className="form-group" style={{ margin:0 }}>
                <label style={{ fontSize:"0.75rem", color:"var(--text-muted)", fontWeight: 600 }}>Organisasi / Lembaga Asal</label>
                <input
                  type="text"
                  value={form.organization}
                  placeholder="Contoh: LKPP / DIDIKARA Expert"
                  onChange={e => set("organization", e.target.value)}
                  style={{ paddingLeft:12 }}
                />
              </div>
            </div>

            {/* Row 2: Keahlian, Telepon/WA, Bagi Hasil */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:12, marginBottom: 16 }}>
              <div className="form-group" style={{ margin:0 }}>
                <label style={{ fontSize:"0.75rem", color:"var(--text-muted)", fontWeight: 600 }}>Bidang Keahlian / Jabatan</label>
                <input type="text" value={form.specialty} placeholder="Contoh: Ahli Pengadaan Utama"
                  onChange={e => set("specialty", e.target.value)} style={{ paddingLeft:12 }} />
              </div>
              <div className="form-group" style={{ margin:0 }}>
                <label style={{ fontSize:"0.75rem", color:"var(--text-muted)", fontWeight: 600 }}>Nomor Telepon / WhatsApp</label>
                <input type="text" value={form.phone} placeholder="081234567890" onChange={e => set("phone", e.target.value)} style={{ paddingLeft:12 }} />
              </div>
              <div className="form-group" style={{ margin:0 }}>
                <label style={{ fontSize:"0.75rem", color:"var(--text-muted)", fontWeight: 600 }}>Bagi Hasil Pengajar (%)</label>
                <input type="number" min={0} max={100} value={form.revenueSharePct}
                  onChange={e => set("revenueSharePct", e.target.value)} style={{ paddingLeft:12 }} />
              </div>
            </div>

            {/* Row 3: Upload & Pengaturan Foto Profil Instruktur */}
            <div style={{ padding: 14, borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                <label style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Camera size={15} style={{ color: "var(--primary)" }} /> Foto Profil / Avatar Pengajar
                </label>
                <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.05)", padding: 2, borderRadius: 6 }}>
                  <button
                    type="button"
                    onClick={() => setImageUploadMode("file")}
                    style={{
                      padding: "4px 8px", fontSize: "0.72rem", border: "none", borderRadius: 4, cursor: "pointer",
                      background: imageUploadMode === "file" ? "var(--primary)" : "transparent",
                      color: imageUploadMode === "file" ? "#fff" : "var(--text-secondary)",
                      fontWeight: imageUploadMode === "file" ? 600 : 400,
                      display: "flex", alignItems: "center", gap: 4
                    }}
                  >
                    <Upload size={12} /> Dari Laptop
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUploadMode("url")}
                    style={{
                      padding: "4px 8px", fontSize: "0.72rem", border: "none", borderRadius: 4, cursor: "pointer",
                      background: imageUploadMode === "url" ? "var(--primary)" : "transparent",
                      color: imageUploadMode === "url" ? "#fff" : "var(--text-secondary)",
                      fontWeight: imageUploadMode === "url" ? 600 : 400,
                      display: "flex", alignItems: "center", gap: 4
                    }}
                  >
                    <LinkIcon size={12} /> Tautan URL
                  </button>
                </div>
              </div>

              {imageUploadMode === "file" ? (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processImageFile(e.target.files[0]);
                      }
                    }}
                    accept="image/png, image/jpeg, image/webp, image/gif"
                    style={{ display: "none" }}
                  />
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDragging ? "var(--primary)" : "var(--border-color)"}`,
                      borderRadius: 8,
                      padding: "16px",
                      textAlign: "center",
                      background: isDragging ? "rgba(249, 115, 22, 0.08)" : "rgba(255, 255, 255, 0.02)",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <Upload size={20} style={{ color: "var(--primary)", margin: "0 auto 6px auto", display: "block" }} />
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      Klik untuk memilih foto dari laptop Anda
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>
                      atau seret &amp; lepas gambar ke sini (JPG, PNG, WebP)
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    type="url"
                    value={form.avatar || ""}
                    onChange={(e) => set("avatar", e.target.value)}
                    placeholder="https://images.unsplash.com/... atau URL foto pengajar"
                    style={{ paddingLeft: 14 }}
                  />
                </div>
              )}

              {/* Preview Foto Box & Preset */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
                {/* Preview Avatar */}
                {form.avatar ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img
                      src={form.avatar}
                      alt="Preview Avatar"
                      style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--primary)" }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)" }}>Foto profil aktif</div>
                      <button
                        type="button"
                        onClick={() => set("avatar", "")}
                        style={{ background: "none", border: "none", color: "var(--danger)", fontSize: "0.7rem", cursor: "pointer", padding: 0 }}
                      >
                        ✕ Hapus Foto
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    Belum ada foto yang dipilih.
                  </div>
                )}

                {/* Foto Presets */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Pilihan Cepat:</span>
                  {[
                    { label: "Pria 1", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80" },
                    { label: "Pria 2", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80" },
                    { label: "Pria 3", url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80" },
                    { label: "Wanita 1", url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80" },
                    { label: "Wanita 2", url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80" },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: "2px 6px", fontSize: "0.68rem", height: "auto", width: "auto" }}
                      onClick={() => set("avatar", preset.url)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 4: Bio / Deskripsi Profil */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ fontSize:"0.75rem", color:"var(--text-muted)", fontWeight: 600 }}>Bio / Ringkasan Pengalaman Pengajar</label>
              <textarea
                value={form.bio}
                rows={2}
                placeholder="Pengalaman lebih dari 10 tahun memimpin implementasi pengadaan dan AI di berbagai institusi..."
                onChange={e => set("bio", e.target.value)}
                style={{ width: "100%", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "8px 12px", color: "var(--text-primary)", fontSize: "0.8rem" }}
              />
            </div>

            {/* Action Submit */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              {isEditing && (
                <button type="button" className="btn btn-secondary" style={{ width: "auto", padding: "8px 18px", fontSize: "0.82rem" }} onClick={batalEdit}>
                  Batal
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                style={{ width:"auto", padding:"10px 24px", fontSize:"0.85rem", fontWeight: 700, borderRadius: 8 }}
                onClick={simpan}>
                <Check size={16} /><span>{isEditing ? "Simpan Perubahan Profil" : "Tambah Instruktur"}</span>
              </button>
            </div>
          </div>

          {/* Daftar Profil Instruktur */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h4 style={{ fontSize: "0.95rem", color: "var(--text-primary)", margin: 0 }}>
              Daftar Profil Instruktur Terdaftar ({daftar.length})
            </h4>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: "auto", padding: "4px 10px", fontSize: "0.72rem" }}
              onClick={() => muat(true)}
            >
              <RefreshCw size={12} style={{ marginRight: 4 }} /> Segarkan
            </button>
          </div>

          {loading ? <p style={{ color:"var(--text-muted)", fontSize:"0.8rem" }}>Memuat profil instruktur…</p>
           : daftar.length === 0 ? (
            <div className="glass-card" style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
              <User size={32} style={{ opacity: 0.5, margin: "0 auto 8px auto" }} />
              <p style={{ margin: 0, fontSize:"0.85rem" }}>Belum ada profil instruktur. Tambahkan lewat formulir di atas.</p>
            </div>
          ) : daftar.map(ins => {
            const hasAvatar = ins.avatar && ins.avatar.startsWith("http");
            return (
              <div key={ins.user_email} className="glass-card" style={{ padding: 16, marginBottom: 14, borderLeft: ins.active ? "3px solid var(--primary)" : "3px solid var(--border-color)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 14, flex: 1, minWidth: 260 }}>
                    {/* Avatar Display */}
                    <div style={{
                      width: 52, height: 52, borderRadius: "50%",
                      background: "var(--primary-gradient)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontWeight: 700, fontSize: "1.1rem",
                      overflow: "hidden", flexShrink: 0, border: "2px solid rgba(255,255,255,0.1)"
                    }}>
                      {hasAvatar ? (
                        <img src={ins.avatar} alt={ins.fullname} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        (ins.fullname || ins.user_email).substring(0, 2).toUpperCase()
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.92rem", color:"var(--text-primary)" }}>{ins.fullname}</span>
                        {!ins.active ? (
                          <span style={{ fontSize:"0.65rem", background:"rgba(239,68,68,0.15)", color:"#fca5a5", padding:"2px 8px", borderRadius:20, fontWeight: 600 }}>
                            Nonaktif
                          </span>
                        ) : (
                          <span style={{ fontSize:"0.65rem", background:"rgba(16,185,129,0.15)", color:"#34d399", padding:"2px 8px", borderRadius:20, fontWeight: 600 }}>
                            ✓ Aktif
                          </span>
                        )}
                        <span style={{ fontSize:"0.65rem", background:"var(--accent-badge-bg)", color:"var(--text-accent)", border:"1px solid var(--accent-badge-border)", padding:"2px 8px", borderRadius:20 }}>
                          Bagi hasil {Number(ins.revenue_share_pct)}%
                        </span>
                      </div>

                      <div style={{ fontSize:"0.76rem", color:"var(--text-muted)", marginBottom:6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span>✉️ {ins.user_email}</span>
                        {ins.specialty && <span>• 🎓 {ins.specialty}</span>}
                        {ins.organization && <span>• 🏢 {ins.organization}</span>}
                        {ins.phone && <span>• 📱 {ins.phone}</span>}
                      </div>

                      {ins.bio && (
                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0 0 8px 0", fontStyle: "italic", lineHeight: 1.4 }}>
                          &ldquo;{ins.bio}&rdquo;
                        </p>
                      )}

                      <div style={{ display:"flex", gap:16, fontSize:"0.75rem", marginBottom:8, flexWrap:"wrap" }}>
                        <span>Kelas diajar: <strong>{ins.jumlah_kursus}</strong></span>
                        <span style={{ color: ins.tugas_belum_dinilai > 0 ? "#fbbf24" : "var(--text-muted)" }}>
                          Tugas belum dinilai: <strong>{ins.tugas_belum_dinilai}</strong>
                        </span>
                      </div>

                      <div style={{ fontSize:"0.75rem" }}>
                        <div style={{ color:"var(--text-secondary)", marginBottom:4, fontWeight: 600 }}>Jadwal terdekat (dari Live Class):</div>
                        {(ins.jadwal_terdekat || []).length === 0 ? (
                          <div style={{ color:"var(--text-muted)", fontSize: "0.72rem" }}>Belum ada sesi terjadwal.</div>
                        ) : (
                          <ul style={{ margin:0, paddingLeft:18, color:"var(--text-muted)", fontSize: "0.72rem" }}>
                            {ins.jadwal_terdekat.map(s => (
                              <li key={s.id} style={{ marginBottom:2 }}>
                                {new Date(s.scheduled_at).toLocaleString("id-ID", { dateStyle:"medium", timeStyle:"short" })}
                                {" — "}{s.title}
                                <span style={{ color:"var(--text-secondary)" }}>
                                  {" "}({s.course_title || "tanpa kursus"}, {s.registered_count} peserta)
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display:"flex", flexDirection:"column", gap:6, minWidth: 110 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width:"100%", padding:"6px 12px", fontSize:"0.74rem" }}
                      onClick={() => editProfil(ins)}
                    >
                      <Edit2 size={12} style={{ marginRight:4 }} /> Edit Profil &amp; Foto
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        width:"100%", padding:"5px 10px", fontSize:"0.72rem",
                        color: ins.active ? "var(--warning)" : "var(--success)",
                        borderColor: ins.active ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.3)"
                      }}
                      onClick={() => toggleAktif(ins.user_email, ins.active)}
                    >
                      {ins.active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width:"100%", padding:"4px 8px", fontSize:"0.7rem", color:"var(--danger)", borderColor: "rgba(239,68,68,0.2)" }}
                      onClick={() => hapusPermanen(ins.user_email)}
                    >
                      <Trash2 size={11} style={{ marginRight: 4 }} /> Hapus Profil
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── Rekap & pembayaran bagi hasil ────────────────────────────────────────────
function PayoutPanel() {
  const bulanLalu = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const akhirBulanLalu = new Date(new Date().getFullYear(), new Date().getMonth(), 0);

  const [periode, setPeriode] = useState({
    start: bulanLalu.toISOString().slice(0, 10),
    end:   akhirBulanLalu.toISOString().slice(0, 10),
  });
  const [rows, setRows]       = useState([]);
  const [ringkas, setRingkas] = useState(null);
  const [msg, setMsg]         = useState("");
  const [loading, setLoading] = useState(false);

  const muat = useCallback(async (tampilkanSpinner = true) => {
    if (tampilkanSpinner) setLoading(true);
    try {
      const res  = await fetch("/api/instructor-payouts");
      const data = await res.json();
      if (data.success) { setRows(data.payouts || []); setRingkas(data.ringkas || null); }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { muat(false); }, [muat]);

  const hitung = async () => {
    setMsg("");
    try {
      const res  = await fetch("/api/instructor-payouts", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ action:"generate", periodStart: periode.start, periodEnd: periode.end }),
      });
      const data = await res.json();
      setMsg(data.success ? `✓ Rekap dihitung untuk ${data.dihitung} instruktur` : "✕ " + (data.error || "Gagal"));
      muat();
    } catch { setMsg("✕ Gagal menghitung rekap"); }
  };

  const tandaiBayar = async (row) => {
    const reference = prompt(`Nomor referensi pembayaran untuk ${row.fullname} (Rp ${Number(row.payout_amount).toLocaleString("id-ID")}):`);
    if (reference === null) return;
    const res  = await fetch("/api/instructor-payouts", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ action:"mark_paid", id: row.id, reference }),
    });
    const data = await res.json();
    setMsg(data.success ? "✓ Pembayaran dicatat" : "✕ " + (data.error || "Gagal"));
    muat();
  };

  const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

  return (
    <div>
      <div className="glass-card" style={{ padding:20, marginBottom:20 }}>
        <h4 style={{ fontSize:"0.9rem", color:"var(--text-primary)", marginBottom:6 }}>Hitung Rekap Bagi Hasil</h4>
        <p style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginBottom:14 }}>
          Dihitung dari order berstatus lunas pada kursus yang diampu tiap instruktur, dikalikan
          persentase bagi hasil di profilnya. Baris yang sudah ditandai dibayar tidak ikut berubah
          saat rekap dihitung ulang.
        </p>
        {msg && (
          <div style={{ fontSize:"0.75rem", padding:"6px 12px", borderRadius:6, marginBottom:12,
            background: msg.startsWith("✓") ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
            color: msg.startsWith("✓") ? "#6ee7b7" : "#fca5a5" }}>{msg}</div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:12, alignItems:"end" }}>
          <div className="form-group" style={{ margin:0 }}>
            <label style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>Periode mulai</label>
            <input type="date" value={periode.start} onChange={e => setPeriode(p => ({ ...p, start:e.target.value }))} style={{ paddingLeft:12 }} />
          </div>
          <div className="form-group" style={{ margin:0 }}>
            <label style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>Periode selesai</label>
            <input type="date" value={periode.end} onChange={e => setPeriode(p => ({ ...p, end:e.target.value }))} style={{ paddingLeft:12 }} />
          </div>
          <button className="btn btn-primary" style={{ width:"auto", padding:"8px 16px", fontSize:"0.8rem" }} onClick={hitung}>
            <Target size={14} style={{ marginRight:6 }} />Hitung Rekap
          </button>
        </div>
      </div>

      {ringkas && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:20 }}>
          {[
            ["Total bagi hasil", rp(ringkas.total_payout), "var(--primary)"],
            ["Belum dibayar",    rp(ringkas.belum_dibayar), "#fbbf24"],
            ["Jumlah baris",     ringkas.jumlah_baris,      "#6ee7b7"],
          ].map(([l, v, c]) => (
            <div key={l} className="glass-card" style={{ padding:16, textAlign:"center" }}>
              <div style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>{l}</div>
              <div style={{ fontSize:"1.1rem", fontWeight:700, color:c, marginTop:4 }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? <p style={{ color:"var(--text-muted)", fontSize:"0.8rem" }}>Memuat…</p>
       : rows.length === 0 ? (
        <p style={{ color:"var(--text-muted)", fontSize:"0.8rem" }}>
          Belum ada rekap. Tentukan periode lalu tekan Hitung Rekap.
        </p>
      ) : (
        <table style={{ width:"100%", fontSize:"0.76rem", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ textAlign:"left", color:"var(--text-secondary)", borderBottom:"1px solid var(--border-color)" }}>
              <th style={{ padding:8 }}>Instruktur</th><th style={{ padding:8 }}>Periode</th>
              <th style={{ padding:8, textAlign:"right" }}>Bruto</th><th style={{ padding:8, textAlign:"center" }}>%</th>
              <th style={{ padding:8, textAlign:"right" }}>Bagi hasil</th><th style={{ padding:8 }}>Status</th>
              <th style={{ padding:8, textAlign:"right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} style={{ borderBottom:"1px solid var(--border-color)" }}>
                <td style={{ padding:8, color:"var(--text-primary)", fontWeight:600 }}>
                  {r.fullname || r.user_email}
                  <div style={{ color:"var(--text-muted)", fontSize:"0.68rem" }}>{r.order_count} transaksi</div>
                </td>
                <td style={{ padding:8, color:"var(--text-muted)" }}>
                  {String(r.period_start).slice(0,10)} — {String(r.period_end).slice(0,10)}
                </td>
                <td style={{ padding:8, textAlign:"right" }}>{rp(r.gross_amount)}</td>
                <td style={{ padding:8, textAlign:"center" }}>{Number(r.share_pct)}%</td>
                <td style={{ padding:8, textAlign:"right", fontWeight:700, color:"var(--primary)" }}>{rp(r.payout_amount)}</td>
                <td style={{ padding:8 }}>
                  <span style={{ color: r.status === "paid" ? "#6ee7b7" : "#fbbf24" }}>
                    {r.status === "paid" ? "Dibayar" : "Belum dibayar"}
                  </span>
                  {r.reference && <div style={{ color:"var(--text-muted)", fontSize:"0.68rem" }}>Ref: {r.reference}</div>}
                </td>
                <td style={{ padding:8, textAlign:"right" }}>
                  {r.status === "unpaid" && (
                    <button className="btn btn-secondary" style={{ width:"auto", padding:"4px 10px", fontSize:"0.7rem" }}
                      onClick={() => tandaiBayar(r)}>Tandai Dibayar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
export default InstructorManager;
