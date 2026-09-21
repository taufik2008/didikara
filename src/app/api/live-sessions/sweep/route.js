/**
 * POST /api/live-sessions/sweep
 *
 * Penyapu berkala untuk live class. Dijalankan Task Scheduler / cron lewat
 * scripts/live-session-sweep.mjs, atau ditekan manual dari Modul Admin.
 *
   1. Pengingat H-1 dan H-1 jam ke peserta terdaftar (sekali per sesi).
 *   2. Perpindahan status: scheduled → live → completed.
 *   3. Pengingat instruktur: sesi yang akan diampu, ringkasan jadwal mingguan,
 *      tugas yang menunggu dinilai, dan rekap bagi hasil awal bulan.
 *   4. Order pembayaran kedaluwarsa dan pengiriman ulang email yang gagal.
 *
 * Otorisasi: admin yang sedang login, ATAU header `x-cron-secret` yang cocok
 * dengan env `CRON_SECRET`. Route ini terdaftar sebagai jalur publik di
 * src/proxy.js justru supaya penjadwal tanpa cookie bisa memanggilnya —
 * penjagaan sesungguhnya ada di bawah ini.
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { sendEmail, sendLiveSessionEmail } from "@/lib/email";
import { jendelaBergabung } from "@/lib/liveSession";
import { jalankanPengingatInstruktur } from "@/lib/instructorReminders";

async function bolehMenyapu(request) {
  const rahasia = process.env.CRON_SECRET;
  const dikirim = request.headers.get("x-cron-secret");
  if (rahasia && dikirim && dikirim === rahasia) return true;
  const user = await authenticateRequest(request);
  return user?.role === "admin";
}

/** Kirim pengingat untuk satu sesi ke seluruh peserta yang punya kursi. */
async function kirimPengingat(sess, label) {
  const { rows: peserta } = await query(
    `SELECT r.user_email, u.fullname
       FROM live_session_registrations r
       LEFT JOIN users u ON u.email = r.user_email
      WHERE r.session_id = $1 AND r.status = 'registered'`,
    [sess.id]
  );

  const waktu = new Date(sess.scheduled_at).toLocaleString("id-ID", {
    dateStyle: "full", timeStyle: "short", timeZone: "Asia/Jakarta",
  });

  for (const p of peserta) {
    await query(
      `INSERT INTO notifications (user_email, type, title, message, link)
       VALUES ($1, 'info', $2, $3, '/kelas')`,
      [p.user_email, `Pengingat: ${sess.title}`,
       `Sesi live dimulai ${label} — ${waktu}. Tombol Bergabung aktif 15 menit sebelum mulai.`]
    ).catch(() => {});

    await sendLiveSessionEmail(
      p.user_email, p.fullname || p.user_email, `${sess.title} (${label})`,
      sess.scheduled_at, sess.meet_link
    ).catch(() => {});
  }

  return peserta.length;
}

export async function POST(request) {
  if (!(await bolehMenyapu(request))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const hasil = {
    reminder24h: 0, reminder1h: 0, penerima: 0, jadiLive: 0, jadiSelesai: 0,
    orderKedaluwarsa: 0, emailDikirimUlang: 0,
  };

  try {
    // ── 1. Pengingat H-1 ────────────────────────────────────────────────────
    const { rows: h24 } = await query(`
      SELECT * FROM live_sessions
       WHERE deleted_at IS NULL AND status = 'scheduled'
         AND reminder_24h_at IS NULL
         AND scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
    `);
    for (const sess of h24) {
      hasil.penerima += await kirimPengingat(sess, "besok");
      await query("UPDATE live_sessions SET reminder_24h_at = NOW() WHERE id = $1", [sess.id]);
      hasil.reminder24h++;
    }

    // ── 2. Pengingat H-1 jam ────────────────────────────────────────────────
    const { rows: h1 } = await query(`
      SELECT * FROM live_sessions
       WHERE deleted_at IS NULL AND status IN ('scheduled','live')
         AND reminder_1h_at IS NULL
         AND scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '1 hour'
    `);
    for (const sess of h1) {
      hasil.penerima += await kirimPengingat(sess, "dalam 1 jam");
      await query("UPDATE live_sessions SET reminder_1h_at = NOW() WHERE id = $1", [sess.id]);
      hasil.reminder1h++;
    }

    // ── 3. Perpindahan status ───────────────────────────────────────────────
    // Ambang waktunya mengikuti jendela yang sama dengan tombol Bergabung,
    // supaya label "LIVE SEKARANG" dan tombolnya tidak pernah berbeda pendapat.
    const { rows: aktif } = await query(
      "SELECT * FROM live_sessions WHERE deleted_at IS NULL AND status IN ('scheduled','live')"
    );
    for (const sess of aktif) {
      const { buka, tutup } = jendelaBergabung(sess);
      const kini = Date.now();
      if (sess.status === "scheduled" && kini >= buka && kini <= tutup) {
        await query("UPDATE live_sessions SET status = 'live' WHERE id = $1", [sess.id]);
        hasil.jadiLive++;
      } else if (kini > tutup) {
        await query("UPDATE live_sessions SET status = 'completed' WHERE id = $1", [sess.id]);
        hasil.jadiSelesai++;
      }
    }

    // ── 4. Pengingat untuk instruktur ───────────────────────────────────────
    // Penyapu ini semula hanya mengingatkan peserta; pengajarnya sendiri tidak
    // pernah diberi tahu sesi yang ia ampu, tugas yang menumpuk, atau bagi
    // hasil periodenya.
    await jalankanPengingatInstruktur(hasil);

    // ── 5. Order pembayaran yang lewat tenggat ──────────────────────────────
    // Kolom expired_at sudah diisi sejak order dibuat, tetapi tidak pernah ada
    // yang menindaklanjutinya: order pending menumpuk selamanya dan tetap
    // memblokir pembelian ulang kursus yang sama.
    const { rows: kedaluwarsa } = await query(`
      UPDATE payment_orders
         SET status = 'expired', updated_at = NOW()
       WHERE status = 'pending'
         AND expired_at IS NOT NULL AND expired_at < NOW()
       RETURNING id, user_email, course_id, invoice_number
    `).catch(() => ({ rows: [] }));

    for (const order of kedaluwarsa) {
      await query(
        `INSERT INTO notifications (user_email, type, title, message, link)
         VALUES ($1, 'warning', 'Order Kedaluwarsa', $2, '/marketplace')`,
        [order.user_email,
         `Order ${order.invoice_number || order.id} melewati batas waktu pembayaran dan dibatalkan otomatis. Silakan pesan ulang bila masih berminat.`]
      ).catch(() => {});
    }
    hasil.orderKedaluwarsa = kedaluwarsa.length;

    // ── 6. Kirim ulang email yang gagal ─────────────────────────────────────
    // Antrean email punya kolom attempts dan error_message sejak awal, tetapi
    // tidak ada yang pernah mencobanya lagi.
    const { rows: gagal } = await query(`
      SELECT id, to_email, to_name, subject, body_html, attempts
        FROM email_queue
       WHERE status = 'failed' AND COALESCE(attempts, 0) < 3
       ORDER BY created_at ASC
       LIMIT 20
    `).catch(() => ({ rows: [] }));

    for (const surel of gagal) {
      try {
        // logQueue dimatikan supaya percobaan ulang memperbarui baris yang sama,
        // bukan menumpuk baris baru setiap kali dicoba.
        await sendEmail({
          to: surel.to_email, toName: surel.to_name || "",
          subject: surel.subject, html: surel.body_html, logQueue: false,
        });
        await query(
          `UPDATE email_queue
              SET status = 'sent', sent_at = NOW(), attempts = COALESCE(attempts,0) + 1
            WHERE id = $1`,
          [surel.id]
        );
        hasil.emailDikirimUlang++;
      } catch {
        await query(
          `UPDATE email_queue
              SET attempts = COALESCE(attempts,0) + 1, error_message = $2
            WHERE id = $1`,
          [surel.id, "percobaan ulang gagal"]
        ).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, ...hasil });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
