/**
 * GET  /api/reports?type=overview|trend|org|dept|kpi|course_stats
 *        &org=x&dept=x&from=YYYY-MM-DD&to=YYYY-MM-DD
 * POST /api/reports   { action: "set_kpi" | "record_kpi", ... }
 *
 * Catatan perbaikan: seluruh kueri di berkas ini sebelumnya merujuk tabel dan
 * kolom yang tidak pernah ada di skema — `exam_results` (yang benar
 * `exam_attempts`), `users.created_at`, `enrollments.created_at` (yang benar
 * `enrolled_at`), `user_progress.completed_at`, dan `users.department`
 * (departemen adalah relasi, bukan kolom teks). Akibatnya setiap jenis laporan
 * gagal dengan 500 dan modul KPI tidak pernah menghasilkan angka.
 *
 * Kolom `users.created_at` dan `user_progress.completed_at` kini benar-benar
 * ada (lihat migrasi di src/lib/db.js); sisanya diselaraskan di sini.
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";

/** Peran yang boleh membaca laporan agregat. */
const PERAN_PELAPOR = ["admin", "corporate", "government"];

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!PERAN_PELAPOR.includes(user.role)) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "overview";
  const from = searchParams.get("from") || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const to   = searchParams.get("to")   || new Date().toISOString().split("T")[0];
  let   org  = searchParams.get("org")  || "";
  const dept = searchParams.get("dept") || "";

  // Pengguna korporat/pemerintah hanya boleh melihat organisasinya sendiri.
  // Tanpa ini, satu akun HR dapat membaca capaian seluruh instansi lain.
  if (user.role !== "admin") {
    const { rows: [profil] } = await query(
      "SELECT organization FROM users WHERE email = $1", [user.email]
    ).catch(() => ({ rows: [] }));
    if (!profil?.organization) {
      return NextResponse.json({ error: "Akun Anda belum terkait organisasi" }, { status: 403 });
    }
    org = profil.organization;
  }

  try {
    // ── Ikhtisar periode ────────────────────────────────────────────────────
    if (type === "overview") {
      const [users, enrollments, completions, certs, exams, avgScore] = await Promise.all([
        query(`SELECT COUNT(*) FROM users
                WHERE deleted_at IS NULL
                  AND created_at >= $1 AND created_at < $2::date + 1
                  AND ($3 = '' OR organization = $3)`, [from, to, org]),
        query(`SELECT COUNT(*) FROM enrollments e
                JOIN users u ON u.email = e.user_email
                WHERE e.enrolled_at >= $1 AND e.enrolled_at < $2::date + 1
                  AND ($3 = '' OR u.organization = $3)`, [from, to, org]),
        query(`SELECT COUNT(*) FROM user_progress up
                JOIN users u ON u.email = up.user_email
                WHERE up.completed = TRUE
                  AND up.completed_at >= $1 AND up.completed_at < $2::date + 1
                  AND ($3 = '' OR u.organization = $3)`, [from, to, org]),
        query(`SELECT COUNT(*) FROM certificates c
                LEFT JOIN users u ON u.email = c.user_email
                WHERE c.issued_at >= $1 AND c.issued_at < $2::date + 1
                  AND ($3 = '' OR u.organization = $3)`, [from, to, org]),
        query(`SELECT COUNT(*) FROM exam_attempts ea
                JOIN users u ON u.email = ea.user_email
                WHERE ea.submitted_at >= $1 AND ea.submitted_at < $2::date + 1
                  AND ($3 = '' OR u.organization = $3)`, [from, to, org]),
        query(`SELECT COALESCE(ROUND(AVG(ea.percentage)::numeric, 1), 0) AS avg
                 FROM exam_attempts ea
                 JOIN users u ON u.email = ea.user_email
                WHERE ea.passed = TRUE
                  AND ea.submitted_at >= $1 AND ea.submitted_at < $2::date + 1
                  AND ($3 = '' OR u.organization = $3)`, [from, to, org]),
      ]);

      return NextResponse.json({
        success: true,
        periode: { from, to, organization: org || "semua" },
        overview: {
          newUsers:       parseInt(users.rows[0].count),
          newEnrollments: parseInt(enrollments.rows[0].count),
          completions:    parseInt(completions.rows[0].count),
          certificates:   parseInt(certs.rows[0].count),
          exams:          parseInt(exams.rows[0].count),
          avgScore:       parseFloat(avgScore.rows[0].avg),
        },
      });
    }

    // ── Tren harian ─────────────────────────────────────────────────────────
    if (type === "trend") {
      const { rows } = await query(`
        SELECT d::date AS date,
          COALESCE((
            SELECT COUNT(DISTINCT up.user_email) FROM user_progress up
             JOIN users u ON u.email = up.user_email
             WHERE DATE(up.last_accessed) = d::date AND ($3 = '' OR u.organization = $3)
          ), 0) AS active_users,
          COALESCE((
            SELECT COUNT(*) FROM user_progress up
             JOIN users u ON u.email = up.user_email
             WHERE up.completed = TRUE AND DATE(up.completed_at) = d::date
               AND ($3 = '' OR u.organization = $3)
          ), 0) AS completions
        FROM generate_series($1::date, $2::date, '1 day') d
        ORDER BY d
      `, [from, to, org]);
      return NextResponse.json({ success: true, trend: rows });
    }

    // ── Rekap per organisasi ────────────────────────────────────────────────
    if (type === "org") {
      const { rows } = await query(`
        SELECT
          u.organization,
          COUNT(DISTINCT u.email)                                   AS users,
          COUNT(DISTINCT e.id)                                      AS enrollments,
          COUNT(DISTINCT c.id)                                      AS certificates,
          COALESCE(ROUND(CAST(AVG(ea.percentage) FILTER (WHERE ea.passed) AS numeric), 1), 0) AS avg_score,
          COALESCE((
            SELECT SUM(p.total_points) FROM user_points p
             JOIN users u2 ON u2.email = p.user_email
            WHERE u2.organization = u.organization AND u2.deleted_at IS NULL
          ), 0) AS total_xp
        FROM users u
        LEFT JOIN enrollments   e   ON e.user_email  = u.email AND e.status = 'active'
        LEFT JOIN certificates  c   ON c.user_email  = u.email
        LEFT JOIN exam_attempts ea  ON ea.user_email = u.email
        WHERE u.deleted_at IS NULL
          AND u.organization IS NOT NULL AND u.organization <> ''
          AND ($1 = '' OR u.organization = $1)
        GROUP BY u.organization
        ORDER BY total_xp DESC
      `, [org]);
      return NextResponse.json({ success: true, orgs: rows });
    }

    // ── Rekap per departemen ────────────────────────────────────────────────
    // Departemen adalah relasi users.department_id → departments, bukan kolom
    // teks pada users seperti yang diasumsikan kueri lama.
    if (type === "dept") {
      const { rows } = await query(`
        SELECT
          d.name          AS department,
          o.name          AS organization,
          COUNT(DISTINCT u.email)  AS users,
          COUNT(DISTINCT e.id)     AS enrollments,
          COUNT(DISTINCT c.id)     AS certificates,
          COALESCE(ROUND(CAST(AVG(ea.percentage) FILTER (WHERE ea.passed) AS numeric), 1), 0) AS avg_score
        FROM departments d
        JOIN organizations o ON o.id = d.organization_id
        LEFT JOIN users u ON u.department_id = d.id AND u.deleted_at IS NULL
        LEFT JOIN enrollments   e  ON e.user_email  = u.email
          AND e.enrolled_at >= $1 AND e.enrolled_at < $2::date + 1
        LEFT JOIN certificates  c  ON c.user_email  = u.email
          AND c.issued_at   >= $1 AND c.issued_at   < $2::date + 1
        LEFT JOIN exam_attempts ea ON ea.user_email = u.email
          AND ea.submitted_at >= $1 AND ea.submitted_at < $2::date + 1
        WHERE d.deleted_at IS NULL
          AND ($3 = '' OR o.name = $3)
          AND ($4 = '' OR d.name = $4)
        GROUP BY d.name, o.name
        ORDER BY avg_score DESC
      `, [from, to, org, dept]);
      return NextResponse.json({ success: true, depts: rows });
    }

    // ── Target & capaian KPI ────────────────────────────────────────────────
    if (type === "kpi") {
      const { rows } = await query(`
        SELECT kt.*,
          COALESCE((SELECT actual_value FROM kpi_records
                     WHERE target_id = kt.id ORDER BY recorded_at DESC LIMIT 1), 0) AS latest_actual,
          (SELECT recorded_at FROM kpi_records
            WHERE target_id = kt.id ORDER BY recorded_at DESC LIMIT 1) AS last_updated,
          CASE WHEN kt.target_value > 0 THEN
            ROUND(100.0 * COALESCE((SELECT actual_value FROM kpi_records
                     WHERE target_id = kt.id ORDER BY recorded_at DESC LIMIT 1), 0)
                  / kt.target_value, 1)
          END AS pencapaian_persen
        FROM kpi_targets kt
        WHERE ($1 = '' OR kt.organization = $1)
          AND ($2 = '' OR kt.department = $2)
        ORDER BY kt.period_start DESC
      `, [org, dept]);
      return NextResponse.json({ success: true, kpis: rows });
    }

    // ── Statistik per kursus ────────────────────────────────────────────────
    if (type === "course_stats") {
      const { rows } = await query(`
        SELECT
          c.id, c.title, c.category,
          COUNT(DISTINCT e.user_email)  AS enrolled,
          COUNT(DISTINCT CASE WHEN up.completed THEN up.user_email END) AS completed,
          COUNT(DISTINCT CASE WHEN ea.passed    THEN ea.user_email END) AS lulus,
          COALESCE(ROUND(CAST(AVG(ea.percentage) FILTER (WHERE ea.passed) AS numeric), 1), 0) AS avg_score,
          COALESCE(ROUND(AVG(cr.rating)::numeric, 1), 0) AS avg_rating,
          COUNT(DISTINCT cr.id) AS review_count
        FROM courses c
        LEFT JOIN enrollments   e   ON e.course_id  = c.id AND e.status = 'active'
        LEFT JOIN users         u   ON u.email      = e.user_email
        LEFT JOIN user_progress up  ON up.course_id = c.id AND up.user_email = e.user_email
        LEFT JOIN exam_attempts ea  ON ea.course_id = c.id AND ea.user_email = e.user_email
        LEFT JOIN course_reviews cr ON cr.course_id = c.id
        WHERE c.deleted_at IS NULL
          AND ($1 = '' OR u.organization = $1)
        GROUP BY c.id, c.title, c.category
        ORDER BY enrolled DESC
      `, [org]);
      return NextResponse.json({ success: true, courses: rows });
    }

    return NextResponse.json({ error: "type tidak valid" }, { status: 400 });
  } catch (err) {
    console.error("GET /api/reports:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json();
  const { action } = body;

  if (action === "set_kpi") {
    const { organization, department, metricKey, metricLabel, targetValue, unit, periodStart, periodEnd } = body;
    if (!organization || !metricKey || !targetValue || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: "organization, metricKey, targetValue, periodStart, periodEnd wajib" }, { status: 400 }
      );
    }
    const { rows: [kpi] } = await query(`
      INSERT INTO kpi_targets (organization, department, metric_key, metric_label,
                               target_value, unit, period_start, period_end, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (organization, department, metric_key, period_start) DO UPDATE SET
        target_value = EXCLUDED.target_value,
        metric_label = EXCLUDED.metric_label,
        period_end   = EXCLUDED.period_end
      RETURNING *
    `, [organization, department || "", metricKey, metricLabel || metricKey,
        targetValue, unit || "%", periodStart, periodEnd, user.email]);
    return NextResponse.json({ success: true, kpi });
  }

  if (action === "record_kpi") {
    const { targetId, actualValue, notes } = body;
    if (!targetId || actualValue === undefined) {
      return NextResponse.json({ error: "targetId, actualValue wajib" }, { status: 400 });
    }
    await query(
      "INSERT INTO kpi_records (target_id, actual_value, recorded_by, notes) VALUES ($1,$2,$3,$4)",
      [targetId, actualValue, user.email, notes || ""]
    );
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "action tidak valid" }, { status: 400 });
}
