# Gelombang D (Batch 2): Moderasi Komunitas & Operasional Enterprise Implementation Plan

Rencana implementasi untuk menutup kesenjangan fungsional operasional LMS enterprise dari `E:\lms\RENCANA_PERBAIKAN_2026-10.md`.
Fokus pengerjaan meliputi moderasi konten forum & ulasan (D.9), alat investigasi dukungan pelanggan / impersonation admin berbatas waktu (D.11), serta integrasi webhook keluar ke sistem HRIS klien korporat (D.12).

## User Review Required

> [!IMPORTANT]
> **Keamanan & Audit Impersonation:**
> Fitur "Lihat sebagai pengguna ini" (`POST /api/admin/impersonate`) dibatasi ketat hanya untuk peran `admin`, menerbitkan token sesi berbatas waktu 15 menit dengan flag eksplisit `isImpersonated: true`, dan setiap kali digunakan dicatat ke `audit_logs` bersama identitas admin yang melakukan akses.
> **Moderasi Komunitas:**
> Ulasan dan post forum kini memiliki status (`approved`, `flagged`, `hidden`) serta pelaporan otomatis (auto-flag saat mencapai ambang batas 3 laporan).

---

## Proposed Changes

### 1. Moderasi Forum & Ulasan (D.9)
- **Database:** Kolom `status` (`VARCHAR(20) DEFAULT 'approved'`) dan `report_count` (`INT DEFAULT 0`) pada tabel `course_reviews` dan `forum_posts`.
- **Route Forum (`src/app/api/forum/route.js`):**
  - `PATCH`: Pelaporan konten oleh peserta (`action: "report"`) & aksi moderasi admin (`action: "moderate"`, status: `hidden` / `approved`).
  - `GET`: Hanya menampilkan konten yang tidak berstatus `hidden`.
- **Route Reviews (`src/app/api/reviews/route.js`):**
  - `PATCH`: Pelaporan ulasan tidak pantas/spam & aksi moderasi admin.
  - `GET`: Mengabaikan ulasan `hidden` dari agregasi rating dan feed publik.
- **Test:** `tests/moderation.test.js`.

### 2. Alat Dukungan Admin / Impersonation (D.11)
- **Route (`src/app/api/admin/impersonate/route.js`):**
  - Autentikasi ketat peran admin (`admin`).
  - Menghasilkan token berbatas waktu singkat (15 menit / 900 detik) bertanda `isImpersonated: true`.
  - Mencatat mutasi hak akses ke `audit_logs` (`action: "impersonate_user"`).
- **Test:** `tests/admin-impersonate.test.js`.

### 3. Webhook Keluar ke HRIS Klien (D.12)
- **Database:** Tabel `webhook_subscriptions` (id, organization_id, target_url, secret_key, events, is_active, created_by, created_at).
- **Route (`src/app/api/webhooks/outbound/route.js`):**
  - `GET` & `POST`: Manajemen pendaftaran webhook keluar per organisasi.
- **Helper (`src/lib/webhookDispatcher.js`):**
  - Pengiriman event asynchronous ber-signature HMAC-SHA256 (`x-didikara-signature`).
- **Test:** `tests/outbound-webhooks.test.js`.

---

## Verification Plan

### Automated Tests
- `tests/moderation.test.js`
- `tests/admin-impersonate.test.js`
- `tests/outbound-webhooks.test.js`
- `npm test`: Seluruh 34 test sebelumnya + 3 test suite baru (total 37 tests) wajib PASS.

### Build Verification
- `npm run build`: Kompilasi Turbopack Next.js wajib lulus tanpa error.
