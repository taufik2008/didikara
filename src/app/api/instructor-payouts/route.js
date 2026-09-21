/**
 * GET  /api/instructor-payouts?status=&from=&to=
 *        Admin  → semua rekap; instruktur → miliknya sendiri.
 * POST /api/instructor-payouts
 *        { action: "generate", periodStart, periodEnd }  → hitung rekap periode (admin)
 *        { action: "mark_paid", id, reference, notes }   → catat pembayaran (admin)
 *        { action: "reopen", id }                        → batalkan penandaan bayar (admin)
 *
 * Dasar perhitungan: order berstatus `paid` pada kursus yang diampu instruktur,
 * dengan tanggal bayar di dalam periode. Persentase diambil dari profil
 * instruktur saat rekap dibuat, lalu DISIMPAN di baris payout — supaya
 * perubahan persentase di kemudian hari tidak mengubah rekap yang sudah jadi.
 *
 * Satu catatan yang perlu disepakati sebelum dipakai untuk membayar: bila satu
 * kursus diampu lebih dari satu instruktur, masing-masing menerima porsi penuh
 * sesuai persentasenya (bukan dibagi rata). Sesuaikan persentase per orang bila
 * kursus memang diampu bersama.
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { catatAudit } from "@/lib/audit";

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const from   = searchParams.get("from") || "";
  const to     = searchParams.get("to") || "";
  const isAdmin = user.role === "admin";

  try {
    const params = [isAdmin, user.email];
    let filter = "($1::boolean = TRUE OR p.user_email = $2)";
    if (status) { params.push(status); filter += ` AND p.status = $${params.length}`; }
    if (from)   { params.push(from);   filter += ` AND p.period_start >= $${params.length}`; }
    if (to)     { params.push(to);     filter += ` AND p.period_end <= $${params.length}`; }

    const { rows } = await query(`
      SELECT p.*, u.fullname, u.organization
        FROM instructor_payouts p
        LEFT JOIN users u ON u.email = p.user_email
       WHERE ${filter}
       ORDER BY p.period_start DESC, u.fullname
    `, params);

    const ringkas = {
      total_payout: rows.reduce((a, r) => a + Number(r.payout_amount || 0), 0),
      belum_dibayar: rows.filter(r => r.status === "unpaid")
                         .reduce((a, r) => a + Number(r.payout_amount || 0), 0),
      jumlah_baris: rows.length,
    };

    return NextResponse.json({ success: true, payouts: rows, ringkas });
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
  const { action } = body;

  // ── Hitung rekap satu periode ─────────────────────────────────────────────
  if (action === "generate") {
    const { periodStart, periodEnd } = body;
    if (!periodStart || !periodEnd) {
      return NextResponse.json({ error: "periodStart dan periodEnd wajib" }, { status: 400 });
    }

    try {
      const { rows: hitung } = await query(`
        SELECT
          ci.user_email,
          COALESCE(pr.revenue_share_pct, 30)              AS share_pct,
          COALESCE(SUM(po.amount), 0)                     AS gross_amount,
          COUNT(po.id)                                    AS order_count
        FROM course_instructors ci
        JOIN instructor_profiles pr ON pr.user_email = ci.user_email AND pr.active
        LEFT JOIN payment_orders po
               ON po.course_id = ci.course_id
              AND po.status = 'paid'
              AND COALESCE(po.paid_at, po.created_at) >= $1
              AND COALESCE(po.paid_at, po.created_at) <  $2::date + 1
        GROUP BY ci.user_email, pr.revenue_share_pct
      `, [periodStart, periodEnd]);

      let dibuat = 0;
      for (const baris of hitung) {
        const bruto = Number(baris.gross_amount) || 0;
        const pct   = Number(baris.share_pct) || 0;
        const nilai = Math.round(bruto * pct / 100);

        // Baris yang sudah ditandai dibayar tidak ditimpa — angka pembayaran
        // yang sudah dieksekusi keuangan tidak boleh berubah diam-diam.
        await query(`
          INSERT INTO instructor_payouts
            (user_email, period_start, period_end, gross_amount, share_pct, payout_amount, order_count)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          ON CONFLICT (user_email, period_start, period_end) DO UPDATE SET
            gross_amount  = EXCLUDED.gross_amount,
            share_pct     = EXCLUDED.share_pct,
            payout_amount = EXCLUDED.payout_amount,
            order_count   = EXCLUDED.order_count
          WHERE instructor_payouts.status = 'unpaid'
        `, [baris.user_email, periodStart, periodEnd, bruto, pct, nilai, Number(baris.order_count) || 0]);
        dibuat++;
      }

      await catatAudit(user.email, "generate_instructor_payouts", "instructor_payout",
        `${periodStart}..${periodEnd}`, { baris: dibuat });

      return NextResponse.json({ success: true, dihitung: dibuat, periodStart, periodEnd });
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // ── Catat pembayaran ──────────────────────────────────────────────────────
  if (action === "mark_paid") {
    const { id, reference, notes } = body;
    if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });

    try {
      const { rows: [baris] } = await query(`
        UPDATE instructor_payouts
           SET status = 'paid', paid_at = NOW(), paid_by = $2,
               reference = COALESCE($3, reference), notes = COALESCE($4, notes)
         WHERE id = $1 AND status = 'unpaid'
         RETURNING *
      `, [id, user.email, reference || "", notes || ""]);

      if (!baris) {
        return NextResponse.json({ error: "Baris tidak ditemukan atau sudah dibayar" }, { status: 409 });
      }

      await query(
        `INSERT INTO notifications (user_email, type, title, message, link)
         VALUES ($1, 'success', 'Bagi Hasil Dibayarkan', $2, '/dashboard')`,
        [baris.user_email,
         `Bagi hasil periode ${baris.period_start.toISOString?.().slice(0,10) || baris.period_start} — ${baris.period_end.toISOString?.().slice(0,10) || baris.period_end} sebesar Rp ${Number(baris.payout_amount).toLocaleString("id-ID")} telah dibayarkan.`]
      ).catch(() => {});

      await catatAudit(user.email, "pay_instructor_payout", "instructor_payout", id, {
        user_email: baris.user_email,
        payout_amount: Number(baris.payout_amount),
        reference: reference || "",
      });

      return NextResponse.json({ success: true, payout: baris });
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // ── Buka kembali baris yang keliru ditandai bayar ─────────────────────────
  if (action === "reopen") {
    const { id, reason } = body;
    if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
    try {
      await query(
        `UPDATE instructor_payouts
            SET status = 'unpaid', paid_at = NULL, paid_by = '',
                notes = TRIM(COALESCE(notes,'') || ' | dibuka kembali: ' || COALESCE($2,''))
          WHERE id = $1`,
        [id, reason || ""]
      );
      await catatAudit(user.email, "reopen_instructor_payout", "instructor_payout", id, { reason: reason || "" });
      return NextResponse.json({ success: true });
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "action tidak valid" }, { status: 400 });
}
