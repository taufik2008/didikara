/**
 * GET /api/certificate/pdf?certId=AILMS-TX-1002A
 * Generate PDF sertifikat di server menggunakan PDFKit.
 * Memerlukan autentikasi (pemilik sertifikat atau admin).
 * Returns: application/pdf stream (download)
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import PDFDocument from "pdfkit";

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const certId = searchParams.get("certId");
  if (!certId) return NextResponse.json({ error: "certId wajib" }, { status: 400 });

  // ── Ambil data sertifikat ──────────────────────────────────────
  let cert, recipientName, orgName, templateData;
  try {
    // Nama pemegang diambil dari pemilik sertifikat (certificates.user_email).
    // Sebelumnya kueri ini menautkan ke exam_attempts tanpa penyaring pengguna,
    // sehingga PDF bisa memuat nama peserta lain yang kebetulan lulus kursus
    // yang sama.
    const certResult = await query(
      `SELECT c.id, c.course_id, c.title, c.date, c.id_code, c.user_email,
              u.fullname, u.organization
       FROM certificates c
       LEFT JOIN users u ON u.email = c.user_email
       WHERE c.id_code = $1 OR c.id = $1
       LIMIT 1`,
      [certId]
    );
    if (certResult.rows.length === 0) {
      return NextResponse.json({ error: "Sertifikat tidak ditemukan" }, { status: 404 });
    }
    cert = certResult.rows[0];

    // Hanya pemilik atau admin yang boleh mengunduh — sesuai yang selama ini
    // dijanjikan komentar di kepala berkas, tetapi tidak pernah diperiksa.
    if (user.role !== "admin" && cert.user_email && cert.user_email !== user.email) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    recipientName = cert.fullname || (cert.user_email ? cert.user_email : user.fullname) || "Peserta";
    orgName = cert.organization || "";

    // Ambil template jika ada
    try {
      const tmplResult = await query("SELECT * FROM cert_templates LIMIT 1");
      templateData = tmplResult.rows[0] || null;
    } catch { templateData = null; }
  } catch {
    return NextResponse.json({ error: "DB tidak tersedia" }, { status: 503 });
  }

  // ── Template defaults ──────────────────────────────────────────
  const orgTitle    = templateData?.org_name    || "DIDIKARA";
  const ecosystem   = templateData?.ecosystem   || "Platform Pelatihan & Sertifikasi Kompetensi Nasional";
  const accentR     = templateData?.accent_r    ?? 30;
  const accentG     = templateData?.accent_g    ?? 58;
  const accentB     = templateData?.accent_b    ?? 138;
  const signer1Name = templateData?.signer1_name || "Prof. Dr. Kadir";
  const signer1Title= templateData?.signer1_title|| "DIDIKARA Platform";
  // Penanda tangan kedua opsional. Bila kosong, tanda tangan pertama
  // diletakkan di tengah agar sertifikat tetap seimbang.
  const signer2Name = templateData?.signer2_name || "";
  const signer2Title= templateData?.signer2_title || "";

  // ── Generate PDF ───────────────────────────────────────────────
  const chunks = [];
  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [842, 595], // A4 landscape
      margin: 0,
      info: {
        Title: `Sertifikat — ${cert.title}`,
        Author: orgTitle,
        Subject: "Sertifikat Kompetensi",
      },
    });

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", resolve);
    doc.on("error", reject);

    const W = 842, H = 595;
    const accent = [accentR, accentG, accentB];

    // Background gradient bands
    doc.rect(0, 0, W, H).fill("#f8fafc");
    doc.rect(0, 0, W, 12).fill(accent);
    doc.rect(0, H - 12, W, 12).fill(accent);

    // Decorative sidebar
    doc.rect(0, 12, 6, H - 24).fill(accent);
    doc.rect(W - 6, 12, 6, H - 24).fill(accent);

    // Header area
    doc.rect(0, 0, W, 100).fillOpacity(0.04).fill(accent).fillOpacity(1);

    // Org title
    doc.font("Helvetica-Bold")
       .fontSize(22)
       .fillColor(`rgb(${accent[0]},${accent[1]},${accent[2]})`)
       .text(orgTitle, 60, 32, { align: "center", width: W - 120 });

    // Ecosystem label
    doc.font("Helvetica")
       .fontSize(9)
       .fillColor("#475569")
       .text(ecosystem, 60, 62, { align: "center", width: W - 120 });

    // Divider
    doc.moveTo(W / 2 - 60, 82).lineTo(W / 2 + 60, 82)
       .strokeColor(`rgb(${accent[0]},${accent[1]},${accent[2]})`).lineWidth(2).stroke();

    // "Sertifikat Kompetensi" title
    doc.font("Helvetica-Bold")
       .fontSize(26)
       .fillColor(`rgb(${accent[0]},${accent[1]},${accent[2]})`)
       .text("SERTIFIKAT KOMPETENSI", 60, 110, { align: "center", width: W - 120 });

    // "Diberikan kepada"
    doc.font("Helvetica-Oblique")
       .fontSize(11)
       .fillColor("#64748b")
       .text("Diberikan secara terhormat kepada:", 60, 150, { align: "center", width: W - 120 });

    // Recipient name
    doc.font("Helvetica-Bold")
       .fontSize(34)
       .fillColor("#0f172a")
       .text(recipientName, 60, 172, { align: "center", width: W - 120 });

    // Underline nama
    const nameWidth = Math.min(doc.widthOfString(recipientName, { fontSize: 34 }) + 40, W - 140);
    const nameX = (W - nameWidth) / 2;
    doc.moveTo(nameX, 215).lineTo(nameX + nameWidth, 215)
       .strokeColor("#cbd5e1").lineWidth(1).stroke();

    // Description
    doc.font("Helvetica")
       .fontSize(10)
       .fillColor("#475569")
       .text("Atas kelulusan dan keberhasilan menyelesaikan program pelatihan profesional dan sertifikasi keahlian pada topik:", 80, 228, { align: "center", width: W - 160 });

    // Course title
    doc.font("Helvetica-Bold")
       .fontSize(16)
       .fillColor(`rgb(${accent[0]},${accent[1]},${accent[2]})`)
       .text(cert.title, 80, 258, { align: "center", width: W - 160 });

    // Date & cert ID
    doc.font("Helvetica")
       .fontSize(9)
       .fillColor("#64748b")
       .text(`Diverifikasi secara digital pada tanggal ${cert.date}`, 80, 302, { align: "center", width: W - 160 });
    doc.text(`ID Sertifikat: ${cert.id_code}`, 80, 316, { align: "center", width: W - 160 });

    // Footer signers — satu atau dua tanda tangan
    const punyaSigner2 = Boolean(signer2Name);
    const sigY  = 370;
    const sig1X = punyaSigner2 ? 120 : (W - 160) / 2;
    const sig2X = W - 280;

    const gambarTandaTangan = (nama, jabatan, peran, x) => {
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#1e293b");
      doc.text(nama, x, sigY + 18, { width: 160, align: "center" });
      doc.moveTo(x, sigY + 16).lineTo(x + 160, sigY + 16).strokeColor("#cbd5e1").lineWidth(0.8).stroke();
      doc.font("Helvetica").fontSize(8).fillColor("#1e293b").text(jabatan, x, sigY + 30, { width: 160, align: "center" });
      if (peran) doc.font("Helvetica").fontSize(7).fillColor("#64748b").text(peran, x, sigY + 42, { width: 160, align: "center" });
    };

    gambarTandaTangan(signer1Name, signer1Title, "Penerbit Sertifikat", sig1X);
    if (punyaSigner2) gambarTandaTangan(signer2Name, signer2Title, "Mitra", sig2X);

    // Verify URL (bottom center)
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://ailms.id"}/verify/${cert.id_code}`;
    doc.font("Helvetica").fontSize(7).fillColor("#94a3b8")
       .text(`Verifikasi: ${verifyUrl}`, 80, H - 40, { align: "center", width: W - 160 });

    doc.end();
  });

  const pdfBuffer = Buffer.concat(chunks);
  const filename  = `Sertifikat-${certId}.pdf`;

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
