# Gelombang D (Batch 1): Fitur Enterprise & Kepatuhan LMS Implementation Plan

Rencana implementasi terstruktur untuk menutup kesenjangan fitur komparatif dibanding LMS enterprise matang (Cornerstone, Docebo) sesuai Gelombang D dari `E:\lms\RENCANA_PERBAIKAN_2026-10.md`.

## User Review Required

> [!IMPORTANT]
> **Fitur B2B/B2G Utama:**
> 1. **Kepatuhan Pelatihan Karyawan (D.1):** Sistem penugasan pelatihan wajib dengan due date dan tracking kepatuhan (`training_assignments`).
> 2. **Onboarding Massal (D.2):** Impor pengguna massal melalui CSV dengan pelaporan baris gagal/berhasil.
> 3. **Masa Berlaku Sertifikasi (D.3):** Kolom `valid_until` dan pendeteksian kedaluwarsa pada halaman publik verifikasi `/verify/[certId]`.
> 4. **Persistensi AI Planner (D.4):** Riwayat evaluasi gap kompetensi dan rekomendasi pelatihan tersimpan di `ai_planner_results`.
> 5. **SEO & Keterindeksan Katalog (D.10):** Penambahan `sitemap.js`, `robots.js`, dan metadata Open Graph.

---

## Proposed Changes

### 1. Training Assignments & Compliance Tracking (D.1)
- **Database:** Tabel `training_assignments` di `src/lib/db.js` (id, course_id, assigned_to, assigned_by, due_date, is_mandatory, completed_at, created_at).
- **Route:** `src/app/api/training-assignments/route.js`:
  - `GET`: Mengambil daftar tugas pelatihan user, atau metrik kepatuhan instansi (`complianceRate`).
  - `POST`: Memberi tugas kursus ke satu atau banyak karyawan dengan due date dan auto-enrollment.
- **Test:** `tests/training-assignments.test.js`.

### 2. Bulk Import Pengguna (D.2)
- **Route:** `src/app/api/users/bulk-import/route.js`:
  - Menerima CSV/JSON daftar pengguna.
  - Validasi email, nama, dan role per baris.
  - Insert user dengan hash password default dan role student.
  - Catat log audit dan kembalikan laporan rinci (berhasil, gagal, duplikat).
- **Test:** `tests/users-bulk-import.test.js`.

### 3. Masa Berlaku Sertifikat & Validasi Kedaluwarsa (D.3)
- **Database:** `ALTER TABLE certificates ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ DEFAULT NULL`.
- **Exam Submit:** Otomatis set `valid_until = NOW() + INTERVAL '3 years'` saat penerbitan sertifikat.
- **Verification Page & API:** `/verify/[certId]` dan `/api/verify/[certId]` memvalidasi `valid_until` dan memberi label "KEDALUWARSA" jika telah lewat waktu.
- **Test:** `tests/certificate-expiry.test.js`.

### 4. Persistensi Riwayat AI Planner (D.4)
- **Database:** Tabel `ai_planner_results` di `src/lib/db.js`.
- **Route:** `src/app/api/ai-planner/route.js`:
  - Menyimpan hasil rekomendasi dan gap analysis setelah kalkulasi AI.
  - Mendukung `GET /api/ai-planner` untuk mengambil riwayat rencana kompetensi.
- **Test:** `tests/ai-planner-history.test.js`.

### 5. SEO & Metadata Katalog Publik (D.10)
- **Files:**
  - `src/app/sitemap.js`: Generate dynamic XML sitemap dari daftar kursus database.
  - `src/app/robots.js`: Konfigurasi crawler robots.txt.
  - `src/app/layout.js`: Metadata Open Graph lengkap (title, description, image, siteName).
- **Test:** `tests/seo-metadata.test.js`.

---

## Verification Plan

### Automated Tests
- `tests/training-assignments.test.js`
- `tests/users-bulk-import.test.js`
- `tests/certificate-expiry.test.js`
- `tests/ai-planner-history.test.js`
- `tests/seo-metadata.test.js`
- `npm test`: Seluruh 24 test sebelumnya + 5 test baru (total 29 tests) wajib PASS.

### Build Verification
- `npm run build`: Kompilasi Turbopack Next.js wajib lulus tanpa error.
