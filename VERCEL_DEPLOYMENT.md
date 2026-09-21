# Panduan Deploy ke Vercel

Aplikasi ini dibangun menggunakan Next.js (App Router) dan sudah dikonfigurasi agar kompatibel dengan lingkungan serverless **Vercel**.

---

## 1. Persiapan Database (PostgreSQL Cloud)

Karena Vercel bersifat *serverless/stateless*, Anda membutuhkan database PostgreSQL yang dapat diakses secara publik (cloud). Beberapa opsi gratis/mudah:

- **[Neon.tech](https://neon.tech/)** (Sangat direkomendasikan untuk Vercel / Serverless)
- **[Supabase](https://supabase.com/)** (Database PostgreSQL gratis + connection pooler)
- **[Aiven](https://aiven.io/)** / **[Railway](https://railway.app/)** / **Vercel Postgres**

Dapatkan connection string database Anda, contoh format:
```text
postgresql://user:password@ep-cool-sample.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

> **Catatan:** Aplikasi ini sudah memiliki fitur **auto-init schema & seed**. Saat aplikasi pertama kali dijalankan di Vercel dan mengakses database baru, tabel-tabel dan data awal (admin & user demo) akan otomatis dibuat.

---

## 2. Cara Deploy

### Opsi A: Melalui Dashboard Vercel & GitHub (Paling Mudah)

1. Push kode repository ini ke **GitHub / GitLab / Bitbucket**.
2. Buka [Vercel Dashboard](https://vercel.com/dashboard) dan klik **"Add New..."** > **"Project"**.
3. Import repository Anda.
4. Konfigurasikan **Environment Variables** (lihat daftar di Bagian 3).
5. Klik **"Deploy"**.

---

### Opsi B: Melalui Vercel CLI (Terminal)

1. Install Vercel CLI (jika belum):
   ```bash
   npm i -g vercel
   ```
2. Login ke akun Vercel:
   ```bash
   vercel login
   ```
3. Deploy dari folder proyek:
   ```bash
   vercel
   ```
4. Untuk deploy ke production:
   ```bash
   vercel --prod
   ```

---

## 3. Daftar Environment Variables (Wajib diisi di Vercel)

Di Vercel Dashboard, masuk ke **Settings** > **Environment Variables** dan tambahkan variabel berikut:

| Nama Variabel | Contoh Nilai | Keterangan |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/dbname?sslmode=require` | **Wajib**: Connection string PostgreSQL cloud |
| `JWT_SECRET` | `generate-string-rahasia-minimal-32-karakter` | **Wajib**: Kunci enkripsi sesi & JWT login |
| `NEXT_PUBLIC_APP_URL` | `https://nama-project-anda.vercel.app` | URL domain Vercel Anda |
| `NODE_ENV` | `production` | Environment mode |

### Variabel Tambahan (Opsional sesuai fitur yang diaktifkan):

| Nama Variabel | Keterangan |
|---|---|
| `GEMINI_API_KEY` | Untuk fitur AI Assistant & AI Planner |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Untuk pengiriman email notifikasi & invoice |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` | Untuk penyimpanan berkas/video ke Cloud Storage (S3/R2) |
| `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION` | Jika menggunakan Payment Gateway Midtrans |

---

## 4. Akun Default Setelah Auto-Seed

Setelah deploy dan database terhubung, akun default berikut sudah siap digunakan:
- **Admin**: `admin@digidaya.tech` / `password123`
- **Peserta**: `peserta@ailms.id` / `password123`
- **HR Perusahaan**: `hr@company.com` / `password123`
