/**
 * GET  /api/reviews?courseId=x       — daftar review kursus + rata-rata
 * POST /api/reviews                  — tambah/update review { courseId, rating, comment }
 * DELETE /api/reviews?courseId=x     — hapus review user
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  const page     = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit    = Math.min(20, parseInt(searchParams.get("limit") || "10"));
  const offset   = (page - 1) * limit;

  if (!courseId) {
    // Semua rata-rata rating per kursus (untuk catalog)
    const { rows } = await query(`
      SELECT course_id,
             ROUND(AVG(rating)::numeric, 1) AS avg_rating,
             COUNT(*) AS review_count
      FROM course_reviews GROUP BY course_id
    `).catch(() => ({ rows: [] }));
    return NextResponse.json({ success: true, ratings: rows });
  }

  try {
    const { rows: reviews } = await query(`
      SELECT cr.*, u.fullname, u.avatar
      FROM course_reviews cr JOIN users u ON u.email = cr.user_email
      WHERE cr.course_id = $1
      ORDER BY cr.created_at DESC LIMIT $2 OFFSET $3
    `, [courseId, limit, offset]);

    const { rows: [stats] } = await query(`
      SELECT ROUND(AVG(rating)::numeric,1) AS avg_rating,
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE rating=5) AS r5,
             COUNT(*) FILTER (WHERE rating=4) AS r4,
             COUNT(*) FILTER (WHERE rating=3) AS r3,
             COUNT(*) FILTER (WHERE rating=2) AS r2,
             COUNT(*) FILTER (WHERE rating=1) AS r1
      FROM course_reviews WHERE course_id = $1
    `, [courseId]);

    return NextResponse.json({ success: true, reviews, stats, page, limit });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId, rating, comment } = await request.json();
  if (!courseId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "courseId dan rating (1-5) wajib" }, { status: 400 });
  }

  try {
    // Hanya bisa review kursus yang sudah di-enroll
    const { rows: [enrolled] } = await query(
      "SELECT id FROM enrollments WHERE user_email=$1 AND course_id=$2 AND status='active'",
      [user.email, courseId]
    );
    if (!enrolled) return NextResponse.json({ error: "Hanya peserta terdaftar yang bisa memberi ulasan" }, { status: 403 });

    const { rows: [review] } = await query(`
      INSERT INTO course_reviews (course_id, user_email, rating, comment)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (course_id, user_email) DO UPDATE SET
        rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = NOW()
      RETURNING *
    `, [courseId, user.email, rating, comment || ""]);

    // Update avg rating di tabel courses
    await query(`
      UPDATE courses SET rating = (
        SELECT ROUND(AVG(rating)::numeric,1) FROM course_reviews WHERE course_id = $1
      ) WHERE id = $1
    `, [courseId]).catch(() => {});

    return NextResponse.json({ success: true, review });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "courseId wajib" }, { status: 400 });

  try {
    await query("DELETE FROM course_reviews WHERE course_id=$1 AND user_email=$2", [courseId, user.email]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
