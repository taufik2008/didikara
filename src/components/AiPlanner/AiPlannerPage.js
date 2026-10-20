"use client";
import { Cpu, User, Landmark, Compass, Award, Route, CheckCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";

function GovPlanner() {
  const { govForm, govLoading, govResult, setGovForm, handleGovGenerate } = useApp();

  return (
    <div className="glass-panel" style={{ padding: 28, marginBottom: 28 }}>
      <h3 style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
        <Cpu size={18} style={{ color: "var(--primary)" }} /> AI Training Recommendation Engine
      </h3>
      <form className="ai-planner-form" onSubmit={handleGovGenerate}>
        <div className="form-group">
          <label>Lembaga / Organisasi / Komunitas (Opsional)</label>
          <div className="input-wrapper">
            <Landmark size={16} className="input-icon" />
            <input type="text" value={govForm.instansi} onChange={(e) => setGovForm({ ...govForm, instansi: e.target.value })} required />
          </div>
        </div>
        <div className="form-group">
          <label>Jabatan Target</label>
          <div className="input-wrapper">
            <User size={16} className="input-icon" />
            <input type="text" value={govForm.jabatan} onChange={(e) => setGovForm({ ...govForm, jabatan: e.target.value })} required />
          </div>
        </div>
        <div className="form-group">
          <label>Kompetensi Target</label>
          <div className="input-wrapper">
            <Compass size={16} className="input-icon" />
            <select value={govForm.target} onChange={(e) => setGovForm({ ...govForm, target: e.target.value })} style={{ paddingLeft: 40 }}>
              <option value="Data Analytics & AI">Data Analytics & Artificial Intelligence</option>
              <option value="Procurement & Contract">Procurement & Contract Management</option>
              <option value="ESG & Leadership">ESG & Corporate Governance</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Jumlah Pegawai</label>
          <div className="input-wrapper">
            <User size={16} className="input-icon" />
            <input type="number" value={govForm.pegawai} onChange={(e) => setGovForm({ ...govForm, pegawai: parseInt(e.target.value) || 0 })} min="1" required />
          </div>
        </div>
        <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="btn btn-primary" style={{ width: "auto" }} disabled={govLoading}>
            {govLoading ? "Menganalisis dengan AI..." : <><Cpu size={16} style={{ marginRight: 6 }} /> Rekomendasikan Program (AI)</>}
          </button>
        </div>
      </form>
      {govResult && (
        <div className="ai-planner-result active">
          <h4 style={{ marginBottom: 12, color: "var(--text-accent)", display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle size={16} style={{ color: "var(--success)" }} /> Output Rekomendasi AI Engine
          </h4>
          {govResult.message && <div style={{ fontSize: "0.75rem", color: "var(--warning)", marginBottom: 16, backgroundColor: "rgba(245,158,11,0.1)", padding: 8, border: "1px dashed rgba(245,158,11,0.2)", borderRadius: 6 }}>{govResult.message}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
            <div className="glass-card" style={{ padding: 12 }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Estimasi Anggaran</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f59e0b", marginTop: 4 }}>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(govResult.budget)}</div>
            </div>
            <div className="glass-card" style={{ padding: 12 }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Estimasi Durasi</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--info)", marginTop: 4 }}>{govResult.duration}</div>
            </div>
            <div className="glass-card" style={{ padding: 12 }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Jadwal Pelaksanaan</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--success)", marginTop: 4 }}>
                {govResult.schedule || `Kuartal ${Math.floor(new Date().getMonth() / 3) + 1} (${["Jan - Mar", "Apr - Jun", "Jul - Sep", "Okt - Des"][Math.floor(new Date().getMonth() / 3)]} ${new Date().getFullYear()})`}
              </div>
            </div>
          </div>
          <h5 style={{ marginBottom: 12 }}>Learning & Certification Path:</h5>
          <div className="learning-path-timeline">
            {govResult.steps.map((step, idx) => (
              <div key={idx} className="timeline-step">
                <div className="timeline-title">{step.title}</div>
                <div className="timeline-desc">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CorpPlanner() {
  const { corpForm, corpLoading, corpResult, setCorpForm, handleCorpGenerate } = useApp();

  return (
    <div className="glass-panel" style={{ padding: 28 }}>
      <h3 style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
        <Route size={18} style={{ color: "#fb923c" }} /> Competency Development Planner
      </h3>
      <form className="ai-planner-form" onSubmit={handleCorpGenerate}>
        <div className="form-group">
          <label>Jabatan Saat Ini</label>
          <div className="input-wrapper">
            <User size={16} className="input-icon" />
            <input type="text" value={corpForm.currentJob} onChange={(e) => setCorpForm({ ...corpForm, currentJob: e.target.value })} required />
          </div>
        </div>
        <div className="form-group">
          <label>Jabatan Target</label>
          <div className="input-wrapper">
            <Award size={16} className="input-icon" />
            <input type="text" value={corpForm.targetJob} onChange={(e) => setCorpForm({ ...corpForm, targetJob: e.target.value })} required />
          </div>
        </div>
        <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="btn btn-primary" style={{ width: "auto", background: "linear-gradient(135deg, #fb923c 0%, #f97316 100%)" }} disabled={corpLoading}>
            {corpLoading ? "Menyusun dengan AI..." : <><Compass size={16} style={{ marginRight: 6 }} /> Susun Roadmap Jabatan</>}
          </button>
        </div>
      </form>
      {corpResult && (
        <div className="ai-planner-result active">
          <h4 style={{ marginBottom: 12, color: "#f472b6", display: "flex", alignItems: "center", gap: 8 }}>
            <Cpu size={16} style={{ color: "#f472b6" }} /> Analisis Kesenjangan & Roadmap Karir AI
          </h4>
          {corpResult.message && <div style={{ fontSize: "0.75rem", color: "var(--warning)", marginBottom: 16, backgroundColor: "rgba(245,158,11,0.1)", padding: 8, border: "1px dashed rgba(245,158,11,0.2)", borderRadius: 6 }}>{corpResult.message}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div className="glass-card" style={{ padding: 16 }}>
              <h5 style={{ color: "var(--danger)", marginBottom: 8 }}>Skill Gap yang Terdeteksi:</h5>
              <ul style={{ fontSize: "0.85rem", paddingLeft: 18, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {corpResult.gaps.map((gap, i) => <li key={i}>{gap}</li>)}
              </ul>
            </div>
            <div className="glass-card" style={{ padding: 16, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Estimasi Biaya per Orang:</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#f43f5e", marginTop: 4 }}>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(corpResult.cost)}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 8 }}>Estimasi Waktu: <strong>{corpResult.time}</strong></div>
            </div>
          </div>
          <h5 style={{ marginBottom: 12 }}>Roadmap Pengembangan Karir:</h5>
          <div className="learning-path-timeline">
            {corpResult.steps.map((step, idx) => (
              <div key={idx} className="timeline-step">
                <div className="timeline-title">{step.title}</div>
                <div className="timeline-desc">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AiPlannerPage() {
  const { currentUser } = useApp();

  return (
    <main className="page-view active">
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: "1.8rem", marginBottom: 6 }}>{currentUser?.role === 'government' ? 'Government AI Competency Planning Portal' : 'Corporate AI Competency Planning Portal'}</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Gunakan kecerdasan buatan untuk merencanakan jalur pembelajaran dan pengembangan kompetensi Anda secara otomatis.</p>
      </div>
      {currentUser?.role === 'government' && <GovPlanner />}
      <CorpPlanner />
    </main>
  );
}
