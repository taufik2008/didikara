import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

test("Database schema mendefinisikan tabel password_reset_tokens", () => {
  const dbCode = fs.readFileSync("src/lib/db.js", "utf8");
  assert.strictEqual(
    dbCode.includes("CREATE TABLE IF NOT EXISTS password_reset_tokens"),
    true,
    "db.js harus memiliki migrasi tabel password_reset_tokens"
  );
  assert.strictEqual(
    dbCode.includes("token_hash"),
    true,
    "password_reset_tokens harus memiliki kolom token_hash"
  );
  assert.strictEqual(
    dbCode.includes("expires_at"),
    true,
    "password_reset_tokens harus memiliki kolom expires_at"
  );
  assert.strictEqual(
    dbCode.includes("used_at"),
    true,
    "password_reset_tokens harus memiliki kolom used_at"
  );
});

test("forgot-password dan reset-password menggunakan token acak ber-hash sekali pakai", () => {
  const forgotCode = fs.readFileSync("src/app/api/auth/forgot-password/route.js", "utf8");
  const resetCode = fs.readFileSync("src/app/api/auth/reset-password/route.js", "utf8");

  // forgot-password harus menyimpan token_hash ke password_reset_tokens dengan masa berlaku 30 menit
  assert.strictEqual(
    forgotCode.includes("password_reset_tokens"),
    true,
    "forgot-password harus menyimpan token ke password_reset_tokens"
  );
  assert.strictEqual(
    forgotCode.includes("sha256") || forgotCode.includes("createHash"),
    true,
    "forgot-password harus membuat hash SHA-256 dari reset token"
  );
  assert.strictEqual(
    forgotCode.includes("INTERVAL '30 minutes'") || forgotCode.includes("30 * 60"),
    true,
    "forgot-password harus menerapkan batas kedaluwarsa 30 menit"
  );

  // reset-password harus memverifikasi token_hash dari database dan menandai used_at
  assert.strictEqual(
    resetCode.includes("password_reset_tokens"),
    true,
    "reset-password harus memeriksa password_reset_tokens"
  );
  assert.strictEqual(
    resetCode.includes("used_at IS NULL"),
    true,
    "reset-password harus memastikan token belum pernah digunakan (used_at IS NULL)"
  );
  assert.strictEqual(
    resetCode.includes("used_at = NOW()"),
    true,
    "reset-password harus menandai token sebagai sudah digunakan (used_at = NOW())"
  );
  assert.strictEqual(
    resetCode.includes("catatAudit"),
    true,
    "reset-password harus mencatat aktivitas ke audit log"
  );
});
