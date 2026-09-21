/**
 * GET  /api/assignments?courseId=x[&lessonIndex=n]
 *        Peserta  → pengumpulan miliknya sendiri beserta nilainya.
 *        Pengajar → seluruh pengumpulan di kursus itu (butuh kewenangan kursus).
 *
 * POST /api/assignments   { courseId, lessonIndex?, fileUrl?, fileName?, note? }
 *        Peserta mengumpulkan atau memperbarui tugas. Wajib terdaftar di kelas.
 *
 * DELETE /api/assignments?courseId=x&lessonIndex=n
 *        Menarik kembali pengumpulan selama belum dinilai.
 *
 * Sebelum ini tidak ada tempat menyimpan tugas sama sekali: tombol unggah di
 * kelas hanya menunggu dua detik lalu menyatakan berhasil, sementara instruktur
 * memberi nilai pada berkas yang tidak pernah ada.
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { canManageCourse, isEnrolled } from "@/lib/courseAccess";
import { z } from "zod";

const submitSchema = z.object({
  courseId:    z.string().min(1),
  lessonIndex: z.number().int().min(0).optional().default(0),
  fileUrl:     z.string().url().optional().or(z.literal("")),
  fileName:    z.string().max(255).optional().default(""),
  note:        z.string().max(2000).optional().default(""),
});

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const courseId    = searchParams.get("courseId");
  const lessonParam = searchParams.get("lessonIndex");
  if (!courseId) return NextResponse.json({ error: "courseId wajib" }, { status: 400 });

  const pengelola = await canManageCourse(user, courseId);

  try {
    const params = [courseId];
    let filter = "s.course_id = $1";
    if (!pengelola) { params.push(user.email); filter += ` AND s.user_email = $${params.length}`; }
    if (lessonParam !== null) { params.push(parseInt(lessonParam, 10)); filter += ` AND s.lesson_index = $${params.length}`; }

    const { rows } = await query(`
      SELECT s.*, u.fullname, u.organization,
             g.grade, g.feedback, g.graded_at, g.graded_by
        FROM assignment_submissions s
        LEFT JOIN users u ON u.email = s.user_email
        LEFT JOIN assignment_grades g
               ON g.course_id = s.course_id
              AND g.user_email = s.user_email
              AND g.lesson_index = s.lesson_index
       WHERE ${filter}
       ORDER BY s.submitted_at DESC
    `, params);

    return NextResponse.json({ success: true, submissions: rows, canManage: pengelola });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = submitSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { courseId, lessonIndex, fileUrl, fileName, note } = parsed.data;

  if (!fileUrl && !note.trim()) {
    return NextResponse.json(
      { error: "Sertakan berkas atau catatan jawaban" }, { status: 400 }
    );
  }

  // Hanya peserta kursus yang boleh mengumpulkan; pengajar tidak mengumpulkan
  // tugas untuk dirinya sendiri.
  if (!(await isEnrolled(user.email, courseId))) {
    return NextResponse.json({ error: "Anda belum terdaftar di kursus ini" }, { status: 403 });
  }

  try {
    // Tugas yang sudah dinilai tidak boleh ditimpa diam-diam.
    const { rows: [nilai] } = await query(
      `SELECT grade FROM assignment_grades
        WHERE course_id = $1 AND user_email = $2 AND lesson_index = $3`,
      [courseId, user.email, lessonIndex]
    );
    if (nilai) {
      return NextResponse.json(
        { error: `Tugas ini sudah dinilai (${nilai.grade}). Hubungi instruktur bila perlu mengumpulkan ulang.` },
        { status: 409 }
      );
    }

    const { rows: [sub] } = await query(`
      INSERT INTO assignment_submissions
        (course_id, user_email, lesson_index, file_url, file_name, note, status, submitted_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,'submitted',NOW(),NOW())
      ON CONFLICT (course_id, user_email, lesson_index)
      DO UPDATE SET file_url = EXCLUDED.file_url,
                    file_name = EXCLUDED.file_name,
                    note = EXCLUDED.note,
                    status = 'submitted',
                    updated_at = NOW()
      RETURNING *
    `, [courseId, user.email, lessonIndex, fileUrl || "", fileName, note]);

    // Beri tahu pengajar kursus supaya tugas tidak menumpuk tanpa diketahui.
    await query(
      `INSERT INTO notifications (user_email, type, title, message, link)
       SELECT ci.user_email, 'info', 'Tugas Baru Dikumpulkan', $2, '/kelas'
         FROM course_instructors ci WHERE ci.course_id = $1`,
      [courseId, `${user.fullname || user.email} mengumpulkan tugas untuk materi #${lessonIndex + 1}.`]
    ).catch(() => {});

    // XP 15 poin untuk pengumpulan pertama (nilainya sama dengan
    // XP.assignment_submit di /api/gamification).
    if (sub.submitted_at?.getTime?.() === sub.updated_at?.getTime?.()) {
      query(
        `INSERT INTO user_points (user_email, points, total_points, level)
         VALUES ($1, 15, 15, 1)
         ON CONFLICT (user_email) DO UPDATE SET
           points = user_points.points + 15,
           total_points = user_points.total_points + 15,
           last_activity_date = CURRENT_DATE, updated_at = NOW()`,
        [user.email]
      ).catch(() => {});
    }

    return NextResponse.json({ success: true, submission: sub });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const courseId    = searchParams.get("courseId");
  const lessonIndex = parseInt(searchParams.get("lessonIndex") || "0", 10);
  if (!courseId) return NextResponse.json({ error: "courseId wajib" }, { status: 400 });

  try {
    const { rows: [nilai] } = await query(
      `SELECT 1 AS ada FROM assignment_grades
        WHERE course_id = $1 AND user_email = $2 AND lesson_index = $3`,
      [courseId, user.email, lessonIndex]
    );
    if (nilai) {
      return NextResponse.json({ error: "Tugas yang sudah dinilai tidak dapat ditarik" }, { status: 409 });
    }

    await query(
      `DELETE FROM assignment_submissions
        WHERE course_id = $1 AND user_email = $2 AND lesson_index = $3`,
      [courseId, user.email, lessonIndex]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
