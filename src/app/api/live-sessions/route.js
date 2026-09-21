/**
 * GET    /api/live-sessions?courseId=x&upcoming=1&limit=20
 *          Sesi yang boleh dilihat pemanggil. Peserta hanya melihat sesi kursus
 *          yang ia ikuti (plus sesi umum tanpa kursus); pengajar melihat sesi
 *          kursus yang diampunya; admin melihat semuanya.
 *
 * POST   /api/live-sessions
 *          { action: "register", sessionId }  → ambil kursi, atau masuk antrean
 *          { action: "cancel",   sessionId }  → lepas kursi, antrean naik satu
 *          { title, scheduledAt, ... }        → buat sesi (admin / pengajar)
 *
 * PUT    /api/live-sessions   { id, ...field }  → ubah sesi (admin / pengajar)
 * DELETE /api/live-sessions?id=n                → soft delete (admin / pengajar)
 *
 * Catatan otorisasi: pendaftaran dulu ikut terhalang gerbang peran instruktur
 * di awal POST, sehingga peserta selalu menerima 403 dan tidak seorang pun
 * pernah bisa mendaftar. Gerbang kini dipasang per aksi, bukan per method.
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { sendLiveSessionEmail } from "@/lib/email";
import { canManageCourse, canManageSession, isEnrolled, taughtCourseIds } from "@/lib/courseAccess";
import { bolehBergabungSekarang } from "@/lib/liveSession";
import { catatAudit } from "@/lib/audit";

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId") || "";
  const upcoming = searchParams.get("upcoming") === "1";
  const limit    = Math.min(50, parseInt(searchParams.get("limit") || "20"));

  try {
    const syarat = ["ls.deleted_at IS NULL"];
    const params = [user.email];          // $1 selalu email pemanggil

    if (courseId) { params.push(courseId); syarat.push(`ls.course_id = $${params.length}`); }
    if (upcoming) syarat.push("ls.scheduled_at > NOW() - INTERVAL '2 hours'");

    // Batas keterlihatan menurut peran.
    if (user.role !== "admin") {
      const diampu = await taughtCourseIds(user);
      params.push(diampu || []);
      const idxAmpu = params.length;
      syarat.push(`(
        ls.course_id IS NULL
        OR ls.instructor_email = $1
        OR ls.course_id = ANY($${idxAmpu}::text[])
        OR EXISTS (
          SELECT 1 FROM enrollments e
           WHERE e.user_email = $1 AND e.course_id = ls.course_id AND e.status = 'active'
        )
      )`);
    }

    params.push(limit);
    const idxLimit = params.length;

    const { rows } = await query(`
      SELECT
        ls.*,
        u.fullname AS instructor_name,
        c.title    AS course_title,
        COALESCE(reg.jumlah, 0)  AS registered_count,
        COALESCE(anter.jumlah, 0) AS waitlist_count,
        saya.status              AS my_status,
        saya.attended            AS my_attended,
        CASE WHEN saya.status = 'waitlisted' THEN (
          SELECT COUNT(*) + 1 FROM live_session_registrations w
           WHERE w.session_id = ls.id AND w.status = 'waitlisted'
             AND w.registered_at < saya.registered_at
        ) END AS my_waitlist_position
      FROM live_sessions ls
      LEFT JOIN users   u ON u.email = ls.instructor_email
      LEFT JOIN courses c ON c.id    = ls.course_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS jumlah FROM live_session_registrations r
         WHERE r.session_id = ls.id AND r.status = 'registered'
      ) reg ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS jumlah FROM live_session_registrations r
         WHERE r.session_id = ls.id AND r.status = 'waitlisted'
      ) anter ON TRUE
      LEFT JOIN live_session_registrations saya
             ON saya.session_id = ls.id AND saya.user_email = $1
      WHERE ${syarat.join(" AND ")}
      ORDER BY ls.scheduled_at ASC
      LIMIT $${idxLimit}
    `, params);

    // Link meeting tidak dikirim ke sembarang orang: hanya pengelola sesi, atau
    // peserta terdaftar ketika jendela bergabung sudah terbuka. Peserta tetap
    // bergabung lewat /api/live-sessions/join agar kehadiran tercatat.
    const sessions = [];
    for (const s of rows) {
      const pengelola   = await canManageSession(user, s);
      const terdaftar   = s.my_status === "registered";
      const bolehGabung = terdaftar && bolehBergabungSekarang(s);
      sessions.push({
        ...s,
        meet_link: pengelola ? s.meet_link : "",
        has_meet_link: Boolean(s.meet_link),
        can_join: bolehGabung,
        can_manage: pengelola,
        is_registered: terdaftar,
        is_waitlisted: s.my_status === "waitlisted",
        is_full: Number(s.registered_count) >= Number(s.max_participants || 0),
        recording_url: s.status === "completed" ? (s.recording_url || "") : "",
      });
    }

    return NextResponse.json({ success: true, sessions });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { action } = body;

  if (action === "register") return daftarSesi(user, body);
  if (action === "cancel")   return batalkanSesi(user, body);

  // ── Buat sesi baru — hanya admin atau pengajar kursus terkait ──────────────
  const { courseId, title, description, scheduledAt, durationMinutes, meetLink, platform, maxParticipants, recordingUrl } = body;
  if (!title || !scheduledAt) {
    return NextResponse.json({ error: "title dan scheduledAt wajib" }, { status: 400 });
  }
  if (courseId) {
    if (!(await canManageCourse(user, courseId))) {
      return NextResponse.json({ error: "Anda bukan pengajar kursus ini" }, { status: 403 });
    }
  } else if (user.role !== "admin") {
    return NextResponse.json({ error: "Sesi umum tanpa kursus hanya dapat dibuat admin" }, { status: 403 });
  }

  try {
    const { rows: [sess] } = await query(`
      INSERT INTO live_sessions
        (course_id, title, description, instructor_email, scheduled_at, duration_minutes,
         meet_link, platform, max_participants, recording_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `, [courseId || null, title, description || "", user.email, scheduledAt,
        durationMinutes || 60, meetLink || "", platform || "zoom",
        maxParticipants || 100, recordingUrl || ""]);

    if (courseId) {
      await query(
        `INSERT INTO notifications (user_email, type, title, message, link)
         SELECT user_email, 'info', $2, $3, '/kelas'
           FROM enrollments WHERE course_id = $1 AND status = 'active'`,
        [courseId, `Live Class Baru: ${title}`,
         `Sesi dijadwalkan ${new Date(scheduledAt).toLocaleString("id-ID")}. Daftar sekarang untuk mengamankan kursi.`]
      ).catch(() => {});
    }

    await catatAudit(user.email, "create_live_session", "live_session", sess.id, {
      course_id: courseId || null, title, scheduled_at: scheduledAt, platform: platform || "zoom",
    });

    return NextResponse.json({ success: true, session: sess });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── Pendaftaran peserta ──────────────────────────────────────────────────────
async function daftarSesi(user, { sessionId }) {
  if (!sessionId) return NextResponse.json({ error: "sessionId wajib" }, { status: 400 });

  try {
    const { rows: [sess] } = await query(
      "SELECT * FROM live_sessions WHERE id = $1 AND deleted_at IS NULL", [sessionId]
    );
    if (!sess) return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    if (sess.status === "completed" || sess.status === "cancelled") {
      return NextResponse.json({ error: "Sesi ini sudah berakhir" }, { status: 409 });
    }

    // Sesi milik sebuah kursus hanya untuk peserta kursus itu.
    if (sess.course_id && !(await canManageSession(user, sess))) {
      if (!(await isEnrolled(user.email, sess.course_id))) {
        return NextResponse.json(
          { error: "Anda belum terdaftar di kursus ini" }, { status: 403 }
        );
      }
    }

    const { rows: [{ count }] } = await query(
      "SELECT COUNT(*) FROM live_session_registrations WHERE session_id = $1 AND status = 'registered'",
      [sessionId]
    );
    const penuh  = Number(count) >= Number(sess.max_participants || 0);
    const status = penuh ? "waitlisted" : "registered";

    await query(`
      INSERT INTO live_session_registrations (session_id, user_email, status)
      VALUES ($1, $2, $3)
      ON CONFLICT (session_id, user_email)
      DO UPDATE SET status = EXCLUDED.status, registered_at = NOW()
      WHERE live_session_registrations.status = 'cancelled'
    `, [sessionId, user.email, status]);

    // Baris yang sudah aktif tidak tersentuh klausa WHERE di atas — ambil
    // keadaan sebenarnya supaya jawaban ke klien tidak menebak.
    const { rows: [milikSaya] } = await query(
      "SELECT status FROM live_session_registrations WHERE session_id = $1 AND user_email = $2",
      [sessionId, user.email]
    );

    if (milikSaya?.status === "registered") {
      const { rows: [profil] } = await query(
        "SELECT fullname FROM users WHERE email = $1", [user.email]
      ).catch(() => ({ rows: [{}] }));
      sendLiveSessionEmail(user.email, profil?.fullname || user.email, sess.title, sess.scheduled_at, sess.meet_link)
        .catch(() => {});
    }

    return NextResponse.json({
      success: true,
      status: milikSaya?.status || status,
      message: milikSaya?.status === "waitlisted"
        ? "Kuota penuh. Anda masuk daftar tunggu dan akan otomatis naik bila ada yang membatalkan."
        : "Pendaftaran berhasil. Undangan dikirim ke email Anda.",
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── Pembatalan + promosi daftar tunggu ───────────────────────────────────────
async function batalkanSesi(user, { sessionId }) {
  if (!sessionId) return NextResponse.json({ error: "sessionId wajib" }, { status: 400 });

  try {
    const { rows: [sebelumnya] } = await query(
      `UPDATE live_session_registrations SET status = 'cancelled'
        WHERE session_id = $1 AND user_email = $2 AND status <> 'cancelled'
        RETURNING status AS status_lama`,
      [sessionId, user.email]
    );
    if (!sebelumnya) {
      return NextResponse.json({ error: "Anda tidak terdaftar di sesi ini" }, { status: 404 });
    }

    // Kursi yang dilepas peserta terdaftar diberikan ke antrean terdepan.
    let dipromosikan = null;
    if (sebelumnya.status_lama === "registered") {
      const { rows: [naik] } = await query(`
        UPDATE live_session_registrations SET status = 'registered'
         WHERE id = (
           SELECT id FROM live_session_registrations
            WHERE session_id = $1 AND status = 'waitlisted'
            ORDER BY registered_at ASC LIMIT 1
         )
        RETURNING user_email
      `, [sessionId]);

      if (naik) {
        dipromosikan = naik.user_email;
        const { rows: [sess] } = await query("SELECT * FROM live_sessions WHERE id = $1", [sessionId]);
        const { rows: [profil] } = await query(
          "SELECT fullname FROM users WHERE email = $1", [naik.user_email]
        ).catch(() => ({ rows: [{}] }));

        await query(
          `INSERT INTO notifications (user_email, type, title, message, link)
           VALUES ($1, 'success', 'Kursi Live Class Tersedia', $2, '/kelas')`,
          [naik.user_email, `Anda naik dari daftar tunggu ke sesi "${sess.title}". Kursi Anda sudah aman.`]
        ).catch(() => {});

        sendLiveSessionEmail(naik.user_email, profil?.fullname || naik.user_email,
          sess.title, sess.scheduled_at, sess.meet_link).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, promoted: dipromosikan });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PUT ──────────────────────────────────────────────────────────────────────
export async function PUT(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, title, description, scheduledAt, durationMinutes, meetLink,
          platform, maxParticipants, status, recordingUrl } = await request.json();
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });

  try {
    const { rows: [sess] } = await query("SELECT * FROM live_sessions WHERE id = $1", [id]);
    if (!sess) return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    if (!(await canManageSession(user, sess))) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { rows: [baru] } = await query(`
      UPDATE live_sessions SET
        title            = COALESCE($2, title),
        description      = COALESCE($3, description),
        scheduled_at     = COALESCE($4, scheduled_at),
        duration_minutes = COALESCE($5, duration_minutes),
        meet_link        = COALESCE($6, meet_link),
        platform         = COALESCE($7, platform),
        max_participants = COALESCE($8, max_participants),
        status           = COALESCE($9, status),
        recording_url    = COALESCE($10, recording_url)
      WHERE id = $1
      RETURNING *
    `, [id, title, description, scheduledAt, durationMinutes, meetLink,
        platform, maxParticipants, status, recordingUrl]);

    // Rekaman yang baru diunggah diberitahukan ke peserta yang terdaftar.
    if (recordingUrl && recordingUrl !== sess.recording_url) {
      await query(
        `INSERT INTO notifications (user_email, type, title, message, link)
         SELECT user_email, 'info', 'Rekaman Live Class Tersedia', $2, '/kelas'
           FROM live_session_registrations
          WHERE session_id = $1 AND status = 'registered'`,
        [id, `Rekaman sesi "${baru.title}" sudah dapat ditonton.`]
      ).catch(() => {});
    }

    return NextResponse.json({ success: true, session: baru });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });

  try {
    const { rows: [sess] } = await query("SELECT * FROM live_sessions WHERE id = $1", [id]);
    if (!sess) return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    if (!(await canManageSession(user, sess))) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    await query("UPDATE live_sessions SET deleted_at = NOW(), status = 'cancelled' WHERE id = $1", [id]);
    await catatAudit(user.email, "cancel_live_session", "live_session", id, {
      title: sess.title, course_id: sess.course_id, scheduled_at: sess.scheduled_at,
    });
    await query(
      `INSERT INTO notifications (user_email, type, title, message, link)
       SELECT user_email, 'warning', 'Live Class Dibatalkan', $2, '/kelas'
         FROM live_session_registrations
        WHERE session_id = $1 AND status IN ('registered','waitlisted')`,
      [id, `Sesi "${sess.title}" dibatalkan oleh penyelenggara.`]
    ).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
