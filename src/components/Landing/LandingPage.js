"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  BookOpen,
  Search,
  Award,
  Sparkles,
  CheckCircle,
  Play,
  Clock,
  BarChart2,
  Users,
  ShieldCheck,
  Zap,
  Star,
  ChevronRight,
  ChevronDown,
  X,
  FileText,
  Video,
  HelpCircle,
  Layers,
  ArrowRight,
  Sun,
  Moon,
  GraduationCap,
  Briefcase,
  Building,
  Check,
  ExternalLink,
  Laptop,
  MapPin,
  Calendar,
  CreditCard,
  UserCheck,
  Gift,
  Tv
} from "lucide-react";

export default function LandingPage({ initialCourses, initialCategories, initialLevels }) {
  const router = useRouter();
  const { courses: appCourses, categories: appCategories, levels: appLevels, currentUser, theme, toggleTheme, platformSettings, enrolledCourses = [], isSubscribed } = useApp();

  const [courses, setCourses] = useState(() => {
    if (initialCourses && initialCourses.length > 0) return initialCourses;
    if (appCourses && appCourses.length > 0) return appCourses;
    return [];
  });

  // Sinkronkan selalu katalog live dari /api/catalog
  useEffect(() => {
    fetch("/api/catalog?limit=100", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.courses) && data.courses.length > 0) {
          setCourses(data.courses);
        }
      })
      .catch(() => {});
  }, []);

  // Update jika appCourses berubah di context (misal saat admin membuat/mengedit kursus)
  useEffect(() => {
    if (appCourses && appCourses.length > 0) {
      setCourses((prev) => {
        if (!prev || prev.length === 0) return appCourses;
        const map = new Map(appCourses.map((c) => [c.id, c]));
        prev.forEach((c) => {
          if (!map.has(c.id)) map.set(c.id, c);
        });
        return Array.from(map.values());
      });
    }
  }, [appCourses]);

  const distinctCategories = useMemo(() => {
    const list = [...(initialCategories || appCategories || [])];
    (courses || []).forEach((c) => {
      if (
        c.category &&
        !list.some(
          (x) =>
            x.key?.toLowerCase() === c.category.toLowerCase() ||
            x.name?.toLowerCase() === c.category.toLowerCase()
        )
      ) {
        list.push({ key: c.category, name: c.category });
      }
    });
    return list;
  }, [initialCategories, appCategories, courses]);

  const distinctLevels = useMemo(() => {
    const list = [...(initialLevels || appLevels || [])];
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
  }, [initialLevels, appLevels, courses]);

  const brandName = (platformSettings?.platform_name && !platformSettings.platform_name.includes("SDI") && platformSettings.platform_name !== "AI LMS")
    ? platformSettings.platform_name
    : "DIDIKARA";
  const brandLogo = platformSettings?.platform_logo || "/logos/didikara-symbol-redblue-2.jpg";
  const brandTagline = platformSettings?.platform_tagline || "Platform Pelatihan & Sertifikasi Profesional";

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLearningType, setSelectedLearningType] = useState("all"); // "all" | "self_learning" | "online" | "offline"
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");

  // Selected Course for Syllabus Modal
  const [selectedCourseModal, setSelectedCourseModal] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState("silabus"); // 'silabus' | 'paket' | 'overview' | 'instruktur'
  const [selectedModalTier, setSelectedModalTier] = useState("self_learning"); // 'self_learning' | 'online' | 'offline'

  // Interactive Demo Quiz State
  const [demoQuizAnswer, setDemoQuizAnswer] = useState(null);
  const [demoQuizSubmitted, setDemoQuizSubmitted] = useState(false);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    if (!courses || !Array.isArray(courses)) return [];
    return courses.filter((course) => {
      const matchType =
        selectedLearningType === "all" ||
        (course.learningType && course.learningType.toLowerCase() === selectedLearningType.toLowerCase());

      const matchCategory =
        selectedCategory === "all" ||
        course.category?.toLowerCase() === selectedCategory.toLowerCase() ||
        distinctCategories.some(
          (c) =>
            (c.key?.toLowerCase() === selectedCategory.toLowerCase() ||
              c.name?.toLowerCase() === selectedCategory.toLowerCase()) &&
            (c.key?.toLowerCase() === course.category?.toLowerCase() ||
              c.name?.toLowerCase() === course.category?.toLowerCase())
        );

      const matchLevel =
        selectedLevel === "all" ||
        course.level?.toLowerCase() === selectedLevel.toLowerCase() ||
        distinctLevels.some(
          (l) =>
            (l.key?.toLowerCase() === selectedLevel.toLowerCase() ||
              l.name?.toLowerCase() === selectedLevel.toLowerCase()) &&
            (l.key?.toLowerCase() === course.level?.toLowerCase() ||
              l.name?.toLowerCase() === course.level?.toLowerCase())
        );

      const matchQuery =
        !searchQuery ||
        course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.desc?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.instructor?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.venue?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.category?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchType && matchCategory && matchLevel && matchQuery;
    });
  }, [courses, selectedLearningType, selectedCategory, selectedLevel, searchQuery]);

  // Distinct Instructors List - diekstrak murni dari kursus di database
  const instructorsList = useMemo(() => {
    if (!courses || !Array.isArray(courses) || courses.length === 0) return [];
    const map = new Map();
    courses.forEach((c) => {
      const instName =
        typeof c.instructor === "object"
          ? c.instructor?.name
          : typeof c.instructor === "string"
          ? c.instructor
          : null;
      if (instName && !map.has(instName)) {
        const instObj =
          typeof c.instructor === "object"
            ? c.instructor
            : {
                name: instName,
                title: "Praktisi & Pengajar Ahli",
                org: "LMS Certified",
                avatar: instName.slice(0, 2).toUpperCase()
              };
        map.set(instName, {
          ...instObj,
          name: instName,
          title: instObj.title || "Praktisi & Pengajar Ahli",
          org: instObj.org || "LMS Certified",
          avatar: instObj.avatar || instName.slice(0, 2).toUpperCase(),
          bio:
            instObj.bio ||
            `Praktisi dan pengajar berpengalaman di bidang ${c.category || "Kompetensi Profesional"}.`,
          courseCount: courses.filter(
            (x) =>
              (typeof x.instructor === "object" ? x.instructor?.name : x.instructor) ===
              instName
          ).length,
          specialty: c.category || "Kompetensi Profesional",
          sampleCourse: c.title
        });
      }
    });
    return Array.from(map.values());
  }, [courses]);

  // Demo Quiz Data - diambil dinamis dari kursus database yang memiliki kuis
  const demoQuiz = useMemo(() => {
    for (const c of courses || []) {
      if (Array.isArray(c.quiz) && c.quiz.length > 0) {
        const q = c.quiz[0];
        if (q && q.q && Array.isArray(q.options) && typeof q.correct === "number") {
          return {
            courseTitle: c.title,
            question: q.q,
            options: q.options,
            correct: q.correct,
            explanation: `Materi evaluasi ini diambil langsung dari kurikulum kursus "${c.title}".`
          };
        }
      }
    }
    return null;
  }, [courses]);

  // Preview Course & Lessons untuk simulator LMS interaktif di landing page
  const previewCourse = useMemo(() => {
    return (
      courses?.find(
        (c) =>
          Array.isArray(c.modules) &&
          c.modules.length > 0 &&
          Array.isArray(c.modules[0].lessons) &&
          c.modules[0].lessons.length > 0
      ) || courses?.[0] || null
    );
  }, [courses]);

  const previewVideoEmbed = useMemo(() => {
    const lesson = previewCourse?.modules?.[0]?.lessons?.[0];
    if (!lesson?.url) return null;
    let url = lesson.url;
    if (url.includes("youtube.com/watch?v=")) {
      return url.replace("watch?v=", "embed/");
    }
    if (url.includes("youtu.be/")) {
      return url.replace("youtu.be/", "www.youtube.com/embed/");
    }
    return url;
  }, [previewCourse]);

  const previewLessons = useMemo(() => {
    const list = previewCourse?.modules?.[0]?.lessons || [];
    if (list.length > 0) {
      return list.slice(0, 4).map((l, i) => ({
        title: l.title || `Pelajaran ${i + 1}`,
        type: l.type || "video",
        dur: l.type === "video" ? "Video" : "Dokumen",
        active: i === 0
      }));
    }
    return [];
  }, [previewCourse]);

  const handleDemoQuizSelect = (index) => {
    setDemoQuizAnswer(index);
    setDemoQuizSubmitted(true);
  };

  const handleResetQuiz = () => {
    setDemoQuizAnswer(null);
    setDemoQuizSubmitted(false);
  };

  const calculateTotalLessons = (course) => {
    if (!course?.modules) return 0;
    return course.modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  };

  const getLearningTypeBadge = (type) => {
    switch (type) {
      case "self_learning":
        return {
          label: "Self-Learning (Belajar Mandiri)",
          bg: "rgba(16, 185, 129, 0.15)",
          border: "rgba(16, 185, 129, 0.35)",
          color: "#10b981",
          icon: <Gift size={13} />
        };
      case "online":
        return {
          label: "Online (Live Webinar)",
          bg: "rgba(59, 130, 246, 0.15)",
          border: "rgba(59, 130, 246, 0.35)",
          color: "#3b82f6",
          icon: <Tv size={13} />
        };
      case "offline":
        return {
          label: "Offline (Tatap Muka)",
          bg: "rgba(168, 85, 247, 0.15)",
          border: "rgba(168, 85, 247, 0.35)",
          color: "#a855f7",
          icon: <MapPin size={13} />
        };
      default:
        return {
          label: "Kursus Bersertifikat",
          bg: "var(--accent-badge-bg)",
          border: "var(--accent-badge-border)",
          color: "var(--text-accent)",
          icon: <Award size={13} />
        };
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>
      {/* ── NAVBAR ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          backgroundColor: "var(--bg-glass)",
          borderBottom: "1px solid var(--border-color)",
          transition: "all 0.2s ease"
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "0 24px",
            height: 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          {/* Logo & Platform Name */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            {brandLogo ? (
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#090d16",
                  border: "1px solid var(--border-color)",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                  flexShrink: 0
                }}
              >
                <img
                  src={brandLogo}
                  alt={brandName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "var(--primary-gradient)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  boxShadow: "var(--shadow-glow)",
                  flexShrink: 0
                }}
              >
                <Sparkles size={24} />
              </div>
            )}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "1.35rem",
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    color: "var(--text-primary)"
                  }}
                >
                  {brandName}
                </span>
                <span
                  style={{
                    fontSize: "0.68rem",
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "var(--accent-badge-bg)",
                    color: "var(--text-accent)",
                    fontWeight: 700,
                    border: "1px solid var(--accent-badge-border)"
                  }}
                >
                  NASIONAL
                </span>
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: -2 }}>
                {brandTagline}
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav
            style={{
              display: "none",
              alignItems: "center",
              gap: 26,
              fontSize: "0.9rem",
              fontWeight: 500,
              color: "var(--text-secondary)"
            }}
            className="desktop-nav"
          >
            <a
              href="#model-belajar"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById("model-belajar");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s" }}
              className="nav-link"
            >
              3 Model Belajar
            </a>
            <a
              href="#katalog"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById("katalog");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s" }}
              className="nav-link"
            >
              Katalog Kursus
            </a>
            <a
              href="#demo-materi"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById("demo-materi");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s" }}
              className="nav-link"
            >
              Simulasi Materi
            </a>
            <a
              href="#keunggulan"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById("keunggulan");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s" }}
              className="nav-link"
            >
              Keunggulan AI
            </a>
            <a
              href="#instruktur"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById("instruktur");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s" }}
              className="nav-link"
            >
              Instruktur
            </a>
            <a
              href="#kontak"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById("kontak");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s" }}
              className="nav-link"
            >
              Kontak Kami
            </a>
            <a
              href="#faq"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById("faq");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s" }}
              className="nav-link"
            >
              FAQ
            </a>
          </nav>

          {/* Actions & Theme & Login */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={toggleTheme}
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                border: "1px solid var(--border-color)",
                background: "var(--bg-card)",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              aria-label="Ganti Tema"
              title={theme === "dark" ? "Mode Terang" : "Mode Gelap"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {currentUser ? (
              <button
                onClick={() => router.push("/dashboard")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 16px",
                  borderRadius: 10,
                  background: "var(--primary-gradient)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "0.88rem",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-md)"
                }}
              >
                <span>Buka Dashboard</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => router.push("/dashboard")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-card)",
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    fontSize: "0.88rem",
                    cursor: "pointer"
                  }}
                >
                  Masuk
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 10,
                    background: "var(--primary-gradient)",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "0.88rem",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "var(--shadow-md)"
                  }}
                >
                  Mulai Belajar
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "64px 24px 76px 24px",
          borderBottom: "1px solid var(--border-color)",
          background: "radial-gradient(ellipse at 50% -20%, rgba(249, 115, 22, 0.18), transparent 70%)"
        }}
      >
        <div style={{ maxWidth: 1140, margin: "0 auto", textAlign: "center" }}>
          {/* Top Tag Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: 30,
              background: "var(--accent-badge-bg)",
              border: "1px solid var(--accent-badge-border)",
              color: "var(--text-accent)",
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: 22
            }}
          >
            <Sparkles size={16} />
            <span>Pilihan Lengkap: Self-Learning Mandiri • Online Live • Offline Workshop</span>
          </div>

          {/* Main Title */}
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3.3rem)",
              lineHeight: 1.16,
              fontWeight: 800,
              marginBottom: 20,
              color: "var(--text-primary)"
            }}
          >
            Pelatihan Kompetensi Terpadu dengan{" "}
            <span
              style={{
                background: "var(--primary-gradient)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}
            >
              3 Pilihan Model Pembelajaran
            </span>
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: "clamp(1rem, 2vw, 1.15rem)",
              lineHeight: 1.6,
              color: "var(--text-secondary)",
              maxWidth: 820,
              margin: "0 auto 36px auto"
            }}
          >
            Sesuaikan metode belajar Anda: mulai dari <strong>Self-Learning On-Demand (Belajar Mandiri)</strong>, <strong>Kelas Online Live Webinar Interaktif</strong>, hingga <strong>Workshop Tatap Muka (Offline)</strong>.
          </p>

          {/* Quick Selection Hero Badges */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
              maxWidth: 900,
              margin: "0 auto 40px auto"
            }}
          >
            <div
              onClick={() => {
                setSelectedLearningType("self_learning");
                const el = document.getElementById("katalog");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                padding: "16px 20px",
                borderRadius: 14,
                background: "var(--bg-card)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 14,
                transition: "all 0.2s"
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981", flexShrink: 0 }}>
                <Gift size={22} />
              </div>
              <div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#10b981" }}>1. Self-Learning</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Akses On-Demand 24/7 (Gratis &amp; Berbayar)</div>
              </div>
            </div>

            <div
              onClick={() => {
                setSelectedLearningType("online");
                const el = document.getElementById("katalog");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                padding: "16px 20px",
                borderRadius: 14,
                background: "var(--bg-card)",
                border: "1px solid rgba(59, 130, 246, 0.4)",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 14,
                transition: "all 0.2s"
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(59, 130, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6", flexShrink: 0 }}>
                <Tv size={22} />
              </div>
              <div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#3b82f6" }}>2. Online Class</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Live Webinar Zoom • Q&A Interaktif</div>
              </div>
            </div>

            <div
              onClick={() => {
                setSelectedLearningType("offline");
                const el = document.getElementById("katalog");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                padding: "16px 20px",
                borderRadius: 14,
                background: "var(--bg-card)",
                border: "1px solid rgba(168, 85, 247, 0.4)",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 14,
                transition: "all 0.2s"
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(168, 85, 247, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a855f7", flexShrink: 0 }}>
                <MapPin size={22} />
              </div>
              <div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#a855f7" }}>3. Offline Workshop</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Tatap Muka Interaktif • Request via Contact Us</div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div
            style={{
              maxWidth: 680,
              margin: "0 auto 36px auto",
              display: "flex",
              alignItems: "center",
              background: "var(--bg-card)",
              border: "1px solid var(--border-glow)",
              borderRadius: 14,
              padding: "6px 8px 6px 18px",
              boxShadow: "var(--shadow-lg)"
            }}
          >
            <Search size={20} color="var(--text-muted)" style={{ flexShrink: 0, marginRight: 10 }} />
            <input
              type="text"
              placeholder="Cari kursus gratis, webinar online, workshop tatap muka, topik PBJ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                outline: "none",
                color: "var(--text-primary)",
                fontSize: "0.95rem"
              }}
            />
            <a
              href="#katalog"
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                background: "var(--primary-gradient)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.9rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <span>Cari Kursus</span>
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ── 3 LEARNING DELIVERY MODELS & PROCESS EXPLANATION (#model-belajar) ── */}
      <section id="model-belajar" style={{ padding: "80px 24px", maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Struktur &amp; Proses Pembelajaran
          </div>
          <h2 style={{ fontSize: "2.2rem", fontWeight: 800, marginBottom: 12 }}>3 Model Pembelajaran di DIDIKARA</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.96rem", maxWidth: 700, margin: "0 auto" }}>
            Pilih metode belajar yang paling sesuai dengan kebutuhan kompetensi, preferensi, dan anggaran Anda.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 26 }}>
          {/* 1. Self-Learning Card */}
          <div
            style={{
              borderRadius: 20,
              padding: 30,
              background: "var(--bg-card)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "var(--shadow-lg)",
              position: "relative",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "#10b981" }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: 6, background: "rgba(16, 185, 129, 0.18)", color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                  <Gift size={13} />
                  <span>AKSES MEMBER</span>
                </span>
                <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "#10b981" }}>Akses Member</span>
              </div>

              <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 10 }}>Self-Learning (Mandiri)</h3>
              <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: 20 }}>
                Belajar mandiri fleksibel kapan saja tanpa batasan waktu melalui materi video on-demand, slide dokumen modul, dan kuis uji pemahaman otomatis.
              </p>

              {/* Fasilitas */}
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 10 }}>
                Fasilitas Termasuk:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                {[
                  "Akses materi video & slide PPT on-demand 24/7",
                  "Kuis evaluasi pemahaman dengan umpan balik instan",
                  "Progress belajar otomatis tersimpan di cloud",
                  "Sertifikat digital kelulusan terverifikasi"
                ].map((feat, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.83rem", color: "var(--text-secondary)" }}>
                    <CheckCircle size={15} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedLearningType("self_learning");
                const el = document.getElementById("katalog");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid #10b981",
                color: "#10b981",
                fontWeight: 700,
                fontSize: "0.88rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              <span>Jelajahi Akses Member</span>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* 2. Online Live Class Card */}
          <div
            style={{
              borderRadius: 20,
              padding: 30,
              background: "var(--bg-card)",
              border: "1px solid rgba(59, 130, 246, 0.35)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "var(--shadow-lg)",
              position: "relative",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "#3b82f6" }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: 6, background: "rgba(59, 130, 246, 0.18)", color: "#3b82f6", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                  <Tv size={13} />
                  <span>INTERAKTIF LIVE</span>
                </span>
                <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#3b82f6" }}>Berbayar</span>
              </div>

              <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 10 }}>Online (Live Webinar)</h3>
              <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: 20 }}>
                Pelatihan tatap muka virtual via Zoom/Meet dengan bimbingan langsung para instruktur/asesor, tanya jawab interaktif, tugas, dan rekaman sesi penuh.
              </p>

              {/* Fasilitas */}
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 10 }}>
                Fasilitas Termasuk:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                {[
                  "Sesi tatap muka langsung via Zoom / Google Meet",
                  "Sesi tanya jawab & konsultasi langsung dengan instruktur",
                  "Review tugas & portofolio kompetensi oleh pengajar",
                  "Rekaman video sesi live dapat diakses ulang seumur hidup",
                  "Sertifikat kompetensi resmi dengan QR Code verifikasi"
                ].map((feat, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.83rem", color: "var(--text-secondary)" }}>
                    <CheckCircle size={15} color="#3b82f6" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedLearningType("online");
                const el = document.getElementById("katalog");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                background: "rgba(59, 130, 246, 0.15)",
                border: "1px solid #3b82f6",
                color: "#3b82f6",
                fontWeight: 700,
                fontSize: "0.88rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              <span>Jelajahi Kelas Online</span>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* 3. Offline Workshop Card */}
          <div
            style={{
              borderRadius: 20,
              padding: 30,
              background: "var(--bg-card)",
              border: "1px solid rgba(168, 85, 247, 0.35)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "var(--shadow-lg)",
              position: "relative",
              overflow: "hidden"
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "#a855f7" }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: 6, background: "rgba(168, 85, 247, 0.18)", color: "#a855f7", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                  <MapPin size={13} />
                  <span>WORKSHOP TATAP MUKA</span>
                </span>
                <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "#a855f7" }}>Via Contact Us</span>
              </div>

              <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 10 }}>Offline (Tatap Muka)</h3>
              <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: 20 }}>
                Pelatihan tatap muka intensif dengan simulasi langsung, konsumsi lengkap, modul materi komprehensif, dan pendampingan pengajar ahli. Khusus kebutuhan pelatihan offline, silakan ajukan melalui Contact Us.
              </p>

              {/* Fasilitas */}
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 10 }}>
                Fasilitas Termasuk:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                {[
                  "Pelatihan tatap muka langsung di Hotel / Venue resmi",
                  "Seminar kit eksklusif, binder materi cetak & flashdisk",
                  "Makan siang prasmanan & 2x coffee break setiap hari",
                  "Bimbingan one-on-one & simulasi kasus kerja nyata",
                  "Sesi evaluasi dan uji pemahaman langsung bersama instruktur",
                  "Sertifikat Fisik Berlisensi & Sertifikat Digital Nasional"
                ].map((feat, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.83rem", color: "var(--text-secondary)" }}>
                    <CheckCircle size={15} color="#a855f7" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedLearningType("offline");
                const el = document.getElementById("katalog");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                background: "rgba(168, 85, 247, 0.15)",
                border: "1px solid #a855f7",
                color: "#a855f7",
                fontWeight: 700,
                fontSize: "0.88rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}
            >
              <span>Jelajahi Workshop Tatap Muka</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── COURSE CATALOG & MATERIALS SECTION (#katalog) ── */}
      <section
        id="katalog"
        style={{
          padding: "70px 24px",
          backgroundColor: "var(--bg-secondary)",
          borderTop: "1px solid var(--border-color)",
          borderBottom: "1px solid var(--border-color)"
        }}
      >
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          {/* Section Header */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                Katalog Materi & Pilihan Format
              </div>
              <h2 style={{ fontSize: "2rem", fontWeight: 800 }}>Daftar Kursus Berdasarkan Model Belajar</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginTop: 4 }}>
                Saring kursus berdasarkan format Self-Learning (Belajar Mandiri), Kelas Online Live, atau Workshop Tatap Muka.
              </p>
            </div>

            {/* Delivery Type Filter Buttons */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[
                { key: "all", label: "Semua Format", color: "var(--primary)" },
                { key: "self_learning", label: "🟢 Self-Learning (Belajar Mandiri)", color: "#10b981" },
                { key: "online", label: "🔵 Online (Live Webinar)", color: "#3b82f6" },
                { key: "offline", label: "🟣 Offline (Tatap Muka)", color: "#a855f7" }
              ].map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => setSelectedLearningType(btn.key)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 20,
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    border: "1px solid",
                    borderColor: selectedLearningType === btn.key ? btn.color : "var(--border-color)",
                    background: selectedLearningType === btn.key ? "var(--bg-card)" : "var(--bg-tertiary)",
                    color: selectedLearningType === btn.key ? btn.color : "var(--text-secondary)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    boxShadow: selectedLearningType === btn.key ? "var(--shadow-sm)" : "none"
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category & Level Sub-filters */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 28,
              padding: "14px 18px",
              borderRadius: 14,
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)"
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Topik:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "0.82rem",
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  <option value="all">Semua Topik</option>
                  {distinctCategories.map((cat) => (
                    <option key={cat.key || cat.name} value={cat.key || cat.name}>
                      {cat.name || cat.key}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Tingkat:</span>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "0.82rem",
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  <option value="all">Semua Level</option>
                  {distinctLevels.map((lvl) => (
                    <option key={lvl.key || lvl.name} value={lvl.key || lvl.name}>
                      {lvl.name || lvl.key}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Menampilkan <strong style={{ color: "var(--text-primary)" }}>{filteredCourses.length}</strong> kursus & modul tersedia
            </div>
          </div>

          {/* Courses Grid */}
          {filteredCourses.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                background: "var(--bg-card)",
                borderRadius: 16,
                border: "1px dashed var(--border-color)"
              }}
            >
              <BookOpen size={48} color="var(--text-muted)" style={{ margin: "0 auto 16px auto", opacity: 0.6 }} />
              <h4 style={{ fontSize: "1.1rem", marginBottom: 6 }}>Tidak ada kursus yang cocok</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 18 }}>
                Coba sesuaikan kata kunci atau filter model pembelajaran yang Anda pilih.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedLearningType("all");
                  setSelectedCategory("all");
                  setSelectedLevel("all");
                }}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  background: "var(--primary-gradient)",
                  color: "#fff",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: 24 }}>
              {filteredCourses.map((course) => {
                const totalLessons = calculateTotalLessons(course);
                const typeMeta = getLearningTypeBadge(course.learningType);
                const isFree = Number(course.price) === 0 || course.priceLabel?.toLowerCase().includes("gratis");

                return (
                  <div
                    key={course.id}
                    style={{
                      borderRadius: 18,
                      overflow: "hidden",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      flexDirection: "column",
                      boxShadow: "var(--shadow-md)",
                      transition: "transform 0.2s, box-shadow 0.2s"
                    }}
                  >
                    {/* Course Card Thumbnail */}
                    <div style={{ position: "relative", width: "100%", height: 190, overflow: "hidden", backgroundColor: "#0f172a" }}>
                      <img
                        src={course.image || "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80"}
                        alt={course.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s ease" }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.75) 100%)"
                        }}
                      />

                      {/* Learning Type Badge on Top Left */}
                      <div
                        style={{
                          position: "absolute",
                          top: 12,
                          left: 12,
                          padding: "4px 10px",
                          borderRadius: 6,
                          background: typeMeta.bg,
                          backdropFilter: "blur(8px)",
                          color: typeMeta.color,
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          border: `1px solid ${typeMeta.border}`,
                          display: "flex",
                          alignItems: "center",
                          gap: 5
                        }}
                      >
                        {typeMeta.icon}
                        <span>{course.typeLabel || typeMeta.label}</span>
                      </div>

                      {/* Level & Category */}
                      <div
                        style={{
                          position: "absolute",
                          bottom: 12,
                          left: 12,
                          right: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.74rem",
                            padding: "4px 9px",
                            borderRadius: 6,
                            background: "rgba(15, 23, 42, 0.9)",
                            color: "#ffffff",
                            fontWeight: 700,
                            border: "1px solid rgba(255, 255, 255, 0.3)",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.4)"
                          }}
                        >
                          {course.category}
                        </span>
                        <span
                          style={{
                            fontSize: "0.74rem",
                            padding: "4px 9px",
                            borderRadius: 6,
                            background: "var(--primary)",
                            color: "#ffffff",
                            fontWeight: 700,
                            boxShadow: "0 2px 6px rgba(0,0,0,0.4)"
                          }}
                        >
                          {course.level || "Semua Level"}
                        </span>
                      </div>
                    </div>

                    {/* Course Body */}
                    <div style={{ padding: "20px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
                      {/* Title */}
                      <h3
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 700,
                          lineHeight: 1.4,
                          marginBottom: 8,
                          color: "var(--text-primary)",
                          minHeight: 46
                        }}
                      >
                        {course.title}
                      </h3>

                      {/* Venue or Schedule Pill & Quota Badge */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 6,
                          fontSize: "0.78rem",
                          color: course.learningType === "offline" ? "#c084fc" : course.learningType === "online" ? "#60a5fa" : "#34d399",
                          marginBottom: 12,
                          fontWeight: 600
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                          {course.learningType === "offline" ? <MapPin size={13} /> : course.learningType === "online" ? <Calendar size={13} /> : <Zap size={13} />}
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {course.learningType === "offline"
                              ? (course.venue || "Hotel / Venue Pelatihan")
                              : course.learningType === "online"
                              ? (course.schedule || "Live Webinar Terjadwal")
                              : "Fleksibel Kapan Saja (Tanpa Jadwal)"}
                          </span>
                        </div>
                        {course.quota && (course.learningType === "online" || course.learningType === "offline") && (
                          <span style={{
                            flexShrink: 0,
                            fontSize: "0.7rem",
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: course.quota.toLowerCase().includes("sisa") ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                            color: course.quota.toLowerCase().includes("sisa") ? "#f87171" : "#34d399",
                            border: `1px solid ${course.quota.toLowerCase().includes("sisa") ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`
                          }}>
                            {course.quota}
                          </span>
                        )}
                      </div>

                      {/* Short description */}
                      <p
                        style={{
                          fontSize: "0.84rem",
                          color: "var(--text-secondary)",
                          lineHeight: 1.5,
                          marginBottom: 14,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden"
                        }}
                      >
                        {course.desc}
                      </p>

                      {/* Instructor Pill */}
                      {course.instructor && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 12px",
                            borderRadius: 10,
                            background: "var(--bg-tertiary)",
                            marginBottom: 14
                          }}
                        >
                          <img
                            src={course.instructor.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"}
                            alt={course.instructor.name}
                            style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
                          />
                          <div style={{ overflow: "hidden" }}>
                            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {course.instructor.name}
                            </div>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {course.instructor.org || course.instructor.title}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Material Meta */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, 1fr)",
                          gap: 6,
                          padding: "10px 0",
                          borderTop: "1px solid var(--border-color)",
                          borderBottom: "1px solid var(--border-color)",
                          marginBottom: 16,
                          fontSize: "0.76rem",
                          color: "var(--text-secondary)"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <Layers size={14} color="var(--primary)" />
                          <span>{course.modules?.length || 0} Modul</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <Video size={14} color="var(--info)" />
                          <span>{totalLessons} Sesi</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <Clock size={14} color="var(--warning)" />
                          <span>{course.duration || "20 Jam"}</span>
                        </div>
                      </div>

                      {/* Price & Action Buttons */}
                      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Biaya Belajar</div>
                          <div
                            style={{
                              fontSize: "0.95rem",
                              fontWeight: 800,
                              whiteSpace: "nowrap",
                              color: isFree ? "#10b981" : "var(--primary)"
                            }}
                          >
                            {isFree ? "Akses Member" : course.priceLabel || `Rp ${Number(course.price).toLocaleString("id-ID")}`}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => {
                              setSelectedCourseModal(course);
                              setActiveModalTab("silabus");
                              setSelectedModalTier(course.learningType || "self_learning");
                            }}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 8,
                              border: "1px solid var(--border-color)",
                              background: "var(--bg-tertiary)",
                              color: "var(--text-primary)",
                              fontSize: "0.76rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 5
                            }}
                          >
                            <FileText size={14} />
                            <span>Silabus</span>
                          </button>
                          {(course.learningType === "online" || course.learningType === "offline") ? (
                            <button
                              onClick={() => {
                                const el = document.getElementById("kontak");
                                if (el) el.scrollIntoView({ behavior: "smooth" });
                              }}
                              style={{
                                padding: "6px 11px",
                                borderRadius: 8,
                                background: course.learningType === "offline" ? "rgba(168, 85, 247, 0.15)" : "rgba(59, 130, 246, 0.15)",
                                color: course.learningType === "offline" ? "#a855f7" : "#3b82f6",
                                border: `1px solid ${course.learningType === "offline" ? "#a855f7" : "#3b82f6"}`,
                                fontSize: "0.76rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                              }}
                            >
                              <span>Hubungi Kami</span>
                              <ChevronRight size={14} />
                            </button>
                          ) : !isSubscribed ? (
                            <button
                              onClick={() => {
                                if (currentUser) {
                                  router.push("/marketplace");
                                } else {
                                  router.push(`/dashboard?redirect=${encodeURIComponent("/marketplace")}`);
                                }
                              }}
                              style={{
                                padding: "6px 11px",
                                borderRadius: 8,
                                background: "var(--primary-gradient)",
                                color: "#fff",
                                fontSize: "0.76rem",
                                fontWeight: 700,
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                boxShadow: "var(--shadow-sm)"
                              }}
                            >
                              <span>Akses Member</span>
                              <ChevronRight size={14} />
                            </button>
                          ) : (isFree || (enrolledCourses && enrolledCourses.includes(course.id))) ? (
                            <button
                              onClick={() => {
                                router.push(`/kelas?courseId=${course.id}`);
                              }}
                              style={{
                                padding: "6px 11px",
                                borderRadius: 8,
                                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                color: "#fff",
                                fontSize: "0.76rem",
                                fontWeight: 700,
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                boxShadow: "var(--shadow-sm)"
                              }}
                            >
                              <span>Buka Kelas</span>
                              <ChevronRight size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                router.push(`/kelas?courseId=${course.id}`);
                              }}
                              style={{
                                padding: "6px 11px",
                                borderRadius: 8,
                                background: "var(--primary-gradient)",
                                color: "#fff",
                                fontSize: "0.76rem",
                                fontWeight: 700,
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                boxShadow: "var(--shadow-sm)"
                              }}
                            >
                              <span>Beli Kelas</span>
                              <ChevronRight size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── INTERACTIVE LIVE LEARNING PREVIEW & DEMO (#demo-materi) ── */}
      <section id="demo-materi" style={{ padding: "80px 24px", maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--info)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Pengalaman Belajar Interaktif
          </div>
          <h2 style={{ fontSize: "2.1rem", fontWeight: 800, marginBottom: 12 }}>Pratinjau Materi &amp; Simulasi Ujian</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", maxWidth: 660, margin: "0 auto" }}>
            Rasakan langsung antarmuka pembelajaran di DIDIKARA: mulai dari pemutar materi video terstruktur, slide modul, hingga kuis uji pemahaman otomatis.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 30, alignItems: "stretch" }}>
          {/* Left: Video Player Mockup */}
          <div
            style={{
              borderRadius: 20,
              overflow: "hidden",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "var(--shadow-xl)"
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                background: "var(--bg-secondary)",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#eab308", display: "inline-block" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)", marginLeft: 8 }}>
                  {previewCourse?.modules?.[0]?.title || previewCourse?.title || "Materi Pelajaran Kursus"}
                </span>
              </div>
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  fontWeight: 700
                }}
              >
                LIVE PREVIEW
              </span>
            </div>

            <div style={{ position: "relative", width: "100%", height: 260, backgroundColor: "#000" }}>
              {previewVideoEmbed ? (
                <iframe
                  src={previewVideoEmbed}
                  title={previewCourse?.title || "Pratinjau Materi"}
                  style={{ width: "100%", height: "100%", border: "none" }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "0.9rem" }}>
                  Video materi akan dimuat di sini
                </div>
              )}
            </div>

            <div style={{ padding: "18px 20px", flex: 1, background: "var(--bg-card)" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 12 }}>
                Daftar Pelajaran Modul Terpilih
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {previewLessons.map((l, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: l.active ? "var(--accent-badge-bg)" : "var(--bg-tertiary)",
                      border: "1px solid",
                      borderColor: l.active ? "var(--accent-badge-border)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "0.84rem"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {l.type === "video" ? (
                        <Play size={15} color={l.active ? "var(--primary)" : "var(--text-muted)"} />
                      ) : (
                        <FileText size={15} color="var(--info)" />
                      )}
                      <span style={{ fontWeight: l.active ? 700 : 500, color: l.active ? "var(--text-accent)" : "var(--text-primary)" }}>
                        {l.title}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{l.dur}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Interactive Quiz Simulator */}
          {demoQuiz && (
            <div
              style={{
                borderRadius: 20,
                padding: 28,
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "var(--shadow-xl)"
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <HelpCircle size={20} color="var(--primary)" />
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase" }}>
                      Simulasi Kuis Kompetensi
                    </span>
                  </div>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Soal Latihan #1</span>
                </div>

                <h4 style={{ fontSize: "1.1rem", fontWeight: 700, lineHeight: 1.5, marginBottom: 20 }}>
                  {demoQuiz.question}
                </h4>

                {/* Options */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                  {demoQuiz.options.map((option, idx) => {
                    const isSelected = demoQuizAnswer === idx;
                    const isCorrect = idx === demoQuiz.correct;
                    let bg = "var(--bg-tertiary)";
                    let border = "1px solid var(--border-color)";
                    let color = "var(--text-primary)";

                    if (demoQuizSubmitted) {
                      if (isCorrect) {
                        bg = "rgba(16, 185, 129, 0.2)";
                        border = "1px solid #10b981";
                        color = "#10b981";
                      } else if (isSelected) {
                        bg = "rgba(239, 68, 68, 0.2)";
                        border = "1px solid #ef4444";
                        color = "#ef4444";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleDemoQuizSelect(idx)}
                        disabled={demoQuizSubmitted}
                        style={{
                          padding: "12px 16px",
                          borderRadius: 10,
                          background: bg,
                          border: border,
                          color: color,
                          textAlign: "left",
                          fontSize: "0.88rem",
                          fontWeight: isSelected ? 600 : 400,
                          cursor: demoQuizSubmitted ? "default" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "all 0.15s ease"
                        }}
                      >
                        <span>
                          <strong style={{ marginRight: 8 }}>{String.fromCharCode(65 + idx)}.</strong> {option}
                        </span>
                        {demoQuizSubmitted && isCorrect && <Check size={18} color="#10b981" />}
                        {demoQuizSubmitted && isSelected && !isCorrect && <X size={18} color="#ef4444" />}
                      </button>
                    );
                  })}
                </div>

                {/* Feedback box */}
                {demoQuizSubmitted && (
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      background: demoQuizAnswer === demoQuiz.correct ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                      border: `1px solid ${demoQuizAnswer === demoQuiz.correct ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                      fontSize: "0.84rem",
                      lineHeight: 1.5,
                      marginBottom: 16
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 4, color: demoQuizAnswer === demoQuiz.correct ? "#10b981" : "#ef4444" }}>
                      {demoQuizAnswer === demoQuiz.correct ? "🎉 Jawaban Benar!" : "❌ Kurang Tepat"}
                    </div>
                    <p style={{ color: "var(--text-secondary)", margin: 0 }}>{demoQuiz.explanation}</p>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTop: "1px solid var(--border-color)", flexWrap: "wrap", gap: 10 }}>
                {demoQuizSubmitted ? (
                  <button
                    onClick={handleResetQuiz}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--primary)",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    Coba Ulangi Soal
                  </button>
                ) : (
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Pilih salah satu jawaban di atas</span>
                )}

                <button
                  onClick={() => router.push("/dashboard")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: "var(--primary-gradient)",
                    color: "#fff",
                    border: "none",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <span>Akses Semua Ujian</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── KEY ADVANTAGES & AI FEATURES (#keunggulan) ── */}
      <section
        id="keunggulan"
        style={{
          padding: "80px 24px",
          backgroundColor: "var(--bg-secondary)",
          borderTop: "1px solid var(--border-color)",
          borderBottom: "1px solid var(--border-color)"
        }}
      >
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              Keunggulan Ekosistem DIDIKARA
            </div>
            <h2 style={{ fontSize: "2.1rem", fontWeight: 800 }}>Mengapa Belajar di Platform DIDIKARA?</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", maxWidth: 640, margin: "0 auto" }}>
              Dirancang untuk masyarakat umum, mahasiswa, dan profesional yang ingin meningkatkan keahlian serta daya saing secara fleksibel.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {[
              {
                icon: <Sparkles size={28} color="var(--primary)" />,
                title: "AI Adaptive Learning Path",
                desc: "Rekomendasi kurikulum dan materi belajar yang disesuaikan secara otomatis dengan profil jabatan dan gap kompetensi Anda."
              },
              {
                icon: <ShieldCheck size={28} color="var(--success)" />,
                title: "Sertifikat Terverifikasi QR",
                desc: "Sertifikat kelulusan digital dilengkapi cryptographic hash dan QR code publik yang dapat diverifikasi secara online kapan saja."
              },
              {
                icon: <Laptop size={28} color="var(--info)" />,
                title: "Multi-Format Multimedia",
                desc: "Materi video resolusi tinggi, modul PDF, presentasi PPT interaktif, dan bank soal latihan berkala."
              },
              {
                icon: <BarChart2 size={28} color="var(--warning)" />,
                title: "Radar Analitik Keterampilan",
                desc: "Pantau kemajuan skor keahlian Anda secara real-time pada 6 dimensi kompetensi kepemimpinan dan teknis."
              },
              {
                icon: <Building size={28} color="#a855f7" />,
                title: "Pelatihan Offline via Contact Us",
                desc: "Membutuhkan pelatihan tatap muka atau workshop khusus? Hubungi tim kami untuk konsultasi jadwal, materi, dan lokasi."
              },
              {
                icon: <Clock size={28} color="#ec4899" />,
                title: "Akses Belajar Fleksibel 24/7",
                desc: "Belajar mandiri kapan saja dari perangkat desktop, tablet, maupun ponsel dengan progress tersinkronisasi otomatis."
              }
            ].map((feat, i) => (
              <div
                key={i}
                style={{
                  padding: 26,
                  borderRadius: 16,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  transition: "transform 0.2s"
                }}
              >
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 14,
                    background: "var(--bg-tertiary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 18
                  }}
                >
                  {feat.icon}
                </div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: 10 }}>{feat.title}</h3>
                <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INSTRUCTORS SECTION (#instruktur) ── */}
      {instructorsList.length > 0 && (
        <section
          id="instruktur"
          style={{
            padding: "80px 24px",
            maxWidth: 1240,
            margin: "0 auto"
          }}
        >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Dewan Pengajar &amp; Praktisi
          </div>
          <h2 style={{ fontSize: "2.1rem", fontWeight: 800 }}>Instruktur &amp; Asesor Ahli DIDIKARA</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", maxWidth: 650, margin: "0 auto" }}>
            Pelajari keahlian nyata langsung dari para praktisi senior, konsultan ahli kementerian, dan asesor tersertifikasi di bidangnya.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
          {instructorsList.map((inst, idx) => (
            <div
              key={idx}
              style={{
                borderRadius: 18,
                padding: "26px 22px",
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                position: "relative",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}
            >
              {/* Avatar Photo or Initial Circle */}
              {inst.avatar && (inst.avatar.startsWith("http") || inst.avatar.startsWith("/")) ? (
                <img
                  src={inst.avatar}
                  alt={inst.name}
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: "50%",
                    objectFit: "cover",
                    marginBottom: 16,
                    border: "2.5px solid var(--primary)",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.15)"
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: "50%",
                    background: "var(--primary-gradient)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    marginBottom: 16,
                    boxShadow: "0 4px 14px rgba(249, 115, 22, 0.25)"
                  }}
                >
                  {typeof inst.avatar === "string" && !inst.avatar.startsWith("http") && !inst.avatar.startsWith("/") && inst.avatar.length <= 4
                    ? inst.avatar
                    : inst.name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()}
                </div>
              )}

              {/* Name & Credentials */}
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 4, lineHeight: 1.35 }}>
                {inst.name}
              </h3>
              
              {/* Title & Organization */}
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--primary)", marginBottom: 4 }}>
                {inst.title}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 16 }}>
                {inst.org || "Asesor & Praktisi Senior"}
              </div>

              {/* Badges / Rating */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "6px 14px", borderRadius: 20, background: "var(--bg-tertiary)", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#f59e0b", fontWeight: 700 }}>
                  <Star size={13} fill="#f59e0b" /> 4.9
                </span>
                <span>•</span>
                <span>{inst.courseCount || 1} Pelatihan</span>
              </div>

              {/* Bio */}
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 20, flex: 1 }}>
                {inst.bio}
              </p>

              {/* Action Button */}
              <button
                onClick={() => {
                  setSearchQuery(inst.name);
                  const el = document.getElementById("katalog");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                style={{
                  width: "100%",
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6
                }}
              >
                <span>Lihat Kelas Pelatihan</span>
                <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* ── CONTACT US & OFFLINE TRAINING REQUEST SECTION (#kontak) ── */}
      <section id="kontak" style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#a855f7", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Layanan Terbuka untuk Umum
          </div>
          <h2 style={{ fontSize: "2.1rem", fontWeight: 800, marginBottom: 10 }}>Hubungi Kami &amp; Permintaan Pelatihan Offline</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", maxWidth: 680, margin: "0 auto" }}>
            Platform LMS DIDIKARA terbuka untuk seluruh masyarakat dan pembelajar umum. Apabila Anda atau komunitas Anda memerlukan pelatihan tatap muka (offline workshop) atau pendampingan materi khusus, silakan hubungi tim representatif kami.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, alignItems: "stretch" }}>
          {/* Card Info Kontak Langsung */}
          <div className="glass-card" style={{ padding: 28, borderRadius: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(168, 85, 247, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a855f7" }}>
                  <MapPin size={20} />
                </span>
                <span>Konsultasi Pelatihan</span>
              </h3>
              <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>
                Pelatihan tatap muka dapat diselenggarakan secara fleksibel sesuai kota, jadwal, dan kurikulum yang Anda butuhkan dengan pengajar ahli berpengalaman.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(37, 211, 102, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#25D366" }}>
                    💬
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>WhatsApp Resmi</div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>+62 812-3456-7890</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(59, 130, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#60a5fa" }}>
                    ✉️
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Email Layanan</div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>kontak@didikara.com</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(249, 115, 22, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fb923c" }}>
                    🕒
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Jam Operasional</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Senin – Jumat (09:00 – 17:00 WIB)</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--border-color)" }}>
              <a
                href="https://wa.me/6281234567890?text=Halo%20DIDIKARA,%20saya%20ingin%20konsultasi%20mengenai%20permintaan%20pelatihan%20offline%20tatap%20muka"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ width: "100%", padding: "12px", background: "#25D366", borderColor: "#25D366", color: "#fff", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 10 }}
              >
                <span>💬 Chat WhatsApp Sekarang</span>
              </a>
            </div>
          </div>

          {/* Form Permintaan Offline */}
          <div className="glass-card" style={{ padding: 28, borderRadius: 16 }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: 8 }}>Formulir Permintaan Offline</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 18 }}>
              Kirimkan rincian kebutuhan pelatihan Anda, tim kami akan segera merespons dengan jadwal dan proposal silabus.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              alert("Terima kasih! Permintaan pelatihan offline Anda telah kami terima. Tim kami akan segera menghubungi Anda.");
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "0.78rem" }}>Nama Lengkap *</label>
                  <input type="text" required placeholder="Nama Anda" style={{ padding: "8px 12px", fontSize: "0.82rem", borderRadius: 8 }} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "0.78rem" }}>Nomor WhatsApp *</label>
                  <input type="tel" required placeholder="0812xxxxxxxx" style={{ padding: "8px 12px", fontSize: "0.82rem", borderRadius: 8 }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "0.78rem" }}>Email *</label>
                  <input type="email" required placeholder="email@domain.com" style={{ padding: "8px 12px", fontSize: "0.82rem", borderRadius: 8 }} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: "0.78rem" }}>Rencana Kota / Lokasi *</label>
                  <input type="text" required placeholder="Contoh: Jakarta / Bandung" style={{ padding: "8px 12px", fontSize: "0.82rem", borderRadius: 8 }} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label style={{ fontSize: "0.78rem" }}>Topik / Pelatihan yang Diminati *</label>
                <input type="text" required placeholder="Contoh: Budget Operation, Data Analysis, dll." style={{ padding: "8px 12px", fontSize: "0.82rem", borderRadius: 8 }} />
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ fontSize: "0.78rem" }}>Catatan Tambahan (Estimasi Peserta / Waktu)</label>
                <textarea rows={2} placeholder="Sebutkan perkiraan peserta atau jadwal yang diharapkan..." style={{ width: "100%", padding: "8px 12px", fontSize: "0.82rem", borderRadius: 8, resize: "vertical" }} />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "11px", fontWeight: 700, borderRadius: 10 }}>
                Kirim Permintaan Pelatihan Offline
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── FAQ SECTION (#faq) ── */}
      <section id="faq" style={{ padding: "80px 24px", maxWidth: 860, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Bantuan & FAQ
          </div>
          <h2 style={{ fontSize: "2rem", fontWeight: 800 }}>Pertanyaan Mengenai Model Pembelajaran</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            {
              q: "Apa perbedaan utama antara Self-Learning, Online, dan Offline?",
              a: "Self-Learning adalah materi mandiri on-demand yang dapat diakses fleksibel kapan saja (tersedia gratis maupun berbayar). Online adalah kelas webinar live terjadwal dengan interaksi tanya jawab langsung dan tugas review. Offline adalah workshop tatap muka intensif di hotel bintang 5 dengan konsumsi, modul cetak, dan uji kompetensi asesor BNSP langsung di lokasi."
            },
            {
              q: "Bagaimana proses pendaftaran untuk kursus Self-Learning?",
              a: "Sangat mudah! Untuk kelas gratis, Anda cukup klik 'Mulai Belajar' dan kelas langsung aktif. Untuk kelas berbayar, Anda dapat memilih metode pembayaran instan seperti QRIS atau Virtual Account."
            },
            {
              q: "Apakah peserta Online Class tetap mendapatkan rekaman jika berhalangan hadir?",
              a: "Ya. Seluruh sesi live webinar akan direkam secara otomatis dalam kualitas HD dan dapat diakses ulang seumur hidup melalui portal kelas Anda."
            },
            {
              q: "Bagaimana cara mengajukan permintaan Pelatihan Offline (Tatap Muka)?",
              a: "Bagi Anda atau kelompok yang membutuhkan pelatihan offline (tatap muka), Anda dapat mengajukan permintaan langsung melalui Contact Us atau WhatsApp kami. Tim kami akan mendiskusikan ketersediaan pengajar ahli, kurikulum, serta lokasi pelatihan yang diinginkan."
            }
          ].map((item, i) => (
            <div
              key={i}
              style={{
                borderRadius: 14,
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                overflow: "hidden"
              }}
            >
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === i ? -1 : i)}
                style={{
                  width: "100%",
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "none",
                  border: "none",
                  color: "var(--text-primary)",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  textAlign: "left",
                  cursor: "pointer"
                }}
              >
                <span>{item.q}</span>
                <ChevronDown
                  size={18}
                  style={{
                    transform: openFaqIndex === i ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                    flexShrink: 0,
                    marginLeft: 12
                  }}
                />
              </button>
              {openFaqIndex === i && (
                <div
                  style={{
                    padding: "0 20px 18px 20px",
                    fontSize: "0.88rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                    borderTop: "1px solid var(--border-color)",
                    paddingTop: 14
                  }}
                >
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        style={{
          borderTop: "1px solid var(--border-color)",
          backgroundColor: "var(--bg-secondary)",
          padding: "50px 24px 30px 24px",
          fontSize: "0.85rem",
          color: "var(--text-secondary)"
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 36,
            marginBottom: 40
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              {brandLogo ? (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#090d16",
                    border: "1px solid var(--border-color)",
                    flexShrink: 0
                  }}
                >
                  <img
                    src={brandLogo}
                    alt={brandName}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "var(--primary-gradient)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff"
                  }}
                >
                  <Sparkles size={18} />
                </div>
              )}
              <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)" }}>
                {brandName}
              </span>
            </div>
            <p style={{ lineHeight: 1.6, fontSize: "0.82rem", color: "var(--text-muted)" }}>
              {brandTagline}
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>Model Belajar</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.82rem" }}>
              <a href="#katalog" onClick={() => setSelectedLearningType("self_learning")} style={{ color: "inherit", textDecoration: "none" }}>
                🟢 Self-Learning (Belajar Mandiri)
              </a>
              <a href="#katalog" onClick={() => setSelectedLearningType("online")} style={{ color: "inherit", textDecoration: "none" }}>
                🔵 Online Class (Live Webinar)
              </a>
              <a href="#katalog" onClick={() => setSelectedLearningType("offline")} style={{ color: "inherit", textDecoration: "none" }}>
                🟣 Offline Workshop (Tatap Muka)
              </a>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>Akses Pengguna</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.82rem" }}>
              <Link href="/dashboard" style={{ color: "inherit", textDecoration: "none" }}>Login Peserta Mandiri</Link>
              <a href="#kontak" onClick={(e) => { e.preventDefault(); const el = document.getElementById("kontak"); if (el) el.scrollIntoView({ behavior: "smooth" }); }} style={{ color: "inherit", textDecoration: "none" }}>Hubungi Kami (Contact Us)</a>
              <Link href="/dashboard" style={{ color: "inherit", textDecoration: "none" }}>Portal Instruktur & Asesor</Link>
            </div>
          </div>
        </div>

        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            paddingTop: 24,
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            fontSize: "0.78rem",
            color: "var(--text-muted)"
          }}
        >
          <div>&copy; 2026 DIDIKARA Platform Nasional. Hak Cipta Dilindungi Undang-Undang.</div>
          <div style={{ display: "flex", gap: 16 }}>
            <Link href="/legal/syarat-ketentuan" style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s ease" }}>
              Ketentuan Layanan
            </Link>
            <Link href="/legal/privasi" style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s ease" }}>
              Kebijakan Privasi
            </Link>
            <span>Standar Akreditasi BNSP</span>
          </div>
        </div>
      </footer>

      {/* ── COURSE SYLLABUS & PACKAGE COMPARISON MODAL ── */}
      {selectedCourseModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            backgroundColor: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 820,
              maxHeight: "90vh",
              borderRadius: 20,
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "var(--shadow-xl)"
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: "var(--accent-badge-bg)",
                      color: "var(--text-accent)",
                      fontWeight: 700
                    }}
                  >
                    {selectedCourseModal.category}
                  </span>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: "var(--bg-tertiary)",
                      color: "var(--text-primary)",
                      fontWeight: 600
                    }}
                  >
                    {selectedCourseModal.typeLabel || "Kursus Pilihan"}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>• {selectedCourseModal.duration || "20 Jam"}</span>
                </div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  {selectedCourseModal.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCourseModal(null)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer"
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div style={{ display: "flex", padding: "0 24px", borderBottom: "1px solid var(--border-color)", gap: 16, overflowX: "auto" }}>
              {[
                { key: "silabus", label: "Silabus & Rincian Modul", icon: <Layers size={14} /> },
                { key: "paket", label: "Pilihan 3 Model Belajar", icon: <CreditCard size={14} /> },
                { key: "overview", label: "Capaian Belajar", icon: <FileText size={14} /> },
                { key: "instruktur", label: "Profil Pengajar", icon: <GraduationCap size={14} /> }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveModalTab(tab.key)}
                  style={{
                    padding: "12px 6px",
                    background: "none",
                    border: "none",
                    borderBottom: activeModalTab === tab.key ? "2px solid var(--primary)" : "2px solid transparent",
                    color: activeModalTab === tab.key ? "var(--primary)" : "var(--text-secondary)",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap"
                  }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Modal Body (Scrollable) */}
            <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
              {activeModalTab === "silabus" && (
                <div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 16 }}>
                    Struktur materi terdiri dari <strong>{selectedCourseModal.modules?.length || 0} modul</strong> dan <strong>{calculateTotalLessons(selectedCourseModal)} sesi pembelajaran</strong>.
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {(selectedCourseModal.modules || []).map((module, mIdx) => (
                      <div
                        key={mIdx}
                        style={{
                          borderRadius: 12,
                          background: "var(--bg-card)",
                          border: "1px solid var(--border-color)",
                          padding: 16
                        }}
                      >
                        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 6,
                              background: "var(--accent-badge-bg)",
                              color: "var(--text-accent)",
                              fontSize: "0.75rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800
                            }}
                          >
                            {mIdx + 1}
                          </span>
                          <span>{module.title}</span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 32 }}>
                          {(module.lessons || []).map((lesson, lIdx) => (
                            <div
                              key={lIdx}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "8px 12px",
                                borderRadius: 8,
                                background: "var(--bg-tertiary)",
                                fontSize: "0.82rem"
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                {lesson.type === "video" ? (
                                  <Video size={14} color="var(--primary)" />
                                ) : (
                                  <FileText size={14} color="var(--info)" />
                                )}
                                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{lesson.title}</span>
                              </div>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                                {lesson.type}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeModalTab === "paket" && (
                <div>
                  <div style={{ fontSize: "0.84rem", color: "var(--text-secondary)", marginBottom: 16 }}>
                    Pilih model pembelajaran yang paling sesuai untuk kursus ini:
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
                    {/* Option 1: Self Learning */}
                    <div
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedModalTier("self_learning"); } }}
                      onClick={() => setSelectedModalTier("self_learning")}
                      style={{
                        padding: 16,
                        borderRadius: 14,
                        background: selectedModalTier === "self_learning" ? "rgba(16, 185, 129, 0.12)" : "var(--bg-card)",
                        border: `2px solid ${selectedModalTier === "self_learning" ? "#10b981" : "var(--border-color)"}`,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between"
                      }}
                    >
                      <div>
                        <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: 4, background: "rgba(16, 185, 129, 0.2)", color: "#10b981", fontWeight: 700 }}>
                          {Number(selectedCourseModal?.price) === 0 ? "AKSES MEMBER" : "ON-DEMAND"}
                        </span>
                        <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "8px 0 4px 0" }}>Self-Learning</h4>
                        <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#10b981", marginBottom: 10 }}>
                          {Number(selectedCourseModal?.price) === 0 ? "Akses Member" : (selectedCourseModal?.priceLabel || `Rp ${Number(selectedCourseModal?.price || 0).toLocaleString("id-ID")}`)}
                        </div>
                        <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                          Akses on-demand video & materi mandiri 24/7 (hanya lihat video, tanpa perlu pilih jadwal), kuis pemahaman, dan sertifikat partisipasi digital.
                        </p>
                      </div>
                      <div style={{ marginTop: 12, fontSize: "0.74rem", fontWeight: 700, color: "#10b981" }}>
                        {selectedModalTier === "self_learning" ? "✓ Dipilih" : "Pilih Paket Ini"}
                      </div>
                    </div>

                    {/* Option 2: Online Live */}
                    <div
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedModalTier("online"); } }}
                      onClick={() => setSelectedModalTier("online")}
                      style={{
                        padding: 16,
                        borderRadius: 14,
                        background: selectedModalTier === "online" ? "rgba(59, 130, 246, 0.12)" : "var(--bg-card)",
                        border: `2px solid ${selectedModalTier === "online" ? "#3b82f6" : "var(--border-color)"}`,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between"
                      }}
                    >
                      <div>
                        <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: 4, background: "rgba(59, 130, 246, 0.2)", color: "#3b82f6", fontWeight: 700 }}>
                          LIVE WEBINAR
                        </span>
                        <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "8px 0 4px 0" }}>Online Live</h4>
                        <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#3b82f6", marginBottom: 10 }}>
                          {selectedCourseModal.learningType === "online" ? selectedCourseModal.priceLabel : "Rp 1.250.000"}
                        </div>
                        <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                          Sesi interaktif Zoom, Q&A langsung dengan pengajar, review portofolio, dan rekaman kelas.
                        </p>
                      </div>
                      <div style={{ marginTop: 12, fontSize: "0.74rem", fontWeight: 700, color: "#3b82f6" }}>
                        {selectedModalTier === "online" ? "✓ Dipilih" : "Pilih Paket Ini"}
                      </div>
                    </div>

                    {/* Option 3: Offline Workshop */}
                    <div
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedModalTier("offline"); } }}
                      onClick={() => setSelectedModalTier("offline")}
                      style={{
                        padding: 16,
                        borderRadius: 14,
                        background: selectedModalTier === "offline" ? "rgba(168, 85, 247, 0.12)" : "var(--bg-card)",
                        border: `2px solid ${selectedModalTier === "offline" ? "#a855f7" : "var(--border-color)"}`,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between"
                      }}
                    >
                      <div>
                        <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: 4, background: "rgba(168, 85, 247, 0.2)", color: "#a855f7", fontWeight: 700 }}>
                          TATAP MUKA
                        </span>
                        <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: "8px 0 4px 0" }}>Offline Workshop</h4>
                        <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#a855f7", marginBottom: 10 }}>
                          {selectedCourseModal.learningType === "offline" ? selectedCourseModal.priceLabel : "Rp 3.500.000"}
                        </div>
                        <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                          Tatap muka di hotel bintang 5, konsumsi & seminar kit, bimbingan 1-on-1, dan uji asesor BNSP di tempat.
                        </p>
                      </div>
                      <div style={{ marginTop: 12, fontSize: "0.74rem", fontWeight: 700, color: "#a855f7" }}>
                        {selectedModalTier === "offline" ? "✓ Dipilih" : "Pilih Paket Ini"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeModalTab === "overview" && (
                <div>
                  <h4 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 8 }}>Deskripsi Lengkap Kursus</h4>
                  <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>
                    {selectedCourseModal.desc}
                  </p>

                  <h4 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 10 }}>Fasilitas yang Didapatkan</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(selectedCourseModal.features || [
                      "Akses materi dan pembaruan kurikulum",
                      "Uji pemahaman dan bank soal latihan",
                      "Sertifikat digital terverifikasi QR Code"
                    ]).map((feat, bIdx) => (
                      <div key={bIdx} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.84rem", color: "var(--text-secondary)" }}>
                        <CheckCircle size={16} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeModalTab === "instruktur" && (() => {
                const rawInst = selectedCourseModal.instructor;
                const inst = typeof rawInst === "object" && rawInst !== null
                  ? rawInst
                  : { name: rawInst || "Instruktur & Asesor", title: "Praktisi Senior & Asesor", org: "Lembaga Sertifikasi Nasional", avatar: (rawInst || "IA").slice(0, 2).toUpperCase() };
                const isAvatarImg = Boolean(inst.avatar && (inst.avatar.startsWith("http") || inst.avatar.startsWith("/")));

                return (
                  <div>
                    {inst.name ? (
                      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
                        {isAvatarImg ? (
                          <img
                            src={inst.avatar}
                            alt={inst.name}
                            style={{ width: 84, height: 84, borderRadius: 16, objectFit: "cover", border: "2px solid var(--primary)" }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 84,
                              height: 84,
                              borderRadius: 16,
                              background: "var(--primary-gradient)",
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "1.6rem",
                              fontWeight: 800,
                              flexShrink: 0,
                              boxShadow: "0 4px 14px rgba(249, 115, 22, 0.25)"
                            }}
                          >
                            {inst.avatar || inst.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 220 }}>
                          <h4 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: 4, color: "var(--text-primary)" }}>
                            {inst.name}
                          </h4>
                          <div style={{ fontSize: "0.86rem", color: "var(--primary)", fontWeight: 600, marginBottom: 4 }}>
                            {inst.title || "Praktisi Senior & Asesor"}
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 12 }}>
                            {inst.org || "Lembaga Pelatihan & Sertifikasi"}
                          </div>
                          <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                            {inst.bio || "Praktisi dan asesor yang telah membimbing ribuan peserta dalam sertifikasi nasional dan transformasi proses bisnis instansi pemerintah & korporat."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Informasi instruktur segera diperbarui.</div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--bg-card)"
              }}
            >
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Paket Terpilih ({selectedModalTier === "self_learning" ? "Self-Learning" : selectedModalTier === "online" ? "Online Live" : "Offline Workshop"})
                </div>
                <div
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    color: selectedModalTier === "self_learning" ? "#10b981" : "var(--primary)"
                  }}
                >
                  {selectedModalTier === "self_learning"
                    ? (Number(selectedCourseModal.price) === 0 ? "Akses Member" : (selectedCourseModal.priceLabel || `Rp ${Number(selectedCourseModal.price).toLocaleString("id-ID")}`))
                    : selectedModalTier === "online"
                    ? (selectedCourseModal.learningType === "online" ? (selectedCourseModal.priceLabel || `Rp ${Number(selectedCourseModal.price).toLocaleString("id-ID")}`) : "Rp 1.250.000")
                    : (selectedCourseModal.learningType === "offline" ? (selectedCourseModal.priceLabel || `Rp ${Number(selectedCourseModal.price).toLocaleString("id-ID")}`) : "Rp 3.500.000")}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setSelectedCourseModal(null)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: "1px solid var(--border-color)",
                    background: "transparent",
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    if (selectedModalTier === "offline" || selectedModalTier === "online") {
                      setSelectedCourseModal(null);
                      const el = document.getElementById("kontak");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                      return;
                    }
                    const targetId = selectedCourseModal?.id;
                    setSelectedCourseModal(null);
                    if (!isSubscribed) {
                      if (currentUser) {
                        router.push("/marketplace");
                      } else {
                        router.push(`/dashboard?redirect=${encodeURIComponent("/marketplace")}`);
                      }
                      return;
                    }
                    router.push(targetId ? `/kelas?courseId=${targetId}` : "/kelas");
                  }}
                  style={{
                    padding: "10px 22px",
                    borderRadius: 10,
                    background: (selectedModalTier === "self_learning" && (Number(selectedCourseModal?.price) === 0 || (enrolledCourses && enrolledCourses.includes(selectedCourseModal?.id)))) ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "var(--primary-gradient)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "var(--shadow-md)"
                  }}
                >
                  <span>
                    {(selectedModalTier === "offline" || selectedModalTier === "online")
                      ? "Hubungi Kami (Contact Us)"
                      : !isSubscribed
                      ? "Aktivasi Akses Member"
                      : (Number(selectedCourseModal?.price) === 0 || (enrolledCourses && enrolledCourses.includes(selectedCourseModal?.id)))
                      ? "Buka Ruang Kelas"
                      : "Beli Kelas Sekarang"}
                  </span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
