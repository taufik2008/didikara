/**
 * GET  /api/support-tickets?status=open|pending|closed
 * GET  /api/support-tickets?id=12          → satu tiket beserta percakapannya
 * POST /api/support-tickets
 *        { action: "reply",  id, body }    → balas lewat email
 *        { action: "close",  id }          → tutup tiket
 *        { action: "reopen", id }          → buka kembali
 *        { action: "assign", id, to }      → tugaskan ke admin tertentu
 *
 * Tiket berasal dari email masuk (lihat /api/email/inbound). Balasan admin
 * dikirim kembali ke alamat pengirim dengan penanda [TKT-xxxxxx] pada subjek,
 * sehingga balasan berikutnya menyambung ke utas yang sama.
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { sendEmail, getEmailConfig } from "@/lib/email";
import { catatAudit } from "@/lib/audit";

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id     = searchParams.get("id");
  const status = searchParams.get("status") || "";

  try {
    if (id) {
      const { rows: [tiket] } = await query("SELECT * FROM support_tickets WHERE id = $1", [id]);
      if (!tiket) return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });

      const { rows: pesan } = await query(
        `SELECT * FROM support_ticket_messages WHERE ticket_id = $1 ORDER BY created_at ASC`,
        [id]
      );
      return NextResponse.json({ success: true, ticket: tiket, messages: pesan });
    }

    const page   = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;

    const { rows: [{ count: totalCount }] } = await query(`
      SELECT COUNT(*) AS count FROM support_tickets WHERE ($1 = '' OR status = $1)
    `, [status]);

    const { rows } = await query(`
      SELECT t.*,
             (SELECT COUNT(*) FROM support_ticket_messages m WHERE m.ticket_id = t.id) AS jumlah_pesan,
             (SELECT body FROM support_ticket_messages m
               WHERE m.ticket_id = t.id ORDER BY created_at DESC LIMIT 1) AS pesan_terakhir
        FROM support_tickets t
       WHERE ($1 = '' OR t.status = $1)
       ORDER BY t.last_message_at DESC
       LIMIT $2 OFFSET $3
    `, [status, limit, offset]);

    const { rows: [hitung] } = await query(`
      SELECT COUNT(*) FILTER (WHERE status = 'open')    AS terbuka,
             COUNT(*) FILTER (WHERE status = 'pending') AS menunggu,
             COUNT(*) FILTER (WHERE status = 'closed')  AS selesai
        FROM support_tickets
    `);

    return NextResponse.json({
      success: true,
      tickets: rows,
      ringkas: hitung,
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
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { action, id, body: isi, to } = await request.json();
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });

  try {
    const { rows: [tiket] } = await query("SELECT * FROM support_tickets WHERE id = $1", [id]);
    if (!tiket) return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });

    if (action === "reply") {
      if (!isi?.trim()) return NextResponse.json({ error: "Isi balasan wajib" }, { status: 400 });

      const cfg = await getEmailConfig();
      // Penanda pada subjek adalah tali yang menyambung balasan berikutnya ke
      // tiket ini — jangan dihapus.
      const subjek = tiket.subject.includes(tiket.ticket_no)
        ? `Re: ${tiket.subject}`
        : `Re: ${tiket.subject} [${tiket.ticket_no}]`;

      const html = `<p>${isi.replace(/\n/g, "<br>")}</p>
        <hr style="border:none;border-top:1px solid #2d3748;margin:20px 0">
        <p style="font-size:0.8rem;color:#64748b">
          Balas email ini untuk melanjutkan percakapan. Sertakan
          <strong>${tiket.ticket_no}</strong> pada subjek bila membuat email baru.
        </p>`;

      // Bila SMTP belum diatur, katakan terus terang — jangan mencatat balasan
      // yang sebenarnya tidak pernah berangkat.
      if (cfg.mock) {
        return NextResponse.json({
          error: "SMTP belum dikonfigurasi, balasan tidak dapat dikirim. Atur di Pengaturan Platform → Email.",
        }, { status: 409 });
      }

      await sendEmail({
        to: tiket.from_email,
        toName: tiket.from_name || "",
        subject: subjek,
        html,
      });

      await query(`
        INSERT INTO support_ticket_messages (ticket_id, direction, author_email, body)
        VALUES ($1, 'outbound', $2, $3)
      `, [id, user.email, isi]);

      await query(
        "UPDATE support_tickets SET status = 'pending', last_message_at = NOW() WHERE id = $1",
        [id]
      );

      await catatAudit(user.email, "reply_support_ticket", "support_ticket", tiket.ticket_no, {
        to: tiket.from_email,
      });

      return NextResponse.json({ success: true });
    }

    if (action === "close" || action === "reopen") {
      const status = action === "close" ? "closed" : "open";
      await query("UPDATE support_tickets SET status = $2 WHERE id = $1", [id, status]);
      await catatAudit(user.email, `${action}_support_ticket`, "support_ticket", tiket.ticket_no, {});
      return NextResponse.json({ success: true, status });
    }

    if (action === "assign") {
      await query("UPDATE support_tickets SET assigned_to = $2 WHERE id = $1", [id, to || ""]);
      await catatAudit(user.email, "assign_support_ticket", "support_ticket", tiket.ticket_no, { to });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "action tidak valid" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
