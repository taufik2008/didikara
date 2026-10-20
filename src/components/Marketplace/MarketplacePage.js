"use client";
import { useState, useMemo, useEffect } from "react";
import { Clock, BarChart2, Star, BookOpen, Lock, UserCheck, Search, Award, Sparkles, X, ChevronRight, CheckCircle, Check, Crown, Users, Building2, ShieldCheck, Zap, Gift, Tv, MapPin, Video, Calendar } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function MarketplacePage() {
  const {
    courses, categories, levels, enrolledCourses, filterCategory, setFilterCategory,
    handleOpenClass, handleEnrollCourse, checkPrerequisite, isSubscribed, setShowSubscriptionModal,
  } = useApp();

  const distinctLevels = useMemo(() => {
    const list = [...(levels || [])];
    (courses || []).forEach((c) => {
      if (
        c.level &&
        !list.some(
          (x) =>
            x.key?.toLowerCase() === c.level.toLowerCase() ||
            x.name?.toLowerCase() === c.level.toLowerCase()
        )
      ) {
        list.push({ key: c.level, name: c.level });
      }
    });
    return list;
  }, [levels, courses]);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState("category"); // "category" | "instructor"
  const [selectedLearningType, setSelectedLearningType] = useState("all"); // "all" | "self_learning" | "online" | "offline"
  const [selectedInstructor, setSelectedInstructor] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedPriceRange, setSelectedPriceRange] = useState("all"); // "all" | "free" | "under500" | "above500"
  const [selectedMinRating, setSelectedMinRating] = useState("all"); // "all" | "4.5"
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [showCorporateModal, setShowCorporateModal] = useState(false);
  const [selectedMembershipPlan, setSelectedMembershipPlan] = useState("annual"); // "monthly" | "annual"
  const [membershipSuccess, setMembershipSuccess] = useState(false);
  const [membershipSettings, setMembershipSettings] = useState({
    monthlyPrice: 149000,
    annualPrice: 999000,
    annualBadge: "HEMAT 44%"
  });

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          setMembershipSettings({
            monthlyPrice: Number(data.settings.membership_monthly_price) || 149000,
            annualPrice: Number(data.settings.membership_annual_price) || 999000,
            annualBadge: data.settings.membership_annual_badge || "HEMAT 44%"
          });
        }
      })
      .catch(() => {});
  }, []);

  const [corporateSubmitted, setCorporateSubmitted] = useState(false);
  const [corporateForm, setCorporateForm] = useState({
    company: "",
    picName: "",
    email: "",
    whatsapp: "",
    seats: "15"
  });
  const [instructorModal, setInstructorModal] = useState(null); // instructor obj | null
  const [expandedCourses, setExpandedCourses] = useState({});

  const toggleExpandDesc = (courseId) => {
    setExpandedCourses(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  // ── Helper: Jadwal ke Google Calendar & iCal .ICS ──────────────────────────
  const makeCourseGoogleCalendarUrl = (course) => {
    const title = `Pelatihan DIDIKARA: ${course.title}`;
    const desc = `Ikuti pelatihan resmi ${course.title} bersama ${course.instructor?.name || "Instruktur DIDIKARA"}.\nKategori: ${course.category}\nLevel: ${course.level}`;
    const loc = course.venue || (course.learning_type === "online" ? "Google Meet / Zoom Online" : "DIDIKARA Learning Center");
    const now = new Date();
    const startObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 9, 0, 0);
    const endObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 12, 0, 0);
    const start = startObj.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const end = endObj.toISOString().replace(/-|:|\.\d\d\d/g, "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}&details=${encodeURIComponent(desc)}&location=${encodeURIComponent(loc)}`;
  };

  const downloadCourseIcsFile = (course) => {
    const title = `Pelatihan DIDIKARA: ${course.title}`;
    const desc = `Ikuti pelatihan resmi ${course.title} bersama ${course.instructor?.name || "Instruktur DIDIKARA"}.`;
    const loc = course.venue || (course.learning_type === "online" ? "Google Meet / Zoom Online" : "DIDIKARA Learning Center");
    const now = new Date();
    const startObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 9, 0, 0);
    const endObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 12, 0, 0);
    const start = startObj.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const end = endObj.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//DIDIKARA//ID\nBEGIN:VEVENT\nUID:course-${course.id}@didikara.id\nDTSTAMP:${start}\nDTSTART:${start}\nDTEND:${end}\nSUMMARY:${title}\nDESCRIPTION:${desc}\nLOCATION:${loc}\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Jadwal_${course.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Kumpulan data instruktur unik yang mengajar kursus
  const instructors = useMemo(() => {
    const map = new Map();
    courses.forEach(c => {
      if (c.instructor && c.instructor.name) {
        if (!map.has(c.instructor.name)) {
          map.set(c.instructor.name, {
            ...c.instructor,
            courseCount: 1,
            courses: [c],
            categories: [c.category]
          });
        } else {
          const item = map.get(c.instructor.name);
          item.courseCount += 1;
          item.courses.push(c);
          if (!item.categories.includes(c.category)) item.categories.push(c.category);
        }
      }
    });
    return Array.from(map.values());
  }, [courses]);

  // Helper cerdas mendeteksi model belajar kursus secara konsisten
  const getLearningType = (course) => {
    if (course.learningType) {
      const lt = String(course.learningType).toLowerCase().trim();
      if (lt === "self_learning" || lt === "self-learning" || lt === "mandiri" || lt === "self learning") return "self_learning";
      if (lt === "online" || lt === "webinar" || lt === "live") return "online";
      if (lt === "offline" || lt === "tatap_muka" || lt === "tatap muka") return "offline";
    }
    const tLabel = String(course.typeLabel || "").toLowerCase();
    const venue = String(course.venue || "").toLowerCase();
    if (tLabel.includes("offline") || venue.includes("hotel") || venue.includes("tatap muka") || venue.includes("gedung") || venue.includes("ruang")) return "offline";
    if (tLabel.includes("online") || venue.includes("zoom") || venue.includes("webinar") || venue.includes("live")) return "online";
    return "self_learning";
  };

  const getLearningTypeBadge = (type) => {
    switch (type) {
      case "self_learning":
        return {
          key: "self_learning",
          label: "Self-Learning (Belajar Mandiri)",
          shortLabel: "Self-Learning",
          bg: "rgba(16, 185, 129, 0.12)",
          border: "rgba(16, 185, 129, 0.35)",
          color: "var(--success)",
          icon: <Gift size={13} />
        };
      case "online":
        return {
          key: "online",
          label: "Online (Live Webinar)",
          shortLabel: "Online Live",
          bg: "rgba(59, 130, 246, 0.12)",
          border: "rgba(59, 130, 246, 0.35)",
          color: "#3b82f6",
          icon: <Tv size={13} />
        };
      case "offline":
        return {
          key: "offline",
          label: "Offline (Tatap Muka)",
          shortLabel: "Offline Tatap Muka",
          bg: "rgba(168, 85, 247, 0.12)",
          border: "rgba(168, 85, 247, 0.35)",
          color: "#a855f7",
          icon: <MapPin size={13} />
        };
      default:
        return {
          key: "self_learning",
          label: "Self-Learning (Belajar Mandiri)",
          shortLabel: "Self-Learning",
          bg: "rgba(16, 185, 129, 0.12)",
          border: "rgba(16, 185, 129, 0.35)",
          color: "var(--success)",
          icon: <Gift size={13} />
        };
    }
  };

  // Jumlah program per model belajar
  const learningTypeCounts = useMemo(() => {
    let selfCount = 0;
    let onlineCount = 0;
    let offlineCount = 0;
    courses.forEach(c => {
      const t = getLearningType(c);
      if (t === "self_learning") selfCount++;
      else if (t === "online") onlineCount++;
      else if (t === "offline") offlineCount++;
    });
    return {
      all: courses.length,
      self_learning: selfCount,
      online: onlineCount,
      offline: offlineCount,
    };
  }, [courses]);

  // Filter kursus berdasarkan model belajar, kategori, instruktur, level, harga, rating, dan kata kunci
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const courseType = getLearningType(course);
      const matchType = selectedLearningType === "all" ||
        courseType.toLowerCase() === selectedLearningType.toLowerCase();

      const matchCategory = filterCategory === "all" || course.category === filterCategory;
      const matchInstructor = selectedInstructor === "all" || (course.instructor && course.instructor.name === selectedInstructor);
      
      const matchLevel = selectedLevel === "all" || 
        (course.level && course.level.toLowerCase() === selectedLevel.toLowerCase()) ||
        distinctLevels.some(l => 
          (l.key?.toLowerCase() === selectedLevel.toLowerCase() || l.name?.toLowerCase() === selectedLevel.toLowerCase()) &&
          (l.key?.toLowerCase() === course.level?.toLowerCase() || l.name?.toLowerCase() === course.level?.toLowerCase())
        );

      const rawPrice = Number(course.price) || 0;
      const matchPrice = selectedPriceRange === "all" ? true :
        selectedPriceRange === "free" ? rawPrice === 0 :
        selectedPriceRange === "under500" ? rawPrice > 0 && rawPrice < 500000 :
        selectedPriceRange === "above500" ? rawPrice >= 500000 : true;

      const ratingVal = Number(course.rating) || 4.8;
      const matchRating = selectedMinRating === "all" ? true : ratingVal >= Number(selectedMinRating);

      const matchSearch = searchQuery.trim() === "" ||
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.venue && course.venue.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (course.instructor && course.instructor.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (course.instructor && course.instructor.title && course.instructor.title.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchType && matchCategory && matchInstructor && matchLevel && matchPrice && matchRating && matchSearch;
    });
  }, [courses, selectedLearningType, filterCategory, selectedInstructor, selectedLevel, selectedPriceRange, selectedMinRating, searchQuery]);

  return (
    <main className="page-view active">
      {/* Header & Title */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: "1.8rem", marginBottom: 6 }}>Katalog Pelatihan & Pengajar Ahli</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Pilih program pelatihan bersertifikasi dan pelajari materi langsung dari para praktisi dan pakar terbaik di bidangnya.
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ position: "relative", width: 280, maxWidth: "100%" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Cari pelatihan / nama instruktur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", padding: "8px 12px 8px 36px", fontSize: "0.82rem", borderRadius: 8 }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0 }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Mode Filter: Berdasarkan Kategori vs Berdasarkan Instruktur */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.05)", padding: 3, borderRadius: 8, border: "1px solid var(--border-color)" }}>
          <button
            type="button"
            className="filter-pill"
            style={{
              padding: "6px 14px", fontSize: "0.78rem", fontWeight: activeFilterTab === "category" ? 700 : 500,
              background: activeFilterTab === "category" ? "var(--primary)" : "transparent",
              color: activeFilterTab === "category" ? "#fff" : "var(--text-secondary)",
              borderColor: "transparent"
            }}
            onClick={() => { setActiveFilterTab("category"); setSelectedInstructor("all"); }}
          >
            📚 Berdasarkan Kategori
          </button>
          <button
            type="button"
            className="filter-pill"
            style={{
              padding: "6px 14px", fontSize: "0.78rem", fontWeight: activeFilterTab === "instructor" ? 700 : 500,
              background: activeFilterTab === "instructor" ? "var(--primary)" : "transparent",
              color: activeFilterTab === "instructor" ? "#fff" : "var(--text-secondary)",
              borderColor: "transparent"
            }}
            onClick={() => { setActiveFilterTab("instructor"); setFilterCategory("all"); }}
          >
            👨‍🏫 Berdasarkan Instruktur Ahli ({instructors.length})
          </button>
        </div>

        {/* Active Filter Indicator / Reset */}
        {(selectedLearningType !== "all" || filterCategory !== "all" || selectedInstructor !== "all" || selectedLevel !== "all" || selectedPriceRange !== "all" || selectedMinRating !== "all" || searchQuery) && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "var(--text-secondary)", flexWrap: "wrap" }}>
            <span>Filter Aktif:</span>
            {selectedLearningType !== "all" && (
              <span className="badge-role" style={{
                background: selectedLearningType === "self_learning" ? "rgba(16,185,129,0.15)" : selectedLearningType === "online" ? "rgba(59,130,246,0.15)" : "rgba(168,85,247,0.15)",
                color: selectedLearningType === "self_learning" ? "var(--success)" : selectedLearningType === "online" ? "#60a5fa" : "#c084fc",
                display: "inline-flex", alignItems: "center", gap: 4
              }}>
                Model: {selectedLearningType === "self_learning" ? "Self-Learning" : selectedLearningType === "online" ? "Online Live" : "Offline Tatap Muka"}
                <X size={10} style={{ cursor: "pointer" }} onClick={() => setSelectedLearningType("all")} />
              </span>
            )}
            {filterCategory !== "all" && (
              <span className="badge-role badge-role-government" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                Kategori: {filterCategory}
                <X size={10} style={{ cursor: "pointer" }} onClick={() => setFilterCategory("all")} />
              </span>
            )}
            {selectedInstructor !== "all" && (
              <span className="badge-role badge-role-corporate" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                Instruktur: {selectedInstructor}
                <X size={10} style={{ cursor: "pointer" }} onClick={() => setSelectedInstructor("all")} />
              </span>
            )}
            {selectedLevel !== "all" && (
              <span className="badge-role" style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd", display: "inline-flex", alignItems: "center", gap: 4 }}>
                Level: {selectedLevel}
                <X size={10} style={{ cursor: "pointer" }} onClick={() => setSelectedLevel("all")} />
              </span>
            )}
            {selectedPriceRange !== "all" && (
              <span className="badge-role" style={{ background: "rgba(16,185,129,0.15)", color: "#6ee7b7", display: "inline-flex", alignItems: "center", gap: 4 }}>
                Harga: {selectedPriceRange === "free" ? "Gratis" : selectedPriceRange === "under500" ? "< Rp 500k" : "≥ Rp 500k"}
                <X size={10} style={{ cursor: "pointer" }} onClick={() => setSelectedPriceRange("all")} />
              </span>
            )}
            {selectedMinRating !== "all" && (
              <span className="badge-role" style={{ background: "rgba(245,158,11,0.15)", color: "#fde68a", display: "inline-flex", alignItems: "center", gap: 4 }}>
                Rating: ⭐ {selectedMinRating}+
                <X size={10} style={{ cursor: "pointer" }} onClick={() => setSelectedMinRating("all")} />
              </span>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: "auto", padding: "2px 8px", fontSize: "0.7rem", height: "auto" }}
              onClick={() => { setSelectedLearningType("all"); setFilterCategory("all"); setSelectedInstructor("all"); setSelectedLevel("all"); setSelectedPriceRange("all"); setSelectedMinRating("all"); setSearchQuery(""); }}
            >
              Reset Semua
            </button>
          </div>
        )}
      </div>

      {/* 🌟 All-Access Membership & B2B Corporate Banner */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 20
      }}>
        {/* Membership Pass */}
        <div className="glass-card" style={{
          padding: "12px 16px", borderRadius: 10,
          background: "linear-gradient(135deg, rgba(249,115,22,0.12), rgba(234,88,12,0.04))",
          border: "1px solid rgba(249,115,22,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase" }}>
              💎 Paket Membership All-Access
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.85rem", marginTop: 2 }}>
              Akses Semua Kursus &amp; Ujian
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
              Hanya Rp 149.000/bulan atau Rp 999.000/tahun
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowSubscriptionModal(true)}
            style={{ width: "auto", padding: "6px 12px", fontSize: "0.72rem", whiteSpace: "nowrap" }}>
            Mulai Langganan →
          </button>
        </div>

        {/* Corporate Training Pass */}
        <div className="glass-card" style={{
          padding: "12px 16px", borderRadius: 10,
          background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(37,99,235,0.04))",
          border: "1px solid rgba(59,130,246,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase" }}>
              🏢 Pelatihan Tim &amp; B2B Korporat
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.85rem", marginTop: 2 }}>
              Beli Paket Lisensi Tim (5 - 50 Seats)
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
              Dilengkapi Dasbor Manajer &amp; Laporan Progres Tim
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { setCorporateSubmitted(false); setShowCorporateModal(true); }}
            style={{ width: "auto", padding: "6px 12px", fontSize: "0.72rem", whiteSpace: "nowrap", borderColor: "rgba(59,130,246,0.4)", color: "#93c5fd" }}>
            Paket Korporat
          </button>
        </div>
      </div>

      {/* 🧭 Model Belajar Quick Filter Pills */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <Zap size={14} style={{ color: "var(--primary)" }} />
          Pilih Model Belajar:
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { key: "all", label: "🌟 Semua Model", count: learningTypeCounts.all },
            { key: "self_learning", label: "🟢 Self-Learning (Belajar Mandiri)", count: learningTypeCounts.self_learning },
            { key: "online", label: "🔵 Online (Live Webinar)", count: learningTypeCounts.online },
            { key: "offline", label: "🟣 Offline (Tatap Muka)", count: learningTypeCounts.offline },
          ].map(tab => {
            const isActive = selectedLearningType === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={`filter-pill ${isActive ? "active" : ""}`}
                onClick={() => setSelectedLearningType(tab.key)}
                style={{
                  padding: "8px 16px",
                  fontSize: "0.82rem",
                  fontWeight: isActive ? 700 : 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  padding: "1px 6px",
                  borderRadius: 12,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  background: isActive ? "rgba(255,255,255,0.25)" : "var(--bg-tertiary)",
                  color: isActive ? "#ffffff" : "var(--text-primary)",
                  border: isActive ? "none" : "1px solid var(--border-color)",
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Multi-Filter Bar: Tingkat, Harga, Rating */}
      <div style={{
        display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap",
        padding: "12px 18px", background: "var(--bg-card)", border: "1px solid var(--border-color)",
        borderRadius: 14, marginBottom: 18, fontSize: "0.82rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Tingkat:</span>
          <select
            value={selectedLevel}
            onChange={e => setSelectedLevel(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              fontSize: "0.82rem",
              outline: "none",
              cursor: "pointer"
            }}>
            <option value="all">Semua Tingkat</option>
            {distinctLevels.map(lvl => (
              <option key={lvl.key || lvl.name} value={lvl.key || lvl.name}>
                {lvl.name || lvl.key}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Harga:</span>
          <select
            value={selectedPriceRange}
            onChange={e => setSelectedPriceRange(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              fontSize: "0.82rem",
              outline: "none",
              cursor: "pointer"
            }}>
            <option value="all">Semua Harga</option>
            <option value="free">Gratis (Rp 0)</option>
            <option value="under500">&lt; Rp 500.000</option>
            <option value="above500">≥ Rp 500.000</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Rating:</span>
          <select
            value={selectedMinRating}
            onChange={e => setSelectedMinRating(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              color: "var(--text-primary)",
              fontSize: "0.82rem",
              outline: "none",
              cursor: "pointer"
            }}>
            <option value="all">Semua Rating</option>
            <option value="4.0">⭐ 4.0+</option>
            <option value="4.5">⭐ 4.5+</option>
          </select>
        </div>

        <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>
          Menampilkan {filteredCourses.length} dari {courses.length} program
        </span>
      </div>

      {/* Category Pills (Jika tab category aktif) */}
      {activeFilterTab === "category" && (
        <div className="filter-pills" style={{ marginBottom: 20 }}>
          {["all", ...categories.map(c => c.key)].map(cat => {
            const catObj = categories.find(c => c.key === cat);
            return (
              <button type="button" key={cat} className={`filter-pill ${filterCategory === cat ? 'active' : ''}`} onClick={() => setFilterCategory(cat)}>
                {cat === 'all' ? 'Semua Kategori' : (catObj ? catObj.name : cat)}
              </button>
            );
          })}
        </div>
      )}

      {/* Instructor Showcase Cards (Jika tab instructor aktif) */}
      {activeFilterTab === "instructor" && (
        <div>
          <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 10 }}>
            Pilih Pengajar / Instruktur untuk Melihat Kelas Pelatihan:
          </div>
          <div className="instructor-showcase-grid">
            <div
              className={`instructor-showcase-card ${selectedInstructor === "all" ? "active" : ""}`}
              onClick={() => setSelectedInstructor("all")}
            >
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--primary-gradient)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.85rem" }}>
                ⭐
              </div>
              <div>
                <div className="instructor-name-sm">Semua Instruktur</div>
                <div className="instructor-title-xs">{courses.length} Program Pelatihan</div>
              </div>
            </div>

            {instructors.map((ins) => (
              <div
                key={ins.name}
                className={`instructor-showcase-card ${selectedInstructor === ins.name ? "active" : ""}`}
                onClick={() => setSelectedInstructor(selectedInstructor === ins.name ? "all" : ins.name)}
              >
                <img
                  src={ins.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"}
                  alt={ins.name}
                  className="instructor-avatar-xs"
                />
                <div style={{ overflow: "hidden" }}>
                  <div className="instructor-name-sm" style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{ins.name}</div>
                  <div className="instructor-title-xs">{ins.courseCount} Pelatihan · {ins.org || "Pakar"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Course Grid Result */}
      {filteredCourses.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", margin: "20px 0" }}>
          <BookOpen size={48} style={{ color: "var(--text-muted)", margin: "0 auto 12px auto", opacity: 0.5 }} />
          <h4 style={{ color: "var(--text-primary)", marginBottom: 6 }}>Tidak Ada Pelatihan Ditemukan</h4>
          <p style={{ fontSize: "0.85rem" }}>Coba ubah kata kunci pencarian, filter model belajar, kategori, atau pilih instruktur lainnya.</p>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: "auto", margin: "16px auto 0 auto", padding: "8px 16px", fontSize: "0.8rem" }}
            onClick={() => { setSelectedLearningType("all"); setFilterCategory("all"); setSelectedInstructor("all"); setSelectedLevel("all"); setSelectedPriceRange("all"); setSelectedMinRating("all"); setSearchQuery(""); }}
          >
            Tampilkan Semua Pelatihan
          </button>
        </div>
      ) : (
        <div className="course-grid">
          {filteredCourses.map(course => {
            const isEnrolled = enrolledCourses.includes(course.id);
            const prereqCheck = checkPrerequisite ? checkPrerequisite(course.id) : { locked: false };
            const isLocked = prereqCheck.locked;
            const typeMeta = getLearningTypeBadge(getLearningType(course));

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

                {/* Course Banner / Thumbnail Image */}
                {(() => {
                  const DEFAULT_COVERS = {
                    AI: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
                    Tech: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80",
                    Procurement: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80",
                    Leadership: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&auto=format&fit=crop&q=80",
                  };
                  const courseImg = course.image || DEFAULT_COVERS[course.category] || "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80";

                  return (
                    <div className="course-banner">
                      <img
                        src={courseImg}
                        alt={course.title}
                        className="course-thumbnail-img"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80";
                        }}
                      />
                      <div className="course-banner-gradient" />
                      <span className="course-badge">{course.badge}</span>
                    </div>
                  );
                })()}

                <div className="course-content">
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                      <span style={{ fontSize: "0.7rem", color: "var(--primary)", textTransform: "uppercase", fontWeight: 700 }}>{course.category}</span>
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: typeMeta.bg,
                        border: `1px solid ${typeMeta.border}`,
                        color: typeMeta.color
                      }}>
                        {typeMeta.icon}
                        {typeMeta.shortLabel || typeMeta.label}
                      </span>
                    </div>
                    <h4 className="course-title" style={{ marginTop: 2 }}>{course.title}</h4>

                    {/* Venue / Lokasi, Jadwal, & Kuota */}
                    {(course.venue || course.schedule || course.quota) && (
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4, marginBottom: 8 }}>
                        {course.venue && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.03)", padding: "3px 6px", borderRadius: 4, border: "1px solid var(--border-color)" }}>
                            <MapPin size={11} style={{ color: typeMeta.color, flexShrink: 0 }} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{course.venue}</span>
                          </div>
                        )}
                        {course.schedule && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.03)", padding: "3px 6px", borderRadius: 4, border: "1px solid var(--border-color)" }}>
                            <Calendar size={11} style={{ color: "#60a5fa", flexShrink: 0 }} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{course.schedule}</span>
                          </div>
                        )}
                        {course.quota && (
                          <span style={{
                            padding: "2px 7px", borderRadius: 4, fontSize: "0.68rem", fontWeight: 700,
                            background: course.quota.toLowerCase().includes("sisa") ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                            color: course.quota.toLowerCase().includes("sisa") ? "#f87171" : "#34d399",
                            border: `1px solid ${course.quota.toLowerCase().includes("sisa") ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`
                          }}>
                            {course.quota}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Instructor Snippet on Card */}
                    {course.instructor && (
                      <div
                        className="course-instructor-snippet"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInstructorModal(course.instructor);
                        }}
                        title={`Lihat Profil Instruktur: ${course.instructor.name}`}
                      >
                        <img
                          src={course.instructor.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80"}
                          alt={course.instructor.name}
                          className="instructor-avatar-xs"
                        />
                        <div style={{ overflow: "hidden" }}>
                          <div className="instructor-name-sm" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {course.instructor.name}
                          </div>
                          <div className="instructor-title-xs">
                            {course.instructor.title || course.instructor.org || "Pengajar Ahli"}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Course Description */}
                    <div style={{ marginBottom: 12 }}>
                      <p
                        className="course-desc"
                        title={course.desc}
                        style={{
                          fontSize: "0.82rem",
                          lineHeight: 1.55,
                          margin: 0,
                          display: expandedCourses[course.id] ? "block" : "-webkit-box",
                          WebkitLineClamp: expandedCourses[course.id] ? "unset" : 3,
                          WebkitBoxOrient: "vertical",
                          overflow: expandedCourses[course.id] ? "visible" : "hidden",
                          wordBreak: "break-word",
                        }}
                      >
                        {course.desc}
                      </p>
                      {course.desc && course.desc.length > 80 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpandDesc(course.id);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--primary)",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            padding: "3px 0 0",
                            display: "inline-block",
                          }}
                        >
                          {expandedCourses[course.id] ? "← Ringkas" : "Selengkapnya →"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="course-meta">
                      <span><Clock size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />{course.duration}</span>
                      <span><BarChart2 size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />{course.level}</span>
                      <span style={{ color: "var(--warning)" }}><Star size={12} style={{ marginRight: 4, verticalAlign: "middle", fill: "var(--warning)" }} />{course.rating}</span>
                    </div>
                    <div className="course-footer">
                      <span className="course-price">{course.priceLabel}</span>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {(getLearningType(course) === "online" || getLearningType(course) === "offline") && (
                          <div style={{ display: "flex", gap: 4 }}>
                            <a
                              href={makeCourseGoogleCalendarUrl(course)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary"
                              title="Tambah ke Google Calendar"
                              style={{ width: "auto", padding: "6px 8px", fontSize: "0.72rem", display: "inline-flex", alignItems: "center", textDecoration: "none" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Calendar size={13} style={{ color: "var(--primary)" }} />
                            </a>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              title="Unduh Jadwal (.ics) untuk Outlook/Apple Calendar"
                              style={{ width: "auto", padding: "6px 8px", fontSize: "0.72rem" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadCourseIcsFile(course);
                              }}
                            >
                              .ICS
                            </button>
                          </div>
                        )}
                        {isSubscribed ? (
                          <button
                            className="btn btn-primary"
                            onClick={() => handleOpenClass(course.id)}
                            style={{ width: "auto" }}
                            disabled={isLocked}
                          >
                            {isLocked ? <><Lock size={12} style={{ marginRight: 4 }} />Terkunci</> : "Buka Kelas"}
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary"
                            onClick={() => setShowSubscriptionModal(true)}
                            style={{ width: "auto", display: "flex", alignItems: "center", gap: 6 }}
                          >
                            <Zap size={13} /> Berlangganan
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Detail Profil Instruktur */}
      {instructorModal && (
        <div className="modal-overlay active" onClick={() => setInstructorModal(null)}>
          <div className="modal-content glass-panel" style={{ width: 560, maxWidth: "95%" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <img
                  src={instructorModal.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80"}
                  alt={instructorModal.name}
                  style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--primary)" }}
                />
                <div>
                  <h3 style={{ fontSize: "1.15rem", color: "var(--text-primary)", marginBottom: 4 }}>{instructorModal.name}</h3>
                  <div style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600 }}>{instructorModal.title || "Pengajar Ahli"}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{instructorModal.org || "Lembaga Pelatihan Terverifikasi"}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInstructorModal(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", marginBottom: 16, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Praktisi dan pengajar bersertifikasi nasional dengan pengalaman ekstensif dalam membimbing aparatur pemerintah dan profesional industri untuk mencapai standar kompetensi tertinggi.
            </div>

            <h4 style={{ fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: 12 }}>
              Program Pelatihan oleh {instructorModal.name}:
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 240, overflowY: "auto", marginBottom: 20 }}>
              {courses.filter(c => c.instructor && c.instructor.name === instructorModal.name).map(c => {
                const isEnrolled = enrolledCourses.includes(c.id);
                return (
                  <div key={c.id} className="glass-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{c.title}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 2 }}>{c.category} · {c.duration} · {c.level}</div>
                    </div>
                    {isSubscribed ? (
                      <button
                        className="btn btn-secondary"
                        style={{ width: "auto", padding: "4px 10px", fontSize: "0.75rem", height: "auto" }}
                        onClick={() => { setInstructorModal(null); handleOpenClass(c.id); }}
                      >
                        Buka Kelas
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary"
                        style={{ width: "auto", padding: "4px 10px", fontSize: "0.75rem", height: "auto", display: "flex", alignItems: "center", gap: 4 }}
                        onClick={() => { setInstructorModal(null); setShowSubscriptionModal(true); }}
                      >
                        <Zap size={11} /> Berlangganan
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: "auto", padding: "8px 16px" }}
                onClick={() => setInstructorModal(null)}
              >
                Tutup
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: "auto", padding: "8px 16px" }}
                onClick={() => {
                  setSelectedInstructor(instructorModal.name);
                  setActiveFilterTab("instructor");
                  setInstructorModal(null);
                }}
              >
                Filter Kelas Pengajar Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Modal Membership Langganan All-Access */}
      {showMembershipModal && (
        <div className="modal-overlay active">
          <div className="modal-content glass-panel" style={{ maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--primary-gradient)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                  <Crown size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Paket Langganan All-Access</h3>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>Akses tanpa batas ke seluruh kurikulum &amp; sertifikasi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMembershipModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                <X size={20} />
              </button>
            </div>

            {membershipSuccess ? (
              <div style={{ textAlign: "center", padding: "20px 12px" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(16,185,129,0.2)", color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Crown size={32} />
                </div>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "1.1rem" }}>🎉 Selamat! Membership Anda Telah Aktif</h4>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 380, margin: "0 auto 20px" }}>
                  Anda kini memiliki akses tanpa batas (*All-Access Pass*) ke seluruh katalog pelatihan, ujian kompetensi, dan webinar mingguan.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => { setMembershipSuccess(false); setShowMembershipModal(false); }}
                  style={{ width: "auto", padding: "8px 24px" }}>
                  Mulai Belajar Sekarang →
                </button>
              </div>
            ) : (
              <>
                {/* Plan Selector */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  {/* Monthly */}
                  <div
                    onClick={() => setSelectedMembershipPlan("monthly")}
                    style={{
                      border: `2px solid ${selectedMembershipPlan === "monthly" ? "var(--primary)" : "var(--border-color)"}`,
                      background: selectedMembershipPlan === "monthly" ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.02)",
                      borderRadius: 10, padding: 14, cursor: "pointer", transition: "all 0.2s ease", textAlign: "center"
                    }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>Bulanan</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 4 }}>
                      Rp {membershipSettings.monthlyPrice.toLocaleString("id-ID")}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>/ bulan (Fleksibel)</div>
                  </div>

                  {/* Annual */}
                  <div
                    onClick={() => setSelectedMembershipPlan("annual")}
                    style={{
                      border: `2px solid ${selectedMembershipPlan === "annual" ? "var(--primary)" : "var(--border-color)"}`,
                      background: selectedMembershipPlan === "annual" ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.02)",
                      borderRadius: 10, padding: 14, cursor: "pointer", transition: "all 0.2s ease", textAlign: "center", position: "relative"
                    }}>
                    {membershipSettings.annualBadge && (
                      <div style={{
                        position: "absolute", top: -8, right: 10, background: "var(--primary)", color: "#fff",
                        fontSize: "0.6rem", fontWeight: 800, padding: "2px 6px", borderRadius: 10
                      }}>
                        {membershipSettings.annualBadge}
                      </div>
                    )}
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--primary)" }}>Tahunan ⭐</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)", marginTop: 4 }}>
                      Rp {membershipSettings.annualPrice.toLocaleString("id-ID")}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>/ tahun (~Rp {Math.round(membershipSettings.annualPrice / 12 / 1000)}k/bln)</div>
                  </div>
                </div>

                {/* Benefits List */}
                <div className="glass-card" style={{ padding: 14, marginBottom: 16 }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, marginBottom: 10, color: "var(--text-primary)" }}>
                    Keuntungan &amp; Modul yang Termasuk dalam Langganan:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      "Akses PENUH ke SEMUA Modul: Pengadaan Barang/Jasa (PBJ), AI & IT, Data Analytics, Leadership, Keuangan, & Manajemen",
                      "Sertifikat Digital Resmi ber-QR Code untuk setiap kelas yang diselesaikan",
                      "Akses gratis ke seluruh sesi Webinar & Live Class mingguan",
                      "Prioritas tanya-jawab langsung dengan para Instruktur Ahli di Forum",
                      "Dapat dibatalkan kapan saja tanpa komitmen kontrak"
                    ].map((benefit, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                        <Check size={14} style={{ color: "#34d399", flexShrink: 0, marginTop: 2 }} />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowMembershipModal(false)}
                    style={{ flex: 1 }}>
                    Batal
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      const isAnnual = selectedMembershipPlan === "annual";
                      const finalPrice = isAnnual ? membershipSettings.annualPrice : membershipSettings.monthlyPrice;
                      const membershipItem = {
                        id: `membership-${selectedMembershipPlan}`,
                        title: `Paket Langganan All-Access (${isAnnual ? "Tahunan" : "Bulanan"})`,
                        badge: "ALL-ACCESS MEMBERSHIP",
                        price: finalPrice,
                        priceLabel: `Rp ${finalPrice.toLocaleString("id-ID")} / ${isAnnual ? "tahun" : "bulan"}`,
                        desc: "Akses tanpa batas ke seluruh program pelatihan, modul kurikulum, ujian akhir, dan sertifikat resmi."
                      };
                      setShowMembershipModal(false);
                      handleEnrollCourse(membershipItem);
                    }}
                    style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Zap size={14} /> Lanjut Pembayaran ({selectedMembershipPlan === "annual" ? `Rp ${(membershipSettings.annualPrice/1000).toFixed(0)}k/Thn` : `Rp ${(membershipSettings.monthlyPrice/1000).toFixed(0)}k/Bln`}) →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 🏢 Modal Pelatihan Tim & B2B Korporat */}
      {showCorporateModal && (
        <div className="modal-overlay active">
          <div className="modal-content glass-panel" style={{ maxWidth: 500, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60a5fa" }}>
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Paket Korporat &amp; Pelatihan Tim</h3>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>Tingkatkan kompetensi SDM instansi/perusahaan Anda</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCorporateModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                <X size={20} />
              </button>
            </div>

            {corporateSubmitted ? (
              <div style={{ textAlign: "center", padding: "24px 12px" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(16,185,129,0.2)", color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <CheckCircle size={32} />
                </div>
                <h4 style={{ margin: "0 0 8px 0" }}>Pengajuan Berhasil Dikirim!</h4>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 380, margin: "0 auto 20px" }}>
                  Terima kasih <strong>{corporateForm.picName || "Bpk/Ibu"}</strong>. Tim Account Manager B2B kami akan segera menghubungi Anda di <strong>{corporateForm.whatsapp || corporateForm.email}</strong> dalam 1x24 jam kerja untuk memberikan proposal penawaran khusus.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowCorporateModal(false)}
                  style={{ width: "auto", padding: "8px 24px" }}>
                  Selesai
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setCorporateSubmitted(true); }}>
                <div className="form-group">
                  <label>Nama Perusahaan / Instansi *</label>
                  <input
                    type="text"
                    required
                    value={corporateForm.company}
                    onChange={e => setCorporateForm({ ...corporateForm, company: e.target.value })}
                    placeholder="PT. Maju Bersama / Dinas Kominfo"
                    style={{ paddingLeft: 16 }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label>Nama PIC / Pemohon *</label>
                    <input
                      type="text"
                      required
                      value={corporateForm.picName}
                      onChange={e => setCorporateForm({ ...corporateForm, picName: e.target.value })}
                      placeholder="Nama Lengkap"
                      style={{ paddingLeft: 16 }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Perkiraan Jumlah Peserta (Seats) *</label>
                    <select
                      value={corporateForm.seats}
                      onChange={e => setCorporateForm({ ...corporateForm, seats: e.target.value })}
                      style={{ paddingLeft: 16 }}>
                      <option value="5">5 Seats (Diskon 15%)</option>
                      <option value="15">15 Seats (Diskon 25%)</option>
                      <option value="50">50 Seats (Diskon 40%)</option>
                      <option value="100+">100+ Seats (Enterprise Custom)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label>Email Perusahaan / Kantor *</label>
                    <input
                      type="email"
                      required
                      value={corporateForm.email}
                      onChange={e => setCorporateForm({ ...corporateForm, email: e.target.value })}
                      placeholder="pic@instansi.go.id"
                      style={{ paddingLeft: 16 }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Nomor WhatsApp PIC *</label>
                    <input
                      type="tel"
                      required
                      value={corporateForm.whatsapp}
                      onChange={e => setCorporateForm({ ...corporateForm, whatsapp: e.target.value })}
                      placeholder="0812xxxxxxxx"
                      style={{ paddingLeft: 16 }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCorporateModal(false)}
                    style={{ flex: 1 }}>
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <Users size={14} /> Kirim Pengajuan Lisensi Tim
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

