"use client";
import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "./AuthContext";
import { useCourse } from "./CourseContext";
import { syncEntity } from "@/services/courseService";

export const AdminContext = createContext(null);

const initialCompetencySkills = [
  { key: "leadership", name: "Leadership" },
  { key: "procurement", name: "Procurement" },
  { key: "data_analytics", name: "Data Analytics" },
  { key: "ai_literacy", name: "AI Literacy" },
  { key: "finance", name: "Finance" },
  { key: "management", name: "Management" }
];

export function AdminProvider({ children }) {
  const { currentUser, setCurrentUser } = useAuth();
  const { courses, setCourses, activeCourse, setActiveCourse } = useCourse();

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

  const [platformSettings, setPlatformSettings] = useState({
    platform_name: "DIDIKARA",
    platform_tagline: "Platform Pelatihan & Sertifikasi Profesional",
    platform_logo: "/logos/didikara-symbol-redblue-2.jpg",
  });

  const radarCanvasRef = useRef(null);
  const revenueCanvasRef = useRef(null);

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

  // Muat saved competency skills dari localStorage & platform settings saat mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSkills = localStorage.getItem("ailms_competency_skills");
      if (savedSkills) {
        try {
          const parsed = JSON.parse(savedSkills);
          if (Array.isArray(parsed) && parsed.length > 0) setCompetencySkills(parsed);
        } catch {}
      }
    }
    refreshPlatformSettings();
  }, [refreshPlatformSettings]);

  // Muat categories, levels, users saat admin terotentikasi
  useEffect(() => {
    let isMounted = true;
    async function loadAdminData() {
      try {
        const res = await fetch("/api/catalog?limit=100");
        const json = await res.json();
        if (isMounted && json.success) {
          if (json.categories?.length > 0) setCategories(json.categories);
          if (json.levels?.length > 0) setLevels(json.levels);
        }
      } catch {}

      if (currentUser && (currentUser.role === "admin" || currentUser.role === "instructor")) {
        try {
          const uRes = await fetch("/api/db?entity=users");
          const uJson = await uRes.json();
          if (isMounted && uJson.success) {
            const userList = Array.isArray(uJson.data) ? uJson.data : (uJson.data?.users || []);
            setUsers(userList);
          }
        } catch {}
      }
    }
    loadAdminData();
    return () => { isMounted = false; };
  }, [currentUser]);

  const syncWithDb = useCallback((type, action, data) => {
    return syncEntity(type, action, data);
  }, []);

  const handleOpenCrudModal = useCallback((type, action, record = null) => {
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
        setUserForm({
          fullname: record.fullname, email: record.email, password: "", role: record.role,
          jobTitle: record.jobTitle || "", organization: record.organization || "",
          status: record.status || "active", permissions: record.permissions || [],
          competency: record.stats ? record.stats.competency : "A1 (Beginner)",
          competencyScores: record.competencies
            ? { current: [...record.competencies.current], target: [...record.competencies.target] }
            : { current: [50, 50, 50, 50, 50, 50], target: [80, 80, 80, 80, 80, 80] }
        });
      } else {
        setUserForm({
          fullname: "", email: "", password: "password123", role: "student", jobTitle: "", organization: "",
          status: "active", permissions: ["view_dashboard", "access_lms"], competency: "A1 (Beginner)",
          competencyScores: { current: [50, 50, 50, 50, 50, 50], target: [80, 80, 80, 80, 80, 80] }
        });
      }
    }
    setCrudModalActive(true);
  }, [categories, levels]);

  const handleSaveCrud = useCallback((e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
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
      const roleLabels = { student: "Peserta Mandiri", instructor: "Instruktur", corporate: "HR Manager", government: "Kepala Biro SDM", admin: "Platform Admin" };
      const initials = userForm.fullname.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
      if (crudAction === "add") {
        const newUser = {
          email: userForm.email, password: userForm.password, fullname: userForm.fullname, role: userForm.role,
          roleLabel: roleLabels[userForm.role], avatar: initials || "US",
          stats: { hours: 0, courses: 0, certs: 0, competency: userForm.competency },
          jobTitle: userForm.jobTitle, organization: userForm.organization, status: userForm.status,
          permissions: userForm.permissions,
          competencies: { current: [...userForm.competencyScores.current], target: [...userForm.competencyScores.target] }
        };
        setUsers(prev => [...prev, newUser]);
        syncWithDb("user", "save", newUser);
      } else {
        const targetUser = users.find(u => u.email === editingId);
        const updatedUser = {
          ...targetUser, fullname: userForm.fullname, password: userForm.password, role: userForm.role,
          roleLabel: roleLabels[userForm.role], jobTitle: userForm.jobTitle, organization: userForm.organization,
          status: userForm.status, permissions: userForm.permissions, avatar: initials || targetUser?.avatar,
          stats: { ...targetUser?.stats, competency: userForm.competency },
          competencies: { current: [...userForm.competencyScores.current], target: [...userForm.competencyScores.target] }
        };
        setUsers(prev => prev.map(u => u.email === editingId ? updatedUser : u));
        syncWithDb("user", "save", updatedUser);
        if (currentUser && currentUser.email === editingId) setCurrentUser(updatedUser);
      }
    }
    setCrudModalActive(false);
  }, [crudType, courseForm, crudAction, editingId, courses, userForm, users, currentUser, setCurrentUser, setCourses, syncWithDb]);

  const handleDeleteCrud = useCallback((type, id) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data master ini?")) return;
    if (type === "course") {
      setCourses(prev => prev.filter(c => c.id !== id));
      syncWithDb("course", "delete", { id });
      if (activeCourse && activeCourse.id === id) setActiveCourse(null);
    } else if (type === "user") {
      setUsers(prev => prev.filter(u => u.email !== id));
      syncWithDb("user", "delete", { id });
    }
  }, [activeCourse, setActiveCourse, setCourses, syncWithDb]);

  const handlePermissionToggle = useCallback((perm) => {
    setUserForm(prev => {
      const isChecked = prev.permissions.includes(perm);
      return { ...prev, permissions: isChecked ? prev.permissions.filter(p => p !== perm) : [...prev.permissions, perm] };
    });
  }, []);

  const handleOpenLmsManageModal = useCallback((course) => {
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
  }, []);

  const handleLmsAddModule = useCallback(() => {
    setSelectedLmsCourse(prev => ({ ...prev, modules: [...prev.modules, { title: "Modul Baru", lessons: [] }] }));
  }, []);

  const handleLmsDeleteModule = useCallback((modIdx) => {
    setSelectedLmsCourse(prev => ({ ...prev, modules: prev.modules.filter((_, idx) => idx !== modIdx) }));
  }, []);

  const handleLmsModuleTitleChange = useCallback((modIdx, value) => {
    setSelectedLmsCourse(prev => ({ ...prev, modules: prev.modules.map((m, idx) => idx === modIdx ? { ...m, title: value } : m) }));
  }, []);

  const handleLmsAddLesson = useCallback((modIdx) => {
    setSelectedLmsCourse(prev => {
      if (!prev || !prev.modules) return prev;
      return {
        ...prev,
        modules: prev.modules.map((m, idx) => {
          if (idx !== modIdx) return m;
          const currentLessons = Array.isArray(m.lessons) ? m.lessons : [];
          const nextIndex = currentLessons.length + 1;
          const newLesson = { title: `${idx + 1}.${nextIndex} Pelajaran Baru`, type: "video", url: "" };
          return { ...m, lessons: [...currentLessons, newLesson] };
        })
      };
    });
  }, []);

  const handleLmsDeleteLesson = useCallback((modIdx, lessonIdx) => {
    setSelectedLmsCourse(prev => ({ ...prev, modules: prev.modules.map((m, idx) => idx === modIdx ? { ...m, lessons: m.lessons.filter((_, lIdx) => lIdx !== lessonIdx) } : m) }));
  }, []);

  const handleLmsLessonChange = useCallback((modIdx, lessonIdx, field, value) => {
    setSelectedLmsCourse(prev => ({
      ...prev,
      modules: prev.modules.map((m, idx) => idx === modIdx ? {
        ...m,
        lessons: m.lessons.map((l, lIdx) => lIdx === lessonIdx ? { ...(typeof l === 'string' ? { title: l, type: 'text', url: '' } : l), [field]: value } : l)
      } : m)
    }));
  }, []);

  const handleLmsAddQuestion = useCallback(() => {
    setSelectedLmsCourse(prev => ({ ...prev, quiz: [...(prev.quiz || []), { q: "Pertanyaan Ujian Baru?", options: ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"], correct: 0 }] }));
  }, []);

  const handleLmsDeleteQuestion = useCallback((qIdx) => {
    setSelectedLmsCourse(prev => ({ ...prev, quiz: prev.quiz.filter((_, idx) => idx !== qIdx) }));
  }, []);

  const handleLmsQuestionTitleChange = useCallback((qIdx, value) => {
    setSelectedLmsCourse(prev => ({ ...prev, quiz: prev.quiz.map((q, idx) => idx === qIdx ? { ...q, q: value } : q) }));
  }, []);

  const handleLmsOptionTextChange = useCallback((qIdx, optIdx, value) => {
    setSelectedLmsCourse(prev => ({ ...prev, quiz: prev.quiz.map((q, idx) => idx === qIdx ? { ...q, options: q.options.map((opt, oIdx) => oIdx === optIdx ? value : opt) } : q) }));
  }, []);

  const handleLmsQuestionCorrectChange = useCallback((qIdx, value) => {
    setSelectedLmsCourse(prev => ({ ...prev, quiz: prev.quiz.map((q, idx) => idx === qIdx ? { ...q, correct: parseInt(value) } : q) }));
  }, []);

  const handleLmsSaveAll = useCallback(() => {
    if (!selectedLmsCourse) return;
    setCourses(prev => prev.map(c => c.id === selectedLmsCourse.id ? selectedLmsCourse : c));
    syncWithDb("course", "save", selectedLmsCourse);
    if (activeCourse && activeCourse.id === selectedLmsCourse.id) {
      setActiveCourse(selectedLmsCourse);
    }

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
  }, [selectedLmsCourse, setCourses, syncWithDb, activeCourse, setActiveCourse]);

  const handleAddCategory = useCallback((e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newCatKey.trim() || !newCatName.trim()) return;
    if (categories.some(c => c.key.toLowerCase() === newCatKey.trim().toLowerCase())) { alert("Kategori dengan Kode tersebut sudah ada."); return; }
    const newCat = { key: newCatKey.trim(), name: newCatName.trim() };
    setCategories(prev => [...prev, newCat]);
    syncWithDb("category", "save", newCat);
    setNewCatKey(""); setNewCatName("");
  }, [newCatKey, newCatName, categories, syncWithDb]);

  const handleUpdateCategory = useCallback((oldKey, updatedData) => {
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
  }, [categories, setCourses, syncWithDb]);

  const handleDeleteCategory = useCallback((key) => {
    const count = courses.filter(c => c.category === key).length;
    const msg = count > 0
      ? `Kategori "${key}" saat ini digunakan oleh ${count} program pelatihan.\n\nMenghapus kategori ini akan menyebabkan kursus terkait kehilangan kategorinya. Tetap hapus?`
      : `Apakah Anda yakin ingin menghapus kategori "${key}"?`;
    if (confirm(msg)) {
      setCategories(prev => prev.filter(c => c.key !== key));
      syncWithDb("category", "delete", { key });
    }
  }, [courses, syncWithDb]);

  const handleAddLevel = useCallback((e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newLvlKey.trim() || !newLvlName.trim()) return;
    if (levels.some(l => l.key.toLowerCase() === newLvlKey.trim().toLowerCase())) { alert("Tingkat (Level) dengan Kode tersebut sudah ada."); return; }
    const newLvl = { key: newLvlKey.trim(), name: newLvlName.trim() };
    setLevels(prev => [...prev, newLvl]);
    syncWithDb("level", "save", newLvl);
    setNewLvlKey(""); setNewLvlName("");
  }, [newLvlKey, newLvlName, levels, syncWithDb]);

  const handleUpdateLevel = useCallback((oldKey, updatedData) => {
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
  }, [levels, setCourses, syncWithDb]);

  const handleDeleteLevel = useCallback((key) => {
    const count = courses.filter(c => c.level === key).length;
    const msg = count > 0
      ? `Tingkat (level) "${key}" saat ini digunakan oleh ${count} program pelatihan.\n\nMenghapus level ini akan mempengaruhi kursus terkait. Tetap hapus?`
      : `Apakah Anda yakin ingin menghapus tingkat (level) "${key}"?`;
    if (confirm(msg)) {
      setLevels(prev => prev.filter(l => l.key !== key));
      syncWithDb("level", "delete", { key });
    }
  }, [courses, syncWithDb]);

  const handleAddCompetencySkill = useCallback((e) => {
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
  }, [newSkillKey, newSkillName, competencySkills]);

  const handleUpdateCompetencySkill = useCallback((oldKey, updatedData) => {
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
  }, [competencySkills]);

  const handleDeleteCompetencySkill = useCallback((key) => {
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
  }, [competencySkills]);

  // Filtered users di-memoize: hanya dihitung ulang bila search/filter/users berubah
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.fullname.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        (u.organization && u.organization.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
        (u.jobTitle && u.jobTitle.toLowerCase().includes(userSearchQuery.toLowerCase()));
      const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
      const matchesStatus = userStatusFilter === "all" || u.status === userStatusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, userSearchQuery, userRoleFilter, userStatusFilter]);

  const value = useMemo(() => ({
    users, setUsers,
    categories, setCategories,
    levels, setLevels,
    competencySkills, setCompetencySkills,
    newCatKey, setNewCatKey,
    newCatName, setNewCatName,
    newLvlKey, setNewLvlKey,
    newLvlName, setNewLvlName,
    newSkillKey, setNewSkillKey,
    newSkillName, setNewSkillName,
    adminTab, setAdminTab,
    crudModalActive, setCrudModalActive,
    crudAction, setCrudAction,
    crudType, setCrudType,
    editingId, setEditingId,
    courseForm, setCourseForm,
    userForm, setUserForm,
    userSearchQuery, setUserSearchQuery,
    userRoleFilter, setUserRoleFilter,
    userStatusFilter, setUserStatusFilter,
    lmsManageModalActive, setLmsManageModalActive,
    selectedLmsCourse, setSelectedLmsCourse,
    lmsManageTab, setLmsManageTab,
    newLessonInput, setNewLessonInput,
    platformSettings, setPlatformSettings, refreshPlatformSettings,
    radarCanvasRef, revenueCanvasRef,
    filteredUsers,
    handleOpenCrudModal,
    handleSaveCrud,
    handleDeleteCrud,
    handlePermissionToggle,
    handleOpenLmsManageModal,
    handleLmsAddModule,
    handleLmsDeleteModule,
    handleLmsModuleTitleChange,
    handleLmsAddLesson,
    handleLmsDeleteLesson,
    handleLmsLessonChange,
    handleLmsAddQuestion,
    handleLmsDeleteQuestion,
    handleLmsQuestionTitleChange,
    handleLmsOptionTextChange,
    handleLmsQuestionCorrectChange,
    handleLmsSaveAll,
    handleAddCategory,
    handleUpdateCategory,
    handleDeleteCategory,
    handleAddLevel,
    handleUpdateLevel,
    handleDeleteLevel,
    handleAddCompetencySkill,
    handleUpdateCompetencySkill,
    handleDeleteCompetencySkill,
  }), [
    users, categories, levels, competencySkills,
    newCatKey, newCatName, newLvlKey, newLvlName,
    newSkillKey, newSkillName, adminTab, crudModalActive,
    crudAction, crudType, editingId, courseForm, userForm,
    userSearchQuery, userRoleFilter, userStatusFilter,
    lmsManageModalActive, selectedLmsCourse, lmsManageTab,
    newLessonInput, platformSettings, refreshPlatformSettings,
    filteredUsers, handleOpenCrudModal, handleSaveCrud,
    handleDeleteCrud, handlePermissionToggle, handleOpenLmsManageModal,
    handleLmsAddModule, handleLmsDeleteModule, handleLmsModuleTitleChange,
    handleLmsAddLesson, handleLmsDeleteLesson, handleLmsLessonChange,
    handleLmsAddQuestion, handleLmsDeleteQuestion, handleLmsQuestionTitleChange,
    handleLmsOptionTextChange, handleLmsQuestionCorrectChange, handleLmsSaveAll,
    handleAddCategory, handleUpdateCategory, handleDeleteCategory,
    handleAddLevel, handleUpdateLevel, handleDeleteLevel,
    handleAddCompetencySkill, handleUpdateCompetencySkill,
    handleDeleteCompetencySkill,
  ]);

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
