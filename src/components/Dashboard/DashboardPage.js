"use client";
import { useEffect, useRef } from "react";
import { Clock, BookOpen, Award, BarChart2, Search, Cpu, Compass } from "lucide-react";
import Chart from "chart.js/auto";
import { useApp } from "@/context/AppContext";

export default function DashboardPage() {
  const { currentUser, courses, enrolledCourses, certificates, setActivePage, setActiveCourse, setActiveLessonIndex, radarCanvasRef, competencySkills = [], handleOpenClass } = useApp();
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
            backgroundColor: 'rgba(249, 115, 22, 0.2)',
            borderColor: 'rgb(99, 102, 241)',
            pointBackgroundColor: 'rgb(99, 102, 241)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgb(99, 102, 241)'
          }, {
            label: 'Target Jabatan',
            data: targetSkills,
            fill: true,
            backgroundColor: 'rgba(251, 146, 60, 0.1)',
            borderColor: 'rgba(251, 146, 60, 0.8)',
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
          <h2>Selamat Datang, {currentUser.fullname}!</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Siap meningkatkan kompetensi nasional Anda hari ini? Mari jelajahi program baru.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setActivePage("marketplace-page")} style={{ width: "auto" }}>
          <span>Jelajahi Pelatihan</span><Search size={16} />
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-card glass-card">
          <div className="stat-icon" style={{ backgroundColor: "rgba(249, 115, 22, 0.15)", color: "var(--primary)" }}><Clock size={20} /></div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Waktu Belajar</div>
            <div className="stat-number">{currentUser.stats.hours} Jam</div>
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
            <div className="stat-number">{currentUser.stats.competency}</div>
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

            <div className="glass-card" style={{ padding: 16, border: "1px solid rgba(249, 115, 22, 0.25)", backgroundColor: "rgba(249, 115, 22, 0.05)", borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: "0.65rem", padding: "2px 6px", borderRadius: 4, backgroundColor: "rgba(249, 115, 22, 0.2)", color: "#fed7aa", fontWeight: 600 }}>REKOMENDASI AI: {primaryGap.name}</span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{recommendedCourse.duration}</span>
              </div>
              <h4 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", margin: "4px 0" }}>{recommendedCourse.title}</h4>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "4px 0 12px 0", lineHeight: 1.4 }}>{recommendedCourse.desc}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {isEnrolled ? (
                  <>
                    <span style={{ fontSize: "0.75rem", color: "#34d399", fontWeight: 600 }}>Sudah Terdaftar</span>
                    <button className="btn btn-primary" style={{ width: "auto", padding: "6px 12px", fontSize: "0.75rem", height: "auto" }} onClick={() => handleOpenClass(recommendedCourse.id)}>
                      Mulai Belajar
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 700 }}>{recommendedCourse.priceLabel}</span>
                    <button className="btn btn-primary" style={{ width: "auto", padding: "6px 12px", fontSize: "0.75rem", height: "auto" }} onClick={() => setActivePage("marketplace-page")}>
                      Daftar Kelas
                    </button>
                  </>
                )}
              </div>
            </div>

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
