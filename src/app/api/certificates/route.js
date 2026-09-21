/**
 * GET /api/certificates          — list sertifikat user yang login
 * GET /api/certificates?id=xxx   — detail satu sertifikat
 * GET /api/certificates/verify?certId=xxx — verifikasi publik (no auth)
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const certId = searchParams.get("certId") || searchParams.get("id");

  // Public verify
  if (searchParams.get("certId")) {
    try {
      // Kolomnya `id` / `id_code`, bukan `cert_id`; JOIN ke users dibuat LEFT
      // agar sertifikat lama yang belum ter-backfill tetap dapat diverifikasi.
      const { rows: [cert] } = await query(
        `SELECT c.*, u.fullname, u.organization, co.title AS course_title
         FROM certificates c
         LEFT JOIN users u ON u.email = c.user_email
         LEFT JOIN courses co ON co.id = c.course_id
         WHERE c.id_code = $1 OR c.id = $1`,
        [certId]
      );
      if (!cert) return NextResponse.json({ valid: false, error: "Sertifikat tidak ditemukan" }, { status: 404 });
      return NextResponse.json({ valid: true, certificate: cert });
    } catch (err) {
      return NextResponse.json({ valid: false, error: err.message }, { status: 500 });
    }
  }

  // Auth required for list
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { rows } = await query(
      `SELECT c.*, co.title AS course_title
       FROM certificates c
       LEFT JOIN courses co ON co.id = c.course_id
       WHERE c.user_email = $1
       ORDER BY c.issued_at DESC NULLS LAST`,
      [user.email]
    );
    return NextResponse.json({ success: true, certificates: rows });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
