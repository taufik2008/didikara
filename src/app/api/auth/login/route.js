import { NextResponse } from "next/server";
import { z } from "zod";
import { comparePassword, signToken } from "@/lib/auth";
import { recordSession } from "@/lib/session";
import { query } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendWelcomeEmail } from "@/lib/email";

const loginSchema = z.object({
  email: z.string().email({ message: "Format email tidak valid" }),
  password: z.string().min(6, { message: "Password minimal 6 karakter" }),
});

export async function POST(request) {
  // 1. Rate limiting per IP
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { limited, retryAfter } = checkRateLimit(`login:${ip}`, 5, 60_000);
  if (limited) {
    return NextResponse.json(
      { success: false, error: "Terlalu banyak percobaan. Coba lagi dalam 1 menit." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  // 2. Parse & validasi body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Request body tidak valid" }, { status: 400 });
  }

  // Proteksi Spam & Bot: Jika field honeypot terisi, tolak langsung
  if (body?.honeypot || body?.website_url || body?._hp) {
    return NextResponse.json({ success: false, error: "Spam bot request terdeteksi" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((e) => e.message).join("; ");
    return NextResponse.json({ success: false, error: messages }, { status: 400 });
  }

  const { email, password } = parsed.data;

  // 3. Cari user di DB
  let user;
  try {
    const result = await query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Email atau kata sandi salah" },
        { status: 401 }
      );
    }
    user = result.rows[0];
  } catch (dbErr) {
    console.error("Login DB connection/query error:", dbErr?.message || dbErr);
    const hasDbEnv = !!(
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_HOST
    );
    return NextResponse.json(
      {
        success: false,
        error: hasDbEnv
          ? `Gagal terhubung ke database: ${dbErr?.message || "Koneksi database bermasalah"}`
          : "Database belum terkonfigurasi di Vercel (DATABASE_URL / POSTGRES_URL tidak ditemukan).",
      },
      { status: 503 }
    );
  }

  if (user.status === "suspended") {
    return NextResponse.json(
      { success: false, error: "Akun Anda sedang ditangguhkan. Hubungi Administrator." },
      { status: 403 }
    );
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) {
    return NextResponse.json(
      { success: false, error: "Email atau kata sandi salah" },
      { status: 401 }
    );
  }

  // 4. Buat JWT
  const token = await signToken({
    email: user.email,
    role: user.role,
    fullname: user.fullname,
  });

  // Catat sesi supaya daftar "Sesi Aktif" terisi dan pencabutan bisa bekerja.
  await recordSession(user.email, token, {
    userAgent: request.headers.get("user-agent") || "",
    ip,
  });

  const response = NextResponse.json({
    success: true,
    user: {
      email: user.email,
      fullname: user.fullname,
      role: user.role,
      roleLabel: user.role_label,
      avatar: user.avatar,
      stats: user.stats,
      jobTitle: user.job_title,
      organization: user.organization,
      status: user.status,
      permissions: user.permissions,
      competencies: user.competencies,
    },
  });

  // Award XP untuk login — fire-and-forget
  try {
    await query(
      `INSERT INTO user_points (user_email, points, total_points, level)
       VALUES ($1, 5, 5, 1)
       ON CONFLICT (user_email) DO UPDATE SET
         points = user_points.points + 5,
         total_points = user_points.total_points + 5,
         last_activity_date = CURRENT_DATE,
         updated_at = NOW()`,
      [user.email]
    ).catch(() => {});
    // Badge first_login
    await query(
      `INSERT INTO user_badges (user_email, badge_id) VALUES ($1, 'first_login') ON CONFLICT DO NOTHING`,
      [user.email]
    ).catch(() => {});
  } catch { /* opsional */ }

  response.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 hari
    path: "/",
  });

  return response;
}
