/**
 * POST /api/enrollments/bulk
 * body: { courseId, userEmails: string[] }   OR  { courseId, departmentId }
 * Mendaftarkan sekelompok user ke satu kursus sekaligus.
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

const ADMIN_ROLES = ["admin", "corporate", "government"];

const bodySchema = z.union([
  z.object({
    courseId:     z.string().min(1),
    userEmails:   z.array(z.string().email()).min(1),
  }),
  z.object({
    courseId:     z.string().min(1),
    departmentId: z.number().int(),
  }),
]);

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { courseId } = parsed.data;
  let emails = [];

  try {
    // ── Batas organisasi ─────────────────────────────────────────────────────
    // Endpoint ini memberi akses kelas berbayar tanpa melewati pembayaran, dan
    // dulu terbuka untuk setiap peran corporate/government tanpa batas apa pun:
    // satu akun HR dapat mendaftarkan email siapa saja — termasuk di luar
    // organisasinya — ke kursus mana pun secara cuma-cuma. Sekarang pemanggil
    // non-admin hanya boleh menyentuh anggota organisasinya sendiri.
    const bukanAdmin = user.role !== "admin";
    let orgPemanggil = null;

    if (bukanAdmin) {
      const { rows: [profil] } = await query(
        "SELECT organization_id, organization FROM users WHERE email = $1", [user.email]
      );
      orgPemanggil = profil || null;
      if (!orgPemanggil?.organization_id && !orgPemanggil?.organization) {
        return NextResponse.json({
          error: "Akun Anda belum terkait organisasi mana pun, sehingga tidak dapat mendaftarkan peserta.",
        }, { status: 403 });
      }
    }

    // Kursus harus ada (dan belum dihapus) sebelum siapa pun didaftarkan.
    const { rows: [kursus] } = await query(
      "SELECT id, title, price FROM courses WHERE id = $1 AND deleted_at IS NULL", [courseId]
    );
    if (!kursus) return NextResponse.json({ error: "Kursus tidak ditemukan" }, { status: 404 });

    if ("departmentId" in parsed.data) {
      // Departemen yang dituju wajib berada di organisasi pemanggil.
      if (bukanAdmin && orgPemanggil.organization_id) {
        const { rows: [dept] } = await query(
          "SELECT 1 AS ada FROM departments WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL",
          [parsed.data.departmentId, orgPemanggil.organization_id]
        );
        if (!dept) {
          return NextResponse.json({ error: "Departemen ini bukan bagian dari organisasi Anda" }, { status: 403 });
        }
      }
      const res = await query(
        "SELECT email FROM users WHERE department_id = $1 AND deleted_at IS NULL",
        [parsed.data.departmentId]
      );
      emails = res.rows.map(r => r.email);
    } else {
      emails = parsed.data.userEmails;
    }

    if (emails.length === 0) {
      return NextResponse.json({ success: false, error: "Tidak ada user di departemen ini" }, { status: 400 });
    }

    // Saring email yang bukan anggota organisasi pemanggil. Ditolak seluruhnya
    // — bukan diam-diam dilewati — supaya pemanggil tahu daftarnya keliru.
    let ditolak = [];
    if (bukanAdmin) {
      const { rows: anggota } = await query(`
        SELECT email FROM users
         WHERE email = ANY($1::text[]) AND deleted_at IS NULL
           AND ( ($2::int IS NOT NULL AND organization_id = $2)
              OR ($2::int IS NULL AND organization = $3) )
      `, [emails, orgPemanggil.organization_id || null, orgPemanggil.organization || ""]);

      const boleh = new Set(anggota.map(r => r.email));
      ditolak = emails.filter(e => !boleh.has(e));
      if (ditolak.length > 0) {
        return NextResponse.json({
          error: "Sebagian email bukan anggota organisasi Anda",
          rejected: ditolak,
        }, { status: 403 });
      }
    }

    // Batch insert enrollments
    let enrolled = 0, skipped = 0;
    for (const email of emails) {
      try {
        await query(
          `INSERT INTO enrollments (user_email, course_id, status)
           VALUES ($1, $2, 'active')
           ON CONFLICT (user_email, course_id) DO NOTHING`,
          [email, courseId]
        );
        enrolled++;

        // Buat notifikasi untuk tiap user
        try {
          const courseRes = await query("SELECT title FROM courses WHERE id = $1", [courseId]);
          const courseTitle = courseRes.rows[0]?.title || courseId;
          await query(
            `INSERT INTO notifications (user_email, type, title, message, link)
             VALUES ($1, 'enrollment', 'Enrollment Baru', $2, $3)`,
            [email, `Anda telah didaftarkan ke kursus: ${courseTitle}`, `/lms`]
          );
        } catch { /* notifikasi opsional */ }
      } catch { skipped++; }
    }

    // Audit log
    try {
      await query(
        `INSERT INTO audit_logs (actor_email, action, entity_type, entity_id, detail)
         VALUES ($1, 'bulk_enroll', 'course', $2, $3)`,
        [user.email, courseId, JSON.stringify({
          enrolled, skipped, emails,
          course_title: kursus.title,
          unit_price: Number(kursus.price) || 0,
          nilai_akses: (Number(kursus.price) || 0) * enrolled,
        })]
      );
    } catch { /* audit opsional */ }

    return NextResponse.json({ success: true, enrolled, skipped, total: emails.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
