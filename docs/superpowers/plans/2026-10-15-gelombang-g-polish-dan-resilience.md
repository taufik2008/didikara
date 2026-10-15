# Rencana Implementasi: Gelombang G — Polish, Resiliensi & Responsivitas

## Deskripsi
Menyelesaikan seluruh agenda Gelombang G dari `RENCANA_PERBAIKAN_2026-10.md`:
1. **G.2 Next.js App Router Error & Loading Resilience**:
   - Root error boundary `src/app/error.js` (`use client`, tangani runtime crash tanpa layar putih).
   - Root 404 page `src/app/not-found.js` (desain bertema DIDIKARA, navigasi kembali).
   - App error boundary `src/app/(app)/error.js` (resiliensi dalam context navigasi aplikasi).
   - App skeleton loading `src/app/(app)/loading.js` dan root `src/app/loading.js` (indikator transisi halaman).
2. **G.1 Responsivitas Komprehensif**:
   - Perluasan breakpoint di `src/app/globals.css` untuk mobile small (`< 480px`), mobile (`< 640px`), tablet (`< 1024px`).
   - Touch targets (min 44px), form layout, modal padding, table scroll handling, dan viewport safe-area insets.

## Verifikasi
- Automated test: `tests/resilience-and-polish.test.js`
- Full test suite: `npm test`
- Next.js Production Build: `npm run build`
