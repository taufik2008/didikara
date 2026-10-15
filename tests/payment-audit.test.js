// tests/payment-audit.test.js
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

test("payment/route.js mencatat audit log pada pembuatan order dan pengunggahan bukti", () => {
  const code = fs.readFileSync("src/app/api/payment/route.js", "utf8");

  assert.strictEqual(
    code.includes('catatAudit(user.email, "create_payment_order"'),
    true,
    "Harus ada catatAudit untuk create_payment_order di POST /api/payment"
  );
  assert.strictEqual(
    code.includes('catatAudit(user.email, "submit_payment_proof"'),
    true,
    "Harus ada catatAudit untuk submit_payment_proof di PATCH /api/payment"
  );
});
