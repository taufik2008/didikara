import { Shield, Lock, FileText, CheckCircle2, UserCheck, Eye, RefreshCw } from "lucide-react";

export const metadata = {
  title: "Kebijakan Privasi (UU PDP) — DIDIKARA",
  description: "Kebijakan Pelindungan Data Pribadi DIDIKARA sesuai Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP).",
};

export default function PrivasiPage() {
  return (
    <div>
      {/* Header Banner */}
      <div style={{ marginBottom: 36, borderBottom: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))", paddingBottom: 24 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 999, background: "rgba(56, 189, 248, 0.1)", color: "#38bdf8", fontSize: "0.8rem", fontWeight: 700, marginBottom: 12 }}>
          <Shield size={14} />
          <span>Kepatuhan UU No. 27 Tahun 2022 (UU PDP)</span>
        </div>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 800, marginBottom: 10, letterSpacing: "-0.02em" }}>
          Kebijakan Privasi & Pelindungan Data Pribadi
        </h1>
        <p style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "0.95rem" }}>
          Versi Kebijakan: <strong>2026-10-v1.0</strong> • Berlaku Efektif: 15 Oktober 2026
        </p>
      </div>

      {/* Content Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 32, fontSize: "0.95rem", color: "var(--text-secondary, #cbd5e1)" }}>
        <section>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary, #f8fafc)", marginBottom: 12 }}>
            1. Komitmen Pengendali Data
          </h2>
          <p style={{ marginBottom: 12 }}>
            Platform <strong>DIDIKARA</strong> berkomitmen melindungi hak privasi setiap pengguna (peserta mandiri, aparatur pemerintah, karyawan korporat, maupun instruktur) sesuai dengan <strong>Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)</strong>.
          </p>
          <p>
            Dalam dokumen ini, kami menjelaskan hakikat data pribadi yang kami kumpulkan, dasar pemrosesan hukum, tujuan pemanfaatan, penyimpanan, serta hak-hak Anda sebagai Subjek Data Pribadi.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary, #f8fafc)", marginBottom: 12 }}>
            2. Jenis Data Pribadi yang Kami Kumpulkan
          </h2>
          <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <li>
              <strong>Data Identitas Pribadi:</strong> Nama lengkap, alamat email resmi/instansi, gelar profesional, jabatan (job title), dan nama organisasi/instansi pemerintah yang didaftarkan.
            </li>
            <li>
              <strong>Data Kredensial & Autentikasi:</strong> Kata sandi dalam bentuk enkripsi satu arah (hash kriptografis berstandar tinggi), token sesi berbatas waktu, dan token reset password ber-hash sekali pakai.
            </li>
            <li>
              <strong>Data Aktivitas Akademik & Kompetensi:</strong> Riwayat modul pembelajaran, presensi live class, rekaman nilai kuis, hasil ujian asesmen, dan data sertifikasi kompetensi.
            </li>
            <li>
              <strong>Data Transaksi & Finansial:</strong> Riwayat tagihan faktur (invoice), nomor referensi pembayaran, bukti transfer manual, atau status transaksi Midtrans Snap. Kami <em>tidak pernah</em> menyimpan informasi kartu kredit mentah di server kami.
            </li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary, #f8fafc)", marginBottom: 12 }}>
            3. Dasar Hukum & Tujuan Pemrosesan Data
          </h2>
          <p style={{ marginBottom: 12 }}>
            Pemrosesan data pribadi oleh DIDIKARA berlandaskan pada persetujuan eksplisit (consent) saat pendaftaran serta pelaksanaan kontrak pemenuhan layanan pelatihan:
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid var(--border-color, rgba(255,255,255,0.08))", borderRadius: 12, padding: 18 }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#38bdf8", marginBottom: 6 }}>Penerbitan Sertifikat & Akreditasi</h3>
              <p style={{ fontSize: "0.88rem", margin: 0 }}>
                Memvalidasi kepesertaan dan mencantumkan nama penerima sertifikat pada dokumen digital resmi serta portal verifikasi publik ber-QR Code.
              </p>
            </div>
            <div style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid var(--border-color, rgba(255,255,255,0.08))", borderRadius: 12, padding: 18 }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#38bdf8", marginBottom: 6 }}>Pelaporan Kepatuhan Instansi (B2B/B2G)</h3>
              <p style={{ fontSize: "0.88rem", margin: 0 }}>
                Menyediakan matriks kompetensi dan laporan kehadiran peserta kepada Pengelola Kepegawaian (HRD/Biro SDM) instansi yang menugaskan peserta.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary, #f8fafc)", marginBottom: 12 }}>
            4. Keamanan & Enkripsi Data
          </h2>
          <p style={{ marginBottom: 10 }}>
            DIDIKARA menerapkan standar pengamanan teknis dan manajerial tingkat industri:
          </p>
          <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            <li>Seluruh jalur komunikasi data diamankan dengan TLS/HTTPS 256-bit.</li>
            <li>Kredensial integrasi sensitif (kunci API, token SMTP, Google Drive) dienkripsi menggunakan algoritma AES-256-GCM.</li>
            <li>Akses basis data dilindungi isolasi jaringan dan pencatatan audit log komprehensif pada setiap mutasi data penting.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary, #f8fafc)", marginBottom: 12 }}>
            5. Hak Anda Sebagai Subjek Data Pribadi (UU PDP)
          </h2>
          <p style={{ marginBottom: 12 }}>
            Sesuai Pasal 5 hingga Pasal 13 UU No. 27 Tahun 2022, Anda memiliki hak:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 3 }} />
              <div><strong>Hak Akses & Portabilitas:</strong> Memperoleh salinan data riwayat pelatihan dan sertifikat kompetensi Anda.</div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 3 }} />
              <div><strong>Hak Pembaruan & Koreksi:</strong> Memperbarui informasi profil atau nama lengkap yang tercetak di sertifikat.</div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 3 }} />
              <div><strong>Hak Penghapusan (Right to Erasure):</strong> Memohon penonaktifan akun dengan batas retensi yang disyaratkan oleh regulasi kearsipan keuangan negara.</div>
            </div>
          </div>
        </section>

        <section style={{ borderTop: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))", paddingTop: 24 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary, #f8fafc)", marginBottom: 10 }}>
            6. Kontak Petugas Pelindungan Data (DPO)
          </h2>
          <p>
            Apabila Anda memiliki pertanyaan, pengaduan, atau hendak menggunakan hak-hak pelindungan data pribadi Anda, hubungi tim DIDIKARA melalui:
          </p>
          <p style={{ marginTop: 8 }}>
            <strong>Email:</strong> privacy@didikara.id / dpo@didikara.id<br />
            <strong>Alamat Operasional:</strong> Gedung Diklat Nasional DIDIKARA, Jakarta, Indonesia.
          </p>
        </section>
      </div>
    </div>
  );
}
