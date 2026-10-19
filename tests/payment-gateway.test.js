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


test("POST /api/payment/webhook MENOLAK status 'paid' tanpa signature_key saat MIDTRANS_SERVER_KEY terkonfigurasi (regresi celah pemalsuan)", async () => {
  const prevKey = process.env.MIDTRANS_SERVER_KEY;
  const prevEnv = process.env.NODE_ENV;
  process.env.MIDTRANS_SERVER_KEY = "test-server-key-untuk-regresi";

  try {
    const { POST } = await import("../src/app/api/payment/webhook/route.js");

    // Skenario 1: signature_key tidak disertakan sama sekali — harus ditolak 403,
    // BUKAN diproses sebagai pembayaran sah (ini celah yang diperbaiki).
    const reqTanpaSignature = new Request("http://localhost:3000/api/payment/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: "ORD-REGRESI-TANPA-SIGNATURE", status: "paid" }),
    });
    const resTanpaSignature = await POST(reqTanpaSignature);
    assert.strictEqual(resTanpaSignature.status, 403);
    const dataTanpaSignature = await resTanpaSignature.json();
    assert.match(dataTanpaSignature.error, /signature/i);

    // Skenario 2: signature_key disertakan tapi salah — tetap harus ditolak 403.
    const reqSignatureSalah = new Request("http://localhost:3000/api/payment/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: "ORD-REGRESI-SIGNATURE-SALAH",
        status_code: "200",
        gross_amount: "100000",
        signature_key: "tanda-tangan-palsu-bukan-hasil-sha512",
        transaction_status: "settlement",
      }),
    });
    const resSignatureSalah = await POST(reqSignatureSalah);
    assert.strictEqual(resSignatureSalah.status, 403);

    // Skenario 3: tanpa MIDTRANS_SERVER_KEY sama sekali DAN NODE_ENV production —
    // harus ditolak (503), bukan mempercayai body apa adanya.
    delete process.env.MIDTRANS_SERVER_KEY;
    process.env.NODE_ENV = "production";
    const reqProdTanpaKey = new Request("http://localhost:3000/api/payment/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: "ORD-REGRESI-PROD-TANPA-KEY", status: "paid" }),
    });
    const resProdTanpaKey = await POST(reqProdTanpaKey);
    assert.strictEqual(resProdTanpaKey.status, 503);
  } finally {
    if (prevKey === undefined) delete process.env.MIDTRANS_SERVER_KEY; else process.env.MIDTRANS_SERVER_KEY = prevKey;
    if (prevEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = prevEnv;
  }
});

test("Mayar helper createMayarPaymentLink dan mapMayarStatus bekerja dengan mock dan mapping akurat", async () => {
  const { createMayarPaymentLink, mapMayarStatus } = await import("../src/lib/payment.js");

  // Mock payment link generator
  const mayarResult = await createMayarPaymentLink({
    orderId: "ORD-MAYAR-TEST-001",
    amount: 250000,
    customerName: "Ahmad",
    customerEmail: "ahmad@example.com",
    customerPhone: "081234567890",
    courseTitle: "Pelatihan Pengadaan Barang Jasa",
  });

  assert.strictEqual(mayarResult.mock, true);
  assert.strictEqual(mayarResult.id, "mock-mayar-ORD-MAYAR-TEST-001");
  assert.strictEqual(mayarResult.paymentUrl.includes("mock-ORD-MAYAR-TEST-001"), true);

  // Status mapping
  assert.strictEqual(mapMayarStatus("PAID"), "paid");
  assert.strictEqual(mapMayarStatus("SUCCESS"), "paid");
  assert.strictEqual(mapMayarStatus(null, "payment.received"), "paid");
  assert.strictEqual(mapMayarStatus("PENDING"), "pending");
  assert.strictEqual(mapMayarStatus("FAILED"), "failed");
  assert.strictEqual(mapMayarStatus("EXPIRED"), "failed");
});

test("POST /api/payment mengintegrasikan createMayarPaymentLink dan mengembalikan paymentUrl", async () => {
  const fs = await import("node:fs");
  const code = fs.readFileSync("src/app/api/payment/route.js", "utf8");

  assert.strictEqual(
    code.includes("createMayarPaymentLink"),
    true,
    "payment/route.js harus mengimpor dan memanggil createMayarPaymentLink"
  );
  assert.strictEqual(
    code.includes('paymentType === "mayar"'),
    true,
    "payment/route.js harus memeriksa paymentType mayar"
  );
  assert.strictEqual(
    code.includes("mayarPaymentUrl: mayarResult?.paymentUrl"),
    true,
    "payment/route.js harus mengembalikan mayarPaymentUrl"
  );
});
