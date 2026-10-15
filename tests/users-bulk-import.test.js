import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

test("API bulk-import pengguna via CSV/JSON tersedia dan memiliki validasi baris", () => {
  assert.strictEqual(
    fs.existsSync("src/app/api/users/bulk-import/route.js"),
    true,
    "src/app/api/users/bulk-import/route.js harus tersedia"
  );

  const routeCode = fs.readFileSync("src/app/api/users/bulk-import/route.js", "utf8");

  assert.strictEqual(
    routeCode.includes("authenticateRequest"),
    true,
    "bulk-import harus memvalidasi sesi autentikasi"
  );
  assert.strictEqual(
    routeCode.includes("bulk_import_users"),
    true,
    "bulk-import harus mencatat audit log dengan action bulk_import_users"
  );
  assert.strictEqual(
    routeCode.includes("successCount") && routeCode.includes("failureCount"),
    true,
    "bulk-import harus mengembalikan laporan baris sukses dan gagal"
  );
});
