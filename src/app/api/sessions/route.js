/**
 * GET  /api/sessions          → list sesi aktif user saat ini (admin: semua user, user: milik sendiri)
 * DELETE /api/sessions?id=N  → revoke sesi tertentu
 * DELETE /api/sessions?all=1 → revoke semua sesi (kecuali saat ini)
 */
import { NextResponse } from "next/server";
import { authenticateRequest, getTokenFromRequest } from "@/lib/auth";
import { hashToken } from "@/lib/session";
import { query } from "@/lib/db";

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tokenGet     = getTokenFromRequest(request);
  const hashSaatIniGet = tokenGet ? hashToken(tokenGet) : "";

  try {
    let sessions;
    if (user.role === "admin") {
      // Admin lihat semua sesi aktif
      sessions = await query(`
        SELECT s.*, u.fullname, u.role
        FROM user_sessions s
        JOIN users u ON u.email = s.user_email
        WHERE s.revoked_at IS NULL
        ORDER BY s.last_active DESC
        LIMIT 100
      `);
    } else {
      // User lihat sesi milik sendiri
      sessions = await query(`
        SELECT * FROM user_sessions
        WHERE user_email = $1 AND revoked_at IS NULL
        ORDER BY last_active DESC
      `, [user.email]);
    }
    // Hash token tidak perlu ikut ke klien — daftar sesi hanya butuh identitas
    // perangkat dan waktunya.
    const aman = sessions.rows.map(({ session_token: _t, ...sisa }) => ({
      ...sisa,
      is_current: hashSaatIniGet && _t === hashSaatIniGet,
    }));
    return NextResponse.json({ success: true, sessions: aman });
  } catch (err) {
    return NextResponse.json({ success: false, sessions: [], error: err.message });
  }
}

export async function DELETE(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id  = searchParams.get("id");
  const all = searchParams.get("all");
  // Tabel menyimpan hash token, jadi yang dibandingkan juga hash-nya.
  const currentToken = getTokenFromRequest(request);
  const hashSaatIni  = currentToken ? hashToken(currentToken) : "";

  try {
    if (all === "1") {
      // Revoke semua kecuali token saat ini
      await query(
        `UPDATE user_sessions SET revoked_at = NOW()
         WHERE user_email = $1 AND revoked_at IS NULL AND session_token != $2`,
        [user.email, hashSaatIni]
      );
      return NextResponse.json({ success: true, message: "Semua sesi lain dicabut" });
    }
    if (id) {
      // Hanya pemilik atau admin yang bisa revoke sesi tertentu
      const check = await query("SELECT user_email FROM user_sessions WHERE id = $1", [id]);
      if (check.rows.length === 0) return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
      if (check.rows[0].user_email !== user.email && user.role !== "admin") {
        return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
      }
      await query("UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1", [id]);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Perlu id atau all=1" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
