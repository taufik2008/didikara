"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, BookOpen, Edit2, Trash2, Search, CheckSquare, Square, Award, BarChart2, Download, TrendingUp, Users, FileText, ShieldCheck, Building2, Zap, Calendar, Video, Bot, Target, Star, PieChart, CreditCard, CheckCircle, Clock, XCircle, AlertCircle, RefreshCw, Settings2, Mail } from "lucide-react";
import Chart from "chart.js/auto";
import { useApp } from "@/context/AppContext";
import PaymentHistoryPanel from "./PaymentHistoryPanel";
import PlatformSettingsPanel from "./PlatformSettingsPanelV2";
import InstructorManager from "./InstructorPanel";
import SupportTicketsPanel from "./SupportTicketsPanel";
import OrganizationManager from "./OrganizationPanel";



function CourseManager() {
  const { courses, handleOpenCrudModal, handleDeleteCrud, handleOpenLmsManageModal } = useApp();
  const [search, setSearch] = useState("");

  const filteredCourses = courses.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (c.title && c.title.toLowerCase().includes(q)) ||
           (c.id && c.id.toLowerCase().includes(q)) ||
           (c.category && c.category.toLowerCase().includes(q)) ||
           (c.level && c.level.toLowerCase().includes(q));
  });

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ position: "relative", minWidth: 240, flex: 1, maxWidth: 400 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
          <input
            type="text"
            placeholder="Cari judul, ID, atau kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "8px 12px 8px 34px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "0.8rem" }}
          />
        </div>
        <button className="btn btn-primary" style={{ width: "auto", padding: "8px 16px", fontSize: "0.85rem" }} onClick={() => handleOpenCrudModal("course", "add")}>
          <Plus size={16} style={{ marginRight: 6 }} /> Tambah Program Baru
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border-color)", color: "var(--text-secondary)", textAlign: "left", fontSize: "0.85rem" }}>
              <th style={{ padding: 12 }}>ID</th>
              <th style={{ padding: 12 }}>Judul Pelatihan</th>
              <th style={{ padding: 12 }}>Kategori</th>
              <th style={{ padding: 12 }}>Durasi</th>
              <th style={{ padding: 12 }}>Level</th>
              <th style={{ padding: 12 }}>Harga</th>
              <th style={{ padding: 12, textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            {filteredCourses.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>Tidak ada program pelatihan ditemukan.</td></tr>
            ) : filteredCourses.map(course => (
              <tr key={course.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                <td style={{ padding: 12, fontFamily: "monospace", color: "var(--text-muted)" }}>{course.id}</td>
                <td style={{ padding: 12, fontWeight: 600, color: "var(--text-primary)" }}>{course.title}</td>
                <td style={{ padding: 12 }}>
                  <span style={{ padding: "2px 8px", borderRadius: 4, background: "var(--accent-badge-bg)", color: "var(--text-accent)", border: "1px solid var(--accent-badge-border)", fontSize: "0.75rem", fontWeight: 600 }}>
                    {course.category}
                  </span>
                </td>
                <td style={{ padding: 12 }}>{course.duration}</td>
                <td style={{ padding: 12 }}>
                  <span style={{ padding: "2px 8px", borderRadius: 4, background: "rgba(128,128,128,0.1)", color: "var(--text-primary)", fontSize: "0.75rem" }}>
                    {course.level}
                  </span>
                </td>
                <td style={{ padding: 12, fontWeight: 700, color: "var(--primary)" }}>{course.priceLabel}</td>
                <td style={{ padding: 12, textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button className="btn btn-secondary" style={{ width: "auto", padding: 6, borderColor: "rgba(249, 115, 22, 0.4)" }} title="Kelola Materi & Ujian" onClick={() => handleOpenLmsManageModal(course)}>
                      <BookOpen size={13} style={{ color: "var(--primary)" }} />
                    </button>
                    <button className="btn btn-secondary" style={{ width: "auto", padding: 6 }} title="Edit Program" onClick={() => handleOpenCrudModal("course", "edit", course)}>
                      <Edit2 size={13} style={{ color: "var(--primary)" }} />
                    </button>
                    <button className="btn btn-secondary" style={{ width: "auto", padding: 6, borderColor: "rgba(239, 68, 68, 0.2)" }} title="Hapus Program" onClick={() => handleDeleteCrud("course", course.id)}>
                      <Trash2 size={13} style={{ color: "var(--danger)" }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserManager() {
  const { filteredUsers, currentUser, userSearchQuery, userRoleFilter, userStatusFilter, setUserSearchQuery, setUserRoleFilter, setUserStatusFilter, handleOpenCrudModal, handleDeleteCrud } = useApp();

  const roleLabels = { admin: "Platform Admin", instructor: "Instruktur", government: "Kepala Biro SDM", corporate: "HR Manager", student: "Peserta Mandiri" };
  const statusLabels = { active: "Aktif", suspended: "Ditangguhkan", pending: "Menunggu" };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, flex: 1 }}>
          <div style={{ position: "relative", minWidth: 200, flex: 1 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
            <input type="text" placeholder="Cari nama, email, instansi..." value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} style={{ width: "100%", padding: "8px 12px 8px 34px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "0.8rem" }} />
          </div>
          <select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-tertiary)", color: "var(--text-primary)", fontSize: "0.82rem", cursor: "pointer" }}>
            <option value="all">Semua Peran</option><option value="student">Peserta Mandiri</option><option value="instructor">Instruktur</option><option value="corporate">HR Manager</option><option value="government">Kepala Biro SDM</option><option value="admin">Platform Admin</option>
          </select>
          <select value={userStatusFilter} onChange={(e) => setUserStatusFilter(e.target.value)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-tertiary)", color: "var(--text-primary)", fontSize: "0.82rem", cursor: "pointer" }}>
            <option value="all">Semua Status</option><option value="active">Aktif</option><option value="suspended">Ditangguhkan</option><option value="pending">Menunggu Verifikasi</option>
          </select>
        </div>
        <button className="btn btn-primary" style={{ width: "auto", padding: "8px 16px", fontSize: "0.85rem" }} onClick={() => handleOpenCrudModal("user", "add")}>
          <Plus size={16} style={{ marginRight: 6 }} /> Tambah Pengguna Baru
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border-color)", color: "var(--text-secondary)", textAlign: "left", fontSize: "0.85rem" }}>
              <th style={{ padding: 12 }}>Nama Lengkap</th><th style={{ padding: 12 }}>Alamat Email</th><th style={{ padding: 12 }}>Peran (Role)</th>
              <th style={{ padding: 12 }}>Organisasi / Instansi</th><th style={{ padding: 12 }}>Status</th><th style={{ padding: 12, textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            {filteredUsers.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--text-secondary)" }}>Tidak ada pengguna ditemukan dengan kriteria tersebut.</td></tr>
            ) : filteredUsers.map(u => (
              <tr key={u.email} style={{ borderBottom: "1px solid var(--border-color)" }}>
                <td style={{ padding: 12, fontWeight: 600, color: "var(--text-primary)" }}>{u.fullname}</td>
                <td style={{ padding: 12, fontFamily: "monospace" }}>{u.email}</td>
                <td style={{ padding: 12 }}>
                  <span className={`badge-role badge-role-${u.role}`}>{u.roleLabel || roleLabels[u.role] || u.role}</span>
                </td>
                <td style={{ padding: 12 }}>{u.organization || "-"}</td>
                <td style={{ padding: 12 }}>
                  <span className={`badge-status badge-status-${u.status}`}>
                    {statusLabels[u.status] || u.status}
                  </span>
                </td>
                <td style={{ padding: 12, textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button className="btn btn-secondary" style={{ width: "auto", padding: 6 }} title="Edit Pengguna" onClick={() => handleOpenCrudModal("user", "edit", u)}>
                      <Edit2 size={12} style={{ color: "var(--primary)" }} />
                    </button>
                    {u.email !== currentUser?.email && (
                      <button className="btn btn-secondary" style={{ width: "auto", padding: 6, borderColor: "rgba(239, 68, 68, 0.2)" }} title="Hapus Pengguna" onClick={() => handleDeleteCrud("user", u.email)}>
                        <Trash2 size={12} style={{ color: "var(--danger)" }} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetaDataManager() {
  const {
    categories, levels, competencySkills = [], courses,
    newCatKey, newCatName, newLvlKey, newLvlName, newSkillKey, newSkillName,
    setNewCatKey, setNewCatName, setNewLvlKey, setNewLvlName, setNewSkillKey, setNewSkillName,
    handleAddCategory, handleUpdateCategory, handleDeleteCategory,
    handleAddLevel, handleUpdateLevel, handleDeleteLevel,
    handleAddCompetencySkill, handleUpdateCompetencySkill, handleDeleteCompetencySkill,
    setAdminTab,
  } = useApp();

  // State untuk Edit Category
  const [editingCat, setEditingCat] = useState(null); // { key, name }
  const [catSearch, setCatSearch] = useState("");

  // State untuk Edit Level
  const [editingLvl, setEditingLvl] = useState(null); // { key, name }
  const [lvlSearch, setLvlSearch] = useState("");

  // State untuk Edit Competency Skill
  const [editingSkill, setEditingSkill] = useState(null); // { key, name }
  const [skillSearch, setSkillSearch] = useState("");

  // State untuk Master Data Instruktur
  const [instructorsList, setInstructorsList] = useState([]);
  const [instSearch, setInstSearch] = useState("");

  useEffect(() => {
    fetch("/api/instructors")
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.instructors)) {
          setInstructorsList(data.instructors);
        }
      })
      .catch(() => {});
  }, []);

  const filteredInstructors = useMemo(() => {
    if (!instSearch.trim()) return instructorsList;
    const q = instSearch.toLowerCase();
    return instructorsList.filter(i =>
      (i.fullname || "").toLowerCase().includes(q) ||
      (i.specialty || "").toLowerCase().includes(q) ||
      (i.organization || "").toLowerCase().includes(q) ||
      (i.user_email || "").toLowerCase().includes(q)
    );
  }, [instructorsList, instSearch]);

  const systemCatKeys = ["AI", "Tech", "Procurement", "Leadership"];
  const systemLvlKeys = ["Dasar", "Menengah", "Lanjutan", "Eksekutif"];

  const filteredCategories = categories.filter(c => {
    if (!catSearch.trim()) return true;
    const q = catSearch.toLowerCase();
    return c.key.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
  });

  const filteredLevels = levels.filter(l => {
    if (!lvlSearch.trim()) return true;
    const q = lvlSearch.toLowerCase();
    return l.key.toLowerCase().includes(q) || l.name.toLowerCase().includes(q);
  });

  const filteredSkills = competencySkills.filter(s => {
    if (!skillSearch.trim()) return true;
    const q = skillSearch.toLowerCase();
    return s.key.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
  });

  const onSaveEditCat = (e) => {
    e.preventDefault();
    if (!editingCat) return;
    const ok = handleUpdateCategory(editingCat.oldKey, { key: editingCat.key, name: editingCat.name });
    if (ok) setEditingCat(null);
  };

  const onSaveEditLvl = (e) => {
    e.preventDefault();
    if (!editingLvl) return;
    const ok = handleUpdateLevel(editingLvl.oldKey, { key: editingLvl.key, name: editingLvl.name });
    if (ok) setEditingLvl(null);
  };

  const onSaveEditSkill = (e) => {
    e.preventDefault();
    if (!editingSkill) return;
    const ok = handleUpdateCompetencySkill(editingSkill.oldKey, { key: editingSkill.key, name: editingSkill.name });
    if (ok) setEditingSkill(null);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24 }}>
      {/* ── 1. Manajemen Kategori Pelatihan ─────────────────────────────────── */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h4 style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", fontWeight: 700 }}>
              Manajemen Kategori Pelatihan
            </h4>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Total: {categories.length} kategori aktif
            </span>
          </div>
        </div>

        {/* Search Kategori */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Cari kode atau nama kategori..."
            value={catSearch}
            onChange={(e) => setCatSearch(e.target.value)}
            style={{ width: "100%", padding: "6px 10px 6px 30px", fontSize: "0.78rem", borderRadius: 6 }}
          />
        </div>

        {/* Form Edit Modal / Inline */}
        {editingCat && (
          <form onSubmit={onSaveEditCat} style={{ background: "var(--accent-badge-bg)", border: "1px solid var(--accent-badge-border)", borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-accent)", marginBottom: 8 }}>
              Edit Kategori: <code style={{ fontFamily: "monospace" }}>{editingCat.oldKey}</code>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 8, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 2 }}>Kode Kategori</label>
                <input
                  type="text"
                  value={editingCat.key}
                  onChange={(e) => setEditingCat({ ...editingCat, key: e.target.value })}
                  required
                  style={{ padding: "6px 10px", fontSize: "0.8rem", width: "100%" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 2 }}>Nama Kategori</label>
                <input
                  type="text"
                  value={editingCat.name}
                  onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
                  required
                  style={{ padding: "6px 10px", fontSize: "0.8rem", width: "100%" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" style={{ width: "auto", padding: "4px 12px", fontSize: "0.75rem" }} onClick={() => setEditingCat(null)}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary" style={{ width: "auto", padding: "4px 14px", fontSize: "0.75rem" }}>
                Simpan Perubahan
              </button>
            </div>
          </form>
        )}

        {/* Tabel Kategori */}
        <div style={{ maxHeight: 280, overflowY: "auto", marginBottom: 16 }}>
          <table style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left", color: "var(--text-secondary)" }}>
                <th style={{ padding: "8px 6px" }}>Kode</th>
                <th style={{ padding: "8px 6px" }}>Nama Kategori</th>
                <th style={{ padding: "8px 6px", textAlign: "center" }}>Kursus</th>
                <th style={{ padding: "8px 6px", textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: "center", padding: 16, color: "var(--text-muted)" }}>Tidak ada kategori ditemukan.</td></tr>
              ) : filteredCategories.map(cat => {
                const count = courses.filter(c => c.category === cat.key).length;
                return (
                  <tr key={cat.key} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "8px 6px", fontFamily: "monospace", fontWeight: 600, color: "var(--text-accent)" }}>{cat.key}</td>
                    <td style={{ padding: "8px 6px", color: "var(--text-primary)", fontWeight: 500 }}>{cat.name}</td>
                    <td style={{ padding: "8px 6px", textAlign: "center" }}>
                      <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: 10, background: "rgba(128,128,128,0.1)", color: "var(--text-secondary)" }}>
                        {count} kursus
                      </span>
                    </td>
                    <td style={{ padding: "8px 6px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <button
                          className="btn btn-secondary"
                          style={{ width: "auto", padding: "4px 8px", fontSize: "0.7rem" }}
                          title="Edit Kategori"
                          onClick={() => setEditingCat({ oldKey: cat.key, key: cat.key, name: cat.name })}
                        >
                          <Edit2 size={11} style={{ color: "var(--primary)" }} />
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ width: "auto", padding: "4px 8px", fontSize: "0.7rem", borderColor: "rgba(239,68,68,0.2)" }}
                          title="Hapus Kategori"
                          onClick={() => handleDeleteCategory(cat.key)}
                        >
                          <Trash2 size={11} style={{ color: "var(--danger)" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Form Tambah Kategori */}
        <form onSubmit={handleAddCategory} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Kode Kategori *</label>
            <input type="text" placeholder="Contoh: Finance" value={newCatKey} onChange={(e) => setNewCatKey(e.target.value)} required style={{ padding: "6px 10px", fontSize: "0.8rem", width: "100%" }} />
          </div>
          <div style={{ flex: 1.5 }}>
            <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Nama Kategori *</label>
            <input type="text" placeholder="Contoh: Keuangan & Fiskal" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} required style={{ padding: "6px 10px", fontSize: "0.8rem", width: "100%" }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "auto", padding: "7px 14px", height: "auto", fontSize: "0.78rem" }}>
            <Plus size={13} style={{ marginRight: 4 }} /> Tambah
          </button>
        </form>
      </div>

      {/* ── 2. Manajemen Tingkat (Level) ────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h4 style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", fontWeight: 700 }}>
              Manajemen Tingkat (Level)
            </h4>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Total: {levels.length} tingkat keahlian
            </span>
          </div>
        </div>

        {/* Search Level */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Cari kode atau nama level..."
            value={lvlSearch}
            onChange={(e) => setLvlSearch(e.target.value)}
            style={{ width: "100%", padding: "6px 10px 6px 30px", fontSize: "0.78rem", borderRadius: 6 }}
          />
        </div>

        {/* Form Edit Modal / Inline */}
        {editingLvl && (
          <form onSubmit={onSaveEditLvl} style={{ background: "var(--accent-badge-bg)", border: "1px solid var(--accent-badge-border)", borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-accent)", marginBottom: 8 }}>
              Edit Tingkat: <code style={{ fontFamily: "monospace" }}>{editingLvl.oldKey}</code>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 8, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 2 }}>Kode Level</label>
                <input
                  type="text"
                  value={editingLvl.key}
                  onChange={(e) => setEditingLvl({ ...editingLvl, key: e.target.value })}
                  required
                  style={{ padding: "6px 10px", fontSize: "0.8rem", width: "100%" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 2 }}>Nama Level</label>
                <input
                  type="text"
                  value={editingLvl.name}
                  onChange={(e) => setEditingLvl({ ...editingLvl, name: e.target.value })}
                  required
                  style={{ padding: "6px 10px", fontSize: "0.8rem", width: "100%" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" style={{ width: "auto", padding: "4px 12px", fontSize: "0.75rem" }} onClick={() => setEditingLvl(null)}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary" style={{ width: "auto", padding: "4px 14px", fontSize: "0.75rem" }}>
                Simpan Perubahan
              </button>
            </div>
          </form>
        )}

        {/* Tabel Level */}
        <div style={{ maxHeight: 280, overflowY: "auto", marginBottom: 16 }}>
          <table style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left", color: "var(--text-secondary)" }}>
                <th style={{ padding: "8px 6px" }}>Kode</th>
                <th style={{ padding: "8px 6px" }}>Nama Tingkat</th>
                <th style={{ padding: "8px 6px", textAlign: "center" }}>Kursus</th>
                <th style={{ padding: "8px 6px", textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredLevels.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: "center", padding: 16, color: "var(--text-muted)" }}>Tidak ada tingkat level ditemukan.</td></tr>
              ) : filteredLevels.map(lvl => {
                const count = courses.filter(c => c.level === lvl.key).length;
                return (
                  <tr key={lvl.key} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "8px 6px", fontFamily: "monospace", fontWeight: 600, color: "var(--text-accent)" }}>{lvl.key}</td>
                    <td style={{ padding: "8px 6px", color: "var(--text-primary)", fontWeight: 500 }}>{lvl.name}</td>
                    <td style={{ padding: "8px 6px", textAlign: "center" }}>
                      <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: 10, background: "rgba(128,128,128,0.1)", color: "var(--text-secondary)" }}>
                        {count} kursus
                      </span>
                    </td>
                    <td style={{ padding: "8px 6px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <button
                          className="btn btn-secondary"
                          style={{ width: "auto", padding: "4px 8px", fontSize: "0.7rem" }}
                          title="Edit Tingkat"
                          onClick={() => setEditingLvl({ oldKey: lvl.key, key: lvl.key, name: lvl.name })}
                        >
                          <Edit2 size={11} style={{ color: "var(--primary)" }} />
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ width: "auto", padding: "4px 8px", fontSize: "0.7rem", borderColor: "rgba(239,68,68,0.2)" }}
                          title="Hapus Tingkat"
                          onClick={() => handleDeleteLevel(lvl.key)}
                        >
                          <Trash2 size={11} style={{ color: "var(--danger)" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Form Tambah Level */}
        <form onSubmit={handleAddLevel} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Kode Level *</label>
            <input type="text" placeholder="Contoh: Professional" value={newLvlKey} onChange={(e) => setNewLvlKey(e.target.value)} required style={{ padding: "6px 10px", fontSize: "0.8rem", width: "100%" }} />
          </div>
          <div style={{ flex: 1.5 }}>
            <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Nama Level *</label>
            <input type="text" placeholder="Contoh: Profesional Lanjutan" value={newLvlName} onChange={(e) => setNewLvlName(e.target.value)} required style={{ padding: "6px 10px", fontSize: "0.8rem", width: "100%" }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "auto", padding: "7px 14px", height: "auto", fontSize: "0.78rem" }}>
            <Plus size={13} style={{ marginRight: 4 }} /> Tambah
          </button>
        </form>
      </div>

      {/* ── 3. Manajemen Dimensi Kompetensi (Radar Skills) ───────────────────── */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h4 style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", fontWeight: 700 }}>
              🎯 Dimensi Kompetensi (Radar Skills)
            </h4>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Total: {competencySkills.length} dimensi radar aktif
            </span>
          </div>
        </div>

        {/* Search Competency Skill */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Cari kode atau nama kompetensi..."
            value={skillSearch}
            onChange={(e) => setSkillSearch(e.target.value)}
            style={{ width: "100%", padding: "6px 10px 6px 30px", fontSize: "0.78rem", borderRadius: 6 }}
          />
        </div>

        {/* Form Edit Skill Modal / Inline */}
        {editingSkill && (
          <form onSubmit={onSaveEditSkill} style={{ background: "var(--accent-badge-bg)", border: "1px solid var(--accent-badge-border)", borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-accent)", marginBottom: 8 }}>
              Edit Dimensi: <code style={{ fontFamily: "monospace" }}>{editingSkill.oldKey}</code>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 8, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 2 }}>Kode Dimensi</label>
                <input
                  type="text"
                  value={editingSkill.key}
                  onChange={(e) => setEditingSkill({ ...editingSkill, key: e.target.value })}
                  required
                  style={{ padding: "6px 10px", fontSize: "0.8rem", width: "100%" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 2 }}>Nama Kompetensi</label>
                <input
                  type="text"
                  value={editingSkill.name}
                  onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                  required
                  style={{ padding: "6px 10px", fontSize: "0.8rem", width: "100%" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" style={{ width: "auto", padding: "4px 12px", fontSize: "0.75rem" }} onClick={() => setEditingSkill(null)}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary" style={{ width: "auto", padding: "4px 14px", fontSize: "0.75rem" }}>
                Simpan Perubahan
              </button>
            </div>
          </form>
        )}

        {/* Tabel Competency Skills */}
        <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 14, border: "1px solid var(--border-color)", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", background: "var(--bg-secondary)", color: "var(--text-secondary)", textAlign: "left" }}>
                <th style={{ padding: "8px 10px" }}>Kode</th>
                <th style={{ padding: "8px 10px" }}>Nama Dimensi</th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredSkills.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", padding: 16, color: "var(--text-muted)", fontSize: "0.75rem" }}>
                    Tidak ada dimensi kompetensi ditemukan.
                  </td>
                </tr>
              ) : filteredSkills.map(skill => (
                <tr key={skill.key} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "7px 10px" }}>
                    <code style={{ fontSize: "0.75rem", background: "var(--bg-secondary)", padding: "2px 6px", borderRadius: 4, color: "var(--primary)" }}>
                      {skill.key}
                    </code>
                  </td>
                  <td style={{ padding: "7px 10px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {skill.name}
                  </td>
                  <td style={{ padding: "7px 10px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-secondary"
                        style={{ width: "auto", padding: "4px 8px", fontSize: "0.7rem" }}
                        title="Edit Dimensi Kompetensi"
                        onClick={() => setEditingSkill({ oldKey: skill.key, key: skill.key, name: skill.name })}
                      >
                        <Edit2 size={11} style={{ color: "var(--primary)" }} />
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ width: "auto", padding: "4px 8px", fontSize: "0.7rem", borderColor: "rgba(239,68,68,0.2)" }}
                        title="Hapus Dimensi Kompetensi"
                        onClick={() => handleDeleteCompetencySkill(skill.key)}
                      >
                        <Trash2 size={11} style={{ color: "var(--danger)" }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Form Tambah Competency Skill */}
        <form onSubmit={handleAddCompetencySkill} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Kode Dimensi *</label>
            <input type="text" placeholder="Contoh: cyber_security" value={newSkillKey} onChange={(e) => setNewSkillKey(e.target.value)} required style={{ padding: "6px 10px", fontSize: "0.8rem", width: "100%" }} />
          </div>
          <div style={{ flex: 1.5 }}>
            <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Nama Kompetensi *</label>
            <input type="text" placeholder="Contoh: Cyber Security & IT Risk" value={newSkillName} onChange={(e) => setNewSkillName(e.target.value)} required style={{ padding: "6px 10px", fontSize: "0.8rem", width: "100%" }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "auto", padding: "7px 14px", height: "auto", fontSize: "0.78rem" }}>
            <Plus size={13} style={{ marginRight: 4 }} /> Tambah
          </button>
        </form>
      </div>

      {/* ── 4. Master Data Instruktur & Pengajar Ahli ────────────────────────── */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h4 style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", fontWeight: 700 }}>
              👨‍🏫 Master Data Instruktur &amp; Pengajar Ahli
            </h4>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              Total: {instructorsList.length} profil instruktur terdaftar
            </span>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: "auto", padding: "6px 14px", fontSize: "0.75rem" }}
            onClick={() => setAdminTab && setAdminTab("instructors")}
          >
            Kelola Lengkap di Tab Instruktur →
          </button>
        </div>

        {/* Search Instruktur */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Cari nama, keahlian, atau instansi instruktur..."
            value={instSearch}
            onChange={(e) => setInstSearch(e.target.value)}
            style={{ width: "100%", padding: "6px 10px 6px 30px", fontSize: "0.78rem", borderRadius: 6 }}
          />
        </div>

        {/* Tabel Ringkas Master Data Instruktur */}
        <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 14, border: "1px solid var(--border-color)", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", background: "var(--bg-secondary)", color: "var(--text-secondary)", textAlign: "left" }}>
                <th style={{ padding: "8px 10px" }}>Instruktur</th>
                <th style={{ padding: "8px 10px" }}>Instansi / Keahlian</th>
                <th style={{ padding: "8px 10px", textAlign: "center" }}>Kursus Diampu</th>
              </tr>
            </thead>
            <tbody>
              {filteredInstructors.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", padding: 16, color: "var(--text-muted)", fontSize: "0.75rem" }}>
                    {instructorsList.length === 0 ? "Memuat data instruktur..." : "Tidak ada instruktur cocok dengan pencarian."}
                  </td>
                </tr>
              ) : filteredInstructors.map(inst => (
                <tr key={inst.user_email} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "7px 10px" }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{inst.fullname}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{inst.user_email}</div>
                  </td>
                  <td style={{ padding: "7px 10px" }}>
                    <div style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{inst.specialty || "Pengajar Ahli"}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{inst.organization || "LMS Certified"}</div>
                  </td>
                  <td style={{ padding: "7px 10px", textAlign: "center" }}>
                    <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 10, background: "rgba(128,128,128,0.1)", color: "var(--text-secondary)", fontWeight: 600 }}>
                      {inst.jumlah_kursus || 0} Kursus
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--text-muted)" }}>
          <span>Penugasan kursus, bagi hasil royalti, dan jadwal sesi virtual dapat dikonfigurasi melalui tab Instruktur.</span>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: "auto", padding: "4px 12px", fontSize: "0.72rem" }}
            onClick={() => setAdminTab && setAdminTab("instructors")}
          >
            Buka Tab Instruktur
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AnalyticsDashboard ────────────────────────────────────────────────────────
function AnalyticsDashboard() {
  const [summary, setSummary]     = useState(null);
  const [userReport, setUserReport]   = useState([]);
  const [courseReport, setCourseReport] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [sumRes, userRes, courseRes] = await Promise.all([
        fetch("/api/analytics?type=summary"),
        fetch("/api/analytics?type=users"),
        fetch("/api/analytics?type=courses"),
      ]);
      const [sumData, userData, courseData] = await Promise.all([sumRes.json(), userRes.json(), courseRes.json()]);
      if (sumData.success)    { setSummary(sumData); }
      if (userData.success)   { setUserReport(userData.users || []); }
      if (courseData.success) { setCourseReport(courseData.courses || []); }
      if (!sumData.success && !userData.success) setError("DB tidak tersedia — tampilkan data demo");
    } catch { setError("Gagal memuat data analytics"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Chart.js revenue chart
  useEffect(() => {
    if (!chartRef.current || !summary?.revenueByMonth?.length) return;
    if (chartInstance.current) chartInstance.current.destroy();
    const months = summary.revenueByMonth.map(r => r.month);
    const totals = summary.revenueByMonth.map(r => parseInt(r.total) / 1000000);
    chartInstance.current = new Chart(chartRef.current, {
      type: "bar",
      data: {
        labels: months,
        datasets: [{
          label: "Revenue (Juta Rp)",
          data: totals,
          backgroundColor: "rgba(249, 115, 22,0.6)",
          borderColor: "#f97316",
          borderWidth: 2,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#94a3b8", font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: "#94a3b8", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.05)" } },
        },
      },
    });
    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [summary, activeTab]);

  // Export CSV
  const exportCSV = (data, filename, columns) => {
    const header = columns.map(c => c.label).join(",");
    const rows   = data.map(row => columns.map(c => `"${row[c.key] ?? ""}"`).join(","));
    const csv    = [header, ...rows].join("\n");
    const blob   = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url    = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const kpiCards = summary ? [
    { label: "Total Revenue",      value: `Rp ${(summary.summary.totalRevenue/1000000).toFixed(1)}M`, icon: TrendingUp,  color: "#6ee7b7" },
    { label: "Total User",         value: summary.summary.totalUsers,       icon: Users,      color: "var(--primary)" },
    { label: "Total Enrollment",   value: summary.summary.totalEnrollments, icon: BookOpen,   color: "#fde68a" },
    { label: "Sertifikat Terbit",  value: summary.summary.totalCertificates,icon: Award,      color: "#f9a8d4" },
  ] : [];

  const fmtNum = (n) => n != null ? Number(n).toLocaleString("id-ID") : "-";
  const fmtPct = (n) => n != null ? `${n}%` : "-";

  return (
    <div>
      {/* Sub-tabs */}
      <div className="filter-pills" style={{ marginBottom: 20 }}>
        {[["overview","Ringkasan"],["users","Laporan User"],["courses","Laporan Kursus"]].map(([k,l]) => (
          <button type="button" key={k} className={`filter-pill ${activeTab===k?"active":""}`} onClick={() => setActiveTab(k)}>{l}</button>
        ))}
        <button
          onClick={fetchData}
          className="btn btn-secondary" style={{ width:"auto", padding:"4px 12px", fontSize:"0.75rem", marginLeft:"auto" }}>
          ↻ Refresh
        </button>
      </div>

      {loading && <p style={{ color:"var(--text-muted)", textAlign:"center", padding:40 }}>Memuat data analytics...</p>}
      {error   && <p style={{ color:"#fde68a", fontSize:"0.8rem", padding:"8px 14px", background:"rgba(245,158,11,0.1)", borderRadius:6, marginBottom:16 }}>{error}</p>}

      {/* ── Ringkasan ── */}
      {activeTab === "overview" && !loading && (
        <div>
          {/* KPI Cards */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
            {kpiCards.map((k,i) => (
              <div key={i} className="glass-card" style={{ padding:20, textAlign:"center" }}>
                <k.icon size={28} style={{ color:k.color, marginBottom:8 }} />
                <div style={{ fontSize:"1.5rem", fontWeight:700, color:k.color }}>{k.value}</div>
                <div style={{ fontSize:"0.75rem", color:"var(--text-muted)", marginTop:4 }}>{k.label}</div>
              </div>
            ))}
          </div>
          {/* Revenue chart */}
          {summary?.revenueByMonth?.length > 0 && (
            <div className="glass-card" style={{ padding:20, marginBottom:24 }}>
              <h4 style={{ marginBottom:16, color:"var(--text-primary)", fontSize:"0.9rem" }}>Revenue 12 Bulan Terakhir (Juta Rp)</h4>
              <div style={{ height:200 }}>
                <canvas ref={chartRef} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Laporan User ── */}
      {activeTab === "users" && !loading && (
        <div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
            <button onClick={() => exportCSV(userReport, "laporan-user.csv", [
              {label:"Email",key:"email"},{label:"Nama",key:"fullname"},{label:"Enrollment",key:"enrollment_count"},
              {label:"Selesai",key:"completed_count"},{label:"% Selesai",key:"completion_rate"},{label:"Avg Score",key:"avg_score"},
            ])} className="btn btn-secondary" style={{ width:"auto", padding:"4px 14px", fontSize:"0.75rem" }}>
              <Download size={12} style={{ marginRight:4 }} /> Export CSV
            </button>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", fontSize:"0.78rem", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ borderBottom:"2px solid var(--border-color)", color:"var(--text-secondary)", textAlign:"left" }}>
                  {["Nama","Email","Enrollment","Selesai","% Selesai","Avg Score","Terakhir Aktif"].map(h=>(
                    <th key={h} style={{ padding:"8px 10px", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {userReport.length===0 ? (
                  <tr><td colSpan={7} style={{ padding:20, textAlign:"center", color:"var(--text-muted)" }}>Tidak ada data user</td></tr>
                ) : userReport.map((u,i) => (
                  <tr key={i} style={{ borderBottom:"1px solid var(--border-color)" }}>
                    <td style={{ padding:"8px 10px", fontWeight:600 }}>{u.fullname||"—"}</td>
                    <td style={{ padding:"8px 10px", fontFamily:"monospace", fontSize:"0.7rem" }}>{u.email}</td>
                    <td style={{ padding:"8px 10px", textAlign:"center" }}>{fmtNum(u.enrollment_count)}</td>
                    <td style={{ padding:"8px 10px", textAlign:"center" }}>{fmtNum(u.completed_count)}</td>
                    <td style={{ padding:"8px 10px", textAlign:"center" }}>
                      <span style={{ color: u.completion_rate>=70?"#6ee7b7":u.completion_rate>=40?"#fde68a":"#fca5a5" }}>{fmtPct(u.completion_rate)}</span>
                    </td>
                    <td style={{ padding:"8px 10px", textAlign:"center" }}>{u.avg_score!=null?`${Number(u.avg_score).toFixed(0)}`:"-"}</td>
                    <td style={{ padding:"8px 10px", fontSize:"0.7rem", color:"var(--text-muted)" }}>
                      {u.last_active ? new Date(u.last_active).toLocaleDateString("id-ID") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Laporan Kursus ── */}
      {activeTab === "courses" && !loading && (
        <div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
            <button onClick={() => exportCSV(courseReport, "laporan-kursus.csv", [
              {label:"Judul",key:"title"},{label:"Enrollment",key:"enrollment_count"},{label:"Sertifikat",key:"cert_count"},
              {label:"Avg Score",key:"avg_score"},{label:"% Selesai",key:"completion_rate"},{label:"Dropout%",key:"dropout_rate"},{label:"Revenue",key:"total_revenue"},
            ])} className="btn btn-secondary" style={{ width:"auto", padding:"4px 14px", fontSize:"0.75rem" }}>
              <Download size={12} style={{ marginRight:4 }} /> Export CSV
            </button>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", fontSize:"0.78rem", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ borderBottom:"2px solid var(--border-color)", color:"var(--text-secondary)", textAlign:"left" }}>
                  {["Kursus","Enrollment","Sertifikat","Avg Score","% Selesai","Dropout%","Revenue"].map(h=>(
                    <th key={h} style={{ padding:"8px 10px", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courseReport.length===0 ? (
                  <tr><td colSpan={7} style={{ padding:20, textAlign:"center", color:"var(--text-muted)" }}>Tidak ada data kursus</td></tr>
                ) : courseReport.map((c,i) => (
                  <tr key={i} style={{ borderBottom:"1px solid var(--border-color)" }}>
                    <td style={{ padding:"8px 10px", fontWeight:600 }}>{c.title||c.course_id}</td>
                    <td style={{ padding:"8px 10px", textAlign:"center" }}>{fmtNum(c.enrollment_count)}</td>
                    <td style={{ padding:"8px 10px", textAlign:"center" }}>{fmtNum(c.cert_count)}</td>
                    <td style={{ padding:"8px 10px", textAlign:"center" }}>{c.avg_score!=null?`${Number(c.avg_score).toFixed(0)}`:"-"}</td>
                    <td style={{ padding:"8px 10px", textAlign:"center" }}>
                      <span style={{ color: c.completion_rate>=70?"#6ee7b7":c.completion_rate>=40?"#fde68a":"#fca5a5" }}>{fmtPct(c.completion_rate)}</span>
                    </td>
                    <td style={{ padding:"8px 10px", textAlign:"center", color:"#fca5a5" }}>{fmtPct(c.dropout_rate)}</td>
                    <td style={{ padding:"8px 10px" }}>Rp {c.total_revenue!=null?(parseInt(c.total_revenue)/1000000).toFixed(1)+"M":"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AuditLogViewer ───────────────────────────────────────────────────────────
function AuditLogViewer() {
  const [logs, setLogs]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [pages, setPages]     = useState(1);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ actor: "", action: "", entity: "" });
  const [sessions, setSessions]     = useState([]);
  const [sessLoading, setSessLoading] = useState(false);
  const [activeTab, setActiveTab]   = useState("logs");

  const loadLogs = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: p, ...filters }).toString();
      const res  = await fetch(`/api/audit-logs?${qs}`);
      const data = await res.json();
      if (data.success) { setLogs(data.logs); setTotal(data.total); setPages(data.pages); setPage(p); }
    } catch { /* ignore */ }
    setLoading(false);
  }, [filters]);

  const loadSessions = useCallback(async () => {
    setSessLoading(true);
    try {
      const res  = await fetch("/api/sessions");
      const data = await res.json();
      if (data.success) setSessions(data.sessions || []);
    } catch { /* ignore */ }
    setSessLoading(false);
  }, []);

  useEffect(() => { if (activeTab === "logs") loadLogs(1); }, [loadLogs, activeTab]);
  useEffect(() => { if (activeTab === "sessions") loadSessions(); }, [loadSessions, activeTab]);

  const revokeSession = async (id) => {
    await fetch(`/api/sessions?id=${id}`, { method: "DELETE" });
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const ACTION_COLOR = { create: "#6ee7b7", update: "#fde68a", delete: "#fca5a5", login: "var(--primary)", bulk_enroll: "#93c5fd", create_announcement: "#fbbf24" };
  const color = (a) => ACTION_COLOR[a] || "#94a3b8";

  const timeAgo = (ts) => {
    if (!ts) return "-";
    const d = Math.floor((Date.now() - new Date(ts)) / 86400000);
    if (d === 0) return new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    return new Date(ts).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div>
      <div className="filter-pills" style={{ marginBottom: 20 }}>
        <button type="button" className={`filter-pill ${activeTab==="logs"?"active":""}`} onClick={() => setActiveTab("logs")}>Audit Log</button>
        <button type="button" className={`filter-pill ${activeTab==="sessions"?"active":""}`} onClick={() => setActiveTab("sessions")}>Sesi Aktif</button>
      </div>

      {activeTab === "logs" && (
        <>
          <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
            {[["actor","Actor/Email"],["action","Aksi"],["entity","Entitas"]].map(([k,l]) => (
              <input key={k} type="text" placeholder={l} value={filters[k]}
                onChange={e => setFilters(p => ({...p,[k]:e.target.value}))}
                style={{ paddingLeft:12, height:34, fontSize:"0.78rem", flex:1, minWidth:120 }} />
            ))}
            <button onClick={() => loadLogs(1)} className="btn btn-primary" style={{ width:"auto", padding:"0 16px", height:34, fontSize:"0.78rem" }}>Filter</button>
          </div>
          <p style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginBottom:8 }}>{total} total entri | Halaman {page} dari {pages}</p>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", fontSize:"0.75rem", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ borderBottom:"2px solid var(--border-color)", color:"var(--text-secondary)", textAlign:"left" }}>
                  {["Waktu","Actor","Aksi","Entitas","ID","Detail"].map(h => (
                    <th key={h} style={{ padding:"8px 10px", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding:20, textAlign:"center", color:"var(--text-muted)" }}>Memuat audit log...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding:20, textAlign:"center", color:"var(--text-muted)" }}>Tidak ada log ditemukan</td></tr>
                ) : logs.map(log => (
                  <tr key={log.id} style={{ borderBottom:"1px solid var(--border-color)" }}>
                    <td style={{ padding:"7px 10px", whiteSpace:"nowrap", color:"var(--text-muted)" }}>{timeAgo(log.created_at)}</td>
                    <td style={{ padding:"7px 10px" }}>
                      <div style={{ fontWeight:600 }}>{log.actor_name || log.actor_email}</div>
                      <div style={{ fontSize:"0.65rem", color:"var(--text-muted)", fontFamily:"monospace" }}>{log.actor_email}</div>
                    </td>
                    <td style={{ padding:"7px 10px" }}>
                      <span style={{ padding:"2px 8px", borderRadius:10, fontSize:"0.68rem", fontWeight:700, background:color(log.action)+"22", color:color(log.action) }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding:"7px 10px" }}>{log.entity_type||"-"}</td>
                    <td style={{ padding:"7px 10px", fontFamily:"monospace", fontSize:"0.68rem" }}>{log.entity_id||"-"}</td>
                    <td style={{ padding:"7px 10px", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"var(--text-muted)" }}>
                      {log.detail ? JSON.stringify(log.detail).substring(0,60) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div style={{ display:"flex", gap:6, justifyContent:"center", marginTop:16 }}>
              <button onClick={() => loadLogs(page-1)} disabled={page<=1} className="btn btn-secondary" style={{ width:"auto", padding:"4px 12px", fontSize:"0.75rem" }}>← Prev</button>
              <span style={{ padding:"4px 8px", fontSize:"0.75rem", color:"var(--text-muted)" }}>{page}/{pages}</span>
              <button onClick={() => loadLogs(page+1)} disabled={page>=pages} className="btn btn-secondary" style={{ width:"auto", padding:"4px 12px", fontSize:"0.75rem" }}>Next →</button>
            </div>
          )}
        </>
      )}

      {activeTab === "sessions" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <p style={{ color:"var(--text-secondary)", fontSize:"0.8rem", margin:0 }}>{sessions.length} sesi aktif.</p>
            <button onClick={loadSessions} className="btn btn-secondary" style={{ width:"auto", padding:"4px 10px", fontSize:"0.72rem" }}>↻ Refresh</button>
          </div>
          {sessLoading ? (
            <p style={{ color:"var(--text-muted)", textAlign:"center", padding:20 }}>Memuat...</p>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {sessions.length === 0 && <p style={{ color:"var(--text-muted)", fontSize:"0.8rem", textAlign:"center", padding:20 }}>Tidak ada sesi aktif tercatat.</p>}
              {sessions.map(s => (
                <div key={s.id} style={{ padding:"10px 14px", background:"rgba(255,255,255,0.02)", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:"0.82rem" }}>{s.fullname||s.user_email}</div>
                    <div style={{ fontSize:"0.7rem", color:"var(--text-muted)", marginTop:2 }}>
                      IP: {s.ip_address||"—"} • Aktif: {timeAgo(s.last_active)} • Mulai: {timeAgo(s.created_at)}
                    </div>
                  </div>
                  <button onClick={() => revokeSession(s.id)} className="btn btn-secondary"
                    style={{ width:"auto", padding:"4px 10px", fontSize:"0.72rem", borderColor:"rgba(239,68,68,0.3)", color:"#fca5a5", flexShrink:0 }}>
                    Cabut Sesi
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── CertTemplateManager ───────────────────────────────────────────────────────
function CertTemplateManager() {
  const [tpl, setTpl]     = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]     = useState("");

  useEffect(() => {
    fetch("/api/cert-template").then(r => r.json()).then(d => { if (d.template) setTpl(d.template); });
  }, []);

  const save = async () => {
    setSaving(true); setMsg("");
    const res = await fetch("/api/cert-template", { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify(tpl) });
    const d = await res.json();
    setMsg(d.success ? "✓ Template tersimpan" : `✕ ${d.error}`);
    setSaving(false);
  };

  if (!tpl) return <p style={{ color:"var(--text-muted)", textAlign:"center", padding:20 }}>Memuat template...</p>;

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, alignItems:"start" }}>
      {/* Form */}
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {msg && <div style={{ padding:"6px 12px", borderRadius:6, fontSize:"0.78rem", color: msg.startsWith("✓")?"#6ee7b7":"#fca5a5", background: msg.startsWith("✓")?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)" }}>{msg}</div>}
        {[["org_name","Nama Organisasi"],["tagline","Tagline / Motto"],["signer1_name","Nama Penanda Tangan 1"],["signer1_title","Jabatan Penanda Tangan 1"],["signer2_name","Nama Penanda Tangan 2"],["signer2_title","Jabatan Penanda Tangan 2"]].map(([k,l]) => (
          <div key={k} className="form-group" style={{ margin:0 }}>
            <label style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>{l}</label>
            <input type="text" value={tpl[k]||""} onChange={e => setTpl(p=>({...p,[k]:e.target.value}))} style={{ paddingLeft:12, height:36, fontSize:"0.82rem" }} />
          </div>
        ))}
        <div className="form-group" style={{ margin:0 }}>
          <label style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>Warna Aksen (Hex, contoh: 6366f1)</label>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <input type="color" value={`#${(tpl.accent_color||"f97316")}`}
              onChange={e => setTpl(p=>({...p, accent_color: e.target.value.replace("#","")}))}
              style={{ width:40, height:36, padding:2, borderRadius:4, border:"1px solid var(--border-color)", background:"none", cursor:"pointer" }} />
            <input type="text" value={tpl.accent_color||""} onChange={e => setTpl(p=>({...p,accent_color:e.target.value}))} style={{ flex:1, paddingLeft:12, height:36, fontSize:"0.82rem", fontFamily:"monospace" }} />
          </div>
        </div>
        <button onClick={save} disabled={saving} className="btn btn-primary" style={{ width:"auto", padding:"8px 20px", marginTop:4 }}>
          {saving ? "Menyimpan..." : "Simpan Template"}
        </button>
      </div>

      {/* Preview */}
      <div>
        <p style={{ fontSize:"0.72rem", color:"var(--text-muted)", marginBottom:8 }}>Preview Sertifikat</p>
        <div style={{ padding:20, background:`linear-gradient(135deg, #431407, #0f172a)`, borderRadius:8, border:`2px solid #${tpl.accent_color||"f97316"}44`, fontFamily:"serif", position:"relative" }}>
          <div style={{ textAlign:"center", marginBottom:12 }}>
            <div style={{ fontSize:"0.7rem", color:`#${tpl.accent_color||"f97316"}`, letterSpacing:4, textTransform:"uppercase" }}>Sertifikat Kompetensi</div>
            <h3 style={{ color:"white", fontSize:"1rem", margin:"4px 0" }}>{tpl.org_name||"Nama Organisasi"}</h3>
            <p style={{ fontSize:"0.65rem", color:"#94a3b8", margin:0 }}>{tpl.tagline||""}</p>
          </div>
          <div style={{ textAlign:"center", padding:"12px 0", borderTop:`1px solid #${tpl.accent_color||"f97316"}44`, borderBottom:`1px solid #${tpl.accent_color||"6366f1"}44`, margin:"8px 0" }}>
            <p style={{ fontSize:"0.65rem", color:"#94a3b8", margin:"0 0 4px" }}>dengan bangga memberikan sertifikat kepada</p>
            <p style={{ color:"white", fontStyle:"italic", fontSize:"0.9rem", margin:"4px 0" }}>Nama Peserta</p>
            <p style={{ fontSize:"0.65rem", color:"#94a3b8", margin:0 }}>atas keberhasilan menyelesaikan</p>
            <p style={{ color:`#${tpl.accent_color||"f97316"}`, fontWeight:700, fontSize:"0.85rem", margin:"4px 0" }}>Judul Kursus</p>
          </div>
          <div style={{ display:"flex", justifyContent:"space-around", marginTop:12 }}>
            {[{name:tpl.signer1_name,title:tpl.signer1_title},{name:tpl.signer2_name,title:tpl.signer2_title}].map((s,i) => s.name && (
              <div key={i} style={{ textAlign:"center" }}>
                <div style={{ width:60, height:1, background:`#${tpl.accent_color||"f97316"}`, margin:"0 auto 4px" }} />
                <p style={{ fontSize:"0.6rem", color:"white", margin:0 }}>{s.name}</p>
                <p style={{ fontSize:"0.55rem", color:"#94a3b8", margin:0 }}>{s.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AdminPage (main export) ───────────────────────────────────────────────────

// ── Live Session Manager ──────────────────────────────────────────────────────
function LiveSessionManager() {
  const [sessions, setSessions]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [form, setForm]             = useState({ title:"", description:"", scheduledAt:"", durationMinutes:60, meetLink:"", platform:"zoom", maxParticipants:100, courseId:"", recordingUrl:"" });
  const [msg, setMsg]               = useState("");
  const { courses } = useApp();

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/live-sessions?limit=20");
      const data = await res.json();
      if (data.success) setSessions(data.sessions || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.scheduledAt) return setMsg("✕ Title dan waktu wajib diisi");
    try {
      const res = await fetch("/api/live-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) { setMsg("✓ Sesi dibuat"); setForm({ title:"", description:"", scheduledAt:"", durationMinutes:60, meetLink:"", platform:"zoom", maxParticipants:100, courseId:"", recordingUrl:"" }); load(); }
      else setMsg("✕ " + data.error);
    } catch { setMsg("✕ Gagal membuat sesi"); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus sesi ini? Peserta terdaftar akan menerima notifikasi pembatalan.")) return;
    await fetch(`/api/live-sessions?id=${id}`, { method: "DELETE" });
    load();
  };

  // Panel kelola per sesi: ubah status dan tempel link rekaman tanpa harus
  // membuat ulang sesi.
  const [terbuka, setTerbuka]   = useState(null);   // id sesi yang panelnya dibuka
  const [edit, setEdit]         = useState({ status:"", recordingUrl:"" });
  const [peserta, setPeserta]   = useState(null);   // { participants, ringkas }
  const [menyapu, setMenyapu]   = useState(false);

  const bukaPanel = async (s) => {
    if (terbuka === s.id) { setTerbuka(null); setPeserta(null); return; }
    setTerbuka(s.id);
    setEdit({ status: s.status || "scheduled", recordingUrl: s.recording_url || "" });
    setPeserta(null);
    try {
      const res  = await fetch(`/api/live-sessions/participants?id=${s.id}`);
      const data = await res.json();
      if (data.success) setPeserta(data);
    } catch { /* ignore */ }
  };

  const simpanPanel = async (id) => {
    try {
      const res  = await fetch("/api/live-sessions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: edit.status, recordingUrl: edit.recordingUrl }),
      });
      const data = await res.json();
      setMsg(data.success ? "✓ Sesi diperbarui" : "✕ " + (data.error || "Gagal"));
      if (data.success) { setTerbuka(null); load(); }
    } catch { setMsg("✕ Gagal memperbarui sesi"); }
  };

  // Penyapu yang sama dengan yang dipanggil penjadwal — tombol ini untuk
  // menjalankannya manual saat menguji atau ketika penjadwal belum dipasang.
  const jalankanPenyapu = async () => {
    setMenyapu(true);
    try {
      const res  = await fetch("/api/live-sessions/sweep", { method: "POST" });
      const data = await res.json();
      setMsg(data.success
        ? `✓ Penyapu selesai — pengingat H-1: ${data.reminder24h}, H-1 jam: ${data.reminder1h}, status diperbarui: ${data.jadiLive + data.jadiSelesai}`
        : "✕ " + (data.error || "Gagal"));
      load();
    } catch { setMsg("✕ Gagal menjalankan penyapu"); }
    setMenyapu(false);
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div>
      <div className="glass-card" style={{ padding:20, marginBottom:20 }}>
        <h4 style={{ fontSize:"0.85rem", color:"var(--primary)", marginBottom:14 }}>＋ Buat Live Session Baru</h4>
        {msg && <div style={{ fontSize:"0.75rem", padding:"8px 14px", borderRadius:8, marginBottom:12, background: msg.startsWith("✓") ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", color: msg.startsWith("✓") ? "var(--success)" : "var(--danger)", border: `1px solid ${msg.startsWith("✓") ? "var(--success)" : "var(--danger)"}` }}>{msg}</div>}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div className="form-group" style={{ margin:0 }}>
            <label style={{ fontSize:"0.75rem", color:"var(--text-muted)", fontWeight: 600 }}>Judul Sesi*</label>
            <input type="text" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Nama sesi live class" style={{ paddingLeft:12 }} />
          </div>
          <div className="form-group" style={{ margin:0 }}>
            <label style={{ fontSize:"0.75rem", color:"var(--text-muted)", fontWeight: 600 }}>Kursus (opsional)</label>
            <select value={form.courseId} onChange={e => set("courseId", e.target.value)} style={{ paddingLeft:12 }}>
              <option value="">-- Pilih Kursus --</option>
              {(courses||[]).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin:0 }}>
            <label style={{ fontSize:"0.75rem", color:"var(--text-muted)", fontWeight: 600 }}>Waktu Mulai*</label>
            <input type="datetime-local" value={form.scheduledAt} onChange={e => set("scheduledAt", e.target.value)} style={{ paddingLeft:12 }} />
          </div>
          <div className="form-group" style={{ margin:0 }}>
            <label style={{ fontSize:"0.75rem", color:"var(--text-muted)", fontWeight: 600 }}>Durasi (menit)</label>
            <input type="number" value={form.durationMinutes} onChange={e => set("durationMinutes", parseInt(e.target.value))} min={15} style={{ paddingLeft:12 }} />
          </div>
          <div className="form-group" style={{ margin:0 }}>
            <label style={{ fontSize:"0.75rem", color:"var(--text-muted)", fontWeight: 600 }}>Link Meet</label>
            <input type="url" value={form.meetLink} onChange={e => set("meetLink", e.target.value)} placeholder="https://zoom.us/j/..." style={{ paddingLeft:12 }} />
          </div>
          <div className="form-group" style={{ margin:0 }}>
            <label style={{ fontSize:"0.75rem", color:"var(--text-muted)", fontWeight: 600 }}>Platform</label>
            <select value={form.platform} onChange={e => set("platform", e.target.value)} style={{ paddingLeft:12 }}>
              <option value="zoom">Zoom</option>
              <option value="gmeet">Google Meet</option>
              <option value="teams">MS Teams</option>
              <option value="webex">Webex</option>
            </select>
          </div>
        </div>
        <div className="form-group" style={{ margin:"12px 0 0" }}>
          <label style={{ fontSize:"0.75rem", color:"var(--text-muted)", fontWeight: 600 }}>Deskripsi</label>
          <input type="text" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Deskripsi singkat sesi" style={{ paddingLeft:12 }} />
        </div>
        <div className="form-group" style={{ margin:"12px 0 0" }}>
          <label style={{ fontSize:"0.75rem", color:"var(--text-muted)", fontWeight: 600 }}>Link Rekaman (boleh diisi belakangan)</label>
          <input type="url" value={form.recordingUrl} onChange={e => set("recordingUrl", e.target.value)} placeholder="https://... (tampil untuk peserta setelah sesi selesai)" style={{ paddingLeft:12 }} />
        </div>
        <button className="btn btn-primary" style={{ width:"auto", marginTop:16, padding:"12px 28px", fontSize:"0.92rem", fontWeight:700, borderRadius:10, boxShadow:"0 4px 16px rgba(249,115,22,0.35)", display:"inline-flex", alignItems:"center", gap:8 }} onClick={handleCreate}>
          <Calendar size={18} />
          <span>Buat Sesi Live Sekarang</span>
        </button>
      </div>

      {loading ? <p style={{ color:"var(--text-muted)", fontSize:"0.8rem" }}>Memuat...</p> : (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <h4 style={{ fontSize:"0.85rem", margin:0 }}>Sesi Terjadwal ({sessions.length})</h4>
            <button className="btn btn-secondary" style={{ width:"auto", padding:"6px 14px", fontSize:"0.75rem" }}
              disabled={menyapu} onClick={jalankanPenyapu}>
              {menyapu ? "Menjalankan…" : "↻ Kirim pengingat & perbarui status"}
            </button>
          </div>
          {sessions.length === 0 ? <p style={{ color:"var(--text-muted)", fontSize:"0.8rem" }}>Belum ada sesi.</p> : sessions.map(s => (
            <div key={s.id}>
            <div className="glass-card" style={{ padding:14, marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <Video size={13} style={{ color:"var(--primary)" }} />
                  <span style={{ fontWeight:600, fontSize:"0.85rem" }}>{s.title}</span>
                  <span style={{ fontSize:"0.65rem", background:"var(--accent-badge-bg)", color:"var(--text-accent)", border:"1px solid var(--accent-badge-border)", padding:"2px 8px", borderRadius:20 }}>{s.platform?.toUpperCase()}</span>
                </div>
                <div style={{ fontSize:"0.72rem", color:"var(--text-muted)", display:"flex", gap:12 }}>
                  <span>📅 {new Date(s.scheduled_at).toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"})}</span>
                  <span>⏱ {s.duration_minutes}m</span>
                  <span>👥 {s.registered_count||0}/{s.max_participants}</span>
                  {s.course_title && <span>📚 {s.course_title}</span>}
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {s.meet_link && <a href={s.meet_link} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ width:"auto", padding:"6px 12px", fontSize:"0.75rem", textDecoration:"none" }}>Buka Link</a>}
                <button className="btn btn-secondary" style={{ width:"auto", padding:"6px 12px", fontSize:"0.75rem" }} onClick={() => bukaPanel(s)}>
                  {terbuka === s.id ? "Tutup" : "Kelola"}
                </button>
                <button className="btn btn-secondary" style={{ width:"auto", padding:"6px 12px", fontSize:"0.75rem", color:"var(--danger)" }} onClick={() => handleDelete(s.id)}>Hapus</button>
              </div>
            </div>
            {terbuka === s.id && (
              <div className="glass-card" style={{ padding:14, marginBottom:10, marginTop:-6, borderTop:"none" }}>
                <div style={{ display:"grid", gridTemplateColumns:"160px 1fr auto", gap:12, alignItems:"end", marginBottom:14 }}>
                  <div className="form-group" style={{ margin:0 }}>
                    <label style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>Status</label>
                    <select value={edit.status} onChange={e => setEdit(p => ({ ...p, status:e.target.value }))} style={{ paddingLeft:12 }}>
                      <option value="scheduled">Terjadwal</option>
                      <option value="live">Sedang berlangsung</option>
                      <option value="completed">Selesai</option>
                      <option value="cancelled">Dibatalkan</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin:0 }}>
                    <label style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>Link Rekaman</label>
                    <input type="url" value={edit.recordingUrl} placeholder="https://..."
                      onChange={e => setEdit(p => ({ ...p, recordingUrl:e.target.value }))} style={{ paddingLeft:12 }} />
                  </div>
                  <button className="btn btn-primary" style={{ width:"auto", padding:"8px 16px", fontSize:"0.78rem" }}
                    onClick={() => simpanPanel(s.id)}>Simpan</button>
                </div>
                <p style={{ fontSize:"0.7rem", color:"var(--text-muted)", marginTop:-6, marginBottom:12 }}>
                  Rekaman baru tampil untuk peserta setelah status sesi menjadi Selesai.
                </p>

                {!peserta ? (
                  <p style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>Memuat peserta…</p>
                ) : (
                  <>
                    <div style={{ display:"flex", gap:16, fontSize:"0.75rem", marginBottom:8 }}>
                      <span>Terdaftar: <strong>{peserta.ringkas.terdaftar}</strong></span>
                      <span>Antre: <strong>{peserta.ringkas.antre}</strong></span>
                      <span>Hadir: <strong style={{ color:"#6ee7b7" }}>{peserta.ringkas.hadir}</strong></span>
                      <span>Batal: <strong>{peserta.ringkas.batal}</strong></span>
                    </div>
                    {peserta.participants.length === 0 ? (
                      <p style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>Belum ada pendaftar.</p>
                    ) : (
                      <div style={{ maxHeight:200, overflowY:"auto" }}>
                        <table style={{ width:"100%", fontSize:"0.72rem", borderCollapse:"collapse" }}>
                          <thead>
                            <tr style={{ textAlign:"left", color:"var(--text-secondary)", borderBottom:"1px solid var(--border-color)" }}>
                              <th style={{ padding:6 }}>Nama</th><th style={{ padding:6 }}>Email</th>
                              <th style={{ padding:6 }}>Status</th><th style={{ padding:6 }}>Kehadiran</th>
                            </tr>
                          </thead>
                          <tbody>
                            {peserta.participants.map(pd => (
                              <tr key={pd.user_email} style={{ borderBottom:"1px solid var(--border-color)" }}>
                                <td style={{ padding:6, color:"var(--text-primary)", fontWeight:600 }}>{pd.fullname || "—"}</td>
                                <td style={{ padding:6, fontFamily:"monospace" }}>{pd.user_email}</td>
                                <td style={{ padding:6 }}>
                                  {pd.status === "registered" ? "Terdaftar" : pd.status === "waitlisted" ? "Antre" : "Batal"}
                                </td>
                                <td style={{ padding:6, color: pd.attended ? "#6ee7b7" : "var(--text-muted)" }}>
                                  {pd.attended ? new Date(pd.attended_at).toLocaleString("id-ID",{dateStyle:"short",timeStyle:"short"}) : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Leaderboard & XP Panel ────────────────────────────────────────────────────
function GamificationPanel() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [scope, setScope]             = useState("global");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?scope=${scope}&limit=10`)
      .then(r => r.json())
      .then(data => { if (data.success) setLeaderboard(data.leaderboard || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [scope]);

  const LEVEL_COLORS = ["#94a3b8","#60a5fa","#34d399","#fbbf24","#f97316","#a78bfa","#ec4899","#f43f5e","#6ee7b7","#fff"];
  const rankIcon = (r) => r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : `#${r}`;

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {["global","org"].map(s => (
          <button key={s} className={`btn ${scope === s ? "btn-primary" : "btn-secondary"}`}
            style={{ width:"auto", padding:"4px 14px", fontSize:"0.75rem" }}
            onClick={() => setScope(s)}>
            {s === "global" ? "🌍 Global" : "🏢 Organisasi"}
          </button>
        ))}
      </div>
      {loading ? <p style={{ color:"var(--text-muted)", fontSize:"0.8rem" }}>Memuat leaderboard...</p> : (
        <div>
          {leaderboard.map((u, i) => (
            <div key={u.email} className="glass-card" style={{ padding:"10px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:12, border: i < 3 ? "1px solid rgba(251,191,36,0.3)" : "none" }}>
              <div style={{ fontSize: i < 3 ? "1.2rem" : "0.85rem", width:28, textAlign:"center", fontWeight:700, color: i < 3 ? "#fbbf24" : "var(--text-muted)" }}>
                {rankIcon(parseInt(u.rank))}
              </div>
              <div style={{ width:32, height:32, borderRadius:"50%", background:`${LEVEL_COLORS[Math.min((u.level||1)-1,9)]}33`, border:`2px solid ${LEVEL_COLORS[Math.min((u.level||1)-1,9)]}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.75rem", fontWeight:700, flexShrink:0 }}>
                {u.avatar || u.fullname?.substring(0,2).toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:"0.85rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.fullname}</div>
                <div style={{ fontSize:"0.65rem", color:"var(--text-muted)" }}>{u.organization || "—"}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:"0.85rem", fontWeight:700, color: LEVEL_COLORS[Math.min((u.level||1)-1,9)] }}>
                  <Zap size={12} style={{ marginRight:3, verticalAlign:"middle" }} />{u.total_points||0} XP
                </div>
                <div style={{ fontSize:"0.65rem", color:"var(--text-muted)" }}>Lv.{u.level||1} · {u.badge_count||0} badge · {u.streak_days||0}🔥</div>
              </div>
            </div>
          ))}
          {leaderboard.length === 0 && <p style={{ color:"var(--text-muted)", fontSize:"0.8rem", textAlign:"center" }}>Belum ada data.</p>}
        </div>
      )}
    </div>
  );
}

// ── KPI & Advanced Report Panel ───────────────────────────────────────────────
function KpiReportPanel() {
  const [reportType, setReportType]   = useState("overview");
  const [overview, setOverview]       = useState(null);
  const [orgs, setOrgs]               = useState([]);
  const [depts, setDepts]             = useState([]);
  const [kpis, setKpis]               = useState([]);
  const [courseStats, setCourseStats] = useState([]);
  const [trend, setTrend]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [kpiForm, setKpiForm]         = useState({ organization:"", department:"", metricKey:"completion_rate", metricLabel:"Tingkat Penyelesaian", targetValue:80, unit:"%", periodStart:"", periodEnd:"" });
  const [kpiRecordId, setKpiRecordId] = useState("");
  const [kpiActual, setKpiActual]     = useState("");
  const [from, setFrom]               = useState(new Date(Date.now()-30*86400000).toISOString().split("T")[0]);
  const [to, setTo]                   = useState(new Date().toISOString().split("T")[0]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q    = `?type=${reportType}&from=${from}&to=${to}`;
      const res  = await fetch(`/api/reports${q}`);
      const data = await res.json();
      if (!data.success) return;
      if (reportType === "overview")     setOverview(data.overview);
      if (reportType === "org")          setOrgs(data.orgs || []);
      if (reportType === "dept")         setDepts(data.depts || []);
      if (reportType === "kpi")          setKpis(data.kpis || []);
      if (reportType === "course_stats") setCourseStats(data.courses || []);
      if (reportType === "trend")        setTrend(data.trend || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [reportType, from, to]);

  useEffect(() => { load(); }, [load]);

  const saveKpi = async () => {
    const res  = await fetch("/api/reports", { method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ action:"set_kpi", ...kpiForm }) });
    const data = await res.json();
    if (data.success) { alert("KPI target disimpan"); load(); }
    else alert(data.error);
  };

  const recordKpi = async () => {
    if (!kpiRecordId || !kpiActual) return alert("Pilih KPI dan masukkan nilai aktual");
    const res  = await fetch("/api/reports", { method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ action:"record_kpi", targetId: parseInt(kpiRecordId), actualValue: parseFloat(kpiActual) }) });
    const data = await res.json();
    if (data.success) { setKpiActual(""); load(); }
    else alert(data.error);
  };

  const exportCsv = (data, filename) => {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const csv  = [keys.join(","), ...data.map(r => keys.map(k => `"${r[k] ?? ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const statCard = (label, value, icon, color="#f97316") => (
    <div className="glass-card" style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:14 }}>
      <div style={{ width:40, height:40, borderRadius:10, background:`${color}22`, display:"flex", alignItems:"center", justifyContent:"center" }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize:"1.4rem", fontWeight:800, color }}>{value ?? "—"}</div>
        <div style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>{label}</div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <h3 style={{ margin:0, fontSize:"1rem" }}>KPI & Laporan Eksekutif</h3>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            style={{ padding:"6px 10px", borderRadius:8, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(0,0,0,0.3)", color:"inherit", fontSize:"0.78rem" }} />
          <span style={{ color:"var(--text-muted)", fontSize:"0.75rem" }}>s/d</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            style={{ padding:"6px 10px", borderRadius:8, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(0,0,0,0.3)", color:"inherit", fontSize:"0.78rem" }} />
          <button className="btn btn-secondary" style={{ width:"auto", padding:"6px 14px", fontSize:"0.78rem" }} onClick={load}>↻ Refresh</button>
        </div>
      </div>

      <div className="filter-pills" style={{ marginBottom:16 }}>
        {[["overview","Ringkasan"],["org","Per Organisasi"],["dept","Per Departemen"],["course_stats","Per Kursus"],["kpi","Target KPI"],["trend","Tren Harian"]].map(([k,l]) => (
          <button type="button" key={k} className={`filter-pill ${reportType===k?"active":""}`} onClick={() => setReportType(k)} style={{ fontSize:"0.75rem" }}>{l}</button>
        ))}
      </div>

      {loading && <p style={{ color:"var(--text-muted)", fontSize:"0.8rem" }}>Memuat data...</p>}

      {reportType === "overview" && overview && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12 }}>
          {statCard("Pengguna Baru",   overview.newUsers,       <Users size={18} style={{ color:"#60a5fa" }} />, "#60a5fa")}
          {statCard("Pendaftaran",     overview.newEnrollments, <BookOpen size={18} style={{ color:"#34d399" }} />, "#34d399")}
          {statCard("Materi Selesai",  overview.completions,    <CheckSquare size={18} style={{ color:"#a78bfa" }} />, "#a78bfa")}
          {statCard("Sertifikat",      overview.certificates,   <Award size={18} style={{ color:"#fbbf24" }} />, "#fbbf24")}
          {statCard("Ujian Ditempuh",  overview.exams,          <FileText size={18} style={{ color:"#fb923c" }} />, "#fb923c")}
          {statCard("Rata-rata Skor",  `${overview.avgScore}%`, <TrendingUp size={18} style={{ color:"#f43f5e" }} />, "#f43f5e")}
        </div>
      )}

      {reportType === "org" && (
        <div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8 }}>
            <button className="btn btn-secondary" style={{ width:"auto", padding:"5px 12px", fontSize:"0.75rem" }}
              onClick={() => exportCsv(orgs, "laporan_organisasi.csv")}><Download size={12} style={{ marginRight:4 }} />Export CSV</button>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.78rem" }}>
              <thead><tr style={{ borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
                {["Organisasi","Pengguna","Pendaftaran","Sertifikat","Rata-rata Skor","Total XP"].map(h => (
                  <th key={h} style={{ padding:"8px 12px", textAlign:"left", color:"var(--text-muted)", fontWeight:500 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {orgs.map((r, i) => (
                  <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding:"8px 12px", fontWeight:600 }}>{r.organization}</td>
                    <td style={{ padding:"8px 12px" }}>{r.users}</td>
                    <td style={{ padding:"8px 12px" }}>{r.enrollments}</td>
                    <td style={{ padding:"8px 12px" }}>{r.certificates}</td>
                    <td style={{ padding:"8px 12px" }}>{r.avg_score}%</td>
                    <td style={{ padding:"8px 12px", color:"#fbbf24" }}>{Number(r.total_xp).toLocaleString()}</td>
                  </tr>
                ))}
                {orgs.length === 0 && <tr><td colSpan={6} style={{ padding:"20px 12px", textAlign:"center", color:"var(--text-muted)" }}>Tidak ada data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === "dept" && (
        <div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8 }}>
            <button className="btn btn-secondary" style={{ width:"auto", padding:"5px 12px", fontSize:"0.75rem" }}
              onClick={() => exportCsv(depts, "laporan_departemen.csv")}><Download size={12} style={{ marginRight:4 }} />Export CSV</button>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.78rem" }}>
            <thead><tr style={{ borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
              {["Departemen","Organisasi","Pengguna","Pendaftaran","Sertifikat","Rata-rata Skor"].map(h => (
                <th key={h} style={{ padding:"8px 12px", textAlign:"left", color:"var(--text-muted)", fontWeight:500 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {depts.map((r, i) => (
                <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding:"8px 12px", fontWeight:600 }}>{r.department}</td>
                  <td style={{ padding:"8px 12px", color:"var(--text-muted)" }}>{r.organization}</td>
                  <td style={{ padding:"8px 12px" }}>{r.users}</td>
                  <td style={{ padding:"8px 12px" }}>{r.enrollments}</td>
                  <td style={{ padding:"8px 12px" }}>{r.certificates}</td>
                  <td style={{ padding:"8px 12px" }}>{r.avg_score}%</td>
                </tr>
              ))}
              {depts.length === 0 && <tr><td colSpan={6} style={{ padding:"20px 12px", textAlign:"center", color:"var(--text-muted)" }}>Tidak ada data</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {reportType === "course_stats" && (
        <div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8 }}>
            <button className="btn btn-secondary" style={{ width:"auto", padding:"5px 12px", fontSize:"0.75rem" }}
              onClick={() => exportCsv(courseStats, "laporan_kursus.csv")}><Download size={12} style={{ marginRight:4 }} />Export CSV</button>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.78rem" }}>
            <thead><tr style={{ borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
              {["Kursus","Kategori","Terdaftar","Selesai","Rata-rata Skor","Rating"].map(h => (
                <th key={h} style={{ padding:"8px 12px", textAlign:"left", color:"var(--text-muted)", fontWeight:500 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {courseStats.map((r, i) => (
                <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding:"8px 12px", fontWeight:600 }}>{r.title}</td>
                  <td style={{ padding:"8px 12px", color:"var(--text-muted)" }}>{r.category}</td>
                  <td style={{ padding:"8px 12px" }}>{r.enrolled}</td>
                  <td style={{ padding:"8px 12px" }}>{r.completed}</td>
                  <td style={{ padding:"8px 12px" }}>{r.avg_score}%</td>
                  <td style={{ padding:"8px 12px", display:"flex", alignItems:"center", gap:3 }}>
                    <Star size={11} style={{ color:"#fbbf24", fill:"#fbbf24" }} />{r.avg_rating} ({r.review_count})
                  </td>
                </tr>
              ))}
              {courseStats.length === 0 && <tr><td colSpan={6} style={{ padding:"20px 12px", textAlign:"center", color:"var(--text-muted)" }}>Tidak ada data</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {reportType === "trend" && (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.78rem" }}>
            <thead><tr style={{ borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
              {["Tanggal","Pengguna Aktif","Materi Selesai"].map(h => (
                <th key={h} style={{ padding:"8px 12px", textAlign:"left", color:"var(--text-muted)", fontWeight:500 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {trend.map((r, i) => (
                <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding:"8px 12px" }}>{new Date(r.date).toLocaleDateString("id-ID", { day:"numeric", month:"short" })}</td>
                  <td style={{ padding:"8px 12px" }}>{r.active_users}</td>
                  <td style={{ padding:"8px 12px" }}>{r.completions}</td>
                </tr>
              ))}
              {trend.length === 0 && <tr><td colSpan={3} style={{ padding:"20px 12px", textAlign:"center", color:"var(--text-muted)" }}>Tidak ada data</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {reportType === "kpi" && (
        <div>
          <div className="glass-card" style={{ padding:"16px 20px", marginBottom:16 }}>
            <div style={{ fontSize:"0.85rem", fontWeight:600, marginBottom:12 }}>Set Target KPI</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:8, marginBottom:10 }}>
              <input placeholder="Organisasi *" value={kpiForm.organization} onChange={e => setKpiForm(p => ({...p, organization:e.target.value}))}
                style={{ padding:"7px 10px", borderRadius:8, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(0,0,0,0.3)", color:"inherit", fontSize:"0.78rem" }} />
              <input placeholder="Departemen" value={kpiForm.department} onChange={e => setKpiForm(p => ({...p, department:e.target.value}))}
                style={{ padding:"7px 10px", borderRadius:8, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(0,0,0,0.3)", color:"inherit", fontSize:"0.78rem" }} />
              <select value={kpiForm.metricKey} onChange={e => setKpiForm(p => ({...p, metricKey:e.target.value, metricLabel:e.target.options[e.target.selectedIndex].text}))}
                style={{ padding:"7px 10px", borderRadius:8, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(0,0,0,0.3)", color:"inherit", fontSize:"0.78rem" }}>
                <option value="completion_rate">Tingkat Penyelesaian</option>
                <option value="avg_score">Rata-rata Skor Ujian</option>
                <option value="cert_count">Jumlah Sertifikat</option>
                <option value="enrollment_count">Jumlah Pendaftaran</option>
                <option value="active_users">Pengguna Aktif</option>
              </select>
              <input type="number" placeholder="Target *" value={kpiForm.targetValue} onChange={e => setKpiForm(p => ({...p, targetValue:e.target.value}))}
                style={{ padding:"7px 10px", borderRadius:8, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(0,0,0,0.3)", color:"inherit", fontSize:"0.78rem" }} />
              <input type="date" value={kpiForm.periodStart} onChange={e => setKpiForm(p => ({...p, periodStart:e.target.value}))}
                style={{ padding:"7px 10px", borderRadius:8, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(0,0,0,0.3)", color:"inherit", fontSize:"0.78rem" }} />
              <input type="date" value={kpiForm.periodEnd} onChange={e => setKpiForm(p => ({...p, periodEnd:e.target.value}))}
                style={{ padding:"7px 10px", borderRadius:8, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(0,0,0,0.3)", color:"inherit", fontSize:"0.78rem" }} />
            </div>
            <button className="btn btn-primary" style={{ width:"auto", padding:"7px 18px", fontSize:"0.78rem" }} onClick={saveKpi}>
              <Target size={13} style={{ marginRight:4 }} />Simpan Target
            </button>
          </div>

          {kpis.length === 0 ? (
            <p style={{ color:"var(--text-muted)", fontSize:"0.8rem" }}>Belum ada target KPI</p>
          ) : kpis.map((k, i) => {
            const pct   = k.target_value > 0 ? Math.min(100, Math.round((k.latest_actual / k.target_value) * 100)) : 0;
            const color = pct >= 100 ? "#34d399" : pct >= 70 ? "#fbbf24" : "#f87171";
            return (
              <div key={i} className="glass-card" style={{ padding:"14px 18px", marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:"0.85rem" }}>{k.metric_label}</div>
                    <div style={{ fontSize:"0.7rem", color:"var(--text-muted)" }}>{k.organization}{k.department ? ` / ${k.department}` : ""}</div>
                    <div style={{ fontSize:"0.68rem", color:"var(--text-muted)", marginTop:2 }}>
                      {new Date(k.period_start).toLocaleDateString("id-ID")} – {new Date(k.period_end).toLocaleDateString("id-ID")}
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:"1.2rem", fontWeight:800, color }}>{k.latest_actual}{k.unit}</div>
                    <div style={{ fontSize:"0.68rem", color:"var(--text-muted)" }}>Target: {k.target_value}{k.unit}</div>
                  </div>
                </div>
                <div style={{ height:6, borderRadius:3, background:"rgba(255,255,255,0.1)", overflow:"hidden", marginBottom:8 }}>
                  <div style={{ height:"100%", borderRadius:3, background:color, width:`${pct}%`, transition:"width 0.5s" }} />
                </div>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <select value={kpiRecordId === String(k.id) ? kpiRecordId : ""}
                    onChange={() => setKpiRecordId(String(k.id))}
                    style={{ padding:"4px 8px", borderRadius:6, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(0,0,0,0.3)", color:"inherit", fontSize:"0.72rem" }}>
                    <option value="">Update nilai aktual</option>
                    <option value={k.id}>Pilih ini</option>
                  </select>
                  {kpiRecordId === String(k.id) && (
                    <>
                      <input type="number" placeholder="Nilai aktual" value={kpiActual} onChange={e => setKpiActual(e.target.value)}
                        style={{ width:100, padding:"4px 8px", borderRadius:6, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(0,0,0,0.3)", color:"inherit", fontSize:"0.72rem" }} />
                      <button className="btn btn-primary" style={{ width:"auto", padding:"4px 10px", fontSize:"0.72rem" }} onClick={recordKpi}>Simpan</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// PaymentHistoryPanel imported from ./PaymentHistoryPanel.js
// ── placeholder start (DO NOT REMOVE — marks injection point) ─────────────────
function _PaymentHistoryPanelInline() {
  const { transactions } = useApp();
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [mockMode, setMockMode] = useState(true);
  const [filter, setFilter]     = useState("all");

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/payment");
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
        setMockMode(!data.clientKey || data.clientKey.includes("xxxx"));
      }
    } catch { /* fallback ke context */ }
    finally { setLoading(false); }
  };

  const contextTx = (transactions || []).map(tx => ({
    id: tx.invoice, invoice_number: tx.invoice, course_title: tx.program,
    amount: tx.amount, payment_method: tx.type, status: tx.status,
    user_email: tx.user, created_at: null,
  }));
  const allOrders = orders.length > 0 ? orders : contextTx;
  const filtered  = filter === "all" ? allOrders : allOrders.filter(o => o.status === filter);

  const STATUS = {
    paid:    { icon: CheckCircle, color: "#34d399", label: "Berhasil" },
    Berhasil:{ icon: CheckCircle, color: "#34d399", label: "Berhasil" },
    pending: { icon: Clock,       color: "#fbbf24", label: "Pending"  },
    failed:  { icon: XCircle,     color: "#f87171", label: "Gagal"    },
    Gagal:   { icon: XCircle,     color: "#f87171", label: "Gagal"    },
  };

  const total   = allOrders.length;
  const paid    = allOrders.filter(o => o.status === "paid" || o.status === "Berhasil").length;
  const pending = allOrders.filter(o => o.status === "pending").length;
  const revenue = allOrders.filter(o => o.status === "paid" || o.status === "Berhasil")
                            .reduce((s, o) => s + (Number(o.amount) || 0), 0);

  const exportCsv = () => {
    const rows = [["Invoice","User","Kursus","Jumlah","Metode","Status","Tanggal"]];
    allOrders.forEach(o => rows.push([
      o.invoice_number || "", o.user_email || "", o.course_title || "",
      o.amount || "", o.payment_method || "", o.status || "",
      o.created_at ? new Date(o.created_at).toLocaleDateString("id-ID") : "",
    ]));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const a   = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `transaksi-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  return (
    <div>
      {/* Mode badge + actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px",
            borderRadius: 20, fontSize: "0.75rem", fontWeight: 600,
            background: mockMode ? "rgba(251,191,36,0.15)" : "rgba(52,211,153,0.15)",
            color: mockMode ? "#fbbf24" : "#34d399",
            border: `1px solid ${mockMode ? "rgba(251,191,36,0.3)" : "rgba(52,211,153,0.3)"}`,
          }}>
            {mockMode ? <><AlertCircle size={13} /> Mode Simulasi</> : <><CheckCircle size={13} /> Midtrans Aktif</>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={loadOrders} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem", width: "auto" }}>
            <RefreshCw size={13} style={{ marginRight: 5 }} />Refresh
          </button>
          <button onClick={exportCsv} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem", width: "auto" }}>
            <Download size={13} style={{ marginRight: 5 }} />Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Order", value: total, color: "var(--primary)" },
          { label: "Berhasil",    value: paid,    color: "#34d399" },
          { label: "Pending",     value: pending, color: "#fbbf24" },
          { label: "Total Pendapatan", value: `Rp ${revenue.toLocaleString("id-ID")}`, color: "var(--primary)" },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["all","paid","Berhasil","pending","failed"].map(f => (
          <button type="button" key={f}
            className={`filter-pill ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
            style={{ fontSize: "0.75rem" }}>
            {f === "all" ? "Semua" : f === "paid" || f === "Berhasil" ? "Berhasil" : f === "pending" ? "Pending" : "Gagal"}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading && <div style={{ color: "var(--text-muted)", padding: 20 }}>Memuat data...</div>}
      {!loading && filtered.length === 0 && (
        <div className="glass-card" style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
          <CreditCard size={36} style={{ marginBottom: 10 }} />
          <p>Belum ada transaksi.</p>
        </div>
      )}
      {!loading && filtered.length > 0 && (
        <div className="glass-card" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                {["Invoice","User","Kursus","Jumlah","Metode","Status","Tanggal"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-secondary)", fontWeight: 600, fontSize: "0.75rem" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, i) => {
                const cfg  = STATUS[o.status] || STATUS.pending;
                const Icon = cfg.icon;
                return (
                  <tr key={o.id || i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: "0.75rem" }}>{o.invoice_number || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>{o.user_email || "—"}</td>
                    <td style={{ padding: "10px 14px", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.course_title || "—"}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{o.amount ? `Rp ${Number(o.amount).toLocaleString("id-ID")}` : "Gratis"}</td>
                    <td style={{ padding: "10px 14px" }}>{o.payment_method || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.72rem", fontWeight: 600, color: cfg.color }}>
                        <Icon size={12} />{cfg.label}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      {o.created_at ? new Date(o.created_at).toLocaleDateString("id-ID") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const ADMIN_CATEGORIES = [
  {
    id: "academic",
    label: "Akademik & Pelatihan",
    icon: BookOpen,
    badge: "5 Menu",
    description: "Kurikulum, Instruktur, Live Class, Master Data & Sertifikat",
    tabs: [
      { key: "courses",      label: "Manajemen Kursus",    icon: BookOpen },
      { key: "instructors",  label: "Data Instruktur",     icon: Award },
      { key: "livesessions", label: "Live Class",          icon: Video },
      { key: "metadata",     label: "Data Master",         icon: FileText },
      { key: "template",     label: "Template Sertifikat", icon: Award },
    ],
  },
  {
    id: "users_org",
    label: "Pengguna & Organisasi",
    icon: Users,
    badge: "3 Menu",
    description: "Data Pengguna, Organisasi Multi-Tenant & Gamifikasi XP",
    tabs: [
      { key: "users",        label: "Manajemen Pengguna",  icon: Users },
      { key: "organizations",label: "Organisasi B2B/B2G",  icon: Building2 },
      { key: "gamification", label: "Leaderboard XP",      icon: Zap },
    ],
  },
  {
    id: "finance_reports",
    label: "Keuangan & Laporan",
    icon: CreditCard,
    badge: "3 Menu",
    description: "Riwayat Transaksi, Analytics & KPI Laporan Eksekutif",
    tabs: [
      { key: "payments",     label: "Riwayat Transaksi",   icon: CreditCard },
      { key: "analytics",    label: "Analytics Platform",  icon: BarChart2 },
      { key: "kpi",          label: "KPI & Laporan",       icon: Target },
    ],
  },
  {
    id: "system_security",
    label: "Sistem & Pengaturan",
    icon: Settings2,
    badge: "3 Menu",
    description: "Konfigurasi Gateway, Audit Log Sesi & Tiket Helpdesk",
    tabs: [
      { key: "platform",     label: "Pengaturan Platform", icon: Settings2 },
      { key: "audit",        label: "Audit Log & Sesi",    icon: ShieldCheck },
      { key: "tickets",      label: "Tiket Dukungan",      icon: Mail },
    ],
  },
];

export default function AdminPage() {
  const { adminTab, setAdminTab } = useApp();

  // Cari kategori aktif berdasarkan adminTab saat ini
  const findCategoryForTab = (tabKey) => {
    return ADMIN_CATEGORIES.find((cat) => cat.tabs.some((t) => t.key === tabKey))?.id || "academic";
  };

  const [activeCategory, setActiveCategory] = useState(() => findCategoryForTab(adminTab));

  // Sinkronisasi kategori jika adminTab berubah dari luar
  useEffect(() => {
    const parentCat = findCategoryForTab(adminTab);
    if (parentCat !== activeCategory) {
      setActiveCategory(parentCat);
    }
  }, [adminTab]);

  const currentCategoryObj = ADMIN_CATEGORIES.find((c) => c.id === activeCategory) || ADMIN_CATEGORIES[0];

  const handleSelectCategory = (catId) => {
    setActiveCategory(catId);
    const catObj = ADMIN_CATEGORIES.find((c) => c.id === catId);
    if (catObj && catObj.tabs.length > 0) {
      // Jika tab saat ini bukan bagian dari kategori baru, pindah ke tab pertama kategori tersebut
      const isCurrentTabInCat = catObj.tabs.some((t) => t.key === adminTab);
      if (!isCurrentTabInCat) {
        setAdminTab(catObj.tabs[0].key);
      }
    }
  };

  return (
    <main className="page-view active">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: "0 0 6px 0", color: "var(--text-primary)", fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Panel Administrasi Platform
          </h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            Pusat kendali terpadu manajemen akademik, pengguna, keuangan, dan tata kelola sistem.
          </p>
        </div>
      </div>

      {/* ── 1. Kategori Menu Utama (4 Kelompok Fungsional) ────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12,
        marginBottom: 20,
      }}>
        {ADMIN_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          const Icon = cat.icon;
          return (
            <button
              type="button"
              key={cat.id}
              onClick={() => handleSelectCategory(cat.id)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "14px 16px",
                borderRadius: 12,
                textAlign: "left",
                cursor: "pointer",
                transition: "all 0.2s ease",
                background: isActive
                  ? "var(--accent-badge-bg)"
                  : "var(--bg-card)",
                border: isActive
                  ? "1.5px solid var(--primary)"
                  : "1px solid var(--border-color)",
                boxShadow: isActive ? "var(--shadow-glow)" : "none",
              }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: isActive ? "var(--primary)" : "rgba(128,128,128,0.1)",
                color: isActive ? "#ffffff" : "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <Icon size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: isActive ? "var(--text-accent)" : "var(--text-primary)" }}>
                    {cat.label}
                  </span>
                  <span style={{
                    fontSize: "0.65rem",
                    padding: "2px 6px",
                    borderRadius: 10,
                    background: isActive ? "var(--accent-badge-bg)" : "rgba(128,128,128,0.1)",
                    border: isActive ? "1px solid var(--accent-badge-border)" : "1px solid transparent",
                    color: isActive ? "var(--text-accent)" : "var(--text-muted)",
                    fontWeight: 600,
                  }}>
                    {cat.badge}
                  </span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {cat.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── 2. Sub-Menu Navigasi (Tersusun Rapi Sesuai Kategori Aktif) ────────── */}
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: 12,
        padding: "10px 14px",
        marginBottom: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, marginRight: 4 }}>
            Sub-Menu:
          </span>
          {currentCategoryObj.tabs.map((t) => {
            const isTabActive = adminTab === t.key;
            const TabIcon = t.icon;
            return (
              <button
                type="button"
                key={t.key}
                onClick={() => setAdminTab(t.key)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: "0.78rem",
                  fontWeight: isTabActive ? 700 : 500,
                  cursor: "pointer",
                  border: isTabActive ? "1px solid var(--primary)" : "1px solid var(--border-color)",
                  background: isTabActive ? "var(--primary)" : "var(--bg-secondary)",
                  color: isTabActive ? "#ffffff" : "var(--text-primary)",
                  transition: "all 0.15s ease",
                }}>
                <TabIcon size={13} /> {t.label}
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
          Kategori Aktif: <strong style={{ color: "var(--primary)" }}>{currentCategoryObj.label}</strong>
        </div>
      </div>

      {/* ── 3. Konten Panel Terpilih ─────────────────────────────────────────── */}
      <div className="admin-content-card">
        {adminTab === "users"         && <UserManager />}
        {adminTab === "courses"       && <CourseManager />}
        {adminTab === "instructors"   && <InstructorManager />}
        {adminTab === "metadata"      && <MetaDataManager />}
        {adminTab === "template"      && <CertTemplateManager />}
        {adminTab === "analytics"     && <AnalyticsDashboard />}
        {adminTab === "audit"         && <AuditLogViewer />}
        {adminTab === "organizations" && <OrganizationManager />}
        {adminTab === "livesessions"  && <LiveSessionManager />}
        {adminTab === "gamification"  && <GamificationPanel />}
        {adminTab === "kpi"           && <KpiReportPanel />}
        {adminTab === "payments"      && <PaymentHistoryPanel />}
        {adminTab === "tickets"       && <SupportTicketsPanel />}
        {adminTab === "platform"      && <PlatformSettingsPanel />}
      </div>
    </main>
  );
}
