"use client";
import { useState, useRef, useMemo, useEffect } from "react";
import { Check, CheckSquare, Square, Upload, Image as ImageIcon, Link as LinkIcon, X, Award, UserCheck } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function CrudModal() {
  const {
    crudModalActive, crudType, crudAction, categories, levels, competencySkills = [], courseForm, userForm,
    courses, users,
    setCourseForm, setUserForm, setCrudModalActive,
    handleSaveCrud, handlePermissionToggle
  } = useApp();

  const [imageUploadMode, setImageUploadMode] = useState("file"); // "file" | "url"
  const [isDragging, setIsDragging] = useState(false);
  const [courseStep, setCourseStep] = useState(1); // 1: Info Dasar & Media, 2: Instruktur & Detail, 3: Biaya & Deskripsi
  const [apiInstructors, setApiInstructors] = useState([]);
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
    <div className={`modal-overlay ${crudModalActive ? 'active' : ''}`}>
      <div className="modal-content glass-panel" style={{ width: crudType === "user" ? 700 : 600, maxWidth: "95%", maxHeight: "90vh", overflowY: "auto" }}>
        <h3 style={{ marginBottom: 16 }}>
          {crudAction === "add" ? "Tambah" : "Edit"} {crudType === "course" ? "Program Pelatihan" : crudType === "user" ? "Pengguna (User Management)" : "Instruktur"}
        </h3>
        <form onSubmit={handleSaveCrud}>
          {crudType === "course" && (
            <div>
              {/* Wizard Step Indicator */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, borderBottom: "1px solid var(--border-color)", paddingBottom: 14 }}>
                {[
                  { step: 1, label: "1. Info & Media" },
                  { step: 2, label: "2. Instruktur & Durasi" },
                  { step: 3, label: "3. Harga & Publikasi" }
                ].map((s) => (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => setCourseStep(s.step)}
                    style={{
                      flex: 1, padding: "8px 12px", borderRadius: 8,
                      border: courseStep === s.step ? "1.5px solid var(--primary)" : "1px solid var(--border-color)",
                      cursor: "pointer",
                      fontSize: "0.78rem", fontWeight: courseStep === s.step ? 700 : 500,
                      background: courseStep === s.step ? "var(--primary)" : "var(--bg-tertiary)",
                      color: courseStep === s.step ? "#ffffff" : "var(--text-secondary)",
                      transition: "all 0.2s ease"
                    }}>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Step 1: Info Dasar & Media */}
              {courseStep === 1 && (
                <div>
                  <div className="form-group">
                    <label>Judul Pelatihan *</label>
                    <input type="text" value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} required placeholder="Contoh: Sertifikasi Pengadaan Barang/Jasa Pemerintah" style={{ paddingLeft: 16 }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 14 }}>
                    <div className="form-group">
                      <label>Model Belajar *</label>
                      <select value={courseForm.learningType || "self_learning"} onChange={(e) => setCourseForm({ ...courseForm, learningType: e.target.value })} style={{ paddingLeft: 12, fontWeight: 600 }}>
                        <option value="self_learning">🟢 Self-Learning (Mandiri)</option>
                        <option value="online">🔵 Online (Live Webinar)</option>
                        <option value="offline">🟣 Offline (Tatap Muka)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Kategori *</label>
                      <select value={courseForm.category} onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })} style={{ paddingLeft: 12 }}>
                        {categories.map(cat => <option key={cat.key} value={cat.key}>{cat.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Tingkat (Level) *</label>
                      <select value={courseForm.level} onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })} style={{ paddingLeft: 12 }}>
                        {levels.map(lvl => <option key={lvl.key} value={lvl.key}>{lvl.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {(courseForm.learningType === "offline" || courseForm.learningType === "online") && (
                    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.4fr 1.2fr", gap: 12, marginBottom: 16, padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px dashed var(--border-color)" }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: "0.75rem", marginBottom: 4 }}>{courseForm.learningType === "offline" ? "Lokasi / Hotel Tatap Muka" : "Platform / Venue Online"}</label>
                        <input
                          type="text"
                          value={courseForm.venue || ""}
                          onChange={(e) => setCourseForm({ ...courseForm, venue: e.target.value })}
                          placeholder={courseForm.learningType === "offline" ? "Contoh: Hotel Sheraton Surabaya" : "Contoh: Live Zoom Interactive"}
                          style={{ paddingLeft: 10, fontSize: "0.8rem", height: 36 }}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: "0.75rem", marginBottom: 4 }}>Jadwal / Waktu Pelaksanaan</label>
                        <input
                          type="text"
                          value={courseForm.schedule || ""}
                          onChange={(e) => setCourseForm({ ...courseForm, schedule: e.target.value })}
                          placeholder={courseForm.learningType === "offline" ? "Contoh: 24 - 26 Nov 2026 (09:00 - 17:00 WIB)" : "Contoh: Setiap Sabtu (09:00 - 15:00 WIB)"}
                          style={{ paddingLeft: 10, fontSize: "0.8rem", height: 36 }}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: "0.75rem", marginBottom: 4 }}>Kuota Peserta</label>
                        <input
                          type="text"
                          value={courseForm.quota || ""}
                          onChange={(e) => setCourseForm({ ...courseForm, quota: e.target.value })}
                          placeholder="Contoh: Sisa 6 Kursi"
                          style={{ paddingLeft: 10, fontSize: "0.8rem", height: 36 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Upload Image Section */}
                  <div className="form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <label style={{ margin: 0 }}>Gambar / Banner Thumbnail Katalog</label>
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
                            borderRadius: 8,
                            padding: "20px 16px",
                            textAlign: "center",
                            background: isDragging ? "rgba(249, 115, 22, 0.08)" : "rgba(255, 255, 255, 0.02)",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <Upload size={24} style={{ color: "var(--primary)", margin: "0 auto 8px auto", display: "block" }} />
                          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>
                            Klik untuk memilih file dari laptop Anda
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
                            atau seret &amp; lepas (drag and drop) gambar ke sini (JPG, PNG, WebP)
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="url"
                          value={courseForm.image || ""}
                          onChange={(e) => setCourseForm({ ...courseForm, image: e.target.value })}
                          placeholder="https://images.unsplash.com/... atau URL gambar"
                          style={{ paddingLeft: 16 }}
                        />
                      </div>
                    )}

                    {/* Preview Banner Box */}
                    {courseForm.image && (
                      <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <img
                            src={courseForm.image}
                            alt="Preview Thumbnail"
                            style={{ width: 68, height: 44, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border-color)" }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <div>
                            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-primary)" }}>Preview Thumbnail Pelatihan</div>
                            <div style={{ fontSize: "0.7rem", color: "#34d399" }}>✓ Gambar siap digunakan di katalog</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: "4px 8px", fontSize: "0.72rem", height: "auto", width: "auto", color: "var(--danger)", borderColor: "rgba(239, 68, 68, 0.3)" }}
                          onClick={() => setCourseForm({ ...courseForm, image: "" })}
                          title="Hapus gambar"
                        >
                          <X size={14} style={{ marginRight: 4 }} /> Hapus
                        </button>
                      </div>
                    )}

                    {/* Quick Presets */}
                    <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Template Cepat:</span>
                      {[
                        { label: "Pengadaan", url: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80" },
                        { label: "AI & Tech", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80" },
                        { label: "Data Analytics", url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80" },
                        { label: "Leadership", url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&auto=format&fit=crop&q=80" },
                        { label: "Keuangan", url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80" },
                        { label: "Manajemen", url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80" }
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: "3px 8px", fontSize: "0.7rem", height: "auto", width: "auto" }}
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
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontWeight: 600 }}>Pilih Instruktur / Pengajar *</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        {availableInstructors.length} Instruktur terdaftar
                      </span>
                    </label>
                    <select
                      value={selectedInstructorKey}
                      onChange={handleInstructorSelect}
                      required
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 8,
                        border: "1px solid var(--border-color)",
                        background: "var(--bg-card)",
                        color: "var(--text-primary)",
                        fontSize: "0.85rem", fontWeight: 500
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

                  {/* Selected Instructor Preview Card */}
                  {courseForm.instructorName && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "12px 16px", borderRadius: 8,
                      background: "rgba(99, 102, 241, 0.08)",
                      border: "1px solid rgba(99, 102, 241, 0.25)",
                      marginBottom: 16
                    }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: "50%",
                        background: "var(--primary)", color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: "1rem", overflow: "hidden", flexShrink: 0
                      }}>
                        {courseForm.instructorAvatar && courseForm.instructorAvatar.startsWith("http") ? (
                          <img src={courseForm.instructorAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          courseForm.instructorName.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                          {courseForm.instructorName}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          {courseForm.instructorTitle || "Pengajar Ahli"} {courseForm.instructorOrg ? `• ${courseForm.instructorOrg}` : ""}
                        </div>
                        {courseForm.instructorEmail && (
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                            ✉️ {courseForm.instructorEmail}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: "0.7rem", padding: "3px 8px", borderRadius: 12, background: "rgba(16,185,129,0.15)", color: "#34d399", fontWeight: 600 }}>
                        ✓ Terpilih
                      </span>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div className="form-group">
                      <label>Nama Instruktur / Pengajar *</label>
                      <input
                        type="text"
                        value={courseForm.instructorName || ""}
                        onChange={(e) => setCourseForm({ ...courseForm, instructorName: e.target.value })}
                        placeholder="Pilih instruktur di atas atau ketik manual..."
                        required
                        style={{ paddingLeft: 16 }}
                      />
                    </div>
                    <div className="form-group">
                      <label>Gelar / Spesialisasi Instruktur</label>
                      <input
                        type="text"
                        value={courseForm.instructorTitle || ""}
                        onChange={(e) => setCourseForm({ ...courseForm, instructorTitle: e.target.value })}
                        placeholder="Contoh: Ahli Pengadaan Utama LKPP"
                        style={{ paddingLeft: 16 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div className="form-group">
                      <label>Tautan URL Foto / Avatar Instruktur</label>
                      <input
                        type="url"
                        value={courseForm.instructorAvatar || ""}
                        onChange={(e) => setCourseForm({ ...courseForm, instructorAvatar: e.target.value })}
                        placeholder="https://images.unsplash.com/... atau URL foto"
                        style={{ paddingLeft: 16 }}
                      />
                    </div>
                    <div className="form-group">
                      <label>Organisasi / Asal Instansi Pengajar</label>
                      <input
                        type="text"
                        value={courseForm.instructorOrg || ""}
                        onChange={(e) => setCourseForm({ ...courseForm, instructorOrg: e.target.value })}
                        placeholder="Contoh: DIDIKARA Certified / LKPP"
                        style={{ paddingLeft: 16 }}
                      />
                    </div>
                  </div>

                  {/* Foto Instruktur Presets */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Pilihan Foto Cepat:</span>
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
                          style={{ padding: "3px 8px", fontSize: "0.7rem", height: "auto", width: "auto" }}
                          onClick={() => setCourseForm({ ...courseForm, instructorAvatar: preset.url })}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div className="form-group">
                      <label>Durasi Pelatihan *</label>
                      <input type="text" value={courseForm.duration} onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })} placeholder="Contoh: 30 Jam" required style={{ paddingLeft: 16 }} />
                    </div>
                    <div className="form-group">
                      <label>Badge Akreditasi / Label</label>
                      <input type="text" value={courseForm.badge} onChange={(e) => setCourseForm({ ...courseForm, badge: e.target.value })} placeholder="Contoh: BNSP / LKPP Ready" style={{ paddingLeft: 16 }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Harga & Deskripsi */}
              {courseStep === 3 && (
                <div>
                  <div className="form-group">
                    <label>Harga Pelatihan (Rupiah) *</label>
                    <input type="number" value={courseForm.price} onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })} placeholder="Contoh: 2500000" required style={{ paddingLeft: 16 }} />
                  </div>
                  <div className="form-group">
                    <label>Deskripsi Singkat Pelatihan *</label>
                    <textarea value={courseForm.desc} onChange={(e) => setCourseForm({ ...courseForm, desc: e.target.value })} required placeholder="Jelaskan gambaran umum materi, target peserta, dan output kompetensi yang akan diraih..." style={{ width: "100%", background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-color)", borderRadius: 8, padding: 12, color: "var(--text-primary)", fontFamily: "var(--font-body)", minHeight: 90 }} />
                  </div>

                  <div style={{ padding: "10px 14px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 8, fontSize: "0.75rem", color: "#34d399", marginTop: 12 }}>
                    ✓ Formulir siap disimpan. Klik <strong>Simpan Perubahan</strong> di bawah untuk mempublikasikan.
                  </div>
                </div>
              )}

              {/* Step Navigation Buttons */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border-color)" }}>
                <div>
                  {courseStep > 1 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setCourseStep(s => s - 1)}
                      style={{ width: "auto", padding: "6px 14px", fontSize: "0.78rem" }}>
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
                      style={{ width: "auto", padding: "6px 16px", fontSize: "0.78rem" }}>
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
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder={crudAction === "edit" ? "(tidak diubah)" : ""}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    required={crudAction === "add"}
                    style={{ paddingLeft: 16, fontFamily: "monospace" }}
                  />
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
                    <option value="student">Peserta Mandiri</option>
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="glass-card" style={{ padding: 16, marginBottom: 16 }}>
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


          <div style={{ display: "flex", gap: 14, marginTop: 28, paddingTop: 18, borderTop: "1px solid var(--border-color)", justifyContent: "flex-end", alignItems: "center" }}>
            <button type="button" className="btn btn-secondary" style={{ width: "auto", padding: "12px 24px", fontSize: "0.9rem", fontWeight: 600 }} onClick={() => setCrudModalActive(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" style={{ width: "auto", padding: "12px 32px", fontSize: "0.92rem", fontWeight: 700, borderRadius: 10, boxShadow: "0 4px 18px rgba(249,115,22,0.38)", display: "inline-flex", alignItems: "center", gap: 10 }}>
              <Check size={18} />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
