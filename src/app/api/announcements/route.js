/**
 * GET  /api/announcements?courseId=c1   → { announcements }
 * POST /api/announcements               → buat pengumuman (admin/corporate/gov)
 * DELETE /api/announcements?id=N        → hapus
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

/**
 * Kewenangan mengajar berasal dari penugasan di tabel `course_instructors`
 * (lihat src/lib/courseAccess.js), bukan dari peran. Dengan konstanta peran
 * yang lama, setiap pengguna corporate/government otomatis menjadi instruktur
 * SETIAP kursus di platform — termasuk milik instansi lain.
 */
import { canManageCourse } from "@/lib/courseAccess";

const createSchema = z.object({
  courseId: z.string().min(1),
  title:    z.string().min(1).max(200),
  content:  z.string().min(1),
});

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "courseId wajib" }, { status: 400 });

  try {
    const r = await query(
      `SELECT a.*, u.fullname AS author_name
       FROM announcements a
       JOIN users u ON u.email = a.author_email
       WHERE a.course_id = $1
       ORDER BY a.created_at DESC`,
      [courseId]
    );
    return NextResponse.json({ success: true, announcements: r.rows });
  } catch {
    return NextResponse.json({ success: true, announcements: [] });
  }
}

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  if (!(await canManageCourse(user, parsed.data.courseId))) {
    return NextResponse.json({ error: "Anda bukan pengajar kursus ini" }, { status: 403 });
  }

  try {
    const { courseId, title, content } = parsed.data;
    const r = await query(
      `INSERT INTO announcements (course_id, author_email, title, content)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [courseId, user.email, title, content]
    );

    // Kirim notif ke semua enrolled user
    try {
      await query(
        `INSERT INTO notifications (user_email, type, title, message, link)
         SELECT e.user_email, 'announcement', $1, $2, '/lms'
         FROM enrollments e WHERE e.course_id = $3 AND e.status = 'active'`,
        [`Pengumuman: ${title}`, content.substring(0, 120), courseId]
      );
    } catch { /* notifikasi opsional */ }

    // Audit
    try {
      await query(
        `INSERT INTO audit_logs (actor_email, action, entity_type, entity_id, detail)
         VALUES ($1, 'create_announcement', 'course', $2, $3)`,
        [user.email, courseId, JSON.stringify({ title })]
      );
    } catch { /* audit opsional */ }

    return NextResponse.json({ success: true, announcement: r.rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });

  // Pengumuman hanya boleh dihapus pengajar kursusnya (atau admin).
  const { rows: [pengumuman] } = await query(
    "SELECT course_id FROM announcements WHERE id = $1", [id]
  );
  if (!pengumuman) return NextResponse.json({ error: "Pengumuman tidak ditemukan" }, { status: 404 });
  if (!(await canManageCourse(user, pengumuman.course_id))) {
    return NextResponse.json({ error: "Anda bukan pengajar kursus ini" }, { status: 403 });
  }

  try {
    await query(
      "DELETE FROM announcements WHERE id = $1 AND (author_email = $2 OR $3 = 'admin')",
      [id, user.email, user.role]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
