"use client";
import { useState, useEffect, useCallback } from "react";
import { X, Book, FileText, Settings, PlusCircle, Trash, Check, UploadCloud, Loader, Database, Users, Star } from "lucide-react";
import { useApp } from "@/context/AppContext";

// ── Helper untuk membaca response JSON dengan aman tanpa crash JSON.parse HTML ──
async function parseResponseJson(res) {
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    if (res.status === 413 || text.includes("413") || text.includes("PAYLOAD_TOO_LARGE") || text.includes("too large")) {
      throw new Error(
        "Ukuran file melebihi batas upload langsung server (maksimal 4.5 MB di Vercel). " +
        "Untuk video materi MP4, masukkan link video langsung (Google Drive, YouTube, Vimeo, atau direct URL MP4) pada kolom URL materi, atau hubungkan Cloud Storage (S3 / R2) di Pengaturan Platform."
      );
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("Sesi login Anda telah kedaluwarsa atau tidak berwenang. Silakan refresh dan login ulang.");
    }
    if (res.status === 504 || text.includes("Gateway Timeout")) {
      throw new Error("Waktu unggah habis (Timeout). File terlalu besar untuk koneksi saat ini.");
    }
    const cleanText = text.replace(/<[^>]+>/g, " ").trim().slice(0, 140);
    throw new Error(`Server merespons error (HTTP ${res.status}): ${cleanText || "Terjadi kesalahan internal"}`);
  }
  return data;
}

// ── Upload file materi ke S3 (atau mock) ──────────────────────────────────────
async function uploadMaterialFile(file, courseId, onProgress) {
  // 1. Minta presigned URL dari server
  const res = await fetch("/api/upload/presigned", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, contentType: file.type, courseId }),
  });
  const data = await parseResponseJson(res);
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
    { key: "easy",   label: "Mudah",   color: "var(--success)" },
    { key: "medium", label: "Sedang",  color: "var(--warning)" },
    { key: "hard",   label: "Sulit",   color: "var(--danger)" },
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

  const diffColor = (d) => DIFFICULTIES.find(x => x.key === d)?.color || "var(--text-muted)";
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
              style={{ padding: "5px 12px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer",
                background: filterDiff === d.key ? "var(--primary)" : "var(--bg-tertiary)",
                border: `1.5px solid ${filterDiff === d.key ? "var(--primary)" : "var(--border-color)"}`,
                color: filterDiff === d.key ? "#ffffff" : d.color }}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div style={{ fontSize: "0.78rem", padding: "8px 14px", borderRadius: 8, marginBottom: 14,
          background: msg.startsWith("✓") ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${msg.startsWith("✓") ? "var(--success)" : "var(--danger)"}`,
          color: msg.startsWith("✓") ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>
          {msg}
        </div>
      )}

      {/* Form tambah/edit */}
      <div className="glass-card" style={{ padding: "22px 24px", marginBottom: 24, border: "1.5px solid var(--border-color)", borderRadius: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <p style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--primary)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            {editId ? "✏ Edit Soal Bank" : "＋ Tambah Soal Baru ke Bank"}
          </p>

          {/* Type Selector Pills */}
          <div style={{ display: "flex", gap: 6, background: "var(--bg-tertiary)", padding: 3, borderRadius: 8, border: "1px solid var(--border-color)" }}>
            {[
              { key: "single", label: "🔘 Pilihan Ganda (1 Jawaban)" },
              { key: "multiple", label: "☑️ Pilihan Ganda Kompleks" },
              { key: "essay", label: "📝 Soal Uraian (Essay)" },
            ].map(t => {
              const active = (form.type || (Array.isArray(form.correct) ? "multiple" : (form.options && form.options.length > 0 ? "single" : "essay"))) === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    if (t.key === "single") {
                      setForm(p => ({ ...p, type: "single", correct: Array.isArray(p.correct) ? (p.correct[0] || 0) : (typeof p.correct === "number" ? p.correct : 0), options: p.options?.length ? p.options : ["","","",""] }));
                    } else if (t.key === "multiple") {
                      setForm(p => ({ ...p, type: "multiple", correct: Array.isArray(p.correct) ? p.correct : [typeof p.correct === "number" ? p.correct : 0], options: p.options?.length ? p.options : ["","","",""] }));
                    } else {
                      setForm(p => ({ ...p, type: "essay", correct: typeof p.correct === "string" ? p.correct : "", options: [] }));
                    }
                  }}
                  style={{
                    padding: "4px 10px", borderRadius: 6, border: "none", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
                    background: active ? "var(--primary)" : "transparent",
                    color: active ? "#ffffff" : "var(--text-secondary)",
                  }}>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Teks Pertanyaan Utama */}
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span>Teks Pertanyaan Soal</span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 400 }}>Mendukung deskripsi panjang &amp; studi kasus</span>
          </label>
          <textarea
            value={form.question}
            onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
            placeholder="Tuliskan pertanyaan ujian atau studi kasus secara lengkap dan jelas di sini..."
            rows={3}
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 8,
              border: "1.5px solid var(--border-color)", background: "var(--bg-tertiary)",
              color: "var(--text-primary)", fontSize: "0.88rem", lineHeight: 1.5, resize: "vertical",
              boxSizing: "border-box", minHeight: 75,
            }}
          />
        </div>

        {/* Form Options vs Essay Rubric */}
        {form.type === "essay" ? (
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 6, display: "block" }}>
              Rubrik Penilaian / Kunci Jawaban Acuan (Opsional)
            </label>
            <textarea
              value={typeof form.correct === "string" ? form.correct : (form.rubric || "")}
              onChange={e => setForm(p => ({ ...p, correct: e.target.value, rubric: e.target.value }))}
              placeholder="Tuliskan poin-poin kunci jawaban acuan atau kata kunci untuk memandu instruktur dalam menilai jawaban peserta..."
              rows={2}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8,
                border: "1px solid var(--border-color)", background: "var(--bg-secondary)",
                color: "var(--text-primary)", fontSize: "0.85rem", lineHeight: 1.4, resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>
        ) : (
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 8 }}>
              Pilihan Jawaban (Klik huruf A/B/C/D untuk menentukan {form.type === "multiple" ? "satu atau lebih kunci jawaban benar" : "kunci jawaban benar"})
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {(form.options || ["","","",""]).map((opt, i) => {
                const isMultiple = form.type === "multiple";
                const isCorrect = isMultiple
                  ? Array.isArray(form.correct) && form.correct.includes(i)
                  : form.correct === i;
                const letter = String.fromCharCode(65 + i);
                return (
                  <div
                    key={i}
                    style={{
                      background: isCorrect ? "rgba(16, 185, 129, 0.08)" : "var(--bg-tertiary)",
                      border: `1.5px solid ${isCorrect ? "var(--success)" : "var(--border-color)"}`,
                      borderRadius: 10, padding: "10px 14px",
                      display: "flex", alignItems: "center", gap: 10,
                      transition: "all 0.2s",
                    }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isMultiple) {
                          const curr = Array.isArray(form.correct) ? form.correct : [];
                          const next = curr.includes(i) ? curr.filter(idx => idx !== i) : [...curr, i].sort();
                          setForm(p => ({ ...p, correct: next }));
                        } else {
                          setForm(p => ({ ...p, correct: i }));
                        }
                      }}
                      title={isCorrect ? "Kunci Jawaban Benar" : `Klik untuk jadikan Pilihan ${letter} sebagai kunci`}
                      style={{
                        width: 32, height: 32, borderRadius: isMultiple ? 6 : 8, flexShrink: 0,
                        background: isCorrect ? "var(--success)" : "rgba(255,255,255,0.06)",
                        color: isCorrect ? "#fff" : "var(--text-secondary)",
                        border: `1px solid ${isCorrect ? "var(--success)" : "var(--border-color)"}`,
                        fontWeight: 800, fontSize: "0.85rem", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                      {letter}
                    </button>
                    <input
                      type="text"
                      value={opt}
                      onChange={e => {
                        const opts = [...(form.options || ["","","",""])];
                        opts[i] = e.target.value;
                        setForm(p => ({ ...p, options: opts }));
                      }}
                      placeholder={`Teks pilihan ${letter}...`}
                      style={{
                        flex: 1, padding: "8px 12px", border: "1px solid var(--border-color)",
                        borderRadius: 6, fontSize: "0.85rem", background: "var(--bg-secondary)",
                        color: "var(--text-primary)", boxSizing: "border-box",
                      }}
                    />
                    {isCorrect && (
                      <span style={{ fontSize: "0.72rem", color: "var(--success)", fontWeight: 700, flexShrink: 0 }}>
                        ✓ Kunci
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tingkat Kesulitan, Kategori, dan Aksi */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end", paddingTop: 12, borderTop: "1px dashed var(--border-color)" }}>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Tingkat Kesulitan</label>
            <select value={form.difficulty} onChange={e => setForm(p => ({ ...p, difficulty: e.target.value }))}
              style={{ height: 38, fontSize: "0.85rem", padding: "0 10px" }}>
              {DIFFICULTIES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, flex: 1.5, minWidth: 180 }}>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Kategori / Topik (Opsional)</label>
            <input type="text" value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              placeholder="Contoh: Hukum PBJ, AI Ethics..." style={{ paddingLeft: 12, height: 38, fontSize: "0.85rem" }} />
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {editId && (
              <button onClick={handleCancelEdit} type="button" className="btn btn-secondary" style={{ width: "auto", height: 38, padding: "0 16px", fontSize: "0.85rem" }}>
                Batal
              </button>
            )}
            <button onClick={handleSave} type="button" disabled={saving} className="btn btn-primary" style={{ width: "auto", height: 38, padding: "0 20px", fontSize: "0.85rem", fontWeight: 700 }}>
              {saving ? <Loader size={14} style={{ animation: "spin 1s linear infinite" }} /> : (editId ? "Perbarui Soal" : "＋ Simpan Soal")}
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
            <div key={q.id} style={{ background: "var(--bg-card)", padding: "14px 16px", borderRadius: 10, border: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>#{i+1}</span>
                    <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 10,
                      background: "var(--bg-tertiary)", color: diffColor(q.difficulty),
                      border: `1.5px solid var(--border-color)`, fontWeight: 700 }}>
                      {diffLabel(q.difficulty)}
                    </span>
                    {q.category && (
                      <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 10,
                        background: "var(--accent-badge-bg)", color: "var(--text-accent)", border: "1px solid var(--accent-badge-border)", fontWeight: 600 }}>
                        {q.category}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", margin: "0 0 8px 0", fontWeight: 600, lineHeight: 1.4 }}>{q.question}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {(Array.isArray(q.options) ? q.options : JSON.parse(q.options)).map((opt, oi) => (
                      <span key={oi} style={{ fontSize: "0.75rem", color: oi === q.correct ? "var(--success)" : "var(--text-secondary)",
                        fontWeight: oi === q.correct ? 700 : 400 }}>
                        {oi === q.correct ? "✓ " : "  "}{opt}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => handleEdit(q)} className="btn btn-secondary"
                    style={{ width: "auto", padding: "6px 12px", fontSize: "0.75rem" }}>Edit</button>
                  <button onClick={() => handleDelete(q.id)} className="btn btn-secondary"
                    style={{ width: "auto", padding: 8, borderColor: "rgba(239,68,68,0.25)" }}>
                    <Trash size={14} style={{ color: "var(--danger)" }} />
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
        <div style={{ fontSize:"0.78rem", padding:"8px 14px", borderRadius:8, marginBottom:12,
          background: saveMsg.startsWith("✓") ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
          color: saveMsg.startsWith("✓") ? "var(--success)" : "var(--danger)",
          border: `1px solid ${saveMsg.startsWith("✓") ? "var(--success)" : "var(--danger)"}`, fontWeight: 600 }}>
          {saveMsg}
        </div>
      )}

      {/* Form penilaian */}
      {grading && (
        <div className="glass-card" style={{ padding:18, marginBottom:16, border:"1.5px solid var(--primary)" }}>
          <p style={{ fontSize:"0.85rem", fontWeight:700, color:"var(--primary)", marginBottom:10 }}>
            Nilai Tugas — {grading.email}
          </p>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <div className="form-group" style={{ margin:0, width:110 }}>
              <label style={{ fontSize:"0.75rem", color:"var(--text-muted)", fontWeight: 600 }}>Nilai (0–100)</label>
              <input type="number" min={0} max={100} value={grading.grade}
                onChange={e => setGrading(p => ({...p, grade: Number(e.target.value)}))}
                style={{ paddingLeft:10, height:38, fontSize:"0.9rem", fontWeight:700 }} />
            </div>
            <div className="form-group" style={{ margin:0, flex:1, minWidth: 200 }}>
              <label style={{ fontSize:"0.75rem", color:"var(--text-muted)", fontWeight: 600 }}>Feedback (opsional)</label>
              <input type="text" value={grading.feedback}
                onChange={e => setGrading(p => ({...p, feedback: e.target.value}))}
                placeholder="Catatan untuk peserta..."
                style={{ paddingLeft:10, height:38, fontSize:"0.85rem" }} />
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
              <button onClick={handleGrade} className="btn btn-primary" style={{ width:"auto", height:38, padding:"0 18px", fontSize:"0.85rem", fontWeight: 700 }}>
                <Star size={14} style={{ marginRight:4 }} />Simpan
              </button>
              <button onClick={() => setGrading(null)} className="btn btn-secondary" style={{ width:"auto", height:38, padding:"0 14px", fontSize:"0.85rem" }}>Batal</button>
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
          <table style={{ width:"100%", fontSize:"0.78rem", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:"2px solid var(--border-color)", color:"var(--text-secondary)", textAlign:"left" }}>
                {["Peserta","Organisasi","Progress","Lessons","Skor Terbaik","Attempt","Aktif Terakhir","Nilai Tugas","Aksi"].map(h => (
                  <th key={h} style={{ padding:"8px 10px", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={i} style={{ borderBottom:"1px solid var(--border-color)" }}>
                  <td style={{ padding:"8px 10px" }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <div style={{ width:28, height:28, borderRadius:"50%", background:"var(--accent-badge-bg)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.7rem", fontWeight:700, color:"var(--text-accent)", flexShrink:0 }}>
                        {(s.avatar || s.fullname?.charAt(0) || "?").toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, color:"var(--text-primary)" }}>{s.fullname || "—"}</div>
                        <div style={{ fontSize:"0.68rem", color:"var(--text-muted)" }}>{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:"8px 10px", fontSize:"0.75rem", color:"var(--text-secondary)" }}>{s.organization || "—"}</td>
                  <td style={{ padding:"8px 10px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ width:60, height:6, background:"var(--bg-tertiary)", borderRadius:3, overflow:"hidden", border:"1px solid var(--border-color)" }}>
                        <div style={{ height:"100%", background: s.avg_progress >= 80 ? "var(--success)" : s.avg_progress >= 50 ? "var(--warning)" : "var(--primary)", width:`${s.avg_progress||0}%` }} />
                      </div>
                      <span style={{ fontSize:"0.72rem", fontWeight:600 }}>{pct(s.avg_progress)}</span>
                    </div>
                  </td>
                  <td style={{ padding:"8px 10px", textAlign:"center", fontWeight:500 }}>{s.lessons_completed || 0}</td>
                  <td style={{ padding:"8px 10px", textAlign:"center" }}>
                    {s.best_score != null ? (
                      <span style={{ color: s.has_passed ? "var(--success)" : "var(--danger)", fontWeight:700 }}>{pct(s.best_score)}</span>
                    ) : "—"}
                  </td>
                  <td style={{ padding:"8px 10px", textAlign:"center" }}>{s.attempt_count || 0}x</td>
                  <td style={{ padding:"8px 10px", fontSize:"0.72rem", color:"var(--text-muted)" }}>{timeAgo(s.last_active)}</td>
                  <td style={{ padding:"8px 10px", textAlign:"center" }}>
                    {s.assignment_grade != null ? (
                      <span style={{ color: s.assignment_grade >= 70 ? "var(--success)" : "var(--danger)", fontWeight:700 }}>
                        {s.assignment_grade}
                      </span>
                    ) : <span style={{ color:"var(--text-muted)" }}>—</span>}
                  </td>
                  <td style={{ padding:"8px 10px" }}>
                    <button onClick={() => setGrading({ email: s.email, grade: s.assignment_grade || 0, feedback: s.assignment_feedback || "" })}
                      className="btn btn-secondary" style={{ width:"auto", padding:"4px 12px", fontSize:"0.72rem" }}>
                      <Star size={11} style={{ marginRight:3 }} />Nilai
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

  // Tutup dengan Esc. Sebelumnya satu-satunya cara menutup lewat latar adalah
  // klik tetikus. Hook harus berada sebelum early-return di bawah.
  useEffect(() => {
    if (!lmsManageModalActive) return;
    const onKey = (e) => { if (e.key === "Escape") setLmsManageModalActive(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lmsManageModalActive, setLmsManageModalActive]);

  if (!lmsManageModalActive || !selectedLmsCourse) return null;

  const handleFileUpload = async (modIdx, lessonIdx, file) => {
    setUploadingLesson({ modIdx, lessonIdx });
    setUploadMsg("");
    try {
      const ext  = file.name.split(".").pop().toLowerCase();
      const type = ["mp4","webm","mov","mkv"].includes(ext) ? "video" : "pptx";
      const isVideo = type === "video";
      const fileSizeMB = file.size / (1024 * 1024);
      const courseId = selectedLmsCourse.id;

      // 1. Deteksi strategi upload
      let stratData = { strategy: "local" };
      try {
        const stratRes = await fetch("/api/upload/presigned");
        if (stratRes.ok) {
          stratData = await parseResponseJson(stratRes);
        }
      } catch {
        stratData = { strategy: "local" };
      }

      // 2. Proteksi ukuran berkas untuk Vercel / serverless (batas payload Vercel 4.5 MB)
      if (stratData?.strategy === "none" || (stratData?.strategy === "local" && (stratData?.isVercel || fileSizeMB > 4.5))) {
        if (isVideo) {
          throw new Error(
            `File video "${file.name}" (${fileSizeMB.toFixed(1)} MB) melebihi batas upload langsung serverless (${fileSizeMB > 4.5 ? "maksimal 4.5 MB di Vercel" : "penyimpanan lokal tidak tersedia di cloud"}).\n\n` +
            `💡 Solusi Praktis: Unggah video Anda ke Google Drive / YouTube / Vimeo, lalu tempelkan link URL tersebut ke kolom URL materi di samping.`
          );
        }
      }

      if (stratData?.strategy === "drive") {
        // ── Google Drive ──────────────────────────────────────
        if (fileSizeMB > 4.5 && stratData?.isVercel) {
          throw new Error(
            `File video "${file.name}" (${fileSizeMB.toFixed(1)} MB) melebihi batas upload serverless Vercel (4.5 MB).\n\n` +
            `💡 Silakan unggah video langsung ke Google Drive Anda, lalu tempelkan link share Google Drive tersebut ke kolom URL materi.`
          );
        }
        setUploadMsg("⏳ Mengupload ke Google Drive...");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("courseId", courseId);
        const uploadRes  = await fetch("/api/upload/drive", { method: "POST", body: formData });
        const uploadData = await parseResponseJson(uploadRes);
        if (!uploadData.success) throw new Error(uploadData.error || "Upload Google Drive gagal");
        handleLmsLessonChange(modIdx, lessonIdx, "url",  uploadData.url);
        handleLmsLessonChange(modIdx, lessonIdx, "type", type);
        setUploadMsg(`✓ ${file.name} berhasil diupload ke Google Drive`);

      } else if (stratData?.strategy === "s3") {
        // ── S3 / R2 ───────────────────────────────────────────
        setUploadMsg("⏳ Mengupload ke penyimpanan Cloud S3...");
        const s3Res  = await fetch("/api/upload/presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type || (isVideo ? "video/mp4" : "application/pdf"), courseId }),
        });
        const s3Data = await parseResponseJson(s3Res);
        if (!s3Data.success || !s3Data.url) throw new Error(s3Data.error || "Gagal membuat URL upload S3");
        const putRes = await fetch(s3Data.url, { method: "PUT", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } });
        if (!putRes.ok) throw new Error(`Gagal mengunggah file ke S3 (HTTP ${putRes.status})`);
        handleLmsLessonChange(modIdx, lessonIdx, "url",  s3Data.finalUrl);
        handleLmsLessonChange(modIdx, lessonIdx, "type", type);
        setUploadMsg(`✓ ${file.name} berhasil diupload ke S3`);

      } else {
        // ── Local / Server Upload ────────────────────────
        if (fileSizeMB > 4.5) {
          throw new Error(
            `File video "${file.name}" (${fileSizeMB.toFixed(1)} MB) melebihi batas upload langsung server (maksimal 4.5 MB).\n\n` +
            `💡 Solusi Praktis: Masukkan link video langsung (Google Drive, YouTube, Vimeo, atau direct URL MP4) pada kolom URL materi di samping.`
          );
        }
        setUploadMsg("⏳ Mengunggah file ke server lokal...");
        const uploadRes = await fetch("/api/upload/local", {
          method: "POST",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "x-filename": encodeURIComponent(file.name),
            "x-course-id": encodeURIComponent(String(courseId || "")),
          },
          body: file,
        });
        const uploadData = await parseResponseJson(uploadRes);
        if (uploadData.success && uploadData.url) {
          handleLmsLessonChange(modIdx, lessonIdx, "url",  uploadData.url);
          handleLmsLessonChange(modIdx, lessonIdx, "type", type);
          setUploadMsg(`✓ ${file.name} berhasil diunggah (${uploadData.url})`);
        } else {
          throw new Error(uploadData.error || "Gagal mengunggah ke penyimpanan lokal");
        }
      }
    } catch (err) {
      setUploadMsg(`✕ Upload gagal: ${err.message}`);
    }
    setUploadingLesson(null);
  };

  return (
    // Latar bisa diklik untuk menutup; Esc ditangani oleh useEffect di atas
    // agar modal tetap bisa ditutup tanpa tetikus.
    <div className="modal-overlay active" role="dialog" aria-modal="true"
      onClick={() => setLmsManageModalActive(false)}>
      <div className="modal-content" style={{ maxWidth: 980, width: "95vw", maxHeight: "90vh", overflowY: "auto", padding: "28px" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>Kelola Kursus: <span style={{ color: "var(--primary)" }}>{selectedLmsCourse.title}</span></h3>
          <button onClick={() => setLmsManageModalActive(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="filter-pills" style={{ marginBottom: 20, flexWrap: "wrap" }}>
          <button type="button" className={`filter-pill ${lmsManageTab === "materials" ? "active" : ""}`} onClick={() => setLmsManageTab("materials")}>
            <Book size={14} style={{ marginRight: 6, verticalAlign: "middle" }} /> Silabus Materi
          </button>
          <button type="button" className={`filter-pill ${lmsManageTab === "quiz" ? "active" : ""}`} onClick={() => setLmsManageTab("quiz")}>
            <FileText size={14} style={{ marginRight: 6, verticalAlign: "middle" }} /> Soal Ujian
          </button>
          <button type="button" className={`filter-pill ${lmsManageTab === "bank" ? "active" : ""}`} onClick={() => setLmsManageTab("bank")}>
            <Database size={14} style={{ marginRight: 6, verticalAlign: "middle" }} /> Bank Soal
          </button>
          <button type="button" className={`filter-pill ${lmsManageTab === "config" ? "active" : ""}`} onClick={() => setLmsManageTab("config")}>
            <Settings size={14} style={{ marginRight: 6, verticalAlign: "middle" }} /> Konfigurasi Ujian
          </button>
          <button type="button" className={`filter-pill ${lmsManageTab === "students" ? "active" : ""}`} onClick={() => setLmsManageTab("students")}>
            <Users size={14} style={{ marginRight: 6, verticalAlign: "middle" }} /> Peserta
          </button>
        </div>

        {/* ── Tab: Silabus Materi ─────────────────────────────────── */}
        {lmsManageTab === "materials" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button type="button" className="btn btn-primary" style={{ width: "auto", padding: "10px 20px", fontSize: "0.85rem", fontWeight: 700, borderRadius: 8 }} onClick={handleLmsAddModule}>
                <PlusCircle size={16} /> Tambah Modul Baru
              </button>
            </div>

            {uploadMsg && (
              <div style={{ fontSize: "0.82rem", padding: "10px 14px", borderRadius: 8, marginBottom: 14,
                whiteSpace: "pre-line", lineHeight: 1.55,
                background: uploadMsg.startsWith("✓") ? "rgba(16,185,129,0.12)" : uploadMsg.startsWith("⚠") ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)",
                border: `1px solid ${uploadMsg.startsWith("✓") ? "var(--success)" : uploadMsg.startsWith("⚠") ? "var(--warning)" : "var(--danger)"}`,
                color: uploadMsg.startsWith("✓") ? "var(--success)" : uploadMsg.startsWith("⚠") ? "var(--warning)" : "var(--danger)", fontWeight: 600 }}>
                {uploadMsg}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {selectedLmsCourse.modules.map((mod, modIdx) => (
                <div key={modIdx} className="glass-card" style={{ padding: 20, border: "1.5px solid var(--border-color)", borderRadius: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div className="form-group" style={{ margin: 0, flexGrow: 1, marginRight: 16 }}>
                      <input type="text" value={mod.title} onChange={(e) => handleLmsModuleTitleChange(modIdx, e.target.value)} placeholder="Judul Modul" required style={{ paddingLeft: 14, fontWeight: 700, fontSize: "0.95rem" }} />
                    </div>
                    <button type="button" className="btn btn-secondary" style={{ width: "auto", padding: 10, borderColor: "rgba(239,68,68,0.25)" }} onClick={() => handleLmsDeleteModule(modIdx)}>
                      <Trash size={15} style={{ color: "var(--danger)" }} />
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 8 }}>
                    {mod.lessons.map((lesson, lessonIdx) => {
                      const lessonObj   = typeof lesson === "string" ? { title: lesson, type: "text", url: "" } : lesson;
                      const isUploading = uploadingLesson?.modIdx === modIdx && uploadingLesson?.lessonIdx === lessonIdx;
                      return (
                        <div key={lessonIdx} style={{ background: "var(--bg-card)", padding: "12px 14px", borderRadius: 8, border: "1px solid var(--border-color)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <input type="text" value={lessonObj.title} onChange={(e) => handleLmsLessonChange(modIdx, lessonIdx, "title", e.target.value)} style={{ flex: 1, paddingLeft: 10, height: 34, fontSize: "0.85rem", marginRight: 8, fontWeight: 500 }} />
                            <button type="button" style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 4 }} onClick={() => handleLmsDeleteLesson(modIdx, lessonIdx)}>
                              <X size={14} style={{ color: "var(--text-muted)" }} />
                            </button>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <select value={lessonObj.type} onChange={(e) => handleLmsLessonChange(modIdx, lessonIdx, "type", e.target.value)} style={{ height: 34, fontSize: "0.8rem", padding: "0 10px", borderRadius: 6, border: "1.5px solid var(--border-color)", background: "var(--bg-secondary)", color: "var(--text-primary)", minWidth: 150, cursor: "pointer", fontWeight: 600 }}>
                                <option value="text">📖 Teks/Bacaan</option>
                                <option value="video">🎬 Video (YouTube/MP4)</option>
                                <option value="pptx">📄 Presentasi / PDF Dokumen</option>
                              </select>
                              {lessonObj.type !== "text" && (
                                <>
                                  <input
                                    type="text"
                                    value={lessonObj.url || ""}
                                    onChange={(e) => {
                                       const val = e.target.value;
                                       handleLmsLessonChange(modIdx, lessonIdx, "url", val);
                                       if (val.match(/\.(pdf|pptx|ppt)$/i) && lessonObj.type !== "pptx") {
                                         handleLmsLessonChange(modIdx, lessonIdx, "type", "pptx");
                                       } else if ((val.includes("youtube.com") || val.includes("youtu.be") || val.includes("vimeo.com") || val.includes("drive.google.com") || val.match(/\.(mp4|webm|mov|mkv)$/i)) && lessonObj.type !== "video") {
                                         handleLmsLessonChange(modIdx, lessonIdx, "type", "video");
                                       }
                                     }}
                                     placeholder={lessonObj.type === "video" ? "URL MP4, YouTube, Vimeo, Google Drive..." : "URL PDF, Slide PPTX, Google Drive..."}
                                     style={{ flex: 1, paddingLeft: 12, height: 34, fontSize: "0.8rem", minWidth: 180 }}
                                  />
                                  <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "0 12px", height: 34, borderRadius: 6, border: "1px solid var(--accent-badge-border)", fontSize: "0.75rem", color: "var(--text-accent)", background: "var(--accent-badge-bg)", fontWeight: 600, flexShrink: 0 }}>
                                    {isUploading ? <Loader size={13} className="spin" /> : <UploadCloud size={13} />}
                                    {isUploading ? "Uploading..." : "Upload File"}
                                    <input type="file" accept={lessonObj.type === "video" ? "video/*" : ".pptx,.pdf"} style={{ display: "none" }} onChange={(e) => { if (e.target.files[0]) handleFileUpload(modIdx, lessonIdx, e.target.files[0]); }} />
                                  </label>
                                </>
                              )}
                            </div>

                            {/* Preset Demo URL Chips */}
                            {lessonObj.type !== "text" && (
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", paddingLeft: 2 }}>
                                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>Demo Presets:</span>
                                {lessonObj.type === "video" ? (
                                  <>
                                    <button
                                      type="button"
                                      style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-tertiary)", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 600 }}
                                      onClick={() => handleLmsLessonChange(modIdx, lessonIdx, "url", "https://www.youtube.com/watch?v=kYJv_t7H6_I")}
                                    >
                                      ▶ YouTube PBJ
                                    </button>
                                    <button
                                      type="button"
                                      style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-tertiary)", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 600 }}
                                      onClick={() => handleLmsLessonChange(modIdx, lessonIdx, "url", "https://www.youtube.com/watch?v=aircAruvnKk")}
                                    >
                                      ▶ YouTube AI Intro
                                    </button>
                                    <button
                                      type="button"
                                      style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-tertiary)", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 600 }}
                                      onClick={() => handleLmsLessonChange(modIdx, lessonIdx, "url", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4")}
                                    >
                                      🎬 Direct MP4
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-tertiary)", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 600 }}
                                    onClick={() => handleLmsLessonChange(modIdx, lessonIdx, "url", "https://raw.githubusercontent.com/mozilla/pdf.js/master/examples/learning/helloworld.pdf")}
                                  >
                                    📄 Demo PDF Modul
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <button type="button" style={{ background: "var(--accent-badge-bg)", border: "1px dashed var(--accent-badge-border)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: "0.78rem", color: "var(--text-accent)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, width: "fit-content" }} onClick={() => handleLmsAddLesson(modIdx)}>
                      <PlusCircle size={14} /> Tambah Lesson
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0, maxWidth: 620 }}>
                Kelola daftar soal ujian untuk kursus ini. Setiap soal memiliki teks pertanyaan lengkap dan 4 pilihan jawaban dengan 1 kunci jawaban benar.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: "auto", padding: "8px 18px", fontSize: "0.85rem", fontWeight: 700 }}
                onClick={() => setSelectedLmsCourse(prev => ({ ...prev, quiz: [...(prev.quiz||[]), { question:"", options:["","","",""], correct:0 }] }))}>
                <PlusCircle size={15} style={{ marginRight: 6 }} /> Tambah Soal
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {(selectedLmsCourse.quiz || []).map((q, qIdx) => (
                <div key={qIdx} className="glass-card" style={{ padding: "22px 24px", border: "1.5px solid var(--border-color)", borderRadius: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        background: "var(--primary)", color: "#fff", padding: "4px 12px",
                        borderRadius: 6, fontSize: "0.78rem", fontWeight: 800, letterSpacing: 0.5,
                      }}>
                        SOAL #{qIdx + 1}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {q.type === "essay" ? "Soal Uraian / Jawaban Esai Peserta" : q.type === "multiple" ? "Klik huruf untuk memilih satu atau lebih kunci jawaban benar" : "Klik huruf A/B/C/D untuk menentukan kunci jawaban benar"}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {/* Type Switcher */}
                      <div style={{ display: "flex", gap: 4, background: "var(--bg-tertiary)", padding: 2, borderRadius: 6, border: "1px solid var(--border-color)" }}>
                        {[
                          { key: "single", label: "🔘 Tunggal" },
                          { key: "multiple", label: "☑️ Kompleks" },
                          { key: "essay", label: "📝 Essay" },
                        ].map(t => {
                          const active = (q.type || (Array.isArray(q.correct) ? "multiple" : (q.options && q.options.length > 0 ? "single" : "essay"))) === t.key;
                          return (
                            <button
                              key={t.key}
                              type="button"
                              onClick={() => setSelectedLmsCourse(prev => {
                                const quiz = [...prev.quiz];
                                if (t.key === "single") {
                                  quiz[qIdx] = { ...quiz[qIdx], type: "single", correct: Array.isArray(quiz[qIdx].correct) ? (quiz[qIdx].correct[0] || 0) : (typeof quiz[qIdx].correct === "number" ? quiz[qIdx].correct : 0), options: quiz[qIdx].options?.length ? quiz[qIdx].options : ["","","",""] };
                                } else if (t.key === "multiple") {
                                  quiz[qIdx] = { ...quiz[qIdx], type: "multiple", correct: Array.isArray(quiz[qIdx].correct) ? quiz[qIdx].correct : [typeof quiz[qIdx].correct === "number" ? quiz[qIdx].correct : 0], options: quiz[qIdx].options?.length ? quiz[qIdx].options : ["","","",""] };
                                } else {
                                  quiz[qIdx] = { ...quiz[qIdx], type: "essay", correct: typeof quiz[qIdx].correct === "string" ? quiz[qIdx].correct : "", options: [] };
                                }
                                return { ...prev, quiz };
                              })}
                              style={{
                                padding: "3px 8px", borderRadius: 4, border: "none", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer",
                                background: active ? "var(--primary)" : "transparent",
                                color: active ? "#ffffff" : "var(--text-secondary)",
                              }}>
                              {t.label}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        title="Hapus soal ini"
                        style={{
                          background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)",
                          borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                          color: "var(--danger)", fontSize: "0.75rem", fontWeight: 600,
                        }}
                        onClick={() => setSelectedLmsCourse(prev => ({ ...prev, quiz: prev.quiz.filter((_, i) => i !== qIdx) }))}>
                        <Trash size={13} /> Hapus
                      </button>
                    </div>
                  </div>

                  {/* Teks Pertanyaan Utama */}
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 6, display: "block" }}>
                      Teks Pertanyaan Soal
                    </label>
                    <textarea
                      rows={3}
                      value={q.question || ""}
                      onChange={e => setSelectedLmsCourse(prev => {
                        const quiz = [...prev.quiz];
                        quiz[qIdx] = { ...quiz[qIdx], question: e.target.value };
                        return { ...prev, quiz };
                      })}
                      placeholder="Tuliskan pertanyaan ujian atau studi kasus secara lengkap dan proporsional di sini..."
                      style={{
                        width: "100%", padding: "12px 14px", borderRadius: 8,
                        border: "1.5px solid var(--border-color)", background: "var(--bg-tertiary)",
                        color: "var(--text-primary)", fontSize: "0.88rem", lineHeight: 1.5, resize: "vertical",
                        boxSizing: "border-box", minHeight: 75,
                      }}
                    />
                  </div>

                  {/* Pilihan Jawaban vs Essay Rubric */}
                  {q.type === "essay" ? (
                    <div className="form-group" style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 6, display: "block" }}>
                        Rubrik Penilaian / Kunci Jawaban Acuan (Opsional)
                      </label>
                      <textarea
                        rows={2}
                        value={typeof q.correct === "string" ? q.correct : (q.rubric || "")}
                        onChange={e => setSelectedLmsCourse(prev => {
                          const quiz = [...prev.quiz];
                          quiz[qIdx] = { ...quiz[qIdx], correct: e.target.value, rubric: e.target.value };
                          return { ...prev, quiz };
                        })}
                        placeholder="Tuliskan poin-poin kunci jawaban acuan atau kata kunci untuk memandu instruktur dalam menilai jawaban peserta..."
                        style={{
                          width: "100%", padding: "10px 12px", borderRadius: 8,
                          border: "1px solid var(--border-color)", background: "var(--bg-secondary)",
                          color: "var(--text-primary)", fontSize: "0.85rem", lineHeight: 1.4, resize: "vertical",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  ) : (
                    <div>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 8, display: "block" }}>
                        Pilihan Jawaban &amp; Kunci Jawaban
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        {(q.options || ["","","",""]).map((opt, oIdx) => {
                          const isMultiple = q.type === "multiple";
                          const isCorrect = isMultiple
                            ? Array.isArray(q.correct) && q.correct.includes(oIdx)
                            : q.correct === oIdx;
                          const letter = String.fromCharCode(65 + oIdx);
                          return (
                            <div
                              key={oIdx}
                              style={{
                                background: isCorrect ? "rgba(16, 185, 129, 0.08)" : "var(--bg-tertiary)",
                                border: `1.5px solid ${isCorrect ? "var(--success)" : "var(--border-color)"}`,
                                borderRadius: 10, padding: "10px 14px",
                                display: "flex", alignItems: "center", gap: 10,
                                transition: "all 0.2s",
                              }}>
                              <button
                                type="button"
                                onClick={() => setSelectedLmsCourse(prev => {
                                  const quiz = [...prev.quiz];
                                  if (isMultiple) {
                                    const curr = Array.isArray(quiz[qIdx].correct) ? quiz[qIdx].correct : [];
                                    const next = curr.includes(oIdx) ? curr.filter(idx => idx !== oIdx) : [...curr, oIdx].sort();
                                    quiz[qIdx] = { ...quiz[qIdx], correct: next };
                                  } else {
                                    quiz[qIdx] = { ...quiz[qIdx], correct: oIdx };
                                  }
                                  return { ...prev, quiz };
                                })}
                                title={`Jadikan pilihan ${letter} sebagai kunci jawaban benar`}
                                style={{
                                  width: 32, height: 32, borderRadius: isMultiple ? 6 : 8, flexShrink: 0,
                                  background: isCorrect ? "var(--success)" : "rgba(255,255,255,0.06)",
                                  color: isCorrect ? "#fff" : "var(--text-secondary)",
                                  border: `1px solid ${isCorrect ? "var(--success)" : "var(--border-color)"}`,
                                  fontWeight: 800, fontSize: "0.85rem", cursor: "pointer",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                {letter}
                              </button>
                              <input
                                type="text"
                                value={opt}
                                onChange={e => setSelectedLmsCourse(prev => {
                                  const quiz = [...prev.quiz];
                                  const opts = [...(quiz[qIdx].options || ["","","",""])];
                                  opts[oIdx] = e.target.value;
                                  quiz[qIdx] = { ...quiz[qIdx], options: opts };
                                  return { ...prev, quiz };
                                })}
                                placeholder={`Teks pilihan ${letter}...`}
                                style={{
                                  flex: 1, padding: "8px 12px", border: "1px solid var(--border-color)",
                                  borderRadius: 6, fontSize: "0.85rem", background: "var(--bg-secondary)",
                                  color: "var(--text-primary)", boxSizing: "border-box",
                                }}
                              />
                              {isCorrect && (
                                <span style={{ fontSize: "0.72rem", color: "var(--success)", fontWeight: 700, flexShrink: 0 }}>
                                  ✓ Kunci
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  width: "100%", padding: "14px", fontSize: "0.88rem", fontWeight: 700,
                  border: "1.5px dashed var(--border-color)", borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
                onClick={() => setSelectedLmsCourse(prev => ({ ...prev, quiz: [...(prev.quiz||[]), { question:"", options:["","","",""], correct:0 }] }))}>
                <PlusCircle size={16} /> Tambah Soal Ujian Baru
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

        <div style={{ display: "flex", gap: 14, marginTop: 32, paddingTop: 18, borderTop: "1px solid var(--border-color)", justifyContent: "flex-end", alignItems: "center" }}>
          <button type="button" className="btn btn-secondary" style={{ width: "auto", padding: "12px 24px", fontSize: "0.9rem", fontWeight: 600 }} onClick={() => setLmsManageModalActive(false)}>
            Batal
          </button>
          <button type="button" className="btn btn-primary" style={{ width: "auto", padding: "12px 32px", fontSize: "0.92rem", fontWeight: 700, borderRadius: 10, boxShadow: "0 4px 18px rgba(249,115,22,0.38)", display: "inline-flex", alignItems: "center", gap: 10 }} onClick={handleLmsSaveAll}>
            <Check size={18} />
            <span>Simpan Semua Perubahan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
