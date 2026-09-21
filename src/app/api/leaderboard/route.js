/**
 * GET /api/leaderboard?scope=global&courseId=x&limit=10
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit    = Math.min(50, parseInt(searchParams.get("limit") || "10"));
  const courseId = searchParams.get("courseId") || "";
  const scope    = searchParams.get("scope") || "global"; // global | course | org

  try {
    let rows;

    if (scope === "course" && courseId) {
      // Leaderboard per kursus — berdasarkan skor ujian + progress
      const { rows: r } = await query(`
        SELECT
          u.email, u.fullname, u.avatar, u.organization,
          ROUND(AVG(ea.percentage)::numeric, 0) AS best_score,
          ROUND(AVG(up.progress_pct)::numeric, 0) AS avg_progress,
          COALESCE(pt.total_points, 0) AS total_points,
          COALESCE(pt.level, 1) AS level,
          ROW_NUMBER() OVER (ORDER BY COALESCE(pt.total_points,0) DESC) AS rank
        FROM enrollments e
        JOIN users u ON u.email = e.user_email
        LEFT JOIN exam_attempts ea ON ea.user_email = e.user_email AND ea.course_id = e.course_id
        LEFT JOIN user_progress up ON up.user_email = e.user_email AND up.course_id = e.course_id
        LEFT JOIN user_points pt ON pt.user_email = e.user_email
        WHERE e.course_id = $1 AND e.status = 'active' AND u.deleted_at IS NULL
        GROUP BY u.email, u.fullname, u.avatar, u.organization, pt.total_points, pt.level
        ORDER BY total_points DESC
        LIMIT $2
      `, [courseId, limit]);
      rows = r;
    } else if (scope === "org") {
      // Leaderboard per organisasi user saat ini
      const { rows: r } = await query(`
        SELECT
          u.email, u.fullname, u.avatar, u.organization,
          COALESCE(pt.total_points, 0) AS total_points,
          COALESCE(pt.level, 1) AS level,
          COALESCE(pt.streak_days, 0) AS streak_days,
          COUNT(DISTINCT ub.badge_id) AS badge_count,
          ROW_NUMBER() OVER (ORDER BY COALESCE(pt.total_points,0) DESC) AS rank
        FROM users u
        LEFT JOIN user_points pt ON pt.user_email = u.email
        LEFT JOIN user_badges ub ON ub.user_email = u.email
        WHERE u.organization = (SELECT organization FROM users WHERE email = $1)
          AND u.deleted_at IS NULL AND u.status = 'active'
        GROUP BY u.email, u.fullname, u.avatar, u.organization, pt.total_points, pt.level, pt.streak_days
        ORDER BY total_points DESC
        LIMIT $2
      `, [user.email, limit]);
      rows = r;
    } else {
      // Global leaderboard
      const { rows: r } = await query(`
        SELECT
          u.email, u.fullname, u.avatar, u.organization,
          COALESCE(pt.total_points, 0) AS total_points,
          COALESCE(pt.level, 1) AS level,
          COALESCE(pt.streak_days, 0) AS streak_days,
          COUNT(DISTINCT ub.badge_id) AS badge_count,
          ROW_NUMBER() OVER (ORDER BY COALESCE(pt.total_points,0) DESC) AS rank
        FROM users u
        LEFT JOIN user_points pt ON pt.user_email = u.email
        LEFT JOIN user_badges ub ON ub.user_email = u.email
        WHERE u.deleted_at IS NULL AND u.status = 'active' AND u.role = 'student'
        GROUP BY u.email, u.fullname, u.avatar, u.organization, pt.total_points, pt.level, pt.streak_days
        ORDER BY total_points DESC
        LIMIT $1
      `, [limit]);
      rows = r;
    }

    // Posisi user saat ini
    const myRank = rows.findIndex(r => r.email === user.email) + 1;

    return NextResponse.json({ success: true, leaderboard: rows, myRank, scope });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
