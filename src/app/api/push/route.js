/**
 * POST /api/push  action: subscribe | unsubscribe | send (admin)
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { action } = body;

  if (action === "subscribe") {
    const { subscription, userAgent } = body;
    if (!subscription?.endpoint) return NextResponse.json({ error: "subscription wajib" }, { status: 400 });
    try {
      await query(
        `INSERT INTO push_subscriptions (user_email, endpoint, p256dh, auth, user_agent)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_email, endpoint) DO NOTHING`,
        [user.email, subscription.endpoint, subscription.keys?.p256dh || "", subscription.keys?.auth || "", userAgent || ""]
      );
      return NextResponse.json({ success: true });
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  if (action === "unsubscribe") {
    const { endpoint } = body;
    await query("DELETE FROM push_subscriptions WHERE user_email=$1 AND endpoint=$2", [user.email, endpoint]).catch(() => {});
    return NextResponse.json({ success: true });
  }

  // Send push notification (admin only)
  if (action === "send") {
    if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
    const { targetEmail, title, body: notifBody, url } = body;

    const vapidPublic  = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPublic || !vapidPrivate) {
      return NextResponse.json({ success: true, mock: true, message: "VAPID keys not configured" });
    }

    // web-push adalah dependensi opsional — resolusi dipisah agar kegagalan
    // pengiriman tidak salah dilaporkan sebagai "web-push not installed".
    let webpush;
    try {
      // turbopackIgnore/webpackIgnore: web-push adalah dependensi opsional dan
      // sengaja tidak ada di package.json — jangan di-resolve saat build.
      webpush = (await import(/* turbopackIgnore: true */ /* webpackIgnore: true */ "web-push")).default;
    } catch {
      return NextResponse.json({ success: true, mock: true, message: "web-push not installed" });
    }

    try {
      webpush.setVapidDetails(`mailto:${process.env.EMAIL_FROM || "admin@ailms.id"}`, vapidPublic, vapidPrivate);

      const where = targetEmail ? "WHERE user_email = $1" : "";
      const params = targetEmail ? [targetEmail] : [];
      const { rows: subs } = await query(`SELECT * FROM push_subscriptions ${where}`, params);

      const payload = JSON.stringify({ title, body: notifBody, url: url || "/" });
      let sent = 0;
      for (const sub of subs) {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
          sent++;
        } catch { await query("DELETE FROM push_subscriptions WHERE id=$1", [sub.id]).catch(() => {}); }
      }
      return NextResponse.json({ success: true, sent });
    } catch (err) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "action tidak valid" }, { status: 400 });
}
