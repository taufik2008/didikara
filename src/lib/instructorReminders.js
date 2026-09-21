/**
 * instructorReminders.js — empat pengingat untuk instruktur.
 *
 * Dijalankan penyapu berkala (/api/live-sessions/sweep). Semuanya idempoten:
 * setiap jenis punya penandanya sendiri, sehingga penyapu boleh berjalan tiap
 * 15 menit tanpa membanjiri kotak masuk siapa pun.
 *
 * Sumber jadwal adalah live_sessions — bukan kolom teks "Jadwal Kelas" yang
 * dulu diisi manual ("Senin & Rabu") dan tidak dapat dipakai memicu apa pun.
 */
import { query } from "@/lib/db";
import { sendInstructorEmail } from "@/lib/email";

const jam = (t) => new Date(t).toLocaleString("id-ID", {
  dateStyle: "full", timeStyle: "short", timeZone: "Asia/Jakarta",
});
const rupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

/** Semua orang yang berkepentingan atas sebuah sesi: pengampu kursus + pembuatnya. */
async function penanggungJawabSesi(sess) {
  const { rows } = await query(`
    SELECT DISTINCT u.email, u.fullname
      FROM users u
     WHERE u.deleted_at IS NULL
       AND (
         u.email = $1
         OR u.email IN (SELECT user_email FROM course_instructors WHERE course_id = $2)
       )
  `, [sess.instructor_email || "", sess.course_id || ""]);
  return rows;
}

async function kirim(email, nama, judul, subjek, isi, notifJudul, notifPesan) {
  await query(
    `INSERT INTO notifications (user_email, type, title, message, link)
     VALUES ($1, 'info', $2, $3, '/kelas')`,
    [email, notifJudul, notifPesan]
  ).catch(() => {});
  await sendInstructorEmail(email, nama || email, judul, subjek, isi).catch(() => {});
}

// ── 1 & 2. Pengingat sesi: H-1 dan satu jam sebelum ─────────────────────────
export async function pengingatSesi(hasil) {
  const jenis = [
    { kolom: "instructor_reminder_24h_at", rentang: "24 hours", label: "besok" },
    { kolom: "instructor_reminder_1h_at",  rentang: "1 hour",   label: "dalam 1 jam" },
  ];

  for (const j of jenis) {
    const { rows: sesi } = await query(`
      SELECT ls.*, c.title AS course_title,
             (SELECT COUNT(*) FROM live_session_registrations r
               WHERE r.session_id = ls.id AND r.status = 'registered') AS peserta
        FROM live_sessions ls
        LEFT JOIN courses c ON c.id = ls.course_id
       WHERE ls.deleted_at IS NULL
         AND ls.status IN ('scheduled','live')
         AND ls.${j.kolom} IS NULL
         AND ls.scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '${j.rentang}'
    `);

    for (const sess of sesi) {
      const orang = await penanggungJawabSesi(sess);
      for (const o of orang) {
        await kirim(
          o.email, o.fullname,
          "Pengingat Mengajar",
          `Anda mengajar ${j.label}: ${sess.title}`,
          `<p>Sesi live yang Anda ampu dimulai <strong>${j.label}</strong>.</p>
           <h3 style="color:#f97316">${sess.title}</h3>
           <p>Kursus: <strong>${sess.course_title || "—"}</strong><br>
              Waktu: <strong>${jam(sess.scheduled_at)}</strong><br>
              Durasi: ${sess.duration_minutes} menit ·
              Peserta terdaftar: <strong>${sess.peserta}</strong></p>
           ${sess.meet_link
             ? `<a href="${sess.meet_link}" class="btn">Buka Ruang Meeting</a>`
             : `<p style="color:#f87171"><strong>Tautan meeting masih kosong.</strong> Isi sebelum sesi dimulai agar peserta dapat bergabung.</p>`}`,
          `Pengingat mengajar: ${sess.title}`,
          `Sesi Anda dimulai ${j.label} — ${jam(sess.scheduled_at)}. ${sess.peserta} peserta terdaftar.`
        );
        hasil.pengingatInstruktur++;
      }
      await query(`UPDATE live_sessions SET ${j.kolom} = NOW() WHERE id = $1`, [sess.id]);
    }
  }
}

// ── 3. Ringkasan jadwal mingguan (Senin) ────────────────────────────────────
export async function ringkasanMingguan(hasil, sekarang = new Date()) {
  if (sekarang.getDay() !== 1) return;          // hanya Senin

  const { rows: instruktur } = await query(`
    SELECT p.user_email, u.fullname
      FROM instructor_profiles p
      JOIN users u ON u.email = p.user_email AND u.deleted_at IS NULL
     WHERE p.active
       AND (p.last_weekly_digest_at IS NULL OR p.last_weekly_digest_at < NOW() - INTERVAL '6 days')
  `);

  for (const ins of instruktur) {
    const { rows: sesi } = await query(`
      SELECT ls.title, ls.scheduled_at, ls.duration_minutes, ls.platform, c.title AS course_title
        FROM live_sessions ls
        LEFT JOIN courses c ON c.id = ls.course_id
       WHERE ls.deleted_at IS NULL AND ls.status IN ('scheduled','live')
         AND ls.scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
         AND (ls.instructor_email = $1
              OR ls.course_id IN (SELECT course_id FROM course_instructors WHERE user_email = $1))
       ORDER BY ls.scheduled_at
    `, [ins.user_email]);

    // Minggu tanpa sesi tidak perlu email — pengingat yang tidak membawa
    // informasi hanya melatih orang mengabaikannya.
    if (sesi.length === 0) {
      await query(
        "UPDATE instructor_profiles SET last_weekly_digest_at = NOW() WHERE user_email = $1",
        [ins.user_email]
      );
      continue;
    }

    const daftar = sesi.map(s =>
      `<li><strong>${jam(s.scheduled_at)}</strong> — ${s.title}
        <span style="color:#94a3b8">(${s.course_title || "tanpa kursus"}, ${s.duration_minutes} menit, ${String(s.platform || "").toUpperCase()})</span></li>`
    ).join("");

    await kirim(
      ins.user_email, ins.fullname,
      "Jadwal Mengajar Minggu Ini",
      `Jadwal mengajar Anda minggu ini (${sesi.length} sesi)`,
      `<p>Berikut sesi yang Anda ampu dalam tujuh hari ke depan:</p><ul>${daftar}</ul>
       <p style="color:#94a3b8;font-size:0.85rem">Pastikan tautan meeting setiap sesi sudah terisi.</p>`,
      "Jadwal mengajar minggu ini",
      `${sesi.length} sesi terjadwal. Sesi terdekat: ${jam(sesi[0].scheduled_at)}.`
    );

    await query(
      "UPDATE instructor_profiles SET last_weekly_digest_at = NOW() WHERE user_email = $1",
      [ins.user_email]
    );
    hasil.ringkasanMingguan++;
  }
}

// ── 4. Tugas yang menunggu dinilai ──────────────────────────────────────────
export async function pengingatPenilaian(hasil, hariTertunggak = 3) {
  const { rows: instruktur } = await query(`
    SELECT p.user_email, u.fullname
      FROM instructor_profiles p
      JOIN users u ON u.email = p.user_email AND u.deleted_at IS NULL
     WHERE p.active
       AND (p.last_grading_nudge_at IS NULL OR p.last_grading_nudge_at < NOW() - INTERVAL '24 hours')
  `);

  for (const ins of instruktur) {
    const { rows: [tunggak] } = await query(`
      SELECT COUNT(*) AS jumlah, MIN(s.submitted_at) AS terlama
        FROM assignment_submissions s
        JOIN course_instructors ci ON ci.course_id = s.course_id AND ci.user_email = $1
        LEFT JOIN assignment_grades g
               ON g.course_id = s.course_id AND g.user_email = s.user_email
              AND g.lesson_index = s.lesson_index
       WHERE g.id IS NULL
         AND s.submitted_at < NOW() - INTERVAL '${hariTertunggak} days'
    `, [ins.user_email]);

    const jumlah = Number(tunggak?.jumlah || 0);
    if (jumlah === 0) continue;

    await kirim(
      ins.user_email, ins.fullname,
      "Tugas Menunggu Penilaian",
      `${jumlah} tugas menunggu dinilai`,
      `<p>Ada <strong>${jumlah} tugas</strong> pada kursus yang Anda ampu yang belum dinilai
          lebih dari ${hariTertunggak} hari.</p>
       <p>Pengumpulan terlama: <strong>${jam(tunggak.terlama)}</strong>.</p>
       <p style="color:#94a3b8;font-size:0.85rem">Peserta tidak dapat melihat umpan balik
          sampai tugasnya dinilai.</p>`,
      "Tugas menunggu dinilai",
      `${jumlah} tugas belum dinilai lebih dari ${hariTertunggak} hari.`
    );

    await query(
      "UPDATE instructor_profiles SET last_grading_nudge_at = NOW() WHERE user_email = $1",
      [ins.user_email]
    );
    hasil.pengingatPenilaian++;
  }
}

// ── 5. Ringkasan bagi hasil bulanan ─────────────────────────────────────────
export async function ringkasanBagiHasil(hasil, sekarang = new Date()) {
  if (sekarang.getDate() > 5) return;           // hanya awal bulan

  const awalBulanLalu = new Date(sekarang.getFullYear(), sekarang.getMonth() - 1, 1);
  const akhirBulanLalu = new Date(sekarang.getFullYear(), sekarang.getMonth(), 0);
  const p1 = awalBulanLalu.toISOString().slice(0, 10);
  const p2 = akhirBulanLalu.toISOString().slice(0, 10);

  const { rows: baris } = await query(`
    SELECT po.*, u.fullname, pr.last_payout_digest_at
      FROM instructor_payouts po
      JOIN users u ON u.email = po.user_email AND u.deleted_at IS NULL
      JOIN instructor_profiles pr ON pr.user_email = po.user_email AND pr.active
     WHERE po.period_start = $1 AND po.period_end = $2
       AND (pr.last_payout_digest_at IS NULL OR pr.last_payout_digest_at < $1)
  `, [p1, p2]);

  for (const b of baris) {
    await kirim(
      b.user_email, b.fullname,
      "Ringkasan Bagi Hasil",
      `Bagi hasil periode ${p1} s.d. ${p2}`,
      `<p>Rekap bagi hasil Anda untuk periode <strong>${p1} — ${p2}</strong>:</p>
       <p>Pendapatan kursus yang Anda ampu: <strong>${rupiah(b.gross_amount)}</strong><br>
          Porsi Anda (${Number(b.share_pct)}%): <strong style="color:#f97316">${rupiah(b.payout_amount)}</strong><br>
          Jumlah transaksi: ${b.order_count}</p>
       <p>Status: <strong>${b.status === "paid" ? "sudah dibayarkan" : "menunggu pembayaran"}</strong>.</p>
       <p style="color:#94a3b8;font-size:0.85rem">Rekap ini dihitung dari order berstatus lunas.
          Hubungi administrator bila ada selisih.</p>`,
      "Ringkasan bagi hasil",
      `Periode ${p1}—${p2}: ${rupiah(b.payout_amount)} (${b.status === "paid" ? "sudah dibayar" : "menunggu pembayaran"}).`
    );

    await query(
      "UPDATE instructor_profiles SET last_payout_digest_at = NOW() WHERE user_email = $1",
      [b.user_email]
    );
    hasil.ringkasanBagiHasil++;
  }
}

/** Jalankan seluruh pengingat instruktur. */
export async function jalankanPengingatInstruktur(hasil) {
  hasil.pengingatInstruktur = 0;
  hasil.ringkasanMingguan = 0;
  hasil.pengingatPenilaian = 0;
  hasil.ringkasanBagiHasil = 0;

  await pengingatSesi(hasil).catch(e => console.warn("[SWEEP] pengingat sesi:", e.message));
  await ringkasanMingguan(hasil).catch(e => console.warn("[SWEEP] ringkasan mingguan:", e.message));
  await pengingatPenilaian(hasil).catch(e => console.warn("[SWEEP] pengingat penilaian:", e.message));
  await ringkasanBagiHasil(hasil).catch(e => console.warn("[SWEEP] ringkasan bagi hasil:", e.message));
}
