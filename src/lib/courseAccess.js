/**
 * courseAccess.js — satu tempat untuk pertanyaan "boleh tidak orang ini?".
 *
 * Sebelumnya setiap route memutuskan lewat konstanta yang sama:
 *   const INSTRUCTOR_ROLES = ["admin", "corporate", "government"];
 * Artinya HR sebuah korporat otomatis menjadi instruktur SETIAP kursus di
 * platform — termasuk kursus milik instansi lain. Modul ini menggantinya
 * dengan penugasan yang tercatat di tabel `course_instructors`.
 */

import { query } from "@/lib/db";

/** Admin selalu boleh; selain itu harus tercatat sebagai pengajar kursus. */
export async function canManageCourse(user, courseId) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (!courseId) return false;
  try {
    const { rows } = await query(
      "SELECT 1 FROM course_instructors WHERE course_id = $1 AND user_email = $2",
      [courseId, user.email]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

/** Daftar kursus yang diampu pengguna. Admin mendapat null (berarti semua). */
export async function taughtCourseIds(user) {
  if (!user || user.role === "admin") return null;
  try {
    const { rows } = await query(
      "SELECT course_id FROM course_instructors WHERE user_email = $1",
      [user.email]
    );
    return rows.map(r => r.course_id);
  } catch {
    return [];
  }
}

/** Apakah pengguna punya pendaftaran aktif di kursus tersebut. */
export async function isEnrolled(email, courseId) {
  if (!email || !courseId) return false;
  try {
    const { rows } = await query(
      "SELECT 1 FROM enrollments WHERE user_email = $1 AND course_id = $2 AND status = 'active'",
      [email, courseId]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Memeriksa apakah pengguna memiliki paket langganan aktif.
 * Admin selalu diizinkan (bypass).
 */
export async function hasActiveSubscription(userOrEmail) {
  if (!userOrEmail) return false;
  if (typeof userOrEmail === "object") {
    const role = userOrEmail.role;
    if (role === "admin" || role === "superadmin" || role === "instructor") return true;
    if (userOrEmail.subscription_status === "active") {
      if (!userOrEmail.subscription_expires_at || new Date(userOrEmail.subscription_expires_at) > new Date()) {
        return true;
      }
      return false;
    }
    if (userOrEmail.subscription_status && userOrEmail.subscription_status !== "active") {
      return false;
    }
  }

  const email = typeof userOrEmail === "string" ? userOrEmail : userOrEmail.email;
  if (!email) return false;

  try {
    const { rows: [u] } = await query(
      "SELECT role, subscription_status, subscription_expires_at FROM users WHERE email = $1",
      [email]
    ).catch(() => ({ rows: [] }));
    if (u?.role === "admin") return true;
    if (u?.subscription_status === "active" && (!u.subscription_expires_at || new Date(u.subscription_expires_at) > new Date())) {
      return true;
    }

    const { rows: subs } = await query(
      `SELECT 1 FROM user_subscriptions
       WHERE user_email = $1 AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW())
       LIMIT 1`,
      [email]
    ).catch(() => ({ rows: [] }));
    if (subs && subs.length > 0) return true;

    const { rows: orders } = await query(
      `SELECT created_at, metadata FROM payment_orders
       WHERE user_email = $1 AND status = 'paid'
         AND (course_id LIKE 'membership-%' OR metadata->>'is_membership' = 'true')
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    ).catch(() => ({ rows: [] }));

    if (orders && orders.length > 0) {
      const order = orders[0];
      const isAnnual = order.metadata?.membership_type?.includes("annual") || order.metadata?.course_title?.toLowerCase().includes("tahun");
      const durationDays = isAnnual ? 366 : 31;
      const expiry = new Date(new Date(order.created_at).getTime() + durationDays * 24 * 60 * 60 * 1000);
      if (expiry > new Date()) return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Wewenang atas satu sesi live: admin, pengajar kursusnya, atau pembuat sesi.
 * Sesi tanpa kursus (sesi umum) hanya boleh dikelola admin dan pembuatnya.
 */
export async function canManageSession(user, session) {
  if (!user || !session) return false;
  if (user.role === "admin") return true;
  if (session.instructor_email && session.instructor_email === user.email) return true;
  return canManageCourse(user, session.course_id);
}

/**
 * Organisasi pengguna sebagai pasangan (id, nama). Dua representasi hidup
 * berdampingan di skema — kolom teks `users.organization` yang dipakai laporan
 * dan sertifikat, serta relasi `users.organization_id` yang dipakai modul
 * organisasi — jadi keduanya dikembalikan sekaligus dan pemanggil memakai yang
 * tersedia.
 */
export async function organisasiPengguna(email) {
  try {
    const { rows: [baris] } = await query(
      `SELECT u.organization_id, u.organization, o.name AS nama_relasi
         FROM users u
         LEFT JOIN organizations o ON o.id = u.organization_id
        WHERE u.email = $1`,
      [email]
    );
    if (!baris) return null;
    return {
      id:   baris.organization_id ?? null,
      nama: baris.nama_relasi || baris.organization || "",
    };
  } catch {
    return null;
  }
}

/**
 * Memeriksa pemenuhan syarat kelulusan kursus prasyarat (prerequisites).
 */
export async function checkPrerequisites(email, course) {
  if (!email || !course?.prerequisites || !Array.isArray(course.prerequisites) || course.prerequisites.length === 0) {
    return { satisfied: true, missing: [] };
  }
  try {
    const { rows } = await query(
      `SELECT course_id FROM certificates WHERE user_email = $1`,
      [email]
    );
    const completedIds = new Set(rows.map(r => r.course_id));
    const missing = course.prerequisites.filter(reqId => !completedIds.has(reqId));
    return {
      satisfied: missing.length === 0,
      missing,
    };
  } catch {
    return { satisfied: true, missing: [] };
  }
}
