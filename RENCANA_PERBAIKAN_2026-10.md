# Rencana Perbaikan DIDIKARA LMS — Oktober 2026

Dokumen ini melengkapi `ARCHITECTURE.md` dan `REVIEW.md` (ditulis Juli 2026, sudah agak basi — lihat §0) dengan rencana perbaikan konkret berdasarkan pembacaan kode per 15 Oktober 2026.

**Urutan di bawah disusun per proses bisnis** — apa yang dipertaruhkan secara hukum/kontrak/reputasi (sertifikat, pembayaran, syarat pengadaan instansi) dikerjakan lebih dulu, baru kesenjangan fitur dibanding LMS enterprise lain, baru kerapihan teknis yang tidak terasa langsung oleh pengguna.

---

## 0. Status dokumen lama vs kode saat ini

`ARCHITECTURE.md` dan `REVIEW.md` ditulis Juli 2026 saat aplikasi masih bernama NHCIE, SPA satu-halaman dengan state `activePage`, dan banyak fitur simulasi. Sejak itu (commit terbaru: *"refactor: remove hardcoded dummy data and connect all views directly to database"*) kode sudah berubah banyak:

| Temuan lama | Status sekarang |
|---|---|
| REVIEW §4 — tanpa routing URL, Back tidak jalan | **Selesai.** `(app)/dashboard`, `/kelas`, `/marketplace`, `/wallet`, `/ai-planner`, `/admin` adalah route Next.js sungguhan, berbagi `(app)/layout.js` |
| REVIEW §3 — `enrolledCourses` hardcode `["c1"]` | **Selesai.** Diisi dari `/api/enrollments` nyata (`AppContext.js` baris 244, 370, 511) |
| Rebrand | Merek sekarang **DIDIKARA** (bukan lagi "AI LMS"/NHCIE), domain `digidaya.tech`, deploy di Vercel + Postgres cloud (Neon/Supabase) |
| Landing page | Sekarang **server component** (`src/app/page.js`) yang query langsung ke tabel `courses`/`course_reviews`/`enrollments` — bukan lagi data hardcode |
| Izin admin (toggle per-user) | **Selesai.** `src/lib/permissions.js` baru menyambungkan toggle izin ke `canAccessPage`; dulu dekoratif |

**Tindakan yang disarankan:** jadwalkan satu sesi untuk menulis ulang `ARCHITECTURE.md`/`REVIEW.md` agar cocok dengan kondisi ini (lihat Gelombang E.5). Sampai itu dikerjakan, dokumen ini (dan memori proyek) adalah sumber kebenaran yang lebih baru.

---

## Gelombang A — Kepercayaan inti (jalur yang dijual ke pelanggan)

Ini yang dipertaruhkan kalau ada insiden: kebocoran data pengguna, sertifikat salah terbit, skor ujian salah hitung, atau akun disalahgunakan.

### A.1 Tutup sisa celah otorisasi tidak seragam (G-05 lama)
- **Masalah:** `canManageCourse`/`canManageSession` dari `src/lib/courseAccess.js` sudah diterapkan di live-sessions, instructor, announcements, question-bank — tapi beberapa route lama disebut di catatan proyek masih memakai pola otorisasi lebih tua (`x-user-role` / konstanta `INSTRUCTOR_ROLES`/`ADMIN_ROLES`, kecuali di `/api/enrollments/bulk` yang sudah sengaja dipertahankan untuk batas organisasi).
- **Perbaikan:** audit seluruh 59 route di `src/app/api/**/route.js`, pastikan setiap route yang menyentuh data milik kursus/pengguna lain memanggil `authenticateRequest()` lalu `canManageCourse`/batas organisasi.
- **Verifikasi:** `grep -rn "x-user-role\|x-user-email" src/app/api/` harus kosong di luar `authenticateRequest()` sendiri.

### A.2 Tes otomatis untuk jalur ujian & sertifikat
- **Kenapa di sini, bukan di belakang:** ini jalur paling dipertaruhkan secara bisnis — skor salah atau sertifikat tak sah bisa jadi insiden reputasi lebih besar daripada celah teknis lain.
- **Minimal yang perlu dites:** perhitungan skor di `exam/submit`, ambang kelulusan (≥70%), batas percobaan (`maxAttempts`), penerbitan sertifikat yang mengikuti kelulusan, dan verifikasi publik di `/verify/[certId]`.

### A.3 CI dasar yang menjaga Gelombang A tidak regresi
- GitHub Actions minimal: `npm run lint` + `npm run build` + jalankan tes A.2 di setiap PR.

### A.4 Kredensial plaintext di `platform_settings`
- **Masalah:** SMTP/third-party credential disimpan apa adanya (G-24 masih terbuka).
- **Perbaikan:** enkripsi nilai sensitif (AES-GCM, kunci dari `ENCRYPTION_KEY` di env) sebelum disimpan, dekripsi hanya saat dipakai.

### A.5 Rotasi kredensial demo sebelum go-live sungguhan
- **Masalah:** seed `password123` untuk semua akun demo (`admin@digidaya.tech`, `peserta@ailms.id`, `hr@company.com`) ikut ter-seed di database produksi baru.
- **Perbaikan:** setelah seed pertama di DB produksi, segera reset password admin, atau tambahkan flag `SEED_DEMO_ACCOUNTS=false` untuk lingkungan production.

### A.6 Hard delete masih ada di `/api/db` (G-13 lama)
- Pastikan semua `DELETE FROM` sudah diganti `deleted_at` seperti sudah dilakukan untuk `users`/`courses` — periksa tabel lain (categories, levels, question_bank) yang mungkin masih hard-delete.

### A.7 `/api/health` membocorkan informasi operasional ke publik
- **Masalah:** endpoint ini sengaja publik untuk monitoring, tapi membalas **jumlah baris tabel `users`** (`user_count`) dan status keberadaan `DATABASE_URL`/`JWT_SECRET`/`is_VERCEL` ke siapa saja tanpa login.
- **Perbaikan:** balas `{status:"ok"}` saja ke publik; detail env/row count hanya untuk pemanggil dengan header rahasia (pola sama seperti `x-cron-secret` yang sudah dipakai di route sweep).

### A.8 Tidak ada CAPTCHA di login/registrasi
- Rate limiter login sudah ada (5/menit/IP), tapi tanpa CAPTCHA bot tetap bisa mencoba dari banyak IP, atau membuat akun massal lewat `/api/auth/register` — perlu dicek juga apakah register punya rate limit sendiri.
- **Perbaikan:** pasang CAPTCHA ringan (Cloudflare Turnstile — gratis, tanpa banyak gesekan UX) di form login dan registrasi.

### A.9 Kebijakan password lemah
- **Masalah:** `api/auth/register` hanya mengecek `password.length < 8`, tidak ada syarat kombinasi huruf/angka/simbol.
- **Perbaikan:** tambah validasi Zod minimal: panjang ≥8 **dan** kombinasi huruf+angka. Ini sering jadi temuan di audit keamanan instansi sebelum kontrak diteken.

### A.10 Tidak ada batas sesi bersamaan (concurrent session)
- **Masalah:** `src/lib/session.js` mencatat & bisa revoke sesi manual, tapi tidak membatasi jumlah sesi aktif per akun. Untuk lisensi per-kursi (seat-based) yang dijual ke korporat, satu akun bisa dipakai beramai-ramai tanpa terdeteksi.
- **Perbaikan:** tambah opsi konfigurasi `MAX_CONCURRENT_SESSIONS` per peran/organisasi; saat login baru melebihi batas, cabut sesi paling lama.

### A.11 Koneksi database berisiko habis (exhaust) di lingkungan serverless
- **Masalah:** `src/lib/db.js` membuat `new Pool({ max: 10, ... })` per proses. Di Vercel, setiap *serverless function instance* punya proses sendiri — kalau traffic naik dan banyak instance aktif bersamaan, total koneksi ke Postgres bisa jauh melebihi batas yang diizinkan provider (mis. Neon free/starter tier biasanya di kisaran 100 koneksi), menyebabkan error "too many connections" yang berdampak ke *semua* pengguna sekaligus, bukan cuma satu fitur.
- **Perbaikan:** pastikan `DATABASE_URL` produksi memakai endpoint **pooled** dari provider (Neon: akhiran `-pooler` pada hostname; Supabase: port 6543/PgBouncer), bukan koneksi langsung. Ini perlu dicek manual di dashboard Neon/Supabase — tidak terlihat dari kode, karena `.env.local` di mesin dev memakai Postgres lokal (`localhost:5435`).

### A.12 Tidak ada strategi backup & disaster recovery
- **Masalah:** tidak ditemukan satu pun skrip `pg_dump`/backup terjadwal di `scripts/` maupun konfigurasi lain. Aplikasi sepenuhnya bergantung pada retensi backup default provider Postgres cloud (Neon/Supabase), yang untuk tier gratis/murah biasanya sangat terbatas (kadang hanya beberapa hari, atau tidak ada point-in-time recovery).
- **Risiko:** untuk sistem yang menyimpan **sertifikat yang sudah terbit** dan **riwayat pembayaran**, kehilangan data berarti kehilangan bukti hukum/keuangan yang tidak bisa dibuat ulang begitu saja.
- **Perbaikan:** (1) pastikan tier database produksi punya point-in-time recovery yang memadai (biasanya butuh upgrade dari tier gratis), (2) tambah skrip backup terjadwal independen (`pg_dump` terjadwal ke S3/R2 yang sudah terpasang sebagai dependensi) sebagai lapisan kedua di luar provider, (3) dokumentasikan & **uji sekali** prosedur restore — backup yang belum pernah diuji restore-nya sama saja dengan tidak punya backup.

---

## Gelombang B — Kepercayaan komersial

### B.1 Audit trail transaksi & rekonsiliasi pembayaran
- Pastikan setiap perubahan status order (`pending → waiting_confirmation → paid/expired/rejected`) tercatat lengkap di `audit_logs` dengan aktor dan waktu.
- Invoice PDF (`/api/payment/invoice`) dan riwayat transaksi admin harus bisa direkonsiliasi 1:1 dengan `payment_orders`.

### B.2 Kebijakan refund & kedaluwarsa order (G-16 lama)
- Belum ada refund. Minimal dokumentasikan kebijakan manual sebelum ada klien yang memintanya.

### B.3 Integrasi Midtrans — putuskan nasibnya
- `src/lib/payment.js` sudah berisi integrasi Snap penuh tapi tidak pernah dipanggil route manapun. Aktifkan dan uji end-to-end, atau hapus agar tidak menyesatkan.

---

## Gelombang C — Syarat pengadaan (bila target pembeli ada unsur pemerintah/korporat besar)

### C.1 Aksesibilitas
- 32 elemen `<div onClick>` tanpa `role`/`tabIndex`/penanganan keyboard. Ganti ke `<button type="button">`. Biasanya diperiksa langsung saat demo/uji terima instansi.

### C.2 MFA & reset password (G-22 lama)
- Belum ada sama sekali. Alur reset password lewat email (token sekali pakai, kedaluwarsa 30 menit) sebagai langkah pertama, sebelum TOTP.

### C.3 Halaman legal — Kebijakan Privasi & Syarat Ketentuan
- **Masalah:** tidak ada satu pun halaman ini di seluruh aplikasi. Platform mengumpulkan data pribadi dan menjual ke instansi — berisiko terhadap UU PDP, dan hampir selalu jadi dokumen wajib di pengadaan.
- **Perbaikan:** tambah route publik `/legal/privasi` dan `/legal/syarat-ketentuan`, ditautkan di footer landing page dan form registrasi.

### C.4 Tidak ada pencatatan persetujuan (consent) saat registrasi
- **Masalah:** bahkan setelah C.3 dibuat, form registrasi saat ini tidak punya checkbox "saya setuju" dan tidak mencatat kapan/versi kebijakan mana yang disetujui pengguna.
- **Perbaikan:** tambah kolom `users.privacy_consent_at`/`privacy_policy_version`, checkbox wajib dicentang sebelum submit registrasi. Untuk kepatuhan UU PDP, bukti persetujuan inilah yang biasanya diminta — bukan sekadar halaman kebijakannya ada.

---

## Gelombang D — Kesenjangan fitur dibanding LMS enterprise lain

Ini bukan bug, melainkan fitur yang biasanya ada di LMS korporat/pemerintah matang (Cornerstone, Docebo, LinkedIn Learning for Business) tapi belum ada di DIDIKARA. Ditempatkan sebelum pekerjaan teknis murni karena berdampak langsung ke kemampuan menjual ke klien B2B.

### D.1 Assign training wajib & compliance tracking (untuk HR/korporat)
- **Masalah:** tabel `assignments` yang ada adalah untuk peserta **mengumpulkan tugas** (homework), bukan untuk HR/admin **menugaskan kursus wajib** ke sekelompok karyawan dengan deadline dan status kepatuhan.
- **Perbaikan:** tabel baru `training_assignments` (course_id, assigned_to, assigned_by, due_date, status wajib/opsional, completed_at), plus panel admin "Kepatuhan Pelatihan".

### D.2 Bulk-import pengguna via CSV/Excel
- **Masalah:** admin harus menambah user satu per satu lewat `CrudModal`. Untuk onboarding ratusan karyawan sekaligus, ini jadi friksi besar.
- **Perbaikan:** endpoint `/api/users/bulk-import` (terima CSV, validasi Zod per baris, laporkan baris yang gagal) + tombol unggah di Modul Admin.

### D.3 Kedaluwarsa & re-sertifikasi sertifikat
- **Masalah:** kolom `expired_at` hanya ada di `payment_orders`, tidak di `certificates`. Untuk pelatihan yang butuh sertifikasi ulang periodik, tidak ada mekanisme "sertifikat berlaku sampai tanggal X".
- **Perbaikan:** tambah kolom `certificates.valid_until`, tampilkan status "Kedaluwarsa" di Wallet dan `/verify/[certId]`, pengingat otomatis mendekati kedaluwarsa.

### D.4 Persistensi hasil AI Planner
- Sudah tercatat sebagai item terbuka di memori proyek — perencanaan kompetensi gov/korporat dihitung ulang setiap dibuka, tidak disimpan sebagai riwayat.
- **Perbaikan:** tabel `ai_planner_results` agar rencana bisa ditinjau ulang dan dilampirkan ke laporan ke instansi.

### D.5 Keranjang/wishlist & learning path (bundel kursus)
- Peserta hanya bisa beli satu kursus per transaksi. Belum ada konsep "program"/"jalur karier" yang mengelompokkan beberapa kursus jadi satu paket.
- **Perbaikan bertahap:** keranjang sederhana dulu, baru tabel `learning_paths`.

### D.6 Ketergantungan pada video eksternal (YouTube/Vimeo/URL mp4 langsung)
- Tidak ada penyimpanan/streaming video milik platform sendiri. Risiko: video bisa hilang dari sumber eksternal, dan link publik bisa dibagikan di luar platform tanpa membayar.
- **Perbaikan jangka menengah:** host video premium lewat S3/R2 yang sudah terpasang, dengan presigned URL berbatas waktu.

### D.7 Dukungan multi-bahasa (i18n)
- `lang="id"` hardcoded, tidak ada toggle bahasa — perlu dibangun dari nol (`next-intl`/`next-i18next`) kalau ada klien multinasional.

### D.8 SCORM adapter sudah ditulis tapi tidak tersambung ke mana pun
- `src/lib/scormRuntime.js` (108 baris, implementasi SCORM 1.2 penuh) tidak diimpor di manapun.
- **Perbaikan:** sambungkan ke `VideoPlayerV2`/pemutar materi sebagai jenis lesson baru, atau hapus agar tidak menyesatkan dan tidak membuat klaim fitur yang belum benar.

### D.9 Tidak ada moderasi forum/ulasan
- `/api/forum` dan `/api/reviews` tidak punya mekanisme "laporkan"/flag dari peserta, dan tidak ada status moderasi (pending/approved) sebelum ulasan tampil publik.
- **Perbaikan:** tambah kolom status moderasi + endpoint laporkan, panel admin untuk menyetujui/menghapus.

### D.10 Tidak ada SEO dasar di landing page
- Tidak ada `sitemap.xml`, `robots.txt`, maupun meta Open Graph/Twitter Card.
- **Perbaikan:** tambah `src/app/sitemap.js`/`robots.js` (fitur bawaan Next.js App Router) dan metadata OG di `layout.js`/landing page — murah dikerjakan, langsung berdampak ke trafik organik katalog kursus publik.

### D.11 Tidak ada alat dukungan pelanggan (impersonation untuk admin)
- Tidak ada fitur "masuk sebagai pengguna ini" untuk admin men-debug tiket dukungan yang sifatnya "tampilan saya error".
- **Perbaikan:** tombol "Lihat sebagai pengguna ini" di panel admin yang menerbitkan token terbatas (read-only, kedaluwarsa singkat, tercatat di audit log) — bukan login penuh sebagai user itu.

### D.12 Tidak ada webhook keluar ke sistem HR klien
- Satu-satunya webhook yang ada adalah masuk (`/api/payment/webhook`). Tidak ada webhook keluar yang memberi tahu HRIS klien korporat saat karyawan lulus sertifikasi.
- **Perbaikan:** tabel `webhook_subscriptions` per organisasi + event `course.completed`/`certificate.issued` dikirim ke URL yang didaftarkan klien.

### D.13 Modul AI Planner masih tipis — belum ada kedalaman struktural
- **Masalah:** seluruh modul "AI Training Recommendation Engine" & "AI Competency Development Planner" hanya 471 baris total (`AiPlannerPage.js` + route + `lib/ai.js`), dan secara struktural cuma membungkus satu panggilan ke Gemini dengan mock fallback. Tidak ada kerangka kompetensi terstruktur milik organisasi yang divalidasi — rekomendasi sepenuhnya bergantung pada keluaran bebas-format LLM dari prompt sekali jalan, tanpa riwayat (lihat D.4) dan tanpa cara membandingkan hasil antar periode secara konsisten.
- **Risiko bisnis:** untuk fitur yang dijual sebagai pembeda utama ke klien pemerintah/korporat ("9.1 AI Training Recommendation Engine", "9.2 AI Competency Development Planner" di README), kedalaman yang tipis ini berisiko tidak tahan diuji lebih detail oleh calon klien yang serius mengevaluasi.
- **Perbaikan:** selain persistensi hasil (D.4), tambahkan kerangka kompetensi terstruktur per organisasi (bukan hanya teks bebas ke prompt) agar rekomendasi bisa diaudit dan dibandingkan secara konsisten dari waktu ke waktu.
- **Catatan operasional:** `GEMINI_API_KEY` sudah terisi di `.env.local` (mesin dev), tapi perlu dipastikan juga terisi di Environment Variables Vercel produksi — kalau tidak, seluruh fitur AI akan diam-diam berjalan dalam mode mock di production tanpa pemberitahuan ke pengguna selain label kecil `mock: true` di response API.

---

## Gelombang E — Keberlanjutan teknis

Tidak terasa oleh pengguna, tapi menentukan seberapa cepat tim bisa menambah fitur ke depan.

### E.1 Pecah `AppContext.js` (1318 baris, ±70+ `useState`)
- **Masalah:** objek `value` dibentuk ulang tiap render, tidak di-memo → satu ketikan di search admin me-render ulang seluruh pohon termasuk video player dan chart.
- **Perbaikan bertahap:**
  1. Pisah context per domain: `AuthContext`, `CourseContext`, `AdminContext`, `UIContext`.
  2. Bungkus `value` tiap context dengan `useMemo`.
  3. Pindahkan fetch data khusus satu halaman ke komponen halaman itu sendiri lewat service layer yang sudah ada (`src/services/*.js`).
- **Target ukuran:** masing-masing context < 300 baris.

### E.2 Pecah komponen raksasa
| Berkas | Baris | Saran pemecahan |
|---|---|---|
| `src/components/Lms/LmsPage.js` | 2748 | Pisah per tab: `LessonPlayer`, `ExamRunner`, `ForumTab`, `AssignmentTab`, `AttendanceTab`, `ReviewsTab` |
| `src/components/Admin/AdminPage.js` | 2070 | Satu komponen per tab (`UsersTab.js`, `CoursesTab.js`, `LogsTab.js`, `SessionsTab.js`, dst) |
| `src/components/Lms/VideoPlayerV2.js` | 892 | Pisah logika progress-tracking dari UI player |
| `src/components/Admin/PlatformSettingsPanelV2.js` | 1180 | Satu komponen per kelompok setelan |

### E.3 Hapus kode mati
- `PaymentModal` (versi lama, sudah digantikan `PaymentModalV2`), `PlatformSettingsPanel` v1 — konfirmasi tidak ada import tersisa, lalu hapus berkasnya.

### E.4 Migrasi skema berversi (G-19 lama)
- `src/lib/db.js` (1303 baris) memuat seluruh riwayat skema sebagai `CREATE TABLE IF NOT EXISTS` idempoten dalam satu berkas yang terus bertambah. Pindahkan ke sistem migrasi bernomor (`node-pg-migrate` atau folder `migrations/0001_*.sql`, dst).

### E.5 Perbarui dokumentasi arsitektur
- Setelah E.1–E.2 selesai sebagian, tulis ulang `ARCHITECTURE.md` agar mencerminkan struktur route App Router, context yang terpecah, dan daftar 59 route API saat ini.

### E.6 Error tracking
- Belum ada Sentry/setara — bernilai tinggi untuk menangkap galat produksi yang sekarang hanya terlihat sebagai 500 polos.

---

## Gelombang F — Skala

### F.1 Pagination
- Baru 5 dari 59 route punya pagination. Tambahkan ke `/api/instructors`, `/api/organizations`, `/api/support-tickets`, `/api/question-bank`.

### F.2 `/api/db` masih mengirim banyak tabel sekaligus
- Pastikan UI memakai endpoint khusus-per-halaman yang sudah ada (`/api/catalog`, `/api/certificates`), bukan `/api/db` sebagai jalan pintas.

### F.3 Rate limiter in-memory
- `src/lib/rateLimit.js` tidak berlaku lintas-instance. Pindahkan ke Redis (Upstash) atau tabel Postgres sederhana.

### F.4 Pola N+1 query di beberapa route
- **Masalah konkret ditemukan di 4 tempat:**
  1. `GET /api/live-sessions` — untuk setiap baris sesi yang dikembalikan, dipanggil `canManageSession(user, s)` → `canManageCourse()` yang melakukan **satu query terpisah** ke `course_instructors`. Daftar 50 sesi = 50 query otorisasi tambahan di luar query utama.
  2. `POST /api/live-sessions/sweep` (cron setiap 15 menit, lihat memori proyek) — empat loop berurutan (`for (const sess of h24)`, `h1`, `aktif`, `kedaluwarsa`, `gagal`) masing-masing melakukan `await query(...)` **per baris** untuk UPDATE status/penanda pengingat, bukan satu `UPDATE ... WHERE id = ANY($1)` per kelompok.
  3. `POST /api/enrollments/bulk` — loop per email melakukan query terpisah; nama "bulk" tapi secara teknis tetap N query individual, bukan satu `INSERT ... SELECT unnest($1::text[])`.
  4. `POST /api/instructor-payouts` (action generate) — loop per instruktur melakukan `INSERT ... ON CONFLICT` satu per satu.
- **Dampak:** ringan selama jumlah baris kecil (puluhan). Begitu jumlah live session/order/instruktur bertambah ke ratusan, sweep cron berisiko melambat dan mendekati/melewati jendela 15 menitnya sendiri, dan `/api/live-sessions` jadi lambat dirasakan pengguna saat daftar sesi panjang.
- **Perbaikan:** ganti loop query individual dengan satu query batch (`WHERE id = ANY($1::int[])` untuk UPDATE seragam, `unnest()` untuk INSERT massal). Untuk otorisasi di `/api/live-sessions`, pertimbangkan satu query `course_instructors` di muka untuk seluruh `course_id` yang relevan, lalu cocokkan di memori — bukan query per baris.

---

## Gelombang G — Polish

### G.1 Responsivitas
- Hanya 2 media query di CSS global. Lanjutkan dari `MobileBottomNav.js` dengan audit breakpoint di `globals.css`.

### G.2 `error.js` / `loading.js` / `not-found.js`
- Tambahkan `error.js` per grup route `(app)/*` agar satu galat render tidak lagi jadi layar putih tanpa pesan.

---

## Urutan eksekusi

1. **Minggu 1–2:** Gelombang A penuh.
2. **Minggu 3:** Gelombang B.
3. **Sebelum demo/uji terima ke instansi:** Gelombang C wajib selesai.
4. **Minggu 4–7:** Gelombang D — pilih yang paling mendesak sesuai klien yang sedang didekati (korporat besar → D.1/D.2 dulu; klien yang butuh re-sertifikasi berkala → D.3 dulu).
5. **Minggu 8–10:** Gelombang E — prasyarat agar perubahan berikutnya tidak makin sulit dikerjakan.
6. **Saat pertumbuhan pengguna mulai terasa:** Gelombang F.
7. **Paralel, kapan saja ada slot kosong:** Gelombang G.
