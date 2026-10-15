import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { catatAudit } from "@/lib/audit";
import { z } from "zod";
import crypto from "node:crypto";

const schema = z.object({
  resetToken: z.string().min(1),
  newPassword: z.string().min(8, "Kata sandi minimal 8 karakter"),
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

    // Hash token yang diterima untuk mencocokkan dengan yang ada di database
    const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    const { rows: tokens } = await query(
      `SELECT id, user_email FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [tokenHash]
    );

    if (tokens.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Tautan reset password tidak valid atau sudah kedaluwarsa.",
      }, { status: 400 });
    }

    const tokenRecord = tokens[0];
    const userEmail = tokenRecord.user_email;

    const hashedPassword = await hashPassword(newPassword);

    await query(
      "UPDATE users SET password = $1 WHERE email = $2 AND deleted_at IS NULL",
      [hashedPassword, userEmail]
    );

    // Tandai token sebagai sudah digunakan (sekali pakai)
    await query(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1",
      [tokenRecord.id]
    );

    // Cabut seluruh sesi aktif yang ada
    await query(
      "UPDATE user_sessions SET revoked_at = NOW() WHERE user_email = $1 AND revoked_at IS NULL",
      [userEmail]
    ).catch(() => {});

    // Catat ke audit log
    await catatAudit(userEmail, "reset_password", "user", userEmail, {
      reason: "password_reset_via_token",
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Kata sandi berhasil diperbarui. Silakan login dengan kata sandi baru Anda.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
