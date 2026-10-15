# Gelombang F: Skalabilitas & Optimasi Query Implementation Plan

Rencana implementasi untuk menutup kesenjangan skalabilitas dan optimasi query dari `E:\lms\RENCANA_PERBAIKAN_2026-10.md` (Gelombang F).
Fokus utama:
1. Menghilangkan pola query N+1 pada 4 route backend: `live-sessions` (GET), `live-sessions/sweep` (POST), `enrollments/bulk` (POST), dan `instructor-payouts` (POST).
2. Menambahkan paginasi terstandarisasi (`page`, `limit`, `total`) pada route master: `/api/instructors`, `/api/organizations`, `/api/support-tickets`, dan `/api/question-bank`.

---

## User Review Required

> [!IMPORTANT]
> **Efisiensi Skala Besar (Batching vs Iterative Query):**
> Pendaftaran massal (`/api/enrollments/bulk`) untuk ratusan pegawai sebelumnya memicu 300+ query bolak-balik (round-trips). Perbaikan ini mentransformasikan alur menjadi 2 query batch berbasis `unnest()`.
> Demikian pula, cron sweep sesi live (`/api/live-sessions/sweep`) kini menggunakan `UPDATE ... WHERE id = ANY($1::int[])` untuk mencegah timeout saat jumlah sesi bertambah.

---

## Proposed Changes

### 1. Eliminasi Pola N+1 Query (F.4)
- **`src/app/api/live-sessions/route.js` (GET):**
  - Mengambil daftar kursus yang diampu pengguna di awal request (`taughtCourseIds(user)`) dan menggunakan `Set` di memori untuk menentukan `can_manage` per sesi tanpa query per baris.
- **`src/app/api/live-sessions/sweep/route.js` (POST):**
  - Mengelompokkan ID sesi live yang memerlukan update status dan mengeksekusi satu batch query `UPDATE live_sessions ... WHERE id = ANY($1::int[])`.
  - Batch insert multi-row notifikasi pembatalan order kedaluwarsa.
- **`src/app/api/enrollments/bulk/route.js` (POST):**
  - Mengganti loop per-baris `INSERT` dengan `INSERT INTO enrollments ... SELECT unnest($1::text[]), $2, 'active' ON CONFLICT DO NOTHING RETURNING user_email`.
  - Menggunakan judul kursus yang sudah di-fetch di muka untuk batch notifikasi.
- **`src/app/api/instructor-payouts/route.js` (POST action: generate):**
  - Mengganti loop per-baris `INSERT ... ON CONFLICT` dengan batch insert berbasis `unnest()`.

### 2. Standarisasi Paginasi API (F.1)
- **`src/app/api/instructors/route.js` (GET):**
  - Menerima query param `page` dan `limit` (default 20, max 100), menghitung `offset`, dan mengembalikan `{ success: true, instructors, total, page, limit }`.
- **`src/app/api/organizations/route.js` (GET):**
  - Menerima query param `page` dan `limit`, menghitung total baris, dan mengembalikan `{ success: true, organizations, total, page, limit }`.
- **`src/app/api/support-tickets/route.js` (GET):**
  - Menerima query param `page` dan `limit`, menghitung total tiket, dan mengembalikan `{ success: true, tickets, ringkas, total, page, limit }`.
- **`src/app/api/question-bank/route.js` (GET):**
  - Menerima query param `page` dan `limit`, dan mengembalikan `{ success: true, questions, total, page, limit }`.

---

## Verification Plan

### Automated Tests
- `tests/query-optimization-and-pagination.test.js`:
  - Menguji keberadaan optimasi batch `unnest` atau `ANY` pada `enrollments/bulk` dan `live-sessions/sweep`.
  - Menguji keberadaan eliminasi query N+1 pada `live-sessions`.
  - Menguji parameter paginasi `page`, `limit`, dan `total` pada keempat endpoint target.
- `npm test`: Seluruh 43 tests sebelumnya + test baru (total 44 tests) wajib PASS (100% hijau).
- `npm run build`: Kompilasi Turbopack Next.js 16 wajib sukses tanpa error.
