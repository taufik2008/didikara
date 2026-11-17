"use client";
import { useEffect, useRef, useMemo } from "react";
import { Clock, BookOpen, Award, BarChart2, Search, Cpu, Compass, Play, PlayCircle, ArrowRight, GraduationCap } from "lucide-react";
import Chart from "chart.js/auto";
import { useApp } from "@/context/AppContext";

export default function DashboardPage() {
  const { currentUser, courses = [], enrolledCourses = [], certificates = [], setActivePage, setActiveCourse, setActiveLessonIndex, radarCanvasRef, competencySkills = [], handleOpenClass, isSubscribed, setShowSubscriptionModal, completedLessons = {}, activeCourse = null } = useApp();
  const radarCanvasRefLocal = useRef(null);
  const radarRef = radarCanvasRef || radarCanvasRefLocal;

  const defaultSkills = [
    { key: "leadership", name: "Leadership" },
    { key: "procurement", name: "Procurement" },
    { key: "data_analytics", name: "Data Analytics" },
    { key: "ai_literacy", name: "AI Literacy" },
    { key: "finance", name: "Finance" },
    { key: "management", name: "Management" }
  ];

  const activeSkills = competencySkills.length >= 3 ? competencySkills : defaultSkills;
  const labels = activeSkills.map(s => s.name);

  useEffect(() => {
    if (!currentUser) return;
    let radarInstance = null;
    const currentSkills = activeSkills.map((_, idx) => currentUser.competencies?.current?.[idx] ?? 50);
    const targetSkills = activeSkills.map((_, idx) => currentUser.competencies?.target?.[idx] ?? 80);

    if (radarRef.current) {
      radarInstance = new Chart(radarRef.current, {
        type: 'radar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Kompetensi Saat Ini',
            data: currentSkills,
            fill: true,
            backgroundColor: 'rgba(24, 37, 72, 0.25)',
            borderColor: '#182548',
            pointBackgroundColor: 'rgb(99, 102, 241)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgb(99, 102, 241)'
          }, {
            label: 'Target Jabatan',
            data: targetSkills,
            fill: true,
            backgroundColor: 'rgba(103, 166, 219, 0.15)',
            borderColor: '#67a6db',
            pointBackgroundColor: 'rgba(251, 146, 60, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(251, 146, 60, 1)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { r: { angleLines: { color: 'rgba(255,255,255,0.08)' }, grid: { color: 'rgba(255,255,255,0.08)' }, pointLabels: { color: '#94a3b8', font: { size: 9 } }, ticks: { display: false, max: 100 } } },
          plugins: { legend: { labels: { color: '#94a3b8', font: { size: 8 } }, position: 'bottom' } }
        }
      });
    }

    return () => { if (radarInstance) radarInstance.destroy(); };
  }, [currentUser, JSON.stringify(activeSkills)]);

  // Menentukan kursus yang sedang aktif berjalan untuk kartu Lanjutkan Belajar
  const resumeCourse = useMemo(() => {
    if (!currentUser || !enrolledCourses || enrolledCourses.length === 0) return null;
    if (activeCourse && enrolledCourses.includes(activeCourse.id)) return activeCourse;
    const found = courses.find(c => enrolledCourses.includes(c.id));
    return found || null;
  }, [currentUser, courses, enrolledCourses, activeCourse]);

  const resumeProgress = useMemo(() => {
    if (!resumeCourse) return { total: 0, done: 0, pct: 0, nextLesson: "", nextIdx: 0 };
    const lessons = [];
    (resumeCourse.modules || []).forEach(m => {
      (m.lessons || []).forEach(l => {
        lessons.push(typeof l === "string" ? l : (l.title || "Materi"));
      });
    });
    const total = lessons.length > 0 ? lessons.length : (resumeCourse.lessonsCount || 8);
    const doneIndices = completedLessons[resumeCourse.id] || [];
    const done = Math.min(doneIndices.length, total);
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    let nextIdx = 0;
    for (let i = 0; i < total; i++) {
      if (!doneIndices.includes(i)) {
        nextIdx = i;
        break;
      }
    }
    const nextLesson = lessons[nextIdx] || lessons[0] || "Materi Pembelajaran";
    return { total, done, pct, nextLesson, nextIdx };
  }, [resumeCourse, completedLessons]);

  if (!currentUser) return null;

  const currentSkills = activeSkills.map((_, idx) => currentUser.competencies?.current?.[idx] ?? 50);
  const targetSkills = activeSkills.map((_, idx) => currentUser.competencies?.target?.[idx] ?? 80);
  const gaps = activeSkills.map((skill, idx) => ({ name: skill.name, idx, gap: (targetSkills[idx] ?? 80) - (currentSkills[idx] ?? 50), currentVal: currentSkills[idx] ?? 50, targetVal: targetSkills[idx] ?? 80 }));
  const sortedGaps = [...gaps].sort((a, b) => b.gap - a.gap);
  const primaryGap = sortedGaps[0] || { name: 'Leadership', gap: 0 };
  const findCourseForSkill = (skillName) => {
    return courses.find(c =>
      c.category?.toLowerCase() === skillName?.toLowerCase() ||
      c.title?.toLowerCase().includes(skillName?.toLowerCase())
    );
  };
  const recommendedCourse = findCourseForSkill(primaryGap.name) || courses[0] || null;
  const recommendedCourseId = recommendedCourse?.id;
  const isEnrolled = recommendedCourseId ? enrolledCourses.includes(recommendedCourseId) : false;

  return (
    <main className="page-view active">
      <div className="welcome-banner">
        <div className="welcome-text">
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
            <h2 style={{ margin: 0 }}>Selamat Datang, {currentUser.fullname}!</h2>
            {currentUser?.role && (
              <span className={`badge-role badge-role-${currentUser.role}`} style={{ fontSize: "0.72rem", padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>
                {currentUser.role === "student" ? "Peserta" : (currentUser.roleLabel || (currentUser.role === "admin" ? "Platform Admin" : currentUser.role === "instructor" ? "Instruktur" : currentUser.role === "corporate" ? "HR Manager" : currentUser.role === "government" ? "Kepala Biro SDM" : "Peserta"))}
              </span>
            )}
            {isSubscribed ? (
              <span style={{
                background: "rgba(52, 211, 153, 0.15)", border: "1px solid rgba(52, 211, 153, 0.3)",
                color: "#34d399", padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700
              }}>
                ✓ Langganan Aktif
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubscriptionModal(true)}
                style={{
                  background: "rgba(37, 99, 235, 0.15)", border: "1px solid rgba(37, 99, 235, 0.4)",
                  color: "var(--primary)", padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem",
                  fontWeight: 700, cursor: "pointer", transition: "all 0.2s ease"
                }}>
                ★ Beli Paket Langganan
              </button>
            )}
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            {currentUser?.role === "instructor"
              ? "Kelola materi silabus, upload modul video/presentasi, dan pantau tugas peserta kelas Anda."
              : "Siap meningkatkan kompetensi nasional Anda hari ini? Mari jelajahi program baru."}
          </p>
        </div>
        {currentUser?.role === "instructor" ? (
          <button className="btn btn-primary" onClick={() => setActivePage("instructor-page")} style={{ width: "auto", background: "#edb63f", color: "#0f172a", border: "none", fontWeight: 700 }}>
            <span>Studio Mengajar</span><GraduationCap size={16} />
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => setActivePage("marketplace-page")} style={{ width: "auto", background: "#edb63f", color: "#0f172a", border: "none", fontWeight: 700 }}>
            <span>Jelajahi Pelatihan</span><Search size={16} />
          </button>
        )}
      </div>

      {/* 🚀 Hero Card: Lanjutkan Belajar (Resume Learning) */}
      {resumeCourse ? (
        <div className="resume-learning-card glass-card">
          <div className="resume-learning-content">
            <div className="resume-learning-header">
              <div className="resume-learning-badge">
                <Play size={11} style={{ fill: "currentColor" }} />
                <span>LANJUTKAN BELAJAR</span>
              </div>
              {resumeCourse.category && (
                <span className="resume-learning-category">{resumeCourse.category}</span>
              )}
              <div className="resume-learning-progress-text">
                <span className="resume-pct-number">{resumeProgress.pct}%</span>
                <span className="resume-pct-sub">({resumeProgress.done}/{resumeProgress.total} Materi Selesai)</span>
              </div>
            </div>

            <div className="resume-learning-body">
              <div className="resume-learning-info">
                <h3 className="resume-course-title">{resumeCourse.title}</h3>
                <div className="resume-next-lesson">
                  <PlayCircle size={15} className="resume-next-icon" />
                  <span className="resume-next-label">Materi Lanjutan:</span>
                  <span className="resume-next-title">{resumeProgress.nextLesson}</span>
                </div>
              </div>

              <div className="resume-learning-action">
                <button
                  type="button"
                  className="btn btn-primary resume-action-btn"
                  onClick={() => handleOpenClass(resumeCourse.id)}
                >
                  <span>Lanjutkan Belajar</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            <div className="resume-progress-track">
              <div
                className="resume-progress-fill"
                style={{ width: `${Math.max(4, resumeProgress.pct)}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="resume-learning-card glass-card" style={{ padding: "18px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                backgroundColor: "rgba(103, 166, 219, 0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-accent)"
              }}>
                <BookOpen size={22} />
              </div>
              <div>
                <h4 style={{ margin: "0 0 3px 0", fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Mulai Perjalanan Belajar Anda di DIDIKARA
                </h4>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Pilih dari puluhan modul pelatihan terakreditasi untuk akselerasi kompetensi Anda.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setActivePage("marketplace-page")}
              style={{ width: "auto", padding: "8px 16px", fontSize: "0.8rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <span>Jelajahi Pelatihan</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card glass-card">
          <div className="stat-icon" style={{ backgroundColor: "rgba(37, 99, 235, 0.15)", color: "var(--primary)" }}><Clock size={20} /></div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Waktu Belajar</div>
            <div className="stat-number">{currentUser?.stats?.hours ?? 0} Jam</div>
          </div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-icon" style={{ backgroundColor: "rgba(251, 146, 60, 0.15)", color: "#fb923c" }}><BookOpen size={20} /></div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Kelas Berjalan</div>
            <div className="stat-number">{enrolledCourses.length} Kelas</div>
          </div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-icon" style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "var(--success)" }}><Award size={20} /></div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Sertifikat Didapat</div>
            <div className="stat-number">{certificates.length}</div>
          </div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-icon" style={{ backgroundColor: "rgba(6, 182, 212, 0.15)", color: "var(--info)" }}><BarChart2 size={20} /></div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Level Akses</div>
            <div className="stat-number">{currentUser?.stats?.competency ?? "Standar"}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="glass-panel" style={{ padding: 24, minHeight: 380 }}>
          <h3 style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <Cpu size={18} style={{ color: "var(--primary)" }} /> AI Learning Advisor: Jalur Rekomendasi Cerdas
          </h3>

          <div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.5 }}>
              AI menganalisis profil keahlian Anda untuk posisi <strong>{currentUser.jobTitle || 'Umum'}</strong>.
              Celah keahlian terbesar Anda berada pada dimensi <strong style={{ color: "var(--primary)" }}>{primaryGap.name}</strong> dengan
              selisih <strong>{primaryGap.gap}%</strong> dari target jabatan.
            </div>

            {recommendedCourse ? (
              <div className="glass-card" style={{ padding: 16, border: "1px solid rgba(24, 37, 72, 0.15)", backgroundColor: "rgba(24, 37, 72, 0.04)", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: "0.65rem", padding: "2px 6px", borderRadius: 4, backgroundColor: "rgba(24, 37, 72, 0.1)", color: "#182548", fontWeight: 600 }}>REKOMENDASI AI: {primaryGap.name}</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{recommendedCourse.duration || "-"}</span>
                </div>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", margin: "4px 0" }}>{recommendedCourse.title}</h4>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "4px 0 12px 0", lineHeight: 1.4 }}>{recommendedCourse.desc}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {isEnrolled ? (
                    <>
                      <span style={{ fontSize: "0.75rem", color: "#34d399", fontWeight: 600 }}>Sudah Terdaftar</span>
                      <button className="btn btn-primary" style={{ width: "auto", padding: "6px 12px", fontSize: "0.75rem", height: "auto" }} onClick={() => recommendedCourse?.id && handleOpenClass(recommendedCourse.id)}>
                        Mulai Belajar
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 700 }}>{recommendedCourse.priceLabel || "Akses Gratis/Berbayar"}</span>
                      {!isSubscribed ? (
                        <button className="btn btn-primary" style={{ width: "auto", padding: "6px 12px", fontSize: "0.75rem", height: "auto" }} onClick={() => setShowSubscriptionModal(true)}>
                          Akses Member
                        </button>
                      ) : (
                        <button className="btn btn-primary" style={{ width: "auto", padding: "6px 12px", fontSize: "0.75rem", height: "auto" }} onClick={() => setActivePage("marketplace-page")}>
                          {recommendedCourse.price === 0 ? "Buka Kelas" : "Beli Kelas"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-card" style={{ padding: 16, border: "1px dashed var(--border-color)", borderRadius: 8, textAlign: "center" }}>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "8px 0" }}>
                  Jelajahi berbagai program pelatihan untuk meningkatkan kompetensi Anda.
                </p>
                <button className="btn btn-primary" style={{ width: "auto", padding: "6px 14px", fontSize: "0.75rem", margin: "4px auto" }} onClick={() => setActivePage("marketplace-page")}>
                  Buka Katalog Pelatihan
                </button>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>Prioritas Pengembangan Karir:</div>
              <div className="learning-path-timeline">
                {sortedGaps.slice(0, 3).map((item, idx) => {
                  const courseObj = findCourseForSkill(item.name);
                  return (
                    <div key={idx} className="timeline-step" style={{ opacity: 1 - idx * 0.15, marginBottom: 8 }}>
                      <div className="timeline-title" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 600 }}>
                        <span>{idx + 1}. Tingkatkan {item.name}</span>
                        <span style={{ color: "var(--primary)" }}>Gap: {item.gap}%</span>
                      </div>
                      <div className="timeline-desc" style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        {courseObj ? courseObj.title : "Modul pelatihan terkait " + item.name} (Target: {item.targetVal}%, Saat ini: {item.currentVal}%).
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
          <h3 style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <Compass size={18} style={{ color: "#fb923c" }} /> Radar Kompetensi Saya
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginBottom: 20 }}>Visualisasi penguasaan kompetensi saat ini vs target jabatan.</p>
          <div style={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", height: 220 }}>
            <canvas ref={radarRef} id="radarChart"></canvas>
          </div>
        </div>
      </div>
    </main>
  );
}
