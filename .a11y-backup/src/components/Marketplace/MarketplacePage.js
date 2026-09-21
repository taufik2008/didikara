"use client";
import { Clock, BarChart2, Star, BookOpen, Lock } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function MarketplacePage() {
  const {
    courses, categories, enrolledCourses, filterCategory, setFilterCategory,
    handleOpenClass, handleEnrollCourse, checkPrerequisite,
  } = useApp();

  return (
    <main className="page-view active">
      <div className="filters-row">
        <div>
          <h2 style={{ fontSize: "1.8rem", marginBottom: 6 }}>Katalog Pelatihan & Sertifikasi</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Pilih pelatihan terbaik untuk meningkatkan kompetensi Anda.</p>
        </div>
        <div className="filter-pills">
          {["all", ...categories.map(c => c.key)].map(cat => {
            const catObj = categories.find(c => c.key === cat);
            return (
              <div key={cat} className={`filter-pill ${filterCategory === cat ? 'active' : ''}`} onClick={() => setFilterCategory(cat)}>
                {cat === 'all' ? 'Semua' : (catObj ? catObj.name : cat)}
              </div>
            );
          })}
        </div>
      </div>

      <div className="course-grid">
        {courses.filter(course => filterCategory === "all" || course.category === filterCategory).map(course => {
          const isEnrolled = enrolledCourses.includes(course.id);
          const prereqCheck = checkPrerequisite ? checkPrerequisite(course.id) : { locked: false };
          const isLocked = prereqCheck.locked;

          return (
            <div key={course.id} className="glass-card course-card" style={{ position: "relative", opacity: isLocked ? 0.75 : 1 }}>
              {/* Lock overlay badge */}
              {isLocked && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  borderRadius: "inherit", zIndex: 2,
                  background: "rgba(0,0,0,0.18)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  pointerEvents: "none",
                }}>
                  <Lock size={28} style={{ color: "#fde68a", marginBottom: 8 }} />
                  <span style={{ fontSize: "0.72rem", color: "#fde68a", fontWeight: 700, textAlign: "center", maxWidth: 160, lineHeight: 1.4 }}>
                    Selesaikan terlebih dahulu:<br />
                    <span style={{ color: "#fff" }}>{prereqCheck.prerequisiteTitle}</span>
                  </span>
                </div>
              )}

              <div className="course-banner">
                <span className="course-badge">{course.badge}</span>
                <BookOpen size={32} style={{ color: "var(--primary)" }} />
              </div>
              <div className="course-content">
                <div>
                  <span style={{ fontSize: "0.7rem", color: "var(--primary)", textTransform: "uppercase", fontWeight: 600 }}>{course.category}</span>
                  <h4 className="course-title" style={{ marginTop: 4 }}>{course.title}</h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 12, height: 60, overflow: "hidden", textOverflow: "ellipsis" }}>{course.desc}</p>
                </div>
                <div>
                  <div className="course-meta">
                    <span><Clock size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />{course.duration}</span>
                    <span><BarChart2 size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />{course.level}</span>
                    <span style={{ color: "var(--warning)" }}><Star size={12} style={{ marginRight: 4, verticalAlign: "middle", fill: "var(--warning)" }} />{course.rating}</span>
                  </div>
                  <div className="course-footer">
                    <span className="course-price">{course.priceLabel}</span>
                    {isEnrolled ? (
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleOpenClass(course.id)}
                        style={{ width: "auto" }}
                        disabled={isLocked}
                      >
                        {isLocked ? <><Lock size={12} style={{ marginRight: 4 }} />Terkunci</> : "Buka Kelas"}
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary"
                        onClick={() => isLocked ? null : handleEnrollCourse(course)}
                        style={{ width: "auto", opacity: isLocked ? 0.5 : 1, cursor: isLocked ? "not-allowed" : "pointer" }}
                        disabled={isLocked}
                      >
                        {isLocked ? <><Lock size={12} style={{ marginRight: 4 }} />Terkunci</> : "Beli Kelas"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
