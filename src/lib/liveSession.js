/**
 * liveSession.js — aturan waktu sesi live, dipakai bersama oleh route daftar
 * sesi, pintu bergabung, dan penyapu status.
 */

/** Ruang dibuka 15 menit sebelum mulai. */
export const MENIT_BUKA_SEBELUM = 15;
/** Masih dianggap berlangsung sampai 30 menit setelah jadwal selesai. */
export const MENIT_TOLERANSI_AKHIR = 30;

export function jendelaBergabung(session) {
  const mulai  = new Date(session.scheduled_at).getTime();
  const durasi = (session.duration_minutes || 60) * 60_000;
  return {
    mulai,
    selesai: mulai + durasi,
    buka:  mulai - MENIT_BUKA_SEBELUM * 60_000,
    tutup: mulai + durasi + MENIT_TOLERANSI_AKHIR * 60_000,
  };
}

export function bolehBergabungSekarang(session, kini = Date.now()) {
  const { buka, tutup } = jendelaBergabung(session);
  return kini >= buka && kini <= tutup;
}
