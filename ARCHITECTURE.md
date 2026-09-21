# NHCIE LMS — Peta Arsitektur & Temuan

Dokumen hasil pembacaan kode (Juli 2026). Ringkasan teknis, bukan roadmap — roadmap ada di `NHCIE_Enterprise_LMS_Roadmap.docx`.

## 1. Stack & Konvensi

| Aspek | Implementasi |
|---|---|
| Framework | Next.js **16.2.7** App Router, React 19.2.4, JavaScript (bukan TS) |
| Styling | `src/app/globals.css` — 1.113 baris vanilla CSS (design system glassmorphic oranye/biru gelap) + inline style. **Tailwind 4 terpasang tapi praktis tak dipakai** |
| Database | PostgreSQL langsung via `pg` Pool (tanpa ORM), schema dibuat lewat `CREATE TABLE IF NOT EXISTS` di kode |
| Auth | JWT sendiri (`jose`) + bcryptjs, token di cookie httpOnly 7 hari |
| Middleware | `src/proxy.js` — sesuai konvensi Next 16 (Middleware → **Proxy**) |
| Lain | Chart.js, pdfkit (sertifikat PDF), nodemailer, googleapis (Drive upload), @aws-sdk (S3/R2 presigned) |
| PWA | `public/manifest.json` + `public/sw.js`, metadata di `layout.js` |

## 2. Alur Aplikasi

Seluruh UI adalah **satu halaman client-side** (`src/app/page.js`): jika `currentUser` null → `LoginPage`, jika tidak → Sidebar + Header + satu dari 6 "page" yang diganti lewat state `activePage`. Tidak ada routing per-URL untuk fitur; satu-satunya route asli adalah `/verify/[certId]` (server component publik).

```
page.js ──► dashboard-page  (DashboardPage — radar kompetensi Chart.js)
        ├─► marketplace-page (katalog + filter kategori)
        ├─► lms-page         (LmsPage, 1.031 baris — inti pembelajaran)
        ├─► wallet-page      (daftar sertifikat + CertModal)
        ├─► ai-planner-page  (hanya role government/corporate)
        └─► admin-page       (AdminPage, 1.560 baris — 13 tab, hanya admin)
```

Modal global: `PaymentModalV2`, `CertModal`, `CrudModal`, `LmsManageModal`.

## 3. State: satu God-Context

`src/context/AppContext.js` (806 baris) memegang **±70 useState** dan mengekspor ±120 nilai lewat satu Provider. Seluruh logika login, LMS, ujian, CRUD admin, AI planner ada di sini. Data awal di-hardcode (`initialUsers`, `initialCourses`, dst.) sebagai fallback "demo mode"; saat mount ia memanggil `/api/auth/me` lalu `/api/db`, dan `dbMode` menjadi `postgresql` atau `demo`.

Konsekuensi: setiap perubahan state apa pun me-render ulang seluruh pohon; nilai `value` tidak di-memo. Ada juga duplikasi key di objek `value` (`courses`, `certificates`, `currentUser` ditulis dua kali). Roadmap Fase 1 memang menargetkan pemecahan context ini + React Query — belum dikerjakan.

Layer service tipis sudah ada (`src/services/*.js`: auth, course, exam, progress) tapi komponen lain (LmsPage, AdminPage) masih memanggil `fetch("/api/...")` langsung.

## 4. Backend — 40+ API route

Semua di `src/app/api/`. `src/proxy.js` mewajibkan JWT untuk **semua** `/api/*` kecuali `/api/auth/login` dan `/api/auth/register`, dan menyuntikkan header `x-user-email` / `x-user-role` / `x-user-fullname` ke route.

Kelompok fungsional:

- **Auth**: login (rate limit 5/menit/IP, cek status `suspended`, award XP + badge `first_login`), logout, me, register.
- **Data inti**: `db` (GET semua tabel + POST CRUD admin-only dengan audit log), `catalog` (didesain publik), `enrollments/bulk`, `organizations` (org → dept → user, soft delete).
- **Ujian**: `exam/start` (ambil soal dari `question_bank` bila ada, kalau tidak dari `courses.quiz`; Fisher-Yates mengacak soal **dan** pilihan; kunci jawaban disimpan di *examToken* JWT bertanda tangan, bukan dikirim ke klien; cek `maxAttempts`), `exam/submit` (scoring di server dari token, simpan `exam_attempts`, terbitkan sertifikat, trigger XP/badge/email), `exam/history`.
- **Pembelajaran**: `progress` (upsert per lesson, auto-resume), `forum` (threading + soft delete), `announcements`, `instructor` (progress peserta + grading tugas), `live-sessions`, `reviews`.
- **Sertifikat**: `certificates`, `certificate/pdf` (PDFKit server-side), `cert-template` (kustomisasi admin), `verify/[certId]` (publik).
- **Komersial**: `payment` (transfer manual + 3 digit kode unik dari `bankConfig`), `payment/confirm` (approve/reject admin), `payment/webhook` (re-export POST dari `payment`), `lib/payment.js` punya integrasi Midtrans Snap penuh tapi belum dipakai route mana pun.
- **AI**: `ai` (rekomendasi / analisis gap / chat), `ai-planner` (perencanaan gov & korporat). `lib/ai.js` memakai Gemini `gemini-1.5-flash` dengan **mock fallback** otomatis bila `GEMINI_API_KEY` kosong.
- **Ops & analitik**: `analytics`, `reports` (overview/org/dept/KPI), `audit-logs`, `sessions` (lihat & revoke), `settings` (platform_settings), `notifications`, `push` (web-push), `email` (queue + kirim), `gamification`, `leaderboard`, `upload/presigned` (S3/R2), `upload/drive` (Google Drive service account).

Pola konsisten yang bagus: `authenticateRequest()` → validasi Zod → query → `NextResponse.json({success, ...})`, dan hampir semua integrasi eksternal punya mock mode sehingga aplikasi tetap jalan tanpa kredensial.

## 5. Skema Database

`src/lib/db.js` (779 baris) = pool + schema + seed dalam satu file. Tabel dibuat/di-migrasi idempoten, dipanggil otomatis pada query pertama tiap proses (`global._dbInitialized`).

- Fase 1: `users`, `courses`, `transactions`, `certificates`, `categories`, `levels`, `exam_attempts`, `user_progress`, `forum_posts`, `audit_logs`, `enrollments`
- Fase 2: `question_bank`, `cert_templates`, `courses.exam_settings`, `courses.prerequisite_course_id`
- Fase 3: `organizations`, `departments`, `notifications`, `announcements`, `assignment_grades`, kolom `deleted_at` (soft delete)
- Fase 4: `user_points`, `badges` (10 badge ter-seed), `user_badges`, `live_sessions`, `live_session_registrations`, `email_queue`, `ai_interactions`
- Fase 5: `payment_orders`, `course_reviews`, `push_subscriptions`, `kpi_targets`, `kpi_records`, `platform_settings`

Ada migrasi otomatis yang meng-hash ulang password plain-text (`WHERE password NOT LIKE '$2%'`). Seed: 4 user demo (semua `password123`), 6 kursus, 4 kategori, 4 level.

## 6. Status vs Roadmap

Fase 1–3 sebagian besar sudah terpasang, plus banyak item Fase 4–5 (gamifikasi, live session, PWA, push, review, payment order, KPI). Yang **belum** ada sama sekali: MFA/TOTP, password reset, Prisma ORM, SSO, SCORM, HLS/ffmpeg transcoding, Redis, mode offline, CI/CD, Sentry.

## 7. Temuan

Temuan 1–4 **sudah diperbaiki** (26 Juli 2026); lihat §9. Sisanya belum.

1. ~~**`zod` tidak terdaftar di `package.json`** meski dipakai 14 route (hanya ada di `node_modules`, v4.4.3). `npm ci` di server bersih → build gagal.~~ **FIXED**
2. ~~**`api/exam/submit` memanggil `sendExamPassedEmail()` dan `sendCertEmail()` tanpa meng-import-nya.** Keduanya baru dieksekusi ketika peserta **lulus** → `ReferenceError` → ditangkap catch terluar → respons 500. Jadi jalur "lulus ujian" praktis rusak di mode DB.~~ **FIXED**
3. ~~**Route yang didokumentasikan publik justru diblokir proxy**: `/api/catalog` dan `/api/verify/[certId]` bukan bagian dari `publicPaths`, padahal halaman `/verify/[certId]` (server component) mem-fetch-nya tanpa cookie → verifikasi sertifikat publik gagal.~~ **FIXED**
4. ~~**`api/push` memuat `web-push` lewat `eval("require")`** — bukan crash (ada fallback mock), tapi rapuh terhadap bundling dan menelan error pengiriman sebagai "web-push not installed".~~ **FIXED**
5. **Otorisasi tidak seragam**: `api/db` mengandalkan header `x-user-role` yang disuntikkan proxy, tapi `courseService.loadAppData()` juga mengirim header `x-user-email`/`x-user-role` dari klien. Karena proxy menimpanya (`Headers` di-set setelah dicopy), ini aman saat ini — tapi rapuh; sebaiknya route selalu memakai `authenticateRequest()`.
6. **Rate limiter in-memory** (`lib/rateLimit.js`) tidak berlaku multi-instance; sudah ditandai di komentar.
7. **`JWT_SECRET` belum ada di `.env.local`** (hanya `GEMINI_API_KEY` dan `DATABASE_URL`). Dev memakai secret default; produksi akan `throw` saat start — perlu diisi sebelum deploy.
8. **Kredensial ada di dalam repo**: `.env.local` berisi API key dan connection string dan tidak ada `.git` di folder ini — pastikan tidak pernah ikut ter-commit.
9. **Komponen kembar**: `PaymentModal` vs `PaymentModalV2`, `PlatformSettingsPanel` vs `V2`, `VideoPlayer*` — hanya versi V2 yang di-import; versi lama (≈700 baris total) adalah kode mati.
10. **Fitur klien yang masih simulasi**: absensi ("IP 192.168.1.45, GPS terverifikasi" di-hardcode), upload tugas (`setTimeout` 2 detik), `forumPosts` awal di context, `handleConfirmPayment` menandai transaksi "Berhasil" secara lokal tanpa lewat `/api/payment`.
11. **`fix-context.sh`** di root adalah skrip tambal darurat untuk `AppContext.js` — indikasi file itu pernah rusak saat diedit; sinyal kuat bahwa context perlu dipecah.
12. `AGENTS.md` sudah mewajibkan membaca `node_modules/next/dist/docs/` sebelum menulis kode Next.js — konvensi Next 16 (mis. `proxy.js`, bukan `middleware.js`) sudah diikuti dengan benar.

## 8. Menjalankan

```powershell
npm run dev      # http://localhost:3000
```

Login demo: `peserta@nhcie.go.id`, `hr@company.com`, `gov@kemenkeu.go.id`, `admin@nhcie.go.id` — semua `password123`. Tanpa PostgreSQL aplikasi masuk "demo mode" (data dari konstanta di context), tetapi login akan gagal karena `api/auth/login` mengembalikan 503 saat DB mati.

## 9. Perbaikan 26 Juli 2026

| # | Berkas | Perubahan |
|---|---|---|
| 1 | `package.json` | Tambah `"zod": "^4.4.3"` ke dependencies |
| 1b | `api/auth/login`, `api/progress`, `api/upload/presigned` | `parsed.error.errors` → `.issues`. Di Zod 4 `.errors` sudah dihapus, jadi input tidak valid memicu `TypeError` → 500 alih-alih 400 berisi pesan validasi |
| 2 | `api/exam/submit` | Tambah `import { sendExamPassedEmail, sendCertEmail } from "@/lib/email"` |
| 3 | `src/proxy.js` | `publicPaths` + `/api/catalog` dan `/api/verify` |
| 4 | `api/push` | `eval("require")("web-push")` → `await import("web-push")` dengan try/catch terpisah; cek VAPID dipindah ke depan; kegagalan pengiriman nyata kini balas 500, bukan mock |
| 4b | `next.config.mjs` | `serverExternalPackages` + `"web-push"` agar dependensi opsional tidak di-bundle |

Verifikasi: pemindaian import ulang bersih, tidak ada sisa `.error.errors`, semua berkas yang disentuh lolos `node --check`. **`npx next build` belum dijalankan** — binary SWC untuk Linux tidak tersedia di sandbox; jalankan `npm install` lalu `npm run build` di Windows untuk konfirmasi akhir.

Catatan: `web-push` sengaja tetap **tidak** dimasukkan ke dependencies karena murni opsional (tanpa VAPID key, route balas mock). Jika push notification mau diaktifkan: `npm i web-push` + set `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`.

### Putaran kedua — hasil `npm run build` di Windows

Build pertama gagal karena dua hal yang tidak terdeteksi di sandbox:

| Berkas | Masalah | Perbaikan |
|---|---|---|
| `src/lib/auth.js` | Guard `JWT_SECRET` melempar di **module evaluation**. `next build` mengevaluasi tiap route dengan `NODE_ENV=production` untuk mengumpulkan page data → build gagal di `/api/analytics` (dan akan gagal di CI mana pun yang tak memegang secret produksi) | Resolusi secret dibuat **lazy** via `getSecret()` — tetap fatal, tapi saat token benar-benar ditandatangani/diverifikasi. `getSecret()` dipanggil di **luar** `try` pada `verifyToken` agar misconfig gagal keras, bukan tersamar jadi "token tidak valid" |
| `.env.local` | `JWT_SECRET` belum ada | Ditambahkan (48 byte acak, base64url) |
| `api/push` | Turbopack tetap me-resolve `import("web-push")` → warning "Module not found" | Ditandai `/* turbopackIgnore: true */ /* webpackIgnore: true */` |

Uji guard produksi (`NODE_ENV=production`, tanpa `JWT_SECRET`): module eval lolos tanpa throw, `signToken()` dan `verifyToken()` keduanya melempar `FATAL: JWT_SECRET...` — sesuai maksud semula.

## 10. Triase `npm audit` — 9 kerentanan

| Paket | Sev | Runtime? | Penilaian |
|---|---|---|---|
| **next** 16.2.7 | High | ya | **Prioritas.** 9 advisory, termasuk **CVE-2026-64642 / GHSA-6gpp-xcg3-4w24 (CVSS 8.3) — "Middleware/Proxy bypass in App Router using Turbopack"**, terdampak `>=16.0.0 <16.2.11`. Perbaikan `16.2.12` = **patch, non-breaking**. Sekaligus menutup postcss & sharp |
| postcss | High | transitif | Ikut sembuh lewat upgrade `next` |
| sharp 0.34.5 | High | transitif | Ikut sembuh lewat upgrade `next` (libvips CVE) |
| js-yaml 4.2.0 | High | **dev-only** (eslint) | DoS quadratic CPU. Tidak masuk bundel produksi → risiko nyata rendah |
| brace-expansion | High | **dev-only** (eslint) | Sama; `npm audit fix` aman |
| googleapis 144 | Moderate | ya | Rantai via `uuid <11.1.1` (bounds check v3/v5/v6 — proyek ini tidak memakai uuid). Perbaikan `googleapis@173` = **semver-major**. Hanya dipakai `api/upload/drive` dengan permukaan sempit (`google.auth.GoogleAuth`, `drive.files.create`, `drive.permissions.create`), jadi upgrade kemungkinan mulus — tapi perlu diuji manual |
| gaxios / googleapis-common / uuid | Moderate | transitif | Ikut `googleapis` |

Rekomendasi urutan:

```powershell
npm i next@^16.2.12     # menutup 3 dari 5 high, termasuk proxy bypass
npm audit fix           # membereskan rantai dev-only
npm i googleapis@^173   # opsional, semver-major — uji upload materi ke Drive setelahnya
```

Catatan soal CVE-2026-64642: prasyarat advisory adalah `config.i18n.locales` berisi **satu** entri; `next.config.mjs` proyek ini tidak punya blok `i18n`, jadi kemungkinan besar **tidak** dapat dieksploitasi apa adanya. Tetap upgrade — tapi pelajaran arsitekturalnya yang lebih penting: seperti kata advisory, otorisasi jangan hanya bertumpu pada proxy.

### Pengerasan menyusul triase

| Berkas | Perubahan |
|---|---|
| `api/db` | GET & POST kini memakai `authenticateRequest()` alih-alih percaya header `x-user-role`/`x-user-email` dari proxy. Route ini mengembalikan **hash password** dan **kunci jawaban ujian**, dan POST-nya gerbang admin-only — kalau lapisan proxy terlewat, klien cukup mengirim `x-user-role: admin` sendiri |
| `api/ai-planner` | Idem, peran dari JWT |
| `services/courseService.js` + `AppContext` | Berhenti mengirim header `x-user-email`/`x-user-role` dari klien (`loadAppData()` tanpa argumen). Header itu tidak pernah menjadi sumber kebenaran, tapi keberadaannya menyesatkan |

Tidak ada lagi route yang membaca `x-user-*`; proxy tetap menyuntikkannya (tidak apa-apa, sekadar informasi), tapi tak ada keputusan otorisasi yang bergantung padanya.

### Bug tambahan yang ketemu

`/api/auth/login` membalas `{ success, user }`, tetapi `handleLoginSubmit` di `AppContext` membaca `json.data` → `setCurrentUser(undefined)` → `page.js` tetap menampilkan `LoginPage`, sehingga login yang sukses tampak gagal tanpa pesan apa pun. (`/api/auth/me` memang memakai `data`, itu sumber kebingungannya.) Klien kini menerima `json.user ?? json.data` dan memunculkan pesan bila keduanya kosong.
