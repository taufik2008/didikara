/**
 * GET  /api/progress?courseId=c1
 *   → Kembalikan semua progress lessons untuk user yang login di kursus tersebut
 *
 * POST /api/progress
 *   Body: { courseId, lessonIndex, progressPct, completed }
 *   → Upsert satu record progress
 */

import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

const postSchema = z.object({
  courseId: z.string().min(1),
  lessonIndex: z.number().int().min(0),
  progressPct: z.number().min(0).max(100),
  completed: z.boolean(),
});

export async function GET(request) {
  try {
    const user = await authenticateRequest(request);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    if (!courseId) return NextResponse.json({ success: false, error: "courseId wajib diisi" }, { status: 400 });

    const result = await query(
      `SELECT lesson_index, progress_pct, completed, last_accessed
       FROM user_progress
       WHERE user_email = $1 AND course_id = $2
       ORDER BY last_accessed DESC`,
      [user.email, courseId]
    );

    const progress = {};
    for (const row of result.rows) {
      progress[row.lesson_index] = {
        pct: row.progress_pct,
        completed: row.completed,
        lastAccessed: row.last_accessed,
      };
    }

    // Cari lesson terakhir yang diakses
    const lastLesson = result.rows[0]?.lesson_index ?? 0;

    // Catatan: di sini dulu ada blok pemberian XP yang mengacu variabel
    // `completed` dan `userEmail` — keduanya tidak pernah dideklarasikan di
    // lingkup GET. Setiap panggilan melempar ReferenceError, tertangkap catch
    // terluar, dan berubah menjadi 503 "Database tidak tersedia": progres
    // tersimpan tetapi tidak pernah terbaca kembali, sehingga lanjut-otomatis
    // dan penguncian modul kehilangan dasar datanya. XP kini diberikan di POST,
    // tempat data yang diperlukan memang tersedia.

    return NextResponse.json({ success: true, progress, lastLesson });
  } catch (err) {
    console.error("GET /api/progress error:", err);
    return NextResponse.json({ success: false, error: "Database tidak tersedia" }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const user = await authenticateRequest(request);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues.map(e => e.message).join("; ") }, { status: 400 });
    }

    const { courseId, lessonIndex, progressPct, completed } = parsed.data;

    // Apakah pelajaran ini sudah pernah dinyatakan selesai sebelumnya? Dicek
    // lebih dulu supaya XP diberikan tepat sekali, meski klien mengirim ulang
    // progres yang sama berkali-kali.
    const { rows: [sebelumnya] } = await query(
      `SELECT completed FROM user_progress
        WHERE user_email = $1 AND course_id = $2 AND lesson_index = $3`,
      [user.email, courseId, lessonIndex]
    );
    const baruSelesai = completed && !sebelumnya?.completed;

    await query(
      `INSERT INTO user_progress (user_email, course_id, lesson_index, progress_pct, completed, last_accessed, completed_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), CASE WHEN $5::boolean THEN NOW() END)
       ON CONFLICT (user_email, course_id, lesson_index)
       DO UPDATE SET
         progress_pct   = GREATEST(user_progress.progress_pct, EXCLUDED.progress_pct),
         completed      = EXCLUDED.completed OR user_progress.completed,
         last_accessed  = NOW(),
         completed_at   = COALESCE(user_progress.completed_at, EXCLUDED.completed_at)`,
      [user.email, courseId, lessonIndex, progressPct, completed]
    );

    // XP 10 poin saat sebuah pelajaran pertama kali diselesaikan.
    if (baruSelesai) {
      query(
        `INSERT INTO user_points (user_email, points, total_points, level)
         VALUES ($1, 10, 10, 1)
         ON CONFLICT (user_email) DO UPDATE SET
           points = user_points.points + 10,
           total_points = user_points.total_points + 10,
           last_activity_date = CURRENT_DATE, updated_at = NOW()`,
        [user.email]
      ).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/progress error:", err);
    return NextResponse.json({ success: false, error: "Database tidak tersedia" }, { status: 503 });
  }
}
