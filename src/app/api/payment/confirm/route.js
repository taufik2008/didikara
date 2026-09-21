/**
 * POST /api/payment/confirm
 * Admin: konfirmasi atau tolak pembayaran manual.
 * Body: { orderId, action: "approve"|"reject", notes? }
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { sendEnrollmentEmail } from "@/lib/email";
import { catatAudit } from "@/lib/audit";

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { orderId, action, notes } = body;
  if (!orderId || !["approve","reject"].includes(action))
    return NextResponse.json({ error: "orderId dan action (approve/reject) wajib" }, { status: 400 });

  try {
    const { rows: [order] } = await query(
      "SELECT * FROM payment_orders WHERE id = $1", [orderId]
    );
    if (!order) return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });

    // Admin atau pemilik order yang menjalankan simulasi auto-settlement
    if (user.role !== "admin" && user.email !== order.user_email) {
      return NextResponse.json({ error: "Hanya admin atau pemilik order yang berwenang" }, { status: 403 });
    }

    const newStatus  = action === "approve" ? "paid" : "failed";
    const adminNotes = notes || "";

    // Update order
    await query(
      `UPDATE payment_orders
       SET status=$1, paid_at=$2,
           metadata = metadata || $3::jsonb,
           updated_at = NOW()
       WHERE id=$4`,
      [
        newStatus,
        action === "approve" ? new Date() : null,
        JSON.stringify({ admin_notes: adminNotes, confirmed_by: user.email }),
        orderId,
      ]
    );

    // Jika disetujui → enroll user
    if (action === "approve") {
      const isMembership = !order.course_id || (order.course_id && order.course_id.startsWith("membership-")) || Boolean(order.metadata?.is_membership);
      if (isMembership) {
        const { rows: allCourses } = await query("SELECT id FROM courses").catch(() => ({ rows: [] }));
        for (const c of allCourses) {
          await query(
            `INSERT INTO enrollments (user_email, course_id, status)
             VALUES ($1,$2,'active')
             ON CONFLICT (user_email, course_id) DO UPDATE SET status='active'`,
            [order.user_email, c.id]
          ).catch(() => {});
        }
      } else if (order.course_id) {
        await query(
          `INSERT INTO enrollments (user_email, course_id, status)
           VALUES ($1,$2,'active')
           ON CONFLICT (user_email, course_id) DO UPDATE SET status='active'`,
          [order.user_email, order.course_id]
        );
      }

      // Kirim email konfirmasi
      const { rows: [course] }   = order.course_id ? await query("SELECT title FROM courses WHERE id=$1", [order.course_id]).catch(()=>({rows:[{}]})) : { rows: [{}] };
      const courseTitle = course?.title || order.metadata?.course_title || "Paket All-Access Membership";
      const { rows: [userData] } = await query("SELECT fullname FROM users WHERE email=$1", [order.user_email]).catch(()=>({rows:[{}]}));
      sendEnrollmentEmail(order.user_email, userData?.fullname || order.user_email, courseTitle).catch(()=>{});

      // Notifikasi in-app
      await query(
        `INSERT INTO notifications (user_email, type, title, message)
         VALUES ($1,'success','Pembayaran Dikonfirmasi',$2)`,
        [order.user_email, `Pembayaran untuk "${course?.title || 'Paket All-Access Membership'}" telah dikonfirmasi. Selamat belajar!`]
      ).catch(()=>{});
    } else if (action === "reject") {
      await query(
        `INSERT INTO notifications (user_email, type, title, message)
         VALUES ($1,'warning','Pembayaran Ditolak',$2)`,
        [order.user_email, `Pembayaran Anda untuk kursus tidak dapat dikonfirmasi. ${adminNotes ? "Alasan: " + adminNotes : "Silakan hubungi admin."}`]
      ).catch(()=>{});
    }

    // Persetujuan pembayaran adalah tindakan bernilai uang tertinggi di
    // platform; sampai sekarang ia tidak meninggalkan jejak apa pun.
    await catatAudit(user.email, action === "approve" ? "approve_payment" : "reject_payment",
      "payment_order", orderId, {
        amount: Number(order.amount) || 0,
        course_id: order.course_id,
        user_email: order.user_email,
        invoice: order.invoice_number,
        notes: adminNotes,
      });

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
