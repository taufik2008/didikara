"use client";
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { loginApi, logoutApi, getSessionApi } from "@/services/authService";
import { loadAppData, syncEntity, loadEnrollments } from "@/services/courseService";
import { startExam, submitExam, getExamHistory } from "@/services/examService";
import { loadProgress, saveProgress } from "@/services/progressService";

const initialUsers = [
  { email: "peserta@nhcie.go.id", fullname: "Ahmad Hidayat", role: "student", roleLabel: "Peserta Mandiri", avatar: "AH", stats: { hours: 14.5, courses: 1, certs: 1, competency: "B1 (Intermediate)" }, jobTitle: "Staff Procurement", organization: "Mandiri", status: "active", permissions: ["view_dashboard", "access_lms"], competencies: { current: [65, 70, 50, 45, 60, 40], target: [80, 85, 75, 70, 80, 75] } },
  { email: "hr@company.com", fullname: "Siti Rahmawati", role: "corporate", roleLabel: "HR Manager - PT Bank Mandiri", avatar: "SR", stats: { hours: 450, courses: 8, certs: 32, competency: "Enterprise Account" }, jobTitle: "Human Capital Director", organization: "PT Bank Mandiri", status: "active", permissions: ["view_dashboard", "access_lms", "access_ai_portal"], competencies: { current: [75, 80, 60, 70, 65, 80], target: [90, 90, 80, 85, 80, 90] } },
  { email: "gov@kemenkeu.go.id", fullname: "Drs. Bambang Wijaya, M.Si", role: "government", roleLabel: "Kepala Biro SDM - Kemenkeu", avatar: "BW", stats: { hours: 1250, courses: 15, certs: 142, competency: "Echelon II Portal" }, jobTitle: "Biro Kepegawaian", organization: "Kementerian Keuangan", status: "active", permissions: ["view_dashboard", "access_lms", "access_ai_portal"], competencies: { current: [80, 75, 70, 85, 75, 60], target: [95, 90, 85, 95, 90, 85] } },
  { email: "admin@nhcie.go.id", fullname: "Super Administrator", role: "admin", roleLabel: "Platform Admin & Auditor", avatar: "SA", stats: { hours: 0, courses: 10, certs: 250, competency: "Root Control" }, jobTitle: "System Admin", organization: "Trisakti AI Solutions", status: "active", permissions: ["view_dashboard", "access_lms", "access_ai_portal", "manage_master_data"], competencies: { current: [80, 80, 80, 80, 80, 80], target: [90, 90, 90, 90, 90, 90] } }
];

const initialCourses = [
  { id: "c1", title: "PBJ Level 1 (Pengadaan Barang & Jasa Pemerintah)", category: "Procurement", duration: "30 Jam", level: "Dasar", price: 2500000, priceLabel: "Rp 2,500,000", rating: "4.8", badge: "BNSP / LKPP Ready", desc: "Materi persiapan lengkap untuk ujian sertifikasi keahlian Pengadaan Barang dan Jasa Pemerintah Tingkat Dasar sesuai Perpres No. 16/2018 dan perubahannya.", modules: [{ title: "Modul 1: Ketentuan Umum & Pengantar PBJ", lessons: ["1.1 Latar Belakang & Definisi PBJ", "1.2 Ruang Lingkup & Tujuan PBJ", "1.3 Etika & Prinsip Dasar Pengadaan"] }, { title: "Modul 2: Perencanaan Pengadaan", lessons: ["2.1 Identifikasi Kebutuhan & Penetapan Barang/Jasa", "2.2 Penyusunan Anggaran & RUP", "2.3 Pemaketan & Konsolidasi Pengadaan"] }, { title: "Modul 3: Persiapan & Pelaksanaan Kontrak", lessons: ["3.1 Penyusunan HPS (Harga Perkiraan Sendiri)", "3.2 Jenis Kontrak & Dokumen Pengadaan", "3.3 Pengawasan & Serah Terima Hasil Pekerjaan"] }], quiz: [{ q: "Siapakah yang menetapkan Rencana Umum Pengadaan (RUP)?", options: ["Pengguna Anggaran (PA) / Kuasa Pengguna Anggaran (KPA)", "Pejabat Pembuat Komitmen (PPK)", "Pokja Pemilihan", "Pejabat Pengadaan"], correct: 0 }, { q: "Berikut ini yang merupakan prinsip pengadaan barang/jasa pemerintah adalah...", options: ["Rahasia, Subyektif, Menguntungkan Sepihak", "Efisien, Efektif, Transparan, Terbuka, Bersaing, Adil, Akuntabel", "Cepat, Murah, Tanpa Dokumen, Langsung Beli", "Monopoli, Tertutup, Fleksibel Berlebihan"], correct: 1 }, { q: "Metode pemilihan Penyedia Barang/Pekerjaan Konstruksi/Jasa Lainnya yang dilakukan untuk barang/jasa yang bernilai di atas Rp 200 juta secara umum adalah...", options: ["Pengadaan Langsung", "Penunjukan Langsung", "Tender", "E-Purchasing"], correct: 2 }] },
  { id: "c2", title: "AI Strategy & Governance for Government Leaders", category: "AI", duration: "15 Jam", level: "Eksekutif", price: 7500000, priceLabel: "Rp 7,500,000", rating: "4.9", badge: "Trisakti Executive", desc: "Kurikulum khusus dirancang untuk pejabat pemerintahan dalam merumuskan regulasi, tata kelola data, dan strategi transformasi AI di sektor publik.", modules: [{ title: "Modul 1: Landasan Kecerdasan Buatan (AI Foundation)", lessons: ["1.1 Sejarah AI & Klasifikasi Algoritma", "1.2 Perbedaan Machine Learning & Generative AI", "1.3 Dampak AI terhadap Sektor Publik"] }, { title: "Modul 2: Tata Kelola AI & Regulasi", lessons: ["2.1 Tata Kelola AI Sektor Publik", "2.2 Analisis Kebijakan Berbasis AI"] }], quiz: [{ q: "Apa fokus utama dari AI Governance di sektor publik?", options: ["Mencari keuntungan komersial tertinggi dari AI", "Memastikan kepatuhan etika, keamanan, privasi data, dan keadilan dalam pengambilan keputusan AI", "Menggantikan seluruh staf pemerintahan dengan agen AI", "Menghapus regulasi hukum teknologi"], correct: 1 }] },
  { id: "c3", title: "Data Analytics & Business Intelligence", category: "Tech", duration: "45 Jam", level: "Menengah", price: 3500000, priceLabel: "Rp 3,500,000", rating: "4.7", badge: "Industry Certified", desc: "Pelajari visualisasi data menggunakan Tableau/Power BI, pemodelan data warehouse, serta analisis SQL tingkat lanjut untuk mendukung keputusan bisnis berbasis data.", modules: [{ title: "Modul 1: Pendahuluan", lessons: ["1.1 Pengenalan Materi", "1.2 Dasar Teori & Logika Kerja"] }], quiz: [{ q: "Fungsi agregat SQL mana yang digunakan untuk mencari rata-rata nilai kolom?", options: ["AVG", "SUM", "MEAN", "COUNT"], correct: 0 }] },
  { id: "c4", title: "Executive Leadership & Strategic Change Management", category: "Leadership", duration: "24 Jam", level: "Eksekutif", price: 5000000, priceLabel: "Rp 5,000,000", rating: "4.9", badge: "Top Management", desc: "Panduan komprehensif bagi pimpinan organisasi untuk mengelola perubahan strategis, membangun budaya kerja berkinerja tinggi, dan merumuskan visi masa depan.", modules: [{ title: "Modul 1: Kepemimpinan Transformatif", lessons: ["1.1 Menggerakkan Tim dan Visi Organisasi", "1.2 Komunikasi Efektif dan Negosiasi Konflik"] }], quiz: [{ q: "Apa kunci utama keberhasilan manajemen perubahan dalam organisasi?", options: ["Komunikasi transparan dan keterlibatan seluruh pemangku kepentingan", "Mengabaikan masukan dari karyawan", "Melakukan restrukturisasi tanpa pemberitahuan", "Menerapkan sanksi berat secara sepihak"], correct: 0 }] },
  { id: "c5", title: "Public Finance & Government Budgeting Essentials", category: "Procurement", duration: "28 Jam", level: "Menengah", price: 3000000, priceLabel: "Rp 3,000,000", rating: "4.8", badge: "Kemenkeu Standard", desc: "Pelajari sistem pengelolaan keuangan negara, penyusunan APBN/APBD, mekanisme perbendaharaan, serta audit kepatuhan keuangan sektor publik.", modules: [{ title: "Modul 1: Siklus Anggaran Negara", lessons: ["1.1 Tahapan Perencanaan dan Penganggaran", "1.2 Pelaksanaan dan Pengawasan Anggaran"] }], quiz: [{ q: "Dokumen apa yang memuat rencana kerja dan anggaran Kementerian/Lembaga?", options: ["DIPA (Daftar Isian Pelaksanaan Anggaran)", "RKA-KL", "APBN", "RUP"], correct: 1 }] },
  { id: "c6", title: "Operational Management & Bureaucratic Efficiency", category: "Leadership", duration: "20 Jam", level: "Dasar", price: 2200000, priceLabel: "Rp 2,200,000", rating: "4.6", badge: "Efficiency Special", desc: "Optimalkan efisiensi operasional organisasi melalui metodologi Lean, pemetaan proses bisnis, dan teknik efisiensi administrasi modern.", modules: [{ title: "Modul 1: Dasar Manajemen Operasional", lessons: ["1.1 Pemetaan Proses Bisnis", "1.2 Eliminasi Pemborosan (Waste) di Birokrasi"] }], quiz: [{ q: "Metodologi apa yang fokus pada eliminasi pemborosan untuk efisiensi?", options: ["Lean Management", "Traditional Management", "Ad-hoc Planning", "Crisis Management"], correct: 0 }] }
];

const initialInstructors = [
  { id: "i1", name: "Prof. Dr. Kadir", specialty: "Public Procurement & Policy", schedule: "Senin & Rabu", revShare: 35 },
  { id: "i2", name: "Dr. Eng. Royal Artindo", specialty: "Artificial Intelligence & Big Data", schedule: "Selasa & Kamis", revShare: 40 }
];

const initialCategories = [
  { key: "AI", name: "Kecerdasan Buatan (AI)" },
  { key: "Tech", name: "Teknologi Informasi" },
  { key: "Procurement", name: "Pengadaan Barang/Jasa" },
  { key: "Leadership", name: "Leadership & Management" }
];

const initialLevels = [
  { key: "Dasar", name: "Dasar" },
  { key: "Menengah", name: "Menengah" },
  { key: "Lanjutan", name: "Lanjutan" },
  { key: "Eksekutif", name: "Eksekutif" }
];

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [users, setUsers] = useState(initialUsers);
  const [categories, setCategories] = useState(initialCategories);
  const [levels, setLevels] = useState(initialLevels);
  const [newCatKey, setNewCatKey] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newLvlKey, setNewLvlKey] = useState("");
  const [newLvlName, setNewLvlName] = useState("");
  const [courses, setCourses] = useState(initialCourses);
  const [instructors, setInstructors] = useState(initialInstructors);
  const [activeRole, setActiveRole] = useState("student");
  const [currentUser, setCurrentUser] = useState(null);
  const [activePage, setActivePage] = useState("dashboard-page");
  const [loginEmail, setLoginEmail] = useState("peserta@nhcie.go.id");
  const [loginPassword, setLoginPassword] = useState("password123");
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
  const [forumPosts, setForumPosts] = useState([
    { id: 1, user: "Budi Santoso", label: "Peserta Mandiri", text: "Selamat pagi rekan-rekan, izin bertanya apakah ada materi tambahan terkait tata cara penyusunan HPS?", time: "2 jam yang lalu" },
    { id: 2, user: "Prof. Dr. Kadir", label: "Universitas Trisakti", text: "Pagi Budi, materi HPS secara detail dibahas di Modul 3. Anda juga bisa mengunduh modul panduan LKPP di lampiran overview.", time: "1 jam yang lalu" }
  ]);
  const [forumInput, setForumInput] = useState("");
  const [certificates, setCertificates] = useState([
    { id: "NHCIE-TX-1002A", courseId: "c1", title: "PBJ Level 1 (Pengadaan Barang & Jasa Pemerintah)", date: "05 Juni 2026", idCode: "NHCIE-TX-1002A" }
  ]);
  const [transactions, setTransactions] = useState([
    { invoice: "INV-2026-001", user: "Ahmad Hidayat", program: "PBJ Level 1", amount: 2500000, type: "QRIS", status: "Berhasil" }
  ]);
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
  const [courseForm, setCourseForm] = useState({ title: "", category: "AI", duration: "", level: "Dasar", price: "", badge: "", desc: "" });
  const [userForm, setUserForm] = useState({
    fullname: "", email: "", password: "password123", role: "student", jobTitle: "", organization: "", status: "active",
    permissions: ["view_dashboard", "access_lms"], competency: "A1 (Beginner)",
    competencyScores: { current: [50, 50, 50, 50, 50, 50], target: [80, 80, 80, 80, 80, 80] }
  });
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [instructorForm, setInstructorForm] = useState({ name: "", specialty: "", schedule: "", revShare: "" });
  const [lmsManageModalActive, setLmsManageModalActive] = useState(false);
  const [selectedLmsCourse, setSelectedLmsCourse] = useState(null);
  const [lmsManageTab, setLmsManageTab] = useState("materials");
  const [newLessonInput, setNewLessonInput] = useState({});
  const [dbMode, setDbMode] = useState("loading");

  const radarCanvasRef = useRef(null);
  const revenueCanvasRef = useRef(null);

  useEffect(() => {
    async function initApp() {
      // 1. Restore session dari cookie
      let sessionUser = null;
      try {
        const sessionJson = await getSessionApi();
        if (sessionJson.success) {
          sessionUser = sessionJson.data;
          setCurrentUser(sessionJson.data);
        }
      } catch {}

      // 2. Load data dari DB (gunakan service layer)
      try {
        const json = await loadAppData();
        if (json.success && json.database_mode === "postgresql") {
          setUsers(json.data.users);
          setCourses(json.data.courses);
          setTransactions(json.data.transactions);
          setCertificates(json.data.certificates);
          if (json.data.categories) setCategories(json.data.categories);
          if (json.data.levels) setLevels(json.data.levels);
          setDbMode("postgresql");
        } else {
          setDbMode("demo");
        }
      } catch {
        setDbMode("demo");
      }

      // 3. Kursus yang benar-benar dimiliki pengguna
      if (sessionUser) {
        setEnrolledCourses(await loadEnrollments());
      }
      setEnrollmentsLoaded(true);
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
    const emails = { student: "peserta@nhcie.go.id", corporate: "hr@company.com", government: "gov@kemenkeu.go.id", admin: "admin@nhcie.go.id" };
    setLoginEmail(emails[role] || "peserta@nhcie.go.id");
    setLoginPassword("password123");
  };

  const handlePrefill = () => {
    const emails = { student: "peserta@nhcie.go.id", corporate: "hr@company.com", government: "gov@kemenkeu.go.id", admin: "admin@nhcie.go.id" };
    setLoginEmail(emails[activeRole] || "peserta@nhcie.go.id");
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

  const handleAssignmentUpload = () => {
    setUploadStatus("Uploading");
    setTimeout(() => setUploadStatus("Success"), 2000);
  };

  const handleAttendance = (action) => {
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAttendanceLog(prev => [...prev, `${action} Berhasil pada jam ${timeStr} (IP: 192.168.1.45, Lokasi GPS Terverifikasi)`]);
    setCheckedIn(action === "Check In");
  };

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
        // Fallback demo mode jika DB tidak tersedia
        const examSettings = activeCourse.examSettings || {};
        const demoQuiz = (activeCourse.quiz || []).map(({ correct: _c, ...rest }) => rest);
        setExamSession({
          questions: demoQuiz,
          examToken: null,
          demoMode: true,
          demoQuiz: activeCourse.quiz,
          passingScore: examSettings.passingScore || 70,
          timeLimit: examSettings.timeLimit || 0,
          maxAttempts: examSettings.maxAttempts || 0,
          error: json.error,
        });
        const timeLimit = examSettings.timeLimit || 0;
        if (timeLimit > 0) {
          setExamTimeRemaining(timeLimit * 60);
          setExamTimerActive(true);
        }
      }
    } catch {
      const examSettings = activeCourse.examSettings || {};
      const demoQuiz = (activeCourse.quiz || []).map(({ correct: _c, ...rest }) => rest);
      setExamSession({
        questions: demoQuiz,
        examToken: null,
        demoMode: true,
        demoQuiz: activeCourse.quiz,
        passingScore: examSettings.passingScore || 70,
        timeLimit: 0,
        maxAttempts: 0,
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
        if (selectedAnswers[i] === undefined) {
          alert("Harap jawab semua soal ujian sebelum mengirim!");
          return;
        }
      }
    }

    // Mode server-side (DB tersedia) — gunakan examService
    if (examSession.examToken) {
      try {
        const json = await submitExam(examSession.examToken, selectedAnswers);
        if (json.success) {
          setQuizResultMessage({ success: json.passed, text: json.message });
          if (json.passed) {
            const alreadyEarned = certificates.some(c => c.courseId === activeCourse.id);
            if (!alreadyEarned && json.certId) {
              const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
              const newCert = { id: json.certId, courseId: activeCourse.id, title: activeCourse.title, date: dateStr, idCode: json.certId };
              setCertificates(prev => [...prev, newCert]);
            }
          }
          return;
        }
      } catch {}
    }

    // Fallback demo mode: scoring lokal menggunakan demoQuiz yang menyimpan correct
    const demoQuiz = examSession.demoQuiz || activeCourse.quiz || [];
    let score = 0;
    for (let i = 0; i < demoQuiz.length; i++) {
      if (selectedAnswers[i] === demoQuiz[i]?.correct) score++;
    }
    const percentage = Math.round((score / demoQuiz.length) * 100);
    const passScore = 70;
    if (percentage >= passScore) {
      setQuizResultMessage({ success: true, text: `Selamat! Anda Lulus Sertifikasi. Skor Anda: ${percentage}% (Passing Score: ${passScore}%). Sertifikat digital Anda telah diterbitkan di Digital Wallet.` });
      const alreadyEarned = certificates.some(c => c.courseId === activeCourse.id);
      if (!alreadyEarned) {
        const certId = `NHCIE-TX-${Math.floor(1000 + Math.random() * 9000)}B`;
        const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const newCert = { id: certId, courseId: activeCourse.id, title: activeCourse.title, date: dateStr, idCode: certId };
        setCertificates(prev => [...prev, newCert]);
        syncWithDb("certificate", "save", newCert);
      }
    } else {
      setQuizResultMessage({ success: false, text: `Ujian Gagal. Skor Anda: ${percentage}% (Passing Score: ${passScore}%). Silakan baca kembali materi dan coba lagi.` });
    }
  }, [activeCourse, examSession, selectedAnswers, certificates, syncWithDb]);

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
      if (action === "edit" && record) { setCourseForm({ title: record.title, category: record.category, duration: record.duration, level: record.level, price: record.price, badge: record.badge, desc: record.desc }); }
      else { setCourseForm({ title: "", category: "AI", duration: "10 Jam", level: "Dasar", price: 1000000, badge: "Sertifikasi", desc: "" }); }
    } else if (type === "user") {
      if (action === "edit" && record) {
        // Password sengaja dikosongkan: respons API tidak lagi memuatnya, dan
        // kosong berarti "jangan ubah" di sisi server.
        setUserForm({ fullname: record.fullname, email: record.email, password: "", role: record.role, jobTitle: record.jobTitle || "", organization: record.organization || "", status: record.status || "active", permissions: record.permissions || [], competency: record.stats ? record.stats.competency : "A1 (Beginner)", competencyScores: record.competencies ? { current: [...record.competencies.current], target: [...record.competencies.target] } : { current: [50, 50, 50, 50, 50, 50], target: [80, 80, 80, 80, 80, 80] } });
      } else {
        setUserForm({ fullname: "", email: "", password: "password123", role: "student", jobTitle: "", organization: "", status: "active", permissions: ["view_dashboard", "access_lms"], competency: "A1 (Beginner)", competencyScores: { current: [50, 50, 50, 50, 50, 50], target: [80, 80, 80, 80, 80, 80] } });
      }
    } else if (type === "instructor") {
      if (action === "edit" && record) { setInstructorForm({ name: record.name, specialty: record.specialty, schedule: record.schedule, revShare: record.revShare }); }
      else { setInstructorForm({ name: "", specialty: "", schedule: "Senin", revShare: 30 }); }
    }
    setCrudModalActive(true);
  };

  const handleSaveCrud = (e) => {
    e.preventDefault();
    if (crudType === "course") {
      const formattedPrice = parseInt(courseForm.price) || 0;
      const priceLabel = formattedPrice === 0 ? "Gratis" : `Rp ${formattedPrice.toLocaleString('id-ID')}`;
      if (crudAction === "add") {
        const newCourse = { id: `c${courses.length + 1}`, title: courseForm.title, category: courseForm.category, duration: courseForm.duration, level: courseForm.level, price: formattedPrice, priceLabel, rating: "5.0", badge: courseForm.badge || "Kursus Baru", desc: courseForm.desc, modules: [{ title: "Modul 1: Pendahuluan", lessons: ["1.1 Pengenalan Materi", "1.2 Dasar Teori & Logika Kerja"] }], quiz: [{ q: "Apa nama platform ini?", options: ["NHCIE", "LMS Biasa", "Course Finder", "Study Hub"], correct: 0 }] };
        setCourses(prev => [...prev, newCourse]);
        syncWithDb("course", "save", newCourse);
      } else {
        const targetCourse = courses.find(c => c.id === editingId);
        const updatedCourse = { ...targetCourse, title: courseForm.title, category: courseForm.category, duration: courseForm.duration, level: courseForm.level, price: formattedPrice, priceLabel, badge: courseForm.badge, desc: courseForm.desc };
        setCourses(prev => prev.map(c => c.id === editingId ? updatedCourse : c));
        syncWithDb("course", "save", updatedCourse);
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
    } else if (crudType === "instructor") {
      if (crudAction === "add") { setInstructors(prev => [...prev, { id: `i${instructors.length + 1}`, name: instructorForm.name, specialty: instructorForm.specialty, schedule: instructorForm.schedule, revShare: parseInt(instructorForm.revShare) || 30 }]); }
      else { setInstructors(prev => prev.map(ins => ins.id === editingId ? { ...ins, name: instructorForm.name, specialty: instructorForm.specialty, schedule: instructorForm.schedule, revShare: parseInt(instructorForm.revShare) } : ins)); }
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
    else if (type === "instructor") { setInstructors(prev => prev.filter(ins => ins.id !== id)); }
  };

  const handlePermissionToggle = (perm) => {
    const isChecked = userForm.permissions.includes(perm);
    setUserForm(prev => ({ ...prev, permissions: isChecked ? prev.permissions.filter(p => p !== perm) : [...prev.permissions, perm] }));
  };

  const handleOpenLmsManageModal = (course) => {
    const courseCopy = JSON.parse(JSON.stringify(course));
    if (!courseCopy.modules) courseCopy.modules = [];
    if (!courseCopy.quiz) courseCopy.quiz = [];
    setSelectedLmsCourse(courseCopy);
    setLmsManageTab("materials");
    setNewLessonInput({});
    setLmsManageModalActive(true);
  };

  const handleLmsAddModule = () => setSelectedLmsCourse(prev => ({ ...prev, modules: [...prev.modules, { title: "Modul Baru", lessons: [] }] }));
  const handleLmsDeleteModule = (modIdx) => setSelectedLmsCourse(prev => ({ ...prev, modules: prev.modules.filter((_, idx) => idx !== modIdx) }));
  const handleLmsModuleTitleChange = (modIdx, value) => setSelectedLmsCourse(prev => ({ ...prev, modules: prev.modules.map((m, idx) => idx === modIdx ? { ...m, title: value } : m) }));
  const handleLmsAddLesson = (modIdx) => {
    const lessonText = newLessonInput[modIdx] || "";
    if (!lessonText.trim()) return;
    setSelectedLmsCourse(prev => ({ ...prev, modules: prev.modules.map((m, idx) => idx === modIdx ? { ...m, lessons: [...m.lessons, { title: lessonText.trim(), type: "text", url: "" }] } : m) }));
    setNewLessonInput(prev => ({ ...prev, [modIdx]: "" }));
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
    setLmsManageModalActive(false);
    alert(`Materi dan Soal Ujian untuk "${selectedLmsCourse.title}" berhasil diperbarui!`);
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCatKey.trim() || !newCatName.trim()) return;
    if (categories.some(c => c.key.toLowerCase() === newCatKey.trim().toLowerCase())) { alert("Kategori dengan Kode tersebut sudah ada."); return; }
    const newCat = { key: newCatKey.trim(), name: newCatName.trim() };
    setCategories(prev => [...prev, newCat]);
    syncWithDb("category", "save", newCat);
    setNewCatKey(""); setNewCatName("");
  };

  const handleDeleteCategory = (key) => {
    if (confirm("Apakah Anda yakin ingin menghapus kategori ini?")) {
      setCategories(prev => prev.filter(c => c.key !== key));
      syncWithDb("category", "delete", { key });
    }
  };

  const handleAddLevel = (e) => {
    e.preventDefault();
    if (!newLvlKey.trim() || !newLvlName.trim()) return;
    if (levels.some(l => l.key.toLowerCase() === newLvlKey.trim().toLowerCase())) { alert("Tingkat (Level) dengan Kode tersebut sudah ada."); return; }
    const newLvl = { key: newLvlKey.trim(), name: newLvlName.trim() };
    setLevels(prev => [...prev, newLvl]);
    syncWithDb("level", "save", newLvl);
    setNewLvlKey(""); setNewLvlName("");
  };

  const handleDeleteLevel = (key) => {
    if (confirm("Apakah Anda yakin ingin menghapus tingkat (level) ini?")) {
      setLevels(prev => prev.filter(l => l.key !== key));
      syncWithDb("level", "delete", { key });
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
    users, courses, categories, levels, instructors,
    certificates, transactions, enrolledCourses, setEnrolledCourses, dbMode,
    // Auth
    currentUser, activePage, loginEmail, loginPassword, activeRole,
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
    userSearchQuery, userRoleFilter, userStatusFilter, instructorForm,
    lmsManageModalActive, selectedLmsCourse, lmsManageTab, newLessonInput,
    editingId, newCatKey, newCatName, newLvlKey, newLvlName,
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
    setCourseForm, setUserForm, setInstructorForm,
    // Handlers
    handleRoleTabChange, handlePrefill, handleLoginSubmit, handleLogout,
    handleOpenClass, handleSelectLesson, handleEnrollCourse,
    refreshEnrollments, enrollmentsLoaded,
    handleAssignmentUpload, handleAttendance, handleForumSubmit,
    handleStartExam, handleQuizSubmit,
    handleLoadExamHistory, handleSaveLessonProgress,
    handleViewCert, handleGovGenerate, handleCorpGenerate,
    handleOpenCrudModal, handleSaveCrud, handleDeleteCrud,
    handlePermissionToggle, handleOpenLmsManageModal,
    handleLmsAddModule, handleLmsDeleteModule, handleLmsModuleTitleChange,
    handleLmsAddLesson, handleLmsDeleteLesson, handleLmsLessonChange,
    handleLmsAddQuestion, handleLmsDeleteQuestion, handleLmsQuestionTitleChange,
    handleLmsOptionTextChange, handleLmsQuestionCorrectChange, handleLmsSaveAll,
    handleAddCategory, handleDeleteCategory, handleAddLevel, handleDeleteLevel,
    // Direct setters
    setActiveLmsTab, setVideoPlaying, setVideoProgress, setVideoTime,
    setSelectedAnswers, setQuizResultMessage, setUploadStatus,
    setFilterCategory,
    setUserSearchQuery, setUserRoleFilter, setUserStatusFilter,
    setAdminTab, setCrudModalActive, setLmsManageModalActive,
    setLmsManageTab, setSelectedLmsCourse,
    setNewCatKey, setNewCatName, setNewLvlKey, setNewLvlName,
    setCertModalActive, setForumInput,
    setCheckedIn,
    // Fase 2 extra
    setExamSession, setExamTimeRemaining, setExamTimerActive,
    // Fase 3
    checkPrerequisite,
    courses, certificates,
    currentUser,
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
