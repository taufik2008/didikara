// tests/db-soft-delete.test.js
import test from "node:test";
import assert from "node:assert";

test("Soft delete categories & levels query uses UPDATE deleted_at instead of DELETE FROM", async () => {
  const fs = await import("node:fs");
  const code = fs.readFileSync("src/app/api/db/route.js", "utf8");
  
  assert.strictEqual(
    code.includes("DELETE FROM categories"),
    false,
    "Tidak boleh ada DELETE FROM categories di db/route.js"
  );
  assert.strictEqual(
    code.includes("DELETE FROM levels"),
    false,
    "Tidak boleh ada DELETE FROM levels di db/route.js"
  );
  assert.strictEqual(
    code.includes("UPDATE categories SET deleted_at = NOW()"),
    true,
    "Harus menggunakan UPDATE categories SET deleted_at = NOW()"
  );
  assert.strictEqual(
    code.includes("UPDATE levels SET deleted_at = NOW()"),
    true,
    "Harus menggunakan UPDATE levels SET deleted_at = NOW()"
  );
});
