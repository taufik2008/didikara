import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

test("API route admin impersonate tersedia dan menerapkan kontrol otorisasi ketat", () => {
  assert.strictEqual(
    fs.existsSync("src/app/api/admin/impersonate/route.js"),
    true,
    "src/app/api/admin/impersonate/route.js harus tersedia"
  );

  const routeCode = fs.readFileSync("src/app/api/admin/impersonate/route.js", "utf8");

  assert.strictEqual(
    routeCode.includes("export async function POST"),
    true,
    "route harus mengekspor fungsi POST"
  );
  assert.strictEqual(
    routeCode.includes('role !== "admin"') || routeCode.includes("role !== 'admin'"),
    true,
    "route harus memvalidasi bahwa pemanggil adalah admin"
  );
  assert.strictEqual(
    routeCode.includes("isImpersonated: true") || routeCode.includes("isImpersonated"),
    true,
    "route harus menyertakan flag isImpersonated pada token/payload"
  );
  assert.strictEqual(
    routeCode.includes("catatAudit"),
    true,
    "route harus mencatat aktivitas impersonasi ke audit log"
  );
  assert.strictEqual(
    routeCode.includes("15m") || routeCode.includes("900"),
    true,
    "token sesi impersonasi harus berbatas waktu singkat (15 menit)"
  );
});
