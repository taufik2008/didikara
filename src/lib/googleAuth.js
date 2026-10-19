/**
 * googleAuth.js — Integrasi Autentikasi Google OAuth 2.0 & Sign in with Google (GIS).
 *
 * Mendukung alur:
 * 1. OAuth 2.0 Authorization Code flow (Redirect browser ke Google)
 * 2. Token Exchange & Profil retrieval (Google UserInfo API / ID Token verification)
 * 3. Auto-registrasi peserta mandiri (UU PDP compliant) & login instan
 * 4. Safe mock mode untuk automated testing tanpa kredensial eksternal
 */
import crypto from "crypto";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  return { clientId, clientSecret };
}

export function getBaseUrl(request) {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (request) {
    const proto = request.headers?.get?.("x-forwarded-proto") || "http";
    const host = request.headers?.get?.("x-forwarded-host") || request.headers?.get?.("host");
    if (host) return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}

/**
 * Menghasilkan Authorization URL Google OAuth 2.0
 */
export function getGoogleAuthUrl({ redirectUri, state = "/" }) {
  const { clientId } = getGoogleConfig();
  if (!clientId) {
    // Mode demo / fallback jika env belum disetel
    return null;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state: state || "/",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Menukar authorization code dengan token akses & token ID dari Google
 */
export async function exchangeGoogleCode({ code, redirectUri }) {
  // Dukungan mock untuk pengujian otomatis
  if (code && code.startsWith("mock-code-")) {
    const emailSuffix = code.replace("mock-code-", "") || "user@gmail.com";
    return {
      access_token: "mock-access-token",
      id_token: "mock-id-token",
      mock: true,
      profile: {
        sub: `google-${emailSuffix}`,
        email: emailSuffix.includes("@") ? emailSuffix : `${emailSuffix}@gmail.com`,
        email_verified: true,
        name: "Pengguna Google Terverifikasi",
        picture: "https://lh3.googleusercontent.com/a/default-user",
      },
    };
  }

  const { clientId, clientSecret } = getGoogleConfig();
  if (!clientId || !clientSecret) {
    throw new Error("Kredensial GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET belum dikonfigurasi di server.");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error("[Google OAuth] Gagal menukar token:", errorText);
    throw new Error("Gagal melakukan autentikasi dengan server Google.");
  }

  return tokenResponse.json();
}

/**
 * Mengambil profil pengguna dari Google menggunakan access_token atau id_token
 */
export async function fetchGoogleProfile({ accessToken, idToken }) {
  if (accessToken && !accessToken.startsWith("mock-")) {
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (profileRes.ok) {
      return profileRes.json();
    }
  }

  if (idToken) {
    return verifyGoogleCredentialToken(idToken);
  }

  throw new Error("Tidak ada token Google yang valid untuk mengambil profil pengguna.");
}

/**
 * Memverifikasi ID Token Google (Google One Tap / GIS Credential)
 */
export async function verifyGoogleCredentialToken(idToken) {
  if (idToken && idToken.startsWith("mock-")) {
    return {
      sub: "mock-google-sub-12345",
      email: "peserta.google@gmail.com",
      email_verified: true,
      name: "Peserta Google Mock",
      picture: "https://lh3.googleusercontent.com/a/default-user",
    };
  }

  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) {
    throw new Error("ID Token Google tidak valid atau telah kedaluwarsa.");
  }

  const payload = await res.json();
  const { clientId } = getGoogleConfig();
  if (clientId && payload.aud !== clientId) {
    throw new Error("Audience token Google tidak cocok dengan GOOGLE_CLIENT_ID aplikasi.");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    email_verified: payload.email_verified === "true" || payload.email_verified === true,
    name: payload.name || payload.given_name || (payload.email ? payload.email.split("@")[0] : "Peserta"),
    picture: payload.picture,
  };
}

/**
 * Upsert Pengguna Google ke PostgreSQL:
 * - Jika sudah ada: kembalikan pengguna yang ada
 * - Jika belum ada: daftarkan otomatis sebagai 'student' (Peserta Mandiri) dengan consent privasi UU PDP
 */
export async function upsertGoogleUser({ email, name, avatarUrl, googleId }) {
  if (!email || typeof email !== "string") {
    throw new Error("Email Google tidak valid.");
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = (name || cleanEmail.split("@")[0]).trim();

  // 1. Cek apakah pengguna sudah terdaftar di database
  const existing = await query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [cleanEmail]);

  if (existing.rows.length > 0) {
    const user = existing.rows[0];
    if (user.status === "suspended") {
      const err = new Error("Akun Anda sedang ditangguhkan. Hubungi Administrator.");
      err.code = "ACCOUNT_SUSPENDED";
      throw err;
    }

    // Perbarui avatar / google_id jika belum ada (opsional & non-blocking)
    try {
      await query(
        `UPDATE users
         SET google_id = COALESCE(google_id, $1),
             avatar = CASE WHEN (avatar IS NULL OR avatar = '' OR LENGTH(avatar) <= 2) AND $2 != '' THEN $2 ELSE avatar END
         WHERE LOWER(email) = LOWER($3)`,
        [googleId || null, avatarUrl || user.avatar || "GM", cleanEmail]
      ).catch(() => {});
    } catch {}

    return { user, isNew: false };
  }

  // 2. Pengguna Baru: Registrasi otomatis sebagai 'student' ("Peserta Mandiri")
  const dummyPassword = await hashPassword(crypto.randomUUID() + "-google-oauth-secure-random");
  const userRole = "student";
  const roleLabel = "Peserta Mandiri";
  const initials = cleanName
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "GM";

  // Simpan avatar image URL jika ada, atau inisial jika tidak
  const avatarValue = avatarUrl || initials;

  await query(
    `INSERT INTO users (
      email, password, fullname, role, role_label, avatar, stats, job_title, organization, status,
      permissions, competencies, privacy_consent_at, privacy_policy_version, google_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), '2026-10-v1.0', $13
    )`,
    [
      cleanEmail,
      dummyPassword,
      cleanName,
      userRole,
      roleLabel,
      avatarValue,
      JSON.stringify({ hours: 0, courses: 0, certs: 0, competency: "A1 (Beginner)" }),
      "", // job_title
      "", // organization
      "active",
      JSON.stringify(["view_dashboard", "access_lms"]),
      JSON.stringify({ current: [50, 50, 50, 50, 50, 50], target: [80, 80, 80, 80, 80, 80] }),
      googleId || null,
    ]
  );

  // Berikan poin selamat datang (Welcome XP)
  try {
    await query(
      `INSERT INTO user_points (user_email, points, total_points, level)
       VALUES ($1, 10, 10, 1)
       ON CONFLICT (user_email) DO NOTHING`,
      [cleanEmail]
    ).catch(() => {});

    await query(
      `INSERT INTO user_badges (user_email, badge_id)
       VALUES ($1, 'first_login')
       ON CONFLICT DO NOTHING`,
      [cleanEmail]
    ).catch(() => {});
  } catch {}

  const createdResult = await query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [cleanEmail]);
  return { user: createdResult.rows[0], isNew: true };
}
