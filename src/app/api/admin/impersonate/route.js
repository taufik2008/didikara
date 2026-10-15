import { NextResponse } from "next/server";
import { authenticateRequest, signToken } from "@/lib/auth";
import { query } from "@/lib/db";
import { catatAudit } from "@/lib/audit";
import { recordSession } from "@/lib/session";

/**
 * POST /api/admin/impersonate
 * Memungkinkan administrator / CS menyelidiki masalah teknis pengguna
 * dengan menerbitkan sesi impersonasi berbatas waktu singkat (15 menit)
 * dan mencatat jejak audit mutasi akses ke audit_logs.
 */
export async function POST(request) {
  const adminUser = await authenticateRequest(request);
  if (!adminUser) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (adminUser.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Akses ditolak: Hanya admin yang berhak melakukan impersonation pengguna." },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Format JSON body tidak valid" }, { status: 400 });
  }

  const { targetEmail, reason } = body;
  if (!targetEmail || typeof targetEmail !== "string") {
    return NextResponse.json({ success: false, error: "targetEmail wajib disertakan" }, { status: 400 });
  }

  try {
    // 1. Cari target user di database
    const userRes = await query("SELECT * FROM users WHERE email = $1", [targetEmail.toLowerCase().trim()]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Pengguna target tidak ditemukan" }, { status: 404 });
    }

    const targetUser = userRes.rows[0];

    // 2. Cegah impersonasi terhadap sesama admin (best practice enterprise security)
    if (targetUser.role === "admin" && targetUser.email !== adminUser.email) {
      return NextResponse.json(
        { success: false, error: "Demi alasan keamanan, tidak diizinkan melakukan impersonasi terhadap sesama akun Administrator." },
        { status: 403 }
      );
    }

    // 3. Terbitkan token berbatas waktu singkat (15 menit) dengan tanda eksplisit
    const impersonationPayload = {
      email: targetUser.email,
      role: targetUser.role,
      fullname: targetUser.fullname,
      isImpersonated: true,
      impersonatedBy: adminUser.email,
    };

    const token = await signToken(impersonationPayload, { expiresIn: "15m" });

    // 4. Catat sesi untuk tracking pembatalan
    const ip = request.headers.get("x-forwarded-for") || "internal";
    await recordSession(targetUser.email, token, {
      userAgent: `Impersonated by ${adminUser.email} - ${request.headers.get("user-agent") || ""}`,
      ip,
    }).catch(() => {});

    // 5. Catat jejak audit wajib
    await catatAudit(adminUser.email, "impersonate_user", "users", targetUser.email, {
      target_role: targetUser.role,
      target_email: targetUser.email,
      reason: reason || "Investigasi dukungan pengguna (Customer Support)",
      session_duration: "15m",
      isImpersonated: true,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        email: targetUser.email,
        fullname: targetUser.fullname,
        role: targetUser.role,
        roleLabel: targetUser.role_label,
        avatar: targetUser.avatar,
        stats: targetUser.stats,
        jobTitle: targetUser.job_title,
        organization: targetUser.organization,
        status: targetUser.status,
        permissions: targetUser.permissions,
        competencies: targetUser.competencies,
        isImpersonated: true,
        impersonatedBy: adminUser.email,
      },
      message: `Sesi impersonasi untuk ${targetUser.fullname} (${targetUser.email}) berhasil dibuat (berlaku 15 menit).`,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
