"use client";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { PlayCircle, Play, Pause, CheckCircle, UploadCloud, MapPin, LogOut, Film, MonitorPlay, Lock, Clock, History, X, Megaphone, Send, Trash2, MessageCircle, Video, Bot, Zap, Calendar, Star, ShoppingCart, ShoppingBag, Download, BookOpen, Bookmark, CalendarPlus, Award, ShieldAlert, AlertTriangle, ArrowLeft, ArrowRight, FileText, Mic, MicOff, Volume2, Smile } from "lucide-react";
import { useApp } from "@/context/AppContext";
import VideoPlayerV2 from "./VideoPlayerV2";
import EmptyState from "@/components/Common/EmptyState";

// ── Katalog Emoji Forum ───────────────────────────────────────────────────────
const FORUM_EMOJI_CATEGORIES = [
  {
    name: "Populer",
    emojis: ["👍", "💡", "👏", "🔥", "❤️", "🎓", "🚀", "✨", "🎯", "❓", "✅", "🙌", "💯", "🏆"]
  },
  {
    name: "Ekspresi",
    emojis: ["😀", "😃", "😊", "🥳", "🤔", "😎", "🤩", "🤝", "🙏", "💪", "😇", "🎉", "😍", "🧐"]
  },
  {
    name: "Edukasi",
    emojis: ["📚", "📖", "✍️", "📝", "🧠", "💻", "📊", "🏆", "🥇", "💯", "🔍", "📌", "📐", "📈"]
  },
  {
    name: "Simbol",
    emojis: ["⚡", "🌟", "⭐", "📢", "💬", "🕒", "📍", "🏷️", "🔒", "🌐", "🔔", "☀️", "☕", "☕"]
  }
];

// ── Helper: format detik jadi MM:SS ────────────────────────────────────────────
function formatCountdown(totalSec) {
  const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── Helper: avatar color generator untuk pesan forum ────────────────────────
function getForumAvatarClass(name = "") {
  const colors = ["avatar-orange", "avatar-blue", "avatar-amber", "avatar-emerald", "avatar-purple"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
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
                                   "var(--accent-badge-bg)",
      border: `1px solid ${isDanger ? "rgba(239,68,68,0.4)" : isWarning ? "rgba(245,158,11,0.4)" : "var(--accent-badge-border)"}`,
    }}>
      <Clock size={16} style={{ color: isDanger ? "#fca5a5" : isWarning ? "#fde68a" : "var(--text-accent)", flexShrink: 0 }} />
      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: isDanger ? "#fca5a5" : isWarning ? "#fde68a" : "var(--text-accent)" }}>
        Sisa Waktu Ujian: {formatCountdown(examTimeRemaining)}
        {isDanger ? " — Segera selesaikan!" : isWarning ? " — Waktu hampir habis!" : ""}
      </span>
    </div>
  );
}

/**
 * Navigator kurikulum — daftar modul & pelajaran di kolom kanan.
 *
 * Panel ini sempat hilang dari UI meski CSS-nya (.lms-sidebar, .curriculum-*,
 * .lesson-item) dan `handleSelectLesson` tetap ada. Tanpa panel ini peserta
 * hanya pernah melihat satu pelajaran: `flatLessons[activeLessonIndex]`, dan
 * indeks itu cuma berubah lewat auto-resume. Pengunci modul (`lockedModules`)
 * juga dihitung tapi tidak pernah dipakai.
 *
 * `flatIndex` harus dihitung berurutan melintasi modul karena itulah kunci yang
 * dipakai completedLessons, dbLessonProgress, dan handleSelectLesson.
 */
function CurriculumNav({
  activeCourse, courses, enrolledCourses, activeLessonIndex, completedLessons,
  dbLessonProgress, lockedModules, handleSelectLesson, handleOpenClass,
}) {
  const modules = activeCourse?.modules || [];
  const completedSet = new Set(completedLessons[activeCourse.id] || []);
  const kelasSaya = enrolledCourses
    .map(id => courses.find(c => c.id === id))
    .filter(Boolean);

  let flatIndex = -1; // dinaikkan sebelum dipakai agar mulai dari 0

  return (
    <aside className="lms-sidebar">
      {kelasSaya.length > 1 && (
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label htmlFor="pilih-kelas">Kelas Saya</label>
          <select id="pilih-kelas" value={activeCourse.id}
            onChange={(e) => handleOpenClass(e.target.value)}
            style={{ paddingLeft: 12 }}>
            {kelasSaya.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
      )}

      <h4 style={{ fontSize: "0.85rem", marginBottom: 12 }}>
        Daftar Materi
        <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
          {" "}— {completedSet.size}/{modules.reduce((n, m) => n + (m.lessons?.length || 0), 0)} selesai
        </span>
      </h4>

      <div className="curriculum-list">
        {modules.map((mod, modIdx) => {
          const terkunci = Boolean(lockedModules[modIdx]);
          return (
            <div key={modIdx} className="curriculum-module">
              <div className="module-header" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {terkunci && <Lock size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
                <span>{mod.title}</span>
              </div>
              <div className="module-lessons">
                {(mod.lessons || []).map((lesson, li) => {
                  flatIndex += 1;
                  const idx     = flatIndex;
                  const judul   = typeof lesson === "string" ? lesson : lesson.title;
                  const selesai = completedSet.has(idx);
                  const pct     = dbLessonProgress[idx]?.pct ?? 0;
                  const aktif   = idx === activeLessonIndex;
                  return (
                    <button type="button" key={li}
                      className={`lesson-item ${aktif ? "active" : ""}`}
                      disabled={terkunci}
                      aria-current={aktif ? "true" : undefined}
                      title={terkunci ? "Selesaikan modul sebelumnya terlebih dahulu" : judul}
                      onClick={() => handleSelectLesson(idx)}
                      style={{ opacity: terkunci ? 0.45 : 1, cursor: terkunci ? "not-allowed" : "pointer" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}>
                        {selesai ? (
                          <CheckCircle size={14} style={{ color: "var(--success)", flexShrink: 0 }} />
                        ) : (typeof lesson === "object" && (lesson?.type === "pptx" || lesson?.type === "pdf")) ? (
                          <FileText size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
                        ) : (
                          <PlayCircle size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                        )}
                        <span>{judul}</span>
                      </span>
                      {!selesai && pct > 0 && (
                        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", flexShrink: 0 }}>{pct}%</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

// ── Main LmsPage ──────────────────────────────────────────────────────────────
export default function LmsPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerRef = useRef(null);

  /**
   * Fullscreen memakai Fullscreen API browser, bukan sekadar overlay CSS.
   * Overlay `position:fixed` gagal menutupi layar bila ada leluhur yang punya
   * transform/filter/backdrop-filter (leluhur seperti itu menjadi containing
   * block untuk elemen fixed), dan tidak merespons tombol Esc.
   * Bila API tidak tersedia, jatuh ke overlay CSS lewat state `isFullscreen`.
   */
  const toggleFullscreen = useCallback(() => {
    const el = playerRef.current;
    if (!el || typeof document === "undefined") return;
    const req  = el.requestFullscreen || el.webkitRequestFullscreen;
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    const current = document.fullscreenElement || document.webkitFullscreenElement;

    if (!req || !exit) { setIsFullscreen(f => !f); return; } // fallback overlay CSS

    if (current) {
      exit.call(document)?.catch?.(() => {});
    } else {
      const p = req.call(el);
      // Safari lama mengembalikan undefined; browser bisa menolak (misal iframe tanpa izin)
      if (p?.catch) p.catch(() => setIsFullscreen(f => !f));
    }
  }, []);

  // Sinkronkan state dengan kondisi nyata — termasuk saat pengguna menekan Esc.
  useEffect(() => {
    const sync = () => {
      const el = document.fullscreenElement || document.webkitFullscreenElement;
      setIsFullscreen(Boolean(el) && el === playerRef.current);
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);
  const {
    enrolledCourses, enrollmentsLoaded, activeCourse, activeLessonIndex, flatLessons, activeLmsTab, completedLessons,
    videoPlaying, videoProgress, videoTime, uploadStatus, attendanceLog, checkedIn,
    forumPosts, forumInput, selectedAnswers, quizResultMessage,
    examSession, examLoading,
    examTimeRemaining, examTimerActive,
    examHistory, examHistoryLoading,
    dbLessonProgress, certificates, handleViewCert,
    setActivePage, setActiveLmsTab, setVideoPlaying, setVideoProgress, setVideoTime,
    setSelectedAnswers, setQuizResultMessage, setUploadStatus, setForumInput,
    handleSelectLesson, handleAssignmentUpload, handleAttendance, muatKehadiran, handleForumSubmit,
    handleStartExam, handleQuizSubmit, handleLoadExamHistory, handleSaveLessonProgress,
    handleOpenClass, courses, currentUser,
  } = useApp();

  const videoTimerRef = useRef(null);
  const activeLesson  = flatLessons[activeLessonIndex];

  // ── Drip Content Scheduling & Sequential Module Progression ───────────────
  const lockedModules = useMemo(() => {
    if (!activeCourse?.modules) return {};
    const completedSet = new Set(completedLessons[activeCourse.id] || []);
    const locks = {};
    let runningLessonIdx = 0;
    let prevModuleCompleted = true;

    activeCourse.modules.forEach((mod, mIdx) => {
      const lessonCount = (mod.lessons || []).length;
      const modLessonIndices = Array.from({ length: lessonCount }, (_, i) => runningLessonIdx + i);
      runningLessonIdx += lessonCount;

      if (mIdx === 0) {
        locks[mIdx] = false; // Modul pertama selalu terbuka
      } else {
        // Terkunci jika modul sebelumnya belum diselesaikan
        locks[mIdx] = !prevModuleCompleted;
      }

      // Cek apakah seluruh pelajaran di modul ini telah tuntas
      const thisModCompleted = modLessonIndices.every((idx) => completedSet.has(idx));
      prevModuleCompleted = thisModCompleted;
    });

    return locks;
  }, [activeCourse, completedLessons]);

  // ── Helper: Lompat ke Timestamp Video dari Catatan ───────────────────────────
  const handleSeekToTime = (timestampStr) => {
    if (!timestampStr) return;
    const timeOnly = timestampStr.includes(" / ") ? timestampStr.split(" / ")[0] : timestampStr;
    const parts = timeOnly.split(":");
    if (parts.length === 2) {
      const min = parseInt(parts[0], 10) || 0;
      const sec = parseInt(parts[1], 10) || 0;
      const totalCurrentSec = min * 60 + sec;
      const totalVideoSec = 765; // simulasi durasi video 12:45
      const pct = Math.min(100, Math.max(0, Math.round((totalCurrentSec / totalVideoSec) * 100)));
      setVideoProgress(pct);
      if (playerRef.current) {
        playerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  // ── Helper: Unduh Rangkuman & Panduan Silabus Offline ───────────────────────
  const handleDownloadLessonSummary = () => {
    if (!activeCourse) return;
    const modulesText = (activeCourse.modules || []).map((m, mIdx) => {
      const lessonsList = (m.lessons || []).map((l, lIdx) => `   ${lIdx + 1}. ${l.title} (${l.duration || "15 menit"})`).join("\n");
      return `Modul ${mIdx + 1}: ${m.title}\n${lessonsList}`;
    }).join("\n\n");

    const textContent = `=====================================================
PANDUAN & RANGKUMAN SILABUS BELAJAR (OFFLINE GUIDE)
=====================================================
Kursus     : ${activeCourse.title}
Instruktur : ${activeCourse.instructor?.name || activeCourse.instructor || "Tim Instruktur Ahli"}
Kategori   : ${activeCourse.category || "Pelatihan Profesional"}
Level      : ${activeCourse.level || "Semua Tingkatan"}
Total Modul: ${activeCourse.modules?.length || 0} Modul (${flatLessons.length} Materi Pelajaran)
Waktu Unduh: ${new Date().toLocaleString("id-ID")}

DESKRIPSI KURSUS:
${activeCourse.desc || "Tidak ada deskripsi rinci."}

KURIKULUM SILABUS PEMBELAJARAN:
${modulesText || "Modul mandiri tersedia di platform."}

PETUNJUK BELAJAR EFEKTIF:
1. Simak video materi pembelajaran sampai selesai dan catat poin-poin krusial.
2. Manfaatkan fitur Catatan Ber-Timestamp untuk menandai konsep penting.
3. Kerjakan tugas & latihan modul untuk mengasah kompetensi praktis.
4. Tanyakan kendala atau topik yang membingungkan di Forum Diskusi.
5. Ikuti Ujian Akhir dengan passing score minimum yang telah ditentukan.

=====================================================
LMS Pintar - Akses Belajar Kapan Saja & Di Mana Saja
=====================================================`;

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Silabus_${(activeCourse.title || "Pelatihan").replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Helper: Ekspor Catatan Pribadi Siswa (.txt) ────────────────────────────
  const handleExportNotes = () => {
    if (!personalNotes || personalNotes.length === 0) {
      alert("Belum ada catatan tersimpan untuk diekspor.");
      return;
    }
    const notesText = personalNotes.map((n, idx) => {
      const timeStr = new Date(n.createdAt).toLocaleString("id-ID");
      return `[${idx + 1}] Materi: ${n.lessonTitle || "Materi"} (Timestamp: ${n.timestamp || "00:00"})\nTanggal: ${timeStr}\nCatatan:\n${n.text}\n-----------------------------------------------------`;
    }).join("\n\n");

    const fullContent = `=====================================================
CATATAN BELAJAR PESERTA - DIDIKARA LMS
=====================================================
Kursus       : ${activeCourse?.title || "Pelatihan"}
Peserta      : ${currentUser?.fullname || currentUser?.email || "Peserta Didik"}
Total Catatan: ${personalNotes.length} Butir
Waktu Ekspor : ${new Date().toLocaleString("id-ID")}

${notesText}

=====================================================
Didikara - Platform Pelatihan & Sertifikasi Profesional
=====================================================`;

    const blob = new Blob([fullContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Catatan_${(activeCourse?.title || "Pelatihan").replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Anti-Cheating & Proctoring Ujian ───────────────────────────────────────
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showCheatingWarning, setShowCheatingWarning] = useState(false);

  useEffect(() => {
    if (!examSession || quizResultMessage) return;

    const handleVisibility = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => {
          const next = prev + 1;
          setShowCheatingWarning(true);
          return next;
        });
      }
    };

    const handleBlur = () => {
      setTabSwitchCount(prev => {
        const next = prev + 1;
        setShowCheatingWarning(true);
        return next;
      });
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
    };
  }, [examSession, quizResultMessage]);

  // ── Forum DB-backed state ──────────────────────────────────────────────────
  const [dbForumPosts, setDbForumPosts]   = useState([]);
  const [forumText, setForumText]         = useState("");
  const [forumLoading, setForumLoading]   = useState(false);
  const [forumReplyTo, setForumReplyTo]   = useState(null);
  const [forumFilter, setForumFilter]     = useState("all"); // 'all' | 'lesson'
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [speakingPostId, setSpeakingPostId]       = useState(null);
  const [voiceNotice, setVoiceNotice]             = useState(null);
  const [showEmojiPicker, setShowEmojiPicker]     = useState(false);
  const [activeEmojiTab, setActiveEmojiTab]       = useState(0);
  const [postReactions, setPostReactions]         = useState({});
  const recognitionRef = useRef(null);

  const handleToggleReaction = (postId, emoji) => {
    setPostReactions(prev => {
      const current = prev[postId] || { counts: {}, myReactions: [] };
      const hasReacted = (current.myReactions || []).includes(emoji);
      const newMyReactions = hasReacted
        ? current.myReactions.filter(e => e !== emoji)
        : [...(current.myReactions || []), emoji];
      const newCounts = { ...current.counts };
      newCounts[emoji] = Math.max(0, (newCounts[emoji] || 0) + (hasReacted ? -1 : 1));
      if (newCounts[emoji] === 0) delete newCounts[emoji];

      return {
        ...prev,
        [postId]: {
          counts: newCounts,
          myReactions: newMyReactions
        }
      };
    });
  };

  const handleInsertEmoji = (emoji) => {
    setForumText(prev => prev + emoji);
  };

  // Bersihkan speech synthesis dan microphone saat unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  const toggleVoiceDictation = () => {
    if (isVoiceRecording) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsVoiceRecording(false);
      return;
    }

    const SpeechRecognition = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      setVoiceNotice({
        title: "Input Suara Belum Didukung di Browser Ini",
        message: "Browser yang Anda gunakan saat ini belum mengaktifkan Web Speech Recognition API bawaan. Untuk menggunakan fitur Dikte Suara langsung berbahasa Indonesia tanpa mengetik, silakan gunakan peramban berikut:",
        type: "dictation"
      });
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "id-ID";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsVoiceRecording(true);
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join("");
        if (transcript) {
          setForumText(prev => prev ? `${prev} ${transcript}` : transcript);
        }
      };

      recognition.onerror = (err) => {
        console.warn("Speech recognition error:", err);
        setIsVoiceRecording(false);
      };

      recognition.onend = () => {
        setIsVoiceRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start voice recognition:", err);
      setIsVoiceRecording(false);
    }
  };

  const speakComment = (postId, text) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setVoiceNotice({
        title: "Pembaca Suara Belum Didukung di Browser Ini",
        message: "Browser yang Anda gunakan saat ini belum mendukung fitur Text-to-Speech reader. Untuk mendengarkan pembacaan komentar diskusi secara audio, silakan gunakan peramban berikut:",
        type: "tts"
      });
      return;
    }

    if (speakingPostId === postId) {
      window.speechSynthesis.cancel();
      setSpeakingPostId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setSpeakingPostId(null);
    };

    utterance.onerror = () => {
      setSpeakingPostId(null);
    };

    setSpeakingPostId(postId);
    window.speechSynthesis.speak(utterance);
  };

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
  // Kewenangan mengajar kini berasal dari penugasan per kursus di server, jadi
  // tombol pengumuman tidak lagi muncul untuk orang yang akan ditolak API.
  // Admin selalu boleh; peserta tidak pernah; sisanya ditanyakan ke server.
  const perluCekPengajar = Boolean(
    currentUser && !["admin", "student"].includes(currentUser.role) && activeCourse
  );
  const [ditugaskanSebagaiPengajar, setDitugaskanSebagaiPengajar] = useState(false);

  useEffect(() => {
    if (!perluCekPengajar) return;
    let batal = false;
    fetch(`/api/course-instructors?courseId=${encodeURIComponent(activeCourse.id)}`)
      .then(r => r.json())
      .then(d => {
        if (batal) return;
        const daftar = d?.assignments || [];
        setDitugaskanSebagaiPengajar(daftar.some(a => a.user_email === currentUser.email));
      })
      .catch(() => {});
    return () => { batal = true; };
  }, [perluCekPengajar, activeCourse, currentUser]);

  const isInstructor =
    currentUser?.role === "admin" || (perluCekPengajar && ditugaskanSebagaiPengajar);

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

  // ── Tracking progress video ─────────────────────────────────────────
  useEffect(() => {
    if (videoPlaying) {
      videoTimerRef.current = setInterval(() => {
        setVideoProgress(prev => {
          if (prev >= 100) {
            if (activeCourse) handleSaveLessonProgress(activeLessonIndex, 100, true);
            return 100;
          }
          const next = Math.min(100, prev + 1);
          if (next >= 80 && prev < 80 && activeCourse) {
            handleSaveLessonProgress(activeLessonIndex, next, true);
          }
          return next;
        });
      }, 4000);
    } else {
      clearInterval(videoTimerRef.current);
      if (activeCourse && videoProgress > 0 && videoProgress < 100) {
        handleSaveLessonProgress(activeLessonIndex, videoProgress, videoProgress >= 80);
      }
    }
    return () => clearInterval(videoTimerRef.current);
  }, [videoPlaying, activeCourse, activeLessonIndex]);

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

  // ── Tugas: berkas, tautan, catatan, dan pengumpulan terakhir ──────────────
  const [berkasTugas, setBerkasTugas]   = useState(null);
  const [tautanTugas, setTautanTugas]   = useState("");
  const [catatanTugas, setCatatanTugas] = useState("");
  const [tugasSaya, setTugasSaya]       = useState(null);

  const muatTugasSaya = useCallback(async () => {
    if (!activeCourse) return;
    try {
      const res  = await fetch(`/api/assignments?courseId=${encodeURIComponent(activeCourse.id)}&lessonIndex=0`);
      const data = await res.json();
      if (data.success) setTugasSaya((data.submissions || [])[0] || null);
    } catch { /* opsional */ }
  }, [activeCourse]);

  useEffect(() => {
    if (activeLmsTab === "tab-assignment") muatTugasSaya();
  }, [activeLmsTab, muatTugasSaya]);

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

  const [liveMsg, setLiveMsg] = useState("");

  // Satu jalur untuk daftar dan batal — keduanya memakai aksi pada endpoint
  // yang sama dan sama-sama memuat ulang daftar agar kuota, posisi antrean,
  // dan tombol Bergabung selalu mencerminkan keadaan di server.
  const ubahPendaftaranLive = async (sessionId, aksi) => {
    setLiveMsg("");
    try {
      const res  = await fetch("/api/live-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: aksi, sessionId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) setLiveMsg("✕ " + (data.error || "Gagal memproses"));
      else if (data.message)     setLiveMsg("✓ " + data.message);
      else if (aksi === "cancel") setLiveMsg("✓ Pendaftaran dibatalkan.");
      loadLiveSessions();
    } catch {
      setLiveMsg("✕ Gagal menghubungi server");
    }
  };

  // Bergabung selalu lewat endpoint join: kehadiran tercatat di sana, dan link
  // meeting tidak pernah ikut terkirim ke peserta yang belum berhak.
  const bergabungLive = (sessionId) => {
    window.open(`/api/live-sessions/join?id=${sessionId}`, "_blank", "noopener");
    setTimeout(loadLiveSessions, 1500);
  };

  // ── Catatan Pribadi (Personal Notes & Bookmark) ───────────────────────────
  const [personalNotes, setPersonalNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState("");

  useEffect(() => {
    if (!activeCourse) return;
    try {
      const saved = localStorage.getItem(`lms_notes_${activeCourse.id}`);
      if (saved) setPersonalNotes(JSON.parse(saved));
      else setPersonalNotes([]);
    } catch {}
  }, [activeCourse]);

  const savePersonalNotes = (updated) => {
    setPersonalNotes(updated);
    if (activeCourse) {
      try {
        localStorage.setItem(`lms_notes_${activeCourse.id}`, JSON.stringify(updated));
      } catch {}
    }
  };

  const handleAddNote = (e) => {
    e?.preventDefault();
    if (!newNoteText.trim()) return;
    const note = {
      id: Date.now().toString(),
      lessonTitle: activeLesson?.title || "Materi Umum",
      lessonIndex: activeLessonIndex,
      timestamp: videoTime,
      text: newNoteText.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [note, ...personalNotes];
    savePersonalNotes(updated);
    setNewNoteText("");
  };

  const handleDeleteNote = (id) => {
    const updated = personalNotes.filter(n => n.id !== id);
    savePersonalNotes(updated);
  };

  // ── Kalender Helper ────────────────────────────────────────────────────────
  const makeGoogleCalendarUrl = (session) => {
    if (!session?.scheduled_at) return "#";
    const start = new Date(session.scheduled_at).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const endDate = new Date(new Date(session.scheduled_at).getTime() + (session.duration_minutes || 60) * 60000);
    const end = endDate.toISOString().replace(/-|:|\.\d\d\d/g, "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(session.title)}&dates=${start}/${end}&details=${encodeURIComponent(session.description || "Live Class LMS")}&location=${encodeURIComponent(session.meet_link || "Online")}`;
  };

  const downloadIcsFile = (session) => {
    if (!session?.scheduled_at) return;
    const start = new Date(session.scheduled_at).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const endDate = new Date(new Date(session.scheduled_at).getTime() + (session.duration_minutes || 60) * 60000);
    const end = endDate.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//AI LMS//ID\nBEGIN:VEVENT\nUID:${session.id}@ailms.id\nDTSTAMP:${start}\nDTSTART:${start}\nDTEND:${end}\nSUMMARY:${session.title}\nDESCRIPTION:${session.description || "Live Class"}\nLOCATION:${session.meet_link || "Online"}\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (activeLmsTab === "tab-live") loadLiveSessions();
  }, [activeLmsTab, loadLiveSessions]);

  // ── Fase 4: AI Chat state ──────────────────────────────────────────────────
  const [aiMessages, setAiMessages]     = useState([
    { role: "assistant", content: "Halo! Saya Asisten Belajar DIDIKARA. Ada yang bisa saya bantu tentang materi atau kursus ini? 🎓" }
  ]);
  const [aiInput, setAiInput]           = useState("");
  const [aiLoading, setAiLoading]       = useState(false);
  const [aiRecs, setAiRecs]             = useState([]);
  const [aiRecsLoading, setAiRecsLoading] = useState(false);
  // Menandai bahwa jawaban terakhir berasal dari data simulasi, bukan Gemini.
  const [aiMock, setAiMock]             = useState(null); // null | { reason: string }

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

  const sendAiMessage = async (customText = null) => {
    const textToSend = typeof customText === "string" ? customText : aiInput;
    if (!textToSend || !textToSend.trim() || aiLoading) return;
    const userMsg = textToSend.trim();
    setAiMessages(prev => [...prev, { role: "user", content: userMsg }]);
    if (!customText) setAiInput("");
    setAiLoading(true);
    try {
      const res  = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: aiMessages.slice(-6),
          courseId: activeCourse?.id,
          lessonTitle: activeLesson?.title || "Materi Umum",
        }),
      });
      const data = await res.json();
      setAiMock(data.mock ? { reason: data.mockReason || "" } : null);
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
      if (data.success) {
        setAiRecs(data.recommendations || []);
        setAiMock(data.mock ? { reason: data.mockReason || "" } : null);
      }
    } catch { /* ignore */ }
    setAiRecsLoading(false);
  }, []);

  useEffect(() => {
    if (activeLmsTab === "tab-ai") loadAiRecommendations();
  }, [activeLmsTab, loadAiRecommendations]);

  // Selama pendaftaran belum selesai dimuat, jangan menyatakan "tidak ada
  // kelas" — itu keliru dan membuat pengguna mengira aksesnya hilang.
  if (!enrollmentsLoaded) {
    return (
      <main className="page-view active">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
          Memuat kelas Anda…
        </div>
      </main>
    );
  }

  if (!activeCourse) {
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

  const sudahSelesai  = (completedLessons[activeCourse.id] || []).includes(activeLessonIndex);
  const examSettings  = activeCourse.examSettings || {};
  const passingScore  = examSession?.passingScore || examSettings.passingScore || 70;

  // ── Perhitungan Syarat Kelulusan & Klaim Sertifikat ──────────────────────────
  const userCert = (certificates || []).find(c => c.courseId === activeCourse.id);
  const totalLessonCount = flatLessons.length;
  const completedCount = (completedLessons[activeCourse.id] || []).length;
  const isMaterialComplete = totalLessonCount > 0 && completedCount >= totalLessonCount;
  const isAssignmentComplete = Boolean(tugasSaya);
  const isExamComplete = Boolean(userCert || (quizResultMessage && quizResultMessage.success));
  const isGraduationReady = isMaterialComplete && isExamComplete;

  return (
    <main className="page-view active">
      {/* ⚠️ Modal Peringatan Integritas Ujian / Anti-Cheating */}
      {showCheatingWarning && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.8)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <div className="glass-panel" style={{ maxWidth: 440, padding: 24, textAlign: "center", border: "1px solid rgba(239,68,68,0.4)" }}>
            <div style={{ fontSize: "2.2rem", marginBottom: 8 }}>⚠️</div>
            <h3 style={{ color: "#f87171", marginBottom: 8 }}>Peringatan Integritas Ujian</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
              Anda terdeteksi berpindah tab browser atau membuka aplikasi lain saat sesi ujian sedang aktif.
            </p>
            <div style={{
              background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 8, padding: "8px 12px", marginBottom: 16, fontSize: "0.8rem", color: "#fca5a5", fontWeight: 700
            }}>
              Terdeteksi: {tabSwitchCount} / 3 Peringatan Integritas
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 16 }}>
              Tetaplah berada pada halaman ujian sampai seluruh jawaban dikirimkan agar asesmen Anda sah.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCheatingWarning(false)}
              style={{ width: "100%" }}>
              Saya Paham &amp; Lanjutkan Ujian
            </button>
          </div>
        </div>
      )}

      <div className="lms-container with-sidebar">
        <div className="lms-player-side">
          <div className={`video-container ${isFullscreen ? "is-fullscreen" : ""}`} ref={playerRef}>
            <VideoPlayerV2
              activeLesson={activeLesson}
              activeCourse={activeCourse}
              activeLessonIndex={activeLessonIndex}
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
            <button
              type="button"
              onClick={toggleFullscreen}
              className="btn-fullscreen-toggle"
              title={isFullscreen ? "Keluar dari mode layar penuh" : "Tampilkan materi dalam mode layar penuh"}
            >
              <MonitorPlay size={16}/>
              <span>{isFullscreen ? "Keluar Fullscreen" : "Buka Fullscreen"}</span>
            </button>
          )}

          {/* Kendali eksplisit atas kemajuan belajar. Sebelumnya penyelesaian
              pelajaran hanya bisa terjadi otomatis dari simulator video di 80%,
              sehingga peserta tidak punya kepastian maupun kendali. */}
          {activeLesson && (
            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:12, flexWrap:"wrap" }}>
              <span style={{ fontSize:"0.75rem", color:"var(--text-muted)", marginRight:"auto" }}>
                Materi {activeLessonIndex + 1} dari {flatLessons.length}
              </span>

              <button type="button" className="btn btn-secondary"
                style={{ width:"auto", padding:"6px 12px", fontSize:"0.75rem", display:"flex", alignItems:"center", gap:4, opacity: activeLessonIndex <= 0 ? 0.4 : 1 }}
                disabled={activeLessonIndex <= 0}
                onClick={() => handleSelectLesson(activeLessonIndex - 1)}>
                <ArrowLeft size={14} /> Materi Sebelumnya
              </button>

              {sudahSelesai ? (
                <span style={{ fontSize:"0.75rem", color:"var(--success)", display:"flex", alignItems:"center", gap:6, fontWeight: 600 }}>
                  <CheckCircle size={14}/> Selesai
                </span>
              ) : (
                <button type="button" className="btn btn-secondary"
                  style={{ width:"auto", padding:"6px 12px", fontSize:"0.75rem", display:"flex", alignItems:"center", gap:4 }}
                  onClick={() => handleSaveLessonProgress(activeLessonIndex, 100, true)}>
                  <CheckCircle size={14}/> Tandai Selesai
                </button>
              )}

              <button type="button" className="btn btn-primary"
                style={{ width:"auto", padding:"6px 12px", fontSize:"0.75rem", display:"flex", alignItems:"center", gap:4, opacity: activeLessonIndex >= flatLessons.length - 1 ? 0.4 : 1 }}
                disabled={activeLessonIndex >= flatLessons.length - 1}
                onClick={() => handleSelectLesson(activeLessonIndex + 1)}>
                Materi Selanjutnya <ArrowRight size={14} />
              </button>
            </div>
          )}

          <div className="lms-tabs">
            <button type="button" className={`lms-tab ${activeLmsTab === "tab-overview"    ? "active" : ""}`} onClick={() => setActiveLmsTab("tab-overview")}>Ringkasan</button>
            <button type="button" className={`lms-tab ${activeLmsTab === "tab-notes"       ? "active" : ""}`} onClick={() => setActiveLmsTab("tab-notes")}>
              <BookOpen size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />Catatan ({personalNotes.length})
            </button>
            <button type="button" className={`lms-tab ${activeLmsTab === "tab-assignment"  ? "active" : ""}`} onClick={() => setActiveLmsTab("tab-assignment")}>Tugas</button>
            {/* Membuka tab TIDAK lagi memulai ujian: handleStartExam mencatat
                percobaan di exam_attempts dan menyalakan timer, jadi sekadar
                melihat-lihat dulu bisa membakar kesempatan tanpa bisa dibatalkan. */}
            <button type="button" className={`lms-tab ${activeLmsTab === "tab-exam"        ? "active" : ""}`} onClick={() => { setActiveLmsTab("tab-exam"); handleLoadExamHistory(); }}>Ujian Akhir</button>
            <button type="button" className={`lms-tab ${activeLmsTab === "tab-history"     ? "active" : ""}`} onClick={() => { setActiveLmsTab("tab-history"); handleLoadExamHistory(); }}>
              <History size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />Riwayat
            </button>
            <button type="button" className={`lms-tab ${activeLmsTab === "tab-attendance"  ? "active" : ""}`} onClick={() => setActiveLmsTab("tab-attendance")}>
              <MapPin size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />Kehadiran
            </button>
            <button type="button" className={`lms-tab ${activeLmsTab === "tab-forum"       ? "active" : ""}`} onClick={() => setActiveLmsTab("tab-forum")}>
              <MessageCircle size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />Forum Diskusi
            </button>
            <button type="button" className={`lms-tab ${activeLmsTab === "tab-announcement" ? "active" : ""}`} onClick={() => setActiveLmsTab("tab-announcement")}>
              <Megaphone size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />Pengumuman
            </button>
            <button type="button" className={`lms-tab ${activeLmsTab === "tab-live" ? "active" : ""}`} onClick={() => setActiveLmsTab("tab-live")}>
              <Video size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />Live Class
            </button>
            <button type="button" className={`lms-tab ${activeLmsTab === "tab-ai" ? "active" : ""}`} onClick={() => setActiveLmsTab("tab-ai")}>
              <Bot size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />AI Assistant
            </button>
            <button type="button" className={`lms-tab ${activeLmsTab === "tab-reviews" ? "active" : ""}`} onClick={() => setActiveLmsTab("tab-reviews")}>
              <Star size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />Ulasan
            </button>
          </div>

          {/* ── Tab: Ringkasan ──────────────────────────────────────────── */}
          <div className={`lms-tab-content ${activeLmsTab === "tab-overview" ? "active" : ""}`}>
            <h3 style={{ marginBottom: 8 }}>{activeCourse.title}</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>{activeCourse.desc}</p>

            <div style={{ display: "flex", gap: 10, marginTop: 12, marginBottom: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDownloadLessonSummary}
                style={{ width: "auto", padding: "6px 14px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Download size={14} /> 📥 Unduh Panduan Silabus Belajar (.txt)
              </button>
            </div>

            {/* 🎓 Status Kelulusan & Syarat Sertifikat */}
            <div className="glass-card" style={{
              padding: 16, marginTop: 16, marginBottom: 16,
              background: isGraduationReady ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.02)",
              border: isGraduationReady ? "1px solid rgba(16,185,129,0.35)" : "1px solid var(--border-color)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h4 style={{ margin: 0, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 6, color: isGraduationReady ? "#34d399" : "var(--text-primary)" }}>
                  <Award size={16} /> Status Kelulusan &amp; Sertifikat
                </h4>
                <span style={{
                  fontSize: "0.72rem", fontWeight: 700, padding: "3px 8px", borderRadius: 12,
                  background: isGraduationReady ? "rgba(16,185,129,0.2)" : "rgba(249,115,22,0.15)",
                  color: isGraduationReady ? "#34d399" : "var(--primary)"
                }}>
                  {isGraduationReady ? "🎉 Lulus & Siap Klaim" : "Progres Sedang Berjalan"}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: isMaterialComplete ? "#34d399" : "var(--text-secondary)" }}>
                  {isMaterialComplete ? <CheckCircle size={15} style={{ color: "#34d399", flexShrink: 0 }} /> : <Clock size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
                  <span>Modul Selesai: <strong>{completedCount}/{totalLessonCount}</strong></span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: isAssignmentComplete ? "#34d399" : "var(--text-secondary)" }}>
                  {isAssignmentComplete ? <CheckCircle size={15} style={{ color: "#34d399", flexShrink: 0 }} /> : <Clock size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
                  <span>Tugas: <strong>{isAssignmentComplete ? "Dikumpulkan" : "Belum"}</strong></span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: isExamComplete ? "#34d399" : "var(--text-secondary)" }}>
                  {isExamComplete ? <CheckCircle size={15} style={{ color: "#34d399", flexShrink: 0 }} /> : <Clock size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
                  <span>Ujian Akhir: <strong>{isExamComplete ? "Lulus" : "Belum Lulus"}</strong></span>
                </div>
              </div>

              {userCert ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleViewCert(userCert)}
                  style={{ width: "auto", padding: "8px 18px", fontSize: "0.82rem", background: "linear-gradient(135deg,#059669,#10b981)", borderColor: "transparent" }}>
                  🎓 Buka Sertifikat Digital Resmi
                </button>
              ) : isGraduationReady ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const cert = {
                      id: `CERT-${Date.now()}`,
                      courseId: activeCourse.id,
                      title: activeCourse.title,
                      date: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
                      idCode: `CERT-${Date.now()}`
                    };
                    handleViewCert(cert);
                  }}
                  style={{ width: "auto", padding: "8px 18px", fontSize: "0.82rem", background: "linear-gradient(135deg,#059669,#10b981)", borderColor: "transparent" }}>
                  🎓 Klaim &amp; Unduh Sertifikat
                </button>
              ) : (
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  💡 Selesaikan seluruh materi dan lulus ujian akhir kompetensi untuk menerbitkan sertifikat.
                </div>
              )}
            </div>

            {/* Info konfigurasi ujian */}
            {(examSettings.timeLimit > 0 || examSettings.maxAttempts > 0 || examSettings.passingScore) && (
              <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 8, background: "var(--accent-badge-bg)", border: "1px solid var(--accent-badge-border)", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                <strong style={{ color: "var(--text-accent)", display: "block", marginBottom: 6 }}>Konfigurasi Ujian Kelas Ini</strong>
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

          {/* ── Tab: Catatan Pribadi (Notes & Timestamp) ────────────────── */}
          <div className={`lms-tab-content ${activeLmsTab === "tab-notes" ? "active" : ""}`}>
            <h3 style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <BookOpen size={18} style={{ color: "var(--primary)" }} /> Catatan Pribadi &amp; Bookmark
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 16 }}>
              Simpan poin penting selama menyimak materi. Catatan tersimpan otomatis untuk akun Anda.
            </p>

            {/* Input Catatan Baru */}
            <div className="glass-card" style={{ padding: 16, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  <Bookmark size={12} /> {activeLesson?.title || "Materi Saat Ini"} (Menit {videoTime.split(" / ")[0]})
                </span>
              </div>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Tuliskan catatan atau kesimpulan materi di sini..."
                value={newNoteText}
                onChange={e => setNewNoteText(e.target.value)}
                style={{ width: "100%", padding: 10, fontSize: "0.82rem", marginBottom: 10 }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddNote}
                  style={{ width: "auto", padding: "6px 16px", fontSize: "0.8rem" }}>
                  + Simpan Catatan
                </button>
              </div>
            </div>

            {/* Daftar Catatan Tersimpan */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                Catatan Tersimpan ({personalNotes.length})
              </span>
              {personalNotes.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportNotes}
                  className="btn btn-secondary"
                  style={{ width: "auto", padding: "4px 12px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Download size={13} /> Ekspor Catatan (.txt)
                </button>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {personalNotes.length === 0 ? (
                <EmptyState
                  icon="book"
                  title="Belum Ada Catatan"
                  description="Catat poin-poin penting atau pasal regulasi selama menyimak materi. Klik label timestamp untuk melompat ke menit video secara instan."
                  compact={true}
                />
              ) : (
                personalNotes.map(n => (
                  <div key={n.id} className="glass-card" style={{ padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        <span
                          onClick={() => handleSeekToTime(n.timestamp)}
                          style={{
                            fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                            background: "rgba(249,115,22,0.15)", color: "var(--primary)", marginRight: 8,
                            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3
                          }}
                          title="Klik untuk memutar materi dari detik ini">
                          ⏱ {n.timestamp} ↗
                        </span>
                        <strong style={{ fontSize: "0.82rem" }}>{n.lessonTitle}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(n.id)}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2 }}
                        title="Hapus catatan">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                      {n.text}
                    </p>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 6 }}>
                      Disimpan: {new Date(n.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Tab: Tugas ─────────────────────────────────────────────── */}
          <div className={`lms-tab-content ${activeLmsTab === "tab-assignment" ? "active" : ""}`}>
            <h3 style={{ marginBottom: 12 }}>Manajemen Tugas (Assignment)</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 20 }}>
              Kumpulkan laporan studi kasus Anda. Unggah berkas PDF bila penyimpanan sudah
              dikonfigurasi, atau kumpulkan lewat tautan dan catatan jawaban.
            </p>

            <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                Berkas PDF (opsional)
              </label>
              <input type="file" accept="application/pdf"
                onChange={e => setBerkasTugas(e.target.files?.[0] || null)}
                style={{ fontSize: "0.8rem", marginBottom: 14, display: "block" }} />

              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                Atau tautan berkas (Google Drive, OneDrive, dsb.)
              </label>
              <input type="url" value={tautanTugas} placeholder="https://..."
                onChange={e => setTautanTugas(e.target.value)}
                className="input-field" style={{ marginBottom: 14, width: "100%", paddingLeft: 12 }} />

              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                Catatan untuk instruktur
              </label>
              <textarea value={catatanTugas} onChange={e => setCatatanTugas(e.target.value)}
                rows={3} placeholder="Ringkasan pengerjaan, asumsi yang dipakai, atau kendala."
                className="input-field" style={{ width: "100%", padding: 12, marginBottom: 14 }} />

              <button className="btn btn-primary" style={{ width: "auto" }}
                disabled={uploadStatus === "Uploading"}
                onClick={() => handleAssignmentUpload(berkasTugas, {
                  note: catatanTugas, link: tautanTugas, lessonIndex: 0,
                }).then(muatTugasSaya)}>
                <UploadCloud size={16} style={{ marginRight: 6 }} />
                {uploadStatus === "Uploading" ? "Mengunggah..." : "Kumpulkan Tugas"}
              </button>

              {uploadStatus === "Success" && (
                <div style={{ marginTop: 12, color: "var(--success)", fontSize: "0.8rem" }}>
                  Tugas tersimpan. Status: menunggu penilaian.
                </div>
              )}
              {uploadStatus.startsWith("Error") && (
                <div style={{ marginTop: 12, color: "#fca5a5", fontSize: "0.8rem" }}>
                  {uploadStatus.replace("Error: ", "")}
                </div>
              )}
            </div>

            {tugasSaya && (
              <div className="glass-card" style={{ padding: 16 }}>
                <h4 style={{ fontSize: "0.85rem", marginBottom: 10 }}>Pengumpulan Terakhir</h4>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "grid", gap: 6 }}>
                  <span>Dikumpulkan: {new Date(tugasSaya.submitted_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span>
                  {tugasSaya.file_url && (
                    <a href={tugasSaya.file_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>
                      {tugasSaya.file_name || "Buka berkas"}
                    </a>
                  )}
                  {tugasSaya.note && <span>Catatan: {tugasSaya.note}</span>}
                  <span>
                    Status:{" "}
                    {tugasSaya.grade != null
                      ? <strong style={{ color: "#6ee7b7" }}>Dinilai — {tugasSaya.grade}</strong>
                      : <strong style={{ color: "#fbbf24" }}>Menunggu penilaian</strong>}
                  </span>
                  {tugasSaya.feedback && <span>Umpan balik: {tugasSaya.feedback}</span>}
                </div>
              </div>
            )}
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

            {/* Gerbang sebelum ujian: tampilkan aturannya lebih dulu, karena
                sekali dimulai percobaan langsung tercatat dan timer berjalan. */}
            {!examLoading && !examSession && (
              <div style={{ padding: 24, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)" }}>
                <h4 style={{ fontSize: "0.9rem", marginBottom: 12 }}>Sebelum Anda Mulai</h4>

                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 10, fontSize: "0.82rem" }}>
                  <li style={{ display: "flex", gap: 8 }}>
                    <CheckCircle size={15} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />
                    <span>Nilai kelulusan minimum <strong>{passingScore}%</strong>.</span>
                  </li>
                  <li style={{ display: "flex", gap: 8 }}>
                    <Clock size={15} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />
                    <span>
                      {examSettings.timeLimit > 0
                        ? <>Batas waktu <strong>{examSettings.timeLimit} menit</strong>. Timer mulai berjalan begitu Anda menekan tombol di bawah, dan jawaban terkirim otomatis saat waktu habis.</>
                        : <>Tanpa batas waktu.</>}
                    </span>
                  </li>
                  <li style={{ display: "flex", gap: 8 }}>
                    <History size={15} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />
                    <span>
                      {examSettings.maxAttempts > 0
                        ? <>Maksimum <strong>{examSettings.maxAttempts} percobaan</strong>. Sudah terpakai <strong>{examHistory.length}</strong>
                          {examHistory.length >= examSettings.maxAttempts
                            ? <> — batas tercapai.</>
                            : <>, sisa <strong>{examSettings.maxAttempts - examHistory.length}</strong>.</>}
                        </>
                        : <>Percobaan tidak dibatasi. Sudah dikerjakan {examHistory.length} kali.</>}
                    </span>
                  </li>
                  <li style={{ display: "flex", gap: 8 }}>
                    <Lock size={15} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />
                    <span>Urutan soal dan pilihan jawaban diacak, serta dinilai secara aman di server.</span>
                  </li>
                </ul>

                {/* Checklist Asesmen Mandiri / Self-Assessment Standar Asesor (FR.APL.02) */}
                <div style={{ padding: 14, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", marginBottom: 20 }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-accent)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <Award size={14} /> Checklist Asesmen Mandiri Kesiapan Ujian:
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginBottom: 10 }}>
                    Pastikan Anda telah menyimak seluruh unit materi silabus pelatihan ini:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(activeCourse.modules || []).map((mod, mIdx) => (
                      <div key={mIdx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem" }}>
                        <CheckCircle size={13} style={{ color: "var(--success)" }} />
                        <span>{mod.title} ({mod.lessons?.length || 0} sub-materi)</span>
                      </div>
                    ))}
                  </div>
                </div>

                {examSettings.maxAttempts > 0 && examHistory.length >= examSettings.maxAttempts ? (
                  <div style={{ fontSize: "0.8rem", color: "var(--warning)" }}>
                    Batas percobaan sudah tercapai. Hubungi instruktur bila memerlukan kesempatan tambahan.
                  </div>
                ) : (
                  <button className="btn btn-primary" style={{ width: "auto" }} onClick={handleStartExam}>
                    Mulai Ujian Sekarang
                  </button>
                )}

                {/* Alasan penolakan dari server — mis. belum terdaftar di kelas,
                    prasyarat belum lulus, atau batas percobaan tercapai. */}
                {!examSession && quizResultMessage && !quizResultMessage.success && (
                  <div style={{
                    marginTop: 14, fontSize: "0.8rem", padding: "10px 14px", borderRadius: 8,
                    background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fecaca",
                  }}>
                    {quizResultMessage.text}
                  </div>
                )}
              </div>
            )}

            {!examLoading && examSession && (
              <>
                <div style={{
                  padding: "8px 14px", borderRadius: 8, marginBottom: 12,
                  background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.25)",
                  display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem"
                }}>
                  <span style={{ color: "#93c5fd", display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                    <ShieldAlert size={14} /> Mode Ujian Terproteksi (Integritas Aktif)
                  </span>
                  <span style={{ color: tabSwitchCount > 0 ? "#fca5a5" : "var(--text-muted)", fontSize: "0.72rem" }}>
                    {tabSwitchCount > 0 ? `⚠️ Peringatan: ${tabSwitchCount}/3` : "Fokus Ujian Terjaga"}
                  </span>
                </div>

                {examSession.questions.length > 0 ? (
                  <div
                    id="quiz-container"
                    onCopy={(e) => { e.preventDefault(); alert("⚠️ Penyalinan teks dinonaktifkan demi integritas asesmen."); }}
                    onCut={(e) => { e.preventDefault(); }}
                    onPaste={(e) => { e.preventDefault(); }}
                    onContextMenu={(e) => { e.preventDefault(); }}
                    style={{ userSelect: "none" }}
                  >
                    {examSession.questions.map((qItem, qIdx) => {
                      const qType = qItem.type || "single";
                      return (
                        <div key={qIdx} className="quiz-question" style={{ marginBottom: 20 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                            <p style={{ fontWeight: 600, fontSize: "0.95rem", margin: 0, lineHeight: 1.5 }}>
                              {qIdx + 1}. {qItem.q}
                            </p>
                            <span style={{
                              fontSize: "0.7rem", padding: "3px 8px", borderRadius: 6, flexShrink: 0, fontWeight: 700,
                              background: qType === "essay" ? "rgba(2, 132, 199, 0.15)" : qType === "multiple" ? "rgba(234, 88, 12, 0.15)" : "rgba(255,255,255,0.06)",
                              color: qType === "essay" ? "#38bdf8" : qType === "multiple" ? "#fb923c" : "var(--text-secondary)",
                              border: "1px solid var(--border-color)",
                            }}>
                              {qType === "essay" ? "📝 Soal Uraian / Essay" : qType === "multiple" ? "☑️ Pilih Semua yang Benar" : "🔘 1 Jawaban Benar"}
                            </span>
                          </div>

                          {qType === "essay" ? (
                            <div style={{ marginTop: 10 }}>
                              <textarea
                                rows={4}
                                value={typeof selectedAnswers[qIdx] === "string" ? selectedAnswers[qIdx] : ""}
                                onChange={(e) => setSelectedAnswers({ ...selectedAnswers, [qIdx]: e.target.value })}
                                placeholder="Ketikkan jawaban uraian, argumentasi, atau analisis lengkap Anda di sini..."
                                style={{
                                  width: "100%", padding: "12px 14px", borderRadius: 8,
                                  border: "1.5px solid var(--border-color)", background: "var(--bg-tertiary)",
                                  color: "var(--text-primary)", fontSize: "0.88rem", lineHeight: 1.5, resize: "vertical",
                                  boxSizing: "border-box", minHeight: 90,
                                }}
                              />
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
                                <span>Jawaban tersimpan untuk penilaian kelulusan &amp; kompetensi</span>
                                <span>{(selectedAnswers[qIdx] || "").length} karakter</span>
                              </div>
                            </div>
                          ) : qType === "multiple" ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                              {(qItem.options || []).map((opt, optIdx) => {
                                const currentArr = Array.isArray(selectedAnswers[qIdx]) ? selectedAnswers[qIdx] : [];
                                const isSelected = currentArr.includes(optIdx);
                                return (
                                  <button
                                    type="button"
                                    key={optIdx}
                                    className={`quiz-option ${isSelected ? "selected" : ""}`}
                                    onClick={() => {
                                      const next = isSelected ? currentArr.filter(i => i !== optIdx) : [...currentArr, optIdx].sort();
                                      setSelectedAnswers({ ...selectedAnswers, [qIdx]: next });
                                    }}
                                  >
                                    <div style={{
                                      border: "2px solid", borderRadius: 4, width: 18, height: 18,
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                      borderColor: isSelected ? "var(--primary)" : "var(--border-color)",
                                      backgroundColor: isSelected ? "var(--primary)" : "transparent",
                                      color: "#fff", fontSize: "0.75rem", fontWeight: 800, flexShrink: 0,
                                    }}>
                                      {isSelected && "✓"}
                                    </div>
                                    <span>{opt}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                              {(qItem.options || []).map((opt, optIdx) => {
                                const isSelected = selectedAnswers[qIdx] === optIdx;
                                return (
                                  <button type="button" key={optIdx} className={`quiz-option ${isSelected ? "selected" : ""}`} onClick={() => setSelectedAnswers({ ...selectedAnswers, [qIdx]: optIdx })}>
                                    <div style={{ border: "2px solid", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", borderColor: isSelected ? "var(--primary)" : "var(--border-color)", flexShrink: 0 }}>
                                      {isSelected && <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "var(--primary)" }} />}
                                    </div>
                                    <span>{opt}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                    <div style={{
                      marginTop: 16, padding: 18, borderRadius: 10,
                      backgroundColor: quizResultMessage.success ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                      border: quizResultMessage.success ? "1px solid rgba(16,185,129,0.35)" : "1px solid rgba(239,68,68,0.35)",
                      color: quizResultMessage.success ? "#a7f3d0" : "#fecaca"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <h4 style={{ margin: 0, fontSize: "1rem" }}>
                          {quizResultMessage.success ? "🎉 Selamat! Anda Lulus Sertifikasi" : "⚠️ Ujian Gagal (Belum Mencapai Passing Score)"}
                        </h4>
                        {quizResultMessage.percentage !== undefined && (
                          <span style={{
                            fontSize: "1.1rem", fontWeight: 800,
                            color: quizResultMessage.success ? "#34d399" : "#f87171"
                          }}>
                            {quizResultMessage.percentage}%
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: "0.85rem", marginBottom: 12, lineHeight: 1.5 }}>{quizResultMessage.text}</p>

                      {/* Detail Breakdown & Saran Remedial */}
                      {quizResultMessage.feedbackItems && quizResultMessage.feedbackItems.length > 0 && (
                        <div style={{
                          marginTop: 12, padding: 12, borderRadius: 8,
                          background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.08)"
                        }}>
                          <div style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: 6, color: "var(--text-accent)" }}>
                            📋 Ringkasan Hasil Pengerjaan:
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "flex", gap: 12, marginBottom: 8 }}>
                            <span>Benar: <strong style={{ color: "#34d399" }}>{quizResultMessage.correctCount}</strong></span>
                            <span>Perlu Perbaikan: <strong style={{ color: "#f87171" }}>{quizResultMessage.incorrectCount}</strong></span>
                          </div>

                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                            {quizResultMessage.feedbackItems.map(fb => (
                              <span key={fb.questionNumber} style={{
                                fontSize: "0.72rem", padding: "3px 8px", borderRadius: 4,
                                background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.35)", color: "#fca5a5"
                              }}>
                                Soal #{fb.questionNumber}: {fb.status}
                              </span>
                            ))}
                          </div>

                          {!quizResultMessage.success && (
                            <p style={{ fontSize: "0.76rem", color: "#fbbf24", marginTop: 10, marginBottom: 0 }}>
                              💡 <strong>Saran:</strong> Pelajari kembali modul materi pada silabus di samping sebelum mengulang ujian.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {quizResultMessage.success && (
                      <div className="celebration-badge" style={{
                        marginTop: 14, padding: "14px 18px", borderRadius: 10,
                        background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.08))",
                        border: "1px solid rgba(16,185,129,0.4)",
                        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10
                      }}>
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#34d399" }}>
                            🏆 Selamat! Sertifikat Kompetensi Anda Siap Diterbitkan
                          </div>
                          <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: 2 }}>
                            ID Verifikasi &amp; QR Code Terdaftar Resmi di DIDIKARA
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ width: "auto", padding: "8px 18px", fontSize: "0.82rem", background: "linear-gradient(135deg,#059669,#10b981)", borderColor: "transparent" }}
                          onClick={() => {
                            const cert = {
                              id: `CERT-${Date.now()}`,
                              courseId: activeCourse.id,
                              title: activeCourse.title,
                              date: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
                              idCode: `CERT-${Date.now()}`
                            };
                            handleViewCert(cert);
                          }}>
                          🎓 Lihat &amp; Cetak Sertifikat PDF
                        </button>
                      </div>
                    )}

                    {!quizResultMessage.success && (
                      <button className="btn btn-secondary" style={{ width: "auto", marginTop: 14, fontSize: "0.82rem" }} onClick={() => { handleStartExam(); setQuizResultMessage(null); }}>
                        Ulangi Ujian
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
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 8 }}>
              Lakukan Check-In dan Check-Out sebagai bukti kehadiran Anda. Satu catatan per hari.
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: 20 }}>
              Alamat IP dicatat server saat Anda menekan tombol. Lokasi hanya ikut tersimpan
              bila Anda mengizinkan peramban membagikannya.
            </p>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                <MessageCircle size={18} style={{ color: "var(--primary)" }} /> Forum Diskusi &amp; Tanya Jawab
              </h3>
              <button onClick={loadForum} className="btn btn-secondary" style={{ width: "auto", padding: "6px 12px", fontSize: "0.78rem", fontWeight: 600 }}>
                ↻ Segarkan
              </button>
            </div>

            {/* Filter Topik Forum */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <button
                type="button"
                className={`btn ${forumFilter === "all" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setForumFilter("all")}
                style={{ width: "auto", padding: "6px 14px", fontSize: "0.82rem", fontWeight: 600 }}>
                Semua Diskusi ({dbForumPosts.length})
              </button>
              {activeLesson && (
                <button
                  type="button"
                  className={`btn ${forumFilter === "lesson" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setForumFilter("lesson")}
                  style={{ width: "auto", padding: "6px 14px", fontSize: "0.82rem", fontWeight: 600 }}>
                  Topik Modul Ini ({
                    dbForumPosts.filter(p => (p.content || "").toLowerCase().includes(activeLesson.title.toLowerCase())).length
                  })
                </button>
              )}
            </div>

            {forumReplyTo && (
              <div style={{ padding: "8px 14px", background: "rgba(249, 115, 22, 0.12)", border: "1px solid rgba(249, 115, 22, 0.3)", borderRadius: 8, fontSize: "0.82rem", color: "var(--primary)", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>💬 Membalas komentar #{forumReplyTo}</span>
                <button onClick={() => setForumReplyTo(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>✕ Batal</button>
              </div>
            )}

            {/* Daftar Postingan Diskusi */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20, maxHeight: 380, overflowY: "auto", paddingRight: 4 }}>
              {forumLoading && <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: 16 }}>Memuat diskusi...</p>}
              {!forumLoading && (forumFilter === "lesson" && activeLesson ? dbForumPosts.filter(p => (p.content || "").toLowerCase().includes(activeLesson.title.toLowerCase())) : dbForumPosts).length === 0 && (
                <EmptyState
                  icon="forum"
                  title={forumFilter === "lesson" ? "Belum Ada Diskusi untuk Modul Ini" : "Forum Diskusi Masih Sepi"}
                  description="Mulai ajukan pertanyaan atau bagikan pandangan Anda terkait materi ini kepada instruktur dan rekan sejawat."
                  compact={true}
                />
              )}
              {(forumFilter === "lesson" && activeLesson ? dbForumPosts.filter(p => (p.content || "").toLowerCase().includes(activeLesson.title.toLowerCase())) : dbForumPosts).map(post => {
                const isInstructorPost = post.role === "instructor" || post.role === "admin";
                const isMyPost = post.user_email === currentUser?.email;
                return (
                  <div
                    key={post.id}
                    className={`forum-message-card ${post.reply_to ? "is-reply" : ""} ${isInstructorPost ? "is-instructor" : isMyPost ? "is-current-user" : ""}`}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div className={`forum-avatar ${getForumAvatarClass(post.fullname || post.user_email)}`}>
                          {(post.avatar || post.fullname?.charAt(0) || "?").toUpperCase()}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span className="forum-user-name">{post.fullname || post.user_email}</span>
                            {isInstructorPost ? (
                              <span style={{ fontSize: "0.72rem", background: "rgba(245, 158, 11, 0.16)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.35)", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                                🎓 Instruktur
                              </span>
                            ) : isMyPost ? (
                              <span style={{ fontSize: "0.72rem", background: "rgba(59, 130, 246, 0.16)", color: "#3b82f6", border: "1px solid rgba(59, 130, 246, 0.35)", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                                ✨ Anda
                              </span>
                            ) : (
                              <span style={{ fontSize: "0.72rem", background: "rgba(16, 185, 129, 0.16)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.35)", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>
                                {post.role || "Peserta"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                          {new Date(post.created_at).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <button
                          type="button"
                          onClick={() => speakComment(post.id, `${post.fullname || post.user_email || "Peserta"} berkata: ${post.content}`)}
                          className={`btn ${speakingPostId === post.id ? "btn-primary" : "btn-secondary"}`}
                          style={{
                            width: "auto",
                            padding: "4px 9px",
                            fontSize: "0.74rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            backgroundColor: speakingPostId === post.id ? "#ef4444" : undefined,
                            borderColor: speakingPostId === post.id ? "#dc2626" : undefined,
                          }}
                          title={speakingPostId === post.id ? "Hentikan suara" : "Dengarkan komentar ini"}
                        >
                          <Volume2 size={13} />
                          <span>{speakingPostId === post.id ? "Berhenti" : "Dengarkan"}</span>
                        </button>
                        <button onClick={() => setForumReplyTo(post.id)} className="btn btn-secondary" style={{ width: "auto", padding: "4px 9px", fontSize: "0.74rem", display: "inline-flex", alignItems: "center", gap: 4 }} title="Balas diskusi ini">
                          <MessageCircle size={13} />
                          <span>Balas</span>
                        </button>
                        {(post.user_email === currentUser?.email || currentUser?.role === "admin") && (
                          <button onClick={() => deleteForumPost(post.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }} title="Hapus pesan">
                            <Trash2 size={13} style={{ color: "#fca5a5" }} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="forum-post-text">
                      {post.content}
                    </p>
                    {/* Emoji Reactions Bar */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 10, paddingTop: 8, borderTop: "1px dashed var(--border-color)" }}>
                      {["👍", "❤️", "💡", "👏", "🎓", "🔥"].map(emoji => {
                        const rx = postReactions[post.id] || { counts: {}, myReactions: [] };
                        const count = rx.counts?.[emoji] || 0;
                        const isMine = (rx.myReactions || []).includes(emoji);
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(post.id, emoji)}
                            className={`forum-reaction-pill ${isMine ? "is-active" : ""}`}
                            title={`Beri reaksi ${emoji}`}
                          >
                            <span>{emoji}</span>
                            {count > 0 && <span style={{ fontWeight: 700 }}>{count}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Komentar Baru yang Jelas, Elegan, dan Dilengkapi Fitur Emoji */}
            <div className="forum-input-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                <label style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>💬</span> Tulis Komentar atau Pertanyaan Baru:
                </label>
                {isVoiceRecording && (
                  <span style={{ fontSize: "0.8rem", color: "#ef4444", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    🔴 Mikrofon aktif — Silakan berbicara sekarang...
                  </span>
                )}
              </div>

              {/* Quick Emoji Bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 2 }}>
                <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", flexShrink: 0, fontWeight: 600 }}>Emoji Cepat:</span>
                {["👍", "💡", "👏", "🔥", "❤️", "🎓", "🚀", "✨", "🎯", "❓", "✅", "🙌", "💯"].map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    className="forum-quick-emoji"
                    onClick={() => handleInsertEmoji(emoji)}
                    title={`Sisipkan emoji ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                placeholder={isVoiceRecording ? "Mendengarkan ucapan Anda secara langsung..." : "Ketikkan pertanyaan materi, tanggapan, sisipkan emoji, atau klik tombol Dikte Suara..."}
                className={`forum-textarea-styled ${isVoiceRecording ? "is-recording" : ""}`}
                value={forumText}
                onChange={e => setForumText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    submitForumPost();
                  }
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  💡 Tekan <strong>Ctrl + Enter</strong> atau klik tombol Kirim Diskusi
                </span>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {/* Emoji Picker Popover Toggle */}
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(v => !v)}
                      className={`btn ${showEmojiPicker ? "btn-primary" : "btn-secondary"}`}
                      style={{
                        width: "auto",
                        padding: "8px 13px",
                        fontSize: "0.86rem",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6
                      }}
                      title="Buka panel pilihan emoji lengkap"
                    >
                      <Smile size={16} />
                      <span>Emoji</span>
                    </button>

                    {showEmojiPicker && (
                      <div className="emoji-picker-dropdown">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <strong style={{ fontSize: "0.84rem", color: "var(--text-primary)" }}>Pilih Emoji</strong>
                          <button
                            type="button"
                            onClick={() => setShowEmojiPicker(false)}
                            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.82rem", fontWeight: 700 }}
                          >
                            ✕
                          </button>
                        </div>

                        {/* Category Tabs */}
                        <div style={{ display: "flex", gap: 4, marginBottom: 10, borderBottom: "1px solid var(--border-color)", paddingBottom: 6 }}>
                          {FORUM_EMOJI_CATEGORIES.map((cat, idx) => (
                            <button
                              key={cat.name}
                              type="button"
                              onClick={() => setActiveEmojiTab(idx)}
                              style={{
                                background: activeEmojiTab === idx ? "var(--accent-badge-bg)" : "transparent",
                                border: activeEmojiTab === idx ? "1px solid var(--accent-badge-border)" : "1px solid transparent",
                                borderRadius: 6,
                                padding: "3px 8px",
                                fontSize: "0.72rem",
                                fontWeight: activeEmojiTab === idx ? 700 : 500,
                                color: activeEmojiTab === idx ? "var(--text-accent)" : "var(--text-muted)",
                                cursor: "pointer"
                              }}
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>

                        {/* Emojis Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, maxHeight: 150, overflowY: "auto" }}>
                          {FORUM_EMOJI_CATEGORIES[activeEmojiTab].emojis.map((emoji, i) => (
                            <button
                              key={i}
                              type="button"
                              className="emoji-item-btn"
                              onClick={() => handleInsertEmoji(emoji)}
                              title={emoji}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={toggleVoiceDictation}
                    className={`btn ${isVoiceRecording ? "btn-primary" : "btn-secondary"}`}
                    style={{
                      width: "auto",
                      padding: "8px 15px",
                      fontSize: "0.86rem",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: isVoiceRecording ? "#ef4444" : undefined,
                      borderColor: isVoiceRecording ? "#dc2626" : undefined,
                      color: isVoiceRecording ? "#fff" : undefined
                    }}
                    title={isVoiceRecording ? "Hentikan perekaman suara" : "Dikte suara (Bicara langsung untuk mengetik)"}
                  >
                    {isVoiceRecording ? (
                      <>
                        <MicOff size={15} />
                        <span>Selesai Bicara</span>
                      </>
                    ) : (
                      <>
                        <Mic size={15} style={{ color: "var(--primary)" }} />
                        <span>Dikte Suara (Bicara)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: "auto", padding: "8px 22px", fontSize: "0.88rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}
                    onClick={submitForumPost}
                  >
                    <Send size={15} />
                    <span>Kirim Diskusi</span>
                  </button>
                </div>
              </div>
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
                <EmptyState
                  icon="bell"
                  title="Belum Ada Pengumuman"
                  description="Instruktur belum menerbitkan pengumuman baru untuk kelas ini. Informasi jadwal sesi live atau pembaruan modul akan muncul di sini."
                  compact={true}
                />
              ) : announcements.map(a => (
                <div key={a.id} className="announcement-item-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <h4 style={{ fontSize: "0.94rem", color: "#f59e0b", margin: 0, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      <Megaphone size={15} style={{ color: "#f59e0b" }} />
                      <span>{a.title}</span>
                    </h4>
                    <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", flexShrink: 0 }}>
                      {new Date(a.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.88rem", color: "var(--text-primary)", margin: "0 0 8px 0", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{a.content}</p>
                  <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", fontWeight: 600 }}>— Diumumkan oleh {a.author_name || a.author_email}</span>
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
            {liveMsg && (
              <div style={{
                fontSize:"0.78rem", padding:"8px 14px", borderRadius:8, marginBottom:12,
                background: liveMsg.startsWith("✓") ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                color: liveMsg.startsWith("✓") ? "var(--success)" : "var(--danger)",
                border: `1px solid ${liveMsg.startsWith("✓") ? "var(--success)" : "var(--danger)"}`,
                fontWeight: 600
              }}>{liveMsg}</div>
            )}
            {liveLoading ? (
              <p style={{ color:"var(--text-muted)", fontSize:"0.8rem" }}>Memuat jadwal...</p>
            ) : liveSessions.length === 0 ? (
              <EmptyState
                icon="video"
                title="Belum Ada Sesi Live Terjadwal"
                description="Jadwal webinar interaktif bersama instruktur akan ditampilkan di sini beserta tautan ruang pertemuan virtual (Zoom / Meet)."
                compact={true}
              />
            ) : liveSessions.map(s => (
              <div key={s.id} className="glass-card" style={{ padding:16, marginBottom:12, border:"1px solid rgba(249, 115, 22,0.2)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                      <span style={{ fontSize:"0.65rem", background:"var(--accent-badge-bg)", color:"var(--text-accent)", border:"1px solid var(--accent-badge-border)", padding:"2px 8px", borderRadius:20, fontWeight:600 }}>
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
                      <span>👥 {s.registered_count || 0}/{s.max_participants} kursi</span>
                      {Number(s.waitlist_count) > 0 && <span>⏳ {s.waitlist_count} antre</span>}
                      {s.my_attended && <span style={{ color:"#6ee7b7" }}>✓ Kehadiran tercatat</span>}
                    </div>
                    {s.is_waitlisted && (
                      <div style={{ marginTop:8, fontSize:"0.72rem", color:"#fbbf24" }}>
                        Anda di daftar tunggu — nomor antrean {s.my_waitlist_position || "-"}.
                        Kursi otomatis diberikan bila ada peserta yang membatalkan.
                      </div>
                    )}
                    {s.recording_url && (
                      <div style={{ marginTop:8 }}>
                        <a href={s.recording_url} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize:"0.75rem", color:"var(--primary)" }}>
                          ▶ Tonton rekaman sesi
                        </a>
                      </div>
                    )}
                  </div>
                  <div style={{ marginLeft:12, flexShrink:0, display:"flex", flexDirection:"column", gap:6, alignItems:"stretch" }}>
                    {/* Google Calendar Link */}
                    <a
                      href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(s.title + " — " + (activeCourse?.title || "DIDIKARA"))}&dates=${new Date(s.scheduled_at).toISOString().replace(/-|:|\.\d+/g, '')}/${new Date(new Date(s.scheduled_at).getTime() + (s.duration_minutes || 60) * 60000).toISOString().replace(/-|:|\.\d+/g, '')}&details=${encodeURIComponent("Live Class DIDIKARA\nInstruktur: " + (s.instructor_name || "Tim Instruktur"))}&location=Online`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ width:"auto", padding:"5px 10px", fontSize:"0.7rem", display:"inline-flex", alignItems:"center", gap:4, textDecoration:"none", justifyContent:"center" }}
                      title="Tambahkan jadwal ini ke Google Calendar Anda"
                    >
                      <CalendarPlus size={13} />
                      <span>+ Kalender</span>
                    </a>

                    {s.can_join ? (
                      <button className="btn btn-primary" style={{ width:"auto", padding:"6px 14px", fontSize:"0.75rem" }}
                        onClick={() => bergabungLive(s.id)}>
                        Bergabung
                      </button>
                    ) : s.is_registered ? (
                      <span style={{ fontSize:"0.72rem", color:"#6ee7b7", fontWeight:600, textAlign:"center" }}>
                        ✓ Terdaftar
                      </span>
                    ) : s.is_waitlisted ? (
                      <span style={{ fontSize:"0.72rem", color:"#fbbf24", fontWeight:600, textAlign:"center" }}>
                        ⏳ Antre
                      </span>
                    ) : s.status === "completed" ? (
                      <span style={{ fontSize:"0.72rem", color:"var(--text-muted)", textAlign:"center" }}>Selesai</span>
                    ) : (
                      <button className="btn btn-secondary" style={{ width:"auto", padding:"6px 14px", fontSize:"0.75rem" }}
                        onClick={() => ubahPendaftaranLive(s.id, "register")}>
                        {s.is_full ? "Masuk Antrean" : "Daftar"}
                      </button>
                    )}

                    {(s.is_registered || s.is_waitlisted) && s.status !== "completed" && (
                      <button className="btn btn-secondary"
                        style={{ width:"auto", padding:"4px 10px", fontSize:"0.7rem", color:"var(--danger)" }}
                        onClick={() => ubahPendaftaranLive(s.id, "cancel")}>
                        Batalkan
                      </button>
                    )}

                    {(s.is_registered || s.is_waitlisted) && s.status !== "completed" && (
                      <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                        <a
                          href={makeGoogleCalendarUrl(s)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Tambah ke Google Calendar"
                          style={{
                            flex: 1, padding: "4px 6px", fontSize: "0.68rem", textAlign: "center",
                            background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)",
                            borderRadius: 4, color: "#93c5fd", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 3
                          }}>
                          <CalendarPlus size={11} /> GCal
                        </a>
                        <button
                          type="button"
                          onClick={() => downloadIcsFile(s)}
                          title="Unduh berkas .ics (Outlook/Apple)"
                          style={{
                            flex: 1, padding: "4px 6px", fontSize: "0.68rem",
                            background: "rgba(255,255,255,0.06)", border: "1px solid var(--border-color)",
                            borderRadius: 4, color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 3
                          }}>
                          <Download size={11} /> .ics
                        </button>
                      </div>
                    )}

                    {!s.can_join && s.is_registered && s.status !== "completed" && (
                      <span style={{ fontSize:"0.65rem", color:"var(--text-muted)", textAlign:"center", maxWidth:120, marginTop: 2 }}>
                        Tombol Bergabung aktif 15 menit sebelum mulai
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Tab: AI Assistant ─────────────────────────────────────────── */}
          <div className={`lms-tab-content ${activeLmsTab === "tab-ai" ? "active" : ""}`}>
            <div style={{ display:"flex", flexDirection:"column", height: 460 }}>
              {aiMock && (
                <div style={{
                  fontSize:"0.72rem", color:"var(--warning)", background:"rgba(234,179,8,0.1)",
                  border:"1px dashed rgba(234,179,8,0.3)", borderRadius:6, padding:"6px 12px", marginBottom:10,
                }}>
                  Mode simulasi — jawaban di bawah bukan dari AI.
                  {aiMock.reason ? ` (${aiMock.reason})` : ""}
                </div>
              )}

              {/* Context Header & Quick Prompt Chips */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Bot size={15} style={{ color: "var(--primary)" }} />
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      AI Tutor Pendamping
                    </span>
                    {activeLesson && (
                      <span style={{
                        fontSize: "0.68rem", background: "var(--accent-badge-bg)", color: "var(--text-accent)",
                        padding: "2px 8px", borderRadius: 12, border: "1px solid var(--accent-badge-border)"
                      }}>
                        Modul: {activeLesson.title}
                      </span>
                    )}
                  </div>

                  <button className="btn btn-secondary" style={{ width:"auto", padding:"2px 8px", fontSize:"0.68rem" }}
                    onClick={() => {
                      setAiMessages([
                        { role: "assistant", content: `Halo! Saya AI Tutor pendamping modul "${activeLesson?.title || activeCourse?.title}". Ada yang ingin ditanyakan tentang konsep materi ini? 🎓` }
                      ]);
                    }}>
                    Bersihkan Chat
                  </button>
                </div>

                {/* Quick Action Prompt Chips */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => sendAiMessage(`Tolong jelaskan konsep materi "${activeLesson?.title || activeCourse?.title}" secara sederhana dan mudah dipahami untuk pemula.`)}
                    disabled={aiLoading}
                    style={{
                      background: "var(--accent-badge-bg)", border: "1px solid var(--accent-badge-border)",
                      borderRadius: 14, padding: "4px 10px", fontSize: "0.72rem", color: "var(--text-accent)",
                      cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4
                    }}>
                    💡 Jelaskan Sederhana
                  </button>

                  <button
                    type="button"
                    onClick={() => sendAiMessage(`Berikan contoh studi kasus nyata implementasi materi "${activeLesson?.title || activeCourse?.title}" di dunia kerja/pemerintahan.`)}
                    disabled={aiLoading}
                    style={{
                      background: "var(--accent-badge-bg)", border: "1px solid var(--accent-badge-border)",
                      borderRadius: 14, padding: "4px 10px", fontSize: "0.72rem", color: "var(--text-accent)",
                      cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4
                    }}>
                    🎯 Contoh Kasus Nyata
                  </button>

                  <button
                    type="button"
                    onClick={() => sendAiMessage(`Rangkum 3 poin penting yang wajib dikuasai dari materi "${activeLesson?.title || activeCourse?.title}".`)}
                    disabled={aiLoading}
                    style={{
                      background: "var(--accent-badge-bg)", border: "1px solid var(--accent-badge-border)",
                      borderRadius: 14, padding: "4px 10px", fontSize: "0.72rem", color: "var(--text-accent)",
                      cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4
                    }}>
                    📝 Rangkum 3 Poin Kunci
                  </button>

                  <button
                    type="button"
                    onClick={() => sendAiMessage(`Buatkan 1 pertanyaan kuis latihan pemahaman beserta kunci jawabannya tentang materi "${activeLesson?.title || activeCourse?.title}".`)}
                    disabled={aiLoading}
                    style={{
                      background: "var(--accent-badge-bg)", border: "1px solid var(--accent-badge-border)",
                      borderRadius: 14, padding: "4px 10px", fontSize: "0.72rem", color: "var(--text-accent)",
                      cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4
                    }}>
                    ❓ Kuis Latihan Cepat
                  </button>
                </div>
              </div>

              {/* Chat area */}
              <div style={{ flex:1, overflowY:"auto", background:"rgba(0,0,0,0.25)", borderRadius:8, padding:12, marginBottom:8, display:"flex", flexDirection:"column", gap:8 }}>
                {aiMessages.map((m, i) => (
                  <div key={i} style={{ display:"flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth:"85%", padding:"8px 12px", borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      background: m.role === "user" ? "rgba(249,115,22,0.3)" : "rgba(249, 115, 22,0.12)",
                      border: `1px solid ${m.role === "user" ? "rgba(249,115,22,0.3)" : "rgba(249, 115, 22,0.25)"}`,
                      fontSize:"0.78rem", lineHeight:1.6,
                    }}>
                      {m.role === "assistant" && <Bot size={12} style={{ marginRight:4, color:"var(--primary)", verticalAlign:"middle" }} />}
                      {m.content}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div style={{ display:"flex", alignItems:"center", gap:6, padding: "6px 12px" }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--primary)", animation:"pulse 1s infinite" }} />
                    <span style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>AI Tutor sedang menyusun penjelasan...</span>
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
                  placeholder={`Tanyakan materi ${activeLesson?.title || "kursus ini"}...`}
                  style={{ flex:1, paddingLeft:12, height:38, fontSize:"0.8rem" }}
                />
                <button className="btn btn-primary" style={{ width:"auto", padding:"0 16px", fontSize:"0.8rem" }}
                  onClick={() => sendAiMessage()} disabled={aiLoading || !aiInput.trim()}>
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

        <CurriculumNav
          activeCourse={activeCourse}
          courses={courses}
          enrolledCourses={enrolledCourses}
          activeLessonIndex={activeLessonIndex}
          completedLessons={completedLessons}
          dbLessonProgress={dbLessonProgress}
          lockedModules={lockedModules}
          handleSelectLesson={handleSelectLesson}
          handleOpenClass={handleOpenClass}
        />
      </div>

      {pwaInstallPrompt && !pwaInstalled && (
        <div style={{ position:"fixed", bottom:16, left:"50%", transform:"translateX(-50%)", zIndex:9999,
          background:"linear-gradient(135deg,#1e1e2e,#2d2d44)", border:"1px solid rgba(249,115,22,0.4)",
          borderRadius:14, padding:"12px 20px", display:"flex", alignItems:"center", gap:12,
          boxShadow:"0 8px 32px rgba(0,0,0,0.4)", maxWidth:360, width:"calc(100% - 32px)" }}>
          <Download size={20} style={{ color:"#f97316", flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600, fontSize:"0.82rem" }}>Install DIDIKARA</div>
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
      {/* Voice Notice Modal — Modern, Dual-Theme Compatible Message Box */}
      {voiceNotice && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setVoiceNotice(null)}
        >
          <div
            className="voice-notice-modal"
            style={{
              maxWidth: 460,
              width: "100%",
              borderRadius: 22,
              padding: "30px 24px 24px",
              textAlign: "center",
              position: "relative"
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setVoiceNotice(null)}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid var(--border-color)",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              title="Tutup"
            >
              <X size={16} />
            </button>

            {/* Glowing Circular Icon Badge */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                margin: "0 auto 16px",
                background: "linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(239, 68, 68, 0.2) 100%)",
                border: "2px solid rgba(249, 115, 22, 0.45)",
                boxShadow: "0 0 24px rgba(249, 115, 22, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {voiceNotice.type === "dictation" ? (
                <MicOff size={30} style={{ color: "var(--primary)" }} />
              ) : (
                <Volume2 size={30} style={{ color: "var(--primary)" }} />
              )}
            </div>

            <h3
              style={{
                fontSize: "1.15rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                marginBottom: 10,
                lineHeight: 1.4
              }}
            >
              {voiceNotice.title}
            </h3>

            <p
              style={{
                fontSize: "0.88rem",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                marginBottom: 20
              }}
            >
              {voiceNotice.message}
            </p>

            {/* Supported Browsers Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
                marginBottom: 22
              }}
            >
              <div className="browser-card-badge">
                <span style={{ fontSize: "1.25rem", display: "block", marginBottom: 4 }}>🌐</span>
                <strong style={{ fontSize: "0.78rem", display: "block", marginBottom: 2 }}>Google Chrome</strong>
                <span style={{ fontSize: "0.68rem", color: "var(--primary)", fontWeight: 700 }}>Rekomendasi</span>
              </div>
              <div className="browser-card-badge">
                <span style={{ fontSize: "1.25rem", display: "block", marginBottom: 4 }}>⚡</span>
                <strong style={{ fontSize: "0.78rem", display: "block", marginBottom: 2 }}>MS Edge</strong>
                <span style={{ fontSize: "0.68rem", color: "var(--success)", fontWeight: 700 }}>Didukung</span>
              </div>
              <div className="browser-card-badge">
                <span style={{ fontSize: "1.25rem", display: "block", marginBottom: 4 }}>🧭</span>
                <strong style={{ fontSize: "0.78rem", display: "block", marginBottom: 2 }}>Safari</strong>
                <span style={{ fontSize: "0.68rem", color: "var(--info)", fontWeight: 700 }}>Didukung</span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "11px 20px",
                fontSize: "0.92rem",
                fontWeight: 700,
                borderRadius: 12
              }}
              onClick={() => setVoiceNotice(null)}
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
