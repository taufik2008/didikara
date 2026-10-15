import { NextResponse } from "next/server";
import { authenticateRequest, hashPassword } from "@/lib/auth";
import { query } from "@/lib/db";
import { catatAudit } from "@/lib/audit";

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    // Simple CSV row parser handling quotes
    const values = [];
    let insideQuotes = false;
    let currentValue = "";

    for (const char of lines[i]) {
      if (char === '"' || char === "'") {
        insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());

    const rowObj = {};
    headers.forEach((header, idx) => {
      rowObj[header] = values[idx] || "";
    });
    rowObj.__rowNumber = i + 1;
    rows.push(rowObj);
  }

  return rows;
}

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!["admin", "corporate", "government"].includes(user.role)) {
    return NextResponse.json({ error: "Hanya Pengelola SDM / Admin yang dapat melakukan impor massal" }, { status: 403 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
  }

  let candidates = [];
  if (Array.isArray(body.users)) {
    candidates = body.users.map((u, idx) => ({ ...u, __rowNumber: idx + 1 }));
  } else if (typeof body.csvText === "string") {
    candidates = parseCsv(body.csvText);
  } else {
    return NextResponse.json({ error: "Field 'users' (array) atau 'csvText' (string) wajib disertakan" }, { status: 400 });
  }

  if (candidates.length === 0) {
    return NextResponse.json({ error: "Tidak ada baris data untuk diproses" }, { status: 400 });
  }

  const defaultPassword = body.defaultPassword || "Didikara2026!";
  const hashedPassword = await hashPassword(defaultPassword);

  let successCount = 0;
  let failureCount = 0;
  const errors = [];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (const candidate of candidates) {
    const rowNum = candidate.__rowNumber || "?";
    const email = String(candidate.email || "").trim().toLowerCase();
    const fullname = String(candidate.fullname || candidate.name || candidate.nama || "").trim();
    const jobTitle = String(candidate.job_title || candidate.jabatan || "").trim();
    const org = String(candidate.organization || candidate.instansi || user.organization || "").trim();

    // Validasi email
    if (!email || !emailRegex.test(email)) {
      failureCount++;
      errors.push({ row: rowNum, email, error: "Format email tidak valid" });
      continue;
    }

    // Validasi nama lengkap
    if (!fullname || fullname.length < 2) {
      failureCount++;
      errors.push({ row: rowNum, email, error: "Nama lengkap wajib diisi minimal 2 karakter" });
      continue;
    }

    // Role (hanya admin yang dapat menetapkan selain student)
    let assignedRole = "student";
    if (user.role === "admin" && candidate.role && ["student", "corporate", "government"].includes(candidate.role)) {
      assignedRole = candidate.role;
    }

    const roleLabels = { student: "Peserta Mandiri", corporate: "HR Manager", government: "Kepala Biro SDM", admin: "Platform Admin" };
    const initials = fullname.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();

    try {
      const { rows: [existing] } = await query("SELECT email FROM users WHERE email = $1", [email]);
      if (existing) {
        failureCount++;
        errors.push({ row: rowNum, email, error: "Email sudah terdaftar (duplikat)" });
        continue;
      }

      await query(`
        INSERT INTO users (
          email, password, fullname, role, role_label, avatar, stats, job_title, organization, status,
          permissions, competencies, privacy_consent_at, privacy_policy_version
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), '2026-10-v1.0')
      `, [
        email, hashedPassword, fullname, assignedRole, roleLabels[assignedRole] || "Peserta", initials || "US",
        JSON.stringify({ hours: 0, courses: 0, certs: 0, competency: "A1 (Beginner)" }),
        jobTitle, org, "active",
        JSON.stringify(["view_dashboard", "access_lms"]),
        JSON.stringify({ current: [50, 50, 50, 50, 50, 50], target: [80, 80, 80, 80, 80, 80] })
      ]);

      successCount++;
    } catch (insertErr) {
      failureCount++;
      errors.push({ row: rowNum, email, error: insertErr.message || "Gagal menyimpan ke database" });
    }
  }

  await catatAudit(user.email, "bulk_import_users", "user", "batch", {
    total_candidates: candidates.length,
    success_count: successCount,
    failure_count: failureCount,
    has_errors: errors.length > 0,
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    message: `Impor massal selesai: ${successCount} berhasil, ${failureCount} gagal.`,
    totalProcessed: candidates.length,
    successCount,
    failureCount,
    errors,
  });
}
