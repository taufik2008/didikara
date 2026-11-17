"use client";
import { useState, useEffect, useMemo } from "react";
import {
  GraduationCap, PlusCircle, BookOpen, FileText, Users,
  Settings, Search, PlayCircle, Edit3, Clock, Sparkles,
  Layers, Award, CheckCircle2, AlertCircle, Eye, Trash2
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function InstructorStudioPage() {
  const {
    courses = [],
    currentUser,
    handleOpenLmsManageModal,
    handleOpenCrudModal,
    handleDeleteCrud,
    setActiveCourse,
    setActivePage,
  } = useApp();

  const [assignedCourseIds, setAssignedCourseIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  // Muat daftar penugasan instruktur dari database
  useEffect(() => {
    if (!currentUser?.email) return;
    let active = true;
    setLoadingAssignments(true);

    fetch("/api/course-instructors")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.success && Array.isArray(data.assignments)) {
          setAssignedCourseIds(data.assignments.map((a) => a.course_id));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingAssignments(false);
      });

    return () => {
      active = false;
    };
  }, [currentUser?.email]);

  // Filter kursus yang diampu oleh instruktur yang sedang login
  const myCourses = useMemo(() => {
    if (!currentUser) return [];
    const isAdmin = currentUser.role === "admin";
    if (isAdmin) return courses; // Admin dapat melihat dan mengelola semua kelas

    const userEmail = (currentUser.email || "").toLowerCase();
    const userName = (currentUser.fullname || "").toLowerCase();

    return courses.filter((c) => {
      if (assignedCourseIds.includes(c.id)) return true;
      const inst = c.instructor;
      if (inst) {
        if (typeof inst === "object") {
          if (inst.email && inst.email.toLowerCase() === userEmail) return true;
          if (inst.name && inst.name.toLowerCase() === userName) return true;
        } else if (typeof inst === "string") {
          if (inst.toLowerCase() === userName || inst.toLowerCase() === userEmail) return true;
        }
      }
      return false;
    });
  }, [courses, currentUser, assignedCourseIds]);

  // Filter pencarian dan kategori
  const filteredCourses = useMemo(() => {
    return myCourses.filter((c) => {
      const matchSearch =
        c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.desc?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory =
        selectedCategory === "all" ||
        (c.category && c.category.toLowerCase() === selectedCategory.toLowerCase());
      return matchSearch && matchCategory;
    });
  }, [myCourses, searchTerm, selectedCategory]);

  // Statistik pengajar
  const stats = useMemo(() => {
    let totalModules = 0;
    let totalLessons = 0;
    myCourses.forEach((c) => {
      const mods = c.modules || [];
      totalModules += mods.length;
      mods.forEach((m) => {
        totalLessons += (m.lessons || []).length;
      });
    });
    return {
      totalCourses: myCourses.length,
      totalModules,
      totalLessons,
    };
  }, [myCourses]);

  // Kategori unik untuk tab filter
  const categories = useMemo(() => {
    const set = new Set();
    myCourses.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return Array.from(set);
  }, [myCourses]);

  const handleOpenCourseInLms = (course) => {
    setActiveCourse(course);
    setActivePage("lms-page");
  };

  return (
    <main className="page-view active" style={{ padding: "24px 28px", maxWidth: 1400, margin: "0 auto" }}>
      {/* ── Header Studio Instruktur ─────────────────────────────────────────── */}
      <div
        className="glass-panel"
        style={{
          padding: "24px 28px",
          borderRadius: 16,
          marginBottom: 24,
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
              }}
            >
              <GraduationCap size={22} />
            </div>
            <h2 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 800, color: "#ffffff" }}>
              Manajemen Kursus
            </h2>
            <span
              style={{
                fontSize: "0.72rem",
                padding: "3px 10px",
                borderRadius: 20,
                fontWeight: 700,
                background: "rgba(59, 130, 246, 0.15)",
                color: "#60a5fa",
                border: "1px solid rgba(59, 130, 246, 0.3)",
              }}
            >
              Studio Instruktur
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-secondary)", maxWidth: 680, lineHeight: 1.5 }}>
            Pusat manajemen materi pelatihan Anda. Tambahkan modul pembelajaran, video interaktif, dokumen presentasi/PDF, bank soal ujian, dan pantau tugas peserta.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenCrudModal("course", "add")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              fontWeight: 700,
              fontSize: "0.88rem",
              background: "#edb63f",
              color: "#0f172a",
              border: "none",
              borderRadius: 10,
              boxShadow: "0 4px 14px rgba(237, 182, 63, 0.3)",
              cursor: "pointer",
            }}
          >
            <PlusCircle size={18} />
            <span>Buat Kursus Baru</span>
          </button>
        </div>
      </div>

      {/* ── Bar Metrik / Statistik Ringkas ──────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          className="glass-card"
          style={{
            padding: "16px 20px",
            borderRadius: 12,
            border: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "rgba(37, 99, 235, 0.15)",
              color: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BookOpen size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              Kelas yang Diampu
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {stats.totalCourses}
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: "16px 20px",
            borderRadius: 12,
            border: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "rgba(16, 185, 129, 0.15)",
              color: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              Total Modul Silabus
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {stats.totalModules}
            </div>
          </div>
        </div>

        <div
          className="glass-card"
          style={{
            padding: "16px 20px",
            borderRadius: 12,
            border: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "rgba(245, 158, 11, 0.15)",
              color: "#f59e0b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PlayCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              Total Pelajaran &amp; Video
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {stats.totalLessons}
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar Pencarian & Filter Kategori ───────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div style={{ position: "relative", minWidth: 260, flex: "1 1 280px", maxWidth: 420 }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            type="text"
            placeholder="Cari kelas yang Anda ampu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 36px",
              borderRadius: 8,
              fontSize: "0.85rem",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {categories.length > 0 && (
          <div className="filter-pills" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`filter-pill ${selectedCategory === "all" ? "active" : ""}`}
              onClick={() => setSelectedCategory("all")}
            >
              Semua ({myCourses.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`filter-pill ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Grid Kartu Kursus Mengajar ───────────────────────────────────────── */}
      {filteredCourses.length === 0 ? (
        <div
          className="glass-card"
          style={{
            padding: 48,
            textAlign: "center",
            borderRadius: 16,
            border: "1px dashed var(--border-color)",
            marginTop: 16,
          }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: "50%",
              background: "rgba(59, 130, 246, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
              color: "#3b82f6",
            }}
          >
            <GraduationCap size={32} />
          </div>
          <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem", fontWeight: 700 }}>
            {searchTerm || selectedCategory !== "all"
              ? "Tidak Ada Kelas yang Sesuai Filter"
              : "Belum Ada Program Kursus"}
          </h3>
          <p
            style={{
              color: "var(--text-secondary)",
              maxWidth: 480,
              margin: "0 auto 24px",
              fontSize: "0.88rem",
              lineHeight: 1.6,
            }}
          >
            {searchTerm || selectedCategory !== "all"
              ? "Coba ganti kata kunci pencarian atau ubah filter kategori di atas."
              : "Anda belum ditugaskan mengampu kelas atau belum membuat kelas baru. Klik tombol di bawah untuk membuat program pelatihan perdana Anda."}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenCrudModal("course", "add")}
            style={{
              padding: "10px 22px",
              fontWeight: 700,
              fontSize: "0.88rem",
              background: "#edb63f",
              color: "#0f172a",
              border: "none",
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <PlusCircle size={16} />
            <span>+ Buat Kursus Baru Sekarang</span>
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 20,
          }}
        >
          {filteredCourses.map((c) => {
            const modulesCount = (c.modules || []).length;
            const lessonsCount = (c.modules || []).reduce(
              (n, m) => n + (m.lessons || []).length,
              0
            );
            const questionsCount = (c.quiz || []).length;

            return (
              <div
                key={c.id}
                className="glass-card"
                style={{
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  background: "var(--bg-card)",
                }}
              >
                {/* Gambar / Cover Kursus */}
                <div style={{ position: "relative", height: 160, background: "#090d16", overflow: "hidden" }}>
                  {c.image ? (
                    <img
                      src={c.image}
                      alt={c.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                        color: "var(--text-muted)",
                      }}
                    >
                      <BookOpen size={40} />
                    </div>
                  )}

                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      display: "flex",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        background: "rgba(15, 23, 42, 0.85)",
                        backdropFilter: "blur(6px)",
                        color: "#60a5fa",
                        border: "1px solid rgba(96, 165, 250, 0.3)",
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: "0.72rem",
                        fontWeight: 700,
                      }}
                    >
                      {c.category || "Pelatihan"}
                    </span>
                    {c.level && (
                      <span
                        style={{
                          background: "rgba(15, 23, 42, 0.85)",
                          backdropFilter: "blur(6px)",
                          color: "#cbd5e1",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontSize: "0.72rem",
                          fontWeight: 600,
                        }}
                      >
                        {c.level}
                      </span>
                    )}
                  </div>

                  {c.badge && (
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                        color: "#ffffff",
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                      }}
                    >
                      {c.badge}
                    </div>
                  )}
                </div>

                {/* Konten & Informasi Kursus */}
                <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <h3
                    style={{
                      margin: "0 0 8px",
                      fontSize: "1.05rem",
                      fontWeight: 700,
                      lineHeight: 1.35,
                      color: "var(--text-primary)",
                    }}
                  >
                    {c.title}
                  </h3>

                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.8rem",
                      lineHeight: 1.5,
                      margin: "0 0 14px",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {c.desc || c.description || "Tidak ada deskripsi kursus."}
                  </p>

                  {/* Chips Ringkasan Materi */}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginBottom: 16,
                      fontSize: "0.75rem",
                    }}
                  >
                    <span
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        padding: "4px 8px",
                        borderRadius: 6,
                        color: "var(--text-secondary)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Layers size={13} style={{ color: "#3b82f6" }} />
                      <strong>{modulesCount}</strong> Modul
                    </span>

                    <span
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        padding: "4px 8px",
                        borderRadius: 6,
                        color: "var(--text-secondary)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <PlayCircle size={13} style={{ color: "#10b981" }} />
                      <strong>{lessonsCount}</strong> Materi
                    </span>

                    <span
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        padding: "4px 8px",
                        borderRadius: 6,
                        color: "var(--text-secondary)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <FileText size={13} style={{ color: "#f59e0b" }} />
                      <strong>{questionsCount}</strong> Soal Ujian
                    </span>

                    {c.duration && (
                      <span
                        style={{
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-color)",
                          padding: "4px 8px",
                          borderRadius: 6,
                          color: "var(--text-secondary)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Clock size={13} />
                        {c.duration}
                      </span>
                    )}
                  </div>

                  {/* Tombol Aksi Utama Pengajar */}
                  <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleOpenLmsManageModal(c, "materials")}
                      style={{
                        width: "100%",
                        padding: "9px 14px",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                        boxShadow: "0 2px 8px rgba(37, 99, 235, 0.35)",
                      }}
                    >
                      <Edit3 size={16} />
                      <span>Kelola Materi &amp; Silabus</span>
                    </button>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleOpenLmsManageModal(c, "bank")}
                        style={{
                          padding: "7px 10px",
                          fontSize: "0.78rem",
                          borderRadius: 6,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                        title="Kelola Bank Soal & Konfigurasi Ujian"
                      >
                        <FileText size={14} />
                        <span>Bank Soal</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleOpenLmsManageModal(c, "students")}
                        style={{
                          padding: "7px 10px",
                          fontSize: "0.78rem",
                          borderRadius: 6,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                        title="Lihat Daftar Peserta dan Penilaian Siswa"
                      >
                        <Users size={14} />
                        <span>Peserta &amp; Nilai</span>
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6, marginTop: 2 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleOpenCourseInLms(c)}
                        style={{
                          padding: "7px 10px",
                          fontSize: "0.76rem",
                          borderRadius: 6,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          borderColor: "rgba(59, 130, 246, 0.3)",
                          color: "#60a5fa",
                        }}
                        title="Buka tampilan kelas sebagai simulasi peserta"
                      >
                        <Eye size={14} />
                        <span>Tinjau</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleOpenCrudModal("course", "edit", c)}
                        style={{
                          padding: "7px 10px",
                          fontSize: "0.76rem",
                          borderRadius: 6,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                        title="Ubah judul, kategori, harga, jadwal, dan pengajar"
                      >
                        <Settings size={14} />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleDeleteCrud("course", c.id, c.title)}
                        style={{
                          padding: "7px 10px",
                          fontSize: "0.76rem",
                          borderRadius: 6,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          borderColor: "rgba(239, 68, 68, 0.3)",
                          color: "#ef4444",
                          background: "rgba(239, 68, 68, 0.05)",
                        }}
                        title="Hapus kursus ini"
                      >
                        <Trash2 size={14} />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
