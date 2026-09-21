/**
 * GET /api/live-sessions/participants?id=12
 *
 * Daftar peserta satu sesi live beserta status kursi dan kehadiran — untuk
 * pengelola sesi (admin atau pengajar kursusnya). Kehadiran yang dicatat
 * endpoint join hanya berguna bila ada yang bisa membacanya.
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { canManageSession } from "@/lib/courseAccess";

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });

  try {
    const { rows: [sess] } = await query("SELECT * FROM live_sessions WHERE id = $1", [id]);
    if (!sess) return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    if (!(await canManageSession(user, sess))) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { rows } = await query(`
      SELECT r.user_email, r.status, r.attended, r.attended_at, r.registered_at,
             u.fullname, u.organization
        FROM live_session_registrations r
        LEFT JOIN users u ON u.email = r.user_email
       WHERE r.session_id = $1
       ORDER BY
         CASE r.status WHEN 'registered' THEN 0 WHEN 'waitlisted' THEN 1 ELSE 2 END,
         r.registered_at ASC
    `, [id]);

    const ringkas = {
      terdaftar: rows.filter(r => r.status === "registered").length,
      antre:     rows.filter(r => r.status === "waitlisted").length,
      batal:     rows.filter(r => r.status === "cancelled").length,
      hadir:     rows.filter(r => r.attended).length,
    };

    return NextResponse.json({ success: true, participants: rows, ringkas });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
