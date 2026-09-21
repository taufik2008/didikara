/**
 * GET /api/analytics?type=summary|users|courses
 * Admin only.
 *
 * Sumber pendapatan: `payment_orders` berstatus `paid` — satu-satunya tempat
 * uang benar-benar tercatat. Sebelumnya berkas ini membaca tabel `transactions`
 * yang tidak pernah diisi oleh alur pembayaran mana pun (dan tidak punya kolom
 * waktu), lalu menautkan pendapatan ke kursus lewat pencocokan teks 15 karakter
 * pertama judulnya. Angka di dashboard karenanya kosong atau keliru.
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "summary";

  try {
    if (type === "summary") {
      const [rev, userCount, enrollCount, certCount, pendingCount] = await Promise.all([
        query("SELECT COALESCE(SUM(amount),0) AS total FROM payment_orders WHERE status = 'paid'"),
        query("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL"),
        query("SELECT COUNT(*) FROM enrollments WHERE status = 'active'"),
        query("SELECT COUNT(*) FROM certificates"),
        query("SELECT COUNT(*) FROM payment_orders WHERE status IN ('pending','waiting_confirmation')"),
      ]);

      // Pendapatan 12 bulan terakhir, memakai paid_at (jatuh ke created_at bila
      // order lama belum punya paid_at).
      const revByMonth = await query(`
        SELECT TO_CHAR(DATE_TRUNC('month', COALESCE(paid_at, created_at)), 'Mon YYYY') AS month,
               SUM(amount) AS total,
               COUNT(*)    AS count
          FROM payment_orders
         WHERE status = 'paid'
           AND COALESCE(paid_at, created_at) >= NOW() - INTERVAL '12 months'
         GROUP BY DATE_TRUNC('month', COALESCE(paid_at, created_at))
         ORDER BY DATE_TRUNC('month', COALESCE(paid_at, created_at))
      `).catch(() => ({ rows: [] }));

      return NextResponse.json({
        success: true,
        summary: {
          totalRevenue:      parseInt(rev.rows[0].total) || 0,
          totalUsers:        parseInt(userCount.rows[0].count) || 0,
          totalEnrollments:  parseInt(enrollCount.rows[0].count) || 0,
          totalCertificates: parseInt(certCount.rows[0].count) || 0,
          pendingPayments:   parseInt(pendingCount.rows[0].count) || 0,
        },
        revenueByMonth: revByMonth.rows,
      });
    }

    if (type === "users") {
      // Penyelesaian kursus dihitung dari rata-rata progres per kursus, dan
      // jumlah sertifikat dari pemiliknya — bukan dari course_id enrollment,
      // yang dulu menggelembungkan angka setiap kali sebuah kursus punya banyak
      // lulusan.
      const rows = await query(`
        SELECT
          u.email, u.fullname, u.organization, u.role, u.status,
          COUNT(DISTINCT e.course_id)                    AS enrollment_count,
          COUNT(DISTINCT c.id)                           AS cert_count,
          COALESCE(ROUND(CAST(AVG(ea.percentage) AS numeric), 1), 0) AS avg_score,
          COUNT(DISTINCT up.course_id) FILTER (WHERE up.pct_total >= 80) AS completed_count,
          ROUND(100.0 * COUNT(DISTINCT up.course_id) FILTER (WHERE up.pct_total >= 80)
                / NULLIF(COUNT(DISTINCT e.course_id), 0), 1)          AS completion_rate,
          MAX(up.last_accessed)                          AS last_active
        FROM users u
        LEFT JOIN enrollments   e  ON e.user_email  = u.email AND e.status = 'active'
        LEFT JOIN certificates  c  ON c.user_email  = u.email
        LEFT JOIN exam_attempts ea ON ea.user_email = u.email
        LEFT JOIN (
          SELECT user_email, course_id,
                 AVG(progress_pct)  AS pct_total,
                 MAX(last_accessed) AS last_accessed
            FROM user_progress GROUP BY user_email, course_id
        ) up ON up.user_email = u.email
        WHERE u.deleted_at IS NULL
        GROUP BY u.email, u.fullname, u.organization, u.role, u.status
        ORDER BY enrollment_count DESC
        LIMIT 100
      `);
      return NextResponse.json({ success: true, users: rows.rows });
    }

    if (type === "courses") {
      const rows = await query(`
        SELECT
          co.id, co.title, co.category, co.level,
          COUNT(DISTINCT e.user_email)  AS enrollment_count,
          COUNT(DISTINCT c.id)          AS cert_count,
          COALESCE(ROUND(CAST(AVG(ea.percentage) AS numeric), 1), 0) AS avg_score,
          ROUND(100.0 * COUNT(DISTINCT c.user_email)
                / NULLIF(COUNT(DISTINCT e.user_email), 0), 1)        AS completion_rate,
          ROUND(100.0 * (COUNT(DISTINCT e.user_email) - COUNT(DISTINCT ea.user_email))
                / NULLIF(COUNT(DISTINCT e.user_email), 0), 1)        AS dropout_rate,
          COALESCE((
            SELECT SUM(po.amount) FROM payment_orders po
             WHERE po.course_id = co.id AND po.status = 'paid'
          ), 0) AS total_revenue
        FROM courses co
        LEFT JOIN enrollments   e  ON e.course_id  = co.id AND e.status = 'active'
        LEFT JOIN exam_attempts ea ON ea.course_id = co.id
        LEFT JOIN certificates  c  ON c.course_id  = co.id
        WHERE co.deleted_at IS NULL
        GROUP BY co.id, co.title, co.category, co.level
        ORDER BY enrollment_count DESC
      `);
      return NextResponse.json({ success: true, courses: rows.rows });
    }

    return NextResponse.json({ error: "type tidak valid" }, { status: 400 });
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json({ error: "DB tidak tersedia", detail: err.message }, { status: 503 });
  }
}
