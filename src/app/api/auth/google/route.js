import { NextResponse } from "next/server";
import { getGoogleAuthUrl, getBaseUrl, verifyGoogleCredentialToken, upsertGoogleUser } from "@/lib/googleAuth";
import { signToken } from "@/lib/jwt";
import { recordSession } from "@/lib/session";
import { hasActiveSubscription } from "@/lib/courseAccess";

/**
 * GET /api/auth/google
 * Menginisialisasi alur Google OAuth 2.0.
 * Redirect browser pengguna ke halaman persetujuan Akun Google (accounts.google.com).
 */
export async function GET(request) {
  try {
    const origin = getBaseUrl(request);
    const searchParams = request.nextUrl.searchParams;
    const redirectParam = searchParams.get("redirect") || "/dashboard";
    const format = searchParams.get("format");

    const callbackUrl = `${origin}/api/auth/google/callback`;
    const authUrl = getGoogleAuthUrl({ redirectUri: callbackUrl, state: redirectParam });

    if (!authUrl) {
      if (format === "json") {
        return NextResponse.json({
          success: false,
          configured: false,
          error: "Google OAuth belum dikonfigurasi di server. Setel GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET pada berkas konfigurasi (.env.local).",
        }, { status: 503 });
      }

      // Alihkan ke login dengan pesan informatif jika kredensial belum ada
      const targetUrl = new URL("/", origin);
      targetUrl.searchParams.set("error", "google_unconfigured");
      targetUrl.searchParams.set("message", "Google OAuth belum dikonfigurasi di server. Hubungi administrator.");
      return NextResponse.redirect(targetUrl);
    }

    if (format === "json") {
      return NextResponse.json({ success: true, url: authUrl });
    }

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("[Google Auth Error]:", error);
    const origin = getBaseUrl(request);
    const targetUrl = new URL("/", origin);
    targetUrl.searchParams.set("error", "google_init_failed");
    targetUrl.searchParams.set("message", error.message || "Gagal menghubungkan ke layanan Google");
    return NextResponse.redirect(targetUrl);
  }
}

/**
 * POST /api/auth/google
 * Mendukung Sign in with Google (GIS) / Google One Tap langsung via ID Token.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { credential, idToken } = body || {};

    const tokenToVerify = credential || idToken;
    if (!tokenToVerify) {
      return NextResponse.json({ success: false, error: "Kredensial token Google tidak ditemukan." }, { status: 400 });
    }

    // 1. Verifikasi token ke Google
    const profile = await verifyGoogleCredentialToken(tokenToVerify);
    if (!profile || !profile.email) {
      return NextResponse.json({ success: false, error: "Profil akun Google tidak valid." }, { status: 401 });
    }

    // 2. Upsert user (auto-register jika belum ada)
    const { user, isNew } = await upsertGoogleUser({
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture,
      googleId: profile.sub,
    });

    // 3. Buat sesi JWT
    const token = await signToken({
      email: user.email,
      role: user.role,
      fullname: user.fullname,
    });

    const ip = request.headers.get("x-forwarded-for") || "unknown";
    await recordSession(user.email, token, {
      userAgent: request.headers.get("user-agent") || "Google Sign-In",
      ip,
    });

    const isSubscribed = await hasActiveSubscription(user);

    const response = NextResponse.json({
      success: true,
      isNewUser: isNew,
      user: {
        email: user.email,
        fullname: user.fullname,
        role: user.role,
        roleLabel: user.role_label,
        avatar: user.avatar,
        stats: typeof user.stats === "string" ? JSON.parse(user.stats) : user.stats,
        jobTitle: user.job_title,
        organization: user.organization,
        status: user.status,
        permissions: typeof user.permissions === "string" ? JSON.parse(user.permissions) : user.permissions,
        competencies: typeof user.competencies === "string" ? JSON.parse(user.competencies) : user.competencies,
        is_subscribed: isSubscribed,
        subscription_status: isSubscribed ? "active" : (user.subscription_status || "inactive"),
        subscription_plan: user.subscription_plan || (user.role === "admin" ? "admin_pass" : null),
        subscription_expires_at: user.subscription_expires_at || null,
      },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 hari
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[Google Auth POST Error]:", error);
    const status = error.code === "ACCOUNT_SUSPENDED" ? 403 : 500;
    return NextResponse.json({
      success: false,
      error: error.message || "Gagal memproses autentikasi Google",
    }, { status });
  }
}
