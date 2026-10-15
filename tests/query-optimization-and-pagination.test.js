import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

test("GET /api/live-sessions mengeliminasi pola N+1 query otorisasi instruktur", () => {
  const code = fs.readFileSync("src/app/api/live-sessions/route.js", "utf8");

  assert.strictEqual(
    code.includes("canManageSession(user, s)"),
    false,
    "GET /api/live-sessions tidak boleh memanggil canManageSession (query terpisah) di dalam loop baris"
  );

  assert.strictEqual(
    code.includes("taughtSet") || code.includes("Set(diampu") || code.includes("user.role === 'admin'"),
    true,
    "GET /api/live-sessions harus memeriksa hak kelola sesi secara in-memory dari daftar kursus yang diampu"
  );
});

test("POST /api/live-sessions/sweep dan POST /api/enrollments/bulk menggunakan query batch", () => {
  const sweepCode = fs.readFileSync("src/app/api/live-sessions/sweep/route.js", "utf8");
  assert.strictEqual(
    sweepCode.includes("= ANY(") || sweepCode.includes("ANY($"),
    true,
    "live-sessions/sweep harus memperbarui status sesi secara batch menggunakan ANY($1)"
  );

  const bulkCode = fs.readFileSync("src/app/api/enrollments/bulk/route.js", "utf8");
  assert.strictEqual(
    bulkCode.includes("unnest(") || bulkCode.includes("unnest($"),
    true,
    "enrollments/bulk harus mendaftarkan peserta secara batch menggunakan unnest()"
  );
});

test("API route master mendukung paginasi (page, limit, total)", () => {
  const instructorsCode = fs.readFileSync("src/app/api/instructors/route.js", "utf8");
  assert.strictEqual(
    instructorsCode.includes("page") && instructorsCode.includes("limit") && instructorsCode.includes("offset"),
    true,
    "/api/instructors harus mendukung parameter paginasi page, limit, offset"
  );

  const orgsCode = fs.readFileSync("src/app/api/organizations/route.js", "utf8");
  assert.strictEqual(
    orgsCode.includes("page") && orgsCode.includes("limit") && orgsCode.includes("offset"),
    true,
    "/api/organizations harus mendukung parameter paginasi page, limit, offset"
  );

  const ticketsCode = fs.readFileSync("src/app/api/support-tickets/route.js", "utf8");
  assert.strictEqual(
    ticketsCode.includes("page") && ticketsCode.includes("limit") && ticketsCode.includes("offset"),
    true,
    "/api/support-tickets harus mendukung parameter paginasi page, limit, offset"
  );

  const qBankCode = fs.readFileSync("src/app/api/question-bank/route.js", "utf8");
  assert.strictEqual(
    qBankCode.includes("page") && qBankCode.includes("limit") && qBankCode.includes("offset"),
    true,
    "/api/question-bank harus mendukung parameter paginasi page, limit, offset"
  );
});
