"use client";
import { Play, Pause } from "lucide-react";

function getYouTubeId(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?#]+)/);
  return m ? m[1] : null;
}
function getVimeoId(url) {
  const m = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
  return m ? m[1] : null;
}

export default function VideoPlayerV2({ activeLesson, videoPlaying, videoProgress, videoTime, setVideoPlaying, setVideoProgress, isFullscreen = false }) {
  const lessonTitle = activeLesson?.title || "Materi Kelas";
  const lessonType  = activeLesson?.type  || "text";
  const lessonUrl   = activeLesson?.url   || "";

  const fsWrapper = isFullscreen ? {
    position: "fixed", inset: 0, zIndex: 99999,
    background: "#000", display: "flex", flexDirection: "column",
  } : { width: "100%", height: "100%" };

  // Di luar fullscreen, isi penuh kotak .video-container (yang tingginya sudah
  // dikunci CSS). Memakai aspectRatio di sini akan membuat iframe lebih tinggi
  // dari wadahnya dan terpotong, karena wadahnya tidak lagi berasio 16:9.
  const iframeStyle = isFullscreen
    ? { width: "100%", flex: 1, border: "none", display: "block" }
    : { width: "100%", height: "100%", border: "none", borderRadius: 12, background: "#000", display: "block" };

  /* ── Video ── */
  if (lessonType === "video" && lessonUrl) {
    const ytId    = getYouTubeId(lessonUrl);
    const vimeoId = getVimeoId(lessonUrl);

    if (ytId) return (
      <div style={fsWrapper}>
        {isFullscreen && (
          <div style={{ padding:"8px 16px", background:"#111", color:"white", fontSize:"0.85rem", fontWeight:600 }}>
            {lessonTitle}
          </div>
        )}
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?rel=0`}
          title={lessonTitle} style={iframeStyle}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen/>
      </div>
    );

    if (vimeoId) return (
      <div style={fsWrapper}>
        {isFullscreen && (
          <div style={{ padding:"8px 16px", background:"#111", color:"white", fontSize:"0.85rem", fontWeight:600 }}>
            {lessonTitle}
          </div>
        )}
        <iframe src={`https://player.vimeo.com/video/${vimeoId}`} title={lessonTitle}
          style={iframeStyle} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen/>
      </div>
    );

    return (
      <div style={fsWrapper}>
        {isFullscreen && (
          <div style={{ padding:"8px 16px", background:"#111", color:"white", fontSize:"0.85rem", fontWeight:600 }}>
            {lessonTitle}
          </div>
        )}
        <video src={lessonUrl} controls
          style={{ ...iframeStyle, borderRadius: isFullscreen ? 0 : 12, objectFit: "contain" }}/>
      </div>
    );
  }

  /* ── PPTX / PDF ── */
  if (lessonType === "pptx" && lessonUrl) {
    const isGoogleSlides = lessonUrl.includes("docs.google.com/presentation");
    const isGoogleDrive  = lessonUrl.includes("drive.google.com");
    const embedUrl = (!isGoogleSlides && !isGoogleDrive)
      ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(lessonUrl)}`
      : lessonUrl;
    return (
      <div style={fsWrapper}>
        {isFullscreen && (
          <div style={{ padding:"8px 16px", background:"#1a1a2e", color:"white", fontSize:"0.85rem", fontWeight:600 }}>
            {lessonTitle}
          </div>
        )}
        <iframe src={embedUrl} title={lessonTitle}
          style={{ ...iframeStyle, background:"#1a1a2e" }}
          allowFullScreen/>
      </div>
    );
  }

  /* ── Text / Mock ── */
  // Cabang inilah yang dipakai pelajaran bertipe "text" (default data seed),
  // jadi ia harus ikut menghormati mode fullscreen seperti cabang lainnya.
  return (
    <div className={`video-mock ${isFullscreen ? "is-fullscreen" : ""}`}>
      <div style={{ fontSize:"2.5rem", marginBottom:12 }}>📖</div>
      <h4>{lessonTitle}</h4>
      <p style={{ fontSize:"0.8rem", color:"var(--text-muted)", marginTop:8, marginBottom:16 }}>
        Baca materi dan tandai sebagai selesai untuk melanjutkan progress.
      </p>
      {!videoPlaying && (
        <div className="video-play-btn" onClick={() => setVideoPlaying(true)}>
          <Play size={24} style={{ color:"white", fill:"white", marginLeft:4 }}/>
        </div>
      )}
      <div className="video-controls">
        <div onClick={() => setVideoPlaying(!videoPlaying)} style={{ cursor:"pointer" }}>
          {videoPlaying ? <Pause size={18}/> : <Play size={18}/>}
        </div>
        <div className="video-progress-bar" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setVideoProgress(Math.floor(((e.clientX - rect.left) / rect.width) * 100));
        }}>
          <div className="video-progress" style={{ width:`${videoProgress}%` }}/>
        </div>
        <span style={{ fontSize:"0.75rem" }}>{videoTime}</span>
      </div>
    </div>
  );
}
