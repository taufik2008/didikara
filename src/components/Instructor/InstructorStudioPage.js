"use client";
import { useState, useEffect, useMemo } from "react";
import {
  GraduationCap, PlusCircle, BookOpen, FileText, Users,
  Settings, Search, PlayCircle, Edit3, Clock, Sparkles,
  Layers, Award, CheckCircle2, AlertCircle, Eye, Trash2,
  DollarSign, Wallet, ArrowDownRight, CheckCircle, RefreshCw, X
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function InstructorStudioPage() {
  const {
    courses = [],
    currentUser,
    handleOpenLmsManageModal,
    handleOpenCrudModal,
    handleDeleteCrud,
    handleOpenClass,
    setActiveCourse,
    setActivePage,
  } = useApp();

  const [assignedCourseIds, setAssignedCourseIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  // Tab Studio: "courses" | "revenue"
  const [activeStudioTab, setActiveStudioTab] = useState("courses");
  const [payouts, setPayouts] = useState([]);
  const [payoutRingkas, setPayoutRingkas] = useState(null);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState("");
  const [withdrawForm, setWithdrawForm] = useState({
    amount: "",
    bankName: "BCA",
    accountNumber: "",
    accountHolder: "",
    notes: "",
  });

  const loadPayouts = async () => {
    setLoadingPayouts(true);
    try {
      const res = await fetch("/api/instructor-payouts");
      const data = await res.json();
      if (data.success) {
        setPayouts(data.payouts || []);
        setPayoutRingkas(data.ringkas || null);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingPayouts(false);
    }
  };

  useEffect(() => {
    if (activeStudioTab === "revenue") {
      loadPayouts();
    }
  }, [activeStudioTab]);

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    setWithdrawSubmitting(true);
    setWithdrawMsg("");
    try {
      const res = await fetch("/api/instructor-payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_withdrawal",
          amount: Number(withdrawForm.amount),
          bankName: withdrawForm.bankName,
          accountNumber: withdrawForm.accountNumber,
          accountHolder: withdrawForm.accountHolder,
          notes: withdrawForm.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWithdrawMsg("✓ " + data.message);
        loadPayouts();
        setTimeout(() => {
          setShowWithdrawModal(false);
          setWithdrawMsg("");
          setWithdrawForm({ amount: "", bankName: "BCA", accountNumber: "", accountHolder: "", notes: "" });
        }, 2000);
      } else {
        setWithdrawMsg("✕ " + (data.error || "Gagal mengajukan penarikan"));
      }
    } catch (err) {
      setWithdrawMsg("✕ Gagal mengirim ke server: " + err.message);
    } finally {
      setWithdrawSubmitting(false);
    }
  };

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
    if (typeof handleOpenClass === "function") {
      handleOpenClass(course.id);
    } else {
      setActiveCourse(course);
      setActivePage("lms-page");
    }
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

      {/* ── Tab Switcher Studio: Kursus vs Bagi Hasil ──────────────────────── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, borderBottom: "1px solid var(--border-color)", paddingBottom: 12 }}>
        <button
          type="button"
          onClick={() => setActiveStudioTab("courses")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "9px 18px", borderRadius: 8, fontSize: "0.86rem", fontWeight: 700,
            cursor: "pointer", border: "1px solid",
            background: activeStudioTab === "courses" ? "var(--primary)" : "var(--glass-bg)",
            borderColor: activeStudioTab === "courses" ? "var(--primary)" : "var(--border-color)",
            color: activeStudioTab === "courses" ? "#ffffff" : "var(--text-secondary)",
          }}
        >
          <BookOpen size={16} /> Kursus &amp; Silabus ({stats.totalCourses})
        </button>

        <button
          type="button"
          onClick={() => setActiveStudioTab("revenue")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "9px 18px", borderRadius: 8, fontSize: "0.86rem", fontWeight: 700,
            cursor: "pointer", border: "1px solid",
            background: activeStudioTab === "revenue" ? "var(--primary)" : "var(--glass-bg)",
            borderColor: activeStudioTab === "revenue" ? "var(--primary)" : "var(--border-color)",
            color: activeStudioTab === "revenue" ? "#ffffff" : "var(--text-secondary)",
          }}
        >
          <DollarSign size={16} /> Bagi Hasil &amp; Payout
        </button>
      </div>

      {activeStudioTab === "courses" && (
        <>
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
    </>
  )}

  {/* ── Tab: Bagi Hasil & Payout ────────────────────────────────────── */}
  {activeStudioTab === "revenue" && (
    <div>
      {/* Metrik Keuangan Ringkas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="glass-card" style={{ padding: "18px 22px", borderRadius: 12, border: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", fontWeight: 600 }}>Total Omset Kursus (Bruto)</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)" }}>
              Rp {(payoutRingkas?.total_gross || 0).toLocaleString("id-ID")}
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: "18px 22px", borderRadius: 12, border: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: "rgba(16, 185, 129, 0.15)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", fontWeight: 600 }}>Hak Komisi Bagi Hasil</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#10b981" }}>
              Rp {(payoutRingkas?.total_payout || 0).toLocaleString("id-ID")}
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: "18px 22px", borderRadius: 12, border: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Award size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", fontWeight: 600 }}>Estimasi Potongan PPh 21 (DPP 50%)</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#f59e0b" }}>
              Rp {(payoutRingkas?.total_pajak_pph21 || 0).toLocaleString("id-ID")}
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: "18px 22px", borderRadius: 12, border: "1px solid rgba(16, 185, 129, 0.4)", background: "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.05) 100%)", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: "rgba(16, 185, 129, 0.2)", color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wallet size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.76rem", color: "#34d399", fontWeight: 700 }}>Saldo Tersedia Dicairkan</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)" }}>
              Rp {(payoutRingkas?.belum_dibayar || 0).toLocaleString("id-ID")}
            </div>
          </div>
        </div>
      </div>

      {/* Action Header: Ajukan Penarikan & Refresh */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Riwayat Pembayaran &amp; Rekap Bagi Hasil</h3>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Data otomatis dihitung dari transaksi siswa berstatus lunas pada kursus yang Anda ampu.
          </span>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadPayouts}
            disabled={loadingPayouts}
            style={{ width: "auto", padding: "8px 14px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={13} className={loadingPayouts ? "spin" : ""} /> Segarkan
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setWithdrawForm(prev => ({
                ...prev,
                amount: String(payoutRingkas?.belum_dibayar || "")
              }));
              setShowWithdrawModal(true);
            }}
            style={{
              width: "auto", padding: "8px 18px", fontSize: "0.82rem", fontWeight: 700,
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              borderColor: "#10b981"
            }}
          >
            <Wallet size={15} /> Ajukan Penarikan Dana
          </button>
        </div>
      </div>

      {/* Tabel Rekap Payout */}
      {loadingPayouts ? (
        <p style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Memuat data bagi hasil &amp; payout...</p>
      ) : payouts.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: "center", borderRadius: 12 }}>
          <Wallet size={48} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
          <h4 style={{ margin: "0 0 6px" }}>Belum Ada Data Bagi Hasil</h4>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", maxWidth: 440, margin: "0 auto" }}>
            Rekap pembayaran akan terbentuk otomatis ketika terdapat transaksi siswa yang berhasil membeli kursus berbayar Anda.
          </p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 0, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-color)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-secondary)", borderBottom: "2px solid var(--border-color)", textAlign: "left", color: "var(--text-secondary)" }}>
                  <th style={{ padding: "12px 16px" }}>Periode</th>
                  <th style={{ padding: "12px 14px", textAlign: "center" }}>Order</th>
                  <th style={{ padding: "12px 14px" }}>Omset Kotor (Bruto)</th>
                  <th style={{ padding: "12px 14px", textAlign: "center" }}>Bagi Hasil (%)</th>
                  <th style={{ padding: "12px 14px" }}>Komisi Kotor</th>
                  <th style={{ padding: "12px 14px" }}>PPh 21 (Bukti Potong)</th>
                  <th style={{ padding: "12px 14px" }}>Bersih Diterima</th>
                  <th style={{ padding: "12px 14px", textAlign: "center" }}>Status</th>
                  <th style={{ padding: "12px 16px" }}>Catatan / Referensi</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => {
                  const statusBg =
                    p.status === "paid" ? "rgba(16, 185, 129, 0.15)" :
                    p.status === "requested" ? "rgba(245, 158, 11, 0.15)" : "rgba(59, 130, 246, 0.15)";
                  const statusColor =
                    p.status === "paid" ? "#34d399" :
                    p.status === "requested" ? "#fbbf24" : "#60a5fa";
                  const statusLabel =
                    p.status === "paid" ? "✅ Lunas" :
                    p.status === "requested" ? "⏳ Menunggu Transfer" : "💵 Siap Dicairkan";

                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                        {new Date(p.period_start).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })} — {new Date(p.period_end).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700 }}>
                        {p.order_count || 0}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        Rp {Number(p.gross_amount || 0).toLocaleString("id-ID")}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700 }}>
                        {p.share_pct}%
                      </td>
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: "var(--text-primary)" }}>
                        Rp {Number(p.payout_amount || 0).toLocaleString("id-ID")}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ color: "#f59e0b", fontWeight: 600 }}>
                          - Rp {Number(p.tax_amount || 0).toLocaleString("id-ID")}
                        </div>
                        {p.bukti_potong_no && (
                          <span style={{ fontSize: "0.68rem", fontFamily: "monospace", color: "var(--text-muted)" }}>
                            {p.bukti_potong_no}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", fontWeight: 800, color: "#10b981" }}>
                        Rp {Number(p.net_payout || p.payout_amount || 0).toLocaleString("id-ID")}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <span style={{
                          fontSize: "0.72rem", padding: "3px 10px", borderRadius: 20,
                          background: statusBg, color: statusColor, fontWeight: 700
                        }}>
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "0.74rem", color: "var(--text-muted)", maxWidth: 220, wordBreak: "break-word" }}>
                        {p.reference && <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Ref: {p.reference}</div>}
                        <div>{p.notes || "—"}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Pengajuan Penarikan Dana (Withdrawal) */}
      {showWithdrawModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99999,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <div className="glass-panel" style={{ width: 480, maxWidth: "100%", padding: 24, borderRadius: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: 8 }}>
                <Wallet size={18} style={{ color: "#10b981" }} />
                <span>Pengajuan Penarikan Dana</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {withdrawMsg && (
              <div style={{
                padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: "0.82rem", fontWeight: 600,
                background: withdrawMsg.startsWith("✓") ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                color: withdrawMsg.startsWith("✓") ? "#34d399" : "#f87171",
                border: `1px solid ${withdrawMsg.startsWith("✓") ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`
              }}>
                {withdrawMsg}
              </div>
            )}

            <form onSubmit={handleWithdrawSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, marginBottom: 4 }}>Nominal Penarikan (Rp)</label>
                <input
                  type="number"
                  min={10000}
                  required
                  value={withdrawForm.amount}
                  onChange={e => setWithdrawForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="Contoh: 500000"
                  style={{ paddingLeft: 12, height: 38, fontSize: "0.9rem", fontWeight: 700 }}
                />
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                  Saldo belum dicairkan: Rp {(payoutRingkas?.belum_dibayar || 0).toLocaleString("id-ID")}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, marginBottom: 4 }}>Bank Tujuan</label>
                  <select
                    value={withdrawForm.bankName}
                    onChange={e => setWithdrawForm(p => ({ ...p, bankName: e.target.value }))}
                    style={{ height: 38, fontSize: "0.85rem", padding: "0 10px" }}
                  >
                    <option value="BCA">BCA</option>
                    <option value="Mandiri">Mandiri</option>
                    <option value="BNI">BNI</option>
                    <option value="BRI">BRI</option>
                    <option value="BSI">BSI (Syariah)</option>
                    <option value="CIMB">CIMB Niaga</option>
                    <option value="Permata">Permata</option>
                    <option value="Jago">Bank Jago</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, marginBottom: 4 }}>Nomor Rekening</label>
                  <input
                    type="text"
                    required
                    value={withdrawForm.accountNumber}
                    onChange={e => setWithdrawForm(p => ({ ...p, accountNumber: e.target.value }))}
                    placeholder="Contoh: 1234567890"
                    style={{ paddingLeft: 12, height: 38, fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, marginBottom: 4 }}>Nama Pemilik Rekening (Sesuai Buku Tabungan)</label>
                <input
                  type="text"
                  required
                  value={withdrawForm.accountHolder}
                  onChange={e => setWithdrawForm(p => ({ ...p, accountHolder: e.target.value }))}
                  placeholder="Nama lengkap pemilik rekening"
                  style={{ paddingLeft: 12, height: 38, fontSize: "0.85rem" }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, marginBottom: 4 }}>Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  value={withdrawForm.notes}
                  onChange={e => setWithdrawForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Contoh: Honor mengajar bulan ini..."
                  style={{ paddingLeft: 12, height: 38, fontSize: "0.82rem" }}
                />
              </div>

              <div style={{
                padding: "10px 12px", borderRadius: 8, background: "rgba(59, 130, 246, 0.08)",
                border: "1px solid rgba(59, 130, 246, 0.2)", fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.5
              }}>
                ℹ️ <strong>Ketentuan Perpajakan PPh 21:</strong> Sesuai PMK DJP, honorarium pengajar dipotong PPh 21 dengan DPP 50%. Bukti Pemotongan Pajak elektronik resmi akan diterbitkan bersamaan dengan proses transfer.
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="btn btn-secondary"
                  style={{ width: "auto", padding: "8px 16px", fontSize: "0.82rem" }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={withdrawSubmitting}
                  className="btn btn-primary"
                  style={{ width: "auto", padding: "8px 22px", fontSize: "0.82rem", fontWeight: 700 }}
                >
                  {withdrawSubmitting ? "Memproses..." : "Kirim Pengajuan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )}
</main>
  );
}
