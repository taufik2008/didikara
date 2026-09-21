/**
 * POST /api/payment         — buat order manual transfer
 * GET  /api/payment         — riwayat order (user: milik sendiri, admin: semua)
 * GET  /api/payment?orderId — detail order
 * PATCH /api/payment        — user upload bukti transfer
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { generateInvoiceNumber } from "@/lib/payment";
import { generateUniqueCode, getPaymentConfig } from "@/lib/bankConfig";
import { sendEnrollmentEmail } from "@/lib/email";
import { catatAudit } from "@/lib/audit";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (orderId) {
    const { rows: [order] } = await query(
      `SELECT po.*, COALESCE(c.title, (po.metadata->>'course_title'), 'Membership All-Access') AS course_title FROM payment_orders po
       LEFT JOIN courses c ON c.id = po.course_id
       WHERE po.id = $1 AND (po.user_email = $2 OR $3 = 'admin')`,
      [orderId, user.email, user.role]
    ).catch(() => ({ rows: [] }));
    if (!order) return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ success: true, order });
  }

  // Admin: semua order; user biasa: milik sendiri
  const isAdmin = user.role === "admin";
  const { rows } = await query(
    isAdmin
      ? `SELECT po.*, COALESCE(c.title, (po.metadata->>'course_title'), 'Membership All-Access') AS course_title FROM payment_orders po
         LEFT JOIN courses c ON c.id = po.course_id
         ORDER BY po.created_at DESC LIMIT 100`
      : `SELECT po.*, COALESCE(c.title, (po.metadata->>'course_title'), 'Membership All-Access') AS course_title FROM payment_orders po
         LEFT JOIN courses c ON c.id = po.course_id
         WHERE po.user_email = $1 ORDER BY po.created_at DESC LIMIT 20`,
    isAdmin ? [] : [user.email]
  ).catch(() => ({ rows: [] }));

  const cfg = await getPaymentConfig();
  return NextResponse.json({
    success: true,
    orders: rows,
    bankAccounts: cfg.bankAccounts,
    qrisUrl: cfg.qrisImageUrl,
  });
}

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
  }

  const { courseId, promoCode, batch } = body;
  if (!courseId) return NextResponse.json({ error: "courseId wajib" }, { status: 400 });

  try {
    // Ambil info kursus atau paket membership sintetis
    let course;
    if (courseId.startsWith("membership-")) {
      const isAnnual = courseId.includes("annual") || courseId.includes("tahunan");
      course = {
        id: courseId,
        title: isAnnual ? "Membership All-Access (Akses Penuh 1 Tahun)" : "Membership All-Access (Akses Penuh 1 Bulan)",
        price: isAnnual ? 2400000 : 250000,
      };
    } else {
      const { rows: [c] } = await query("SELECT id, title, price FROM courses WHERE id = $1", [courseId]);
      if (!c) return NextResponse.json({ error: "Kursus tidak ditemukan" }, { status: 404 });
      course = c;
    }

    const baseAmount = Number(course.price) || 0;

    // Hitung diskon jika ada promo code
    let discount = 0;
    let validPromo = null;
    if (promoCode) {
      const codeUpper = promoCode.trim().toUpperCase();
      if (codeUpper === "DISKON50") {
        discount = Math.round(baseAmount * 0.5);
        validPromo = { code: codeUpper, desc: "Diskon 50%" };
      } else if (codeUpper === "EARLYBIRD") {
        discount = Math.round(baseAmount * 0.25);
        validPromo = { code: codeUpper, desc: "Diskon Early Bird 25%" };
      } else if (codeUpper === "SUPERHEMAT" || codeUpper.startsWith("XP50K")) {
        discount = Math.min(baseAmount, 50000);
        validPromo = { code: codeUpper, desc: "Potongan Rp 50.000" };
      } else if (codeUpper.startsWith("XP25K") || codeUpper === "DISKON25K") {
        discount = Math.min(baseAmount, 25000);
        validPromo = { code: codeUpper, desc: "Potongan Rp 25.000" };
      } else if (codeUpper.startsWith("XP100K")) {
        discount = Math.min(baseAmount, 100000);
        validPromo = { code: codeUpper, desc: "Potongan Rp 100.000" };
      } else if (codeUpper === "GRATIS100") {
        discount = baseAmount;
        validPromo = { code: codeUpper, desc: "Beasiswa 100%" };
      } else if (codeUpper.startsWith("REF-") || codeUpper.startsWith("AFILIASI")) {
        discount = Math.round(baseAmount * 0.1);
        validPromo = { code: codeUpper, desc: "Diskon Referral 10%" };
      }
    }

    const discountedBaseAmount = Math.max(0, baseAmount - discount);

    // Kursus gratis atau promo 100% — langsung enroll
    if (discountedBaseAmount === 0) {
      if (courseId.startsWith("membership-")) {
        const { rows: allCourses } = await query("SELECT id FROM courses").catch(() => ({ rows: [] }));
        for (const c of allCourses) {
          await query(
            `INSERT INTO enrollments (user_email, course_id, status) VALUES ($1,$2,'active')
             ON CONFLICT (user_email, course_id) DO UPDATE SET status='active'`,
            [user.email, c.id]
          ).catch(() => {});
        }
      } else {
        await query(
          `INSERT INTO enrollments (user_email, course_id, status) VALUES ($1,$2,'active')
           ON CONFLICT (user_email, course_id) DO UPDATE SET status='active'`,
          [user.email, courseId]
        );
      }
      sendEnrollmentEmail(user.email, user.fullname || user.email, course.title).catch(() => {});
      return NextResponse.json({ success: true, free: true, promoApplied: validPromo });
    }

    // Generate kode unik 3 digit
    const cfg         = await getPaymentConfig();
    const uniqueCode  = generateUniqueCode();
    const totalAmount = discountedBaseAmount + uniqueCode;
    const invoiceNumber = generateInvoiceNumber();
    const orderId     = `ORD-${Date.now()}-${user.email.split("@")[0].toUpperCase()}`;
    const expiredAt   = new Date(Date.now() + cfg.expiryHours * 60 * 60 * 1000);

    const isMembership = courseId.startsWith("membership-");
    const dbCourseId = isMembership ? null : courseId;

    await query(
      `INSERT INTO payment_orders
         (id, user_email, course_id, amount, status, invoice_number, expired_at, metadata)
       VALUES ($1,$2,$3,$4,'pending',$5,$6,$7)`,
      [
        orderId, user.email, dbCourseId, totalAmount, invoiceNumber, expiredAt,
        JSON.stringify({
          base_amount: baseAmount,
          discount_amount: discount,
          promo_code: validPromo ? validPromo.code : null,
          batch: batch || "Batch Terdekat",
          unique_code: uniqueCode,
          course_title: course.title,
          is_membership: isMembership,
          membership_type: isMembership ? courseId : null,
          payment_type: "manual_transfer",
        }),
      ]
    );

    return NextResponse.json({
      success: true,
      orderId, invoiceNumber, baseAmount, uniqueCode, totalAmount, expiredAt,
      bankAccounts:        cfg.bankAccounts,
      qrisUrl:             cfg.qrisImageUrl,
      paymentInstructions: cfg.paymentInstructions,
      adminWhatsapp:       cfg.adminWhatsapp,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// User upload bukti transfer
export async function PATCH(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId, proofImage, senderBank, senderName, transferDate, referenceNo } = await request.json();
  if (!orderId) return NextResponse.json({ error: "orderId wajib" }, { status: 400 });

  try {
    const { rows: [order] } = await query(
      "SELECT * FROM payment_orders WHERE id=$1 AND user_email=$2", [orderId, user.email]
    );
    if (!order) return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    if (order.status !== "pending")
      return NextResponse.json({ error: "Order sudah diproses" }, { status: 409 });

    await query(
      `UPDATE payment_orders
       SET status='waiting_confirmation',
           payment_method=$1,
           metadata = metadata || $2::jsonb,
           updated_at = NOW()
       WHERE id=$3`,
      [
        senderBank || "transfer",
        JSON.stringify({
          proof_image:   proofImage || null,
          sender_bank:   senderBank || "",
          sender_name:   senderName || "",
          transfer_date: transferDate || "",
          reference_no:  referenceNo || "",
          submitted_at:  new Date().toISOString(),
        }),
        orderId,
      ]
    );

    // Notifikasi ke admin
    await query(
      `INSERT INTO notifications (user_email, type, title, message)
       SELECT email, 'info', 'Bukti Transfer Baru', $1
       FROM users WHERE role='admin' LIMIT 5`,
      [`${user.fullname || user.email} mengirim bukti transfer untuk order ${orderId}. Segera konfirmasi.`]
    ).catch(() => {});

    return NextResponse.json({ success: true, message: "Bukti diterima. Menunggu konfirmasi admin." });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/payment?orderId=ORD-...
 * Peserta membatalkan ordernya sendiri selama masih menunggu pembayaran.
 * Tanpa ini, satu order yang telanjur dibuat memblokir pembelian ulang kursus
 * yang sama sampai kedaluwarsa — dan sebelum penyapu ada, selamanya.
 */
export async function DELETE(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId wajib" }, { status: 400 });

  try {
    const { rows: [order] } = await query("SELECT * FROM payment_orders WHERE id = $1", [orderId]);
    if (!order) return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });

    const pemilik = order.user_email === user.email;
    if (!pemilik && user.role !== "admin") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }
    if (!["pending", "waiting_confirmation"].includes(order.status)) {
      return NextResponse.json(
        { error: `Order berstatus "${order.status}" tidak dapat dibatalkan` }, { status: 409 }
      );
    }

    await query(
      "UPDATE payment_orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1",
      [orderId]
    );
    await catatAudit(user.email, "cancel_payment_order", "payment_order", orderId, {
      amount: Number(order.amount) || 0, course_id: order.course_id, oleh_pemilik: pemilik,
    });

    return NextResponse.json({ success: true, message: "Order dibatalkan." });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
