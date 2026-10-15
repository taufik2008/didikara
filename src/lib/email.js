/**
 * email.js — pengiriman email keluar.
 *
 * Konfigurasi dibaca dari Pengaturan Platform (tabel platform_settings) lebih
 * dulu, baru jatuh ke variabel lingkungan. Sebelumnya modul ini HANYA membaca
 * env `EMAIL_*`, sementara panel admin menyimpan `smtp_*` — dua penamaan yang
 * tidak pernah bertemu, sehingga mengisi formulir SMTP di aplikasi tidak
 * mengaktifkan apa pun.
 *
 * Sumber konfigurasi (yang pertama terisi dipakai):
 *   platform_settings.smtp_host  →  env EMAIL_HOST
 *   platform_settings.smtp_port  →  env EMAIL_PORT   (bawaan 587)
 *   platform_settings.smtp_user  →  env EMAIL_USER
 *   platform_settings.smtp_pass  →  env EMAIL_PASS
 *   platform_settings.smtp_from  →  env EMAIL_FROM
 *   platform_settings.support_email → env SUPPORT_EMAIL  (dipakai sebagai Reply-To)
 */
import { query } from "@/lib/db";
import { decryptValue } from "@/lib/crypto";

// Konfigurasi di-cache singkat agar setiap email tidak memicu kueri baru,
// tetapi perubahan di panel admin tetap terasa tanpa perlu restart.
let cacheKonfigurasi = null;
let cacheKedaluwarsa = 0;
const UMUR_CACHE_MS = 60_000;

export function resetEmailConfigCache() {
  cacheKonfigurasi = null;
  cacheKedaluwarsa = 0;
}

export async function getEmailConfig() {
  if (cacheKonfigurasi && Date.now() < cacheKedaluwarsa) return cacheKonfigurasi;

  const s = {};
  try {
    const { rows } = await query(
      `SELECT key, value FROM platform_settings
        WHERE key IN ('smtp_host','smtp_port','smtp_user','smtp_pass','smtp_from','support_email')`
    );
    rows.forEach(r => { if (r.value) s[r.key] = r.value; });
  } catch { /* basis data belum siap — pakai env saja */ }

  const host = s.smtp_host || process.env.EMAIL_HOST || "";
  const konfigurasi = {
    host,
    port: parseInt(s.smtp_port || process.env.EMAIL_PORT || "587", 10),
    user: s.smtp_user || process.env.EMAIL_USER || "",
    pass: decryptValue(s.smtp_pass) || process.env.EMAIL_PASS || "",
    from: s.smtp_from || process.env.EMAIL_FROM || '"AI LMS" <no-reply@ailms.id>',
    replyTo: s.support_email || process.env.SUPPORT_EMAIL || "",
    sumber: s.smtp_host ? "platform_settings" : (process.env.EMAIL_HOST ? "env" : "belum diatur"),
    // Tanpa host, tidak ada yang bisa dikirim: email dicatat ke antrean sebagai
    // bukti, tetapi tidak pernah benar-benar berangkat.
    mock: !host,
  };

  cacheKonfigurasi = konfigurasi;
  cacheKedaluwarsa = Date.now() + UMUR_CACHE_MS;
  return konfigurasi;
}

/**
 * Kirim lewat SMTP. Melempar bila gagal — pemanggil yang memutuskan bagaimana
 * mencatatnya. Sebelumnya fungsi ini menelan galat dan mengembalikan `false`,
 * sementara pemanggilnya tidak pernah memeriksa nilai balik itu: email gagal
 * tetap tercatat "sent", dan mekanisme kirim ulang tidak pernah terpicu.
 */
async function sendViaSMTP(cfg, { to, subject, html, replyTo }) {
  // nodemailer sudah terdaftar di package.json, jadi diimpor seperti pustaka
  // biasa — bukan lewat eval("require") yang rapuh terhadap bundling.
  const { default: nodemailer } = await import("nodemailer");

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,           // 465 = SSL, 587 = STARTTLS
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
  });

  await transporter.sendMail({
    from: cfg.from,
    to,
    subject,
    html,
    replyTo: replyTo || cfg.replyTo || undefined,
  });
}

/** Uji koneksi SMTP tanpa mengirim pesan. */
export async function verifyEmailConnection() {
  const cfg = await getEmailConfig();
  if (cfg.mock) return { ok: false, mock: true, sumber: cfg.sumber, error: "SMTP host belum diisi" };
  try {
    const { default: nodemailer } = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: cfg.host, port: cfg.port, secure: cfg.port === 465,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    });
    await transporter.verify();
    return { ok: true, mock: false, sumber: cfg.sumber, host: cfg.host, port: cfg.port, from: cfg.from };
  } catch (err) {
    return { ok: false, mock: false, sumber: cfg.sumber, host: cfg.host, port: cfg.port, error: err.message };
  }
}

// ── Template helpers ──────────────────────────────────────────────────────────
function baseTemplate(title, bodyHtml) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #0f1117; color: #e2e8f0; margin:0; padding:0; }
    .container { max-width: 560px; margin: 40px auto; background: #1e2433; border-radius: 12px; overflow:hidden; }
    .header { background: linear-gradient(135deg,#f97316,#ea580c); padding: 24px 32px; }
    .header h1 { margin:0; font-size:1.2rem; color:#fff; }
    .body { padding: 32px; }
    .footer { padding: 16px 32px; font-size: 0.75rem; color: #64748b; border-top: 1px solid #2d3748; }
    .btn { display:inline-block; padding:10px 24px; background:#f97316; color:#fff; text-decoration:none; border-radius:8px; font-weight:600; margin-top:16px; }
  </style></head><body>
  <div class="container">
    <div class="header"><h1>🎓 AI LMS Platform — ${title}</h1></div>
    <div class="body">${bodyHtml}</div>
    <div class="footer">Email ini dikirim otomatis. Jangan balas email ini.<br>© ${new Date().getFullYear()} AI LMS – PT. SDI</div>
  </div></body></html>`;
}

export const EmailTemplates = {
  welcome: (fullname) => ({
    subject: "Selamat Datang di AI LMS Platform!",
    html: baseTemplate("Selamat Datang", `
      <p>Halo <strong>${fullname}</strong>,</p>
      <p>Akun Anda telah berhasil dibuat di platform AI LMS. Mulai perjalanan belajar Anda sekarang!</p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}" class="btn">Masuk ke Platform</a>
    `),
  }),

  certIssued: (fullname, courseTitle, certId) => ({
    subject: `Sertifikat Diterbitkan: ${courseTitle}`,
    html: baseTemplate("Sertifikat Baru", `
      <p>Selamat <strong>${fullname}</strong>! 🏆</p>
      <p>Anda telah berhasil menyelesaikan kursus <strong>${courseTitle}</strong> dan sertifikat Anda telah diterbitkan.</p>
      <p>ID Sertifikat: <code>${certId}</code></p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/verify/${certId}" class="btn">Lihat Sertifikat</a>
    `),
  }),

  examPassed: (fullname, courseTitle, score) => ({
    subject: `Selamat, Anda Lulus Ujian: ${courseTitle}`,
    html: baseTemplate("Ujian Lulus", `
      <p>Selamat <strong>${fullname}</strong>! 🎯</p>
      <p>Anda telah lulus ujian <strong>${courseTitle}</strong> dengan skor <strong>${score}%</strong>.</p>
      <p>Sertifikat Anda sedang diproses dan akan segera tersedia.</p>
    `),
  }),

  enrollment: (fullname, courseTitle) => ({
    subject: `Pendaftaran Kursus: ${courseTitle}`,
    html: baseTemplate("Pendaftaran Berhasil", `
      <p>Halo <strong>${fullname}</strong>,</p>
      <p>Anda telah berhasil mendaftar ke kursus <strong>${courseTitle}</strong>. Selamat belajar!</p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}" class="btn">Mulai Belajar</a>
    `),
  }),

  announcement: (fullname, courseTitle, announceTitle, content) => ({
    subject: `Pengumuman: ${announceTitle}`,
    html: baseTemplate("Pengumuman Baru", `
      <p>Halo <strong>${fullname}</strong>,</p>
      <p>Ada pengumuman baru di kursus <strong>${courseTitle}</strong>:</p>
      <h3 style="color:#f97316">${announceTitle}</h3>
      <p>${content}</p>
    `),
  }),

  liveSession: (fullname, sessionTitle, scheduledAt, meetLink) => ({
    subject: `Undangan Live Class: ${sessionTitle}`,
    html: baseTemplate("Live Class Dijadwalkan", `
      <p>Halo <strong>${fullname}</strong>,</p>
      <p>Anda terdaftar di sesi live class berikut:</p>
      <h3 style="color:#f97316">${sessionTitle}</h3>
      <p>📅 Waktu: <strong>${new Date(scheduledAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</strong></p>
      ${meetLink ? `<a href="${meetLink}" class="btn">Bergabung ke Sesi</a>` : ''}
    `),
  }),

  passwordReset: (fullname, resetUrl) => ({
    subject: "Permintaan Reset Password Akun AI LMS",
    html: baseTemplate("Reset Password", `
      <p>Halo <strong>${fullname}</strong>,</p>
      <p>Kami menerima permintaan untuk mereset kata sandi akun AI LMS Anda.</p>
      <p>Klik tombol di bawah ini untuk mengatur kata sandi baru Anda (berlaku selama 1 jam):</p>
      <a href="${resetUrl}" class="btn" style="background:#f97316;color:#fff;">Atur Ulang Kata Sandi</a>
      <p style="margin-top:20px;font-size:0.8rem;color:#94a3b8;">Jika Anda tidak meminta reset password, abaikan email ini. Akun Anda tetap aman.</p>
    `),
  }),
};

// ── Core send function ────────────────────────────────────────────────────────
/**
 * Mengirim satu email dan mencatatnya ke `email_queue`.
 *
 * Status yang dicatat mencerminkan kenyataan:
 *   sent    → benar-benar diserahkan ke server SMTP
 *   mocked  → SMTP belum diatur; isi email disimpan sebagai bukti saja
 *   failed  → SMTP diatur tetapi penyerahan gagal (pesan galat ikut disimpan)
 *
 * Baris `failed` inilah yang dipungut penyapu untuk dikirim ulang.
 */
export async function sendEmail({ to, toName = "", subject, html, replyTo, logQueue = true }) {
  const cfg = await getEmailConfig();

  if (cfg.mock) {
    console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
    if (logQueue) {
      await query(
        `INSERT INTO email_queue (to_email, to_name, subject, body_html, status, error_message)
         VALUES ($1, $2, $3, $4, 'mocked', 'SMTP belum dikonfigurasi')`,
        [to, toName, subject, html]
      ).catch(() => {});
    }
    return { success: true, mock: true };
  }

  try {
    await sendViaSMTP(cfg, { to, subject, html, replyTo });
    if (logQueue) {
      await query(
        `INSERT INTO email_queue (to_email, to_name, subject, body_html, status, sent_at)
         VALUES ($1, $2, $3, $4, 'sent', NOW())`,
        [to, toName, subject, html]
      ).catch(() => {});
    }
    return { success: true, mock: false };
  } catch (err) {
    console.error(`[EMAIL] gagal mengirim ke ${to}:`, err.message);
    if (logQueue) {
      await query(
        `INSERT INTO email_queue (to_email, to_name, subject, body_html, status, error_message, attempts)
         VALUES ($1, $2, $3, $4, 'failed', $5, 1)`,
        [to, toName, subject, html, err.message]
      ).catch(() => {});
    }
    throw err;
  }
}

// ── Convenience wrappers ──────────────────────────────────────────────────────
export async function sendWelcomeEmail(email, fullname) {
  const { subject, html } = EmailTemplates.welcome(fullname);
  return sendEmail({ to: email, toName: fullname, subject, html });
}

export async function sendCertEmail(email, fullname, courseTitle, certId) {
  const { subject, html } = EmailTemplates.certIssued(fullname, courseTitle, certId);
  return sendEmail({ to: email, toName: fullname, subject, html });
}

export async function sendExamPassedEmail(email, fullname, courseTitle, score) {
  const { subject, html } = EmailTemplates.examPassed(fullname, courseTitle, score);
  return sendEmail({ to: email, toName: fullname, subject, html });
}

export async function sendEnrollmentEmail(email, fullname, courseTitle) {
  const { subject, html } = EmailTemplates.enrollment(fullname, courseTitle);
  return sendEmail({ to: email, toName: fullname, subject, html });
}

export async function sendLiveSessionEmail(email, fullname, sessionTitle, scheduledAt, meetLink) {
  const { subject, html } = EmailTemplates.liveSession(fullname, sessionTitle, scheduledAt, meetLink);
  return sendEmail({ to: email, toName: fullname, subject, html });
}

export async function sendPasswordResetEmail(email, fullname, resetUrl) {
  const { subject, html } = EmailTemplates.passwordReset(fullname, resetUrl);
  return sendEmail({ to: email, toName: fullname, subject, html });
}

// ── Email untuk instruktur ────────────────────────────────────────────────────
// Dipakai penyapu berkala. Isinya sengaja ringkas: satu tujuan per email, dan
// selalu menyebut apa yang harus dilakukan penerimanya.

/**
 * Pembungkus umum agar penyapu dapat mengirim isi yang disusunnya sendiri
 * tanpa menambah satu template per jenis pengingat.
 */
export async function sendInstructorEmail(email, fullname, judul, subject, isiHtml) {
  return sendEmail({
    to: email,
    toName: fullname,
    subject,
    html: baseTemplate(judul, `<p>Halo <strong>${fullname}</strong>,</p>${isiHtml}`),
  });
}
