# Gelombang C: Syarat Pengadaan B2B/B2G & Kepatuhan Regulasi Implementation Plan

Rencana eksekusi terstruktur untuk Gelombang C dari `E:\lms\RENCANA_PERBAIKAN_2026-10.md`.
Fokus gelombang ini adalah menutup celah kepatuhan hukum (UU PDP No. 27/2022), keamanan alur autentikasi token, halaman legalitas resmi, pencatatan persetujuan pengguna (consent), serta aksesibilitas interaktif (a11y) standar demo instansi pemerintah & korporat.

## User Review Required

> [!IMPORTANT]
> **Keputusan Keamanan Token:** Alur reset password akan beralih dari stateless JWT ke *hashed one-time tokens* di database (`password_reset_tokens`) dengan masa berlaku 30 menit. Setelah digunakan sekali atau kedaluwarsa, token tidak dapat digunakan ulang (mencegah replay attacks).
> **Kepatuhan UU PDP:** Registrasi akun mewajibkan centang persetujuan Kebijakan Privasi & Syarat Ketentuan yang mencatat timestamp (`privacy_consent_at`) dan versi kebijakan (`privacy_policy_version = '2026-10-v1.0'`).

- **Breaking Changes:** Tidak ada. Endpoint `/api/auth/register` akan menolak request registrasi baru yang tidak menyertakan `privacyConsent: true` dengan error 400 yang informatif.

---

## Proposed Changes

### Database & Auth Security (C.2, C.4)

#### [MODIFY] [db.js](file:///E:/lms/src/lib/db.js)
- Tambah migrasi tabel `password_reset_tokens` (id, user_email, token_hash, expires_at, used_at, created_at) beserta index.
- Tambah migrasi kolom `privacy_consent_at` dan `privacy_policy_version` pada tabel `users`.

#### [MODIFY] [forgot-password/route.js](file:///E:/lms/src/app/api/auth/forgot-password/route.js)
- Mengganti stateless JWT dengan token acak 32-byte (`crypto.randomBytes(32).toString("hex")`).
- Menyimpan hash SHA-256 token di `password_reset_tokens` dengan batas kedaluwarsa 30 menit (`NOW() + INTERVAL '30 minutes'`).
- Mengirim URL reset berisi token plaintext.

#### [MODIFY] [reset-password/route.js](file:///E:/lms/src/app/api/auth/reset-password/route.js)
- Menghitung hash SHA-256 dari token yang diterima.
- Mencari baris token aktif di `password_reset_tokens` (`token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`).
- Jika valid: perbarui password user, tandai `used_at = NOW()`, cabut seluruh sesi aktif, dan catat ke `audit_logs`.

---

### Legal Pages & Consent (C.3, C.4)

#### [NEW] [src/app/legal/layout.js](file:///E:/lms/src/app/legal/layout.js)
- Layout publik dengan header navigasi DIDIKARA dan tautan kembali ke beranda.

#### [NEW] [src/app/legal/privasi/page.js](file:///E:/lms/src/app/legal/privasi/page.js)
- Dokumen Kebijakan Privasi komprehensif mengacu pada UU No. 27/2022 (UU PDP): jenis data yang dikumpulkan, tujuan pemrosesan, hak subjek data, retensi, dan kontak DPO/Admin.

#### [NEW] [src/app/legal/syarat-ketentuan/page.js](file:///E:/lms/src/app/legal/syarat-ketentuan/page.js)
- Dokumen Syarat & Ketentuan Layanan: hak kekayaan intelektual materi, aturan kelulusan sertifikasi, kebijakan akun instansi/korporat.

#### [MODIFY] [LandingPage.js](file:///E:/lms/src/components/Landing/LandingPage.js)
- Hubungkan link footer "Ketentuan Layanan" ke `/legal/syarat-ketentuan` dan "Kebijakan Privasi" ke `/legal/privasi`.

#### [MODIFY] [register/route.js](file:///E:/lms/src/app/api/auth/register/route.js)
- Validasi wajib `privacyConsent === true`.
- Simpan `privacy_consent_at = NOW()` dan `privacy_policy_version = '2026-10-v1.0'` ke tabel `users`.

#### [MODIFY] [LoginPage.js](file:///E:/lms/src/components/Login/LoginPage.js)
- Tambahkan checkbox persetujuan kebijakan privasi di form registrasi dengan tautan ke halaman legal.
- Kirim `privacyConsent: true` saat submit form pendaftaran.

---

### Aksesibilitas (C.1)

#### [MODIFY] [PaymentHistoryPanel.js](file:///E:/lms/src/components/Admin/PaymentHistoryPanel.js)
- Ubah filter pills dari `<div onClick>` ke `<button type="button" onClick>`.

#### [MODIFY] [NotificationCenter.js](file:///E:/lms/src/components/Notifications/NotificationCenter.js)
- Tambahkan `role="button"`, `tabIndex={0}`, dan keyboard listener `onKeyDown` pada notifikasi interaktif.

#### [MODIFY] [LandingPage.js](file:///E:/lms/src/components/Landing/LandingPage.js)
- Ubah kartu paket modal pilihan (`selectedModalTier`) dan filter kategori interaktif menjadi elemen ber-`role="button"` dengan `tabIndex={0}` dan `onKeyDown`.

---

## Verification Plan

### Automated Tests
1. `tests/auth-reset-password.test.js`:
   - Validasi pembuatan token acak & SHA-256 hash di database.
   - Validasi token kedaluwarsa setelah 30 menit ditolak.
   - Validasi token yang sudah dipakai (`used_at IS NOT NULL`) ditolak (one-time use).
2. `tests/auth-privacy-consent.test.js`:
   - Registrasi tanpa `privacyConsent: true` ditolak dengan status 400.
   - Registrasi dengan `privacyConsent: true` diterima dan mencatat `privacy_consent_at` serta `privacy_policy_version`.
3. `tests/legal-pages.test.js`:
   - Halaman `/legal/privasi` dan `/legal/syarat-ketentuan` berisi teks resmi DIDIKARA dan UU PDP.
   - Footer `LandingPage.js` menautkan ke URL legal.
4. `tests/accessibility.test.js`:
   - Filter-pills di `PaymentHistoryPanel.js` menggunakan `<button type="button">`.
   - Kartu pilihan di `LandingPage.js` dan `NotificationCenter.js` memiliki `role="button"` dan `tabIndex={0}`.

### Manual / Integration Verification
- `npm test` menjalankan seluruh 15 test sebelumnya + test suite baru tanpa regresi.
- `npm run build` sukses mengompilasi semua route termasuk `/legal/privasi` dan `/legal/syarat-ketentuan`.
