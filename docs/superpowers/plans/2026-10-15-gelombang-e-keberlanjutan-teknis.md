# Gelombang E: Keberlanjutan Teknis (Technical Sustainability) Implementation Plan

Rencana implementasi refaktor arsitektur frontend dan context domain dari `E:\lms\RENCANA_PERBAIKAN_2026-10.md` (Gelombang E).
Tujuan utama:
1. Menghilangkan bottleneck re-render monolitik pada `AppContext.js` (1318 baris, 70+ state, unmemoized value).
2. Memisahkan state per domain fungsional: `UIContext`, `AuthContext`, `CourseContext`, dan `AdminContext` masing-masing < 350 baris dengan `useMemo`.
3. Menjaga kompatibilitas 100% ke belakang terhadap seluruh 23 komponen konsumen `useApp()` yang sudah ada.
4. Memperbarui dokumentasi arsitektur `ARCHITECTURE.md`.

---

## User Review Required

> [!IMPORTANT]
> **Zero Breaking Changes:**
> Seluruh signature property dan method pada `useApp()` dipertahankan tanpa perubahan, sehingga seluruh komponen UI (`LmsPage.js`, `AdminPage.js`, `Header.js`, dll.) tetap berfungsi normal tanpa regresi fungsional.
> Komponen-komponen baru atau terisolasi dapat langsung mengimpor domain context spesifik (`useUI`, `useAuth`, `useCourse`, `useAdmin`) untuk efisiensi render maksimal.

---

## Proposed Changes

### 1. Domain UI Context (`src/context/UIContext.js`)
- **Tanggung jawab:** Tema (`theme`, `toggleTheme`), sidebar collapse (`sidebarCollapsed`, `toggleSidebar`), serta navigasi halaman sinkron URL (`activePage`, `setActivePage`).
- **Ekspor:** `UIProvider`, `useUI`.
- Nilai context di-memoize dengan `useMemo`.

### 2. Domain Auth Context (`src/context/AuthContext.js`)
- **Tanggung jawab:** Sesi otentikasi pengguna (`currentUser`, `sessionChecked`, `activeRole`), form login prefill/switch role, dan handler `handleLoginSubmit` serta `handleLogout`.
- **Ekspor:** `AuthProvider`, `useAuth`.
- Nilai context di-memoize dengan `useMemo`.

### 3. Domain Course & LMS Context (`src/context/CourseContext.js`)
- **Tanggung jawab:** Katalog kursus (`courses`), pendaftaran (`enrolledCourses`), kursus aktif (`activeCourse`), pelajaran aktif (`activeLessonIndex`, `flatLessons`), pemutar video & pelacakan kemajuan (`videoPlaying`, `videoProgress`, `videoTime`, `completedLessons`), sesi ujian & timer (`examSession`, `examTimeRemaining`), forum diskusi, kehadiran, dan modal pembayaran/sertifikat.
- **Ekspor:** `CourseProvider`, `useCourse`.
- Nilai context di-memoize dengan `useMemo`.

### 4. Domain Admin Context (`src/context/AdminContext.js`)
- **Tanggung jawab:** Manajemen pengguna (`users`, `filteredUsers`, `userSearchQuery`, `userRoleFilter`, `userStatusFilter`), kategori & level kursus (`categories`, `levels`, `competencySkills`), modal CRUD manajemen kursus/user, modal materi LMS (`lmsManageModalActive`), dan pengaturan platform branding (`platformSettings`).
- **Ekspor:** `AdminProvider`, `useAdmin`.
- Nilai context di-memoize dengan `useMemo`.

### 5. Orchestrator AppContext (`src/context/AppContext.js` & `useApp.js`)
- Menggabungkan provider secara bertingkat: `<UIProvider><AuthProvider><CourseProvider><AdminProvider>{children}</AdminProvider></CourseProvider></AuthProvider></UIProvider>`.
- Mengekspor `useApp()` yang menggabungkan seluruh domain hook secara aman dan termemoize (`useMemo`), serta mengekspor `useUI`, `useAuth`, `useCourse`, `useAdmin`.

### 6. Dokumentasi Arsitektur (`ARCHITECTURE.md`)
- Pembaruan menyeluruh memuat diagram domain context terpisah, struktur App Router Next.js 16 (Turbopack), dan inventori endpoint API.

---

## Verification Plan

### Automated Tests
- `tests/context-architecture.test.js`:
  - Memverifikasi keberadaan modul context terpisah: `UIContext.js`, `AuthContext.js`, `CourseContext.js`, `AdminContext.js`.
  - Memverifikasi implementasi `useMemo` pada seluruh domain context provider untuk mencegah tree-wide re-render.
  - Memverifikasi ketersediaan ekspor domain hooks (`useUI`, `useAuth`, `useCourse`, `useAdmin`) dan backwards compatibility `useApp`.
- `npm test`: Seluruh 41 tests yang ada + test arsitektur baru (total 42 tests) wajib PASS (100% hijau).
- `npm run build`: Kompilasi Turbopack Next.js 16 wajib sukses tanpa peringatan/error.
