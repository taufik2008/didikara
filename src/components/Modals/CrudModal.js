"use client";
import { useState, useRef, useMemo, useEffect } from "react";
import { Check, CheckSquare, Square, Upload, Image as ImageIcon, Link as LinkIcon, X, Award, UserCheck, Eye, EyeOff, BookOpen, GraduationCap, Lock, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function CrudModal() {
  const {
    crudModalActive, crudType, crudAction, categories, levels, competencySkills = [], courseForm, userForm,
    courses, users, currentUser, editingId,
    setCourseForm, setUserForm, setCrudModalActive,
    handleSaveCrud, handleDeleteCrud, handlePermissionToggle
  } = useApp();

  const isInstructorUser = currentUser?.role === "instructor";

  const [imageUploadMode, setImageUploadMode] = useState("file"); // "file" | "url"
  const [isDragging, setIsDragging] = useState(false);
  const [courseStep, setCourseStep] = useState(1); // 1: Info Dasar & Media, 2: Instruktur & Detail, 3: Biaya & Deskripsi
  const [apiInstructors, setApiInstructors] = useState([]);
  const [showUserPassword, setShowUserPassword] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (crudModalActive && crudType === "course") {
      fetch("/api/instructors")
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.instructors)) {
            setApiInstructors(data.instructors);
          }
        })
        .catch(() => {});
    }
  }, [crudModalActive, crudType]);

  // Kunci data pengajar otomatis ke profil user jika role instruktur
  useEffect(() => {
    if (crudModalActive && crudType === "course" && isInstructorUser && currentUser) {
      setCourseForm(prev => ({
        ...prev,
        instructorName: currentUser.fullname || prev.instructorName,
        instructorEmail: currentUser.email || prev.instructorEmail,
        instructorTitle: currentUser.jobTitle || prev.instructorTitle || "Instruktur / Pengajar Ahli",
        instructorOrg: currentUser.organization || prev.instructorOrg || "DIDIKARA Certified",
        instructorAvatar: currentUser.avatar || prev.instructorAvatar || ""
      }));
    }
  }, [crudModalActive, crudType, isInstructorUser, currentUser]);

  // Kumpulan seluruh data instruktur unik yang ada di sistem
  const availableInstructors = useMemo(() => {
    const map = new Map();

    // 1. Instruktur & Pengguna berkewenangan dari tabel users
    (users || []).forEach(u => {
      if (u.role !== "student") {
        const roleLabel = u.role === "admin" ? "Platform Admin" : u.role === "instructor" ? "Instruktur Ahli" : u.roleLabel || u.role;
        map.set(u.email, {
          key: u.email,
          name: u.fullname,
          title: u.jobTitle || `${roleLabel}`,
          org: u.organization || "LMS Certified",
          email: u.email,
          avatar: u.avatar || "",
          source: "Pengguna Terdaftar"
        });
      }
    });

    // 2. Profil instruktur dari /api/instructors
    (apiInstructors || []).forEach(p => {
      const email = p.user_email || p.email;
      if (!email) return;
      if (map.has(email)) {
        const existing = map.get(email);
        if (p.fullname) existing.name = p.fullname;
        if (p.specialty) existing.title = p.specialty;
        if (p.organization) existing.org = p.organization;
        if (p.avatar) existing.avatar = p.avatar;
      } else {
        map.set(email, {
          key: email,
          name: p.fullname || email,
          title: p.specialty || "Instruktur Ahli",
          org: p.organization || "LMS Certified",
          email: email,
          avatar: p.avatar || "",
          source: "Profil Instruktur"
        });
      }
    });

    // 3. Instruktur yang tercatat di daftar program kursus
    (courses || []).forEach(c => {
      if (c.instructor && c.instructor.name) {
        const nameKey = c.instructor.name.trim();
        const existing = Array.from(map.values()).find(ins => ins.name.toLowerCase() === nameKey.toLowerCase());
        if (!existing) {
          map.set(`ins_${nameKey}`, {
            key: `ins_${nameKey}`,
            name: c.instructor.name,
            title: c.instructor.title || "Pengajar Ahli",
            org: c.instructor.org || "LMS Certified",
            email: c.instructor.email || "",
            avatar: c.instructor.avatar || "",
            source: "Database Kursus"
          });
        }
      }
    });

    return Array.from(map.values());
  }, [users, courses, apiInstructors]);

  // Cari key instruktur yang sedang terpilih
  const selectedInstructorKey = useMemo(() => {
    if (!courseForm.instructorName && !courseForm.instructorEmail) return "";
    const match = availableInstructors.find(ins => 
      (courseForm.instructorEmail && ins.email === courseForm.instructorEmail) ||
      (courseForm.instructorName && ins.name.toLowerCase() === courseForm.instructorName.toLowerCase())
    );
    return match ? match.key : "custom";
  }, [courseForm.instructorName, courseForm.instructorEmail, availableInstructors]);

  const handleInstructorSelect = (e) => {
    const val = e.target.value;
    if (!val) {
      setCourseForm(prev => ({
        ...prev,
        instructorName: "",
        instructorTitle: "",
        instructorEmail: "",
        instructorAvatar: "",
        instructorOrg: ""
      }));
      return;
    }

    if (val === "custom") {
      setCourseForm(prev => ({
        ...prev,
        instructorEmail: "",
        instructorAvatar: "",
        instructorOrg: "LMS Certified"
      }));
      return;
    }

    const selected = availableInstructors.find(ins => ins.key === val);
    if (selected) {
      setCourseForm(prev => ({
        ...prev,
        instructorName: selected.name,
        instructorTitle: selected.title || "Pengajar Ahli",
        instructorEmail: selected.email || "",
        instructorAvatar: selected.avatar || "",
        instructorOrg: selected.org || "LMS Certified"
      }));
    }
  };

  const processImageFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Format file tidak valid. Silakan pilih file gambar (JPG, PNG, WebP, GIF).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        // Otomatis kompresi resolusi jika gambar sangat besar (max 1200px) agar performa database & client tetap cepat
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const maxDim = 1200;
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
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setCourseForm(prev => ({ ...prev, image: compressedDataUrl }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };

  return (
    <div
      className={`modal-overlay ${crudModalActive ? 'active' : ''}`}
      onClick={() => setCrudModalActive(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-content glass-panel"
        style={{
          width: crudType === "course" ? 980 : 760,
          maxWidth: "95vw",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: crudType === "course" ? "32px 36px" : "28px 32px",
          borderRadius: 16,
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.45)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal with Icon, Title, Subtitle, and Close X button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 12,
              background: crudType === "course" ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)", flexShrink: 0
            }}>
              {crudType === "course" ? <BookOpen size={24} /> : <UserCheck size={24} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)" }}>
                {crudAction === "add" ? "Buat Program Pelatihan Baru" : "Edit Program Pelatihan"}
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {crudType === "course"
                  ? "Lengkapi informasi silabus, model pembelajaran, banner katalog, dan instruktur pengajar."
                  : "Kelola profil pengguna, kredensial login, dan hak akses izin sistem."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCrudModalActive(false)}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid var(--border-color)",
              borderRadius: "50%",
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-muted)",
              transition: "all 0.2s"
            }}
            title="Tutup Modal"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSaveCrud}>
          {crudType === "course" && (
            <div>
              {/* Wizard Step Indicator */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, borderBottom: "1px solid var(--border-color)", paddingBottom: 16 }}>
                {[
                  { step: 1, label: "1. Informasi & Media Banner", icon: ImageIcon, desc: "Judul, kategori, model & cover" },
                  { step: 2, label: "2. Pengajar & Spesifikasi", icon: UserCheck, desc: "Instruktur, durasi & badge" },
                  { step: 3, label: "3. Biaya, Deskripsi & Rilis", icon: Award, desc: "Biaya pelatihan & silabus" }
                ].map((s) => {
                  const Icon = s.icon;
                  const isActive = courseStep === s.step;
                  return (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => setCourseStep(s.step)}
                      style={{
                        flex: 1,
                        padding: "12px 16px",
                        borderRadius: 10,
                        border: isActive ? "1.5px solid var(--primary)" : "1px solid var(--border-color)",
                        cursor: "pointer",
                        background: isActive ? "linear-gradient(135deg, rgba(37,99,235,0.18) 0%, rgba(29,78,216,0.12) 100%)" : "var(--bg-tertiary)",
                        color: isActive ? "var(--primary)" : "var(--text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        textAlign: "left",
                        transition: "all 0.2s ease"
                      }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: isActive ? "var(--primary)" : "rgba(255,255,255,0.06)",
                        color: isActive ? "#ffffff" : "var(--text-muted)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                      }}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: "0.88rem", fontWeight: isActive ? 800 : 600, color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}>
                          {s.label}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                          {s.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Step 1: Info Dasar & Media */}
              {courseStep === 1 && (
                <div>
                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: 8, display: "block" }}>
                      Judul Program Pelatihan *
                    </label>
                    <input
                      type="text"
                      value={courseForm.title}
                      onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                      required
                      placeholder="Contoh: Sertifikasi Pengadaan Barang & Jasa Pemerintah (PBJ)"
                      style={{ height: 48, fontSize: "1rem", padding: "0 16px", fontWeight: 600, borderRadius: 8 }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18, marginBottom: 20 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: 8, display: "block" }}>
                        Model Pembelajaran *
                      </label>
                      <select
                        value={courseForm.learningType || "self_learning"}
                        onChange={(e) => setCourseForm({ ...courseForm, learningType: e.target.value })}
                        style={{ height: 44, padding: "0 14px", fontWeight: 600, fontSize: "0.9rem", borderRadius: 8 }}
                      >
                        <option value="self_learning">🟢 Self-Learning (Belajar Mandiri On-Demand)</option>
                        <option value="online">🔵 Online (Live Webinar Interaktif)</option>
                        <option value="offline">🟣 Offline (Tatap Muka & Praktik Langsung)</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: 8, display: "block" }}>
                        Kategori Bidang *
                      </label>
                      <select
                        value={courseForm.category}
                        onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                        style={{ height: 44, padding: "0 14px", fontSize: "0.9rem", borderRadius: 8 }}
                      >
                        {categories.map(cat => <option key={cat.key} value={cat.key}>{cat.name}</option>)}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: 8, display: "block" }}>
                        Tingkat Kemahiran (Level) *
                      </label>
                      <select
                        value={courseForm.level}
                        onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}
                        style={{ height: 44, padding: "0 14px", fontSize: "0.9rem", borderRadius: 8 }}
                      >
                        {levels.map(lvl => <option key={lvl.key} value={lvl.key}>{lvl.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {(courseForm.learningType === "offline" || courseForm.learningType === "online") && (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: 16,
                      marginBottom: 20,
                      padding: "16px 20px",
                      background: "rgba(255,255,255,0.02)",
                      borderRadius: 12,
                      border: "1px dashed var(--border-color)"
                    }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: 6, display: "block" }}>
                          {courseForm.learningType === "offline" ? "📍 Lokasi / Gedung / Hotel Tatap Muka" : "🌐 Platform / Tautan Webinar"}
                        </label>
                        <input
                          type="text"
                          value={courseForm.venue || ""}
                          onChange={(e) => setCourseForm({ ...courseForm, venue: e.target.value })}
                          placeholder={courseForm.learningType === "offline" ? "Contoh: Hotel Sheraton Surabaya" : "Contoh: Zoom Meeting & Google Meet"}
                          style={{ height: 42, padding: "0 12px", fontSize: "0.88rem", borderRadius: 8 }}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: 6, display: "block" }}>
                          🗓️ Jadwal / Tanggal Pelaksanaan
                        </label>
                        <input
                          type="text"
                          value={courseForm.schedule || ""}
                          onChange={(e) => setCourseForm({ ...courseForm, schedule: e.target.value })}
                          placeholder={courseForm.learningType === "offline" ? "Contoh: 24 - 26 Nov 2026 (09:00 - 17:00 WIB)" : "Contoh: Setiap Sabtu (09:00 - 15:00 WIB)"}
                          style={{ height: 42, padding: "0 12px", fontSize: "0.88rem", borderRadius: 8 }}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: 6, display: "block" }}>
                          👥 Kuota Maksimal Peserta
                        </label>
                        <input
                          type="text"
                          value={courseForm.quota || ""}
                          onChange={(e) => setCourseForm({ ...courseForm, quota: e.target.value })}
                          placeholder="Contoh: Sisa 10 Kursi (Maks 30)"
                          style={{ height: 42, padding: "0 12px", fontSize: "0.88rem", borderRadius: 8 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Upload Image Section */}
                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <label style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700 }}>
                        Gambar / Banner Thumbnail Katalog Pelatihan
                      </label>
                      <div style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.05)", padding: 3, borderRadius: 8 }}>
                        <button
                          type="button"
                          onClick={() => setImageUploadMode("file")}
                          style={{
                            padding: "6px 12px", fontSize: "0.78rem", border: "none", borderRadius: 6, cursor: "pointer",
                            background: imageUploadMode === "file" ? "var(--primary)" : "transparent",
                            color: imageUploadMode === "file" ? "#fff" : "var(--text-secondary)",
                            fontWeight: imageUploadMode === "file" ? 700 : 500,
                            display: "flex", alignItems: "center", gap: 6
                          }}
                        >
                          <Upload size={14} /> Unggah dari Komputer
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageUploadMode("url")}
                          style={{
                            padding: "6px 12px", fontSize: "0.78rem", border: "none", borderRadius: 6, cursor: "pointer",
                            background: imageUploadMode === "url" ? "var(--primary)" : "transparent",
                            color: imageUploadMode === "url" ? "#fff" : "var(--text-secondary)",
                            fontWeight: imageUploadMode === "url" ? 700 : 500,
                            display: "flex", alignItems: "center", gap: 6
                          }}
                        >
                          <LinkIcon size={14} /> Tautan URL Gambar
                        </button>
                      </div>
                    </div>

                    {imageUploadMode === "file" ? (
                      <div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileInputChange}
                          accept="image/png, image/jpeg, image/webp, image/gif"
                          style={{ display: "none" }}
                        />
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            border: `2px dashed ${isDragging ? "var(--primary)" : "var(--border-color)"}`,
                            borderRadius: 12,
                            padding: "36px 24px",
                            textAlign: "center",
                            background: isDragging ? "rgba(37, 99, 235, 0.1)" : "rgba(255, 255, 255, 0.02)",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <Upload size={32} style={{ color: "var(--primary)", margin: "0 auto 10px auto", display: "block" }} />
                          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                            Klik untuk memilih file foto/banner dari laptop Anda
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 6 }}>
                            atau seret &amp; lepas (drag and drop) berkas gambar ke sini (JPG, PNG, WebP)
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="url"
                          value={courseForm.image || ""}
                          onChange={(e) => setCourseForm({ ...courseForm, image: e.target.value })}
                          placeholder="https://images.unsplash.com/... atau URL gambar langsung"
                          style={{ height: 44, padding: "0 16px", fontSize: "0.9rem", borderRadius: 8 }}
                        />
                      </div>
                    )}

                    {/* Preview Banner Box */}
                    {courseForm.image && (
                      <div style={{
                        marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between",
                        gap: 16, padding: "14px 18px", borderRadius: 10,
                        background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <img
                            src={courseForm.image}
                            alt="Preview Thumbnail"
                            style={{ width: 110, height: 68, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border-color)" }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <div>
                            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>Preview Banner Katalog</div>
                            <div style={{ fontSize: "0.78rem", color: "#34d399", marginTop: 2 }}>✓ Gambar siap digunakan di kartu pelatihan</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: "6px 12px", fontSize: "0.8rem", height: "auto", width: "auto", color: "var(--danger)", borderColor: "rgba(239, 68, 68, 0.3)" }}
                          onClick={() => setCourseForm({ ...courseForm, image: "" })}
                          title="Hapus gambar"
                        >
                          <X size={14} style={{ marginRight: 4 }} /> Hapus
                        </button>
                      </div>
                    )}

                    {/* Quick Presets */}
                    <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>Preset Contoh Banner:</span>
                      {[
                        { label: "Pengadaan Barang/Jasa", url: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80" },
                        { label: "AI & Teknologi", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80" },
                        { label: "Data Analytics", url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80" },
                        { label: "Kepemimpinan ASN", url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&auto=format&fit=crop&q=80" },
                        { label: "Keuangan Publik", url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80" },
                        { label: "Manajemen Mutu", url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80" }
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: "5px 12px", fontSize: "0.75rem", height: "auto", width: "auto", borderRadius: 6 }}
                          onClick={() => setCourseForm({ ...courseForm, image: preset.url })}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Instruktur & Spesifikasi */}
              {courseStep === 2 && (
                <div>
                  {isInstructorUser ? (
                    <div className="form-group" style={{ marginBottom: 20 }}>
                      <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>Instruktur / Pengajar Pelatihan *</span>
                        <span style={{ fontSize: "0.75rem", padding: "3px 10px", borderRadius: 8, background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", fontWeight: 700, border: "1px solid rgba(59, 130, 246, 0.3)" }}>
                          🔒 Terkunci pada Akun Anda (Read-Only)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={`👨‍🏫 ${currentUser?.fullname} (${currentUser?.email || ""}) — ${currentUser?.jobTitle || "Instruktur / Pengajar Ahli"}`}
                        readOnly
                        disabled
                        style={{
                          width: "100%", height: 46, padding: "0 16px", borderRadius: 8,
                          border: "1.5px solid rgba(59, 130, 246, 0.35)",
                          background: "rgba(59, 130, 246, 0.05)",
                          color: "var(--text-primary)",
                          fontSize: "0.9rem", fontWeight: 600,
                          cursor: "not-allowed"
                        }}
                      />
                      <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 6, display: "block" }}>
                        💡 Pada role Instruktur, pengajar kursus otomatis terhubung dengan profil akun Anda dan tidak dapat memilih atau menambah instruktur lain.
                      </span>
                    </div>
                  ) : (
                    <div className="form-group" style={{ marginBottom: 20 }}>
                      <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>Pilih Instruktur / Pengajar Terdaftar *</span>
                        <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                          {availableInstructors.length} Instruktur tersedia
                        </span>
                      </label>
                      <select
                        value={selectedInstructorKey}
                        onChange={handleInstructorSelect}
                        required
                        style={{
                          width: "100%", height: 46, padding: "0 16px", borderRadius: 8,
                          border: "1px solid var(--border-color)",
                          background: "var(--bg-card)",
                          color: "var(--text-primary)",
                          fontSize: "0.9rem", fontWeight: 600
                        }}
                      >
                        <option value="">-- Pilih dari Data Instruktur Terdaftar --</option>
                        {availableInstructors.map((ins) => (
                          <option key={ins.key} value={ins.key}>
                            👨‍🏫 {ins.name} — {ins.title || ins.org || "Instruktur"} {ins.email ? `(${ins.email})` : ""}
                          </option>
                        ))}
                        <option value="custom">➕ Input Instruktur Baru / Manual...</option>
                      </select>
                    </div>
                  )}

                  {/* Selected Instructor Preview Card */}
                  {courseForm.instructorName && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "16px 20px", borderRadius: 12,
                      background: "rgba(99, 102, 241, 0.08)",
                      border: "1px solid rgba(99, 102, 241, 0.25)",
                      marginBottom: 20
                    }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: "50%",
                        background: "var(--primary)", color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: "1.1rem", overflow: "hidden", flexShrink: 0
                      }}>
                        {courseForm.instructorAvatar && courseForm.instructorAvatar.startsWith("http") ? (
                          <img src={courseForm.instructorAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          courseForm.instructorName.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                          {courseForm.instructorName}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 2 }}>
                          {courseForm.instructorTitle || "Pengajar Ahli"} {courseForm.instructorOrg ? `• ${courseForm.instructorOrg}` : ""}
                        </div>
                        {courseForm.instructorEmail && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                            ✉️ {courseForm.instructorEmail}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: 12, background: "rgba(16,185,129,0.15)", color: "#34d399", fontWeight: 700 }}>
                        ✓ {isInstructorUser ? "Profil Terkunci" : "Pengajar Terpilih"}
                      </span>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: 8, display: "block" }}>
                        Nama Instruktur / Pengajar *
                      </label>
                      <input
                        type="text"
                        value={courseForm.instructorName || ""}
                        onChange={(e) => setCourseForm({ ...courseForm, instructorName: e.target.value })}
                        placeholder="Pilih instruktur di atas atau ketik manual..."
                        required
                        readOnly={isInstructorUser}
                        disabled={isInstructorUser}
                        style={{
                          height: 44, padding: "0 16px", fontSize: "0.9rem", borderRadius: 8,
                          cursor: isInstructorUser ? "not-allowed" : "text",
                          background: isInstructorUser ? "rgba(255,255,255,0.03)" : undefined
                        }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: 8, display: "block" }}>
                        Gelar / Spesialisasi Instruktur
                      </label>
                      <input
                        type="text"
                        value={courseForm.instructorTitle || ""}
                        onChange={(e) => setCourseForm({ ...courseForm, instructorTitle: e.target.value })}
                        placeholder="Contoh: Ahli Pengadaan Utama LKPP / Asesor BNSP"
                        readOnly={isInstructorUser}
                        disabled={isInstructorUser}
                        style={{
                          height: 44, padding: "0 16px", fontSize: "0.9rem", borderRadius: 8,
                          cursor: isInstructorUser ? "not-allowed" : "text",
                          background: isInstructorUser ? "rgba(255,255,255,0.03)" : undefined
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: 8, display: "block" }}>
                        Tautan URL Foto / Avatar Instruktur
                      </label>
                      <input
                        type="url"
                        value={courseForm.instructorAvatar || ""}
                        onChange={(e) => setCourseForm({ ...courseForm, instructorAvatar: e.target.value })}
                        placeholder="https://images.unsplash.com/... atau URL foto"
                        readOnly={isInstructorUser}
                        disabled={isInstructorUser}
                        style={{
                          height: 44, padding: "0 16px", fontSize: "0.9rem", borderRadius: 8,
                          cursor: isInstructorUser ? "not-allowed" : "text",
                          background: isInstructorUser ? "rgba(255,255,255,0.03)" : undefined
                        }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: 8, display: "block" }}>
                        Organisasi / Asal Instansi Pengajar
                      </label>
                      <input
                        type="text"
                        value={courseForm.instructorOrg || ""}
                        onChange={(e) => setCourseForm({ ...courseForm, instructorOrg: e.target.value })}
                        placeholder="Contoh: DIDIKARA Certified / LKPP RI"
                        readOnly={isInstructorUser}
                        disabled={isInstructorUser}
                        style={{
                          height: 44, padding: "0 16px", fontSize: "0.9rem", borderRadius: 8,
                          cursor: isInstructorUser ? "not-allowed" : "text",
                          background: isInstructorUser ? "rgba(255,255,255,0.03)" : undefined
                        }}
                      />
                    </div>
                  </div>

                  {/* Foto Instruktur Presets (hanya tampil untuk admin) */}
                  {!isInstructorUser && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>Pilihan Foto Cepat:</span>
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
                            style={{ padding: "4px 10px", fontSize: "0.75rem", height: "auto", width: "auto", borderRadius: 6 }}
                            onClick={() => setCourseForm({ ...courseForm, instructorAvatar: preset.url })}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: 8, display: "block" }}>
                        Durasi Pelatihan *
                      </label>
                      <input
                        type="text"
                        value={courseForm.duration}
                        onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                        placeholder="Contoh: 30 Jam (6 Modul)"
                        required
                        style={{ height: 44, padding: "0 16px", fontSize: "0.9rem", borderRadius: 8 }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: 8, display: "block" }}>
                        Badge Akreditasi / Label
                      </label>
                      <input
                        type="text"
                        value={courseForm.badge}
                        onChange={(e) => setCourseForm({ ...courseForm, badge: e.target.value })}
                        placeholder="Contoh: BNSP / LKPP Ready"
                        style={{ height: 44, padding: "0 16px", fontSize: "0.9rem", borderRadius: 8 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Harga & Deskripsi */}
              {courseStep === 3 && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: 8, display: "block" }}>
                        Harga Pelatihan (Rupiah) *
                      </label>
                      <input
                        type="number"
                        value={courseForm.price}
                        onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })}
                        placeholder="0 = Akses Member Gratis, atau masukkan nominal (misal: 1500000)"
                        required
                        style={{ height: 46, padding: "0 16px", fontSize: "0.95rem", borderRadius: 8, fontWeight: 600 }}
                      />
                      <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 6, display: "block" }}>
                        💡 Masukkan angka <strong>0</strong> jika kursus termasuk dalam paket Akses Member (Gratis).
                      </span>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: 8, display: "block" }}>
                        Pratinjau Label Biaya
                      </label>
                      <div style={{
                        height: 46, padding: "0 16px", borderRadius: 8,
                        background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)",
                        display: "flex", alignItems: "center", fontWeight: 700, fontSize: "0.95rem",
                        color: Number(courseForm.price) === 0 ? "#34d399" : "var(--primary)"
                      }}>
                        {Number(courseForm.price) === 0 ? "Gratis / Termasuk Akses Member" : `Rp ${Number(courseForm.price || 0).toLocaleString("id-ID")}`}
                      </div>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: 8, display: "block" }}>
                      Deskripsi Lengkap &amp; Ringkasan Silabus *
                    </label>
                    <textarea
                      value={courseForm.desc}
                      onChange={(e) => setCourseForm({ ...courseForm, desc: e.target.value })}
                      required
                      placeholder="Jelaskan gambaran umum pelatihan, tujuan pembelajaran, kompetensi nasional yang akan dicapai, dan sasaran peserta kursus secara mendalam..."
                      style={{
                        width: "100%",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: 10,
                        padding: "16px 18px",
                        color: "var(--text-primary)",
                        fontFamily: "inherit",
                        fontSize: "0.92rem",
                        lineHeight: 1.6,
                        minHeight: 160,
                        resize: "vertical"
                      }}
                    />
                  </div>

                  <div style={{
                    padding: "14px 18px",
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.3)",
                    borderRadius: 10,
                    fontSize: "0.82rem",
                    color: "#34d399",
                    marginTop: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 10
                  }}>
                    <Check size={18} />
                    <span>Seluruh data formulir telah lengkap. Klik <strong>Simpan Perubahan</strong> di bawah untuk mempublikasikan kursus.</span>
                  </div>
                </div>
              )}

              {/* Step Navigation Buttons */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border-color)" }}>
                <div>
                  {courseStep > 1 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setCourseStep(s => s - 1)}
                      style={{ width: "auto", padding: "8px 18px", fontSize: "0.85rem", borderRadius: 8 }}>
                      ← Langkah Sebelumnya
                    </button>
                  )}
                </div>
                <div>
                  {courseStep < 3 ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setCourseStep(s => s + 1)}
                      style={{ width: "auto", padding: "8px 22px", fontSize: "0.85rem", borderRadius: 8, fontWeight: 700 }}>
                      Lanjut ke Langkah {courseStep + 1} →
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {crudType === "user" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group">
                  <label>Nama Lengkap</label>
                  <input type="text" value={userForm.fullname} onChange={(e) => setUserForm({ ...userForm, fullname: e.target.value })} required style={{ paddingLeft: 16 }} />
                </div>
                <div className="form-group">
                  <label>Alamat Email</label>
                  <input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required disabled={crudAction === "edit"} style={{ paddingLeft: 16 }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16 }}>
                <div className="form-group">
                  <label>
                    Kata Sandi Akun
                    {crudAction === "edit" && (
                      <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> — kosongkan bila tidak diubah</span>
                    )}
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showUserPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder={crudAction === "edit" ? "(tidak diubah)" : ""}
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      required={crudAction === "add"}
                      style={{ paddingLeft: 16, paddingRight: 40, fontFamily: "monospace" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserPassword((prev) => !prev)}
                      aria-label={showUserPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
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
                      {showUserPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Status Akun</label>
                  <select value={userForm.status} onChange={(e) => setUserForm({ ...userForm, status: e.target.value })} style={{ paddingLeft: 16 }}>
                    <option value="active">Active (Aktif)</option>
                    <option value="suspended">Suspended (Ditangguhkan)</option>
                    <option value="pending">Pending Verification</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group">
                  <label>Peran Pengguna (Role)</label>
                  <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} style={{ paddingLeft: 16 }}>
                    <option value="student">Peserta</option>
                    <option value="instructor">Instruktur / Pengajar Ahli</option>
                    <option value="corporate">Perwakilan Korporat (HR)</option>
                    <option value="government">Aparatur Pemerintah (ASN)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Level Kompetensi Awal</label>
                  <select value={userForm.competency} onChange={(e) => setUserForm({ ...userForm, competency: e.target.value })} style={{ paddingLeft: 16 }}>
                    <option value="A1 (Beginner)">A1 (Beginner)</option>
                    <option value="B1 (Intermediate)">B1 (Intermediate)</option>
                    <option value="C1 (Advanced)">C1 (Advanced)</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group">
                  <label>Nama Organisasi / Instansi</label>
                  <input type="text" value={userForm.organization} onChange={(e) => setUserForm({ ...userForm, organization: e.target.value })} placeholder="Contoh: Kementerian Keuangan / Mandiri" style={{ paddingLeft: 16 }} />
                </div>
                <div className="form-group">
                  <label>Jabatan Kerja</label>
                  <input type="text" value={userForm.jobTitle} onChange={(e) => setUserForm({ ...userForm, jobTitle: e.target.value })} placeholder="Contoh: Staff Procurement" style={{ paddingLeft: 16 }} />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600, display: "block", marginBottom: 10 }}>Otoritas & Hak Akses (Permissions)</label>
                <div className="glass-card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: 16, marginBottom: 16 }}>
                  {[
                    { key: "view_dashboard", label: "Melihat Dashboard & Radar" },
                    { key: "access_lms", label: "Mengakses Modul LMS & Kelas" },
                    { key: "access_ai_portal", label: "Mengakses Portal Perencanaan AI" },
                    { key: "manage_master_data", label: "Mengakses Modul Admin & Master Data" }
                  ].map(p => (
                    <button type="button" key={p.key}
                      aria-pressed={userForm.permissions.includes(p.key)}
                      onClick={() => handlePermissionToggle(p.key)}
                      style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                               background: "none", border: "none", padding: 0, font: "inherit", color: "inherit", textAlign: "left" }}>
                      {userForm.permissions.includes(p.key) ? <CheckSquare size={16} style={{ color: "var(--primary)" }} /> : <Square size={16} />}
                      <span style={{ fontSize: "0.8rem" }}>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 20 }}>
                <label style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600, display: "block", marginBottom: 10 }}>Inisialisasi Skor Kompetensi Radar (0 - 100)</label>
                <div className="glass-card" style={{ padding: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: 10, color: "var(--text-secondary)" }}>Kompetensi Saat Ini</div>
                      {competencySkills.map((skill, idx) => {
                        const currentVal = userForm.competencyScores?.current?.[idx] ?? 50;
                        return (
                          <div key={`curr-${skill.key || idx}`} className="form-group" style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", marginBottom: 4 }}>
                              <span>{skill.name}</span>
                              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{currentVal}%</span>
                            </div>
                            <input type="range" min="0" max="100" value={currentVal}
                              onChange={(e) => {
                                const newCurrent = [...(userForm.competencyScores?.current || Array(competencySkills.length).fill(50))];
                                while (newCurrent.length < competencySkills.length) newCurrent.push(50);
                                newCurrent[idx] = parseInt(e.target.value) || 0;
                                setUserForm({ ...userForm, competencyScores: { ...userForm.competencyScores, current: newCurrent } });
                              }}
                              style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, cursor: "pointer" }} />
                          </div>
                        );
                      })}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: 10, color: "var(--text-secondary)" }}>Target Kompetensi Jabatan</div>
                      {competencySkills.map((skill, idx) => {
                        const targetVal = userForm.competencyScores?.target?.[idx] ?? 80;
                        return (
                          <div key={`targ-${skill.key || idx}`} className="form-group" style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", marginBottom: 4 }}>
                              <span>{skill.name}</span>
                              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{targetVal}%</span>
                            </div>
                            <input type="range" min="0" max="100" value={targetVal}
                              onChange={(e) => {
                                const newTarget = [...(userForm.competencyScores?.target || Array(competencySkills.length).fill(80))];
                                while (newTarget.length < competencySkills.length) newTarget.push(80);
                                newTarget[idx] = parseInt(e.target.value) || 0;
                                setUserForm({ ...userForm, competencyScores: { ...userForm.competencyScores, target: newTarget } });
                              }}
                              style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, cursor: "pointer" }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}


          <div style={{ display: "flex", gap: 14, marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--border-color)", justifyContent: "flex-end", alignItems: "center" }}>
            {crudType === "course" && crudAction === "edit" && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  marginRight: "auto",
                  width: "auto",
                  padding: "11px 20px",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  borderRadius: 10,
                  color: "#ef4444",
                  borderColor: "rgba(239, 68, 68, 0.35)",
                  background: "rgba(239, 68, 68, 0.06)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
                onClick={() => {
                  const targetId = editingId || courseForm.id;
                  handleDeleteCrud("course", targetId, courseForm.title);
                  setCrudModalActive(false);
                }}
              >
                <Trash2 size={16} />
                <span>Hapus Kursus Ini</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: "auto", padding: "12px 24px", fontSize: "0.92rem", fontWeight: 600, borderRadius: 10 }}
              onClick={() => setCrudModalActive(false)}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: "auto",
                padding: "12px 34px",
                fontSize: "0.95rem",
                fontWeight: 700,
                borderRadius: 10,
                boxShadow: "0 4px 18px rgba(37,99,235,0.38)",
                display: "inline-flex",
                alignItems: "center",
                gap: 10
              }}
            >
              <Check size={18} />
              <span>{crudType === "course" ? (crudAction === "add" ? "Publikasikan Kursus Baru" : "Simpan Perubahan Kursus") : "Simpan Perubahan"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
