// tests/demo-seed.test.js
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

test("Seeder admin tidak boleh me-reset password akun yang sudah ada", () => {
  const code = fs.readFileSync("src/lib/db.js", "utf8");
  assert.strictEqual(
    code.includes("ON CONFLICT (email) DO UPDATE SET password = $2"),
    false,
    "Seeder tidak boleh menggunakan DO UPDATE SET password yang menimpa kata sandi akun admin"
  );
  assert.strictEqual(
    code.includes("SEED_DEMO_ACCOUNTS"),
    true,
    "Harus mendukung flag env SEED_DEMO_ACCOUNTS"
  );
});
