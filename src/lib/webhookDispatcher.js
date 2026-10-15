import crypto from "node:crypto";
import { query } from "@/lib/db";

/**
 * Menghasilkan signature HMAC-SHA256 untuk payload webhook.
 * Digunakan oleh klien/HRIS untuk memvalidasi integritas pengirim.
 *
 * @param {object|string} payload
 * @param {string} secretKey
 * @returns {string} HMAC-SHA256 hex signature
 */
export function generateWebhookSignature(payload, secretKey) {
  const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
  return crypto
    .createHmac("sha256", secretKey || "didikara-default-webhook-secret")
    .update(payloadStr)
    .digest("hex");
}

/**
 * Mendistribusikan notifikasi event ke seluruh webhook HRIS klien yang aktif.
 * Eksekusi berjalan secara non-blocking / asynchronous (fire-and-forget).
 *
 * @param {string} eventType  e.g. "course.completed" | "certificate.issued"
 * @param {object} payload    data event yang dikirim ke endpoint HRIS
 * @param {string} [organizationId] opsional, untuk filtering organisasi tertentu
 */
export async function dispatchWebhook(eventType, payload, organizationId = null) {
  try {
    let sql = "SELECT * FROM webhook_subscriptions WHERE is_active = TRUE";
    const params = [];

    if (organizationId) {
      sql += " AND (organization_id = $1 OR organization_id = 'all')";
      params.push(organizationId);
    }

    const { rows: subscriptions } = await query(sql, params);
    if (!subscriptions || subscriptions.length === 0) return;

    const eventPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      organizationId: organizationId || "all",
      data: payload,
    };

    const payloadString = JSON.stringify(eventPayload);

    for (const sub of subscriptions) {
      let eventsAllowed = [];
      try {
        eventsAllowed = typeof sub.events === "string" ? JSON.parse(sub.events) : sub.events;
      } catch {
        eventsAllowed = ["course.completed", "certificate.issued"];
      }

      if (Array.isArray(eventsAllowed) && !eventsAllowed.includes(eventType)) {
        continue;
      }

      const signature = generateWebhookSignature(payloadString, sub.secret_key);

      // Kirim webhook via HTTP POST dengan timeout 5 detik
      fetch(sub.target_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-didikara-event": eventType,
          "x-didikara-signature": `sha256=${signature}`,
          "User-Agent": "Didikara-Webhook-Dispatcher/1.0",
        },
        body: payloadString,
        signal: AbortSignal.timeout(5000),
      }).catch((err) => {
        console.warn(`[WEBHOOK] Gagal mengirim event ${eventType} ke ${sub.target_url}:`, err.message);
      });
    }
  } catch (err) {
    console.warn(`[WEBHOOK] Dispatch error untuk event ${eventType}:`, err.message);
  }
}
