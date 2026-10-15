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
    // Semua rata-rata rating per kursus (untuk catalog), mengecualikan review hidden
    const { rows } = await query(`
      SELECT course_id,
             ROUND(AVG(rating)::numeric, 1) AS avg_rating,
             COUNT(*) AS review_count
      FROM course_reviews
      WHERE COALESCE(status, 'approved') != 'hidden'
      GROUP BY course_id
    `).catch(() => ({ rows: [] }));
    return NextResponse.json({ success: true, ratings: rows });
  }

  try {
    const { rows: reviews } = await query(`
      SELECT cr.*, u.fullname, u.avatar
      FROM course_reviews cr JOIN users u ON u.email = cr.user_email
      WHERE cr.course_id = $1 AND COALESCE(cr.status, 'approved') != 'hidden'
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
      FROM course_reviews
      WHERE course_id = $1 AND COALESCE(status, 'approved') != 'hidden'
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
        SELECT ROUND(AVG(rating)::numeric,1) FROM course_reviews
        WHERE course_id = $1 AND COALESCE(status, 'approved') != 'hidden'
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

export async function PATCH(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { reviewId, id, action, reason, status } = body;
  const targetId = reviewId || id;

  if (!targetId) {
    return NextResponse.json({ error: "reviewId wajib disertakan" }, { status: 400 });
  }

  try {
    if (action === "report") {
      // Pelaporan ulasan tidak pantas / spam oleh peserta (auto-flag jika report_count >= 3)
      const res = await query(
        `UPDATE course_reviews
         SET report_count = report_count + 1,
             flagged_reason = CASE WHEN $2::text <> '' THEN $2::text ELSE flagged_reason END,
             status = CASE WHEN report_count + 1 >= 3 THEN 'flagged' ELSE status END
         WHERE id = $1
         RETURNING id, course_id, status, report_count`,
        [targetId, reason || "Dilaporkan tidak pantas"]
      );

      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Ulasan tidak ditemukan" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: "Laporan ulasan berhasil dicatat",
        review: res.rows[0],
      });
    }

    if (action === "moderate") {
      // Moderasi ulasan (hanya peran admin)
      if (user.role !== "admin") {
        return NextResponse.json({ error: "Hanya admin yang memiliki wewenang moderasi ulasan" }, { status: 403 });
      }

      if (!status || !["approved", "hidden", "flagged"].includes(status)) {
        return NextResponse.json({ error: "Status moderasi tidak valid ('approved', 'hidden', 'flagged')" }, { status: 400 });
      }

      const res = await query(
        `UPDATE course_reviews
         SET status = $2
         WHERE id = $1
         RETURNING id, course_id, status, report_count`,
        [targetId, status]
      );

      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Ulasan tidak ditemukan" }, { status: 404 });
      }

      const updatedReview = res.rows[0];

      // Perbarui rata-rata rating kursus dengan mengecualikan ulasan yang disembunyikan
      await query(`
        UPDATE courses SET rating = (
          SELECT COALESCE(ROUND(AVG(rating)::numeric,1), 5.0)
          FROM course_reviews
          WHERE course_id = $1 AND COALESCE(status, 'approved') != 'hidden'
        ) WHERE id = $1
      `, [updatedReview.course_id]).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Status ulasan berhasil dimoderasi menjadi ${status}`,
        review: updatedReview,
      });
    }

    return NextResponse.json({ error: "Aksi tidak dikenali. Gunakan 'report' atau 'moderate'" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

