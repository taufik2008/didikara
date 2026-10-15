/**
 * GET    /api/instructors            → daftar profil instruktur (admin)
 * GET    /api/instructors?me=1       → profil sendiri
 * POST   /api/instructors            → buat/perbarui profil (admin)
 * DELETE /api/instructors?email=x    → nonaktifkan profil (admin)
 *
 * Profil instruktur menempel pada akun pengguna, bukan berdiri sendiri sebagai
 * baris lepas seperti sebelumnya. Konsekuensinya dua hal penting jadi mungkin:
 * pengingat punya alamat tujuan, dan bagi hasil punya pemilik yang jelas.
 *
 * Jadwal TIDAK disimpan sebagai teks. Ia diturunkan dari live_sessions pada
 * kursus yang diampu instruktur — satu-satunya tempat tanggal sesi benar-benar
 * ada. Kolom "Jadwal Kelas" lama ("Senin & Rabu") tidak dapat dipakai memicu
 * apa pun, karena bukan tanggal.
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { catatAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { z } from "zod";

const profilSchema = z.object({
  userEmail:       z.string().email(),
  fullname:        z.string().max(255).optional(),
  organization:    z.string().max(255).optional(),
  avatar:          z.string().optional().default(""),
  specialty:       z.string().max(255).optional().default(""),
  bio:             z.string().max(2000).optional().default(""),
  phone:           z.string().max(50).optional().default(""),
  revenueSharePct: z.number().min(0).max(100).optional().default(30),
  active:          z.boolean().optional().default(true),
});

/** Jadwal terdekat seorang instruktur, dari sesi nyata. */
async function jadwalTerdekat(email, batas = 5) {
  const { rows } = await query(`
    SELECT ls.id, ls.title, ls.scheduled_at, ls.duration_minutes, ls.platform,
           ls.status, c.title AS course_title,
           (SELECT COUNT(*) FROM live_session_registrations r
             WHERE r.session_id = ls.id AND r.status = 'registered') AS registered_count
      FROM live_sessions ls
      LEFT JOIN courses c ON c.id = ls.course_id
     WHERE ls.deleted_at IS NULL
       AND ls.scheduled_at > NOW() - INTERVAL '2 hours'
       AND (
         ls.instructor_email = $1
         OR ls.course_id IN (SELECT course_id FROM course_instructors WHERE user_email = $1)
       )
     ORDER BY ls.scheduled_at ASC
     LIMIT $2
  `, [email, batas]);
  return rows;
}

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const sendiri = searchParams.get("me") === "1" || user.role !== "admin";
  const page    = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit   = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const offset  = (page - 1) * limit;

  try {
    const { rows: [{ count: totalCount }] } = await query(`
      SELECT COUNT(*) AS count
        FROM instructor_profiles p
        JOIN users u ON u.email = p.user_email AND u.deleted_at IS NULL
       WHERE ($1::boolean = FALSE OR p.user_email = $2)
    `, [sendiri, user.email]);

    const { rows: profil } = await query(`
      SELECT p.*, u.fullname, u.role, u.organization, u.avatar,
             (SELECT COUNT(*) FROM course_instructors ci WHERE ci.user_email = p.user_email) AS jumlah_kursus
        FROM instructor_profiles p
        JOIN users u ON u.email = p.user_email AND u.deleted_at IS NULL
       WHERE ($1::boolean = FALSE OR p.user_email = $2)
       ORDER BY u.fullname
       LIMIT $3 OFFSET $4
    `, [sendiri, user.email, limit, offset]);

    // Jadwal dan tugas tertunggak dilampirkan agar layar admin dan layar
    // instruktur menampilkan keadaan yang sama.
    const hasil = [];
    for (const p of profil) {
      const jadwal = await jadwalTerdekat(p.user_email, 5);
      const { rows: [tunggak] } = await query(`
        SELECT COUNT(*) AS jumlah
          FROM assignment_submissions s
          JOIN course_instructors ci ON ci.course_id = s.course_id AND ci.user_email = $1
          LEFT JOIN assignment_grades g
                 ON g.course_id = s.course_id AND g.user_email = s.user_email
                AND g.lesson_index = s.lesson_index
         WHERE g.id IS NULL
      `, [p.user_email]).catch(() => ({ rows: [{ jumlah: 0 }] }));

      hasil.push({
        ...p,
        jadwal_terdekat: jadwal,
        sesi_berikutnya: jadwal[0]?.scheduled_at || null,
        tugas_belum_dinilai: Number(tunggak?.jumlah || 0),
      });
    }

    return NextResponse.json({
      success: true,
      instructors: hasil,
      total: parseInt(totalCount, 10),
      page,
      limit,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Hanya admin yang dapat mengelola profil instruktur" }, { status: 403 });
  }

  const parsed = profilSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { userEmail, fullname, organization, avatar, specialty, bio, phone, revenueSharePct, active } = parsed.data;

  try {
    const { rows: [akun] } = await query(
      "SELECT email, role, fullname, avatar, organization FROM users WHERE email = $1 AND deleted_at IS NULL", [userEmail]
    );

    if (!akun) {
      // Buat akun baru otomatis jika belum terdaftar
      const initialName = fullname || userEmail.split("@")[0];
      const initialOrg = organization || "DIDIKARA Certified";
      const initialAvatar = avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80";
      const hashedPassword = await bcrypt.hash("password123", 10);

      await query(`
        INSERT INTO users (email, password, fullname, role, role_label, avatar, stats, job_title, organization, status, permissions, competencies)
        VALUES ($1, $2, $3, 'corporate', 'Instruktur / Pengajar', $4, '{"coursesEnrolled":0,"coursesCompleted":0,"certificatesEarned":0,"competency":"B2 (Advanced)"}', $5, $6, 'active', '["view_dashboard","access_lms","manage_instructors"]', '{}')
        ON CONFLICT (email) DO UPDATE SET
          fullname = EXCLUDED.fullname,
          avatar = EXCLUDED.avatar,
          organization = EXCLUDED.organization
      `, [userEmail, hashedPassword, initialName, initialAvatar, specialty || "Pengajar Ahli", initialOrg]);
    } else {
      // Perbarui data pengguna jika ada perubahan
      const updates = [];
      const vals = [];
      let idx = 1;

      if (fullname && fullname.trim()) {
        updates.push(`fullname = $${idx++}`);
        vals.push(fullname.trim());
      }
      if (organization !== undefined) {
        updates.push(`organization = $${idx++}`);
        vals.push(organization);
      }
      if (avatar !== undefined && avatar !== "") {
        updates.push(`avatar = $${idx++}`);
        vals.push(avatar);
      }
      if (akun.role === "student") {
        updates.push(`role = $${idx++}`);
        vals.push("corporate");
        updates.push(`role_label = $${idx++}`);
        vals.push("Instruktur / Pengajar");
      }

      if (updates.length > 0) {
        vals.push(userEmail);
        await query(`UPDATE users SET ${updates.join(", ")} WHERE email = $${idx}`, vals);
      }
    }

    const { rows: [profil] } = await query(`
      INSERT INTO instructor_profiles
        (user_email, specialty, bio, phone, revenue_share_pct, active, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      ON CONFLICT (user_email) DO UPDATE SET
        specialty = EXCLUDED.specialty,
        bio = EXCLUDED.bio,
        phone = EXCLUDED.phone,
        revenue_share_pct = EXCLUDED.revenue_share_pct,
        active = EXCLUDED.active,
        updated_at = NOW()
      RETURNING *
    `, [userEmail, specialty, bio, phone, revenueSharePct, active]);

    await catatAudit(user.email, "upsert_instructor_profile", "instructor_profile", userEmail, {
      revenue_share_pct: revenueSharePct, active,
    });

    return NextResponse.json({ success: true, instructor: profil });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const user = await authenticateRequest(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Hanya admin yang dapat mengelola profil instruktur" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const action = searchParams.get("action"); // "activate" | "deactivate" | "delete"
  if (!email) return NextResponse.json({ error: "email wajib" }, { status: 400 });

  try {
    if (action === "activate") {
      await query(
        "UPDATE instructor_profiles SET active = TRUE, updated_at = NOW() WHERE user_email = $1",
        [email]
      );
      await catatAudit(user.email, "activate_instructor_profile", "instructor_profile", email, {});
    } else if (action === "delete") {
      await query("DELETE FROM instructor_profiles WHERE user_email = $1", [email]);
      await catatAudit(user.email, "delete_instructor_profile", "instructor_profile", email, {});
    } else {
      // Default: nonaktifkan
      await query(
        "UPDATE instructor_profiles SET active = FALSE, updated_at = NOW() WHERE user_email = $1",
        [email]
      );
      await catatAudit(user.email, "deactivate_instructor_profile", "instructor_profile", email, {});
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
