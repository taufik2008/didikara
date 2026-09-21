# National Human Capital Intelligence Ecosystem (NHCIE) - Next.js Enterprise Portal

Ini adalah implementasi modern dari platform **NHCIE (Trisakti AI Solutions)** yang dibangun menggunakan **Next.js 15 (App Router)**, **React**, **Vanilla CSS (Design System)**, dan **Chart.js**. 

Proyek ini menyatukan seluruh elemen prototipe (Struktur HTML5, Styling Premium, dan Logika JS) ke dalam arsitektur komponen React yang modular dan siap untuk diintegrasikan dengan database riil serta API AI (seperti Gemini atau OpenAI).

## Fitur yang Diintegrasikan

1.  **Multi-Role Authentication Simulator**: Mendukung otentikasi login cepat (isi otomatis) untuk empat peran utama:
    *   **Peserta (Student)**: Dashboard belajar, navigasi visual radar kompetensi, pembelian kelas, pemutar video LMS, absensi check-in/out, pengunggahan tugas, ujian sertifikasi otomatis, dan digital wallet.
    *   **Pemerintah (Government)**: Portal perencanaan kompetensi SDM instansi dilengkapi **AI Training Recommendation Engine (9.1)**.
    *   **Korporat (Corporate)**: Portal perencanaan kompetensi korporat dilengkapi **AI Competency Development Planner (9.2)** untuk promosi jabatan.
    *   **Administrator (Admin)**: Dashboard analitik pendapatan platform dengan diagram tren (Line Chart) dan riwayat pendaftaran.
2.  **LMS (Learning Management System) Interaktif**: Pemutar video dengan simulator progress belajar otomatis, sistem navigasi bab/materi, absen GPS/IP, forum diskusi, dan ujian kelulusan bergradasi.
3.  **Digital Certificate Wallet**: Penerbitan sertifikat digital instan begitu peserta lulus ujian (skor >= 70%) dengan kode verifikasi QR dan tanda tangan digital terintegrasi. Sertifikat dapat **dicetak atau disimpan sebagai berkas PDF** secara langsung menggunakan fungsi cetak browser (`Ctrl+P`).
4.  **Kompatibilitas Penuh (Next.js SSR Safe)**: Instansiasi Chart.js diatur menggunakan React `useEffect` agar aman dari galat Server-Side Rendering (SSR) dan berjalan lancar saat proses build.

---

## Langkah Menjalankan Aplikasi Secara Lokal

### Prasyarat
Pastikan Anda memiliki **Node.js (versi 18.0 ke atas)** terinstal di komputer Anda.

### Cara Menjalankan

1.  Buka terminal (PowerShell / Command Prompt) di komputer Anda.
2.  Masuk ke direktori proyek Next.js:
    ```bash
    cd "D:\Documents\awis\nhcie-nextjs"
    ```
3.  Jalankan server pengembangan lokal (Development Server):
    ```bash
    npm run dev
    ```
4.  Buka peramban (browser) Anda dan akses:
    ```
    http://localhost:3000
    ```

### Perintah Penting Lainnya
*   `npm run build` : Membuat bundel produksi yang optimal (berhasil divalidasi).
*   `npm run start` : Menjalankan aplikasi hasil bundel produksi.

---

## Struktur Berkas Next.js

*   `src/app/layout.js` : Menginisialisasi fon Google **Outfit** dan **Inter** serta membungkus metadata dasar aplikasi.
*   `src/app/globals.css` : Lembar gaya (*stylesheet*) sistem desain kustom premium (oranye/biru gelap gradasi, panel kaca/glassmorphic, pencahayaan neon orb, dan pencetakan sertifikat).
*   `src/app/page.js` : Komponen utama React (*Client Component*) yang memuat seluruh logika, basis data tiruan, diagram interaktif Chart.js, absensi, pengujian kuis, dan visualisasi portal.
