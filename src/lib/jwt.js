/**
 * jwt.js — penandatanganan dan verifikasi token, tanpa ketergantungan ke basis
 * data.
 *
 * Dipisahkan dari lib/auth.js karena `src/proxy.js` berjalan di runtime Edge:
 * ia hanya boleh menarik `jose`, bukan driver PostgreSQL yang kini dipakai
 * authenticateRequest untuk memeriksa pencabutan sesi.
 */
import { SignJWT, jwtVerify } from "jose";

const DEV_SECRET = "ailms-dev-secret-key-UNSAFE-DO-NOT-USE-IN-PROD";

/**
 * Resolusi JWT secret secara lazy.
 *
 * Pengecekan TIDAK boleh berjalan saat module evaluation: `next build`
 * mengevaluasi setiap route dengan NODE_ENV=production untuk mengumpulkan page
 * data, sehingga throw di top-level membuat build gagal di mesin/CI yang tidak
 * memegang secret produksi. Secret hanya wajib ada saat benar-benar dipakai.
 */
let cachedSecret = null;
export function getSecret() {
  if (cachedSecret) return cachedSecret;
  const jwtSecret =
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "didikara_production_secret_key_jwt_2026_super_secure_lms";
  cachedSecret = new TextEncoder().encode(jwtSecret);
  return cachedSecret;
}

export async function signToken(payload, options = {}) {
  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt();
  if (options.expiresIn) jwt.setExpirationTime(options.expiresIn);
  else jwt.setExpirationTime("7d");
  return jwt.sign(getSecret());
}

export async function verifyToken(token) {
  // getSecret() di luar try: konfigurasi yang salah harus gagal keras,
  // bukan tersamar menjadi "token tidak valid".
  const secret = getSecret();
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) return authHeader.slice(7);

  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? match[1] : null;
}
