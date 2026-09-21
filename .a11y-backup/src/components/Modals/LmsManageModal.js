"use client";
import { useState, useEffect, useCallback } from "react";
import { X, Book, FileText, Settings, PlusCircle, Trash, Check, UploadCloud, Loader, Database, Users, Star } from "lucide-react";
import { useApp } from "@/context/AppContext";

// ── Upload file materi ke S3 (atau mock) ──────────────────────────────────────
async function uploadMaterialFile(file, courseId, onProgress) {
  // 1. Minta presigned URL dari server
  const res = await fetch("/api/upload/presigned", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type, courseId }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Gagal mendapat URL upload");

  if (data.mockMode) {
    // Mode demo: simulasikan upload
    await new Promise(r => setTimeout(r, 800));
    onProgress(100);
    return { url: "", mockMode: true, message: data.message };
  }

  // 2. Upload langsung ke S3 via presigned URL
  await fetch(data.url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  onProgress(100);
  return { url: data.finalUrl, mockMode: false };
}

// ── Tab Bank Soal ────────────────────────────────────────────────────────────
function QuestionBankTab({ courseId }) {
  const DIFFICULTIES = [
    { key: "easy",   label: "Mudah",   color: "#6ee7b7" },
    { key: "medium", label: "Sedang",  color: "#fde68a" },
    { key: "hard",   label: "Sulit",   color: "#fca5a5" },
  ];
  const EMPTY_FORM = { question: "", options: ["","","",""], correct: 0, category: "", difficulty: "medium" };

  const [bankQuestions, setBankQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);   // null = add mode
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [filterDiff, setFilterDiff] = useState("");

  const loadBank = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filterDiff ? `&difficulty=${filterDiff}` : "";
      const res = await fetch(`/api/question-bank?courseId=${encodeURIComponent(courseId)}${qs}`);
      const data = await res.json();
      if (data.success) setBankQuestions(data.questions);
    } catch { /* ignore */ }
    setLoading(false);
  }, [courseId, filterDiff]);

  useEffect(() => { loadBank(); }, [loadBank]);

  const handleEdit = (q) => {
    setEditId(q.id);
    setForm({
      question:   q.question,
      options:    Array.isArray(q.options) ? q.options : JSON.parse(q.options),
      correct:    q.correct,
      category:   q.category || "",
      difficulty: q.difficulty || "medium",
    });
    setMsg("");
  };

  const handleCancelEdit = () => { setEditId(null); setForm(EMPTY_FORM); setMsg(""); };

  const handleDelete = async (id) => {
    if (!confirm("Hapus soal ini dari bank?")) return;
    try {
      const res = await fetch(`/api/question-bank/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { setBankQuestions(prev => prev.filter(q => q.id !== id)); setMsg("✓ Soal dihapus"); }
      else setMsg(`✕ ${data.error}`);
    } catch { setMsg("✕ Gagal menghapus"); }
  };

  const handleSave = async () => {
    if (!form.question.trim()) return setMsg("✕ Pertanyaan wajib diisi");
    if (form.options.some(o => !o.trim())) return setMsg("✕ Semua pilihan jawaban wajib diisi");
    setSaving(true); setMsg("");
    try {
      const method = editId ? "PUT" : "POST";
      const url    = editId ? `/api/question-bank/${editId}` : "/api/question-bank";
      const body   = editId ? form : { ...form, courseId };
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data   = await res.json();
      if (data.success) {
        setMsg(editId ? "✓ Soal diperbarui" : "✓ Soal ditambahkan ke bank");
        setEditId(null); setForm(EMPTY_FORM);
        loadBank();
      } else { setMsg(`✕ ${data.error}`); }
    } catch { setMsg("✕ Gagal menyimpan"); }
    setSaving(false);
  };

  const diffColor = (d) => DIFFICULTIES.find(x => x.key === d)?.color || "#94a3b8";
  const diffLabel = (d) => DIFFICULTIES.find(x => x.key === d)?.label || d;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", margin: 0 }}>
          Bank soal kursus ini. Saat ujian dimulai, soal diambil dari bank (bukan dari tab Soal Ujian) jika bank tidak kosong.
          Soal diacak otomatis tiap sesi ujian.
        </p>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 16 }}>
          {DIFFICULTIES.map(d => (
            <button key={d.key} onClick={() => setFilterDiff(filterDiff === d.key ? "" : d.key)}
              style={{ padding: "4px 10px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 600, cursor: "pointer",
                background: filterDiff === d.key ? d.color + "33" : "transparent",
                border: `1px solid ${d.color}55`, color: d.color }}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div style={{ fontSize: "0.75rem", padding: "6px 12px", borderRadius: 6, marginBottom: 12,
          background: msg.startsWith("✓") ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px dashed ${msg.startsWith("✓") ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: msg.startsWith("✓") ? "#6ee7b7" : "#fca5a5" }}>
          {msg}
        </div>
      )}

      {/* Form tambah/edit */}
      <div className="glass-card" style={{ padding: 18, marginBottom: 20, border: "1px solid var(--border-color)" }}>
        <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--primary)", marginBottom: 12 }}>
          {editId ? "✏ Edit Soal" : "＋ Tambah Soal Baru"}
        </p>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Teks Pertanyaan</label>
          <input type="text" value={form.question}
            onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
            placeholder="Tulis pertanyaan..." style={{ paddingLeft: 12 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          {form.options.map((opt, i) => (
            <div key={i} className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: "0.72rem", color: form.correct === i ? "#6ee7b7" : "var(--text-muted)" }}>
                Pilihan {i+1} {form.correct === i ? "✓ Benar" : ""}
              </label>
              <input type="text" value={opt}
                onChange={e => { const opts = [...form.options]; opts[i] = e.target.value; setForm(p => ({ ...p, options: opts })); }}
                style={{ paddingLeft: 12, height: 34, fontSize: "0.8rem",
                  border: form.correct === i ? "1px solid var(--success)" : "1px solid var(--border-color)" }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 0 }}>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Jawaban Benar</label>
            <select value={form.correct} onChange={e => setForm(p => ({ ...p, correct: Number(e.target.value) }))}
              style={{ height: 34, fontSize: "0.8rem", padding: "0 8px" }}>
              {[0,1,2,3].map(i => <option key={i} value={i}>Pilihan {i+1}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 120 }}>
            <label style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Kesulitan</label>
            <select value={form.difficulty} onChange={e => setForm(p => ({ ...p, difficulty: e.target.value }))}
              style={{ height: 34, fontSize: "0.8rem", padding: "0 8px" }}>
              {DIFFICULTIES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, flex: 2, minWidth: 160 }}>
            <label style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Kategori (opsional)</label>
            <input type="text" value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              placeholder="cth: Hukum PBJ, AI Ethics..." style={{ paddingLeft: 12, height: 34, fontSize: "0.8rem" }} />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", paddingBottom: 0 }}>
            {editId && (
              <button onClick={handleCancelEdit} className="btn btn-secondary" style={{ width: "auto", height: 34, padding: "0 12px", fontSize: "0.8rem" }}>
                Batal
              </button>
            )}
            <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ width: "auto", height: 34, padding: "0 14px", fontSize: "0.8rem" }}>
              {saving ? <Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> : (editId ? "Perbarui" : "Simpan")}
            </button>
          </div>
        </div>
      </div>

      {/* Daftar soal */}
      {loading ? (
        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: 20 }}>Memuat bank soal...</p>
      ) : bankQuestions.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: 20 }}>
          Bank soal kosong{filterDiff ? ` untuk filter "${filterDiff}"` : ""}. Tambahkan soal di atas.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>
            {bankQuestions.length} soal tersimpan di bank
          </p>
          {bankQuestions.map((q, i) => (
            <div key={q.id} style={{ background: "rgba(255,255,255,0.02)", padding: "12px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>#{i+1}</span>
                    <span style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: 10,
                      background: diffColor(q.difficulty) + "22", color: diffColor(q.difficulty),
                      border: `1px solid ${diffColor(q.difficulty)}44` }}>
                      {diffLabel(q.difficulty)}
                    </span>
                    {q.category && (
                      <span style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: 10,
                        background: "rgba(249, 115, 22,0.1)", color: "#fdba74", border: "1px solid rgba(249, 115, 22,0.2)" }}>
                        {q.category}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-primary)", margin: "0 0 6px 0", fontWeight: 500 }}>{q.question}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                    {(Array.isArray(q.options) ? q.options : JSON.parse(q.options)).map((opt, oi) => (
                      <span key={oi} style={{ fontSize: "0.72rem", color: oi === q.correct ? "#6ee7b7" : "var(--text-muted)",
                        fontWeight: oi === q.correct ? 700 : 400 }}>
                        {oi === q.correct ? "✓ " : "  "}{opt}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => handleEdit(q)} className="btn btn-secondary"
                    style={{ width: "auto", padding: "6px 10px", fontSize: "0.72rem" }}>Edit</button>
                  <button onClick={() => handleDelete(q.id)} className="btn btn-secondary"
                    style={{ width: "auto", padding: 6, borderColor: "rgba(239,68,68,0.2)" }}>
                    <Trash size={13} style={{ color: "var(--danger)" }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab Dashboard Instruktur ─────────────────────────────────────────────────
function InstructorDashboard({ courseId }) {
  const [students, setStudents]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [grading, setGrading]     = useState(null); // { email, grade, feedback }
  const [saveMsg, setSaveMsg]     = useState("");
  const [search, setSearch]       = useState("");

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/instructor?courseId=${encodeURIComponent(courseId)}`);
      const data = await res.json();
      if (data.success) setStudents(data.students || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  const handleGrade = async () => {
    if (!grading) return;
    setSaveMsg("");
    try {
      const res  = await fetch("/api/instructor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, userEmail: grading.email, grade: grading.grade, feedback: grading.feedback }),
      });
      const data = await res.json();
      if (data.success) { setSaveMsg("✓ Nilai tersimpan & notifikasi terkirim ke peserta"); setGrading(null); load(); }
      else setSaveMsg(`✕ ${data.error}`);
    } catch { setSaveMsg("✕ Gagal menyimpan"); }
  };

  const filtered = students.filter(s =>
    !search || s.fullname?.toLowerCase().includes(search.toLowerCase()) || s.email.includes(search)
  );

  const pct = (n) => n != null ? `${Math.round(n)}%` : "—";
  const timeAgo = (ts) => {
    if (!ts) return "—";
    const d = Math.floor((Date.now() - new Date(ts)) / 86400000);
    if (d === 0) return "Hari ini";
    if (d === 1) return "Kemarin";
    return `${d} hari lalu`;
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <p style={{ color:"var(--text-secondary)", fontSize:"0.8rem", margin:0 }}>
          {students.length} peserta terdaftar di kursus ini.
        </p>
        <div style={{ display:"flex", gap:8 }}>
          <input type="text" placeholder="Cari nama / email..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft:10, height:32, fontSize:"0.78rem", width:180 }} />
          <button onClick={load} className="btn btn-secondary" style={{ width:"auto", padding:"0 10px", height:32, fontSize:"0.72rem" }}>↻</button>
        </div>
      </div>

      {saveMsg && (
        <div style={{ fontSize:"0.78rem", padding:"6px 12px", borderRadius:6, marginBottom:12,
          background: saveMsg.startsWith("✓") ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
          color: saveMsg.startsWith("✓") ? "#6ee7b7" : "#fca5a5",
          border: `1px dashed ${saveMsg.startsWith("✓") ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}` }}>
          {saveMsg}
        </div>
      )}

      {/* Form penilaian */}
      {grading && (
        <div className="glass-card" style={{ padding:16, marginBottom:16, border:"1px solid rgba(249, 115, 22,0.3)" }}>
          <p style={{ fontSize:"0.8rem", fontWeight:700, color:"var(--primary)", marginBottom:10 }}>
            Nilai Tugas — {grading.email}
          </p>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <div className="form-group" style={{ margin:0, width:100 }}>
              <label style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>Nilai (0–100)</label>
              <input type="number" min={0} max={100} value={grading.grade}
                onChange={e => setGrading(p => ({...p, grade: Number(e.target.value)}))}
                style={{ paddingLeft:10, height:36, fontSize:"0.9rem", fontWeight:700 }} />
            </div>
            <div className="form-group" style={{ margin:0, flex:1 }}>
              <label style={{ fontSize:"0.72rem", color:"var(--text-muted)" }}>Feedback (opsional)</label>
              <input type="text" value={grading.feedback}
                onChange={e => setGrading(p => ({...p, feedback: e.target.value}))}
                placeholder="Catatan untuk peserta..."
                style={{ paddingLeft:10, height:36, fontSize:"0.8rem" }} />
            </div>
            <div style={{ display:"flex", gap:6, alignItems:"flex-end" }}>
              <button onClick={handleGrade} className="btn btn-primary" style={{ width:"auto", height:36, padding:"0 14px", fontSize:"0.8rem" }}>
                <Star size={12} style={{ marginRight:4 }} />Simpan
              </button>
              <button onClick={() => setGrading(null)} className="btn btn-secondary" style={{ width:"auto", height:36, padding:"0 10px", fontSize:"0.8rem" }}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color:"var(--text-muted)", textAlign:"center", padding:20 }}>Memuat data peserta...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color:"var(--text-muted)", fontSize:"0.8rem", textAlign:"center", padding:20 }}>
          {students.length === 0 ? "Belum ada peserta terdaftar." : "Tidak ada peserta sesuai pencarian."}
        </p>
      ) : (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", fontSize:"0.76rem", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:"2px solid var(--border-color)", color:"var(--text-secondary)", textAlign:"left" }}>
                {["Peserta","Organisasi","Progress","Lessons","Skor Terbaik","Attempt","Aktif Terakhir","Nilai Tugas","Aksi"].map(h => (
                  <th key={h} style={{ padding:"7px 10px", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={i} style={{ borderBottom:"1px solid var(--border-color)" }}>
                  <td style={{ padding:"8px 10px" }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(249, 115, 22,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.7rem", fontWeight:700, color:"#fdba74", flexShrink:0 }}>
                        {(s.avatar || s.fullname?.charAt(0) || "?").toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight:600 }}>{s.fullname || "—"}</div>
                        <div style={{ fontSize:"0.65rem", color:"var(--text-muted)" }}>{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:"8px 10px", fontSize:"0.72rem", color:"var(--text-secondary)" }}>{s.organization || "—"}</td>
                  <td style={{ padding:"8px 10px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ width:60, height:6, background:"rgba(255,255,255,0.1)", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", background: s.avg_progress >= 80 ? "#6ee7b7" : s.avg_progress >= 50 ? "#fde68a" : "#fdba74", width:`${s.avg_progress||0}%` }} />
                      </div>
                      <span style={{ fontSize:"0.7rem" }}>{pct(s.avg_progress)}</span>
                    </div>
                  </td>
                  <td style={{ padding:"8px 10px", textAlign:"center" }}>{s.lessons_completed || 0}</td>
                  <td style={{ padding:"8px 10px", textAlign:"center" }}>
                    {s.best_score != null ? (
                      <span style={{ color: s.has_passed ? "#6ee7b7" : "#fca5a5", fontWeight:600 }}>{pct(s.best_score)}</span>
                    ) : "—"}
                  </td>
                  <td style={{ padding:"8px 10px", textAlign:"center" }}>{s.attempt_count || 0}x</td>
                  <td style={{ padding:"8px 10px", fontSize:"0.7rem", color:"var(--text-muted)" }}>{timeAgo(s.last_active)}</td>
                  <td style={{ padding:"8px 10px", textAlign:"center" }}>
                    {s.assignment_grade != null ? (
                      <span style={{ color: s.assignment_grade >= 70 ? "#6ee7b7" : "#fca5a5", fontWeight:700 }}>
                        {s.assignment_grade}
                      </span>
                    ) : <span style={{ color:"var(--text-muted)" }}>—</span>}
                  </td>
                  <td style={{ padding:"8px 10px" }}>
                    <button onClick={() => setGrading({ email: s.email, grade: s.assignment_grade || 0, feedback: s.assignment_feedback || "" })}
                      className="btn btn-secondary" style={{ width:"auto", padding:"3px 10px", fontSize:"0.68rem" }}>
                      <Star size={10} style={{ marginRight:3 }} />Nilai
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab Konfigurasi Ujian ────────────────────────────────────────────────────
function ExamConfigTab({ selectedLmsCourse, setSelectedLmsCourse, courses }) {
  const cfg = selectedLmsCourse?.examSettings || {};
  const set = (key, val) => setSelectedLmsCourse(prev => ({
    ...prev,
    examSettings: { ...(prev.examSettings || {}), [key]: val }
  }));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div className="form-group" style={{ margin:0 }}>
          <label style={{ fontSize:"0.75rem", color:"var(--text-secondary)", display:"block", marginBottom:6 }}>Batas Waktu Ujian (menit)</label>
          <input type="number" min={5} max={180} value={cfg.timeLimit || 30}
            onChange={e => set("timeLimit", parseInt(e.target.value))}
            style={{ paddingLeft:12 }} />
        </div>
        <div className="form-group" style={{ margin:0 }}>
          <label style={{ fontSize:"0.75rem", color:"var(--text-secondary)", display:"block", marginBottom:6 }}>Nilai Kelulusan (%)</label>
          <input type="number" min={0} max={100} value={cfg.passingScore || 70}
            onChange={e => set("passingScore", parseInt(e.target.value))}
            style={{ paddingLeft:12 }} />
        </div>
        <div className="form-group" style={{ margin:0 }}>
          <label style={{ fontSize:"0.75rem", color:"var(--text-secondary)", display:"block", marginBottom:6 }}>Maks. Percobaan</label>
          <input type="number" min={1} max={10} value={cfg.maxAttempts || 3}
            onChange={e => set("maxAttempts", parseInt(e.target.value))}
            style={{ paddingLeft:12 }} />
        </div>
        <div className="form-group" style={{ margin:0 }}>
          <label style={{ fontSize:"0.75rem", color:"var(--text-secondary)", display:"block", marginBottom:6 }}>Jml Soal per Ujian</label>
          <input type="number" min={1} max={100} value={cfg.questionsPerExam || 10}
            onChange={e => set("questionsPerExam", parseInt(e.target.value))}
            style={{ paddingLeft:12 }} />
        </div>
      </div>

      <div className="form-group" style={{ margin:0 }}>
        <label style={{ fontSize:"0.75rem", color:"var(--text-secondary)", display:"block", marginBottom:6 }}>Prasyarat Kursus (harus selesai sebelum membuka ini)</label>
        <select value={selectedLmsCourse?.prerequisiteCourseId || ""}
          onChange={e => setSelectedLmsCourse(prev => ({ ...prev, prerequisiteCourseId: e.target.value || null }))}
          style={{ height:36, fontSize:"0.82rem", padding:"0 10px", borderRadius:6, border:"1px solid var(--border-color)", background:"var(--bg-secondary)", color:"var(--text-primary)", width:"100%" }}>
          <option value="">— Tidak ada prasyarat —</option>
          {(courses||[]).filter(c => c.id !== selectedLmsCourse?.id).map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      <div style={{ display:"flex", gap:16 }}>
        <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:"0.82rem" }}>
          <input type="checkbox" checked={!!cfg.shuffleQuestions}
            onChange={e => set("shuffleQuestions", e.target.checked)}
            style={{ width:16, height:16 }} />
          Acak urutan soal
        </label>
        <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:"0.82rem" }}>
          <input type="checkbox" checked={!!cfg.showResult}
            onChange={e => set("showResult", e.target.checked)}
            style={{ width:16, height:16 }} />
          Tampilkan hasil langsung setelah ujian
        </label>
      </div>
    </div>
  );
}

// ── Main Modal Export ────────────────────────────────────────────────────────
export default function LmsManageModal() {
  const {
    lmsManageModalActive, setLmsManageModalActive,
    selectedLmsCourse,    setSelectedLmsCourse,
    lmsManageTab,         setLmsManageTab,
    handleLmsSaveAll,
    handleLmsAddModule,   handleLmsDeleteModule,
    handleLmsModuleTitleChange,
    handleLmsAddLesson,   handleLmsDeleteLesson,
    handleLmsLessonChange,
    courses,
  } = useApp();

  const [uploadMsg, setUploadMsg]           = useState("");
  const [uploadingLesson, setUploadingLesson] = useState(null);

  if (!lmsManageModalActive || !selectedLmsCourse) return null;

  const handleFileUpload = async (modIdx, lessonIdx, file) => {
    setUploadingLesson({ modIdx, lessonIdx });
    setUploadMsg("");
    try {
      const ext  = file.name.split(".").pop().toLowerCase();
      const type = ["mp4","webm","mov"].includes(ext) ? "video" : "pptx";
      const courseId = selectedLmsCourse.id;

      // 1. Deteksi strategi upload
      const stratRes  = await fetch("/api/upload/presigned");
      const stratData = await stratRes.json();

      if (stratData.strategy === "drive") {
        // ── Google Drive ──────────────────────────────────────
        setUploadMsg("⏳ Mengupload ke Google Drive...");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("courseId", courseId);
        const uploadRes  = await fetch("/api/upload/drive", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) throw new Error(uploadData.error || "Upload Drive gagal");
        handleLmsLessonChange(modIdx, lessonIdx, "url",  uploadData.url);
        handleLmsLessonChange(modIdx, lessonIdx, "type", type);
        setUploadMsg(`✓ ${file.name} berhasil diupload ke Google Drive`);

      } else if (stratData.strategy === "s3") {
        // ── S3 / R2 ───────────────────────────────────────────
        const s3Res  = await fetch("/api/upload/presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type, courseId }),
        });
        const s3Data = await s3Res.json();
        await fetch(s3Data.url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
        handleLmsLessonChange(modIdx, lessonIdx, "url",  s3Data.finalUrl);
        handleLmsLessonChange(modIdx, lessonIdx, "type", type);
        setUploadMsg(`✓ ${file.name} berhasil diupload ke S3`);

      } else {
        // ── Mock / Demo ───────────────────────────────────────
        handleLmsLessonChange(modIdx, lessonIdx, "url",  `/uploads/${file.name}`);
        handleLmsLessonChange(modIdx, lessonIdx, "type", type);
        setUploadMsg(`⚠ Demo mode: isi URL materi secara manual`);
      }
    } catch (err) {
      setUploadMsg(`✕ Upload gagal: ${err.message}`);
    }
    setUploadingLesson(null);
  };

  return (
    <div className="modal-overlay active" onClick={() => setLmsManageModalActive(false)}>
      <div className="modal-content" style={{ maxWidth: 820, width: "95vw", maxHeight: "88vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>Kelola Kursus: <span style={{ color: "var(--primary)" }}>{selectedLmsCourse.title}</span></h3>
          <button onClick={() => setLmsManageModalActive(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="filter-pills" style={{ marginBottom: 20, flexWrap: "wrap" }}>
          <div className={`filter-pill ${lmsManageTab === "materials" ? "active" : ""}`} onClick={() => setLmsManageTab("materials")}>
            <Book size={14} style={{ marginRight: 6, verticalAlign: "middle" }} /> Silabus Materi
          </div>
          <div className={`filter-pill ${lmsManageTab === "quiz" ? "active" : ""}`} onClick={() => setLmsManageTab("quiz")}>
            <FileText size={14} style={{ marginRight: 6, verticalAlign: "middle" }} /> Soal Ujian
          </div>
          <div className={`filter-pill ${lmsManageTab === "bank" ? "active" : ""}`} onClick={() => setLmsManageTab("bank")}>
            <Database size={14} style={{ marginRight: 6, verticalAlign: "middle" }} /> Bank Soal
          </div>
          <div className={`filter-pill ${lmsManageTab === "config" ? "active" : ""}`} onClick={() => setLmsManageTab("config")}>
            <Settings size={14} style={{ marginRight: 6, verticalAlign: "middle" }} /> Konfigurasi Ujian
          </div>
          <div className={`filter-pill ${lmsManageTab === "students" ? "active" : ""}`} onClick={() => setLmsManageTab("students")}>
            <Users size={14} style={{ marginRight: 6, verticalAlign: "middle" }} /> Peserta
          </div>
        </div>

        {/* ── Tab: Silabus Materi ─────────────────────────────────── */}
        {lmsManageTab === "materials" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button type="button" className="btn btn-primary" style={{ width: "auto", padding: "6px 12px", fontSize: "0.8rem" }} onClick={handleLmsAddModule}>
                <PlusCircle size={14} style={{ marginRight: 6 }} /> Tambah Modul Baru
              </button>
            </div>

            {uploadMsg && (
              <div style={{ fontSize: "0.75rem", padding: "6px 12px", borderRadius: 6, marginBottom: 12,
                background: uploadMsg.startsWith("✓") ? "rgba(16,185,129,0.1)" : uploadMsg.startsWith("⚠") ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px dashed ${uploadMsg.startsWith("✓") ? "rgba(16,185,129,0.3)" : uploadMsg.startsWith("⚠") ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}`,
                color: uploadMsg.startsWith("✓") ? "#6ee7b7" : uploadMsg.startsWith("⚠") ? "#fde68a" : "#fca5a5" }}>
                {uploadMsg}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {selectedLmsCourse.modules.map((mod, modIdx) => (
                <div key={modIdx} className="glass-card" style={{ padding: 18, border: "1px solid var(--border-color)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div className="form-group" style={{ margin: 0, flexGrow: 1, marginRight: 16 }}>
                      <input type="text" value={mod.title} onChange={(e) => handleLmsModuleTitleChange(modIdx, e.target.value)} placeholder="Judul Modul" required style={{ paddingLeft: 12 }} />
                    </div>
                    <button type="button" className="btn btn-secondary" style={{ width: "auto", padding: 8, borderColor: "rgba(239,68,68,0.2)" }} onClick={() => handleLmsDeleteModule(modIdx)}>
                      <Trash size={14} style={{ color: "var(--danger)" }} />
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 12 }}>
                    {mod.lessons.map((lesson, lessonIdx) => {
                      const lessonObj   = typeof lesson === "string" ? { title: lesson, type: "text", url: "" } : lesson;
                      const isUploading = uploadingLesson?.modIdx === modIdx && uploadingLesson?.lessonIdx === lessonIdx;
                      return (
                        <div key={lessonIdx} style={{ background: "rgba(255,255,255,0.02)", padding: "10px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <input type="text" value={lessonObj.title} onChange={(e) => handleLmsLessonChange(modIdx, lessonIdx, "title", e.target.value)} style={{ flex: 1, paddingLeft: 10, height: 32, fontSize: "0.8rem", marginRight: 8 }} />
                            <button type="button" style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0 }} onClick={() => handleLmsDeleteLesson(modIdx, lessonIdx)}>
                              <X size={12} style={{ color: "var(--text-muted)" }} />
                            </button>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <select value={lessonObj.type} onChange={(e) => handleLmsLessonChange(modIdx, lessonIdx, "type", e.target.value)} style={{ height: 32, fontSize: "0.75rem", padding: "0 8px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-secondary)", color: "var(--text-primary)", minWidth: 140, cursor: "pointer" }}>
                              <option value="text">Teks/Bacaan</option>
                              <option value="video">Video URL</option>
                              <option value="pptx">Presentasi (PPTX/PDF)</option>
                            </select>
                            {lessonObj.type !== "text" && (
                              <>
                                <input type="text" value={lessonObj.url || ""} onChange={(e) => handleLmsLessonChange(modIdx, lessonIdx, "url", e.target.value)} placeholder="URL atau upload file..." style={{ flex: 1, paddingLeft: 10, height: 32, fontSize: "0.75rem", minWidth: 180 }} />
                                <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: "0 10px", height: 32, borderRadius: 6, border: "1px solid rgba(249, 115, 22,0.3)", fontSize: "0.73rem", color: "#fdba74", background: "rgba(249, 115, 22,0.05)", flexShrink: 0 }}>
                                  {isUploading ? <Loader size={12} className="spin" /> : <UploadCloud size={12} />}
                                  {isUploading ? "Uploading..." : "Upload"}
                                  <input type="file" accept={lessonObj.type === "video" ? "video/*" : ".pptx,.pdf"} style={{ display: "none" }} onChange={(e) => { if (e.target.files[0]) handleFileUpload(modIdx, lessonIdx, e.target.files[0]); }} />
                                </label>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <button type="button" style={{ background: "none", border: "1px dashed rgba(249, 115, 22,0.3)", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: "0.75rem", color: "#fdba74", display: "flex", alignItems: "center", gap: 6, width: "fit-content" }} onClick={() => handleLmsAddLesson(modIdx)}>
                      <PlusCircle size={12} /> Tambah Lesson
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab: Soal Ujian ──────────────────────────────────────── */}
        {lmsManageTab === "quiz" && (
          <div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: 16 }}>
              Kelola soal ujian langsung dalam kursus ini. Jika Bank Soal diisi, soal dari bank akan diutamakan saat ujian.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {(selectedLmsCourse.quiz || []).map((q, qIdx) => (
                <div key={qIdx} className="glass-card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Soal {qIdx + 1}</span>
                    <button type="button" style={{ background: "none", border: "none", cursor: "pointer" }} onClick={() => setSelectedLmsCourse(prev => ({ ...prev, quiz: prev.quiz.filter((_, i) => i !== qIdx) }))}>
                      <Trash size={13} style={{ color: "var(--danger)" }} />
                    </button>
                  </div>
                  <input type="text" value={q.question} onChange={e => setSelectedLmsCourse(prev => { const quiz = [...prev.quiz]; quiz[qIdx] = {...quiz[qIdx], question: e.target.value}; return {...prev, quiz}; })} placeholder="Pertanyaan..." style={{ paddingLeft: 10, marginBottom: 10 }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                    {(q.options || ["","","",""]).map((opt, oIdx) => (
                      <div key={oIdx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input type="radio" name={`correct-${qIdx}`} checked={q.correct === oIdx} onChange={() => setSelectedLmsCourse(prev => { const quiz = [...prev.quiz]; quiz[qIdx] = {...quiz[qIdx], correct: oIdx}; return {...prev, quiz}; })} />
                        <input type="text" value={opt} onChange={e => setSelectedLmsCourse(prev => { const quiz = [...prev.quiz]; const opts = [...(quiz[qIdx].options||[])]; opts[oIdx] = e.target.value; quiz[qIdx] = {...quiz[qIdx], options: opts}; return {...prev, quiz}; })} placeholder={`Pilihan ${String.fromCharCode(65+oIdx)}`} style={{ flex: 1, paddingLeft: 8, height: 30, fontSize: "0.78rem" }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-secondary" style={{ width: "auto", padding: "8px 16px", fontSize: "0.8rem" }}
                onClick={() => setSelectedLmsCourse(prev => ({ ...prev, quiz: [...(prev.quiz||[]), { question:"", options:["","","",""], correct:0 }] }))}>
                <PlusCircle size={14} style={{ marginRight: 6 }} /> Tambah Soal Baru
              </button>
            </div>
          </div>
        )}

        {/* ── Tab: Bank Soal ───────────────────────────────────────── */}
        {lmsManageTab === "bank" && (
          <QuestionBankTab courseId={selectedLmsCourse?.id} />
        )}

        {/* ── Tab: Konfigurasi Ujian ───────────────────────────────── */}
        {lmsManageTab === "config" && (
          <ExamConfigTab selectedLmsCourse={selectedLmsCourse} setSelectedLmsCourse={setSelectedLmsCourse} courses={courses} />
        )}

        {/* ── Tab: Peserta (Dashboard Instruktur) ─────────────────── */}
        {lmsManageTab === "students" && (
          <InstructorDashboard courseId={selectedLmsCourse?.id} />
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 28, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-secondary" style={{ width: "auto" }} onClick={() => setLmsManageModalActive(false)}>Batal</button>
          <button type="button" className="btn btn-primary" style={{ width: "auto" }} onClick={handleLmsSaveAll}>
            <span>Simpan Semua Perubahan</span><Check size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
