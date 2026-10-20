import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { hasActiveSubscription } from "@/lib/courseAccess";

export async function GET(request) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const isSubscribed = await hasActiveSubscription(user);

    // Ambil setting tarif langganan
    const { rows: settingRows } = await query(
      "SELECT key, value FROM platform_settings WHERE key IN ('membership_monthly_price', 'membership_annual_price', 'membership_annual_badge')"
    ).catch(() => ({ rows: [] }));

    const settingsMap = {};
    settingRows.forEach(r => { settingsMap[r.key] = r.value; });

    const monthlyPrice = Number(settingsMap.membership_monthly_price) || 149000;
    const annualPrice = Number(settingsMap.membership_annual_price) || 999000;
    const annualBadge = settingsMap.membership_annual_badge || "HEMAT 44%";

    // Detail user
    const { rows: [userData] } = await query(
      "SELECT subscription_status, subscription_plan, subscription_expires_at FROM users WHERE email = $1",
      [user.email]
    ).catch(() => ({ rows: [{}] }));

    return NextResponse.json({
      success: true,
      isSubscribed,
      subscription: {
        status: isSubscribed ? "active" : (userData?.subscription_status || "inactive"),
        plan: userData?.subscription_plan || (user.role === "admin" ? "admin_pass" : null),
        expiresAt: userData?.subscription_expires_at || null,
      },
      pricing: {
        monthlyPrice,
        annualPrice,
        annualBadge,
      },
    });
  } catch (error) {
    console.error("GET /api/subscription error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/subscription
 * Admin dapat mengaktivasi atau memperpanjang langganan user secara manual.
 */
export async function POST(request) {
  try {
    const user = await authenticateRequest(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Hanya Admin yang dapat mengelola status langganan." }, { status: 403 });
    }

    const body = await request.json();
    const { email, plan = "monthly", durationDays = 30, action = "grant" } = body || {};

    if (!email) {
      return NextResponse.json({ success: false, error: "Email pengguna wajib diisi." }, { status: 400 });
    }

    if (action === "cancel") {
      await query(
        `UPDATE users
         SET subscription_status = 'inactive',
             subscription_expires_at = NOW()
         WHERE email = $1`,
        [email]
      );
      await query(
        `UPDATE user_subscriptions
         SET status = 'cancelled'
         WHERE user_email = $1 AND status = 'active'`,
        [email]
      );
      return NextResponse.json({ success: true, message: `Langganan ${email} telah dinonaktifkan.` });
    }

    const days = parseInt(durationDays, 10) || 30;
    await query(
      `UPDATE users
       SET subscription_status = 'active',
           subscription_plan = $1,
           subscription_expires_at = NOW() + (${days} * INTERVAL '1 day')
       WHERE email = $2`,
      [plan, email]
    );

    await query(
      `INSERT INTO user_subscriptions (user_email, plan, status, starts_at, expires_at, order_id)
       VALUES ($1, $2, 'active', NOW(), NOW() + (${days} * INTERVAL '1 day'), $3)`,
      [email, plan, `MANUAL-${Date.now()}`]
    );

    // Otomatis daftarkan ke seluruh kursus
    const { rows: allCourses } = await query("SELECT id FROM courses").catch(() => ({ rows: [] }));
    for (const c of allCourses) {
      await query(
        `INSERT INTO enrollments (user_email, course_id, status)
         VALUES ($1,$2,'active')
         ON CONFLICT (user_email, course_id) DO UPDATE SET status='active'`,
        [email, c.id]
      ).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: `Langganan ${email} berhasil diaktifkan selama ${days} hari.`,
    });
  } catch (error) {
    console.error("POST /api/subscription error:", error);
    return NextResponse.json({ success: false, error: "Gagal memperbarui langganan." }, { status: 500 });
  }
}
