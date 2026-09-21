"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, BookOpen, Edit2, Trash2, Search, CheckSquare, Square, Award, BarChart2, Download, TrendingUp, Users, FileText, ShieldCheck, Building2, Zap, Calendar, Video, Bot, Target, Star, PieChart, CreditCard, CheckCircle, Clock, XCircle, AlertCircle, RefreshCw, Settings2 } from "lucide-react";
import Chart from "chart.js/auto";
import { useApp } from "@/context/AppContext";
import PaymentHistoryPanel from "./PaymentHistoryPanel";
import PlatformSettingsPanel from "./PlatformSettingsPanelV2";

function RevenueChart({ revenueCanvasRef }) {
  useEffect(() => {
    let revenueInstance = null;
    if (revenueCanvasRef.current) {
      revenueInstance = new Chart(revenueCanvasRef.current, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
          datasets: [
            { label: 'Pendapatan Bersih (Juta Rp)', data: [15, 28, 42, 59, 78, 92], borderColor: 'rgb(99, 102, 241)', backgroundColor: 'rgba(249, 115, 22, 0.1)', tension: 0.4, fill: true },
            { label: 'Target Pendapatan', data: [10, 20, 35, 50, 70, 90], borderColor: 'rgba(16, 185, 129, 0.5)', borderDash: [5, 5], fill: false }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: { x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } } },
          plugins: { legend: { labels: { color: '#94a3b8' } } }
        }
      });
    }
    return () => { if (revenueInstance) revenueInstance.destroy(); };
  }, []);

  return <canvas ref={revenueCanvasRef} id="revenueChart"></canvas>;
}

function CourseManager() {
  const { courses, handleOpenCrudModal, handleDeleteCrud, handleOpenLmsManageModal } = useApp();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="btn btn-primary" style={{ width: "auto", padding: "8px 16px", fontSize: "0.85rem" }} onClick={() => handleOpenCrudModal("course", "add")}>
          <Plus size={16} style={{ marginRight: 6 }} /> Tambah Program Baru
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border-color)", color: "var(--text-secondary)", textAlign: "left", fontSize: "0.85rem" }}>
              <th style={{ padding: 12 }}>ID</th><th style={{ padding: 12 }}>Judul Pelatihan</th><th style={{ padding: 12 }}>Kategori</th>
              <th style={{ padding: 12 }}>Durasi</th><th style={{ padding: 12 }}>Level</th><th style={{ padding: 12 }}>Harga</th><th style={{ padding: 12 }}>Aksi</th>
            </tr>
          </thead>
          <tbody style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            {courses.map(course => (
              <tr key={course.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                <td style={{ padding: 12, fontFamily: "monospace" }}>{course.id}</td>
                <td style={{ padding: 12, fontWeight: 600, color: "white" }}>{course.title}</td>
                <td style={{ padding: 12 }}>{course.category}</td>
                <td style={{ padding: 12 }}>{course.duration}</td>
                <td style={{ padding: 12 }}>{course.level}</td>
                <td style={{ padding: 12 }}>{course.priceLabel}</td>
                <td style={{ padding: 12 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-secondary" style={{ width: "auto", padding: 6, borderColor: "rgba(249, 115, 22, 0.4)" }} title="Kelola Materi & Ujian" onClick={() => handleOpenLmsManageModal(course)}>
                      <BookOpen size={12} style={{ color: "var(--primary)" }} />
                    </button>
                    <button className="btn btn-secondary" style={{ width: "auto", padding: 6 }} onClick={() => handleOpenCrudModal("course", "edit", course)}>
                      <Edit2 size={12} style={{ color: "#fdba74" }} />
                    </button>
                    <button className="btn btn-secondary" style={{ width: "auto", padding: 6, borderColor: "rgba(239, 68, 68, 0.2)" }} onClick={() => handleDeleteCrud("course", course.id)}>
                      <Trash2 size={12} style={{ color: "var(--danger)" }} />
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

  const roleColors = { admin: { bg: "rgba(239, 68, 68, 0.15)", color: "#fecaca" }, government: { bg: "rgba(6, 182, 212, 0.15)", color: "#c5f2f7" }, corporate: { bg: "rgba(251, 146, 60, 0.15)", color: "#fff7ed" }, student: { bg: "rgba(249, 115, 22, 0.15)", color: "#ffedd5" } };
  const statusColors = { active: { bg: "rgba(16, 185, 129, 0.15)", color: "#a7f3d0", label: "Aktif" }, suspended: { bg: "rgba(239, 68, 68, 0.15)", color: "#fecaca", label: "Ditangguhkan" }, pending: { bg: "rgba(245, 158, 11, 0.15)", color: "#fef3c7", label: "Menunggu" } };

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, flex: 1 }}>
          <div style={{ position: "relative", minWidth: 200, flex: 1 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
            <input type="text" placeholder="Cari nama, email, instansi..." value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} style={{ width: "100%", padding: "8px 12px 8px 34px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-secondary)", color: "white", fontSize: "0.8rem" }} />
          </div>
          <select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-secondary)", color: "white", fontSize: "0.8rem", cursor: "pointer" }}>
            <option value="all">Semua Peran</option><option value="student">Peserta Mandiri</option><option value="corporate">HR Manager</option><option value="government">Kepala Biro SDM</option><option value="admin">Platform Admin</option>
          </select>
          <select value={userStatusFilter} onChange={(e) => setUserStatusFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-secondary)", color: "white", fontSize: "0.8rem", cursor: "pointer" }}>
            <option value="all">Semua Status</option><option value="active">Aktif</option><option value="suspended">Ditangguhkan</option><option value="pending">Menunggu Verifikasi</option>
          </select>
        </div>
        <button className="btn btn-primary" style={{ width: "auto", padding: "8px 16px", fontSize: "0.85rem" }} onClick={() => handleOpenCrudModal("user", "add")}>
          <Plus size={16} style={{ marginRight: 6 }} /> Tambah Pengguna Baru
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border-color)", color: "var(--text-secondary)", textAlign: "left", fontSize: "0.85rem" }}>
              <th style={{ padding: 12 }}>Nama Lengkap</th><th style={{ padding: 12 }}>Alamat Email</th><th style={{ padding: 12 }}>Peran (Role)</th>
              <th style={{ padding: 12 }}>Organisasi / Instansi</th><th style={{ padding: 12 }}>Status</th><th style={{ padding: 12 }}>Aksi</th>
            </tr>
          </thead>
          <tbody style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            {filteredUsers.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--text-secondary)" }}>Tidak ada pengguna ditemukan dengan kriteria tersebut.</td></tr>
            ) : filteredUsers.map(u => (
              <tr key={u.email} style={{ borderBottom: "1px solid var(--border-color)" }}>
                <td style={{ padding: 12, fontWeight: 600, color: "white" }}>{u.fullname}</td>
                <td style={{ padding: 12, fontFamily: "monospace" }}>{u.email}</td>
                <td style={{ padding: 12 }}>
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: "0.75rem", backgroundColor: roleColors[u.role]?.bg, color: roleColors[u.role]?.color }}>{u.roleLabel}</span>
                </td>
                <td style={{ padding: 12 }}>{u.organization || "-"}</td>
                <td style={{ padding: 12 }}>
                  <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: "0.7rem", fontWeight: "600", backgroundColor: statusColors[u.status]?.bg, color: statusColors[u.status]?.color }}>
                    {statusColors[u.status]?.label || u.status}
                  </span>
                </td>
                <td style={{ padding: 12 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-secondary" style={{ width: "auto", padding: 6 }} onClick={() => handleOpenCrudModal("user", "edit", u)}>
                      <Edit2 size={12} style={{ color: "#fdba74" }} />
                    </button>
                    {u.email !== currentUser?.email && (
                      <button className="btn btn-secondary" style={{ width: "auto", padding: 6, borderColor: "rgba(239, 68, 68, 0.2)" }} onClick={() => handleDeleteCrud("user", u.email)}>
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

function InstructorManager() {
  const { instructors, handleOpenCrudModal, handleDeleteCrud } = useApp();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="btn btn-primary" style={{ width: "auto", padding: "8px 16px", fontSize: "0.85rem" }} onClick={() => handleOpenCrudModal("instructor", "add")}>
          <Plus size={16} style={{ marginRight: 6 }} /> Tambah Instruktur Baru
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border-color)", color: "var(--text-secondary)", textAlign: "left", fontSize: "0.85rem" }}>
              <th style={{ padding: 12 }}>ID</th><th style={{ padding: 12 }}>Nama Instruktur</th><th style={{ padding: 12 }}>Keahlian</th>
              <th style={{ padding: 12 }}>Jadwal Kelas</th><th style={{ padding: 12 }}>Revenue Sharing (%)</th><th style={{ padding: 12 }}>Aksi</th>
            </tr>
          </thead>
          <tbody style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            {instructors.map(ins => (
              <tr key={ins.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                <td style={{ padding: 12, fontFamily: "monospace" }}>{ins.id}</td>
                <td style={{ padding: 12, fontWeight: 600, color: "white" }}>{ins.name}</td>
                <td style={{ padding: 12 }}>{ins.specialty}</td>
                <td style={{ padding: 12 }}>{ins.schedule}</td>
                <td style={{ padding: 12, color: "#f59e0b", fontWeight: "600" }}>{ins.revShare}%</td>
                <td style={{ padding: 12 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-secondary" style={{ width: "auto", padding: 6 }} onClick={() => handleOpenCrudModal("instructor", "edit", ins)}>
                      <Edit2 size={12} style={{ color: "#fdba74" }} />
                    </button>
                    <button className="btn btn-secondary" style={{ width: "auto", padding: 6, borderColor: "rgba(239, 68, 68, 0.2)" }} onClick={() => handleDeleteCrud("instructor", ins.id)}>
                      <Trash2 size={12} style={{ color: "var(--danger)" }} />
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

function MetaDataManager() {
  const { categories, levels, newCatKey, newCatName, newLvlKey, newLvlName, setNewCatKey, setNewCatName, setNewLvlKey, setNewLvlName, handleAddCategory, handleDeleteCategory, handleAddLevel, handleDeleteLevel } = useApp();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <div className="glass-card" style={{ padding: 20 }}>
        <h4 style={{ marginBottom: 16, color: "white", fontSize: "1rem" }}>Manajemen Kategori Pelatihan</h4>
        <div style={{ maxHeight: 250, overflowY: "auto", marginBottom: 20 }}>
          <table style={{ width: "100%", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left", color: "var(--text-secondary)" }}>
                <th style={{ padding: 8 }}>Kode</th><th style={{ padding: 8 }}>Nama Kategori</th><th style={{ padding: 8, textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.key} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: 8, fontFamily: "monospace" }}>{cat.key}</td>
                  <td style={{ padding: 8, color: "white" }}>{cat.name}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>
                    {!["AI", "Tech", "Procurement", "Leadership"].includes(cat.key) ? (
                      <button className="btn btn-secondary" style={{ width: "auto", padding: "4px 8px", fontSize: "0.7rem", borderColor: "rgba(239,68,68,0.2)" }} onClick={() => handleDeleteCategory(cat.key)}>Hapus</button>
                    ) : <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Sistem</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form onSubmit={handleAddCategory} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Kode Kategori</label>
            <input type="text" placeholder="Contoh: Finance" value={newCatKey} onChange={(e) => setNewCatKey(e.target.value)} required style={{ padding: "6px 12px", fontSize: "0.8rem", width: "100%" }} />
          </div>
          <div style={{ flex: 2 }}>
            <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Nama Kategori</label>
            <input type="text" placeholder="Contoh: Keuangan" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} required style={{ padding: "6px 12px", fontSize: "0.8rem", width: "100%" }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "auto", padding: "8px 16px", height: "auto", fontSize: "0.8rem" }}>Tambah</button>
        </form>
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <h4 style={{ marginBottom: 16, color: "white", fontSize: "1rem" }}>Manajemen Tingkat (Level)</h4>
        <div style={{ maxHeight: 250, overflowY: "auto", marginBottom: 20 }}>
          <table style={{ width: "100%", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left", color: "var(--text-secondary)" }}>
                <th style={{ padding: 8 }}>Kode</th><th style={{ padding: 8 }}>Nama Tingkat</th><th style={{ padding: 8, textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {levels.map(lvl => (
                <tr key={lvl.key} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: 8, fontFamily: "monospace" }}>{lvl.key}</td>
                  <td style={{ padding: 8, color: "white" }}>{lvl.name}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>
                    {!["Dasar", "Menengah", "Lanjutan", "Eksekutif"].includes(lvl.key) ? (
                      <button className="btn btn-secondary" style={{ width: "auto", padding: "4px 8px", fontSize: "0.7rem", borderColor: "rgba(239,68,68,0.2)" }} onClick={() => handleDeleteLevel(lvl.key)}>Hapus</button>
                    ) : <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Sistem</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form onSubmit={handleAddLevel} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Kode Level</label>
            <input type="text" placeholder="Contoh: Professional" value={newLvlKey} onChange={(e) => setNewLvlKey(e.target.value)} required style={{ padding: "6px 12px", fontSize: "0.8rem", width: "100%" }} />
          </div>
          <div style={{ flex: 2 }}>
            <label style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Nama Level</label>
            <input type="text" placeholder="Contoh: Profesional" value={newLvlName} onChange={(e) => setNewLvlName(e.target.value)} required style={{ padding: "6px 12px", fontSize: "0.8rem", width: "100%" }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "auto", padding: "8px 16px", height: "auto", fontSize: "0.8rem" }}>Tambah</button>
        </form>
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
    { label: "Total User",         value: summary.summary.totalUsers,       icon: Users,      color: "#fdba74" },
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
          <div key={k} className={`filter-pill ${activeTab===k?"active":""}`} onClick={() => setActiveTab(k)}>{l}</div>
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
              <h4 style={{ marginBottom:16, color:"white", fontSize:"0.9rem" }}>Revenue 12 Bulan Terakhir (Juta Rp)</h4>
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

  const ACTION_COLOR = { create: "#6ee7b7", update: "#fde68a", delete: "#fca5a5", login: "#fdba74", bulk_enroll: "#93c5fd", create_announcement: "#fbbf24" };
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
        <div className={`filter-pill ${activeTab==="logs"?"active":""}`} onClick={() => setActiveTab("logs")}>Audit Log</div>
        <div className={`filter-pill ${activeTab==="sessions"?"active":""}`} onClick={() => setActiveTab("sessions")}>Sesi Aktif</div>
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

// ── OrganizationManager ───────────────────────────────────────────────────────
function OrganizationManager() {
  const [orgs, setOrgs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState("");
  const [form, setForm]       = useState({ orgName:"", orgCode:"", deptName:"", deptOrgId:"", assignEmail:"", assignDeptId:"" });
  const [bulkForm, setBulkForm] = useState({ courseId:"", departmentId:"", emails:"" });
  const { courses } = useApp();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/organizations");
      const d = await res.json();
      if (d.success) setOrgs(d.organizations||[]);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const post = async (action, payload) => {
    setMsg("");
    const res = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const d = await res.json();
    if (d.success) { setMsg("✓ Berhasil"); load(); }
    else setMsg(`✕ ${d.error}`);
  };

  const bulkEnroll = async () => {
    setMsg("");
    const body = { courseId: bulkForm.courseId };
    if (bulkForm.departmentId) body.departmentId = bulkForm.departmentId;
    else if (bulkForm.emails)  body.userEmails = bulkForm.emails.split("\n").map(e=>e.trim()).filter(Boolean);
    const res = await fetch("/api/enrollments/bulk", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) });
    const d = await res.json();
    setMsg(d.success ? `✓ ${d.enrolled} peserta berhasil didaftarkan` : `✕ ${d.error}`);
  };

  const allDepts = orgs.flatMap(o => (o.departments||[]).map(d => ({ ...d, orgName: o.name })));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {msg && (
        <div style={{ padding:"8px 14px", borderRadius:6, fontSize:"0.8rem",
          background: msg.startsWith("✓")?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)",
          color: msg.startsWith("✓")?"#6ee7b7":"#fca5a5",
          border:`1px dashed ${msg.startsWith("✓")?"rgba(16,185,129,0.3)":"rgba(239,68,68,0.3)"}` }}>
          {msg}
        </div>
      )}

      {/* Create Org + Dept */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div className="glass-card" style={{ padding:16 }}>
          <h4 style={{ fontSize:"0.85rem", color:"var(--primary)", marginBottom:12 }}>Buat Organisasi Baru</h4>
          <div className="form-group" style={{ marginBottom:8 }}>
            <input type="text" placeholder="Nama Organisasi" value={form.orgName}
              onChange={e => setForm(p=>({...p,orgName:e.target.value}))}
              style={{ paddingLeft:12, height:36, fontSize:"0.82rem" }} />
          </div>
          <div className="form-group" style={{ marginBottom:8 }}>
            <input type="text" placeholder="Kode Unik (contoh: NHCIE)" value={form.orgCode}
              onChange={e => setForm(p=>({...p,orgCode:e.target.value}))}
              style={{ paddingLeft:12, height:36, fontSize:"0.82rem" }} />
          </div>
          <button onClick={() => post("org", { name: form.orgName, code: form.orgCode })}
            className="btn btn-primary" style={{ width:"auto", padding:"6px 14px", fontSize:"0.8rem" }}>Buat Organisasi</button>
        </div>

        <div className="glass-card" style={{ padding:16 }}>
          <h4 style={{ fontSize:"0.85rem", color:"var(--primary)", marginBottom:12 }}>Buat Departemen</h4>
          <div className="form-group" style={{ marginBottom:8 }}>
            <select value={form.deptOrgId} onChange={e => setForm(p=>({...p,deptOrgId:e.target.value}))}
              style={{ height:36, fontSize:"0.82rem", padding:"0 10px", borderRadius:6, border:"1px solid var(--border-color)", background:"var(--bg-secondary)", color:"var(--text-primary)", width:"100%" }}>
              <option value="">Pilih Organisasi...</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom:8 }}>
            <input type="text" placeholder="Nama Departemen" value={form.deptName}
              onChange={e => setForm(p=>({...p,deptName:e.target.value}))}
              style={{ paddingLeft:12, height:36, fontSize:"0.82rem" }} />
          </div>
          <button onClick={() => post("dept", { orgId: form.deptOrgId, name: form.deptName })}
            className="btn btn-primary" style={{ width:"auto", padding:"6px 14px", fontSize:"0.8rem" }}>Buat Departemen</button>
        </div>
      </div>

      {/* Assign User */}
      <div className="glass-card" style={{ padding:16 }}>
        <h4 style={{ fontSize:"0.85rem", color:"var(--primary)", marginBottom:12 }}>Assign User ke Departemen</h4>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <input type="email" placeholder="Email user..." value={form.assignEmail}
            onChange={e => setForm(p=>({...p,assignEmail:e.target.value}))}
            style={{ flex:2, paddingLeft:12, height:36, fontSize:"0.82rem" }} />
          <select value={form.assignDeptId} onChange={e => setForm(p=>({...p,assignDeptId:e.target.value}))}
            style={{ flex:2, height:36, fontSize:"0.82rem", padding:"0 10px", borderRadius:6, border:"1px solid var(--border-color)", background:"var(--bg-secondary)", color:"var(--text-primary)" }}>
            <option value="">Pilih Departemen...</option>
            {allDepts.map(d => <option key={d.id} value={d.id}>{d.orgName} — {d.name}</option>)}
          </select>
          <button onClick={() => post("assign", { userEmail: form.assignEmail, departmentId: form.assignDeptId })}
            className="btn btn-primary" style={{ width:"auto", padding:"0 14px", height:36, fontSize:"0.82rem" }}>Assign</button>
        </div>
      </div>

      {/* Bulk Enrollment */}
      <div className="glass-card" style={{ padding:16, border:"1px solid rgba(251,191,36,0.2)" }}>
        <h4 style={{ fontSize:"0.85rem", color:"#fbbf24", marginBottom:12 }}>Bulk Enrollment</h4>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:8 }}>
          <select value={bulkForm.courseId} onChange={e => setBulkForm(p=>({...p,courseId:e.target.value}))}
            style={{ flex:2, height:36, fontSize:"0.82rem", padding:"0 10px", borderRadius:6, border:"1px solid var(--border-color)", background:"var(--bg-secondary)", color:"var(--text-primary)" }}>
            <option value="">Pilih Kursus...</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <select value={bulkForm.departmentId} onChange={e => setBulkForm(p=>({...p,departmentId:e.target.value}))}
            style={{ flex:2, height:36, fontSize:"0.82rem", padding:"0 10px", borderRadius:6, border:"1px solid var(--border-color)", background:"var(--bg-secondary)", color:"var(--text-primary)" }}>
            <option value="">Atau pilih departemen...</option>
            {allDepts.map(d => <option key={d.id} value={d.id}>{d.orgName} — {d.name}</option>)}
          </select>
        </div>
        <textarea placeholder="Atau masukkan email user (satu per baris)..." value={bulkForm.emails}
          onChange={e => setBulkForm(p=>({...p,emails:e.target.value}))}
          style={{ width:"100%", minHeight:80, padding:"8px 12px", fontSize:"0.78rem",
            background:"var(--bg-secondary)", border:"1px solid var(--border-color)",
            borderRadius:6, color:"var(--text-primary)", resize:"vertical", marginBottom:8 }} />
        <button onClick={bulkEnroll} className="btn btn-primary" style={{ width:"auto", padding:"6px 14px", fontSize:"0.8rem" }}>
          Enroll Sekarang
        </button>
      </div>

      {/* Org list */}
      {loading ? (
        <p style={{ color:"var(--text-muted)", textAlign:"center" }}>Memuat organisasi...</p>
      ) : orgs.length === 0 ? (
        <p style={{ color:"var(--text-muted)", fontSize:"0.8rem", textAlign:"center", padding:20 }}>Belum ada organisasi. Buat satu di atas.</p>
      ) : orgs.map(org => (
        <div key={org.id} className="glass-card" style={{ padding:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div>
              <strong style={{ color:"white" }}>{org.name}</strong>
              <span style={{ fontSize:"0.7rem", color:"var(--text-muted)", marginLeft:8, fontFamily:"monospace" }}>{org.code}</span>
            </div>
            <span style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>{(org.departments||[]).length} dept</span>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {(org.departments||[]).map(d => (
              <span key={d.id} style={{ padding:"3px 10px", borderRadius:12, fontSize:"0.72rem", background:"rgba(249, 115, 22,0.1)", color:"#fdba74", border:"1px solid rgba(249, 115, 22,0.2)" }}>
                {d.name} ({d.user_count||0})
              </span>
            ))}
          </div>
        </div>
      ))}
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
  const [form, setForm]             = useState({ title:"", description:"", scheduledAt:"", durationMinutes:60, meetLink:"", platform:"zoom", maxParticipants:100, courseId:"" });
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
      if (data.success) { setMsg("✓ Sesi dibuat"); setForm({ title:"", description:"", scheduledAt:"", durationMinutes:60, meetLink:"", platform:"zoom", maxParticipants:100, courseId:"" }); load(); }
      else setMsg("✕ " + data.error);
    } catch { setMsg("✕ Gagal membuat sesi"); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus sesi ini?")) return;
    await fetch(`/api/live-sessions?id=${id}`, { method: "DELETE" });
    load();
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div>
      <div className="glass-card" style={{ padding:20, marginBottom:20 }}>
        <h4 style={{ fontSize:"0.85rem", color:"var(--primary)", marginBottom:14 }}>＋ Buat Live Session Baru</h4>
        {msg && <div style={{ fontSize:"0.75rem", padding:"6px 12px", borderRadius:6, marginBottom:10, background: msg.startsWith("✓") ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: msg.startsWith("✓") ? "#6ee7b7" : "#fca5a5" }}>{msg}</div>}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div className="form-group" style={{ margin:0 }}>
            <label style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>Judul Sesi*</label>
            <input type="text" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Nama sesi live class" style={{ paddingLeft:12 }} />
          </div>
          <div className="form-group" style={{ margin:0 }}>
            <label style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>Kursus (opsional)</label>
            <select value={form.courseId} onChange={e => set("courseId", e.target.value)} style={{ paddingLeft:12 }}>
              <option value="">-- Pilih Kursus --</option>
              {(courses||[]).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin:0 }}>
            <label style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>Waktu Mulai*</label>
            <input type="datetime-local" value={form.scheduledAt} onChange={e => set("scheduledAt", e.target.value)} style={{ paddingLeft:12 }} />
          </div>
          <div className="form-group" style={{ margin:0 }}>
            <label style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>Durasi (menit)</label>
            <input type="number" value={form.durationMinutes} onChange={e => set("durationMinutes", parseInt(e.target.value))} min={15} style={{ paddingLeft:12 }} />
          </div>
          <div className="form-group" style={{ margin:0 }}>
            <label style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>Link Meet</label>
            <input type="url" value={form.meetLink} onChange={e => set("meetLink", e.target.value)} placeholder="https://zoom.us/j/..." style={{ paddingLeft:12 }} />
          </div>
          <div className="form-group" style={{ margin:0 }}>
            <label style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>Platform</label>
            <select value={form.platform} onChange={e => set("platform", e.target.value)} style={{ paddingLeft:12 }}>
              <option value="zoom">Zoom</option>
              <option value="gmeet">Google Meet</option>
              <option value="teams">MS Teams</option>
              <option value="webex">Webex</option>
            </select>
          </div>
        </div>
        <div className="form-group" style={{ margin:"12px 0 0" }}>
          <label style={{ fontSize:"0.75rem", color:"var(--text-muted)" }}>Deskripsi</label>
          <input type="text" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Deskripsi singkat sesi" style={{ paddingLeft:12 }} />
        </div>
        <button className="btn btn-primary" style={{ width:"auto", marginTop:14 }} onClick={handleCreate}>
          <Calendar size={14} style={{ marginRight:6 }} />Buat Sesi
        </button>
      </div>

      {loading ? <p style={{ color:"var(--text-muted)", fontSize:"0.8rem" }}>Memuat...</p> : (
        <div>
          <h4 style={{ fontSize:"0.85rem", marginBottom:12 }}>Sesi Terjadwal ({sessions.length})</h4>
          {sessions.length === 0 ? <p style={{ color:"var(--text-muted)", fontSize:"0.8rem" }}>Belum ada sesi.</p> : sessions.map(s => (
            <div key={s.id} className="glass-card" style={{ padding:14, marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <Video size={13} style={{ color:"var(--primary)" }} />
                  <span style={{ fontWeight:600, fontSize:"0.85rem" }}>{s.title}</span>
                  <span style={{ fontSize:"0.65rem", background:"rgba(249, 115, 22,0.2)", color:"#fdba74", padding:"2px 8px", borderRadius:20 }}>{s.platform?.toUpperCase()}</span>
                </div>
                <div style={{ fontSize:"0.72rem", color:"var(--text-muted)", display:"flex", gap:12 }}>
                  <span>📅 {new Date(s.scheduled_at).toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"})}</span>
                  <span>⏱ {s.duration_minutes}m</span>
                  <span>👥 {s.registered_count||0}/{s.max_participants}</span>
                  {s.course_title && <span>📚 {s.course_title}</span>}
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {s.meet_link && <a href={s.meet_link} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ width:"auto", padding:"4px 10px", fontSize:"0.72rem", textDecoration:"none" }}>Buka Link</a>}
                <button className="btn btn-secondary" style={{ width:"auto", padding:"4px 10px", fontSize:"0.72rem", color:"#fca5a5" }} onClick={() => handleDelete(s.id)}>Hapus</button>
              </div>
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
          <div key={k} className={`filter-pill ${reportType===k?"active":""}`} onClick={() => setReportType(k)} style={{ fontSize:"0.75rem" }}>{l}</div>
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
          { label: "Total Order", value: total, color: "#fdba74" },
          { label: "Berhasil",    value: paid,    color: "#34d399" },
          { label: "Pending",     value: pending, color: "#fbbf24" },
          { label: "Total Pendapatan", value: `Rp ${revenue.toLocaleString("id-ID")}`, color: "#f97316" },
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
          <div key={f}
            className={`filter-pill ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
            style={{ fontSize: "0.75rem" }}>
            {f === "all" ? "Semua" : f === "paid" || f === "Berhasil" ? "Berhasil" : f === "pending" ? "Pending" : "Gagal"}
          </div>
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

export default function AdminPage() {
  const { adminTab, setAdminTab } = useApp();

  const tabs = [
    { key: "users",        label: "Manajemen Pengguna",  icon: Users },
    { key: "courses",      label: "Manajemen Kursus",    icon: BookOpen },
    { key: "instructors",  label: "Instruktur",          icon: Award },
    { key: "metadata",     label: "Data Master",         icon: FileText },
    { key: "template",     label: "Template Sertifikat", icon: Award },
    { key: "analytics",    label: "Analytics",           icon: BarChart2 },
    { key: "audit",        label: "Audit & Sesi",        icon: ShieldCheck },
    { key: "organizations",label: "Organisasi",          icon: Building2 },
    { key: "livesessions", label: "Live Class",          icon: Video },
    { key: "gamification", label: "Leaderboard XP",      icon: Zap },
    { key: "kpi",          label: "KPI & Laporan",       icon: Target },
    { key: "payments",     label: "Riwayat Transaksi",   icon: CreditCard },
    { key: "platform",     label: "Pengaturan Platform", icon: Settings2 },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 20, color: "white", fontSize: "1.3rem" }}>Panel Administrasi Platform</h2>

      <div className="filter-pills" style={{ marginBottom: 24, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <div key={t.key}
            className={`filter-pill ${adminTab === t.key ? "active" : ""}`}
            onClick={() => setAdminTab(t.key)}>
            <t.icon size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />{t.label}
          </div>
        ))}
      </div>

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
      {adminTab === "platform"      && <PlatformSettingsPanel />}
    </div>
  );
}
