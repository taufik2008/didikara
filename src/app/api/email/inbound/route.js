/**
 * POST /api/email/inbound
 *
 * Titik masuk email balasan. Penyedia inbound (Mailgun Routes, SendGrid Inbound
 * Parse, Postmark, atau apa pun yang bisa mem-POST) mengirim isi email ke sini,
 * lalu ia menjadi tiket dukungan yang dapat dijawab dari Modul Admin.
 *
 * Route ini terdaftar sebagai jalur publik di src/proxy.js — penyedia tidak
 * membawa cookie sesi. Penjagaannya ada di bawah:
 *   1. Rahasia bersama lewat header `x-inbound-secret` atau query `?secret=`
 *      (env INBOUND_EMAIL_SECRET). Wajib — tanpa env itu, route menolak semua.
 *   2. Bila MAILGUN_SIGNING_KEY diisi, tanda tangan HMAC Mailgun ikut diperiksa.
 *
 * Batas yang perlu disadari: pengirim email dapat dipalsukan. Tiket hanya
 * ditautkan ke akun pengguna bila alamatnya cocok — itu petunjuk, bukan bukti
 * identitas. Jangan pakai jalur ini untuk tindakan yang mengubah data akun.
 */
import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { query } from "@/lib/db";

/** Ambil nilai dari payload apa pun bentuknya (form-encoded atau JSON). */
function ambil(data, ...kunci) {
  for (const k of kunci) {
    const v = data[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/** "Budi <budi@x.id>" → { nama, email } */
function uraikanPengirim(teks) {
  const m = String(teks).match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (m) return { nama: m[1].trim(), email: m[2].trim().toLowerCase() };
  return { nama: "", email: String(teks).trim().toLowerCase() };
}

function verifikasiMailgun(data) {
  const kunci = process.env.MAILGUN_SIGNING_KEY;
  if (!kunci) return true;                       // tidak dipakai
  const { timestamp, token, signature } = data;
  if (!timestamp || !token || !signature) return false;
  const hitung = createHmac("sha256", kunci).update(timestamp + token).digest("hex");
  return hitung === signature;
}

export async function POST(request) {
  const rahasia = process.env.INBOUND_EMAIL_SECRET;
  const { searchParams } = new URL(request.url);
  const dikirim = request.headers.get("x-inbound-secret") || searchParams.get("secret") || "";

  if (!rahasia || dikirim !== rahasia) {
    // Tanpa rahasia yang cocok, endpoint ini akan menjadi pintu bagi siapa pun
    // untuk membuat tiket palsu atas nama orang lain.
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // ── Baca payload dalam bentuk apa pun ────────────────────────────────────
  let data = {};
  const tipe = request.headers.get("content-type") || "";
  try {
    if (tipe.includes("application/json")) {
      data = await request.json();
    } else {
      const form = await request.formData();
      for (const [k, v] of form.entries()) data[k] = typeof v === "string" ? v : "";
    }
  } catch {
    return NextResponse.json({ success: false, error: "Payload tidak dapat dibaca" }, { status: 400 });
  }

  if (!verifikasiMailgun(data)) {
    return NextResponse.json({ success: false, error: "Tanda tangan tidak sah" }, { status: 401 });
  }

  const pengirimMentah = ambil(data, "sender", "from", "From", "envelope_from");
  const subjek  = ambil(data, "subject", "Subject") || "(tanpa subjek)";
  const isi     = ambil(data, "stripped-text", "body-plain", "text", "plain", "TextBody", "html")
                  || "(isi email kosong)";
  const messageId = ambil(data, "Message-Id", "message-id", "MessageID", "message_id");

  const { nama, email } = uraikanPengirim(pengirimMentah);
  if (!email || !email.includes("@")) {
    return NextResponse.json({ success: false, error: "Alamat pengirim tidak terbaca" }, { status: 400 });
  }

  try {
    // Kiriman ganda dari penyedia ditolak diam-diam — jawaban tetap 200 supaya
    // penyedia tidak menganggapnya gagal lalu mencoba lagi.
    if (messageId) {
      const { rows: [ada] } = await query(
        "SELECT 1 AS ada FROM support_ticket_messages WHERE message_id = $1", [messageId]
      );
      if (ada) return NextResponse.json({ success: true, duplikat: true });
    }

    // ── Cari tiket yang sudah ada ──────────────────────────────────────────
    // Penanda [TKT-000123] disisipkan pada subjek setiap balasan admin, jadi
    // balasan berikutnya menyambung ke utas yang sama.
    let tiket = null;
    const penanda = subjek.match(/\[TKT-(\d{4,})\]/i);
    if (penanda) {
      const { rows: [t] } = await query(
        "SELECT * FROM support_tickets WHERE ticket_no = $1", [`TKT-${penanda[1]}`]
      );
      tiket = t || null;
    }
    if (!tiket) {
      // Tanpa penanda: sambungkan ke tiket terbuka terakhir dari alamat yang
      // sama dalam 30 hari, supaya percakapan tidak terpecah-pecah.
      const { rows: [t] } = await query(`
        SELECT * FROM support_tickets
         WHERE from_email = $1 AND status <> 'closed'
           AND last_message_at > NOW() - INTERVAL '30 days'
         ORDER BY last_message_at DESC LIMIT 1
      `, [email]);
      tiket = t || null;
    }

    // ── Buat tiket baru bila belum ada ─────────────────────────────────────
    if (!tiket) {
      const { rows: [akun] } = await query(
        "SELECT email FROM users WHERE LOWER(email) = $1 AND deleted_at IS NULL", [email]
      ).catch(() => ({ rows: [] }));

      const { rows: [baru] } = await query(`
        INSERT INTO support_tickets (from_email, from_name, user_email, subject, last_message_at)
        VALUES ($1,$2,$3,$4,NOW())
        RETURNING *
      `, [email, nama, akun?.email || null, subjek.slice(0, 500)]);

      const { rows: [dengannomor] } = await query(
        `UPDATE support_tickets SET ticket_no = 'TKT-' || LPAD(id::text, 6, '0')
          WHERE id = $1 RETURNING *`,
        [baru.id]
      );
      tiket = dengannomor;

      // Admin diberi tahu; tanpa ini tiket menumpuk tanpa ada yang tahu.
      await query(
        `INSERT INTO notifications (user_email, type, title, message, link)
         SELECT email, 'info', 'Tiket Dukungan Baru', $1, '/admin'
           FROM users WHERE role = 'admin' AND deleted_at IS NULL`,
        [`${tiket.ticket_no} dari ${email}: ${subjek.slice(0, 80)}`]
      ).catch(() => {});
    } else {
      await query(
        "UPDATE support_tickets SET status = 'open', last_message_at = NOW() WHERE id = $1",
        [tiket.id]
      );
    }

    await query(`
      INSERT INTO support_ticket_messages (ticket_id, direction, author_email, body, message_id)
      VALUES ($1, 'inbound', $2, $3, $4)
      ON CONFLICT DO NOTHING
    `, [tiket.id, email, isi.slice(0, 20000), messageId]);

    return NextResponse.json({ success: true, ticket: tiket.ticket_no });
  } catch (err) {
    console.error("POST /api/email/inbound:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
