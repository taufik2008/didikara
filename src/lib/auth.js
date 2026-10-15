/**
 * auth.js — kata sandi + autentikasi request.
 *
 * Penandatanganan token dipindah ke lib/jwt.js supaya `src/proxy.js` (runtime
 * Edge) dapat memverifikasi token tanpa ikut menarik driver PostgreSQL yang
 * dipakai pemeriksaan pencabutan sesi di bawah. Ekspor lama tetap tersedia dari
 * berkas ini agar route yang sudah ada tidak perlu diubah.
 */
import bcrypt from "bcryptjs";
import { getSecret, signToken, verifyToken, getTokenFromRequest } from "@/lib/jwt";
import { isTokenRevoked } from "@/lib/session";

export { getSecret, signToken, verifyToken, getTokenFromRequest };

const SALT_ROUNDS = 10;

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Autentikasi request: baca token dari cookie/header, verifikasi JWT, lalu
 * pastikan sesinya belum dicabut.
 *
 * Pemeriksaan pencabutan inilah yang membuat tombol "Cabut Sesi" di Modul Admin
 * benar-benar berarti; tanpa itu token yang dicabut tetap berlaku sampai
 * kedaluwarsa tujuh hari kemudian.
 */
export async function authenticateRequest(request) {
  // Seam untuk pengujian: tes otomatis bisa menimpa hasil autentikasi lewat
  // global._mockAuthUser tanpa perlu menyusun cookie/JWT asli, supaya tes
  // route bisa memeriksa PERILAKU nyata (otorisasi, respons) dan bukan
  // sekadar mencocokkan string di berkas sumbernya.
  if (global._mockAuthUser !== undefined) return global._mockAuthUser;

  const token = getTokenFromRequest(request);
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  if (await isTokenRevoked(token)) return null;

  return payload;
}
