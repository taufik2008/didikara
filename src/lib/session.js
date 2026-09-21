/**
 * session.js — catatan sesi login aktif.
 *
 * Fitur "lihat & cabut sesi" sudah punya UI dan endpoint sejak lama, tetapi
 * tabel `user_sessions` tidak pernah dibuat dan login tidak pernah mencatat
 * apa pun — sehingga daftarnya selalu kosong dan pencabutan tidak berefek.
 * Modul ini melengkapi bagian yang hilang.
 *
 * Yang disimpan adalah hash SHA-256 dari token, bukan tokennya. Basis data yang
 * bocor tidak boleh sekaligus membocorkan kunci sesi yang masih bisa dipakai.
 */
import { createHash } from "node:crypto";
import { query } from "@/lib/db";

export function hashToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

/** Catat sesi baru saat login berhasil. */
export async function recordSession(userEmail, token, { userAgent = "", ip = "" } = {}) {
  try {
    await query(
      `INSERT INTO user_sessions (user_email, session_token, user_agent, ip_address)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (session_token) DO UPDATE SET last_active = NOW(), revoked_at = NULL`,
      [userEmail, hashToken(token), String(userAgent).slice(0, 400), String(ip).slice(0, 64)]
    );
  } catch { /* pencatatan sesi tidak boleh menggagalkan login */ }
}

/** Tandai satu token sebagai dicabut (dipakai saat logout). */
export async function revokeToken(token) {
  if (!token) return;
  try {
    await query(
      "UPDATE user_sessions SET revoked_at = NOW() WHERE session_token = $1 AND revoked_at IS NULL",
      [hashToken(token)]
    );
  } catch { /* opsional */ }
}

/**
 * Apakah token ini sudah dicabut?
 *
 * Token yang tidak punya baris sama sekali dianggap SAH: sesi yang terbit
 * sebelum tabel ini ada tidak boleh ikut terputus saat pembaruan dipasang.
 * Baru setelah semua pengguna login ulang, setiap token punya catatannya.
 */
export async function isTokenRevoked(token) {
  if (!token) return false;
  try {
    const { rows: [baris] } = await query(
      "SELECT revoked_at FROM user_sessions WHERE session_token = $1",
      [hashToken(token)]
    );
    return Boolean(baris?.revoked_at);
  } catch {
    return false;   // basis data bermasalah tidak boleh mengunci semua orang
  }
}

/** Perbarui penanda aktivitas terakhir; dipanggil sesekali, bukan tiap request. */
export async function touchSession(token) {
  if (!token) return;
  try {
    await query(
      `UPDATE user_sessions SET last_active = NOW()
        WHERE session_token = $1 AND revoked_at IS NULL
          AND last_active < NOW() - INTERVAL '5 minutes'`,
      [hashToken(token)]
    );
  } catch { /* opsional */ }
}
