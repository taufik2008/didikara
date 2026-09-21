/**
 * GET /api/live-sessions/join?id=12
 *
 * Pintu masuk sesi live. Peserta tidak lagi membuka link meeting langsung:
 * tombol "Bergabung" mengarah ke sini, sehingga kehadiran benar-benar tercatat
 * dan link tidak beredar ke orang yang tidak terdaftar.
 *
 * Alur: verifikasi pendaftaran → cek jendela waktu → catat kehadiran (sekali)
 * → beri XP → redirect 302 ke Zoom/Meet.
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { canManageSession } from "@/lib/courseAccess";
import { jendelaBergabung } from "@/lib/liveSession";

/** XP kehadiran live — nilainya sama dengan XP.live_attend di /api/gamification. */
const XP_HADIR = 20;

function pesan(teks, status) {
  return NextResponse.json({ success: false, error: teks }, { status });
}

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return pesan("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return pesan("id sesi wajib", 400);

  try {
    const { rows: [sess] } = await query(
      "SELECT * FROM live_sessions WHERE id = $1 AND deleted_at IS NULL", [id]
    );
    if (!sess) return pesan("Sesi tidak ditemukan", 404);
    if (!sess.meet_link) return pesan("Link meeting belum diisi penyelenggara.", 409);

    const pengelola = await canManageSession(user, sess);

    // Peserta wajib punya kursi. Daftar tunggu belum berhak masuk.
    if (!pengelola) {
      const { rows: [reg] } = await query(
        "SELECT status FROM live_session_registrations WHERE session_id = $1 AND user_email = $2",
        [id, user.email]
      );
      if (!reg || reg.status !== "registered") {
        return pesan(
          reg?.status === "waitlisted"
            ? "Anda masih di daftar tunggu sesi ini."
            : "Anda belum terdaftar di sesi ini.",
          403
        );
      }

      const { buka, tutup } = jendelaBergabung(sess);
      const kini = Date.now();
      if (kini < buka) {
        return pesan(
          `Ruang sesi dibuka 15 menit sebelum mulai (${new Date(buka).toLocaleString("id-ID")}).`,
          409
        );
      }
      if (kini > tutup) return pesan("Sesi ini sudah berakhir.", 409);

      // Kehadiran dicatat sekali; klik berikutnya tidak menggandakan XP.
      const { rows: [baruHadir] } = await query(
        `UPDATE live_session_registrations
            SET attended = TRUE, attended_at = NOW()
          WHERE session_id = $1 AND user_email = $2 AND attended_at IS NULL
          RETURNING id`,
        [id, user.email]
      );

      if (baruHadir) {
        query(
          `INSERT INTO user_points (user_email, points, total_points, level)
           VALUES ($1, $2, $2, 1)
           ON CONFLICT (user_email) DO UPDATE SET
             points = user_points.points + $2,
             total_points = user_points.total_points + $2,
             last_activity_date = CURRENT_DATE, updated_at = NOW()`,
          [user.email, XP_HADIR]
        ).catch(() => {});
      }
    }

    return NextResponse.redirect(sess.meet_link, 302);
  } catch (err) {
    return pesan(err.message, 500);
  }
}
