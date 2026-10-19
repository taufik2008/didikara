import { NextResponse } from "next/server";
import { getBaseUrl, exchangeGoogleCode, fetchGoogleProfile, upsertGoogleUser } from "@/lib/googleAuth";
import { signToken } from "@/lib/jwt";
import { recordSession } from "@/lib/session";

/**
 * GET /api/auth/google/callback
 * Menerima callback redirect dari Google setelah pengguna memberikan izin login/daftar.
 */
export async function GET(request) {
  const origin = getBaseUrl(request);
  const searchParams = request.nextUrl.searchParams;

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const authError = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  // Cegah open redirect: pastikan hanya path lokal yang diawali '/' dan bukan '//'
  let safeDestination = "/dashboard";
  if (state && typeof state === "string" && state.startsWith("/") && !state.startsWith("//")) {
    safeDestination = state;
  }

  // 1. Tangani jika Google mengembalikan error / user membatalkan
  if (authError) {
    console.warn("[Google OAuth Callback] Error dari Google:", authError, errorDesc);
    const targetUrl = new URL("/", origin);
    targetUrl.searchParams.set("error", "google_access_denied");
    targetUrl.searchParams.set("message", errorDesc || "Persetujuan akun Google dibatalkan atau ditolak.");
    return NextResponse.redirect(targetUrl);
  }

  if (!code) {
    const targetUrl = new URL("/", origin);
    targetUrl.searchParams.set("error", "missing_code");
    targetUrl.searchParams.set("message", "Kode otorisasi Google tidak ditemukan.");
    return NextResponse.redirect(targetUrl);
  }

  try {
    const redirectUri = `${origin}/api/auth/google/callback`;

    // 2. Tukar kode otorisasi dengan token
    const tokenData = await exchangeGoogleCode({ code, redirectUri });

    // 3. Ambil data profil pengguna Google
    let profile;
    if (tokenData.mock && tokenData.profile) {
      profile = tokenData.profile;
    } else {
      profile = await fetchGoogleProfile({
        accessToken: tokenData.access_token,
        idToken: tokenData.id_token,
      });
    }

    if (!profile || !profile.email) {
      throw new Error("Gagal memperoleh data email dari akun Google Anda.");
    }

    // 4. Daftarkan / ambil pengguna di database
    const { user } = await upsertGoogleUser({
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture,
      googleId: profile.sub,
    });

    // 5. Buat token JWT sesi
    const token = await signToken({
      email: user.email,
      role: user.role,
      fullname: user.fullname,
    });

    const ip = request.headers.get("x-forwarded-for") || "unknown";
    await recordSession(user.email, token, {
      userAgent: request.headers.get("user-agent") || "Google OAuth Web",
      ip,
    });

    // 6. Buat respons redirect ke dashboard atau tujuan yang diminta
    const destinationUrl = new URL(safeDestination, origin);
    const response = NextResponse.redirect(destinationUrl);

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 hari
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[Google OAuth Callback Error]:", err);
    const targetUrl = new URL("/", origin);
    targetUrl.searchParams.set("error", "google_auth_failed");
    targetUrl.searchParams.set("message", err.message || "Gagal menyelesaikan proses autentikasi Google.");
    return NextResponse.redirect(targetUrl);
  }
}
