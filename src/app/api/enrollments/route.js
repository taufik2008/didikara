/**
 * GET /api/enrollments
 *   → { success, enrollments: [{ courseId, status, enrolledAt, title }] }
 *   Daftar kursus milik pengguna yang sedang login.
 *
 * GET /api/enrollments?userEmail=x   (admin) → milik pengguna lain
 *
 * Pendaftaran TIDAK dibuat lewat endpoint ini. Satu-satunya jalur resmi adalah
 * pembayaran: /api/payment (kursus gratis) atau /api/payment/confirm setelah
 * admin menyetujui transfer. Dengan begitu akses kelas tidak bisa diberikan
 * dari sisi klien.
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const diminta = searchParams.get("userEmail");
  const target = diminta && user.role === "admin" ? diminta : user.email;

  try {
    const { rows } = await query(
      `SELECT e.course_id, e.status, e.enrolled_at, c.title
         FROM enrollments e
         LEFT JOIN courses c ON c.id = e.course_id
        WHERE e.user_email = $1 AND e.status = 'active'
        ORDER BY e.enrolled_at DESC`,
      [target]
    );

    return NextResponse.json({
      success: true,
      enrollments: rows.map(r => ({
        courseId: r.course_id,
        status: r.status,
        enrolledAt: r.enrolled_at,
        title: r.title,
      })),
    });
  } catch (err) {
    console.error("GET /api/enrollments:", err.message);
    return NextResponse.json({ success: false, error: "Gagal memuat pendaftaran" }, { status: 500 });
  }
}
