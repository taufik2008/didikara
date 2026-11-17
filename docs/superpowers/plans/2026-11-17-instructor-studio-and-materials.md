# Implementation Plan: Instructor Studio & Course Materials Management

**Goal:** Memberikan peran instruktur (`role: "instructor"`) kemampuan penuh untuk mengelola materi kursus, mengunggah video/PDF/PPT modul, menilai tugas, serta membedakan menu sidebar instruktur dari peserta biasa.

---

## 1. File Structure & Changes

1. **`src/app/api/db/route.js`**:
   - Perbarui otorisasi `POST /api/db`: Izinkan `role === "instructor"` untuk menyimpan (`action === "save"`) kursus (`type === "course"`) yang mereka ampu (`canManageCourse(auth, data.id)`) atau kursus baru yang mereka buat.

2. **`src/lib/permissions.js`**:
   - Daftarkan `instructor-page` ke `PAGE_PERMISSION`.
   - Pastikan peran `instructor` dan `admin` memiliki akses ke `instructor-page`.

3. **`src/context/UIContext.js`**:
   - Daftarkan rute `"instructor-page": "/instructor"` ke `PATH_BY_PAGE`.

4. **`src/components/Sidebar.js`**:
   - Sesuaikan `menuItems` berdasarkan `currentUser.role`:
     - Jika `role === "instructor"`:
       - **Dashboard Instruktur** (`LayoutDashboard`) ➔ `/dashboard`
       - **Kelas Mengajar** (`GraduationCap` / `BookOpenCheck`) ➔ `/instructor`
       - **AI Portal Perencanaan** (`Compass`) ➔ `/ai-planner`
     - Menu Peserta (`Portofolio Saya`, `Riwayat Transaksi`, `Katalog Pelatihan`) disembunyikan untuk instruktur agar antarmuka bersih dan terfokus pada pengajaran.

5. **`src/components/Instructor/InstructorStudioPage.js` (Baru)**:
   - Komponen halaman Studio Instruktur:
     - Header profil pengajar & ringkasan statistik (jumlah kursus diampu, total peserta terdaftar, rating rata-rata).
     - Tombol aksi "+ Buat Kursus Baru".
     - Kartu kursus yang diampu instruktur:
       - Cover image, badge, tipe pembelajaran (Self-Learning / Live Online / Offline Workshop).
       - Tombol aksi:
         - **`[ ✏️ Kelola Materi & Modul ]`**: Membuka `LmsManageModal` untuk upload video, PDF, PPT, dan kuis.
         - **`[ 📝 Penilaian Tugas ]`**: Membuka tab penilaian submisi esai/proyek peserta.
         - **`[ 👁️ Tinjau Kelas ]`**: Membuka `/kelas` untuk melihat tampilan kursus dari sudut pandang siswa.

6. **`src/app/(app)/instructor/page.js` (Baru)**:
   - Route Next.js App Router untuk `/instructor` yang merender `<InstructorStudioPage />`.

7. **`src/components/Lms/LmsPage.js`**:
   - Tambahkan tombol aksi cepat di bagian atas daftar kurikulum modul jika pengguna yang sedang melihat kursus adalah pengajar kursus tersebut (`isInstructor === true`):
     - Tombol **`[ ✏️ Kelola Materi & Soal ]`** yang langsung memicu `handleOpenLmsManageModal(activeCourse)`.

---

## 2. Testing Strategy
- Jalankan `npm test` untuk memastikan seluruh 75 pengujian tetap lulus (100% pass rate).
- Tambahkan unit test untuk verifikasi otorisasi instruktur di `api/db/route.js`.
- Verifikasi build produksi Next.js dengan `npm run build`.
- Commit, push ke `main`, dan verifikasi deployment live di Vercel.
