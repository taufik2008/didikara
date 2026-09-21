/**
 * GET    /api/course-instructors            → seluruh penugasan (admin)
 * GET    /api/course-instructors?courseId=x → penugasan satu kursus
 * POST   /api/course-instructors            { courseId, userEmail }
 * DELETE /api/course-instructors?courseId=x&userEmail=y
 *
 * Penugasan pengajar per kursus. Sebelum tabel ini ada, setiap pengguna
 * berperan corporate/government otomatis menjadi instruktur seluruh kursus di
 * platform — termasuk milik instansi lain. Hanya admin yang boleh menugaskan.
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";
import { catatAudit } from "@/lib/audit";

const skema = z.object({
  courseId:  z.string().min(1),
  userEmail: z.string().email(),
});

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");

  // Pengajar boleh melihat penugasannya sendiri; daftar penuh hanya untuk admin.
  const adminPenuh = user.role === "admin";

  try {
    const { rows } = await query(`
      SELECT ci.course_id, ci.user_email, ci.assigned_at, ci.assigned_by,
             u.fullname, u.organization, c.title AS course_title
        FROM course_instructors ci
        LEFT JOIN users   u ON u.email = ci.user_email
        LEFT JOIN courses c ON c.id    = ci.course_id
       WHERE ($1::text IS NULL OR ci.course_id = $1)
         AND ($2::boolean OR ci.user_email = $3)
       ORDER BY c.title NULLS LAST, u.fullname
    `, [courseId, adminPenuh, user.email]);

    return NextResponse.json({ success: true, assignments: rows });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Hanya admin yang dapat menugaskan pengajar" }, { status: 403 });
  }

  const parsed = skema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { courseId, userEmail } = parsed.data;

  try {
    const { rows: [ada] } = await query(
      "SELECT 1 AS ada FROM users WHERE email = $1 AND deleted_at IS NULL", [userEmail]
    );
    if (!ada) return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });

    await query(`
      INSERT INTO course_instructors (course_id, user_email, assigned_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (course_id, user_email) DO NOTHING
    `, [courseId, userEmail, user.email]);

    await catatAudit(user.email, "assign_course_instructor", "course_instructor", courseId, { courseId, userEmail });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const user = await authenticateRequest(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Hanya admin yang dapat mencabut penugasan" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const courseId  = searchParams.get("courseId");
  const userEmail = searchParams.get("userEmail");
  if (!courseId || !userEmail) {
    return NextResponse.json({ error: "courseId dan userEmail wajib" }, { status: 400 });
  }

  try {
    await query(
      "DELETE FROM course_instructors WHERE course_id = $1 AND user_email = $2",
      [courseId, userEmail]
    );
    await catatAudit(user.email, "revoke_course_instructor", "course_instructor", courseId, { courseId, userEmail });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
