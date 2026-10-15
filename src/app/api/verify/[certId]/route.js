/**
 * GET /api/verify/[certId]
 * Endpoint publik — tidak memerlukan autentikasi.
 * Mengembalikan data sertifikat jika ID valid.
 */

import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request, { params }) {
  const { certId } = await params;

  if (!certId) {
    return NextResponse.json({ success: false, error: "ID sertifikat tidak valid" }, { status: 400 });
  }

  try {
    // Nama pemegang diambil dari kolom pemilik sertifikat. Kueri sebelumnya
    // menautkan ke peserta PERTAMA yang lulus kursus tersebut, sehingga halaman
    // verifikasi publik dapat menampilkan nama orang lain pada kursus dengan
    // banyak lulusan — persis hal yang membuat verifikasi kehilangan gunanya.
    const result = await query(
      `SELECT c.id, c.course_id, c.title, c.date, c.id_code, c.valid_until,
              u.fullname, u.organization
       FROM certificates c
       LEFT JOIN users u ON u.email = c.user_email
       WHERE c.id_code = $1 OR c.id = $1`,
      [certId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, valid: false, error: "Sertifikat tidak ditemukan" }, { status: 404 });
    }

    const cert = result.rows[0];
    
    // Hitung masa berlaku sertifikat (Standar 3 Tahun untuk Sertifikasi Profesi / BNSP)
    const issueDate = cert.date ? new Date(cert.date) : new Date();
    let validUntil;
    if (cert.valid_until) {
      validUntil = new Date(cert.valid_until);
    } else {
      validUntil = new Date(issueDate);
      validUntil.setFullYear(validUntil.getFullYear() + 3);
    }

    const now = new Date();
    const diffMs = validUntil.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let status = "ACTIVE";
    let statusLabel = "Aktif & Sah";
    if (daysRemaining <= 0) {
      status = "EXPIRED";
      statusLabel = "Kedaluwarsa (Perlu Resertifikasi)";
    } else if (daysRemaining <= 90) {
      status = "EXPIRING_SOON";
      statusLabel = `Segera Berakhir (${daysRemaining} Hari Lagi)`;
    }

    return NextResponse.json({
      success: true,
      valid: status !== "EXPIRED",
      certificate: {
        id: cert.id,
        courseId: cert.course_id,
        title: cert.title,
        date: cert.date || issueDate.toLocaleDateString("id-ID"),
        validUntil: validUntil.toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" }),
        validUntilIso: validUntil.toISOString(),
        validityYears: 3,
        daysRemaining: Math.max(0, daysRemaining),
        status,
        statusLabel,
        idCode: cert.id_code,
        recipientName: cert.fullname || "Peserta Terdaftar",
        organization: cert.organization || "Mandiri",
        issuer: "PT. SDI & Lembaga Sertifikasi Kompetensi",
        accreditation: "BNSP / Standar Kompetensi Nasional",
      },
    });
  } catch (err) {
    console.error("GET /api/verify error:", err);
    return NextResponse.json({ success: false, error: "Database tidak tersedia" }, { status: 503 });
  }
}
