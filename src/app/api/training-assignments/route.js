import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { catatAudit } from "@/lib/audit";

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isManager = ["admin", "corporate", "government"].includes(user.role);

  try {
    let sql;
    let params = [];

    if (isManager) {
      sql = `
        SELECT ta.*, c.title AS course_title, u.fullname AS user_fullname, u.organization,
               CASE
                 WHEN ta.completed_at IS NOT NULL THEN 'completed'
                 WHEN ta.due_date IS NOT NULL AND ta.due_date < NOW() THEN 'overdue'
                 ELSE 'in_progress'
               END AS status
        FROM training_assignments ta
        JOIN courses c ON c.id = ta.course_id
        JOIN users u ON u.email = ta.assigned_to
        ORDER BY ta.created_at DESC
      `;
    } else {
      sql = `
        SELECT ta.*, c.title AS course_title,
               CASE
                 WHEN ta.completed_at IS NOT NULL THEN 'completed'
                 WHEN ta.due_date IS NOT NULL AND ta.due_date < NOW() THEN 'overdue'
                 ELSE 'in_progress'
               END AS status
        FROM training_assignments ta
        JOIN courses c ON c.id = ta.course_id
        WHERE ta.assigned_to = $1
        ORDER BY ta.created_at DESC
      `;
      params = [user.email];
    }

    const { rows: assignments } = await query(sql, params);

    // Hitung metrik kepatuhan pelatihan (compliance rate) untuk HR / Admin
    const totalAssigned = assignments.length;
    const completedCount = assignments.filter(a => a.status === "completed").length;
    const overdueCount = assignments.filter(a => a.status === "overdue").length;
    const inProgressCount = assignments.filter(a => a.status === "in_progress").length;
    const complianceRate = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 100;

    return NextResponse.json({
      success: true,
      assignments,
      metrics: {
        totalAssigned,
        completedCount,
        overdueCount,
        inProgressCount,
        complianceRate,
      },
    });
  } catch (error) {
    console.error("Training assignments GET error:", error);
    return NextResponse.json({ error: "Gagal memuat tugas pelatihan" }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["admin", "corporate", "government"].includes(user.role)) {
    return NextResponse.json({ error: "Hanya Pengelola SDM / Admin yang dapat menugaskan pelatihan" }, { status: 403 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
  }

  const { courseId, userEmails, dueDate, isMandatory = true } = body;
  if (!courseId || !Array.isArray(userEmails) || userEmails.length === 0) {
    return NextResponse.json({ error: "courseId dan userEmails (array) wajib diisi" }, { status: 400 });
  }

  try {
    // Ambil info kursus
    const { rows: [course] } = await query("SELECT id, title FROM courses WHERE id = $1", [courseId]);
    if (!course) return NextResponse.json({ error: "Kursus tidak ditemukan" }, { status: 404 });

    let assignedCount = 0;

    for (const email of userEmails) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (!cleanEmail) continue;

      // Cek apakah user sudah lulus ujian atau menyelesaikan kursus
      const { rows: [attempt] } = await query(
        "SELECT id FROM exam_attempts WHERE user_email = $1 AND course_id = $2 AND passed = TRUE LIMIT 1",
        [cleanEmail, courseId]
      ).catch(() => ({ rows: [] }));

      const completedAt = attempt ? new Date() : null;

      await query(
        `INSERT INTO training_assignments (course_id, assigned_to, assigned_by, due_date, is_mandatory, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (course_id, assigned_to)
         DO UPDATE SET due_date = EXCLUDED.due_date,
                       is_mandatory = EXCLUDED.is_mandatory,
                       assigned_by = EXCLUDED.assigned_by`,
        [courseId, cleanEmail, user.email, dueDate ? new Date(dueDate) : null, isMandatory, completedAt]
      );

      // Auto-enroll aktif jika belum terdaftar
      await query(
        `INSERT INTO enrollments (user_email, course_id, status)
         VALUES ($1, $2, 'active')
         ON CONFLICT (user_email, course_id) DO NOTHING`,
        [cleanEmail, courseId]
      ).catch(() => {});

      // Kirim notifikasi kepatuhan
      await query(
        `INSERT INTO notifications (user_email, type, title, message, link)
         VALUES ($1, 'assignment', 'Penugasan Pelatihan Kepatuhan', $2, $3)`,
        [
          cleanEmail,
          `Anda telah ditugaskan untuk menyelesaikan pelatihan wajib: ${course.title}. ${dueDate ? "Tenggat: " + new Date(dueDate).toLocaleDateString("id-ID") : ""}`,
          `/kelas?courseId=${courseId}`
        ]
      ).catch(() => {});

      assignedCount++;
    }

    await catatAudit(user.email, "assign_training", "training_assignment", courseId, {
      course_id: courseId,
      assigned_count: assignedCount,
      due_date: dueDate,
      is_mandatory: isMandatory,
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil menugaskan pelatihan kepada ${assignedCount} peserta.`,
      assignedCount,
    });
  } catch (error) {
    console.error("Training assignments POST error:", error);
    return NextResponse.json({ error: "Gagal menyimpan penugasan pelatihan" }, { status: 500 });
  }
}
