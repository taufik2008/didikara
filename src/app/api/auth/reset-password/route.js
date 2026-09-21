import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/jwt";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  resetToken: z.string().min(1),
  newPassword: z.string().min(6, "Password minimal 6 karakter"),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: parsed.error.issues[0]?.message || "Data tidak valid",
      }, { status: 400 });
    }

    const { resetToken, newPassword } = parsed.data;
    const payload = await verifyToken(resetToken);

    if (!payload || !payload.isPasswordReset || !payload.email) {
      return NextResponse.json({
        success: false,
        error: "Tautan reset password tidak valid atau sudah kedaluwarsa.",
      }, { status: 400 });
    }

    const hashedPassword = await hashPassword(newPassword);

    await query(
      "UPDATE users SET password = $1 WHERE email = $2 AND deleted_at IS NULL",
      [hashedPassword, payload.email]
    );

    // Cabut seluruh sesi aktif yang ada
    await query(
      "UPDATE user_sessions SET revoked_at = NOW() WHERE user_email = $1 AND revoked_at IS NULL",
      [payload.email]
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Kata sandi berhasil diperbarui. Silakan login dengan kata sandi baru Anda.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
