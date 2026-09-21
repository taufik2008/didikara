/**
 * GET /api/exam/history?courseId=c1
 * Kembalikan riwayat semua percobaan ujian user yang login untuk kursus tertentu.
 */

import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request) {
  try {
    const user = await authenticateRequest(request);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    if (!courseId) return NextResponse.json({ success: false, error: "courseId wajib diisi" }, { status: 400 });

    const result = await query(
      `SELECT id, score, percentage, passed, submitted_at
       FROM exam_attempts
       WHERE user_email = $1 AND course_id = $2
       ORDER BY submitted_at DESC
       LIMIT 20`,
      [user.email, courseId]
    );

    const history = result.rows.map(row => ({
      id: row.id,
      score: row.score,
      percentage: row.percentage,
      passed: row.passed,
      submittedAt: row.submitted_at,
    }));

    return NextResponse.json({ success: true, history, totalAttempts: history.length });
  } catch (err) {
    console.error("GET /api/exam/history error:", err);
    return NextResponse.json({ success: false, error: "Database tidak tersedia" }, { status: 503 });
  }
}
