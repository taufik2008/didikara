/**
 * GET  /api/notifications           → { notifications, unreadCount }
 * POST /api/notifications           → buat notif (admin/system)
 * PATCH /api/notifications          → mark all as read
 * PATCH /api/notifications?id=N     → mark one as read
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  userEmail: z.string().email().optional(), // jika kosong, broadcast ke semua
  type:    z.enum(["info","success","warning","enrollment","certificate","announcement"]).optional().default("info"),
  title:   z.string().min(1),
  message: z.string().min(1),
  link:    z.string().optional().default(""),
});

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [notifs, unread] = await Promise.all([
      query(
        `SELECT * FROM notifications WHERE user_email = $1
         ORDER BY created_at DESC LIMIT 50`,
        [user.email]
      ),
      query(
        `SELECT COUNT(*) FROM notifications WHERE user_email = $1 AND read_at IS NULL`,
        [user.email]
      ),
    ]);
    return NextResponse.json({
      success: true,
      notifications: notifs.rows,
      unreadCount: parseInt(unread.rows[0].count),
    });
  } catch {
    return NextResponse.json({ success: true, notifications: [], unreadCount: 0 });
  }
}

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const { userEmail, type, title, message, link } = parsed.data;
    if (userEmail) {
      // Notif ke satu user
      const r = await query(
        `INSERT INTO notifications (user_email, type, title, message, link)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [userEmail, type, title, message, link]
      );
      return NextResponse.json({ success: true, notification: r.rows[0] }, { status: 201 });
    } else {
      // Broadcast ke semua user aktif
      await query(
        `INSERT INTO notifications (user_email, type, title, message, link)
         SELECT email, $1, $2, $3, $4 FROM users WHERE deleted_at IS NULL`,
        [type, title, message, link]
      );
      return NextResponse.json({ success: true, broadcast: true }, { status: 201 });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  try {
    if (id) {
      await query(
        "UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_email = $2",
        [id, user.email]
      );
    } else {
      await query(
        "UPDATE notifications SET read_at = NOW() WHERE user_email = $1 AND read_at IS NULL",
        [user.email]
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
