import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { signToken } from "@/lib/jwt";
import { sendPasswordResetEmail } from "@/lib/email";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request) {
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
    const resetToken = await signToken(
      { email: user.email, isPasswordReset: true },
      { expiresIn: "1h" }
    );

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/login?resetToken=${encodeURIComponent(resetToken)}`;

    await sendPasswordResetEmail(user.email, user.fullname || user.email, resetUrl).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Tautan reset password telah dikirim ke email Anda (berlaku 1 jam).",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
