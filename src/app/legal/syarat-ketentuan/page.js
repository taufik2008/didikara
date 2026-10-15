import { FileCheck, BookOpen, AlertCircle, Scale, ShieldAlert, Award } from "lucide-react";

export const metadata = {
  title: "Syarat & Ketentuan Layanan — DIDIKARA",
  description: "Syarat dan Ketentuan Penggunaan Platform Pelatihan dan Sertifikasi Terakreditasi DIDIKARA.",
};

export default function SyaratKetentuanPage() {
  return (
    <div>
      {/* Header Banner */}
      <div style={{ marginBottom: 36, borderBottom: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))", paddingBottom: 24 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 999, background: "rgba(59, 130, 246, 0.1)", color: "#60a5fa", fontSize: "0.8rem", fontWeight: 700, marginBottom: 12 }}>
          <Scale size={14} />
          <span>Perjanjian Penggunaan Platform</span>
        </div>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 800, marginBottom: 10, letterSpacing: "-0.02em" }}>
          Syarat & Ketentuan Layanan DIDIKARA
        </h1>
        <p style={{ color: "var(--text-secondary, #94a3b8)", fontSize: "0.95rem" }}>
          Versi Ketentuan: <strong>2026-10-v1.0</strong> • Berlaku Efektif: 15 Oktober 2026
        </p>
      </div>

      {/* Content Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 32, fontSize: "0.95rem", color: "var(--text-secondary, #cbd5e1)" }}>
        <section>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary, #f8fafc)", marginBottom: 12 }}>
            1. Penerimaan Syarat & Ketentuan
          </h2>
          <p>
            Dengan mendaftarkan akun, mengakses materi, atau mengikuti program uji sertifikasi di <strong>DIDIKARA</strong>, Anda menyatakan telah membaca, memahami, dan menyetujui untuk terikat secara hukum pada Syarat dan Ketentuan ini. Jika Anda mendaftarkan akun atas nama instansi pemerintah atau korporat, Anda menjamin memiliki wewenang untuk mengikat entitas tersebut.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary, #f8fafc)", marginBottom: 12 }}>
            2. Akun Pengguna & Kewajiban Keamanan
          </h2>
          <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <li>Setiap akun bersifat personal dan tidak dapat dialihkan tanpa persetujuan tertulis dari DIDIKARA.</li>
            <li>Pengguna dilarang membagikan kredensial login (email dan kata sandi) kepada pihak lain. Sistem menerapkan pemantauan sesi login aktif untuk mendeteksi penggunaan akun bersamaan yang tidak sah.</li>
            <li>Pengguna wajib memberikan informasi identitas yang akurat dan sah demi keabsahan sertifikat kompetensi yang akan diterbitkan.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary, #f8fafc)", marginBottom: 12 }}>
            3. Integritas Akademik & Pelaksanaan Ujian
          </h2>
          <p style={{ marginBottom: 12 }}>
            Sebagai platform sertifikasi standar nasional dan mitra instansi, integritas ujian adalah prioritas tertinggi:
          </p>
          <div style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid var(--border-color, rgba(255,255,255,0.08))", borderRadius: 12, padding: 18 }}>
            <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8, margin: 0 }}>
              <li>Ujian akhir (final exam) memiliki batasan percobaan (max attempts) dan batas waktu yang ditegakkan secara otomatis oleh sistem.</li>
              <li>Tindakan plagiarisme, penyebaran bank soal, joki ujian, atau manipulasi respons ujian akan mengakibatkan pembatalan sertifikat dan pelaporan kepada instansi penugasan.</li>
              <li>Kelulusan ditentukan oleh nilai ambang batas (passing score) yang ditetapkan oleh kurikulum (standar umum ≥ 70%).</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary, #f8fafc)", marginBottom: 12 }}>
            4. Hak Kekayaan Intelektual (HAKI)
          </h2>
          <p>
            Seluruh silabus, video rekaman materi, modul ajar digital, soal evaluasi, logo, dan kode sistem pada platform DIDIKARA dilindungi oleh Undang-Undang Hak Cipta Republik Indonesia. Pengguna hanya diberikan lisensi non-eksklusif, terbatas, dan tidak dapat dipindahtangankan untuk keperluan pembelajaran pribadi atau kedinasan internal. Penggandaan, penjualan kembali, atau publikasi ulang tanpa izin tertulis dilarang keras.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary, #f8fafc)", marginBottom: 12 }}>
            5. Pembayaran, Faktur, dan Kebijakan Refund
          </h2>
          <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <li>Setiap transaksi yang berhasil akan menerbitkan faktur tagihan resmi (Invoice PDF) bertanda pengenal DIDIKARA.</li>
            <li>Order pembayaran memiliki batas waktu kedaluwarsa (auto-sweep expiry). Bukti transfer yang diunggah setelah melewati batas waktu tidak akan diproses otomatis.</li>
            <li>Permohonan pengembalian dana (refund) hanya dapat diajukan secara resmi melalui narahubung administrator sebelum program pelatihan dimulai atau materi kursus diakses lebih dari 20%. Apabila disetujui, status enrollment akan dicabut dan dicatat di audit log platform.</li>
          </ul>
        </section>

        <section style={{ borderTop: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))", paddingTop: 24 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary, #f8fafc)", marginBottom: 10 }}>
            6. Hukum yang Berlaku & Yurisdiksi
          </h2>
          <p>
            Syarat dan Ketentuan ini diatur dan ditafsirkan sesuai dengan hukum Negara Kesatuan Republik Indonesia. Setiap perselisihan yang timbul akan diupayakan diselesaikan melalui musyawarah untuk mufakat, atau melalui yurisdiksi Pengadilan Negeri di wilayah hukum domisili DIDIKARA.
          </p>
        </section>
      </div>
    </div>
  );
}
