import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rateLimit";
import { z } from "zod";
import crypto from "node:crypto";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { limited, retryAfter } = checkRateLimit(`forgot-pw:${ip}`, 5, 60_000);
  if (limited) {
    return NextResponse.json(
      { success: false, error: "Terlalu banyak permintaan reset password. Coba lagi dalam 1 menit." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Format email tidak valid" }, { status: 400 });
    }

    const { email } = parsed.data;
    const { rows } = await query("SELECT email, fullname FROM users WHERE email = $1 AND deleted_at IS NULL", [email]);

    // Hindari user enumeration: selalu balas sukses
    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Jika email terdaftar, tautan reset password telah dikirim ke kotak masuk Anda.",
      });
    }

    const user = rows[0];

    // Generate token acak 32-byte & simpan hash SHA-256 (kedaluwarsa 30 menit)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    await query(
      `INSERT INTO password_reset_tokens (user_email, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
      [user.email, tokenHash]
    );

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/login?resetToken=${encodeURIComponent(rawToken)}`;

    await sendPasswordResetEmail(user.email, user.fullname || user.email, resetUrl).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Tautan reset password telah dikirim ke email Anda (berlaku 30 menit).",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
