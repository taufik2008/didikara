"use client";
import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { loginApi, logoutApi, getSessionApi } from "@/services/authService";
import { loadAppData, syncEntity, loadEnrollments } from "@/services/courseService";
import { startExam, submitExam, getExamHistory } from "@/services/examService";
import { loadProgress, saveProgress } from "@/services/progressService";

const initialCompetencySkills = [
  { key: "leadership", name: "Leadership" },
  { key: "procurement", name: "Procurement" },
  { key: "data_analytics", name: "Data Analytics" },
  { key: "ai_literacy", name: "AI Literacy" },
  { key: "finance", name: "Finance" },
  { key: "management", name: "Management" }
];

export const AppContext = createContext(null);

/**
 * Peta halaman ⇄ URL.
 *
 * `activePage` dulunya state biasa, sehingga aplikasi tidak punya URL: tautan
 * ke sebuah kelas tak bisa dibagikan, tombol Back peramban tidak berfungsi, dan
 * menyegarkan halaman selalu kembali ke dashboard. Sekarang nilainya diturunkan
 * dari pathname, dan `setActivePage` menjadi pembungkus router — jadi seluruh
 * pemanggil lama tetap bekerja tanpa diubah.
 */
const PATH_BY_PAGE = {
  "dashboard-page":   "/dashboard",
  "marketplace-page": "/marketplace",
  "lms-page":         "/kelas",
  "wallet-page":      "/wallet",
  "ai-planner-page":  "/ai-planner",
  "admin-page":       "/admin",
};
const PAGE_BY_PATH = Object.fromEntries(
  Object.entries(PATH_BY_PAGE).map(([page, path]) => [path, page])
);

export function AppProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [levels, setLevels] = useState([]);
  const [competencySkills, setCompetencySkills] = useState(initialCompetencySkills);
  const [newCatKey, setNewCatKey] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newLvlKey, setNewLvlKey] = useState("");
  const [newLvlName, setNewLvlName] = useState("");
  const [newSkillKey, setNewSkillKey] = useState("");
  const [newSkillName, setNewSkillName] = useState("");
  const [courses, setCourses] = useState([]);
  const [activeRole, setActiveRole] = useState("student");
  const [currentUser, setCurrentUser] = useState(null);
  // Sesi masih diperiksa ke server; dipakai agar halaman login tidak berkedip
  // muncul sesaat bagi pengguna yang sebenarnya sudah masuk.
  const [sessionChecked, setSessionChecked] = useState(false);

  const router   = useRouter();
  const pathname = usePathname();
  const activePage = PAGE_BY_PATH[pathname] || "dashboard-page";
  const setActivePage = useCallback((page) => {
    router.push(PATH_BY_PAGE[page] || "/dashboard");
  }, [router]);
  const [loginEmail, setLoginEmail] = useState("peserta@ailms.id");
  const [loginPassword, setLoginPassword] = useState("password123");

  // ── Tema & Tampilan Sidebar ──
  const [theme, setTheme] = useState("dark");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("lms_theme") || "dark";
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);

      const savedSidebar = localStorage.getItem("lms_sidebar_collapsed");
      if (savedSidebar !== null) setSidebarCollapsed(savedSidebar === "true");
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        localStorage.setItem("lms_theme", next);
        document.documentElement.setAttribute("data-theme", next);
      }
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("lms_sidebar_collapsed", String(next));
      }
      return next;
    });
  }, []);

  // Diisi dari tabel enrollments setelah sesi diketahui. Sebelumnya nilai ini
  // di-hardcode ["c1"], sehingga semua orang tampak terdaftar di kursus yang
  // sama dan pembelian tidak benar-benar menambah akses.
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
  // Exam session: { questions: [...], examToken: string, loading: bool }
  const [examSession, setExamSession] = useState(null);
  const [examLoading, setExamLoading] = useState(false);
  // Fase 2 — timer ujian
  const [examTimeRemaining, setExamTimeRemaining] = useState(0); // detik, 0 = tidak aktif
  const [examTimerActive, setExamTimerActive] = useState(false);
  // Fase 2 — riwayat ujian
  const [examHistory, setExamHistory] = useState([]);
  const [examHistoryLoading, setExamHistoryLoading] = useState(false);
  // Fase 2 — progress per lesson dari DB
  const [dbLessonProgress, setDbLessonProgress] = useState({}); // { lessonIdx: { pct, completed } }
  const examTimerRef = useRef(null);
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
  const [adminTab, setAdminTab] = useState("courses");
  const [crudModalActive, setCrudModalActive] = useState(false);
  const [crudAction, setCrudAction] = useState("add");
  const [crudType, setCrudType] = useState("course");
  const [editingId, setEditingId] = useState(null);
  const [courseForm, setCourseForm] = useState({
    title: "", category: "AI", learningType: "self_learning", duration: "", level: "Dasar", price: "", badge: "", image: "",
    venue: "", schedule: "", quota: "", features: [],
    instructorName: "", instructorTitle: "", instructorEmail: "", instructorAvatar: "", instructorOrg: "", desc: ""
  });
  const [userForm, setUserForm] = useState({
    fullname: "", email: "", password: "password123", role: "student", jobTitle: "", organization: "", status: "active",
    permissions: ["view_dashboard", "access_lms"], competency: "A1 (Beginner)",
    competencyScores: { current: [50, 50, 50, 50, 50, 50], target: [80, 80, 80, 80, 80, 80] }
  });
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [lmsManageModalActive, setLmsManageModalActive] = useState(false);
  const [selectedLmsCourse, setSelectedLmsCourse] = useState(null);
  const [lmsManageTab, setLmsManageTab] = useState("materials");
  const [newLessonInput, setNewLessonInput] = useState({});
  const [dbMode, setDbMode] = useState("loading");
  const [platformSettings, setPlatformSettings] = useState({
    platform_name: "DIDIKARA",
    platform_tagline: "Platform Pelatihan & Sertifikasi Profesional",
    platform_logo: "/logos/didikara-symbol-redblue-2.jpg",
  });

  const refreshPlatformSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success && json.settings) {
        setPlatformSettings(json.settings);
      }
    } catch (err) {
      console.warn("Failed to load platform settings:", err);
    }
  }, []);

  const radarCanvasRef = useRef(null);
  const revenueCanvasRef = useRef(null);

  useEffect(() => {
    async function initApp() {
      try {
        const [sessionRes, appDataRes, settingsRes, catalogRes] = await Promise.allSettled([
          getSessionApi(),
          loadAppData(),
          fetch("/api/settings").then(r => r.json()),
          fetch("/api/catalog?limit=100").then(r => r.json()),
        ]);

        if (settingsRes.status === "fulfilled" && settingsRes.value?.success && settingsRes.value?.settings) {
          setPlatformSettings(settingsRes.value.settings);
        }

        let sessionUser = null;
        if (sessionRes.status === "fulfilled" && sessionRes.value?.success) {
          sessionUser = sessionRes.value.data;
          setCurrentUser(sessionUser);
        }
        setSessionChecked(true);

        if (appDataRes.status === "fulfilled" && appDataRes.value?.success && appDataRes.value?.database_mode === "postgresql") {
          const json = appDataRes.value;
          setUsers(json.data.users || []);
          setCourses(json.data.courses || []);
          setTransactions(json.data.transactions || []);
          setCertificates(json.data.certificates || []);
          if (json.data.categories) setCategories(json.data.categories);
          if (json.data.levels) setLevels(json.data.levels);
          setDbMode("postgresql");
        } else if (catalogRes.status === "fulfilled" && catalogRes.value?.success) {
          // Pengunjung publik / landing page tanpa login: muat data riil dari basis data
          setCourses(catalogRes.value.courses || []);
          if (catalogRes.value.categories?.length > 0) setCategories(catalogRes.value.categories);
          if (catalogRes.value.levels?.length > 0) setLevels(catalogRes.value.levels);
          setDbMode("postgresql");
        } else {
          setDbMode("postgresql");
        }

        if (sessionUser) {
          const enrollments = await loadEnrollments();
          setEnrolledCourses(enrollments);
        }
      } catch (err) {
        console.error("Init app error:", err);
        setDbMode("demo");
      } finally {
        setSessionChecked(true);
        setEnrollmentsLoaded(true);
      }
    }
    initApp();
  }, []);

  // Update active course saat courses berubah
  useEffect(() => {
    if (!activeCourse && enrolledCourses.length > 0) {
      const c = courses.find(item => item.id === enrolledCourses[0]);
      if (c) setActiveCourse(c);
    }
  }, [courses, enrolledCourses]);

  // Fase 2 — countdown timer ujian
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
  }, [examTimerActive]);

  // Fase 2 — auto-submit saat timer habis
  useEffect(() => {
    if (examTimerActive && examTimeRemaining === 0 && examSession && !quizResultMessage) {
      setExamTimerActive(false);
      handleQuizSubmit();
    }
  }, [examTimeRemaining, examTimerActive]);

  // Fase 2 — load riwayat ujian saat tab riwayat dibuka
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

  // Fase 2 — simpan progress lesson ke DB
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
    // Sync ke DB (fire-and-forget)
    saveProgress(activeCourse.id, lessonIdx, pct, completed).catch(() => {});
  }, [activeCourse]);

  // syncWithDb — pakai service layer
  const syncWithDb = useCallback((type, action, data) => {
    return syncEntity(type, action, data);
  }, []);

  const handleRoleTabChange = (role) => {
    setActiveRole(role);
    const emails = { student: "peserta@ailms.id", corporate: "hr@company.com", government: "gov@kemenkeu.go.id", admin: "admin@digidaya.tech" };
    setLoginEmail(emails[role] || "peserta@ailms.id");
    setLoginPassword("password123");
  };

  const handlePrefill = () => {
    const emails = { student: "peserta@ailms.id", corporate: "hr@company.com", government: "gov@kemenkeu.go.id", admin: "admin@digidaya.tech" };
    setLoginEmail(emails[activeRole] || "peserta@ailms.id");
    setLoginPassword("password123");
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const json = await loginApi(loginEmail, loginPassword);
      if (json.success) {
        // /api/auth/login membalas { user }, /api/auth/me membalas { data }.
        const loggedIn = json.user ?? json.data;
        if (!loggedIn) {
          alert("Respons login tidak terduga dari server.");
          return;
        }
        setCurrentUser(loggedIn);
        setActivePage("dashboard-page");
        // Reload DB data dengan role yang baru login
        try {
          const dbJson = await loadAppData();
          if (dbJson.success && dbJson.database_mode === "postgresql") {
            setUsers(dbJson.data.users);
            setCourses(dbJson.data.courses);
            setTransactions(dbJson.data.transactions);
            setCertificates(dbJson.data.certificates);
            if (dbJson.data.categories) setCategories(dbJson.data.categories);
            if (dbJson.data.levels) setLevels(dbJson.data.levels);
            setDbMode("postgresql");
          }
        } catch {}

        // Muat pendaftaran milik akun yang baru login — bukan sisa milik akun
        // sebelumnya. Kursus aktif ditentukan dari hasil ini.
        const milik = await loadEnrollments();
        setEnrolledCourses(milik);
        setEnrollmentsLoaded(true);
        if (milik.length > 0) {
          const c = courses.find(item => item.id === milik[0]);
          if (c) setActiveCourse(c);
        }
      } else {
        alert(json.error);
      }
    } catch {
      alert("Gagal terhubung ke server. Coba lagi.");
    }
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    // Bersihkan data milik akun sebelumnya agar tidak terbawa ke sesi berikutnya.
    setEnrolledCourses([]);
    setEnrollmentsLoaded(false);
    setActiveCourse(null);
    setCertificates([]);
    setVideoPlaying(false);
    setExamSession(null);
    clearInterval(examTimerRef.current);
    setExamTimerActive(false);
    setExamTimeRemaining(0);
    setExamHistory([]);
    setDbLessonProgress({});
    await logoutApi();
    fetch("/api/catalog?limit=100")
      .then(r => r.json())
      .then(cat => {
        if (cat.success && Array.isArray(cat.courses) && cat.courses.length > 0) {
          setCourses(cat.courses);
        }
      })
      .catch(() => {});
  };

  /**
   * Cek apakah kursus terkunci karena prerequisite belum selesai.
   * Kursus dianggap selesai jika user punya sertifikat untuk course tersebut.
   * Return: { locked: bool, prerequisiteTitle: string|null }
   */
  const checkPrerequisite = useCallback((courseId) => {
    const c = courses.find(item => item.id === courseId);
    if (!c || !c.prerequisiteCourseId) return { locked: false, prerequisiteTitle: null };
    const prereqCourse = courses.find(item => item.id === c.prerequisiteCourseId);
    // Cek sertifikat user untuk kursus prerequisite
    const hasCert = certificates.some(cert => cert.courseId === c.prerequisiteCourseId);
    return {
      locked: !hasCert,
      prerequisiteTitle: prereqCourse?.title || c.prerequisiteCourseId,
    };
  }, [courses, certificates]);

  /** Muat kehadiran hari ini saat kelas dibuka, agar tombol mencerminkan server. */
  const muatKehadiran = useCallback(async (courseId) => {
    try {
      const res  = await fetch(`/api/attendance?courseId=${encodeURIComponent(courseId)}`);
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
    } catch { /* kehadiran opsional */ }
  }, []);

  const handleOpenClass = useCallback(async (courseId) => {
    const c = courses.find(item => item.id === courseId);
    if (!c) return;

    // Cek prerequisite cross-course
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

    // Fase 2 — load progress dari DB untuk auto-resume
    try {
      const progJson = await loadProgress(courseId);
      if (progJson.success && progJson.progress) {
        setDbLessonProgress(progJson.progress);
        // Tandai completed lessons di state global
        const completedIdxs = Object.entries(progJson.progress)
          .filter(([, v]) => v.completed)
          .map(([k]) => parseInt(k, 10));
        if (completedIdxs.length > 0) {
          setCompletedLessons(prev => ({ ...prev, [courseId]: completedIdxs }));
        }
        // Auto-resume ke lesson terakhir
        const lastLesson = progJson.lastLesson ?? 0;
        setActiveLessonIndex(lastLesson);
      } else {
        setActiveLessonIndex(0);
      }
    } catch {
      setActiveLessonIndex(0);
    }
  }, [courses]);

  const handleSelectLesson = (idx) => {
    setActiveLessonIndex(idx);
    setVideoProgress(0);
    setVideoPlaying(false);
  };

  const handleEnrollCourse = (course) => {
    setSelectedPayCourse(course);
    setPaymentModalActive(true);
  };

  /**
   * Segarkan daftar kursus milik pengguna dari server.
   * Dipanggil setelah kursus gratis diaktifkan atau setelah admin
   * mengonfirmasi pembayaran — akses kelas hanya boleh berasal dari DB.
   */
  const refreshEnrollments = useCallback(async () => {
    const milik = await loadEnrollments();
    setEnrolledCourses(milik);
    setEnrollmentsLoaded(true);
    return milik;
  }, []);

  /**
   * Unggah berkas tugas lalu catat pengumpulannya.
   *
   * Dulu fungsi ini hanya `setTimeout` dua detik lalu berkata "berhasil":
   * tidak ada berkas yang dikirim dan tidak ada yang tersimpan, padahal
   * instruktur menilai lewat layar yang seolah menampilkan hasilnya.
   *
   * Alur sekarang: minta presigned URL (scope tugas) → unggah ke storage →
   * catat ke /api/assignments. Bila storage belum dikonfigurasi, berkas tidak
   * dipaksakan: peserta mengumpulkan tautan atau catatan jawaban.
   */
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
        const presText = await presRes.text();
        let pres;
        try {
          pres = JSON.parse(presText);
        } catch {
          throw new Error("Layanan penyimpanan belum terkonfigurasi atau merespons tidak valid. Silakan kumpulkan lewat tautan tugas.");
        }
        if (!pres.success) throw new Error(pres.error || "Gagal menyiapkan unggahan");

        if (pres.mockMode) {
          throw new Error("Penyimpanan berkas belum dikonfigurasi admin. Kumpulkan lewat tautan atau catatan.");
        }
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
      const resText = await res.text();
      let data;
      try {
        data = JSON.parse(resText);
      } catch {
        throw new Error("Gagal memproses respon penyimpanan pengumpulan.");
      }
      if (!res.ok || data.error) throw new Error(data.error || "Gagal menyimpan pengumpulan");

      setUploadStatus("Success");
    } catch (err) {
      setUploadStatus(`Error: ${err.message}`);
    }
  }, [activeCourse]);

  /**
   * Kehadiran nyata: IP dibaca server dari header permintaan, koordinat hanya
   * ikut bila peserta mengizinkan peramban membagikannya. Sebelumnya baris
   * "IP: 192.168.1.45, Lokasi GPS Terverifikasi" ditulis mati di kode.
   */
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
        () => resolve({}),                       // ditolak peserta — tetap lanjut
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

  const handleForumSubmit = () => {
    if (!forumInput.trim()) return;
    setForumPosts(prev => [...prev, { id: prev.length + 1, user: currentUser.fullname, label: currentUser.roleLabel, text: forumInput.trim(), time: "Baru saja" }]);
    setForumInput("");
  };

  // Mulai sesi ujian: ambil soal yang sudah diacak dari server (via examService)
  const handleStartExam = useCallback(async () => {
    if (!activeCourse) return;
    setExamLoading(true);
    setExamSession(null);
    setSelectedAnswers({});
    setQuizResultMessage(null);
    // Reset timer
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
        // Mulai countdown jika ada batas waktu
        if (timeLimit > 0) {
          setExamTimeRemaining(timeLimit * 60);
          setExamTimerActive(true);
        }
      } else {
        // Tidak ada lagi jalur cadangan yang menilai ujian di peramban. Jalur
        // itu melewati batas percobaan, dan sejak kunci jawaban tidak lagi
        // dikirim ke klien, penilaiannya pun tidak mungkin benar. Lebih jujur
        // menyatakan sesi ujian gagal dibuka beserta alasannya dari server —
        // termasuk "belum terdaftar" dan "prasyarat belum lulus".
        setQuizResultMessage({
          success: false,
          text: json.error || "Sesi ujian tidak dapat dibuka. Coba lagi beberapa saat lagi.",
        });
      }
    } catch {
      setQuizResultMessage({
        success: false,
        text: "Tidak dapat menghubungi server ujian. Periksa koneksi Anda lalu coba lagi.",
      });
    } finally {
      setExamLoading(false);
    }
  }, [activeCourse]);

  const handleQuizSubmit = useCallback(async () => {
    if (!activeCourse || !examSession) return;
    const questions = examSession.questions;
    if (!questions || questions.length === 0) return;

    // Stop timer
    clearInterval(examTimerRef.current);
    setExamTimerActive(false);

    // Validasi semua soal sudah dijawab (skip jika timeout)
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

    // Penilaian sepenuhnya di server: skor dihitung dari kunci jawaban yang
    // tersimpan di dalam examToken bertanda tangan. Tanpa token, tidak ada
    // ujian yang sah — sertifikat tidak boleh lahir dari perhitungan peramban.
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
          text: json.error || "Jawaban gagal dikirim. Coba lagi sebelum waktu ujian habis.",
        });
      }
    } catch {
      setQuizResultMessage({
        success: false,
        text: "Jawaban gagal dikirim — koneksi ke server ujian terputus. Coba lagi.",
      });
    }
  }, [activeCourse, examSession, selectedAnswers, certificates]);

  const handleViewCert = (cert) => {
    setActiveCert(cert);
    setCertModalActive(true);
  };

  const handleGovGenerate = async (e) => {
    e.preventDefault();
    setGovLoading(true);
    setGovResult(null);
    try {
      const response = await fetch("/api/ai-planner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "gov", instansi: govForm.instansi, jabatan: govForm.jabatan, target: govForm.target, pegawai: govForm.pegawai }) });
      const resData = await response.json();
      if (resData.success && !resData.isMock) {
        setGovResult({ budget: resData.data.budget, duration: resData.data.duration, steps: resData.data.steps, isMock: false });
      } else {
        let budget = govForm.pegawai * (govForm.target === "Data Analytics & AI" ? 2500000 : govForm.target === "Procurement & Contract" ? 3000000 : 5000000);
        let duration = govForm.target === "Data Analytics & AI" ? '4 Bulan' : govForm.target === "Procurement & Contract" ? '3 Bulan' : '6 Bulan';
        let steps = govForm.target === "Data Analytics & AI" ? [{ title: "Tahap 1: Data Analytics Foundation (20 Jam)", desc: "Materi statistik dasar, pemrosesan data, dan pengantar query SQL." }, { title: "Tahap 2: Power BI Professional (24 Jam)", desc: "Sertifikasi keahlian pemodelan data interaktif untuk visualisasi laporan kinerja instansi." }, { title: "Tahap 3: AI for Government Administration (15 Jam)", desc: "Penggunaan Generative AI secara etis dan efisien untuk meningkatkan administrasi publik." }] : govForm.target === "Procurement & Contract" ? [{ title: "Tahap 1: PBJ Level 1 (Sertifikasi LKPP)", desc: "Pondasi dasar aturan dan etika Pengadaan Barang Jasa Pemerintah." }, { title: "Tahap 2: Contract Management & Negotiation", desc: "Keahlian menyusun draf kontrak hukum dan mengelola perselisihan pengadaan." }] : [{ title: "Tahap 1: ESG Alignment & Sustainability in Gov", desc: "Integrasi program pembangunan berkelanjutan pada kebijakan pemerintah." }, { title: "Tahap 2: Strategic Leadership & Public Sector Ethics", desc: "Tata kelola pemerintahan yang bersih (Good Governance) untuk eselon pimpinan." }];
        setGovResult({ budget, duration, steps, isMock: true, message: resData.message });
      }
    } catch (err) {
      setGovResult({ budget: govForm.pegawai * 2500000, duration: "3 Bulan", steps: [{ title: "Asesmen Kompetensi Awal", desc: "Fallback mock data loaded." }], isMock: true });
    } finally { setGovLoading(false); }
  };

  const handleCorpGenerate = async (e) => {
    e.preventDefault();
    setCorpLoading(true);
    setCorpResult(null);
    try {
      const response = await fetch("/api/ai-planner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "corp", currentJob: corpForm.currentJob, targetJob: corpForm.targetJob }) });
      const resData = await response.json();
      if (resData.success && !resData.isMock) {
        setCorpResult({ cost: resData.data.cost, time: resData.data.time, gaps: resData.data.gaps, steps: resData.data.steps, isMock: false });
      } else {
        setCorpResult({ cost: 15000000, time: "6 Bulan", gaps: ["Contract Law & Negotiating Strategy", "Vendor Risk & Audit Performance", "Leadership & Executive Coordination"], steps: [{ title: "Fase 1: Uji Kompetensi Awal", desc: `Melakukan asesmen standar kompetensi jabatan saat ini (${corpForm.currentJob}).` }, { title: "Fase 2: Pelatihan 'Contract & Vendor Management'", desc: "Mengisi kesenjangan keahlian dalam perancangan perjanjian komersial." }, { title: "Fase 3: Sertifikasi Kepemimpinan Profesional (Leadership)", desc: `Pelatihan eksekutif untuk siap dipromosikan ke posisi ${corpForm.targetJob}.` }], isMock: true, message: resData.message });
      }
    } catch (err) {
      setCorpResult({ cost: 15000000, time: "6 Bulan", gaps: ["Gagal menghubungkan ke server AI. Menggunakan simulasi."], steps: [{ title: "Offline Fallback", desc: "Silakan periksa koneksi internet Anda." }], isMock: true });
    } finally { setCorpLoading(false); }
  };

  const handleOpenCrudModal = (type, action, record = null) => {
    setCrudType(type);
    setCrudAction(action);
    setEditingId(record ? (record.id || record.email) : null);
    if (type === "course") {
      if (action === "edit" && record) {
        setCourseForm({
          title: record.title || "",
          category: record.category || "AI",
          learningType: record.learningType || "self_learning",
          duration: record.duration || "",
          level: record.level || "Dasar",
          price: record.price || 0,
          badge: record.badge || "",
          image: record.image || "",
          venue: record.venue || "",
          schedule: record.schedule || "",
          quota: record.quota || "",
          features: record.features || [],
          instructorName: record.instructor?.name || "",
          instructorTitle: record.instructor?.title || "",
          instructorEmail: record.instructor?.email || "",
          instructorAvatar: record.instructor?.avatar || "",
          instructorOrg: record.instructor?.org || "",
          desc: record.desc || record.description || ""
        });
      } else {
        setCourseForm({
          title: "",
          category: categories[0]?.key || "AI",
          learningType: "self_learning",
          duration: "10 Jam",
          level: levels[0]?.key || "Dasar",
          price: 0,
          badge: "Kursus Baru",
          image: "",
          venue: "",
          schedule: "",
          quota: "",
          features: [],
          instructorName: "",
          instructorTitle: "",
          instructorEmail: "",
          instructorAvatar: "",
          instructorOrg: "",
          desc: ""
        });
      }
    } else if (type === "user") {
      if (action === "edit" && record) {
        // Password sengaja dikosongkan: respons API tidak lagi memuatnya, dan
        // kosong berarti "jangan ubah" di sisi server.
        setUserForm({ fullname: record.fullname, email: record.email, password: "", role: record.role, jobTitle: record.jobTitle || "", organization: record.organization || "", status: record.status || "active", permissions: record.permissions || [], competency: record.stats ? record.stats.competency : "A1 (Beginner)", competencyScores: record.competencies ? { current: [...record.competencies.current], target: [...record.competencies.target] } : { current: [50, 50, 50, 50, 50, 50], target: [80, 80, 80, 80, 80, 80] } });
      } else {
        setUserForm({ fullname: "", email: "", password: "password123", role: "student", jobTitle: "", organization: "", status: "active", permissions: ["view_dashboard", "access_lms"], competency: "A1 (Beginner)", competencyScores: { current: [50, 50, 50, 50, 50, 50], target: [80, 80, 80, 80, 80, 80] } });
      }
    }
    setCrudModalActive(true);
  };

  const handleSaveCrud = (e) => {
    e.preventDefault();
    if (crudType === "course") {
      const formattedPrice = parseInt(courseForm.price) || 0;
      const priceLabel = formattedPrice === 0 ? "Gratis (Free)" : `Rp ${formattedPrice.toLocaleString('id-ID')}`;
      const lType = courseForm.learningType || (formattedPrice === 0 ? "self_learning" : "online");
      const typeLabel = lType === "online" ? "Online (Live Webinar)" : lType === "offline" ? "Offline (Tatap Muka)" : "Self-Learning (Belajar Mandiri)";
      const defaultVenue = lType === "offline" ? "Hotel / Ruang Pelatihan Tatap Muka" : lType === "online" ? "Live Interactive Zoom / Google Meet" : "Akses Belajar Mandiri On-Demand 24/7";
      const defaultSchedule = lType === "offline" ? "Jadwal Ditentukan" : lType === "online" ? "Sesi Live Interaktif" : "Fleksibel Kapan Saja (Tanpa Jadwal)";
      const defaultQuota = lType === "offline" ? "Kuota Terbatas" : lType === "online" ? "Slot Tersedia" : "Tanpa Batas Kuota";
      const defaultFeatures = lType === "offline"
        ? ["Workshop Tatap Muka", "Modul Cetak & Seminar Kit", "Simulasi Studi Kasus Langsung", "Sertifikat Fisik & Digital"]
        : lType === "online"
        ? ["Live Webinar Interaktif (Zoom)", "Tanya Jawab & Bimbingan Langsung", "Akses Rekaman Video & Slide", "Sertifikat Digital"]
        : ["100% Gratis & Fleksibel", "Akses Video On-Demand 24/7", "Slide PPT & Modul PDF", "Kuis Evaluasi Otomatis", "Sertifikat Kelulusan Standar"];

      const venue = lType === "self_learning" ? "Akses Belajar Mandiri On-Demand 24/7" : (courseForm.venue?.trim() ? courseForm.venue : defaultVenue);
      const schedule = lType === "self_learning" ? "Fleksibel Kapan Saja (Tanpa Jadwal)" : (courseForm.schedule?.trim() ? courseForm.schedule : defaultSchedule);
      const quota = lType === "self_learning" ? "Tanpa Batas Kuota" : (courseForm.quota?.trim() ? courseForm.quota : defaultQuota);
      const features = (courseForm.features && courseForm.features.length > 0) ? courseForm.features : defaultFeatures;

      const instructorObj = courseForm.instructorName ? {
        name: courseForm.instructorName,
        title: courseForm.instructorTitle || "Pengajar Ahli",
        org: courseForm.instructorOrg || "LMS Certified",
        avatar: courseForm.instructorAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
        email: courseForm.instructorEmail || ""
      } : null;

      if (crudAction === "add") {
        const newCourse = {
          id: `c${Date.now()}`,
          title: courseForm.title,
          category: courseForm.category,
          learningType: lType,
          typeLabel,
          duration: courseForm.duration,
          level: courseForm.level,
          price: formattedPrice,
          priceLabel,
          rating: "5.0",
          badge: courseForm.badge || "Kursus Baru",
          image: courseForm.image || "",
          venue,
          schedule,
          quota,
          features,
          instructor: instructorObj,
          desc: courseForm.desc,
          description: courseForm.desc,
          modules: [{ title: "Modul 1: Pendahuluan", lessons: [{ title: "1.1 Pengenalan Materi", type: "text", url: "" }, { title: "1.2 Dasar Teori & Logika Kerja", type: "text", url: "" }] }],
          quiz: [{ q: "Apa nama platform ini?", options: ["DIDIKARA", "LMS Biasa", "Course Finder", "Study Hub"], correct: 0 }]
        };
        setCourses(prev => [...prev, newCourse]);
        syncWithDb("course", "save", newCourse);
        if (courseForm.instructorEmail) {
          fetch("/api/course-instructors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ courseId: newCourse.id, userEmail: courseForm.instructorEmail })
          }).catch(() => {});
        }
      } else {
        const targetCourse = courses.find(c => c.id === editingId);
        const updatedCourse = {
          ...targetCourse,
          title: courseForm.title,
          category: courseForm.category,
          learningType: lType,
          typeLabel,
          duration: courseForm.duration,
          level: courseForm.level,
          price: formattedPrice,
          priceLabel,
          badge: courseForm.badge,
          image: courseForm.image || "",
          venue: lType === "self_learning" ? "Akses Belajar Mandiri On-Demand 24/7" : (courseForm.venue?.trim() ? courseForm.venue : (targetCourse?.venue || defaultVenue)),
          schedule: lType === "self_learning" ? "Fleksibel Kapan Saja (Tanpa Jadwal)" : (courseForm.schedule?.trim() ? courseForm.schedule : (targetCourse?.schedule || defaultSchedule)),
          quota: lType === "self_learning" ? "Tanpa Batas Kuota" : (courseForm.quota?.trim() ? courseForm.quota : (targetCourse?.quota || defaultQuota)),
          features: (courseForm.features && courseForm.features.length > 0) ? courseForm.features : (targetCourse?.features || defaultFeatures),
          instructor: instructorObj || targetCourse?.instructor,
          desc: courseForm.desc,
          description: courseForm.desc
        };
        setCourses(prev => prev.map(c => c.id === editingId ? updatedCourse : c));
        syncWithDb("course", "save", updatedCourse);
        if (courseForm.instructorEmail) {
          fetch("/api/course-instructors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ courseId: editingId, userEmail: courseForm.instructorEmail })
          }).catch(() => {});
        }
      }
    } else if (crudType === "user") {
      const roleLabels = { student: "Peserta Mandiri", corporate: "HR Manager", government: "Kepala Biro SDM", admin: "Platform Admin" };
      const initials = userForm.fullname.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
      if (crudAction === "add") {
        const newUser = { email: userForm.email, password: userForm.password, fullname: userForm.fullname, role: userForm.role, roleLabel: roleLabels[userForm.role], avatar: initials || "US", stats: { hours: 0, courses: 0, certs: 0, competency: userForm.competency }, jobTitle: userForm.jobTitle, organization: userForm.organization, status: userForm.status, permissions: userForm.permissions, competencies: { current: [...userForm.competencyScores.current], target: [...userForm.competencyScores.target] } };
        setUsers(prev => [...prev, newUser]);
        syncWithDb("user", "save", newUser);
      } else {
        const targetUser = users.find(u => u.email === editingId);
        const updatedUser = { ...targetUser, fullname: userForm.fullname, password: userForm.password, role: userForm.role, roleLabel: roleLabels[userForm.role], jobTitle: userForm.jobTitle, organization: userForm.organization, status: userForm.status, permissions: userForm.permissions, avatar: initials || targetUser.avatar, stats: { ...targetUser.stats, competency: userForm.competency }, competencies: { current: [...userForm.competencyScores.current], target: [...userForm.competencyScores.target] } };
        setUsers(prev => prev.map(u => u.email === editingId ? updatedUser : u));
        syncWithDb("user", "save", updatedUser);
        if (currentUser && currentUser.email === editingId) setCurrentUser(updatedUser);
      }
    }
    setCrudModalActive(false);
  };

  const handleDeleteCrud = (type, id) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data master ini?")) return;
    if (type === "course") {
      setCourses(prev => prev.filter(c => c.id !== id));
      syncWithDb("course", "delete", { id });
      if (activeCourse && activeCourse.id === id) setActiveCourse(null);
    } else if (type === "user") { setUsers(prev => prev.filter(u => u.email !== id)); syncWithDb("user", "delete", { id }); }
  };

  const handlePermissionToggle = (perm) => {
    const isChecked = userForm.permissions.includes(perm);
    setUserForm(prev => ({ ...prev, permissions: isChecked ? prev.permissions.filter(p => p !== perm) : [...prev.permissions, perm] }));
  };

  const handleOpenLmsManageModal = (course) => {
    const courseCopy = JSON.parse(JSON.stringify(course));
    if (!courseCopy.modules) courseCopy.modules = [];
    if (!courseCopy.quiz) courseCopy.quiz = [];
    courseCopy.modules = courseCopy.modules.map(m => ({
      ...m,
      lessons: Array.isArray(m.lessons)
        ? m.lessons.map(l => (typeof l === "string" ? { title: l, type: "video", url: "" } : l))
        : []
    }));
    setSelectedLmsCourse(courseCopy);
    setLmsManageTab("materials");
    setNewLessonInput({});
    setLmsManageModalActive(true);
  };

  const handleLmsAddModule = () => setSelectedLmsCourse(prev => ({ ...prev, modules: [...prev.modules, { title: "Modul Baru", lessons: [] }] }));
  const handleLmsDeleteModule = (modIdx) => setSelectedLmsCourse(prev => ({ ...prev, modules: prev.modules.filter((_, idx) => idx !== modIdx) }));
  const handleLmsModuleTitleChange = (modIdx, value) => setSelectedLmsCourse(prev => ({ ...prev, modules: prev.modules.map((m, idx) => idx === modIdx ? { ...m, title: value } : m) }));
  const handleLmsAddLesson = (modIdx) => {
    setSelectedLmsCourse(prev => {
      if (!prev || !prev.modules) return prev;
      return {
        ...prev,
        modules: prev.modules.map((m, idx) => {
          if (idx !== modIdx) return m;
          const currentLessons = Array.isArray(m.lessons) ? m.lessons : [];
          const nextIndex = currentLessons.length + 1;
          const newLesson = {
            title: `${idx + 1}.${nextIndex} Pelajaran Baru`,
            type: "video",
            url: ""
          };
          return {
            ...m,
            lessons: [...currentLessons, newLesson]
          };
        })
      };
    });
  };
  const handleLmsDeleteLesson = (modIdx, lessonIdx) => setSelectedLmsCourse(prev => ({ ...prev, modules: prev.modules.map((m, idx) => idx === modIdx ? { ...m, lessons: m.lessons.filter((_, lIdx) => lIdx !== lessonIdx) } : m) }));
  const handleLmsLessonChange = (modIdx, lessonIdx, field, value) => setSelectedLmsCourse(prev => ({ ...prev, modules: prev.modules.map((m, idx) => idx === modIdx ? { ...m, lessons: m.lessons.map((l, lIdx) => lIdx === lessonIdx ? { ...(typeof l === 'string' ? { title: l, type: 'text', url: '' } : l), [field]: value } : l) } : m) }));
  const handleLmsAddQuestion = () => setSelectedLmsCourse(prev => ({ ...prev, quiz: [...(prev.quiz || []), { q: "Pertanyaan Ujian Baru?", options: ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"], correct: 0 }] }));
  const handleLmsDeleteQuestion = (qIdx) => setSelectedLmsCourse(prev => ({ ...prev, quiz: prev.quiz.filter((_, idx) => idx !== qIdx) }));
  const handleLmsQuestionTitleChange = (qIdx, value) => setSelectedLmsCourse(prev => ({ ...prev, quiz: prev.quiz.map((q, idx) => idx === qIdx ? { ...q, q: value } : q) }));
  const handleLmsOptionTextChange = (qIdx, optIdx, value) => setSelectedLmsCourse(prev => ({ ...prev, quiz: prev.quiz.map((q, idx) => idx === qIdx ? { ...q, options: q.options.map((opt, oIdx) => oIdx === optIdx ? value : opt) } : q) }));
  const handleLmsQuestionCorrectChange = (qIdx, value) => setSelectedLmsCourse(prev => ({ ...prev, quiz: prev.quiz.map((q, idx) => idx === qIdx ? { ...q, correct: parseInt(value) } : q) }));
  const handleLmsSaveAll = () => {
    setCourses(prev => prev.map(c => c.id === selectedLmsCourse.id ? selectedLmsCourse : c));
    syncWithDb("course", "save", selectedLmsCourse);
    if (activeCourse && activeCourse.id === selectedLmsCourse.id) {
      setActiveCourse(selectedLmsCourse);
      setActiveLessonIndex(0);
      setVideoProgress(0);
      setVideoPlaying(false);
      setSelectedAnswers({});
      setQuizResultMessage(null);
    }

    // Otomatis berikan akses publik untuk video/file Google Drive yang tersimpan
    try {
      (selectedLmsCourse.modules || []).forEach(m => {
        (m.lessons || []).forEach(l => {
          const lUrl = typeof l === "string" ? "" : (l?.url || "");
          if (lUrl.includes("drive.google.com") || lUrl.includes("docs.google.com")) {
            fetch("/api/drive/grant-access", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: lUrl }),
            }).catch(() => {});
          }
        });
      });
    } catch {}

    setLmsManageModalActive(false);
    alert(`Materi dan Soal Ujian untuk "${selectedLmsCourse.title}" berhasil diperbarui!`);
  };

  const handleAddCategory = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newCatKey.trim() || !newCatName.trim()) return;
    if (categories.some(c => c.key.toLowerCase() === newCatKey.trim().toLowerCase())) { alert("Kategori dengan Kode tersebut sudah ada."); return; }
    const newCat = { key: newCatKey.trim(), name: newCatName.trim() };
    setCategories(prev => [...prev, newCat]);
    syncWithDb("category", "save", newCat);
    setNewCatKey(""); setNewCatName("");
  };

  const handleUpdateCategory = (oldKey, updatedData) => {
    const newKey = (updatedData.key || oldKey).trim();
    const newName = (updatedData.name || "").trim();
    if (!newName) {
      alert("Nama kategori tidak boleh kosong.");
      return false;
    }
    if (newKey.toLowerCase() !== oldKey.toLowerCase() && categories.some(c => c.key.toLowerCase() === newKey.toLowerCase())) {
      alert("Kode kategori sudah digunakan oleh kategori lain.");
      return false;
    }
    const updatedCat = { key: newKey, name: newName };
    setCategories(prev => prev.map(c => c.key === oldKey ? updatedCat : c));
    syncWithDb("category", "save", updatedCat);
    if (newKey !== oldKey) {
      syncWithDb("category", "delete", { key: oldKey });
      // Update affected courses in state and DB
      setCourses(prev => prev.map(course => {
        if (course.category === oldKey) {
          const updatedCourse = { ...course, category: newKey };
          syncWithDb("course", "save", updatedCourse);
          return updatedCourse;
        }
        return course;
      }));
    }
    return true;
  };

  const handleDeleteCategory = (key) => {
    const count = courses.filter(c => c.category === key).length;
    const msg = count > 0
      ? `Kategori "${key}" saat ini digunakan oleh ${count} program pelatihan.\n\nMenghapus kategori ini akan menyebabkan kursus terkait kehilangan kategorinya. Tetap hapus?`
      : `Apakah Anda yakin ingin menghapus kategori "${key}"?`;
    if (confirm(msg)) {
      setCategories(prev => prev.filter(c => c.key !== key));
      syncWithDb("category", "delete", { key });
    }
  };

  const handleAddLevel = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newLvlKey.trim() || !newLvlName.trim()) return;
    if (levels.some(l => l.key.toLowerCase() === newLvlKey.trim().toLowerCase())) { alert("Tingkat (Level) dengan Kode tersebut sudah ada."); return; }
    const newLvl = { key: newLvlKey.trim(), name: newLvlName.trim() };
    setLevels(prev => [...prev, newLvl]);
    syncWithDb("level", "save", newLvl);
    setNewLvlKey(""); setNewLvlName("");
  };

  const handleUpdateLevel = (oldKey, updatedData) => {
    const newKey = (updatedData.key || oldKey).trim();
    const newName = (updatedData.name || "").trim();
    if (!newName) {
      alert("Nama tingkat (level) tidak boleh kosong.");
      return false;
    }
    if (newKey.toLowerCase() !== oldKey.toLowerCase() && levels.some(l => l.key.toLowerCase() === newKey.toLowerCase())) {
      alert("Kode level sudah digunakan oleh tingkat lain.");
      return false;
    }
    const updatedLvl = { key: newKey, name: newName };
    setLevels(prev => prev.map(l => l.key === oldKey ? updatedLvl : l));
    syncWithDb("level", "save", updatedLvl);
    if (newKey !== oldKey) {
      syncWithDb("level", "delete", { key: oldKey });
      // Update affected courses in state and DB
      setCourses(prev => prev.map(course => {
        if (course.level === oldKey) {
          const updatedCourse = { ...course, level: newKey };
          syncWithDb("course", "save", updatedCourse);
          return updatedCourse;
        }
        return course;
      }));
    }
    return true;
  };

  const handleDeleteLevel = (key) => {
    const count = courses.filter(c => c.level === key).length;
    const msg = count > 0
      ? `Tingkat (level) "${key}" saat ini digunakan oleh ${count} program pelatihan.\n\nMenghapus level ini akan mempengaruhi kursus terkait. Tetap hapus?`
      : `Apakah Anda yakin ingin menghapus tingkat (level) "${key}"?`;
    if (confirm(msg)) {
      setLevels(prev => prev.filter(l => l.key !== key));
      syncWithDb("level", "delete", { key });
    }
  };

  const handleAddCompetencySkill = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newSkillKey.trim() || !newSkillName.trim()) return;
    const keyFormatted = newSkillKey.trim().toLowerCase().replace(/\s+/g, "_");
    if (competencySkills.some(s => s.key.toLowerCase() === keyFormatted || s.name.toLowerCase() === newSkillName.trim().toLowerCase())) {
      alert("Kompetensi dengan Kode atau Nama tersebut sudah ada.");
      return;
    }
    const newSkill = { key: keyFormatted, name: newSkillName.trim() };
    const updated = [...competencySkills, newSkill];
    setCompetencySkills(updated);
    try {
      localStorage.setItem("ailms_competency_skills", JSON.stringify(updated));
    } catch {}
    setNewSkillKey("");
    setNewSkillName("");
  };

  const handleUpdateCompetencySkill = (oldKey, updatedData) => {
    const newKey = (updatedData.key || oldKey).trim().toLowerCase().replace(/\s+/g, "_");
    const newName = (updatedData.name || "").trim();
    if (!newName) {
      alert("Nama dimensi kompetensi tidak boleh kosong.");
      return false;
    }
    if (newKey !== oldKey && competencySkills.some(s => s.key === newKey)) {
      alert("Kode dimensi kompetensi sudah digunakan.");
      return false;
    }
    const updatedSkill = { key: newKey, name: newName };
    const updated = competencySkills.map(s => s.key === oldKey ? updatedSkill : s);
    setCompetencySkills(updated);
    try {
      localStorage.setItem("ailms_competency_skills", JSON.stringify(updated));
    } catch {}
    return true;
  };

  const handleDeleteCompetencySkill = (key) => {
    if (competencySkills.length <= 3) {
      alert("Minimal harus ada 3 dimensi kompetensi untuk visualisasi Radar Chart.");
      return;
    }
    const skill = competencySkills.find(s => s.key === key);
    const name = skill ? skill.name : key;
    if (confirm(`Apakah Anda yakin ingin menghapus dimensi kompetensi "${name}"?`)) {
      const updated = competencySkills.filter(s => s.key !== key);
      setCompetencySkills(updated);
      try {
        localStorage.setItem("ailms_competency_skills", JSON.stringify(updated));
      } catch {}
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.fullname.toLowerCase().includes(userSearchQuery.toLowerCase()) || u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) || (u.organization && u.organization.toLowerCase().includes(userSearchQuery.toLowerCase())) || (u.jobTitle && u.jobTitle.toLowerCase().includes(userSearchQuery.toLowerCase()));
    const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
    const matchesStatus = userStatusFilter === "all" || u.status === userStatusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const flatLessons = activeCourse && activeCourse.modules ? activeCourse.modules.reduce((acc, mod) => [...acc, ...(mod.lessons || []).map(l => typeof l === 'string' ? { title: l, type: 'text', url: '' } : l)], []) : [];

  const value = {
    // Data
    users, courses, categories, levels, competencySkills,
    certificates, transactions, enrolledCourses, setEnrolledCourses, dbMode,
    // Auth
    currentUser, sessionChecked, activePage, loginEmail, loginPassword, activeRole,
    // LMS State
    activeCourse, activeLessonIndex, videoPlaying, videoProgress, videoTime,
    completedLessons, activeLmsTab, selectedAnswers, quizResultMessage,
    examSession, examLoading,
    // Fase 2 — timer, history, progress
    examTimeRemaining, examTimerActive,
    examHistory, examHistoryLoading,
    dbLessonProgress,
    uploadStatus, attendanceLog, checkedIn, forumPosts, forumInput,
    // Wallet
    paymentModalActive, setPaymentModalActive, selectedPayCourse, setSelectedPayCourse, paymentMethod, setPaymentMethod,
    certModalActive, activeCert,
    // Marketplace
    filterCategory,
    // AI Planner
    govForm, govLoading, govResult, corpForm, corpLoading, corpResult,
    // Admin
    adminTab, crudModalActive, crudType, crudAction, courseForm, userForm,
    userSearchQuery, userRoleFilter, userStatusFilter,
    lmsManageModalActive, selectedLmsCourse, lmsManageTab, newLessonInput,
    editingId, newCatKey, newCatName, newLvlKey, newLvlName, newSkillKey, newSkillName,
    // Computed
    filteredUsers, flatLessons,
    // Refs
    radarCanvasRef, revenueCanvasRef,
    // Auth Setters
    setLoginEmail, setLoginPassword, setActiveRole,
    // Page setter
    setActivePage,
    // Direct state setters needed by components
    setActiveCourse, setActiveLessonIndex,
    setGovForm, setCorpForm,
    setCourseForm, setUserForm,
    // Handlers
    handleRoleTabChange, handlePrefill, handleLoginSubmit, handleLogout,
    handleOpenClass, handleSelectLesson, handleEnrollCourse,
    refreshEnrollments, enrollmentsLoaded,
    handleAssignmentUpload, handleAttendance, muatKehadiran, handleForumSubmit,
    handleStartExam, handleQuizSubmit,
    handleLoadExamHistory, handleSaveLessonProgress,
    handleViewCert, handleGovGenerate, handleCorpGenerate,
    handleOpenCrudModal, handleSaveCrud, handleDeleteCrud,
    handlePermissionToggle, handleOpenLmsManageModal,
    handleLmsAddModule, handleLmsDeleteModule, handleLmsModuleTitleChange,
    handleLmsAddLesson, handleLmsDeleteLesson, handleLmsLessonChange,
    handleLmsAddQuestion, handleLmsDeleteQuestion, handleLmsQuestionTitleChange,
    handleLmsOptionTextChange, handleLmsQuestionCorrectChange, handleLmsSaveAll,
    handleAddCategory, handleUpdateCategory, handleDeleteCategory,
    handleAddLevel, handleUpdateLevel, handleDeleteLevel,
    handleAddCompetencySkill, handleUpdateCompetencySkill, handleDeleteCompetencySkill,
    // Direct setters
    setCategories, setLevels, setCompetencySkills,
    setActiveLmsTab, setVideoPlaying, setVideoProgress, setVideoTime,
    setSelectedAnswers, setQuizResultMessage, setUploadStatus,
    setFilterCategory,
    setUserSearchQuery, setUserRoleFilter, setUserStatusFilter,
    setAdminTab, setCrudModalActive, setLmsManageModalActive,
    setLmsManageTab, setSelectedLmsCourse,
    setNewCatKey, setNewCatName, setNewLvlKey, setNewLvlName, setNewSkillKey, setNewSkillName,
    setCertModalActive, setForumInput,
    setCheckedIn,
    // Fase 2 extra
    setExamSession, setExamTimeRemaining, setExamTimerActive,
    // Fase 3
    checkPrerequisite,
    // Theme & Sidebar Collapse
    theme, toggleTheme,
    sidebarCollapsed, setSidebarCollapsed, toggleSidebar,
    // Platform Settings & Branding
    platformSettings, refreshPlatformSettings, setPlatformSettings,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// useApp is also available from @/context/useApp
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
