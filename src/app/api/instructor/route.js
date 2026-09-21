/**
 * GET /api/instructor?courseId=c1
 *   → { students: [{ email, fullname, org, progress, lastExam, grade }] }
 *
 * POST /api/instructor/grade
 *   body: { courseId, userEmail, lessonIndex, grade, feedback }
 *   → { success, gradeRecord }
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";
import { catatAudit } from "@/lib/audit";

/**
 * Kewenangan mengajar berasal dari penugasan di tabel `course_instructors`
 * (lihat src/lib/courseAccess.js), bukan dari peran. Dengan konstanta peran
 * yang lama, setiap pengguna corporate/government otomatis menjadi instruktur
 * SETIAP kursus di platform — termasuk milik instansi lain.
 */
import { canManageCourse } from "@/lib/courseAccess";

const gradeSchema = z.object({
  courseId:    z.string().min(1),
  userEmail:   z.string().email(),
  lessonIndex: z.number().int().min(0).optional().default(0),
  grade:       z.number().int().min(0).max(100),
  feedback:    z.string().optional().default(""),
});

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "courseId wajib" }, { status: 400 });

  if (!(await canManageCourse(user, courseId))) {
    return NextResponse.json({ error: "Anda bukan pengajar kursus ini" }, { status: 403 });
  }

  try {
    const students = await query(`
      SELECT
        u.email,
        u.fullname,
        u.organization,
        u.job_title,
        u.avatar,
        e.enrolled_at,
        e.status AS enrollment_status,
        -- Progress rata-rata
        ROUND(AVG(up.progress_pct)::numeric, 0)               AS avg_progress,
        COUNT(up.lesson_index) FILTER (WHERE up.completed)    AS lessons_completed,
        MAX(up.last_accessed)                                  AS last_active,
        -- Ujian terakhir
        MAX(ea.percentage)                                     AS best_score,
        COUNT(ea.id)                                           AS attempt_count,
        BOOL_OR(ea.passed)                                     AS has_passed,
        -- Nilai tugas
        ag.grade                                               AS assignment_grade,
        ag.feedback                                            AS assignment_feedback,
        ag.graded_at,
        -- Berkas yang dinilai. Tanpa kolom ini penilai hanya melihat nama
        -- peserta tanpa pernah bisa membuka pekerjaannya.
        sub.file_url                                           AS submission_url,
        sub.file_name                                          AS submission_name,
        sub.note                                               AS submission_note,
        sub.submitted_at                                       AS submitted_at
      FROM enrollments e
      JOIN users u ON u.email = e.user_email
      LEFT JOIN user_progress up ON up.user_email = e.user_email AND up.course_id = e.course_id
      LEFT JOIN exam_attempts ea ON ea.user_email = e.user_email AND ea.course_id = e.course_id
      LEFT JOIN assignment_grades ag ON ag.user_email = e.user_email AND ag.course_id = e.course_id AND ag.lesson_index = 0
      LEFT JOIN assignment_submissions sub ON sub.user_email = e.user_email AND sub.course_id = e.course_id AND sub.lesson_index = 0
      WHERE e.course_id = $1 AND e.status = 'active' AND u.deleted_at IS NULL
      GROUP BY u.email, u.fullname, u.organization, u.job_title, u.avatar, e.enrolled_at, e.status,
               ag.grade, ag.feedback, ag.graded_at,
               sub.file_url, sub.file_name, sub.note, sub.submitted_at
      ORDER BY e.enrolled_at DESC
    `, [courseId]);

    return NextResponse.json({ success: true, students: students.rows });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }
}

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = gradeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { courseId, userEmail, lessonIndex, grade, feedback } = parsed.data;

  if (!(await canManageCourse(user, courseId))) {
    return NextResponse.json({ error: "Anda bukan pengajar kursus ini" }, { status: 403 });
  }

  try {
    const r = await query(`
      INSERT INTO assignment_grades (course_id, user_email, lesson_index, grade, feedback, graded_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (course_id, user_email, lesson_index)
      DO UPDATE SET grade = EXCLUDED.grade, feedback = EXCLUDED.feedback,
                    graded_by = EXCLUDED.graded_by, graded_at = NOW()
      RETURNING *
    `, [courseId, userEmail, lessonIndex, grade, feedback, user.email]);

    // Notif ke peserta
    try {
      await query(
        `INSERT INTO notifications (user_email, type, title, message, link)
         VALUES ($1, 'success', 'Tugas Dinilai', $2, '/lms')`,
        [userEmail, `Tugas Anda telah dinilai dengan nilai ${grade}. ${feedback ? `Feedback: ${feedback.substring(0,80)}` : ""}`]
      );
    } catch { /* opsional */ }

    // Status pengumpulan mengikuti penilaian, sehingga peserta melihat keadaan
    // yang sama dengan yang dilihat instruktur.
    await query(
      `UPDATE assignment_submissions SET status = 'graded', updated_at = NOW()
        WHERE course_id = $1 AND user_email = $2 AND lesson_index = $3`,
      [courseId, userEmail, lessonIndex]
    ).catch(() => {});

    await catatAudit(user.email, "grade_assignment", "assignment_grade", `${courseId}:${userEmail}`, {
      course_id: courseId, user_email: userEmail, lesson_index: lessonIndex, grade,
    });

    return NextResponse.json({ success: true, gradeRecord: r.rows[0] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
