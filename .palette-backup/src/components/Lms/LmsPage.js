"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { PlayCircle, Play, Pause, CheckCircle, UploadCloud, MapPin, LogOut, Film, MonitorPlay, Lock, Clock, History, X, Megaphone, Send, Trash2, MessageCircle, Video, Bot, Zap, Calendar, Star, ShoppingCart, ShoppingBag, Download } from "lucide-react";
import { useApp } from "@/context/AppContext";
import VideoPlayerV2 from "./VideoPlayerV2";

// ── Helper: format detik jadi MM:SS ────────────────────────────────────────────
function formatCountdown(totalSec) {
  const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── Video Player ───────────────────────────────────────────────────────────────
function VideoPlayer({ activeLesson, videoPlaying, videoProgress, videoTime, setVideoPlaying, setVideoProgress }) {
  const getYouTubeId = (url) => { const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?#]+)/); return m ? m[1] : null; };
  const getVimeoId   = (url) => { const m = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/); return m ? m[1] : null; };
  const lessonTitle  = activeLesson?.title || "Materi Kelas";
  const lessonType   = activeLesson?.type  || "text";
  const lessonUrl    = activeLesson?.url   || "";

  if (lessonType === "video" && lessonUrl) {
    const ytId    = getYouTubeId(lessonUrl);
    const vimeoId = getVimeoId(lessonUrl);
    if (ytId)    return <iframe src={`https://www.youtube.com/embed/${ytId}?rel=0`}    title={lessonTitle} style={{ width: "100%", aspectRatio: "16/9", border: "none", borderRadius: 12, background: "#000" }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
    if (vimeoId) return <iframe src={`https://player.vimeo.com/video/${vimeoId}`}      title={lessonTitle} style={{ width: "100%", aspectRatio: "16/9", border: "none", borderRadius: 12, background: "#000" }} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
    return <video src={lessonUrl} controls style={{ width: "100%", aspectRatio: "16/9", borderRadius: 12, background: "#000" }} title={lessonTitle} />;
  }

  if (lessonType === "pptx" && lessonUrl) {
    const isGoogleSlides = lessonUrl.includes("docs.google.com/presentation");
    const isPdf          = lessonUrl.toLowerCase().endsWith(".pdf");
    const embedUrl = (!isGoogleSlides && !isPdf)
      ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(lessonUrl)}`
      : lessonUrl;
    return <iframe src={embedUrl} title={lessonTitle} style={{ width: "100%", aspectRatio: "16/9", border: "none", borderRadius: 12, background: "#1a1a2e" }} allowFullScreen />;
  }

  return (
    <div className="video-mock">
      <PlayCircle size={48} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
      <h4>{lessonTitle}</h4>
      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 8, marginBottom: 16 }}>Putar video pembelajaran untuk melanjutkan progress.</p>
      {!videoPlaying && (
        <div className="video-play-btn" onClick={() => setVideoPlaying(true)}>
          <Play size={24} style={{ color: "white", fill: "white", marginLeft: 4 }} />
        </div>
      )}
      <div className="video-controls">
        <div onClick={() => setVideoPlaying(!videoPlaying)} style={{ cursor: "pointer" }}>{videoPlaying ? <Pause size={18} /> : <Play size={18} />}</div>
        <div className="video-progress-bar" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setVideoProgress(Math.floor(((e.clientX - rect.left) / rect.width) * 100)); }}>
          <div className="video-progress" style={{ width: `${videoProgress}%` }}></div>
        </div>
        <span style={{ fontSize: "0.75rem" }}>{videoTime}</span>
      </div>
    </div>
  );
}

// ── Exam Timer Banner ─────────────────────────────────────────────────────────
function ExamTimerBanner({ examTimeRemaining, examTimerActive }) {
  if (!examTimerActive && examTimeRemaining === 0) return null;
  const isWarning = examTimeRemaining <= 300; // <= 5 menit
  const isDanger  = examTimeRemaining <= 60;  // <= 1 menit
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 16px", borderRadius: 8, marginBottom: 16,
      backgroundColor: isDanger  ? "rgba(239,68,68,0.15)"  :
                       isWarning ? "rgba(245,158,11,0.15)" :
                                   "rgba(99,102,241,0.15)",
      border: `1px solid ${isDanger ? "rgba(239,68,68,0.4)" : isWarning ? "rgba(245,158,11,0.4)" : "rgba(99,102,241,0.3)"}`,
    }}>
      <Clock size={16} style={{ color: isDanger ? "#fca5a5" : isWarning ? "#fde68a" : "#a5b4fc", flexShrink: 0 }} />
      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: isDanger ? "#fca5a5" : isWarning ? "#fde68a" : "#a5b4fc" }}>
        Sisa Waktu Ujian: {formatCountdown(examTimeRemaining)}
        {isDanger ? " — Segera selesaikan!" : isWarning ? " — Waktu hampir habis!" : ""}
      </span>
    </div>
  );
}

// ── Main LmsPage ──────────────────────────────────────────────────────────────
export default function LmsPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const {
    enrolledCourses, activeCourse, activeLessonIndex, flatLessons, activeLmsTab, completedLessons,
    videoPlaying, videoProgress, videoTime, uploadStatus, attendanceLog, checkedIn,
    forumPosts, forumInput, selectedAnswers, quizResultMessage,
    examSession, examLoading,
    examTimeRemaining, examTimerActive,
    examHistory, examHistoryLoading,
    dbLessonProgress,
    setActivePage, setActiveLmsTab, setVideoPlaying, setVideoProgress, setVideoTime,
    setSelectedAnswers, setQuizResultMessage, setUploadStatus, setForumInput,
    handleSelectLesson, handleAssignmentUpload, handleAttendance, handleForumSubmit,
    handleStartExam, handleQuizSubmit, handleLoadExamHistory, handleSaveLessonProgress,
  } = useApp();

  const videoTimerRef = useRef(null);
  const activeLesson  = flatLessons[activeLessonIndex];

  // ── Forum DB-backed state ──────────────────────────────────────────────────
  const [dbForumPosts, setDbForumPosts]   = useState([]);
  const [forumText, setForumText]         = useState("");
  const [forumLoading, setForumLoading]   = useState(false);
  const [forumReplyTo, setForumReplyTo]   = useState(null);
  const { currentUser } = useApp();

  const loadForum = useCallback(async () => {
    if (!activeCourse) return;
    setForumLoading(true);
    try {
      const res  = await fetch(`/api/forum?courseId=${encodeURIComponent(activeCourse.id)}`);
      const data = await res.json();
      if (data.success) setDbForumPosts(data.posts || []);
    } catch { /* fallback ke in-memory */ }
    setForumLoading(false);
  }, [activeCourse]);

  const submitForumPost = async () => {
    if (!forumText.trim() || !activeCourse) return;
    try {
      const res = await fetch("/api/forum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: activeCourse.id, content: forumText.trim(), replyTo: forumReplyTo }),
      });
      const data = await res.json();
      if (data.success) {
        setForumText(""); setForumReplyTo(null);
        loadForum();
      }
    } catch { /* fallback */ }
  };

  const deleteForumPost = async (id) => {
    await fetch(`/api/forum?id=${id}`, { method: "DELETE" });
    setDbForumPosts(prev => prev.filter(p => p.id !== id));
  };

  useEffect(() => {
    if (activeLmsTab === "tab-forum") loadForum();
  }, [activeLmsTab, loadForum]);

  // ── Announcements state ────────────────────────────────────────────────────
  const [announcements, setAnnouncements]   = useState([]);
  const [announceTitle, setAnnounceTitle]   = useState("");
  const [announceContent, setAnnounceContent] = useState("");
  const [announceLoading, setAnnounceLoading] = useState(false);
  const isInstructor = ["admin","corporate","government"].includes(currentUser?.role);

  const loadAnnouncements = useCallback(async () => {
    if (!activeCourse) return;
    try {
      const res  = await fetch(`/api/announcements?courseId=${encodeURIComponent(activeCourse.id)}`);
      const data = await res.json();
      if (data.success) setAnnouncements(data.announcements || []);
    } catch { /* ignore */ }
  }, [activeCourse]);

  const postAnnouncement = async () => {
    if (!announceTitle.trim() || !announceContent.trim() || !activeCourse) return;
    setAnnounceLoading(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: activeCourse.id, title: announceTitle, content: announceContent }),
      });
      const data = await res.json();
      if (data.success) { setAnnounceTitle(""); setAnnounceContent(""); loadAnnouncements(); }
    } catch { /* ignore */ }
    setAnnounceLoading(false);
  };

  useEffect(() => {
    if (activeLmsTab === "tab-announcement") loadAnnouncements();
  }, [activeLmsTab, loadAnnouncements]);

  // ── Simulasi progress video (mock) ─────────────────────────────────────────
  useEffect(() => {
    if (videoPlaying) {
      videoTimerRef.current = setInterval(() => {
        setVideoProgress(prev => {
          if (prev >= 100) {
            clearInterval(videoTimerRef.current);
            setVideoPlaying(false);
            // Fase 2: auto-complete lesson saat video selesai
            if (activeCourse) handleSaveLessonProgress(activeLessonIndex, 100, true);
            return 100;
          }
          const next = prev + 2;
          // Simpan progress setiap 20% (80% threshold → completed)
          if (next >= 80 && prev < 80 && activeCourse) {
            handleSaveLessonProgress(activeLessonIndex, next, next >= 80);
          }
          return next;
        });
      }, 300);
    } else {
      clearInterval(videoTimerRef.current);
      // Simpan progress saat pause
      if (activeCourse && videoProgress > 0 && videoProgress < 100) {
        handleSaveLessonProgress(activeLessonIndex, videoProgress, videoProgress >= 80);
      }
    }
    return () => clearInterval(videoTimerRef.current);
  }, [videoPlaying]);

  useEffect(() => {
    const totalSec  = 765;
    const currentSec = Math.floor((videoProgress / 100) * totalSec);
    const formatTime = (sec) => { const m = Math.floor(sec / 60).toString().padStart(2, "0"); const s = (sec % 60).toString().padStart(2, "0"); return `${m}:${s}`; };
    setVideoTime(`${formatTime(currentSec)} / 12:45`);
  }, [videoProgress]);

  // ── Prerequisite check ─────────────────────────────────────────────────────
  // Sebuah modul (index modIdx) terkunci jika modul sebelumnya belum selesai semua
  const getModuleLockedStatus = () => {
    if (!activeCourse?.modules) return {};
    const locked = {};
    let flatIdx = 0;
    const completedSet = new Set(completedLessons[activeCourse.id] || []);

    activeCourse.modules.forEach((mod, modIdx) => {
      if (modIdx === 0) {
        // Modul pertama selalu terbuka
        mod.lessons.forEach(() => flatIdx++);
      } else {
        // Cek apakah semua lesson di modul SEBELUMNYA sudah selesai
        const prevMod = activeCourse.modules[modIdx - 1];
        let prevFlatStart = 0;
        for (let i = 0; i < modIdx - 1; i++) {
          prevFlatStart += activeCourse.modules[i].lessons.length;
        }
        const prevModLessons = prevMod.lessons.length;
        let allPrevDone = true;
        for (let li = 0; li < prevModLessons; li++) {
          if (!completedSet.has(prevFlatStart + li)) { allPrevDone = false; break; }
        }
        locked[modIdx] = !allPrevDone;
        mod.lessons.forEach(() => flatIdx++);
      }
    });
    return locked;
  };


  // ── Fase 4: Gamifikasi state ───────────────────────────────────────────────
  const [xpData, setXpData]         = useState(null);
  const [xpBadges, setXpBadges]     = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  const loadGamification = useCallback(async () => {
    try {
      const res  = await fetch("/api/gamification");
      const data = await res.json();
      if (data.success) { setXpData(data.points); setXpBadges(data.badges || []); }
    } catch { /* ignore */ }
  }, []);

  const loadLeaderboard = useCallback(async () => {
    if (!activeCourse) return;
    try {
      const res  = await fetch(`/api/leaderboard?scope=course&courseId=${activeCourse.id}&limit=5`);
      const data = await res.json();
      if (data.success) setLeaderboard(data.leaderboard || []);
    } catch { /* ignore */ }
  }, [activeCourse]);

  useEffect(() => { loadGamification(); }, [loadGamification]);

  // ── Fase 4: Live sessions state ────────────────────────────────────────────
  const [liveSessions, setLiveSessions]   = useState([]);
  const [liveLoading, setLiveLoading]     = useState(false);

  const loadLiveSessions = useCallback(async () => {
    if (!activeCourse) return;
    setLiveLoading(true);
    try {
      const res  = await fetch(`/api/live-sessions?courseId=${activeCourse.id}&upcoming=1`);
      const data = await res.json();
      if (data.success) setLiveSessions(data.sessions || []);
    } catch { /* ignore */ }
    setLiveLoading(false);
  }, [activeCourse]);

  const registerLiveSession = async (sessionId) => {
    try {
      await fetch("/api/live-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", sessionId }),
      });
      loadLiveSessions();
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (activeLmsTab === "tab-live") loadLiveSessions();
  }, [activeLmsTab, loadLiveSessions]);

  // ── Fase 4: AI Chat state ──────────────────────────────────────────────────
  const [aiMessages, setAiMessages]     = useState([
    { role: "assistant", content: "Halo! Saya AI Learning Assistant NHCIE. Ada yang bisa saya bantu tentang materi atau kursus ini? 🎓" }
  ]);
  const [aiInput, setAiInput]           = useState("");
  const [aiLoading, setAiLoading]       = useState(false);
  const [aiRecs, setAiRecs]             = useState([]);
  const [aiRecsLoading, setAiRecsLoading] = useState(false);

  // ── Fase 5: Reviews & Payment ─────────────────────────────────────────────
  const [courseReviews, setCourseReviews]       = useState([]);
  const [reviewStats, setReviewStats]           = useState(null);
  const [myRating, setMyRating]                 = useState(0);
  const [myComment, setMyComment]               = useState("");
  const [reviewLoading, setReviewLoading]       = useState(false);
  const [paymentLoading, setPaymentLoading]     = useState(false);
  const [paymentOrders, setPaymentOrders]       = useState([]);
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState(null);
  const [pwaInstalled, setPwaInstalled]         = useState(false);

  // Register SW & PWA install prompt
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const handler = (e) => { e.preventDefault(); setPwaInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => { setPwaInstalled(true); setPwaInstallPrompt(null); });
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const loadReviews = useCallback(async () => {
    if (!activeCourse) return;
    setReviewLoading(true);
    try {
      const res  = await fetch(`/api/reviews?courseId=${activeCourse.id}`);
      const data = await res.json();
      if (data.success) { setCourseReviews(data.reviews || []); setReviewStats(data.stats); }
    } catch { /* ignore */ } finally { setReviewLoading(false); }
  }, [activeCourse]);

  const submitReview = async () => {
    if (!myRating || !activeCourse) return;
    setReviewLoading(true);
    try {
      const res  = await fetch("/api/reviews", { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ courseId: activeCourse.id, rating: myRating, comment: myComment }) });
      const data = await res.json();
      if (data.success) { setMyComment(""); loadReviews(); }
      else alert(data.error || "Gagal menyimpan ulasan");
    } catch { alert("Gagal menyimpan ulasan"); } finally { setReviewLoading(false); }
  };

  const handleCheckout = async () => {
    if (!activeCourse) return;
    setPaymentLoading(true);
    try {
      const res  = await fetch("/api/payment", { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ courseId: activeCourse.id }) });
      const data = await res.json();
      if (data.success && data.free) { alert("Berhasil mendaftar kursus gratis!"); return; }
      if (data.success && data.redirectUrl) { window.open(data.redirectUrl, "_blank"); }
      else alert(data.error || "Gagal membuat order");
    } catch { alert("Gagal memproses pembayaran"); } finally { setPaymentLoading(false); }
  };

  useEffect(() => {
    if (activeLmsTab === "tab-reviews") loadReviews();
  }, [activeLmsTab, loadReviews]);

  const sendAiMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg = aiInput.trim();
    setAiMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setAiInput("");
    setAiLoading(true);
    try {
      const res  = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, history: aiMessages.slice(-6), courseId: activeCourse?.id }),
      });
      const data = await res.json();
      setAiMessages(prev => [...prev, { role: "assistant", content: data.response || "Maaf, terjadi kesalahan." }]);
    } catch {
      setAiMessages(prev => [...prev, { role: "assistant", content: "Koneksi AI tidak tersedia saat ini." }]);
    }
    setAiLoading(false);
  };

  const loadAiRecommendations = useCallback(async () => {
    setAiRecsLoading(true);
    try {
      const res  = await fetch("/api/ai?type=recommend");
      const data = await res.json();
      if (data.success) setAiRecs(data.recommendations || []);
    } catch { /* ignore */ }
    setAiRecsLoading(false);
  }, []);

  useEffect(() => {
    if (activeLmsTab === "tab-ai") loadAiRecommendations();
  }, [activeLmsTab, loadAiRecommendations]);

  if (enrolledCourses.length === 0 || !activeCourse) {
    return (
      <main className="page-view active">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: 40, textAlign: "center" }}>
          <PlayCircle size={64} style={{ color: "var(--text-muted)", marginBottom: 16 }} />
          <h3>Tidak Ada Kelas Aktif</h3>
          <p style={{ color: "var(--text-secondary)", maxWidth: 400, marginTop: 8, marginBottom: 24 }}>Silakan beli atau daftar kelas di menu Marketplace Pelatihan terlebih dahulu.</p>
          <button className="btn btn-primary" onClick={() => setActivePage("marketplace-page")} style={{ width: "auto" }}>Buka Marketplace</button>
        </div>
      </main>
    );
  }

  const lockedModules = getModuleLockedStatus();
  const examSettings  = activeCourse.examSettings || {};
  const passingScore  = examSession?.passingScore || examSettings.passingScore || 70;

  return (
    <main className="page-view active">
      <div className="lms-container">
        <div className="lms-player-side">
          <div className="video-container">
            <VideoPlayerV2
              activeLesson={activeLesson}
              videoPlaying={videoPlaying}
              videoProgress={videoProgress}
              videoTime={videoTime}
              setVideoPlaying={setVideoPlaying}
              setVideoProgress={setVideoProgress}
              isFullscreen={isFullscreen}
            />
          </div>
          {/* Fullscreen toggle — selalu tampil saat ada lesson aktif */}
          {activeLesson && (
            <button onClick={() => setIsFullscreen(f => !f)}
              style={{
                display:"flex", alignItems:"center", gap:6, width:"100%", padding:"7px 14px",
                background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.2)",
                borderRadius:"0 0 10px 10px", cursor:"pointer", color:"#a5b4fc",
                fontSize:"0.78rem", fontWeight:600, justifyContent:"center",
              }}>
              <MonitorPlay size={14}/>
              {isFullscreen ? "Keluar Fullscreen" : "Buka Fullscreen"}
            </button>
          )}

          <div className="lms-tabs">
            <div className={`lms-tab ${activeLmsTab === "tab-overview"    ? "active" : ""}`} onClick={() => setActiveLmsTab("tab-overview")}>Ringkasan</div>
            <div className={`lms-tab ${activeLmsTab === "tab-assignment"  ? "active" : ""}`} onClick={() => setActiveLmsTab("tab-assignment")}>Tugas</div>
            <div className={`lms-tab ${activeLmsTab === "tab-exam"        ? "active" : ""}`} onClick={() => { setActiveLmsTab("tab-exam"); if (!examSession && !examLoading) handleStartExam(); }}>Ujian Akhir</div>
            <div className={`lms-tab ${activeLmsTab === "tab-history"     ? "active" : ""}`} onClick={() => { setActiveLmsTab("tab-history"); handleLoadExamHistory(); }}>
              <History size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />Riwayat
            </div>
            <div className={`lms-tab ${activeLmsTab === "tab-attendance"  ? "active" : ""}`} onClick={() => setActiveLmsTab("tab-attendance")}>Kehadiran</div>
            <div className={`lms-tab ${activeLmsTab === "tab-forum"       ? "active" : ""}`} onClick={() => setActiveLmsTab("tab-forum")}>Forum Diskusi</div>
            <div className={`lms-tab ${activeLmsTab === "tab-announcement" ? "active" : ""}`} onClick={() => setActiveLmsTab("tab-announcement")}>
              <Megaphone size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />Pengumuman
            </div>
            <div className={`lms-tab ${activeLmsTab === "tab-live" ? "active" : ""}`} onClick={() => setActiveLmsTab("tab-live")}>
              <Video size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />Live Class
            </div>
            <div className={`lms-tab ${activeLmsTab === "tab-ai" ? "active" : ""}`} onClick={() => setActiveLmsTab("tab-ai")}>
              <Bot size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />AI Assistant
            </div>
            <div className={`lms-tab ${activeLmsTab === "tab-reviews" ? "active" : ""}`} onClick={() => setActiveLmsTab("tab-reviews")}>
              <Star size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />Ulasan
            </div>
          </div>

          {/* ── Tab: Ringkasan ──────────────────────────────────────────── */}
          <div className={`lms-tab-content ${activeLmsTab === "tab-overview" ? "active" : ""}`}>
            <h3 style={{ marginBottom: 8 }}>{activeCourse.title}</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>{activeCourse.desc}</p>
            {/* Info konfigurasi ujian */}
            {(examSettings.timeLimit > 0 || examSettings.maxAttempts > 0 || examSettings.passingScore) && (
              <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 8, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                <strong style={{ color: "#a5b4fc", display: "block", marginBottom: 6 }}>Konfigurasi Ujian Kelas Ini</strong>
                {examSettings.passingScore  > 0 && <div>• Passing Score: <strong>{examSettings.passingScore}%</strong></div>}
                {examSettings.timeLimit     > 0 && <div>• Batas Waktu Ujian: <strong>{examSettings.timeLimit} menit</strong></div>}
                {examSettings.maxAttempts   > 0 && <div>• Maksimum Percobaan: <strong>{examSettings.maxAttempts}x</strong></div>}
                {(examSettings.maxAttempts === 0 || !examSettings.maxAttempts) && <div>• Percobaan: <strong>Tidak dibatasi</strong></div>}
              </div>
            )}

            {/* XP & Badge strip */}
            {xpData && (
              <div style={{ marginTop:16, padding:"12px 16px", borderRadius:8, background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.15)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                  <span style={{ fontSize:"0.78rem", fontWeight:700, color:"#fbbf24", display:"flex", alignItems:"center", gap:6 }}>
                    <Zap size={13} />Level {xpData.level} · {xpData.total_points} XP
                  </span>
                  {xpData.streak_days > 0 && (
                    <span style={{ fontSize:"0.72rem", color:"#f97316" }}>🔥 Streak {xpData.streak_days} hari</span>
                  )}
                </div>
                <div style={{ height:6, background:"rgba(255,255,255,0.08)", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", background:"linear-gradient(90deg,#f59e0b,#f97316)", borderRadius:3, width:`${Math.min(100,(xpData.total_points%200)/2)}%`, transition:"width 0.5s" }} />
                </div>
                {xpBadges.length > 0 && (
                  <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
                    {xpBadges.slice(0,6).map(b => (
                      <span key={b.id} title={b.name + ": " + b.description}
                        style={{ fontSize:"1rem", cursor:"default", filter:"drop-shadow(0 0 4px " + b.color + "66)" }}>
                        {b.icon}
                      </span>
                    ))}
                    {xpBadges.length > 6 && <span style={{ fontSize:"0.65rem", color:"var(--text-muted)", lineHeight:"1.6rem" }}>+{xpBadges.length-6} lainnya</span>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Tab: Tugas ─────────────────────────────────────────────── */}
          <div className={`lms-tab-content ${activeLmsTab === "tab-assignment" ? "active" : ""}`}>
            <h3 style={{ marginBottom: 12 }}>Manajemen Tugas (Assignment)</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 20 }}>Silakan selesaikan studi kasus yang diberikan dan unggah file laporan dalam format PDF.</p>
            <div className="glass-card" style={{ padding: 24, border: "2px dashed rgba(255,255,255,0.08)", textAlign: "center", cursor: "pointer", borderRadius: 12 }} onClick={handleAssignmentUpload}>
              <UploadCloud size={36} style={{ color: "var(--primary)", marginBottom: 12, margin: "0 auto" }} />
              <p style={{ fontSize: "0.85rem", fontWeight: 600, marginTop: 12 }}>Klik untuk memilih file atau seret file ke sini</p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>Hanya mendukung file PDF (maks. 5MB)</p>
              {uploadStatus === "Uploading" && <div style={{ marginTop: 12, fontWeight: 500, color: "var(--warning)", fontSize: "0.8rem" }}>Mengunggah file tugas...</div>}
              {uploadStatus === "Success"   && <div style={{ marginTop: 12, fontWeight: 500, color: "var(--success)", fontSize: "0.8rem" }}>File berhasil diunggah! Status: Menunggu Penilaian.</div>}
            </div>
          </div>

          {/* ── Tab: Ujian Akhir ────────────────────────────────────────── */}
          <div className={`lms-tab-content ${activeLmsTab === "tab-exam" ? "active" : ""}`}>
            <h3 style={{ marginBottom: 4 }}>Ujian Sertifikasi Kompetensi</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 16 }}>
              Jawab semua pertanyaan ujian berikut. Passing Score: <strong>{passingScore}%</strong>.
            </p>

            {/* Timer banner */}
            {examSession && <ExamTimerBanner examTimeRemaining={examTimeRemaining} examTimerActive={examTimerActive} />}

            {examLoading && (
              <div style={{ textAlign: "center", padding: 32, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                Memuat soal ujian dari server...
              </div>
            )}

            {/* Error max attempts */}
            {!examLoading && !examSession && (
              <div style={{ textAlign: "center", padding: 32 }}>
                <button className="btn btn-primary" style={{ width: "auto" }} onClick={handleStartExam}>Mulai Ujian</button>
              </div>
            )}

            {!examLoading && examSession && (
              <>
                {examSession.demoMode && (
                  <div style={{ fontSize: "0.75rem", color: "var(--warning)", background: "rgba(245,158,11,0.1)", border: "1px dashed rgba(245,158,11,0.3)", borderRadius: 6, padding: "6px 12px", marginBottom: 16 }}>
                    Mode Demo — Database tidak tersedia. Scoring berjalan secara lokal.
                    {examSession.error && ` (${examSession.error})`}
                  </div>
                )}
                {examSession.questions.length > 0 ? (
                  <div id="quiz-container">
                    {examSession.questions.map((qItem, qIdx) => (
                      <div key={qIdx} className="quiz-question">
                        <p style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: 8 }}>{qIdx + 1}. {qItem.q}</p>
                        <div>
                          {qItem.options.map((opt, optIdx) => {
                            const isSelected = selectedAnswers[qIdx] === optIdx;
                            return (
                              <div key={optIdx} className={`quiz-option ${isSelected ? "selected" : ""}`} onClick={() => setSelectedAnswers({ ...selectedAnswers, [qIdx]: optIdx })}>
                                <div style={{ border: "2px solid", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", borderColor: isSelected ? "var(--primary)" : "var(--border-color)", flexShrink: 0 }}>
                                  {isSelected && <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "var(--primary)" }} />}
                                </div>
                                <span>{opt}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", padding: 12 }}>Kuis/Ujian untuk kelas ini sedang dipersiapkan oleh Admin.</p>
                )}

                {examSession.questions.length > 0 && !quizResultMessage && (
                  <button className="btn btn-primary" style={{ width: "auto", marginTop: 12 }} onClick={handleQuizSubmit}>
                    Kirim Ujian
                  </button>
                )}

                {quizResultMessage && (
                  <>
                    <div style={{ marginTop: 16, padding: 16, borderRadius: 8, backgroundColor: quizResultMessage.success ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", border: quizResultMessage.success ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(239,68,68,0.3)", color: quizResultMessage.success ? "#a7f3d0" : "#fecaca" }}>
                      <h4 style={{ marginBottom: 6 }}>{quizResultMessage.success ? "Selamat! Anda Lulus Sertifikasi" : "Ujian Gagal (Tidak Lulus)"}</h4>
                      <p style={{ fontSize: "0.85rem" }}>{quizResultMessage.text}</p>
                    </div>
                    {!quizResultMessage.success && (
                      <button className="btn btn-secondary" style={{ width: "auto", marginTop: 12, fontSize: "0.8rem" }} onClick={() => { handleStartExam(); setQuizResultMessage(null); }}>
                        Coba Lagi
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* ── Tab: Riwayat Ujian ──────────────────────────────────────── */}
          <div className={`lms-tab-content ${activeLmsTab === "tab-history" ? "active" : ""}`}>
            <h3 style={{ marginBottom: 12 }}>Riwayat Percobaan Ujian</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 16 }}>Daftar semua percobaan ujian Anda untuk kelas ini.</p>
            {examHistoryLoading && <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Memuat riwayat...</p>}
            {!examHistoryLoading && examHistory.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Belum ada percobaan ujian yang tersimpan.</p>
            )}
            {!examHistoryLoading && examHistory.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: "0.82rem", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)", textAlign: "left" }}>
                      <th style={{ padding: "8px 12px" }}>Percobaan</th>
                      <th style={{ padding: "8px 12px" }}>Skor</th>
                      <th style={{ padding: "8px 12px" }}>Status</th>
                      <th style={{ padding: "8px 12px" }}>Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examHistory.map((attempt, idx) => (
                      <tr key={attempt.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "8px 12px", color: "var(--text-secondary)" }}>#{examHistory.length - idx}</td>
                        <td style={{ padding: "8px 12px", fontWeight: 700, color: attempt.percentage >= passingScore ? "var(--success)" : "var(--danger)" }}>
                          {attempt.percentage}%
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: 4, backgroundColor: attempt.passed ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: attempt.passed ? "#a7f3d0" : "#fca5a5", fontWeight: 600 }}>
                            {attempt.passed ? "Lulus" : "Tidak Lulus"}
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                          {new Date(attempt.submittedAt).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Tab: Kehadiran ──────────────────────────────────────────── */}
          <div className={`lms-tab-content ${activeLmsTab === "tab-attendance" ? "active" : ""}`}>
            <h3 style={{ marginBottom: 12 }}>Pelacakan Kehadiran (Attendance)</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 20 }}>Lakukan Check-In dan Check-Out sebagai bukti kehadiran interaktif Anda.</p>
            <div style={{ display: "flex", gap: 16 }}>
              <button className="btn btn-primary"   style={{ width: 160, backgroundColor: "var(--success)" }} disabled={checkedIn}  onClick={() => handleAttendance("Check In")}>
                <MapPin size={16} style={{ marginRight: 6 }} /> Check In
              </button>
              <button className="btn btn-secondary" style={{ width: 160, borderColor: "var(--danger)", color: "var(--danger)" }} disabled={!checkedIn} onClick={() => handleAttendance("Check Out")}>
                <LogOut size={16} style={{ marginRight: 6 }} /> Check Out
              </button>
            </div>
            <div style={{ marginTop: 20, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              {attendanceLog.map((log, idx) => <div key={idx} style={{ marginTop: 4 }}>✓ {log}</div>)}
            </div>
          </div>

          {/* ── Tab: Forum Diskusi (DB-backed) ──────────────────────── */}
          <div className={`lms-tab-content ${activeLmsTab === "tab-forum" ? "active" : ""}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Forum Diskusi</h3>
              <button onClick={loadForum} className="btn btn-secondary" style={{ width: "auto", padding: "4px 10px", fontSize: "0.72rem" }}>↻ Refresh</button>
            </div>

            {forumReplyTo && (
              <div style={{ padding: "6px 12px", background: "rgba(99,102,241,0.1)", borderRadius: 6, fontSize: "0.75rem", color: "#a5b4fc", marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
                <span>Membalas post #{forumReplyTo}</span>
                <button onClick={() => setForumReplyTo(null)} style={{ background: "none", border: "none", color: "#a5b4fc", cursor: "pointer", fontSize: "0.72rem" }}>× Batal</button>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16, maxHeight: 320, overflowY: "auto" }}>
              {forumLoading && <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: 12 }}>Memuat forum...</p>}
              {!forumLoading && dbForumPosts.length === 0 && (
                <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: 20 }}>
                  <MessageCircle size={24} style={{ display: "block", margin: "0 auto 8px", opacity: 0.3 }} />
                  Belum ada diskusi. Jadilah yang pertama!
                </p>
              )}
              {dbForumPosts.map(post => (
                <div key={post.id} className="glass-card" style={{ padding: 12, marginLeft: post.reply_to ? 24 : 0, borderLeft: post.reply_to ? "3px solid rgba(99,102,241,0.3)" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, color: "#a5b4fc" }}>
                        {(post.avatar || post.fullname?.charAt(0) || "?").toUpperCase()}
                      </div>
                      <div>
                        <strong style={{ fontSize: "0.78rem", color: "#a5b4fc" }}>{post.fullname || post.user_email}</strong>
                        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginLeft: 6 }}>{post.role}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                        {new Date(post.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <button onClick={() => setForumReplyTo(post.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }} title="Balas">
                        <MessageCircle size={12} />
                      </button>
                      {(post.user_email === currentUser?.email || currentUser?.role === "admin") && (
                        <button onClick={() => deleteForumPost(post.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }} title="Hapus">
                          <Trash2 size={12} style={{ color: "#fca5a5" }} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-primary)", margin: 0, lineHeight: 1.5 }}>{post.content}</p>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Tulis komentar atau pertanyaan Anda..."
                style={{ flex: 1, paddingLeft: 16 }}
                value={forumText}
                onChange={e => setForumText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submitForumPost(); }}
              />
              <button className="btn btn-primary" style={{ width: "auto", padding: "0 16px" }} onClick={submitForumPost}>
                <Send size={14} />
              </button>
            </div>
          </div>

          {/* ── Tab: Pengumuman ─────────────────────────────────────────── */}
          <div className={`lms-tab-content ${activeLmsTab === "tab-announcement" ? "active" : ""}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Pengumuman Kelas</h3>
              <button onClick={loadAnnouncements} className="btn btn-secondary" style={{ width: "auto", padding: "4px 10px", fontSize: "0.72rem" }}>↻ Refresh</button>
            </div>

            {isInstructor && (
              <div className="glass-card" style={{ padding: 16, marginBottom: 20, border: "1px solid rgba(251,191,36,0.2)" }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#fbbf24", marginBottom: 10 }}>
                  <Megaphone size={13} style={{ marginRight: 4, verticalAlign: "middle" }} /> Buat Pengumuman Baru
                </p>
                <div className="form-group" style={{ marginBottom: 8 }}>
                  <input type="text" placeholder="Judul pengumuman..." value={announceTitle}
                    onChange={e => setAnnounceTitle(e.target.value)}
                    style={{ paddingLeft: 12 }} />
                </div>
                <div className="form-group" style={{ marginBottom: 8 }}>
                  <textarea placeholder="Isi pengumuman..." value={announceContent}
                    onChange={e => setAnnounceContent(e.target.value)}
                    style={{ width: "100%", minHeight: 80, padding: "8px 12px", fontSize: "0.82rem",
                      background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
                      borderRadius: 6, color: "var(--text-primary)", resize: "vertical" }} />
                </div>
                <button onClick={postAnnouncement} disabled={announceLoading} className="btn btn-primary" style={{ width: "auto", padding: "6px 16px", fontSize: "0.8rem" }}>
                  {announceLoading ? "Memposting..." : <><Send size={12} style={{ marginRight: 4 }} />Kirim ke Semua Peserta</>}
                </button>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {announcements.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: 20 }}>
                  <Megaphone size={24} style={{ display: "block", margin: "0 auto 8px", opacity: 0.3 }} />
                  Belum ada pengumuman untuk kelas ini.
                </p>
              ) : announcements.map(a => (
                <div key={a.id} className="glass-card" style={{ padding: 16, border: "1px solid rgba(251,191,36,0.15)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <h4 style={{ fontSize: "0.88rem", color: "#fbbf24", margin: 0, fontWeight: 700 }}>
                      <Megaphone size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />{a.title}
                    </h4>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", flexShrink: 0 }}>
                      {new Date(a.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0 0 6px 0", lineHeight: 1.6 }}>{a.content}</p>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>— {a.author_name || a.author_email}</span>
                </div>
              ))}
            </div>
          </div>


          {/* ── Tab: Live Class ──────────────────────────────────────────── */}
          <div className={`lms-tab-content ${activeLmsTab === "tab-live" ? "active" : ""}`}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <h4 style={{ margin:0, display:"flex", alignItems:"center", gap:8 }}>
                <Video size={16} style={{ color:"var(--primary)" }} />Jadwal Live Class
              </h4>
              <button className="btn btn-secondary" style={{ width:"auto", padding:"4px 12px", fontSize:"0.75rem" }}
                onClick={loadLiveSessions}>↻ Refresh</button>
            </div>
            {liveLoading ? (
              <p style={{ color:"var(--text-muted)", fontSize:"0.8rem" }}>Memuat jadwal...</p>
            ) : liveSessions.length === 0 ? (
              <div style={{ textAlign:"center", padding:32 }}>
                <Calendar size={36} style={{ color:"var(--text-muted)", marginBottom:8 }} />
                <p style={{ color:"var(--text-muted)", fontSize:"0.82rem" }}>Belum ada sesi live class terjadwal.</p>
              </div>
            ) : liveSessions.map(s => (
              <div key={s.id} className="glass-card" style={{ padding:16, marginBottom:12, border:"1px solid rgba(99,102,241,0.2)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                      <span style={{ fontSize:"0.65rem", background:"rgba(99,102,241,0.2)", color:"#a5b4fc", padding:"2px 8px", borderRadius:20, fontWeight:600 }}>
                        {s.platform?.toUpperCase() || "ZOOM"}
                      </span>
                      <span style={{ fontSize:"0.65rem", color: s.status === "live" ? "#6ee7b7" : "var(--text-muted)", fontWeight: s.status === "live" ? 700 : 400 }}>
                        {s.status === "live" ? "🔴 LIVE SEKARANG" : "📅 Terjadwal"}
                      </span>
                    </div>
                    <h4 style={{ margin:"0 0 4px", fontSize:"0.9rem" }}>{s.title}</h4>
                    {s.description && <p style={{ margin:"0 0 8px", fontSize:"0.75rem", color:"var(--text-secondary)" }}>{s.description}</p>}
                    <div style={{ fontSize:"0.75rem", color:"var(--text-muted)", display:"flex", gap:16, flexWrap:"wrap" }}>
                      <span>🕐 {new Date(s.scheduled_at).toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"})}</span>
                      <span>⏱ {s.duration_minutes} menit</span>
                      <span>👤 {s.instructor_name || "Instruktur"}</span>
                      <span>👥 {s.registered_count || 0}/{s.max_participants} peserta</span>
                    </div>
                  </div>
                  <div style={{ marginLeft:12, flexShrink:0 }}>
                    {s.is_registered ? (
                      s.meet_link ? (
                        <a href={s.meet_link} target="_blank" rel="noopener noreferrer"
                          className="btn btn-primary" style={{ width:"auto", padding:"6px 14px", fontSize:"0.75rem", textDecoration:"none" }}>
                          Bergabung
                        </a>
                      ) : (
                        <span style={{ fontSize:"0.72rem", color:"#6ee7b7", fontWeight:600 }}>✓ Terdaftar</span>
                      )
                    ) : (
                      <button className="btn btn-secondary" style={{ width:"auto", padding:"6px 14px", fontSize:"0.75rem" }}
                        onClick={() => registerLiveSession(s.id)}>
                        Daftar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Tab: AI Assistant ─────────────────────────────────────────── */}
          <div className={`lms-tab-content ${activeLmsTab === "tab-ai" ? "active" : ""}`}>
            <div style={{ display:"flex", flexDirection:"column", height:420 }}>
              {/* Rekomendasi AI */}
              <div style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <h4 style={{ margin:0, fontSize:"0.85rem", display:"flex", alignItems:"center", gap:6 }}>
                    <Zap size={14} style={{ color:"#fbbf24" }} />Rekomendasi Kursus AI
                  </h4>
                  <button className="btn btn-secondary" style={{ width:"auto", padding:"3px 10px", fontSize:"0.7rem" }}
                    onClick={loadAiRecommendations}>↻</button>
                </div>
                {aiRecsLoading ? (
                  <p style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>Menganalisis profil Anda...</p>
                ) : aiRecs.length > 0 ? (
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {aiRecs.map((r, i) => (
                      <div key={i} className="glass-card" style={{ padding:"8px 12px", flex:1, minWidth:140, border:"1px solid rgba(251,191,36,0.2)" }}>
                        <div style={{ fontSize:"0.65rem", color:"#fbbf24", fontWeight:700, marginBottom:2 }}>Match {r.match}%</div>
                        <div style={{ fontSize:"0.78rem", fontWeight:600, marginBottom:2 }}>{r.title}</div>
                        <div style={{ fontSize:"0.65rem", color:"var(--text-muted)" }}>{r.reason}</div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Chat area */}
              <div style={{ flex:1, overflowY:"auto", background:"rgba(0,0,0,0.2)", borderRadius:8, padding:12, marginBottom:8, display:"flex", flexDirection:"column", gap:8 }}>
                {aiMessages.map((m, i) => (
                  <div key={i} style={{ display:"flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth:"80%", padding:"8px 12px", borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      background: m.role === "user" ? "rgba(249,115,22,0.3)" : "rgba(99,102,241,0.2)",
                      border: `1px solid ${m.role === "user" ? "rgba(249,115,22,0.3)" : "rgba(99,102,241,0.3)"}`,
                      fontSize:"0.78rem", lineHeight:1.6,
                    }}>
                      {m.role === "assistant" && <Bot size={12} style={{ marginRight:4, color:"#a5b4fc", verticalAlign:"middle" }} />}
                      {m.content}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:"#a5b4fc", animation:"pulse 1s infinite" }} />
                    <span style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>AI sedang mengetik...</span>
                  </div>
                )}
              </div>

              {/* Input */}
              <div style={{ display:"flex", gap:8 }}>
                <input
                  type="text"
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendAiMessage()}
                  placeholder="Tanya AI tentang materi atau kursus ini..."
                  style={{ flex:1, paddingLeft:12, height:38, fontSize:"0.8rem" }}
                />
                <button className="btn btn-primary" style={{ width:"auto", padding:"0 16px", fontSize:"0.8rem" }}
                  onClick={sendAiMessage} disabled={aiLoading || !aiInput.trim()}>
                  Kirim
                </button>
              </div>
            </div>
          </div>

          {/* ── Tab: Ulasan & Pembayaran ──────────────────────────────────── */}
          <div className={`lms-tab-content ${activeLmsTab === "tab-reviews" ? "active" : ""}`}>
            {activeCourse && (activeCourse.price > 0) && (
              <div className="glass-card" style={{ padding:"16px 20px", marginBottom:16, border:"1px solid rgba(249,115,22,0.3)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:"0.9rem" }}>{activeCourse.title}</div>
                  <div style={{ color:"#f97316", fontSize:"1.1rem", fontWeight:800, marginTop:4 }}>
                    Rp {(activeCourse.price || 0).toLocaleString("id-ID")}
                  </div>
                </div>
                <button className="btn btn-primary" style={{ width:"auto", padding:"10px 20px", display:"flex", alignItems:"center", gap:6 }}
                  onClick={handleCheckout} disabled={paymentLoading}>
                  <ShoppingCart size={16} />{paymentLoading ? "Memproses..." : "Daftar Sekarang"}
                </button>
              </div>
            )}

            {reviewStats && (
              <div style={{ display:"flex", gap:20, marginBottom:16, padding:"12px 16px", background:"rgba(0,0,0,0.15)", borderRadius:10 }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:"2.5rem", fontWeight:800, color:"#fbbf24", lineHeight:1 }}>{reviewStats.avg_rating || 0}</div>
                  <div style={{ display:"flex", gap:2, justifyContent:"center", margin:"4px 0" }}>
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} size={12} style={{ color: n <= Math.round(reviewStats.avg_rating) ? "#fbbf24" : "#444", fill: n <= Math.round(reviewStats.avg_rating) ? "#fbbf24" : "none" }} />
                    ))}
                  </div>
                  <div style={{ fontSize:"0.7rem", color:"var(--text-muted)" }}>{reviewStats.total} ulasan</div>
                </div>
                <div style={{ flex:1 }}>
                  {[5,4,3,2,1].map(n => (
                    <div key={n} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                      <span style={{ fontSize:"0.65rem", color:"var(--text-muted)", width:8 }}>{n}</span>
                      <div style={{ flex:1, height:5, borderRadius:3, background:"rgba(255,255,255,0.1)", overflow:"hidden" }}>
                        <div style={{ height:"100%", borderRadius:3, background:"#fbbf24",
                          width:`${reviewStats.total > 0 ? (reviewStats["r"+n]/reviewStats.total*100) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="glass-card" style={{ padding:"12px 16px", marginBottom:16 }}>
              <div style={{ fontSize:"0.8rem", fontWeight:600, marginBottom:8 }}>Beri Ulasan</div>
              <div style={{ display:"flex", gap:4, marginBottom:8 }}>
                {[1,2,3,4,5].map(n => (
                  <Star key={n} size={22} onClick={() => setMyRating(n)} style={{
                    cursor:"pointer", color: n <= myRating ? "#fbbf24" : "#444",
                    fill: n <= myRating ? "#fbbf24" : "none", transition:"color 0.15s"
                  }} />
                ))}
              </div>
              <textarea value={myComment} onChange={e => setMyComment(e.target.value)}
                placeholder="Tulis komentar (opsional)..."
                style={{ width:"100%", minHeight:64, borderRadius:8, padding:"8px 10px", fontSize:"0.8rem",
                  background:"rgba(0,0,0,0.3)", border:"1px solid rgba(255,255,255,0.1)", color:"inherit",
                  resize:"vertical", marginBottom:8 }} />
              <button className="btn btn-primary" style={{ width:"auto", padding:"6px 18px", fontSize:"0.8rem" }}
                onClick={submitReview} disabled={reviewLoading || !myRating}>
                {reviewLoading ? "Menyimpan..." : "Simpan Ulasan"}
              </button>
            </div>

            {reviewLoading && !courseReviews.length ? (
              <p style={{ fontSize:"0.8rem", color:"var(--text-muted)" }}>Memuat ulasan...</p>
            ) : courseReviews.length === 0 ? (
              <p style={{ fontSize:"0.8rem", color:"var(--text-muted)" }}>Belum ada ulasan. Jadilah yang pertama!</p>
            ) : courseReviews.map((r, i) => (
              <div key={i} className="glass-card" style={{ padding:"12px 16px", marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ fontWeight:600, fontSize:"0.82rem" }}>{r.fullname || r.user_email}</div>
                  <div style={{ display:"flex", gap:2 }}>
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} size={11} style={{ color: n <= r.rating ? "#fbbf24" : "#444", fill: n <= r.rating ? "#fbbf24" : "none" }} />
                    ))}
                  </div>
                </div>
                {r.comment && <p style={{ fontSize:"0.78rem", color:"var(--text-secondary)", margin:"6px 0 0" }}>{r.comment}</p>}
                <div style={{ fontSize:"0.65rem", color:"var(--text-muted)", marginTop:4 }}>
                  {new Date(r.created_at).toLocaleDateString("id-ID", { day:"numeric", month:"short", year:"numeric" })}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {pwaInstallPrompt && !pwaInstalled && (
        <div style={{ position:"fixed", bottom:16, left:"50%", transform:"translateX(-50%)", zIndex:9999,
          background:"linear-gradient(135deg,#1e1e2e,#2d2d44)", border:"1px solid rgba(249,115,22,0.4)",
          borderRadius:14, padding:"12px 20px", display:"flex", alignItems:"center", gap:12,
          boxShadow:"0 8px 32px rgba(0,0,0,0.4)", maxWidth:360, width:"calc(100% - 32px)" }}>
          <Download size={20} style={{ color:"#f97316", flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600, fontSize:"0.82rem" }}>Install NHCIE LMS</div>
            <div style={{ fontSize:"0.7rem", color:"var(--text-muted)" }}>Akses cepat dari layar utama</div>
          </div>
          <button className="btn btn-primary" style={{ width:"auto", padding:"6px 14px", fontSize:"0.75rem", flexShrink:0 }}
            onClick={() => { pwaInstallPrompt.prompt(); pwaInstallPrompt.userChoice.then(() => setPwaInstallPrompt(null)); }}>
            Install
          </button>
          <button onClick={() => setPwaInstallPrompt(null)}
            style={{ background:"none", border:"none", color:"var(--text-muted)", cursor:"pointer", padding:4, flexShrink:0 }}>
            <X size={14} />
          </button>
        </div>
      )}
    </main>
  );
}
