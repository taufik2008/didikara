import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { catatAudit } from "@/lib/audit";

/**
 * GET  /api/webhooks/outbound — Daftar pendaftaran webhook keluar HRIS
 * POST /api/webhooks/outbound — Mendaftarkan webhook keluar baru
 * DELETE /api/webhooks/outbound?id=xyz — Menghapus pendaftaran webhook
 */

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role !== "admin" && user.role !== "instructor") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const org = searchParams.get("organizationId");

  try {
    let sql = `
      SELECT ws.id, ws.organization_id, ws.target_url, ws.events, ws.is_active, ws.created_at, ws.updated_at,
             CONCAT(SUBSTRING(ws.secret_key, 1, 6), '...') AS masked_secret
      FROM webhook_subscriptions ws
    `;
    const params = [];

    if (user.role !== "admin" || org) {
      sql += " WHERE ws.organization_id = $1";
      params.push(org || user.organization || "default");
    }

    sql += " ORDER BY ws.created_at DESC";

    const { rows: subscriptions } = await query(sql, params);
    return NextResponse.json({ success: true, subscriptions });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Hanya admin yang dapat mengonfigurasi webhook keluar HRIS" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
  }

  const { organizationId, targetUrl, events, secretKey } = body;

  if (!organizationId || typeof organizationId !== "string") {
    return NextResponse.json({ error: "organizationId wajib disertakan" }, { status: 400 });
  }

  if (!targetUrl || !/^https?:\/\//i.test(targetUrl.trim())) {
    return NextResponse.json({ error: "targetUrl harus berupa format HTTP atau HTTPS yang valid" }, { status: 400 });
  }

  const assignedSecret = (secretKey && typeof secretKey === "string" && secretKey.trim().length >= 8)
    ? secretKey.trim()
    : crypto.randomBytes(24).toString("hex");

  const allowedEvents = Array.isArray(events) && events.length > 0
    ? events
    : ["course.completed", "certificate.issued"];

  try {
    const { rows: [subscription] } = await query(
      `INSERT INTO webhook_subscriptions
         (organization_id, target_url, secret_key, events, is_active, created_by)
       VALUES ($1, $2, $3, $4, TRUE, $5)
       RETURNING id, organization_id, target_url, secret_key, events, is_active, created_at`,
      [organizationId.trim(), targetUrl.trim(), assignedSecret, JSON.stringify(allowedEvents), user.email]
    );

    await catatAudit(user.email, "create_webhook_subscription", "webhook_subscriptions", subscription.id, {
      organization_id: subscription.organization_id,
      target_url: subscription.target_url,
      events: allowedEvents,
    });

    return NextResponse.json({
      success: true,
      subscription,
      message: "Webhook HRIS berhasil didaftarkan.",
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Hanya admin yang dapat menghapus konfigurasi webhook" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Parameter id wajib" }, { status: 400 });

  try {
    const result = await query("DELETE FROM webhook_subscriptions WHERE id = $1 RETURNING id, organization_id, target_url", [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Webhook subscription tidak ditemukan" }, { status: 404 });
    }

    await catatAudit(user.email, "delete_webhook_subscription", "webhook_subscriptions", id, {
      deleted_record: result.rows[0],
    });

    return NextResponse.json({ success: true, message: "Webhook subscription berhasil dihapus" });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
