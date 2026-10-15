/**
 * GET /api/payment/invoice?orderId=ORD-...
 *
 * Invoice PDF untuk satu order. Nomor invoice sudah dibuat sejak order lahir,
 * tetapi dokumennya tidak pernah ada — padahal inilah lampiran pertama yang
 * diminta bagian keuangan instansi saat mencairkan pembayaran.
 *
 * Hanya pemilik order atau admin yang boleh mengunduh.
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { getPaymentConfig } from "@/lib/bankConfig";
import PDFDocument from "pdfkit";

const rupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId wajib" }, { status: 400 });

  let order, cfg;
  try {
    const { rows: [baris] } = await query(`
      SELECT po.*, COALESCE(c.title, (po.metadata->>'course_title'), 'Membership All-Access') AS course_title, u.fullname, u.organization
        FROM payment_orders po
        LEFT JOIN courses c ON c.id = po.course_id
        LEFT JOIN users   u ON u.email = po.user_email
       WHERE po.id = $1
    `, [orderId]);
    if (!baris) return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });

    if (user.role !== "admin" && baris.user_email !== user.email) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    order = baris;
    cfg = await getPaymentConfig();
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }

  const meta = typeof order.metadata === "string" ? JSON.parse(order.metadata) : (order.metadata || {});
  const hargaDasar = Number(meta.base_amount) || Number(order.amount) || 0;
  const kodeUnik   = Number(meta.unique_code) || 0;

  const chunks = [];
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.on("data", (c) => chunks.push(c));

  const selesai = new Promise((resolve) => doc.on("end", resolve));

  // ── Kop ────────────────────────────────────────────────────────────────
  doc.font("Helvetica-Bold").fontSize(20).fillColor("#1e3a8a")
     .text(cfg.platformName || "DIDIKARA", 50, 50);
  doc.font("Helvetica").fontSize(9).fillColor("#475569")
     .text("Platform Pelatihan & Sertifikasi Kompetensi", 50, 74);

  doc.font("Helvetica-Bold").fontSize(18).fillColor("#0f172a")
     .text("INVOICE", 400, 50, { width: 145, align: "right" });
  doc.font("Helvetica").fontSize(9).fillColor("#475569")
     .text(order.invoice_number || order.id, 400, 74, { width: 145, align: "right" });

  doc.moveTo(50, 100).lineTo(545, 100).strokeColor("#cbd5e1").lineWidth(1).stroke();

  // ── Identitas ──────────────────────────────────────────────────────────
  const status = {
    paid: "LUNAS", pending: "MENUNGGU PEMBAYARAN",
    waiting_confirmation: "MENUNGGU KONFIRMASI", failed: "DITOLAK",
    expired: "KEDALUWARSA", cancelled: "DIBATALKAN",
    refunded: "DIKEMBALIKAN (REFUND)",
  }[order.status] || String(order.status || "").toUpperCase();

  doc.fontSize(9).fillColor("#64748b").text("Ditagihkan kepada", 50, 120);
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f172a")
     .text(order.fullname || order.user_email, 50, 134);
  doc.font("Helvetica").fontSize(9).fillColor("#475569")
     .text(order.user_email, 50, 150)
     .text(order.organization || "-", 50, 163);

  doc.fontSize(9).fillColor("#64748b").text("Status", 400, 120, { width: 145, align: "right" });
  doc.font("Helvetica-Bold").fontSize(11)
     .fillColor(order.status === "paid" ? "#047857" : "#b45309")
     .text(status, 400, 134, { width: 145, align: "right" });
  doc.font("Helvetica").fontSize(9).fillColor("#475569")
     .text(`Tanggal: ${new Date(order.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`,
           400, 152, { width: 145, align: "right" });
  if (order.paid_at) {
    doc.text(`Dibayar: ${new Date(order.paid_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`,
             400, 165, { width: 145, align: "right" });
  }

  // ── Rincian ────────────────────────────────────────────────────────────
  let y = 205;
  doc.rect(50, y, 495, 24).fill("#f1f5f9");
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a")
     .text("Deskripsi", 60, y + 8)
     .text("Jumlah", 400, y + 8, { width: 135, align: "right" });

  y += 34;
  doc.font("Helvetica").fontSize(10).fillColor("#1e293b")
     .text(order.course_title || order.course_id || "Program pelatihan", 60, y, { width: 320 })
     .text(rupiah(hargaDasar), 400, y, { width: 135, align: "right" });

  if (kodeUnik > 0) {
    y += 20;
    doc.fontSize(9).fillColor("#475569")
       .text("Kode unik verifikasi transfer", 60, y, { width: 320 })
       .text(rupiah(kodeUnik), 400, y, { width: 135, align: "right" });
  }

  y += 30;
  doc.moveTo(50, y).lineTo(545, y).strokeColor("#cbd5e1").lineWidth(1).stroke();
  y += 12;
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#0f172a")
     .text("Total", 60, y)
     .text(rupiah(order.amount), 400, y, { width: 135, align: "right" });

  // ── Instruksi pembayaran (hanya bila belum lunas) ───────────────────────
  if (order.status !== "paid") {
    y += 40;
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a").text("Pembayaran", 50, y);
    y += 16;
    doc.font("Helvetica").fontSize(9).fillColor("#475569")
       .text(cfg.paymentInstructions || "Transfer nominal TEPAT termasuk kode unik.", 50, y, { width: 495 });
    y += 26;
    for (const b of cfg.bankAccounts || []) {
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#1e293b")
         .text(`${b.bank} — ${b.account}`, 50, y);
      doc.font("Helvetica").fontSize(8).fillColor("#64748b")
         .text(`a.n. ${b.holder}`, 50, y + 12);
      y += 30;
    }
    if (order.expired_at) {
      doc.font("Helvetica").fontSize(8).fillColor("#b45309")
         .text(`Batas pembayaran: ${new Date(order.expired_at).toLocaleString("id-ID")}`, 50, y);
    }
  }

  doc.font("Helvetica").fontSize(7).fillColor("#94a3b8")
     .text("Dokumen ini dibuat otomatis oleh sistem dan sah tanpa tanda tangan basah.",
           50, 780, { width: 495, align: "center" });

  doc.end();
  await selesai;

  const pdf = Buffer.concat(chunks);
  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Invoice-${order.invoice_number || order.id}.pdf"`,
      "Content-Length": String(pdf.length),
    },
  });
}
