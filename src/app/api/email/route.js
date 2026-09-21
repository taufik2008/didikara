/**
 * GET  /api/email?page=1&limit=20  — admin: riwayat email queue
 * POST /api/email  body: { to, toName, subject, html }  — kirim email manual
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { sendEmail, getEmailConfig, verifyEmailConnection } from "@/lib/email";

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page  = Math.max(1, parseInt(searchParams.get("page")  || "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
  const offset = (page - 1) * limit;
  const status = searchParams.get("status") || "";

  try {
    const where = status ? "WHERE status = $3" : "";
    const params = status ? [limit, offset, status] : [limit, offset];
    const { rows } = await query(
      `SELECT * FROM email_queue ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      params
    );
    const { rows: [{ count }] } = await query(
      `SELECT COUNT(*) FROM email_queue ${status ? "WHERE status = $1" : ""}`,
      status ? [status] : []
    );
    return NextResponse.json({ success: true, emails: rows, total: parseInt(count), page, limit });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json();

  // ── Uji konfigurasi ───────────────────────────────────────────────────────
  // Mengembalikan diagnosis apa adanya: dari mana konfigurasi dibaca, host yang
  // dipakai, dan pesan galat sebenarnya bila gagal — bukan sekadar "berhasil".
  if (body.action === "test") {
    const cfg  = await getEmailConfig();
    const cek  = await verifyEmailConnection();
    const tujuan = body.to || user.email;

    if (!cek.ok) {
      return NextResponse.json({
        success: false,
        mock: cek.mock === true,
        sumberKonfigurasi: cfg.sumber,
        host: cfg.host || null,
        port: cfg.port,
        from: cfg.from,
        error: cek.error,
        saran: cek.mock
          ? "Isi SMTP Host pada Pengaturan Platform, atau EMAIL_HOST di .env.local."
          : "Periksa host, port, nama pengguna, dan kata sandi. Untuk Gmail/Workspace gunakan App Password.",
      }, { status: 200 });
    }

    try {
      await sendEmail({
        to: tujuan,
        toName: user.fullname || "",
        subject: "Uji Konfigurasi Email AI LMS",
        html: `<p>Email percobaan ini dikirim dari Pengaturan Platform AI LMS.</p>
               <p>Bila Anda menerimanya, konfigurasi SMTP sudah benar.</p>
               <p style="color:#64748b;font-size:0.85rem">
                 Sumber konfigurasi: <strong>${cfg.sumber}</strong> ·
                 Host: ${cfg.host}:${cfg.port} ·
                 Pengirim: ${cfg.from}
                 ${cfg.replyTo ? ` · Reply-To: ${cfg.replyTo}` : ""}
               </p>`,
      });
      return NextResponse.json({
        success: true, mock: false, terkirimKe: tujuan,
        sumberKonfigurasi: cfg.sumber, host: cfg.host, port: cfg.port, from: cfg.from,
        replyTo: cfg.replyTo || null,
      });
    } catch (err) {
      return NextResponse.json({
        success: false, sumberKonfigurasi: cfg.sumber, host: cfg.host, error: err.message,
      }, { status: 200 });
    }
  }

  const { to, toName, subject, html } = body;
  if (!to || !subject || !html) {
    return NextResponse.json({ error: "to, subject, html wajib diisi" }, { status: 400 });
  }

  try {
    const result = await sendEmail({ to, toName, subject, html });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
