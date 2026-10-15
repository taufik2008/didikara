// tests/payment-lifecycle.test.js
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

test("payment/confirm/route.js mendukung aksi refund dengan pembatalan status dan audit log", () => {
  const code = fs.readFileSync("src/app/api/payment/confirm/route.js", "utf8");

  assert.strictEqual(
    code.includes('"refund"'),
    true,
    "confirm/route.js harus menerima action 'refund'"
  );
  assert.strictEqual(
    code.includes("refund_payment"),
    true,
    "confirm/route.js harus mencatat audit log refund_payment"
  );
  assert.strictEqual(
    code.includes("cancelled"),
    true,
    "confirm/route.js harus mencabut status enrollment saat refund"
  );
});

test("payment/route.js menjalankan auto-sweep untuk order kedaluwarsa pada GET", () => {
  const code = fs.readFileSync("src/app/api/payment/route.js", "utf8");

  assert.strictEqual(
    code.includes("status = 'expired'"),
    true,
    "payment/route.js harus memperbarui order kedaluwarsa ke status expired"
  );
  assert.strictEqual(
    code.includes("expired_at < NOW()"),
    true,
    "payment/route.js harus memeriksa expired_at < NOW()"
  );
});
