import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, fullname, role, privacyConsent, honeypot, website_url, _hp } = body || {};

    // Proteksi Spam & Bot: Jika field honeypot terisi, tolak langsung tanpa proses bcrypt
    if (honeypot || website_url || _hp) {
      return NextResponse.json({ success: false, error: "Spam bot request terdeteksi" }, { status: 400 });
    }

    if (!email || !password || !fullname) {
      return NextResponse.json({ success: false, error: "Email, password, dan nama lengkap wajib diisi" }, { status: 400 });
    }

    if (!privacyConsent) {
      return NextResponse.json({
        success: false,
        error: "Persetujuan terhadap Kebijakan Privasi dan Syarat & Ketentuan wajib diberikan sesuai UU No. 27/2022 (UU PDP).",
      }, { status: 400 });
    }

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (typeof password !== "string" || password.length < 8 || !hasLetter || !hasNumber) {
      return NextResponse.json(
        { success: false, error: "Kata sandi minimal 8 karakter dan harus mengandung kombinasi huruf serta angka" },
        { status: 400 }
      );
    }

    const existing = await query("SELECT email FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ success: false, error: "Email sudah terdaftar" }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    // Peran TIDAK boleh datang dari badan permintaan. Endpoint ini publik
    // (lihat publicPaths di src/proxy.js), jadi `role: "admin"` dari siapa pun
    // dulu langsung menghasilkan administrator platform. Pendaftaran mandiri
    // selalu menjadi peserta; peran lain hanya ditetapkan lewat Modul Admin.
    const userRole = "student";
    if (role && role !== "student") {
      console.warn(`[REGISTER] Permintaan peran "${role}" dari ${email} diabaikan.`);
    }
    const roleLabels = { student: "Peserta Mandiri", corporate: "HR Manager", government: "Kepala Biro SDM", admin: "Platform Admin" };
    const initials = fullname.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();

    await query(`
      INSERT INTO users (
        email, password, fullname, role, role_label, avatar, stats, job_title, organization, status,
        permissions, competencies, privacy_consent_at, privacy_policy_version
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), '2026-10-v1.0')
    `, [
      email, hashedPassword, fullname, userRole, roleLabels[userRole] || "Peserta", initials || "US",
      JSON.stringify({ hours: 0, courses: 0, certs: 0, competency: "A1 (Beginner)" }),
      "", "", "active",
      JSON.stringify(["view_dashboard", "access_lms"]),
      JSON.stringify({ current: [50, 50, 50, 50, 50, 50], target: [80, 80, 80, 80, 80, 80] })
    ]);

    return NextResponse.json({ success: true, message: "Pendaftaran berhasil. Silakan login." }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
