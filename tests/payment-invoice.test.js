// tests/payment-invoice.test.js
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

test("Invoice PDF menggunakan branding DIDIKARA dan memetakan status refunded", () => {
  const code = fs.readFileSync("src/app/api/payment/invoice/route.js", "utf8");

  assert.strictEqual(
    code.includes('"DIDIKARA"'),
    true,
    "Invoice harus menggunakan fallback nama platform 'DIDIKARA'"
  );
  assert.strictEqual(
    code.includes('refunded: "DIKEMBALIKAN (REFUND)"'),
    true,
    "Invoice harus memetakan status refunded ke teks bahasa Indonesia resmi"
  );
});
