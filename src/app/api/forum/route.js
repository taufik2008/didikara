/**
 * GET  /api/forum?courseId=c1&page=1     → { posts, total }
 * POST /api/forum                         → buat post / reply
 * DELETE /api/forum?id=N                  → soft delete (author atau admin)
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";
import { isEnrolled, canManageCourse } from "@/lib/courseAccess";

/** Peserta terdaftar aktif, atau pengelola kursus (pengajar/admin) boleh akses forum. */
async function bolehAksesForum(user, courseId) {
  if (await canManageCourse(user, courseId)) return true;
  return isEnrolled(user.email, courseId);
}

const postSchema = z.object({
  courseId: z.string().min(1),
  content:  z.string().min(1).max(2000),
  replyTo:  z.number().int().optional().nullable(),
});

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  const page     = parseInt(searchParams.get("page") || "1");
  const limit    = 20;
  const offset   = (page - 1) * limit;

  if (!courseId) return NextResponse.json({ error: "courseId wajib" }, { status: 400 });

  // Forum kursus hanya untuk peserta yang benar-benar terdaftar, atau
  // pengelola kursus (pengajar/admin) — bukan siapa saja yang login.
  if (!(await bolehAksesForum(user, courseId))) {
    return NextResponse.json({ error: "Anda tidak terdaftar di kursus ini" }, { status: 403 });
  }

  try {
    const [posts, total] = await Promise.all([
      query(
        `SELECT fp.*, u.fullname, u.avatar, u.role
         FROM forum_posts fp
         JOIN users u ON u.email = fp.user_email
         WHERE fp.course_id = $1 AND fp.deleted_at IS NULL AND COALESCE(fp.status, 'approved') != 'hidden'
         ORDER BY fp.created_at DESC
         LIMIT $2 OFFSET $3`,
        [courseId, limit, offset]
      ),
      query(
        "SELECT COUNT(*) FROM forum_posts WHERE course_id = $1 AND deleted_at IS NULL AND COALESCE(status, 'approved') != 'hidden'",
        [courseId]
      ),
    ]);
    return NextResponse.json({
      success: true,
      posts: posts.rows,
      total: parseInt(total.rows[0].count),
      page,
    });
  } catch {
    return NextResponse.json({ success: true, posts: [], total: 0, page: 1 });
  }
}

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { courseId, content, replyTo } = parsed.data;

  if (!(await bolehAksesForum(user, courseId))) {
    return NextResponse.json({ error: "Anda tidak terdaftar di kursus ini" }, { status: 403 });
  }

  try {
    const r = await query(
      `INSERT INTO forum_posts (course_id, user_email, user_label, content, reply_to)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [courseId, user.email, user.roleLabel || user.role, content, replyTo || null]
    );
    return NextResponse.json({ success: true, post: r.rows[0] }, { status: 201 });
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

  try {
    // Hanya author atau admin yang bisa hapus
    const check = await query("SELECT user_email FROM forum_posts WHERE id = $1", [id]);
    if (check.rows.length === 0) return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });
    if (check.rows[0].user_email !== user.email && user.role !== "admin") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    await query("UPDATE forum_posts SET deleted_at = NOW() WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { id, action, reason, status } = body;

  if (!id) {
    return NextResponse.json({ error: "id post wajib disertakan" }, { status: 400 });
  }

  try {
    if (action === "report") {
      // Pelaporan oleh pengguna. Sebelumnya report_count dinaikkan tanpa
      // mencatat siapa pelapornya, sehingga SATU orang bisa memanggil aksi
      // ini tiga kali sendiri dan memicu auto-flag — bukan tiga orang
      // berbeda. forum_post_reports (UNIQUE post_id+reporter_email) menutup
      // celah itu: pelaporan ganda dari orang yang sama diabaikan.
      const post = await query("SELECT id FROM forum_posts WHERE id = $1", [id]);
      if (post.rows.length === 0) {
        return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });
      }

      await query(
        `INSERT INTO forum_post_reports (post_id, reporter_email, reason)
         VALUES ($1, $2, $3)
         ON CONFLICT (post_id, reporter_email) DO NOTHING`,
        [id, user.email, reason || "Dilaporkan oleh pengguna"]
      );

      const { rows: [{ count: jumlahPelaporUnik }] } = await query(
        "SELECT COUNT(*) AS count FROM forum_post_reports WHERE post_id = $1", [id]
      );

      const res = await query(
        `UPDATE forum_posts
         SET report_count   = $2,
             flagged_reason = CASE WHEN $3::text <> '' THEN $3::text ELSE flagged_reason END,
             status         = CASE WHEN $2 >= 3 THEN 'flagged' ELSE status END
         WHERE id = $1
         RETURNING id, report_count, status`,
        [id, parseInt(jumlahPelaporUnik, 10), reason || ""]
      );

      return NextResponse.json({
        success: true,
        message: "Laporan post forum berhasil dikirim",
        post: res.rows[0],
      });
    }

    if (action === "moderate") {
      // Tindakan moderasi status hanya untuk admin
      if (user.role !== "admin") {
        return NextResponse.json({ error: "Hanya admin yang memiliki wewenang moderasi forum" }, { status: 403 });
      }

      if (!status || !["approved", "hidden", "flagged"].includes(status)) {
        return NextResponse.json({ error: "Status moderasi tidak valid ('approved', 'hidden', 'flagged')" }, { status: 400 });
      }

      const res = await query(
        `UPDATE forum_posts
         SET status = $2
         WHERE id = $1
         RETURNING id, status, report_count`,
        [id, status]
      );

      if (res.rows.length === 0) {
        return NextResponse.json({ error: "Post tidak ditemukan" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: `Status post berhasil dimoderasi menjadi ${status}`,
        post: res.rows[0],
      });
    }

    return NextResponse.json({ error: "Aksi tidak dikenali. Gunakan 'report' atau 'moderate'" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

