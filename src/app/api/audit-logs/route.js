/**
 * GET /api/audit-logs?page=1&actor=&action=&entity=
 * Admin only. Returns paginated audit log entries.
 *
 * POST /api/audit-logs
 * Internal — log a single action. Called from other API routes.
 * body: { action, entityType, entityId, detail }
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page   = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const actor  = searchParams.get("actor") || "";
  const action = searchParams.get("action") || "";
  const entity = searchParams.get("entity") || "";
  const limit  = 50;
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];

  if (actor)  { params.push(`%${actor}%`);  conditions.push(`al.actor_email ILIKE $${params.length}`); }
  if (action) { params.push(`%${action}%`); conditions.push(`al.action ILIKE $${params.length}`); }
  if (entity) { params.push(`%${entity}%`); conditions.push(`al.entity_type ILIKE $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const [logs, total] = await Promise.all([
      query(
        `SELECT al.*, u.fullname AS actor_name
         FROM audit_logs al
         LEFT JOIN users u ON u.email = al.actor_email
         ${where}
         ORDER BY al.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      query(`SELECT COUNT(*) FROM audit_logs al ${where}`, params),
    ]);

    return NextResponse.json({
      success: true,
      logs: logs.rows,
      total: parseInt(total.rows[0].count),
      page,
      pages: Math.ceil(parseInt(total.rows[0].count) / limit),
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 503 });
  }
}

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { action, entityType, entityId, detail } = await request.json();
    await query(
      `INSERT INTO audit_logs (actor_email, action, entity_type, entity_id, detail)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.email, action, entityType || null, entityId || null, JSON.stringify(detail || {})]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
