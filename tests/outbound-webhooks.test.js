import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { generateWebhookSignature } from "../src/lib/webhookDispatcher.js";

test("Database schema mendefinisikan tabel webhook_subscriptions", () => {
  const dbCode = fs.readFileSync("src/lib/db.js", "utf8");

  assert.strictEqual(
    dbCode.includes("CREATE TABLE IF NOT EXISTS webhook_subscriptions"),
    true,
    "db.js harus memiliki migrasi tabel webhook_subscriptions"
  );
  assert.strictEqual(
    dbCode.includes("target_url"),
    true,
    "webhook_subscriptions harus memiliki kolom target_url"
  );
  assert.strictEqual(
    dbCode.includes("secret_key"),
    true,
    "webhook_subscriptions harus memiliki kolom secret_key"
  );
});

test("Helper webhookDispatcher menghasilkan signature HMAC-SHA256 yang valid", () => {
  const payload = { event: "course.completed", userEmail: "pegawai@instansi.go.id", courseId: "c1" };
  const secretKey = "test-secret-key-123";

  const signature = generateWebhookSignature(payload, secretKey);
  assert.strictEqual(typeof signature, "string", "Signature harus berupa string hex");
  assert.strictEqual(signature.length, 64, "HMAC-SHA256 hex harus memiliki panjang 64 karakter");

  // Konsistensi signature untuk payload yang sama
  const signature2 = generateWebhookSignature(payload, secretKey);
  assert.strictEqual(signature, signature2, "Signature harus deterministik untuk payload dan secret yang identik");

  // Signature berbeda jika payload berubah
  const diffSignature = generateWebhookSignature({ ...payload, courseId: "c2" }, secretKey);
  assert.notStrictEqual(signature, diffSignature, "Signature harus berubah jika payload berbeda");
});

test("API route outbound webhooks tersedia untuk manajemen endpoint integrasi HRIS", () => {
  assert.strictEqual(
    fs.existsSync("src/app/api/webhooks/outbound/route.js"),
    true,
    "src/app/api/webhooks/outbound/route.js harus tersedia"
  );

  const routeCode = fs.readFileSync("src/app/api/webhooks/outbound/route.js", "utf8");

  assert.strictEqual(
    routeCode.includes("export async function GET"),
    true,
    "route harus mengekspor fungsi GET untuk melihat subscription"
  );
  assert.strictEqual(
    routeCode.includes("export async function POST"),
    true,
    "route harus mengekspor fungsi POST untuk mendaftarkan subscription"
  );
  assert.strictEqual(
    routeCode.includes("webhook_subscriptions"),
    true,
    "route harus berinteraksi dengan tabel webhook_subscriptions"
  );
  assert.strictEqual(
    routeCode.includes("catatAudit"),
    true,
    "route harus mencatat pendaftaran webhook ke audit_logs"
  );
});
