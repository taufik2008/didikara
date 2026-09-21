"use client";
/**
 * OrganizationPanel.js — Panel Manajemen Organisasi & Departemen (B2B/B2G).
 *
 * Mengelola seluruh entitas organisasi/instansi mitra, departemen/divisi kerja,
 * dan penugasan (assign) anggota/pegawai ke departemen tertentu.
 */
import { useState, useEffect, useCallback } from "react";
import {
  Building2, Plus, Edit2, Trash2, Search, Users, Shield, RefreshCw,
  CheckCircle, AlertCircle, X, ChevronDown, ChevronRight, Layers,
  UserPlus, Briefcase, FileText
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function OrganizationPanel() {
  const { currentUser, users = [], courses = [] } = useApp();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [panelTab, setPanelTab] = useState("organizations"); // "organizations" | "bulk_enroll"

  // Modal State: Create / Edit Org
  const [orgModal, setOrgModal] = useState({ open: false, mode: "add", data: null });
  const [orgForm, setOrgForm] = useState({ name: "", code: "", description: "" });
  const [submittingOrg, setSubmittingOrg] = useState(false);

  // Modal State: Manage Depts for an Org
  const [deptModal, setDeptModal] = useState({ open: false, org: null });
  const [deptForm, setDeptForm] = useState({ id: null, name: "", code: "", mode: "add" });
  const [submittingDept, setSubmittingDept] = useState(false);

  // Modal State: Assign User to Dept
  const [assignModal, setAssignModal] = useState({ open: false, org: null, dept: null });
  const [assignForm, setAssignForm] = useState({ userEmail: "", departmentId: "" });
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Bulk Enrollment State
  const [bulkForm, setBulkForm] = useState({ courseId: "", departmentId: "", emails: "" });
  const [submittingBulk, setSubmittingBulk] = useState(false);

  // Expandable org cards
  const [expandedOrgId, setExpandedOrgId] = useState(null);

  const handleBulkEnroll = async (e) => {
    e.preventDefault();
    if (!bulkForm.courseId) {
      showFeedback("danger", "Pilih kursus yang akan didaftarkan.");
      return;
    }
    if (!bulkForm.departmentId && !bulkForm.emails.trim()) {
      showFeedback("danger", "Pilih departemen tujuan atau masukkan daftar email peserta.");
      return;
    }
    setSubmittingBulk(true);
    try {
      const body = { courseId: bulkForm.courseId };
      if (bulkForm.departmentId) body.departmentId = Number(bulkForm.departmentId);
      else if (bulkForm.emails) {
        body.userEmails = bulkForm.emails.split("\n").map(e => e.trim()).filter(Boolean);
      }
      const res = await fetch("/api/enrollments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (d.success) {
        showFeedback("success", `✓ ${d.enrolled || 0} peserta berhasil didaftarkan ke pelatihan.`);
        setBulkForm({ courseId: "", departmentId: "", emails: "" });
      } else {
        showFeedback("danger", d.error || "Gagal melakukan bulk enrollment.");
      }
    } catch {
      showFeedback("danger", "Gagal menghubungi server.");
    }
    setSubmittingBulk(false);
  };

  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback({ type: "", text: "" }), 4000);
  };

  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/organizations");
      const data = await res.json();
      if (data.success) {
        setOrganizations(data.organizations || []);
      } else {
        showFeedback("danger", data.error || "Gagal memuat data organisasi.");
      }
    } catch {
      showFeedback("danger", "Gagal menghubungi server.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  // ── Handlers: CRUD Organisasi ──────────────────────────────────────────────
  const handleOpenOrgModal = (mode = "add", org = null) => {
    setOrgModal({ open: true, mode, data: org });
    if (mode === "edit" && org) {
      setOrgForm({
        name: org.name || "",
        code: org.code || "",
        description: org.description || "",
      });
    } else {
      setOrgForm({ name: "", code: "", description: "" });
    }
  };

  const handleSaveOrg = async (e) => {
    e.preventDefault();
    if (!orgForm.name.trim()) {
      showFeedback("danger", "Nama organisasi wajib diisi.");
      return;
    }
    setSubmittingOrg(true);
    try {
      const url = orgModal.mode === "edit"
        ? `/api/organizations?id=${orgModal.data.id}`
        : "/api/organizations";
      const method = orgModal.mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orgForm),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback("success", orgModal.mode === "edit" ? "Organisasi berhasil diperbarui." : "Organisasi baru berhasil ditambahkan.");
        setOrgModal({ open: false, mode: "add", data: null });
        loadOrganizations();
      } else {
        showFeedback("danger", data.error || "Gagal menyimpan organisasi.");
      }
    } catch (err) {
      showFeedback("danger", "Terjadi kesalahan jaringan: " + err.message);
    }
    setSubmittingOrg(false);
  };

  const handleDeleteOrg = async (org) => {
    if (!window.confirm(`Yakin ingin menghapus organisasi "${org.name}"? Seluruh departemen terkait akan dinonaktifkan.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/organizations?id=${org.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showFeedback("success", `Organisasi "${org.name}" berhasil dihapus.`);
        loadOrganizations();
      } else {
        showFeedback("danger", data.error || "Gagal menghapus organisasi.");
      }
    } catch {
      showFeedback("danger", "Gagal menghubungi server.");
    }
  };

  // ── Handlers: CRUD Departemen / Divisi ──────────────────────────────────────
  const handleOpenDeptModal = (org) => {
    setDeptModal({ open: true, org });
    setDeptForm({ id: null, name: "", code: "", mode: "add" });
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    if (!deptForm.name.trim()) {
      showFeedback("danger", "Nama departemen wajib diisi.");
      return;
    }
    setSubmittingDept(true);
    try {
      const isEdit = deptForm.mode === "edit";
      const url = isEdit
        ? `/api/organizations?action=dept&id=${deptForm.id}`
        : `/api/organizations?action=dept`;
      const method = isEdit ? "PUT" : "POST";

      const payload = isEdit
        ? { name: deptForm.name, code: deptForm.code }
        : { organizationId: deptModal.org.id, name: deptForm.name, code: deptForm.code };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback("success", isEdit ? "Departemen berhasil diperbarui." : "Departemen baru berhasil ditambahkan.");
        setDeptForm({ id: null, name: "", code: "", mode: "add" });
        await loadOrganizations();
        // Update local modal org data
        setDeptModal(prev => ({
          ...prev,
          org: organizations.find(o => o.id === prev.org?.id) || prev.org,
        }));
      } else {
        showFeedback("danger", data.error || "Gagal menyimpan departemen.");
      }
    } catch {
      showFeedback("danger", "Gagal menghubungi server.");
    }
    setSubmittingDept(false);
  };

  const handleDeleteDept = async (deptId, deptName) => {
    if (!window.confirm(`Hapus departemen "${deptName}"?`)) return;
    try {
      const res = await fetch(`/api/organizations?action=dept&id=${deptId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showFeedback("success", `Departemen "${deptName}" dihapus.`);
        await loadOrganizations();
      } else {
        showFeedback("danger", data.error || "Gagal menghapus departemen.");
      }
    } catch {
      showFeedback("danger", "Gagal menghubungi server.");
    }
  };

  // ── Handlers: Assign User to Department ────────────────────────────────────
  const handleOpenAssignModal = (org, dept = null) => {
    setAssignModal({ open: true, org, dept });
    setAssignForm({
      userEmail: "",
      departmentId: dept ? String(dept.id) : (org.departments?.[0]?.id ? String(org.departments[0].id) : ""),
    });
  };

  const handleSaveAssign = async (e) => {
    e.preventDefault();
    if (!assignForm.userEmail) {
      showFeedback("danger", "Pilih atau masukkan email pengguna.");
      return;
    }
    setSubmittingAssign(true);
    try {
      const res = await fetch("/api/organizations?action=assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: assignForm.userEmail,
          departmentId: assignForm.departmentId ? Number(assignForm.departmentId) : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback("success", "Penugasan departemen pengguna berhasil disimpan.");
        setAssignModal({ open: false, org: null, dept: null });
        loadOrganizations();
      } else {
        showFeedback("danger", data.error || "Gagal menugaskan pengguna.");
      }
    } catch {
      showFeedback("danger", "Gagal menghubungi server.");
    }
    setSubmittingAssign(false);
  };

  // ── Filter Data ────────────────────────────────────────────────────────────
  const filteredOrgs = organizations.filter(org => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (org.name && org.name.toLowerCase().includes(q)) ||
      (org.code && org.code.toLowerCase().includes(q)) ||
      (org.description && org.description.toLowerCase().includes(q))
    );
  });

  // Hitung Total Stats
  const totalOrgs = organizations.length;
  const totalDepts = organizations.reduce((acc, o) => acc + (o.departments?.length || 0), 0);
  const totalUsers = organizations.reduce((acc, o) => {
    return acc + (o.departments || []).reduce((dAcc, d) => dAcc + Number(d.user_count || 0), 0);
  }, 0);

  return (
    <div>
      {/* ── Feedback Banner ──────────────────────────────────────────────── */}
      {feedback.text && (
        <div style={{
          padding: "10px 16px",
          borderRadius: 8,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: "0.85rem",
          fontWeight: 600,
          background: feedback.type === "success" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
          color: feedback.type === "success" ? "#4ade80" : "#f87171",
          border: `1px solid ${feedback.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
        }}>
          {feedback.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* ── Sub-Tab Switcher ────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>
        <button
          type="button"
          onClick={() => setPanelTab("organizations")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: "0.82rem",
            fontWeight: panelTab === "organizations" ? 700 : 500,
            cursor: "pointer",
            border: panelTab === "organizations" ? "1px solid var(--primary)" : "1px solid var(--border-color)",
            background: panelTab === "organizations" ? "var(--primary)" : "var(--bg-secondary)",
            color: panelTab === "organizations" ? "#ffffff" : "var(--text-primary)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6
          }}>
          <Building2 size={14} /> Organisasi &amp; Departemen ({totalOrgs})
        </button>
        <button
          type="button"
          onClick={() => setPanelTab("bulk_enroll")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: "0.82rem",
            fontWeight: panelTab === "bulk_enroll" ? 700 : 500,
            cursor: "pointer",
            border: panelTab === "bulk_enroll" ? "1px solid var(--primary)" : "1px solid var(--border-color)",
            background: panelTab === "bulk_enroll" ? "var(--primary)" : "var(--bg-secondary)",
            color: panelTab === "bulk_enroll" ? "#ffffff" : "var(--text-primary)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6
          }}>
          <Users size={14} /> Pendaftaran Massal (Bulk Enrollment)
        </button>
      </div>

      {panelTab === "bulk_enroll" ? (
        <div className="glass-card" style={{ padding: 22, maxWidth: 700 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Users size={18} style={{ color: "var(--primary)" }} />
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Bulk Enrollment Pelatihan B2B / Instansi</h3>
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 18, lineHeight: 1.5 }}>
            Daftarkan seluruh pegawai/anggota departemen secara serentak ke program pelatihan kompetensi tanpa harus mendaftarkan satu per satu.
          </p>

          <form onSubmit={handleBulkEnroll}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>Pilih Program Pelatihan *</label>
              <select
                className="input-field"
                value={bulkForm.courseId}
                onChange={e => setBulkForm(prev => ({ ...prev, courseId: e.target.value }))}
                required
                style={{ width: "100%", padding: 10, fontSize: "0.82rem" }}
              >
                <option value="">-- Pilih Kursus --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title} ({c.category} · {c.level})</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>Daftarkan Berdasarkan Departemen</label>
              <select
                className="input-field"
                value={bulkForm.departmentId}
                onChange={e => setBulkForm(prev => ({ ...prev, departmentId: e.target.value, emails: "" }))}
                style={{ width: "100%", padding: 10, fontSize: "0.82rem" }}
              >
                <option value="">-- Pilih Departemen / Divisi Terdaftar --</option>
                {organizations.flatMap(o => (o.departments || []).map(d => (
                  <option key={d.id} value={d.id}>{o.name} — {d.name} ({d.user_count || 0} Pegawai)</option>
                )))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 18 }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>Atau Masukkan Daftar Email Pegawai (Satu per Baris)</label>
              <textarea
                className="input-field"
                rows={4}
                placeholder="pegawai1@instansi.go.id&#10;pegawai2@instansi.go.id&#10;pegawai3@instansi.go.id"
                value={bulkForm.emails}
                onChange={e => setBulkForm(prev => ({ ...prev, emails: e.target.value, departmentId: "" }))}
                style={{ width: "100%", fontSize: "0.8rem", padding: 10 }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submittingBulk}
                style={{ width: "auto", padding: "10px 24px", fontSize: "0.85rem", fontWeight: 700 }}>
                {submittingBulk ? "Memproses..." : "Daftarkan Semua Peserta Sekarang"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* ── Quick Stats Metric Cards ─────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
            <div className="glass-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(59,130,246,0.15)", color: "#60a5fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Building2 size={22} />
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total Organisasi / Mitra</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)" }}>{totalOrgs}</div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(249,115,22,0.15)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Layers size={22} />
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total Departemen &amp; Divisi</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)" }}>{totalDepts}</div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(16,185,129,0.15)", color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={22} />
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Pegawai / Anggota Terdaftar</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)" }}>{totalUsers}</div>
              </div>
            </div>
          </div>

      {/* ── Toolbar: Search & Action ─────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div style={{ position: "relative", minWidth: 260, flex: 1, maxWidth: 420 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            className="input-field"
            placeholder="Cari organisasi, kode, atau deskripsi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", paddingLeft: 36, fontSize: "0.82rem" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadOrganizations}
            disabled={loading}
            title="Muat Ulang"
            style={{ width: "auto", padding: "8px 12px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem" }}>
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Segarkan</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenOrgModal("add")}
            style={{ width: "auto", padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem" }}>
            <Plus size={16} />
            <span>+ Tambah Organisasi</span>
          </button>
        </div>
      </div>

      {/* ── Organization List Table / Cards ──────────────────────────────── */}
      {loading && organizations.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: "0.88rem" }}>
          Memuat data organisasi...
        </div>
      ) : filteredOrgs.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
          <Building2 size={42} style={{ opacity: 0.4, margin: "0 auto 12px auto" }} />
          <h4 style={{ color: "var(--text-primary)", marginBottom: 4 }}>Belum Ada Data Organisasi</h4>
          <p style={{ fontSize: "0.82rem", maxWidth: 400, margin: "0 auto 16px auto" }}>
            Tambahkan instansi kementerian, lembaga pemerintah, atau korporat B2B mitra untuk mengelompokkan peserta pelatihan.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenOrgModal("add")}
            style={{ width: "auto", margin: "0 auto", padding: "8px 18px", fontSize: "0.82rem" }}>
            <Plus size={14} style={{ marginRight: 6 }} /> Tambah Organisasi Pertama
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredOrgs.map(org => {
            const isExpanded = expandedOrgId === org.id;
            const depts = org.departments || [];
            const orgUserCount = depts.reduce((acc, d) => acc + Number(d.user_count || 0), 0);

            return (
              <div key={org.id} className="glass-card" style={{ padding: 18, transition: "all 0.2s ease" }}>
                {/* Header Card */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 10,
                      background: "rgba(59,130,246,0.12)", color: "#60a5fa",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                    }}>
                      <Building2 size={20} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          {org.name}
                        </h3>
                        {org.code && (
                          <span style={{
                            padding: "2px 8px", borderRadius: 4, fontSize: "0.7rem", fontWeight: 700,
                            background: "var(--accent-badge-bg)", color: "var(--text-accent)", border: "1px solid var(--accent-badge-border)"
                          }}>
                            {org.code}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                        {org.description || "Tidak ada deskripsi organisasi."}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        <span>🏢 <strong>{depts.length}</strong> Departemen / Divisi</span>
                        <span>👥 <strong>{orgUserCount}</strong> Pegawai Terdaftar</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleOpenDeptModal(org)}
                      style={{ width: "auto", padding: "6px 12px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <Layers size={13} style={{ color: "var(--primary)" }} />
                      <span>Kelola Divisi ({depts.length})</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleOpenAssignModal(org)}
                      style={{ width: "auto", padding: "6px 12px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <UserPlus size={13} style={{ color: "#34d399" }} />
                      <span>Assign Pegawai</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleOpenOrgModal("edit", org)}
                      style={{ width: "auto", padding: 6 }}
                      title="Edit Organisasi">
                      <Edit2 size={13} style={{ color: "var(--primary)" }} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleDeleteOrg(org)}
                      style={{ width: "auto", padding: 6, borderColor: "rgba(239, 68, 68, 0.25)" }}
                      title="Hapus Organisasi">
                      <Trash2 size={13} style={{ color: "var(--danger)" }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedOrgId(isExpanded ? null : org.id)}
                      style={{
                        background: "none", border: "none", color: "var(--text-muted)",
                        cursor: "pointer", padding: 4, display: "flex", alignItems: "center"
                      }}
                      title={isExpanded ? "Tutup Rincian" : "Lihat Departemen"}>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details: Departments List */}
                {isExpanded && (
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                        Daftar Departemen / Divisi Kerja:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenDeptModal(org)}
                        style={{
                          background: "none", border: "none", color: "var(--primary)",
                          fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4
                        }}>
                        + Tambah Divisi
                      </button>
                    </div>

                    {depts.length === 0 ? (
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic", padding: "8px 0" }}>
                        Belum ada divisi atau departemen di organisasi ini. Klik "Kelola Divisi" untuk menambahkan.
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                        {depts.map(d => (
                          <div key={d.id} style={{
                            padding: "10px 12px", borderRadius: 8,
                            background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
                            display: "flex", justifyContent: "space-between", alignItems: "center"
                          }}>
                            <div>
                              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>{d.name}</div>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                {d.code ? `Kode: ${d.code} · ` : ""}👥 {d.user_count || 0} Pegawai
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button
                                type="button"
                                onClick={() => handleOpenAssignModal(org, d)}
                                style={{ background: "none", border: "none", color: "#34d399", cursor: "pointer", padding: 2 }}
                                title="Tambah Pegawai ke Divisi Ini">
                                <UserPlus size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeptModal({ open: true, org });
                                  setDeptForm({ id: d.id, name: d.name, code: d.code || "", mode: "edit" });
                                }}
                                style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: 2 }}
                                title="Edit Divisi">
                                <Edit2 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDept(d.id, d.name)}
                                style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: 2 }}
                                title="Hapus Divisi">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  )}

      {/* ── MODAL: Create / Edit Organization ────────────────────────────── */}
      {orgModal.open && (
        <div className="modal-overlay active" onClick={() => setOrgModal({ open: false, mode: "add", data: null })}>
          <div className="modal-content glass-panel" style={{ width: 520, maxWidth: "95%" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 8 }}>
                <Building2 size={18} style={{ color: "var(--primary)" }} />
                <span>{orgModal.mode === "edit" ? "Edit Data Organisasi" : "Tambah Organisasi Baru"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setOrgModal({ open: false, mode: "add", data: null })}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveOrg}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>Nama Organisasi / Instansi *</label>
                <input
                  className="input-field"
                  placeholder="Contoh: Kementerian Keuangan RI / PT. Telkom Indonesia"
                  value={orgForm.name}
                  onChange={e => setOrgForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>Kode Singkatan / Alias (Opsional)</label>
                <input
                  className="input-field"
                  placeholder="Contoh: KEMENKEU / TELKOM"
                  value={orgForm.code}
                  onChange={e => setOrgForm(prev => ({ ...prev, code: e.target.value }))}
                />
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
                  Kode identifikasi pendek untuk pengelompokan akun &amp; laporan.
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: 18 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>Deskripsi / Keterangan (Opsional)</label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Keterangan singkat mengenai instansi mitra..."
                  value={orgForm.description}
                  onChange={e => setOrgForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setOrgModal({ open: false, mode: "add", data: null })}
                  style={{ width: "auto", padding: "8px 16px", fontSize: "0.82rem" }}>
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingOrg}
                  style={{ width: "auto", padding: "8px 20px", fontSize: "0.82rem" }}>
                  {submittingOrg ? "Menyimpan..." : orgModal.mode === "edit" ? "Simpan Perubahan" : "Buat Organisasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Kelola Departemen / Divisi ─────────────────────────────── */}
      {deptModal.open && deptModal.org && (
        <div className="modal-overlay active" onClick={() => setDeptModal({ open: false, org: null })}>
          <div className="modal-content glass-panel" style={{ width: 620, maxWidth: "95%" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: "0 0 2px 0", fontSize: "1.08rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <Layers size={18} style={{ color: "var(--primary)" }} />
                  <span>Departemen &amp; Divisi Kerja</span>
                </h3>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Organisasi: <strong>{deptModal.org.name}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDeptModal({ open: false, org: null })}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            {/* Form Input Departemen */}
            <div className="glass-card" style={{ padding: 14, marginBottom: 18, background: "var(--bg-secondary)" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>
                {deptForm.mode === "edit" ? "Edit Departemen / Divisi" : "+ Tambah Departemen / Divisi Baru"}
              </div>
              <form onSubmit={handleSaveDept} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr auto", gap: 8, alignItems: "center" }}>
                <input
                  className="input-field"
                  placeholder="Nama Departemen (cth: Pusdiklat / Divisi SDM)"
                  value={deptForm.name}
                  onChange={e => setDeptForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  style={{ fontSize: "0.8rem", padding: "8px 10px" }}
                />
                <input
                  className="input-field"
                  placeholder="Kode Divisi (cth: HR-01)"
                  value={deptForm.code}
                  onChange={e => setDeptForm(prev => ({ ...prev, code: e.target.value }))}
                  style={{ fontSize: "0.8rem", padding: "8px 10px" }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submittingDept}
                    style={{ width: "auto", padding: "8px 14px", fontSize: "0.8rem" }}>
                    {submittingDept ? "..." : deptForm.mode === "edit" ? "Simpan" : "Tambah"}
                  </button>
                  {deptForm.mode === "edit" && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setDeptForm({ id: null, name: "", code: "", mode: "add" })}
                      style={{ width: "auto", padding: "8px 10px", fontSize: "0.75rem" }}>
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List Departemen yang sudah ada */}
            <div style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: 8 }}>
              Daftar Departemen Terdaftar:
            </div>
            <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {(deptModal.org.departments || []).length === 0 ? (
                <div style={{ padding: 18, textAlign: "center", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                  Belum ada departemen yang dibuat.
                </div>
              ) : (
                deptModal.org.departments.map(d => (
                  <div key={d.id} style={{
                    padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-color)",
                    display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-card)"
                  }}>
                    <div>
                      <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{d.name}</span>
                      {d.code && (
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: 6 }}>
                          ({d.code})
                        </span>
                      )}
                      <span style={{ fontSize: "0.7rem", color: "var(--primary)", marginLeft: 10, fontWeight: 700 }}>
                        👥 {d.user_count || 0} Pegawai
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setDeptForm({ id: d.id, name: d.name, code: d.code || "", mode: "edit" })}
                        style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: 3 }}
                        title="Edit Departemen">
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDept(d.id, d.name)}
                        style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: 3 }}
                        title="Hapus Departemen">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeptModal({ open: false, org: null })}
                style={{ width: "auto", padding: "8px 18px", fontSize: "0.82rem" }}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Assign User to Department ─────────────────────────────── */}
      {assignModal.open && assignModal.org && (
        <div className="modal-overlay active" onClick={() => setAssignModal({ open: false, org: null, dept: null })}>
          <div className="modal-content glass-panel" style={{ width: 500, maxWidth: "95%" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: "0 0 2px 0", fontSize: "1.08rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <UserPlus size={18} style={{ color: "#34d399" }} />
                  <span>Tetapkan Pegawai ke Departemen</span>
                </h3>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Organisasi: <strong>{assignModal.org.name}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAssignModal({ open: false, org: null, dept: null })}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAssign}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>Alamat Email Pegawai *</label>
                <input
                  className="input-field"
                  list="users-datalist"
                  placeholder="Masukkan email pengguna..."
                  value={assignForm.userEmail}
                  onChange={e => setAssignForm(prev => ({ ...prev, userEmail: e.target.value }))}
                  required
                />
                <datalist id="users-datalist">
                  {users.map(u => (
                    <option key={u.email} value={u.email}>{u.fullname} ({u.email})</option>
                  ))}
                </datalist>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
                  Pilih dari daftar pengguna terdaftar atau ketikkan email pengguna.
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: 18 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>Pilih Departemen / Divisi Tujuan</label>
                <select
                  className="input-field"
                  value={assignForm.departmentId}
                  onChange={e => setAssignForm(prev => ({ ...prev, departmentId: e.target.value }))}
                  style={{ width: "100%", padding: 10, fontSize: "0.82rem" }}
                >
                  <option value="">-- Tanpa Departemen (Hapus Penugasan) --</option>
                  {(assignModal.org.departments || []).map(d => (
                    <option key={d.id} value={d.id}>{d.name} {d.code ? `(${d.code})` : ""}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAssignModal({ open: false, org: null, dept: null })}
                  style={{ width: "auto", padding: "8px 16px", fontSize: "0.82rem" }}>
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingAssign}
                  style={{ width: "auto", padding: "8px 20px", fontSize: "0.82rem" }}>
                  {submittingAssign ? "Menyimpan..." : "Tetapkan Pegawai"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
