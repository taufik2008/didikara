/**
 * POST /api/payment/webhook
 * Webhook handler untuk notifikasi pembayaran otomatis dari payment gateway (Midtrans / Sandbox).
 * Route ini didaftarkan di publicPaths (src/proxy.js) dan diverifikasi melalui signature_key.
 */

import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyWebhookSignature, mapMidtransStatus, mapMayarStatus } from "@/lib/payment";
import { sendEnrollmentEmail } from "@/lib/email";
import { catatAudit } from "@/lib/audit";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    
    // Deteksi apakah notifikasi berasal dari Mayar atau Midtrans
    const isMayar = Boolean(
      body.event ||
      body.data?.transaction_id ||
      body.data?.transactionId ||
      body.data?.invoice_id ||
      request.headers.get("x-mayar-token")
    );

    let order = null;
    let newStatus = "pending";

    if (isMayar) {
      // ── ALUR WEBHOOK MAYAR ──
      const orderLookupId = body.data?.order_id
        || body.data?.extraData?.orderId
        || body.order_id
        || body.data?.id
        || body.data?.transaction_id
        || body.id;

      if (!orderLookupId) {
        return NextResponse.json({ error: "Mayar order identifier tidak ditemukan" }, { status: 400 });
      }

      // Verifikasi token Mayar jika MAYAR_WEBHOOK_TOKEN dikonfigurasi
      const mayarToken = request.headers.get("x-mayar-token") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
      if (process.env.MAYAR_WEBHOOK_TOKEN) {
        if (!mayarToken || mayarToken !== process.env.MAYAR_WEBHOOK_TOKEN) {
          console.warn(`[Mayar Webhook] Ditolak: token webhook tidak valid untuk order ${orderLookupId}`);
          return NextResponse.json({ error: "Invalid Mayar webhook token" }, { status: 403 });
        }
      }

      // Cari order berdasarkan id, invoice_number, atau ID invoice Mayar
      const { rows } = await query(
        `SELECT * FROM payment_orders
          WHERE id = $1
             OR invoice_number = $1
             OR metadata->>'mayar_invoice_id' = $1
             OR metadata->>'mayar_transaction_id' = $1`,
        [orderLookupId]
      );
      order = rows[0];

      if (!order) {
        console.warn(`[Mayar Webhook] Order tidak ditemukan: ${orderLookupId}`);
        return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
      }

      newStatus = mapMayarStatus(body.data?.status || body.status, body.event);
    } else {
      // ── ALUR WEBHOOK MIDTRANS ──
      const {
        order_id,
        status_code,
        gross_amount,
        signature_key,
        transaction_status,
        fraud_status,
      } = body;

      if (!order_id) {
        return NextResponse.json({ error: "order_id wajib" }, { status: 400 });
      }

      // 1. Verifikasi tanda tangan Midtrans
      const serverKey = process.env.MIDTRANS_SERVER_KEY;
      if (serverKey) {
        if (!signature_key) {
          console.warn(`[Webhook] Ditolak: signature_key tidak disertakan untuk order ${order_id}`);
          return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
        }
        const expectedSignature = verifyWebhookSignature(order_id, status_code, gross_amount, serverKey);
        if (signature_key !== expectedSignature) {
          console.warn(`[Webhook] Ditolak: signature_key tidak cocok untuk order ${order_id}`);
          return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
        }
      } else if (process.env.NODE_ENV === "production") {
        console.warn(`[Webhook] Ditolak: MIDTRANS_SERVER_KEY belum dikonfigurasi di produksi (order ${order_id})`);
        return NextResponse.json({ error: "Payment gateway belum terkonfigurasi" }, { status: 503 });
      }

      // 2. Cari order pembayaran di database
      const { rows: [foundOrder] } = await query(
        "SELECT * FROM payment_orders WHERE id = $1 OR invoice_number = $1",
        [order_id]
      );
      order = foundOrder;

      if (!order) {
        console.warn(`[Webhook] Order tidak ditemukan: ${order_id}`);
        return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
      }

      // 3. Tentukan status baru dari status Midtrans
      newStatus = transaction_status
        ? mapMidtransStatus(transaction_status, fraud_status)
        : (body.status === "paid" ? "paid" : "pending");
    }

    // Jangan downgrade order yang sudah berstatus 'paid'
    if (order.status === "paid" && newStatus !== "paid") {
      return NextResponse.json({ status: "ignored", message: "Order sudah lunas" });
    }

    // 4. Update status order pembayaran
    await query(
      `UPDATE payment_orders
       SET status = $1,
           paid_at = CASE WHEN $1 = 'paid' THEN NOW() ELSE paid_at END,
           metadata = metadata || $2::jsonb,
           updated_at = NOW()
       WHERE id = $3`,
      [
        newStatus,
        JSON.stringify({
          gateway_response: body,
          webhook_received_at: new Date().toISOString(),
        }),
        order.id,
      ]
    );

    // 5. Jika pembayaran berhasil (paid) → aktivasi pendaftaran kursus
    if (newStatus === "paid" && order.status !== "paid") {
      const isMembership = !order.course_id || order.course_id.startsWith("membership-") || Boolean(order.metadata?.is_membership);
      
      if (isMembership) {
        const { rows: allCourses } = await query("SELECT id FROM courses").catch(() => ({ rows: [] }));
        for (const c of allCourses) {
          await query(
            `INSERT INTO enrollments (user_email, course_id, status)
             VALUES ($1, $2, 'active')
             ON CONFLICT (user_email, course_id) DO UPDATE SET status = 'active'`,
            [order.user_email, c.id]
          ).catch(() => {});
        }
      } else if (order.course_id) {
        await query(
          `INSERT INTO enrollments (user_email, course_id, status)
           VALUES ($1, $2, 'active')
           ON CONFLICT (user_email, course_id) DO UPDATE SET status = 'active'`,
          [order.user_email, order.course_id]
        );
      }

      // Kirim email konfirmasi dan notifikasi in-app
      const { rows: [course] } = order.course_id
        ? await query("SELECT title FROM courses WHERE id = $1", [order.course_id]).catch(() => ({ rows: [{}] }))
        : { rows: [{}] };
      const courseTitle = course?.title || order.metadata?.course_title || "Paket All-Access Membership";
      const { rows: [userData] } = await query("SELECT fullname FROM users WHERE email = $1", [order.user_email]).catch(() => ({ rows: [{}] }));

      sendEnrollmentEmail(order.user_email, userData?.fullname || order.user_email, courseTitle).catch(() => {});

      await query(
        `INSERT INTO notifications (user_email, type, title, message)
         VALUES ($1, 'success', 'Pembayaran Terkonfirmasi Otomatis', $2)`,
        [order.user_email, `Pembayaran untuk "${courseTitle}" telah berhasil diverifikasi oleh sistem. Selamat belajar!`]
      ).catch(() => {});

      await catatAudit("system_webhook", "webhook_payment_paid", "payment_order", order.id, {
        amount: Number(order.amount) || 0,
        course_id: order.course_id,
        user_email: order.user_email,
        transaction_status,
      });
    }

    return NextResponse.json({ status: "ok", orderId: order.id, paymentStatus: newStatus });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
