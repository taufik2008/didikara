import test from "node:test";
import assert from "node:assert";

test("Midtrans helper createSnapToken menghasilkan mock token saat SERVER_KEY kosong", async () => {
  const { createSnapToken, mapMidtransStatus, verifyWebhookSignature, generateInvoiceNumber } = await import("../src/lib/payment.js");

  // Invoice generator
  const inv = generateInvoiceNumber();
  assert.strictEqual(inv.startsWith("INV-"), true);

  // Snap mock
  const snap = await createSnapToken({
    orderId: "ORD-TEST-123",
    amount: 150000,
    customerName: "Budi",
    customerEmail: "budi@instansi.go.id",
    courseTitle: "PBJ Level 1",
  });
  assert.strictEqual(snap.mock, true);
  assert.strictEqual(snap.token, "mock-token-ORD-TEST-123");
  assert.strictEqual(typeof snap.redirectUrl, "string");

  // Status mapping
  assert.strictEqual(mapMidtransStatus("settlement"), "paid");
  assert.strictEqual(mapMidtransStatus("capture", "accept"), "paid");
  assert.strictEqual(mapMidtransStatus("cancel"), "failed");
  assert.strictEqual(mapMidtransStatus("expire"), "failed");
  assert.strictEqual(mapMidtransStatus("pending"), "pending");

  // Webhook signature calculation
  const sig = verifyWebhookSignature("ORD-1", "200", "150000", "test-server-key");
  assert.strictEqual(typeof sig, "string");
  assert.strictEqual(sig.length, 128); // SHA-512 hex
});

test("POST /api/payment mengintegrasikan createSnapToken saat paymentType === midtrans_snap", async () => {
  const fs = await import("node:fs");
  const code = fs.readFileSync("src/app/api/payment/route.js", "utf8");

  assert.strictEqual(
    code.includes("createSnapToken"),
    true,
    "payment/route.js harus mengimpor dan memanggil createSnapToken"
  );
  assert.strictEqual(
    code.includes('paymentType === "midtrans_snap"'),
    true,
    "payment/route.js harus memeriksa paymentType === midtrans_snap"
  );
  assert.strictEqual(
    code.includes("snapToken: snapResult?.token"),
    true,
    "payment/route.js harus mengembalikan snapToken"
  );
});

