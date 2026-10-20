import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/courseAccess";

export async function GET(request) {
  try {
    const payload = await authenticateRequest(request);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await query("SELECT * FROM users WHERE email = $1", [payload.email]);
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const user = result.rows[0];
    const isSubscribed = await hasActiveSubscription(user);

    return NextResponse.json({
      success: true,
      data: {
        email: user.email,
        fullname: user.fullname,
        role: user.role,
        roleLabel: user.role_label,
        avatar: user.avatar,
        stats: typeof user.stats === 'string' ? JSON.parse(user.stats) : user.stats,
        jobTitle: user.job_title,
        organization: user.organization,
        status: user.status,
        permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions,
        competencies: typeof user.competencies === 'string' ? JSON.parse(user.competencies) : user.competencies,
        is_subscribed: isSubscribed,
        subscription_status: isSubscribed ? "active" : (user.subscription_status || "inactive"),
        subscription_plan: user.subscription_plan || (user.role === "admin" ? "admin_pass" : null),
        subscription_expires_at: user.subscription_expires_at || null,
      }
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
