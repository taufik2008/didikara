import { NextResponse } from "next/server";
// Diambil dari lib/jwt, bukan lib/auth: proxy berjalan di runtime Edge dan
// tidak boleh ikut menarik driver PostgreSQL yang dipakai lib/auth.
import { verifyToken } from "@/lib/jwt";

const publicPaths = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  // Katalog kursus & verifikasi sertifikat memang dirancang publik.
  // /verify/[certId] adalah server component yang mem-fetch tanpa cookie.
  "/api/catalog",
  "/api/verify",
  // Penyapu live class dipanggil penjadwal tanpa cookie sesi; penjagaannya
  // ada di dalam route (header x-cron-secret atau admin yang sedang login).
  "/api/live-sessions/sweep",
  // Webhook email masuk dipanggil penyedia email tanpa cookie; penjagaannya
  // berupa rahasia bersama di dalam route (env INBOUND_EMAIL_SECRET).
  "/api/email/inbound",
  // Settings publik untuk tarif membership & instruksi pembayaran
  "/api/settings",
  // Pemberian izin akses materi Google Drive
  "/api/drive/grant-access",
];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Only protect /api/* routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow public auth paths
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check authentication
  const token = request.cookies.get("token")?.value ||
    request.headers.get("authorization")?.slice(7);

  if (!token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ success: false, error: "Invalid or expired token" }, { status: 401 });
  }

  // Attach user info to request headers for downstream routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-user-role", payload.role);
  requestHeaders.set("x-user-fullname", payload.fullname);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: "/api/:path*",
};
