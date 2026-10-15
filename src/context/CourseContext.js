"use client";
import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "./AuthContext";
import { useUI } from "./UIContext";
import { loadAppData, loadEnrollments } from "@/services/courseService";
import { startExam, submitExam, getExamHistory } from "@/services/examService";
import { loadProgress, saveProgress } from "@/services/progressService";

export const CourseContext = createContext(null);

export function CourseProvider({ children }) {
  const { currentUser } = useAuth();
  const { setActivePage } = useUI();

  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [enrollmentsLoaded, setEnrollmentsLoaded] = useState(false);
  const [activeCourse, setActiveCourse] = useState(null);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoTime, setVideoTime] = useState("00:00 / 12:45");
  const [completedLessons, setCompletedLessons] = useState({});
  const [activeLmsTab, setActiveLmsTab] = useState("tab-overview");
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizResultMessage, setQuizResultMessage] = useState(null);
  const [examSession, setExamSession] = useState(null);
  const [examLoading, setExamLoading] = useState(false);
  const [examTimeRemaining, setExamTimeRemaining] = useState(0);
  const [examTimerActive, setExamTimerActive] = useState(false);
  const [examHistory, setExamHistory] = useState([]);
  const [examHistoryLoading, setExamHistoryLoading] = useState(false);
  const [dbLessonProgress, setDbLessonProgress] = useState({});
  const [uploadStatus, setUploadStatus] = useState("");
  const [attendanceLog, setAttendanceLog] = useState([]);
  const [checkedIn, setCheckedIn] = useState(false);
  const [forumPosts, setForumPosts] = useState([]);
  const [forumInput, setForumInput] = useState("");
  const [certificates, setCertificates] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [paymentModalActive, setPaymentModalActive] = useState(false);
  const [selectedPayCourse, setSelectedPayCourse] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("QRIS");
  const [certModalActive, setCertModalActive] = useState(false);
  const [activeCert, setActiveCert] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [govForm, setGovForm] = useState({ instansi: "Kementerian Keuangan", jabatan: "Analis Kebijakan", target: "Data Analytics & AI", pegawai: 50 });
  const [govLoading, setGovLoading] = useState(false);
  const [govResult, setGovResult] = useState(null);
  const [corpForm, setCorpForm] = useState({ currentJob: "Staff Procurement", targetJob: "Senior PPK (Pejabat Pembuat Komitmen)" });
  const [corpLoading, setCorpLoading] = useState(false);
  const [corpResult, setCorpResult] = useState(null);
  const [dbMode, setDbMode] = useState("postgresql");

  const examTimerRef = useRef(null);
  const handleQuizSubmitRef = useRef(null);

  // Inisialisasi katalog & enrollment awal
  useEffect(() => {
    let isMounted = true;
    async function initCourses() {
      try {
        const [appDataRes, catalogRes] = await Promise.allSettled([
          loadAppData(),
          fetch("/api/catalog?limit=100").then(r => r.json()),
        ]);

        if (!isMounted) return;

        if (appDataRes.status === "fulfilled" && appDataRes.value?.success && appDataRes.value?.database_mode === "postgresql") {
          const json = appDataRes.value;
          setCourses(json.data.courses || []);
          setTransactions(json.data.transactions || []);
          setCertificates(json.data.certificates || []);
          setDbMode("postgresql");
        } else if (catalogRes.status === "fulfilled" && catalogRes.value?.success) {
          setCourses(catalogRes.value.courses || []);
          setDbMode("postgresql");
        }

        if (currentUser) {
          const enrollments = await loadEnrollments();
          if (isMounted) {
            setEnrolledCourses(enrollments);
            setEnrollmentsLoaded(true);
          }
        }
      } catch {
        if (isMounted) setDbMode("postgresql");
      }
    }
    initCourses();
    return () => { isMounted = false; };
  }, [currentUser]);

  // Set default active course jika belum dipilih
  useEffect(() => {
    if (!activeCourse && enrolledCourses.length > 0 && courses.length > 0) {
      const c = courses.find(item => item.id === enrolledCourses[0]);
      if (c) setActiveCourse(c);
    }
  }, [courses, enrolledCourses, activeCourse]);

  // Countdown timer ujian
  useEffect(() => {
    if (examTimerActive && examTimeRemaining > 0) {
      examTimerRef.current = setInterval(() => {
        setExamTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(examTimerRef.current);
            setExamTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(examTimerRef.current);
    }
    return () => clearInterval(examTimerRef.current);
  }, [examTimerActive, examTimeRemaining]);

  // Auto-submit saat timer habis
  useEffect(() => {
    if (examTimerActive && examTimeRemaining === 0 && examSession && !quizResultMessage) {
      setExamTimerActive(false);
      handleQuizSubmitRef.current?.();
    }
  }, [examTimeRemaining, examTimerActive, examSession, quizResultMessage]);

  const checkPrerequisite = useCallback((courseId) => {
    const c = courses.find(item => item.id === courseId);
    if (!c || !c.prerequisiteCourseId) return { locked: false, prerequisiteTitle: null };
    const prereqCourse = courses.find(item => item.id === c.prerequisiteCourseId);
    const hasCert = certificates.some(cert => cert.courseId === c.prerequisiteCourseId);
    return {
      locked: !hasCert,
      prerequisiteTitle: prereqCourse?.title || c.prerequisiteCourseId,
    };
  }, [courses, certificates]);

  const muatKehadiran = useCallback(async (courseId) => {
    try {
      const res = await fetch(`/api/attendance?courseId=${encodeURIComponent(courseId)}`);
      const data = await res.json();
      if (!data.success) return;
      const hariIni = (data.attendance || []).find(
        a => new Date(a.session_date).toDateString() === new Date().toDateString()
      );
      setCheckedIn(Boolean(hariIni && !hariIni.check_out_at));
      setAttendanceLog((data.attendance || []).slice(0, 5).map(a => {
        const masuk = new Date(a.check_in_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
        const keluar = a.check_out_at
          ? new Date(a.check_out_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
          : "belum check-out";
        return `Masuk ${masuk} — ${keluar} (IP ${a.ip_address || "-"})`;
      }));
    } catch {}
  }, []);

  const handleOpenClass = useCallback(async (courseId) => {
    const c = courses.find(item => item.id === courseId);
    if (!c) return;

    const prereqCheck = checkPrerequisite(courseId);
    if (prereqCheck.locked) {
      alert(`Kursus ini dikunci. Selesaikan dan lulus terlebih dahulu:\n"${prereqCheck.prerequisiteTitle}"`);
      return;
    }

    setActiveCourse(c);
    setVideoProgress(0);
    setVideoPlaying(false);
    setActiveLmsTab("tab-overview");
    setSelectedAnswers({});
    setQuizResultMessage(null);
    setExamSession(null);
    setExamHistory([]);
    setUploadStatus("");
    setDbLessonProgress({});
    muatKehadiran(courseId);
    setActivePage("lms-page");

    try {
      const progJson = await loadProgress(courseId);
      if (progJson.success && progJson.progress) {
        setDbLessonProgress(progJson.progress);
        const completedIdxs = Object.entries(progJson.progress)
          .filter(([, v]) => v.completed)
          .map(([k]) => parseInt(k, 10));
        if (completedIdxs.length > 0) {
          setCompletedLessons(prev => ({ ...prev, [courseId]: completedIdxs }));
        }
        const lastLesson = progJson.lastLesson ?? 0;
        setActiveLessonIndex(lastLesson);
      } else {
        setActiveLessonIndex(0);
      }
    } catch {
      setActiveLessonIndex(0);
    }
  }, [courses, checkPrerequisite, muatKehadiran, setActivePage]);

  const handleSelectLesson = useCallback((idx) => {
    setActiveLessonIndex(idx);
    setVideoProgress(0);
    setVideoPlaying(false);
  }, []);

  const handleEnrollCourse = useCallback((course) => {
    setSelectedPayCourse(course);
    setPaymentModalActive(true);
  }, []);

  const refreshEnrollments = useCallback(async () => {
    const milik = await loadEnrollments();
    setEnrolledCourses(milik);
    setEnrollmentsLoaded(true);
    return milik;
  }, []);

  const handleAssignmentUpload = useCallback(async (file, { note = "", lessonIndex = 0, link = "" } = {}) => {
    if (!activeCourse) return;
    setUploadStatus("Uploading");
    try {
      let fileUrl = link || "";
      let fileName = file?.name || "";

      if (file) {
        const presRes = await fetch("/api/upload/presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name, contentType: file.type || "application/pdf",
            courseId: activeCourse.id, scope: "assignment",
          }),
        });
        const pres = await presRes.json();
        if (!pres.success) throw new Error(pres.error || "Gagal menyiapkan unggahan");
        if (pres.mockMode) throw new Error("Penyimpanan berkas belum dikonfigurasi admin.");

        const putRes = await fetch(pres.url, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/pdf" },
          body: file,
        });
        if (!putRes.ok) throw new Error("Berkas gagal diunggah ke penyimpanan");
        fileUrl = pres.finalUrl;
      }

      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: activeCourse.id, lessonIndex, fileUrl, fileName, note }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Gagal menyimpan pengumpulan");

      setUploadStatus("Success");
    } catch (err) {
      setUploadStatus(`Error: ${err.message}`);
    }
  }, [activeCourse]);

  const handleAttendance = useCallback(async (action) => {
    if (!activeCourse) return;
    const aksi = action === "Check In" ? "in" : "out";

    const koordinat = await new Promise(resolve => {
      if (!navigator.geolocation) return resolve({});
      navigator.geolocation.getCurrentPosition(
        pos => resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
        () => resolve({}),
        { timeout: 5000, maximumAge: 60000 }
      );
    });

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: activeCourse.id, action: aksi, ...koordinat }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setAttendanceLog(prev => [...prev, `✕ ${data.error || "Gagal mencatat kehadiran"}`]);
        return;
      }

      const a = data.attendance || {};
      const jam = new Date(aksi === "in" ? a.check_in_at : a.check_out_at)
        .toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      const lokasi = a.latitude != null ? "lokasi dibagikan" : "tanpa lokasi";
      setAttendanceLog(prev => [
        ...prev,
        `${action} tercatat pukul ${jam} (IP ${a.ip_address || "tidak terbaca"}, ${lokasi})`,
      ]);
      setCheckedIn(aksi === "in");
    } catch {
      setAttendanceLog(prev => [...prev, "✕ Tidak dapat menghubungi server kehadiran"]);
    }
  }, [activeCourse]);

  const handleForumSubmit = useCallback(() => {
    if (!forumInput.trim() || !currentUser) return;
    setForumPosts(prev => [...prev, {
      id: prev.length + 1,
      user: currentUser.fullname,
      label: currentUser.roleLabel,
      text: forumInput.trim(),
      time: "Baru saja"
    }]);
    setForumInput("");
  }, [forumInput, currentUser]);

  const handleStartExam = useCallback(async () => {
    if (!activeCourse) return;
    setExamLoading(true);
    setExamSession(null);
    setSelectedAnswers({});
    setQuizResultMessage(null);
    clearInterval(examTimerRef.current);
    setExamTimerActive(false);
    setExamTimeRemaining(0);
    try {
      const json = await startExam(activeCourse.id);
      if (json.success) {
        const examSettings = activeCourse.examSettings || {};
        const timeLimit = json.timeLimit || examSettings.timeLimit || 0;
        setExamSession({
          questions: json.questions,
          examToken: json.examToken,
          passingScore: json.passingScore || examSettings.passingScore || 70,
          timeLimit,
          maxAttempts: json.maxAttempts || examSettings.maxAttempts || 0,
        });
        if (timeLimit > 0) {
          setExamTimeRemaining(timeLimit * 60);
          setExamTimerActive(true);
        }
      } else {
        setQuizResultMessage({
          success: false,
          text: json.error || "Sesi ujian tidak dapat dibuka.",
        });
      }
    } catch {
      setQuizResultMessage({
        success: false,
        text: "Tidak dapat menghubungi server ujian. Coba lagi.",
      });
    } finally {
      setExamLoading(false);
    }
  }, [activeCourse]);

  const handleQuizSubmit = useCallback(async () => {
    if (!activeCourse || !examSession) return;
    const questions = examSession.questions;
    if (!questions || questions.length === 0) return;

    clearInterval(examTimerRef.current);
    setExamTimerActive(false);

    const isTimeout = examSession.timeLimit > 0 && examTimeRemaining === 0;
    if (!isTimeout) {
      for (let i = 0; i < questions.length; i++) {
        const ans = selectedAnswers[i];
        const isAnswered = ans !== undefined &&
          !(Array.isArray(ans) && ans.length === 0) &&
          !(typeof ans === 'string' && ans.trim() === '');
        if (!isAnswered) {
          alert(`Harap jawab semua soal ujian (soal no. ${i + 1} belum dijawab) sebelum mengirim!`);
          return;
        }
      }
    }

    if (!examSession.examToken) {
      setQuizResultMessage({
        success: false,
        text: "Sesi ujian tidak valid. Tutup dan mulai ulang ujian.",
      });
      return;
    }

    try {
      const json = await submitExam(examSession.examToken, selectedAnswers);
      if (json.success) {
        setQuizResultMessage({
          success: json.passed,
          text: json.message,
          correctCount: json.correctCount,
          incorrectCount: json.incorrectCount,
          feedbackItems: json.feedbackItems,
          percentage: json.percentage,
          passingScore: json.passingScore,
        });
        if (json.passed) {
          const alreadyEarned = certificates.some(c => c.courseId === activeCourse.id);
          if (!alreadyEarned && json.certId) {
            const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            const newCert = { id: json.certId, courseId: activeCourse.id, title: activeCourse.title, date: dateStr, idCode: json.certId };
            setCertificates(prev => [...prev, newCert]);
          }
        }
      } else {
        setQuizResultMessage({
          success: false,
          text: json.error || "Jawaban gagal dikirim.",
        });
      }
    } catch {
      setQuizResultMessage({
        success: false,
        text: "Jawaban gagal dikirim — koneksi terputus.",
      });
    }
  }, [activeCourse, examSession, examTimeRemaining, selectedAnswers, certificates]);
  handleQuizSubmitRef.current = handleQuizSubmit;

  const handleLoadExamHistory = useCallback(async () => {
    if (!activeCourse) return;
    setExamHistoryLoading(true);
    try {
      const json = await getExamHistory(activeCourse.id);
      if (json.success) setExamHistory(json.history || []);
      else setExamHistory([]);
    } catch {
      setExamHistory([]);
    } finally {
      setExamHistoryLoading(false);
    }
  }, [activeCourse]);

  const handleSaveLessonProgress = useCallback((lessonIdx, pct, completed) => {
    if (!activeCourse) return;
    setDbLessonProgress(prev => ({ ...prev, [lessonIdx]: { pct, completed } }));
    if (completed) {
      setCompletedLessons(prev => {
        const existing = prev[activeCourse.id] || [];
        if (existing.includes(lessonIdx)) return prev;
        return { ...prev, [activeCourse.id]: [...existing, lessonIdx] };
      });
    }
    saveProgress(activeCourse.id, lessonIdx, pct, completed).catch(() => {});
  }, [activeCourse]);

  const handleViewCert = useCallback((cert) => {
    setActiveCert(cert);
    setCertModalActive(true);
  }, []);

  const handleGovGenerate = useCallback(async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    setGovLoading(true);
    setGovResult(null);
    try {
      const response = await fetch("/api/ai-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "gov", instansi: govForm.instansi, jabatan: govForm.jabatan, target: govForm.target, pegawai: govForm.pegawai })
      });
      const resData = await response.json();
      if (resData.success && !resData.isMock) {
        setGovResult({ budget: resData.data.budget, duration: resData.data.duration, steps: resData.data.steps, isMock: false });
      } else {
        let budget = govForm.pegawai * 2500000;
        setGovResult({ budget, duration: "3 Bulan", steps: [{ title: "Tahap 1: Fondasi Kompetensi", desc: "Materi statistik & dasar AI." }], isMock: true, message: resData.message });
      }
    } catch {
      setGovResult({ budget: govForm.pegawai * 2500000, duration: "3 Bulan", steps: [{ title: "Offline Fallback", desc: "Silakan periksa koneksi." }], isMock: true });
    } finally {
      setGovLoading(false);
    }
  }, [govForm]);

  const handleCorpGenerate = useCallback(async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    setCorpLoading(true);
    setCorpResult(null);
    try {
      const response = await fetch("/api/ai-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "corp", currentJob: corpForm.currentJob, targetJob: corpForm.targetJob })
      });
      const resData = await response.json();
      if (resData.success && !resData.isMock) {
        setCorpResult({ cost: resData.data.cost, time: resData.data.time, gaps: resData.data.gaps, steps: resData.data.steps, isMock: false });
      } else {
        setCorpResult({ cost: 15000000, time: "6 Bulan", gaps: ["Leadership & Coordination"], steps: [{ title: "Fase 1: Uji Kompetensi Awal", desc: "Asesmen standar kompetensi." }], isMock: true, message: resData.message });
      }
    } catch {
      setCorpResult({ cost: 15000000, time: "6 Bulan", gaps: ["Gagal menghubungkan ke server AI."], steps: [{ title: "Offline Fallback", desc: "Silakan periksa koneksi internet." }], isMock: true });
    } finally {
      setCorpLoading(false);
    }
  }, [corpForm]);

  const flatLessons = useMemo(() => {
    return activeCourse && activeCourse.modules
      ? activeCourse.modules.reduce((acc, mod) => [
          ...acc,
          ...(mod.lessons || []).map(l => typeof l === 'string' ? { title: l, type: 'text', url: '' } : l)
        ], [])
      : [];
  }, [activeCourse]);

  const value = useMemo(() => ({
    courses, setCourses,
    enrolledCourses, setEnrolledCourses,
    enrollmentsLoaded, setEnrollmentsLoaded,
    activeCourse, setActiveCourse,
    activeLessonIndex, setActiveLessonIndex,
    videoPlaying, setVideoPlaying,
    videoProgress, setVideoProgress,
    videoTime, setVideoTime,
    completedLessons, setCompletedLessons,
    activeLmsTab, setActiveLmsTab,
    selectedAnswers, setSelectedAnswers,
    quizResultMessage, setQuizResultMessage,
    examSession, setExamSession,
    examLoading, setExamLoading,
    examTimeRemaining, setExamTimeRemaining,
    examTimerActive, setExamTimerActive,
    examHistory, setExamHistory,
    examHistoryLoading, setExamHistoryLoading,
    dbLessonProgress, setDbLessonProgress,
    uploadStatus, setUploadStatus,
    attendanceLog, setAttendanceLog,
    checkedIn, setCheckedIn,
    forumPosts, setForumPosts,
    forumInput, setForumInput,
    certificates, setCertificates,
    transactions, setTransactions,
    paymentModalActive, setPaymentModalActive,
    selectedPayCourse, setSelectedPayCourse,
    paymentMethod, setPaymentMethod,
    certModalActive, setCertModalActive,
    activeCert, setActiveCert,
    filterCategory, setFilterCategory,
    govForm, setGovForm, govLoading, setGovLoading, govResult, setGovResult,
    corpForm, setCorpForm, corpLoading, setCorpLoading, corpResult, setCorpResult,
    dbMode, setDbMode,
    flatLessons,
    checkPrerequisite,
    muatKehadiran,
    handleOpenClass,
    handleSelectLesson,
    handleEnrollCourse,
    refreshEnrollments,
    handleAssignmentUpload,
    handleAttendance,
    handleForumSubmit,
    handleStartExam,
    handleQuizSubmit,
    handleLoadExamHistory,
    handleSaveLessonProgress,
    handleViewCert,
    handleGovGenerate,
    handleCorpGenerate,
  }), [
    courses, enrolledCourses, enrollmentsLoaded, activeCourse, activeLessonIndex,
    videoPlaying, videoProgress, videoTime, completedLessons, activeLmsTab,
    selectedAnswers, quizResultMessage, examSession, examLoading,
    examTimeRemaining, examTimerActive, examHistory, examHistoryLoading,
    dbLessonProgress, uploadStatus, attendanceLog, checkedIn, forumPosts,
    forumInput, certificates, transactions, paymentModalActive, selectedPayCourse,
    paymentMethod, certModalActive, activeCert, filterCategory,
    govForm, govLoading, govResult, corpForm, corpLoading, corpResult, dbMode,
    flatLessons, checkPrerequisite, muatKehadiran, handleOpenClass,
    handleSelectLesson, handleEnrollCourse, refreshEnrollments,
    handleAssignmentUpload, handleAttendance, handleForumSubmit,
    handleStartExam, handleQuizSubmit, handleLoadExamHistory,
    handleSaveLessonProgress, handleViewCert, handleGovGenerate, handleCorpGenerate,
  ]);

  return (
    <CourseContext.Provider value={value}>
      {children}
    </CourseContext.Provider>
  );
}

export function useCourse() {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error("useCourse must be used within CourseProvider");
  return ctx;
}
