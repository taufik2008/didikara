"use client";
import { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Gauge,
  RotateCcw,
  RotateCw,
  Clock,
  ShieldCheck,
  Download,
  Check,
  FileText,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Video as VideoIcon
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { createScorm12Adapter } from "@/lib/scormRuntime";

function getYouTubeId(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  const regExp = /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = trimmed.match(regExp);
  return match ? match[1] : null;
}

function getVimeoId(url) {
  if (!url || typeof url !== "string") return null;
  const m = url.trim().match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
  return m ? m[1] : null;
}

function getGoogleDriveEmbedUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed.includes("drive.google.com") && !trimmed.includes("docs.google.com")) return null;
  
  // Format: file/d/ID/..., open?id=ID, uc?id=ID, presentation/d/ID
  const m = trimmed.match(/(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?.*id=|uc\?.*id=|document\/d\/|presentation\/d\/)?([a-zA-Z0-9_-]{15,})/i);
  if (m) {
    if (trimmed.includes("presentation")) {
      return `https://docs.google.com/presentation/d/${m[1]}/embed?start=false&loop=false&delayms=3000`;
    }
    return `https://drive.google.com/file/d/${m[1]}/preview`;
  }
  return null;
}

function getLoomEmbedUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed.includes("loom.com")) return null;
  const m = trimmed.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/i);
  return m ? `https://www.loom.com/embed/${m[1]}` : null;
}

function normalizeVideoUrl(url) {
  if (!url || typeof url !== "string") return "";
  let trimmed = url.trim();

  // Dropbox direct streaming conversion
  if (trimmed.includes("dropbox.com")) {
    trimmed = trimmed.replace(/[?&]dl=0/, "?raw=1").replace(/[?&]dl=1/, "?raw=1");
  }

  // Google Drive direct stream check -> leave for embed iframe
  if (trimmed.startsWith("/") && trimmed.includes(" ")) {
    trimmed = encodeURI(trimmed);
  }

  return trimmed;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function VideoPlayerV2({
  activeLesson,
  activeCourse,
  activeLessonIndex = 0,
  videoPlaying,
  videoProgress,
  videoTime,
  setVideoPlaying,
  setVideoProgress,
  isFullscreen = false,
}) {
  const { currentUser } = useApp();
  const lessonTitle = typeof activeLesson === "string" ? activeLesson : (activeLesson?.title || "Materi Kelas");
  const rawType     = typeof activeLesson === "object" ? activeLesson?.type : "video";
  const lessonType  = rawType || "video";

  // Video training default kredibel sesuai kategori materi kursus
  const DEFAULT_TRAINING_VIDEOS = {
    Procurement: "https://www.youtube.com/watch?v=kYJv_t7H6_I",
    AI: "https://www.youtube.com/watch?v=aircAruvnKk",
    Tech: "https://www.youtube.com/watch?v=8j0UDiN7my4",
    Leadership: "https://www.youtube.com/watch?v=vlpKyLklDDY",
  };

  // ── 1. All React Hooks (Always called unconditionally at the top) ───────────
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [videoQuality, setVideoQuality]   = useState("Auto");
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [resumeNotification, setResumeNotification] = useState("");
  const [offlineCached, setOfflineCached] = useState(false);
  const [watermarkPos, setWatermarkPos]   = useState({ top: "20%", left: "30%" });
  const [inVideoQuizAnswered, setInVideoQuizAnswered] = useState(false);
  const [showInVideoQuiz, setShowInVideoQuiz] = useState(false);
  const [inVideoQuizSelected, setInVideoQuizSelected] = useState(null);
  const [inVideoQuizFeedback, setInVideoQuizFeedback] = useState(null);
  const [viewMode, setViewMode] = useState("video"); // 'video' | 'stage'
  const [videoError, setVideoError] = useState(null);
  const [customBackupUrl, setCustomBackupUrl] = useState("");
  const [showCustomUrlInput, setShowCustomUrlInput] = useState(false);
  const [tempUrlInput, setTempUrlInput] = useState("");
  const videoRef = useRef(null);

  const rawUrl = (typeof activeLesson === "object" && activeLesson?.url) ? activeLesson.url : "";
  const isDocType = lessonType === "pptx" || lessonType === "pdf" || Boolean(rawUrl?.toLowerCase()?.includes(".pdf")) || Boolean(rawUrl?.toLowerCase()?.includes(".pptx")) || Boolean(rawUrl?.toLowerCase()?.includes(".ppt"));
  const defaultCategoryVideo = DEFAULT_TRAINING_VIDEOS[activeCourse?.category] || "https://www.youtube.com/watch?v=kYJv_t7H6_I";
  const defaultUrl = isDocType ? "" : defaultCategoryVideo;
  
  const effectiveRawUrl = customBackupUrl || rawUrl || (isDocType ? "" : defaultUrl);
  const lessonUrl = normalizeVideoUrl(effectiveRawUrl);

  // Sync state on lesson change
  useEffect(() => {
    setVideoError(null);
    setCustomBackupUrl("");
    setShowCustomUrlInput(false);
    setTempUrlInput("");
    setInVideoQuizAnswered(false);
    setShowInVideoQuiz(false);
    setInVideoQuizSelected(null);
    setInVideoQuizFeedback(null);
    const isDoc = lessonType === "pptx" || lessonType === "pdf" || Boolean(lessonUrl?.toLowerCase().includes(".pdf")) || Boolean(lessonUrl?.toLowerCase().includes(".pptx")) || Boolean(lessonUrl?.toLowerCase().includes(".ppt"));
    if (isDoc) {
      setViewMode("stage");
    } else {
      setViewMode("video");
    }
  }, [activeLessonIndex, activeCourse?.id, lessonType, rawUrl]);

  // SCORM 1.2 Runtime API adapter integration
  useEffect(() => {
    if (typeof window !== "undefined" && lessonType === "scorm") {
      window.API = createScorm12Adapter({
        userId: currentUser?.email,
        userName: currentUser?.fullname,
        lessonId: (typeof activeLesson === "object" && activeLesson?.id) || `lesson-${activeLessonIndex}`,
        onCommit: (cmi) => {
          if (cmi["cmi.core.lesson_status"] === "completed" || cmi["cmi.core.lesson_status"] === "passed") {
            setVideoProgress(100);
          }
        },
      });
      return () => {
        try {
          if (window.API && window.API.LMSFinish) window.API.LMSFinish("");
        } catch {}
      };
    }
  }, [lessonType, currentUser, activeLesson, activeLessonIndex, setVideoProgress]);

  // Sync video play/pause with external state
  useEffect(() => {
    if (!videoRef.current) return;
    if (videoPlaying && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else if (!videoPlaying && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [videoPlaying]);

  // Keyboard Hotkeys (Space, J, L)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (e.code === "Space") {
        e.preventDefault();
        setVideoPlaying((prev) => !prev);
      } else if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        handleSkip(-10);
      } else if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        handleSkip(10);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setVideoPlaying]);



  // Anti-piracy watermark position
  useEffect(() => {
    const interval = setInterval(() => {
      const randomTop = Math.floor(Math.random() * 65) + 15;
      const randomLeft = Math.floor(Math.random() * 60) + 10;
      setWatermarkPos({ top: `${randomTop}%`, left: `${randomLeft}%` });
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Offline cache status
  useEffect(() => {
    if (!activeCourse?.id) return;
    try {
      const isCached = localStorage.getItem(`offline_cache_${activeCourse.id}_${activeLessonIndex}`);
      setOfflineCached(Boolean(isCached));
    } catch {}
  }, [activeCourse?.id, activeLessonIndex]);

  // Auto-resume from localStorage
  useEffect(() => {
    if (!activeCourse?.id) return;
    const storageKey = `lms_progress_${activeCourse.id}_${activeLessonIndex}`;
    try {
      const savedPct = localStorage.getItem(storageKey);
      if (savedPct && Number(savedPct) > 5 && Number(savedPct) < 95) {
        const pct = Number(savedPct);
        setVideoProgress(pct);
        setResumeNotification(`Melanjutkan materi dari ${pct}%`);
        const timer = setTimeout(() => setResumeNotification(""), 3500);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [activeCourse?.id, activeLessonIndex, setVideoProgress]);

  // Save progress periodically
  useEffect(() => {
    if (!activeCourse?.id || videoProgress <= 0) return;
    const storageKey = `lms_progress_${activeCourse.id}_${activeLessonIndex}`;
    try {
      localStorage.setItem(storageKey, String(videoProgress));
    } catch {}
  }, [activeCourse?.id, activeLessonIndex, videoProgress]);

  // Otomatis minta grant-access via serverless Drive API jika video dari Google Drive
  useEffect(() => {
    if (lessonUrl && (lessonUrl.includes("drive.google.com") || lessonUrl.includes("docs.google.com"))) {
      fetch("/api/drive/grant-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: lessonUrl, userEmail: currentUser?.email || "" }),
      }).catch(() => {});
    }
  }, [lessonUrl, currentUser?.email]);

  // ── Helper Handlers ────────────────────────────────────────────────────────
  const handleToggleOfflineCache = () => {
    if (!activeCourse?.id) return;
    try {
      const cacheKey = `offline_cache_${activeCourse.id}_${activeLessonIndex}`;
      if (offlineCached) {
        localStorage.removeItem(cacheKey);
        setOfflineCached(false);
      } else {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            title: lessonTitle,
            course: activeCourse.title,
            cachedAt: new Date().toISOString(),
          })
        );
        setOfflineCached(true);
        setResumeNotification("✅ Materi tersimpan untuk akses luring");
        setTimeout(() => setResumeNotification(""), 3000);
      }
    } catch {}
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleSkip = (secondsDelta) => {
    if (videoRef.current && videoRef.current.duration) {
      try {
        const nextTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + secondsDelta));
        videoRef.current.currentTime = nextTime;
        const nextPct = Math.round((nextTime / videoRef.current.duration) * 100);
        setVideoProgress(nextPct);
        return;
      } catch {}
    }
    const totalSec = 765;
    const currentSec = (videoProgress / 100) * totalSec;
    const nextSec = Math.max(0, Math.min(totalSec, currentSec + secondsDelta));
    const nextPct = Math.round((nextSec / totalSec) * 100);
    setVideoProgress(nextPct);
  };

  const isLocalDiskPath = Boolean(
    lessonUrl &&
    (lessonUrl.match(/^[a-zA-Z]:\\/) || lessonUrl.startsWith("file:///") || lessonUrl.match(/^[a-zA-Z]:\//))
  );

  const fsWrapper = isFullscreen
    ? {
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#000",
        display: "flex",
        flexDirection: "column",
      }
    : { width: "100%", height: "100%", minHeight: "520px", position: "relative" };

  const iframeStyle = isFullscreen
    ? { width: "100%", flex: 1, border: "none", display: "block" }
    : { width: "100%", height: "100%", minHeight: "520px", border: "none", borderRadius: 14, background: "#000", display: "block" };

  // ── 2. Render PowerPoint / PDF Document Mode ─────────────────────
  const isPdf = Boolean(lessonUrl && (lessonUrl.toLowerCase().includes(".pdf") || lessonType === "pdf"));
  const isPptx = lessonType === "pptx" || Boolean(lessonUrl?.toLowerCase().includes(".pptx")) || Boolean(lessonUrl?.toLowerCase().includes(".ppt"));
  const isDocOrStage = isPdf || isPptx || viewMode === "stage";

  if (isDocOrStage) {
    const isGoogleSlides = lessonUrl?.includes("docs.google.com/presentation");
    const isGoogleDrive  = lessonUrl?.includes("drive.google.com");
    let embedUrl = lessonUrl;
    if (isPdf) {
      embedUrl = lessonUrl;
    } else if (isGoogleSlides && !lessonUrl.includes("/embed")) {
      embedUrl = lessonUrl.replace(/\/edit.*$/, "/embed?start=false&loop=false&delayms=3000").replace(/\/pub.*$/, "/embed?start=false&loop=false&delayms=3000");
    } else if (isGoogleDrive) {
      embedUrl = lessonUrl.replace(/\/view.*$/, "/preview");
    } else if (lessonUrl && (lessonUrl.startsWith("http://") || lessonUrl.startsWith("https://")) && (lessonUrl.includes(".ppt") || lessonUrl.includes(".pptx"))) {
      embedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(lessonUrl)}`;
    } else {
      embedUrl = lessonUrl;
    }

    return (
      <div style={{ ...fsWrapper, background: "linear-gradient(135deg, #090d16 0%, #0f172a 100%)", color: "#fff", display: "flex", flexDirection: "column" }}>
        {/* Top Header Toolbar */}
        <div style={{
          padding: "10px 18px", background: "rgba(15, 23, 42, 0.95)", borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, zIndex: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isPdf ? (
              <span style={{
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", color: "#fff",
                padding: "4px 10px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700,
                display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(2,132,199,0.3)",
              }}>
                <FileText size={13} /> DOKUMEN MODUL (PDF)
              </span>
            ) : (
              <span style={{
                background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", color: "#fff",
                padding: "4px 10px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700,
                display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(234,88,12,0.3)",
              }}>
                <FileText size={13} /> SLIDE PRESENTASI (PPTX)
              </span>
            )}
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#f8fafc" }}>
              {lessonTitle}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {embedUrl && (
              <a
                href={embedUrl}
                target="_blank"
                rel="noreferrer"
                title="Buka atau unduh dokumen materi di tab baru"
                style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "5px 12px",
                  borderRadius: 6, fontSize: "0.75rem", background: "rgba(255,255,255,0.08)",
                  color: "#cbd5e1", textDecoration: "none", border: "1px solid rgba(255,255,255,0.15)",
                  fontWeight: 600,
                }}>
                <ExternalLink size={13} /> Buka Tab Baru
              </a>
            )}
          </div>
        </div>

        {/* Main Slide / Document Canvas */}
        <div style={{
          flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", padding: embedUrl ? 0 : "32px 20px",
        }}>
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={lessonTitle}
              style={{ width: "100%", height: "100%", minHeight: "560px", border: "none", background: "#1e293b" }}
              allowFullScreen
            />
          ) : (
            <div style={{
              width: "100%", maxWidth: 600,
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px dashed rgba(255, 255, 255, 0.2)", borderRadius: 16,
              padding: "40px 32px", textAlign: "center",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 20,
                background: isPdf ? "rgba(2, 132, 199, 0.15)" : "rgba(234, 88, 12, 0.15)",
                color: isPdf ? "#38bdf8" : "#fb923c",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <FileText size={32} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#f8fafc", margin: "0 0 6px 0" }}>
                  {lessonTitle}
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: 0 }}>
                  {activeCourse?.title ? `${activeCourse.title} • ` : ""}{isPdf ? "Dokumen Modul PDF" : "Slide Materi"}
                </p>
              </div>
              <div style={{
                background: "rgba(255,255,255,0.04)", padding: "12px 20px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.08)", fontSize: "0.8rem", color: "#cbd5e1", maxWidth: 460, lineHeight: 1.5,
              }}>
                ℹ️ Tautan atau berkas materi belum diunggah untuk sesi ini. Anda dapat mengunggah berkas PDF / PPTX atau mengisi URL materi melalui menu <strong>Kelola Pelatihan</strong>.
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── 3. Video Mode (YouTube / Vimeo / Google Drive / Loom / Web Embed / MP4 Player) ───
  const ytId              = getYouTubeId(lessonUrl);
  const vimeoId           = getVimeoId(lessonUrl);
  const driveEmbed        = getGoogleDriveEmbedUrl(lessonUrl);
  const loomEmbed         = getLoomEmbedUrl(lessonUrl);
  const isDirectVideoFile = Boolean(lessonUrl && lessonUrl.match(/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i));
  const isWebUrl          = Boolean(lessonUrl && (lessonUrl.startsWith("http://") || lessonUrl.startsWith("https://")));

  return (
    <div style={{ ...fsWrapper, position: "relative", overflow: "hidden", borderRadius: isFullscreen ? 0 : 12, background: "#000" }}>
      {isFullscreen && (
        <div style={{ padding: "8px 16px", background: "#111", color: "white", fontSize: "0.85rem", fontWeight: 600 }}>
          {lessonTitle}
        </div>
      )}

      {/* Case A: YouTube Video */}
      {ytId ? (
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?rel=0&autoplay=0&enablejsapi=1`}
          title={lessonTitle}
          style={iframeStyle}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
          allowFullScreen
        />
      ) : vimeoId ? (
        /* Case B: Vimeo Video */
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}`}
          title={lessonTitle}
          style={iframeStyle}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : driveEmbed ? (
        /* Case C: Google Drive MP4 Video (Auto-converted to preview iframe) */
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
          <iframe
            src={driveEmbed}
            title={lessonTitle}
            style={{ ...iframeStyle, flex: 1, minHeight: isFullscreen ? "100%" : "480px" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 16px", background: "rgba(15, 23, 42, 0.95)", borderTop: "1px solid rgba(255,255,255,0.08)",
            fontSize: "0.78rem", color: "#cbd5e1", flexWrap: "wrap", gap: 8, zIndex: 10
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
              <span>Video Google Drive</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
                Jika video meminta izin akses:
              </span>
              <a
                href={lessonUrl.replace(/\/preview.*$/, "/view").replace(/\/view.*$/, "/view")}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px",
                  borderRadius: 6, background: "rgba(59, 130, 246, 0.18)", border: "1px solid rgba(59, 130, 246, 0.4)",
                  color: "#60a5fa", fontSize: "0.75rem", textDecoration: "none", fontWeight: 600
                }}
              >
                <ExternalLink size={12} /> Buka / Minta Akses Google Drive ↗
              </a>
            </div>
          </div>
        </div>
      ) : loomEmbed ? (
        /* Case D: Loom Video Embed */
        <iframe
          src={loomEmbed}
          title={lessonTitle}
          style={iframeStyle}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : isLocalDiskPath ? (
        /* Case E: Local Disk Path entered directly (e.g. C:\video.mp4) - Browser Security Warning */
        <div
          style={{
            width: "100%",
            height: "100%",
            minHeight: "520px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 24px",
            background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
            color: "#fff",
            textAlign: "center"
          }}
        >
          <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(239, 68, 68, 0.2)", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <AlertTriangle size={32} />
          </div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 8 }}>Format Path Harddisk Lokal Terdeteksi</h3>
          <p style={{ fontSize: "0.86rem", color: "#cbd5e1", maxWidth: 540, lineHeight: 1.6, marginBottom: 16 }}>
            Browser memblokir pemutaran file langsung dari path harddisk (<code>{lessonUrl}</code>) karena kebijakan keamanan web (CORS/local disk protection).
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginBottom: 16 }}>
            <button
              onClick={() => {
                setCustomBackupUrl(defaultCategoryVideo);
                setVideoError(null);
              }}
              className="btn btn-primary"
              style={{ width: "auto", padding: "8px 18px", fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Play size={14} /> Putar Video Rekomendasi
            </button>
            <button
              onClick={() => setViewMode("stage")}
              className="btn btn-secondary"
              style={{ width: "auto", padding: "8px 16px", fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <FileText size={14} /> Lihat Slide Materi
            </button>
          </div>
        </div>
      ) : isDirectVideoFile ? (
        /* Case F: Direct MP4 / WebM / HTML5 Video Player */
        <video
          ref={videoRef}
          key={lessonUrl}
          controls
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          style={{ ...iframeStyle, objectFit: "contain" }}
          onPlay={() => setVideoPlaying(true)}
          onPause={() => setVideoPlaying(false)}
          onEnded={() => {
            setVideoPlaying(false);
            setVideoProgress(100);
          }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v.duration > 0) {
              const pct = Math.round((v.currentTime / v.duration) * 100);
              setVideoProgress(pct);
            }
          }}
          onError={() => {
            if (!customBackupUrl) {
              setCustomBackupUrl(defaultCategoryVideo);
              setResumeNotification("ℹ️ Beralih ke video streaming terverifikasi");
              setTimeout(() => setResumeNotification(""), 3500);
            } else {
              setVideoError("Format video atau URL tidak dapat diakses.");
            }
          }}
        >
          <source src={lessonUrl} type="video/mp4" />
          <source src={lessonUrl} type="video/webm" />
          <source src={lessonUrl} type="video/ogg" />
          Browser Anda tidak mendukung tag video HTML5.
        </video>
      ) : lessonType === "scorm" ? (
        /* Case SCORM: Paket SCORM 1.2 Interaktif */
        <iframe
          src={lessonUrl}
          title={lessonTitle}
          style={iframeStyle}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : isWebUrl ? (
        /* Case G: Generic Web URL / External Video Embed */
        <iframe
          src={lessonUrl}
          title={lessonTitle}
          style={iframeStyle}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
          allowFullScreen
        />
      ) : videoError ? (
        /* Case H: Video Playback Error Fallback Card with Smart Auto-Recovery */
        <div
          style={{
            width: "100%",
            height: "100%",
            minHeight: "520px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 24px",
            background: "linear-gradient(135deg, #090d16 0%, #1e293b 100%)",
            color: "#fff",
            textAlign: "center"
          }}
        >
          <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(245, 158, 11, 0.2)", color: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <VideoIcon size={32} />
          </div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 8 }}>Sumber Video Siap Dipulihkan</h3>
          <p style={{ fontSize: "0.85rem", color: "#94a3b8", maxWidth: 520, lineHeight: 1.5, marginBottom: 20 }}>
            Tautan materi video dapat langsung dialihkan ke sumber streaming terverifikasi DIDIKARA.
          </p>

          {/* Quick Action Recovery Buttons */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginBottom: 18 }}>
            <button
              onClick={() => {
                setCustomBackupUrl(defaultCategoryVideo);
                setVideoError(null);
              }}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                background: "var(--primary-gradient)",
                color: "#fff",
                border: "none",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 4px 14px rgba(249,115,22,0.3)"
              }}
            >
              <Play size={15} />
              <span>Putar Video Materi Terverifikasi</span>
            </button>

            <button
              onClick={() => setViewMode("stage")}
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                fontWeight: 600,
                fontSize: "0.82rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <FileText size={14} />
              <span>Buka Slide &amp; Silabus</span>
            </button>

            <button
              onClick={() => setShowCustomUrlInput(prev => !prev)}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.05)",
                color: "#94a3b8",
                border: "1px solid rgba(255,255,255,0.1)",
                fontWeight: 600,
                fontSize: "0.82rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <span>🔗 Ganti Tautan Video</span>
            </button>
          </div>

          {/* Custom URL Input Accordion */}
          {showCustomUrlInput && (
            <div style={{
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              padding: 14,
              width: "100%",
              maxWidth: 480,
              marginBottom: 16,
              textAlign: "left"
            }}>
              <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: 6 }}>
                Tempelkan URL YouTube, Google Drive, Loom, atau link MP4 baru:
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={tempUrlInput}
                  onChange={e => setTempUrlInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(0,0,0,0.4)",
                    color: "#fff",
                    fontSize: "0.8rem"
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (tempUrlInput.trim()) {
                      setCustomBackupUrl(tempUrlInput.trim());
                      setVideoError(null);
                      setShowCustomUrlInput(false);
                    }
                  }}
                  className="btn btn-primary"
                  style={{ width: "auto", padding: "8px 14px", fontSize: "0.8rem" }}
                >
                  Terapkan
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Case I: Fallback Guaranteed YouTube Stream */
        <iframe
          src={`https://www.youtube.com/embed/${getYouTubeId(defaultCategoryVideo) || "kYJv_t7H6_I"}?rel=0&autoplay=0&enablejsapi=1`}
          title={lessonTitle}
          style={iframeStyle}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
          allowFullScreen
        />
      )}

      {/* Dynamic Anti-Piracy Watermark */}
      {currentUser?.email && (
        <div
          style={{
            position: "absolute",
            top: watermarkPos.top,
            left: watermarkPos.left,
            color: "rgba(255,255,255,0.18)",
            fontSize: "0.75rem",
            fontWeight: 700,
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 15,
            transform: "rotate(-12deg)",
            letterSpacing: 1,
            textShadow: "0 1px 2px rgba(0,0,0,0.5)"
          }}
        >
          DIDIKARA • {currentUser.email}
        </div>
      )}

      {/* Resume Notification Toast */}
      {resumeNotification && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 24,
            background: "rgba(15,23,42,0.9)",
            color: "#38bdf8",
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: "0.8rem",
            fontWeight: 600,
            zIndex: 30,
            border: "1px solid rgba(56,189,248,0.3)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Clock size={14} />
          <span>{resumeNotification}</span>
        </div>
      )}

      {/* Interactive Checkpoint Quiz Overlay */}
      {showInVideoQuiz && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(15, 23, 42, 0.92)",
            backdropFilter: "blur(6px)",
            zIndex: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
        >
          <div
            style={{
              background: "#1e293b",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 16,
              padding: "24px 28px",
              maxWidth: 480,
              width: "100%",
              color: "#fff",
              textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)"
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(249,115,22,0.2)", color: "#f97316", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <ShieldCheck size={26} />
            </div>
            <h4 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 8 }}>
              🎯 Checkpoint Pemahaman Materi (50%)
            </h4>
            <p style={{ fontSize: "0.84rem", color: "#94a3b8", marginBottom: 20, lineHeight: 1.5 }}>
              Sesi jeda sejenak untuk memverifikasi atensi dan pemahaman Anda pada modul ini.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20, textAlign: "left" }}>
              <button
                type="button"
                onClick={() => {
                  setInVideoQuizAnswered(true);
                  setShowInVideoQuiz(false);
                  setVideoPlaying(true);
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#f8fafc",
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease"
                }}
              >
                <span>✅ Konsep inti modul sudah saya pahami dengan baik</span>
                <Check size={16} color="#22c55e" />
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSkip(-30);
                  setInVideoQuizAnswered(true);
                  setShowInVideoQuiz(false);
                  setVideoPlaying(true);
                }}
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#94a3b8",
                  fontSize: "0.84rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <span>⏪ Ulangi 30 detik materi sebelumnya</span>
                <RotateCcw size={15} />
              </button>
            </div>

            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
              Verifikasi integritas sertifikasi DIDIKARA
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
