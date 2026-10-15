import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

test("Database schema mendefinisikan tabel training_assignments", () => {
  const dbCode = fs.readFileSync("src/lib/db.js", "utf8");

  assert.strictEqual(
    dbCode.includes("CREATE TABLE IF NOT EXISTS training_assignments"),
    true,
    "db.js harus memiliki migrasi tabel training_assignments"
  );
  assert.strictEqual(
    dbCode.includes("due_date"),
    true,
    "training_assignments harus memiliki kolom due_date"
  );
  assert.strictEqual(
    dbCode.includes("is_mandatory"),
    true,
    "training_assignments harus memiliki kolom is_mandatory"
  );
  assert.strictEqual(
    dbCode.includes("completed_at"),
    true,
    "training_assignments harus memiliki kolom completed_at"
  );
});

test("API route training-assignments menangani penugasan kursus dan tracking kepatuhan", () => {
  assert.strictEqual(
    fs.existsSync("src/app/api/training-assignments/route.js"),
    true,
    "src/app/api/training-assignments/route.js harus tersedia"
  );

  const routeCode = fs.readFileSync("src/app/api/training-assignments/route.js", "utf8");

  assert.strictEqual(
    routeCode.includes("training_assignments"),
    true,
    "route harus berinteraksi dengan tabel training_assignments"
  );
  assert.strictEqual(
    routeCode.includes("complianceRate") || routeCode.includes("compliance"),
    true,
    "route harus menghitung metrik kepatuhan (compliance rate) untuk HR/Admin"
  );
  assert.strictEqual(
    routeCode.includes("catatAudit"),
    true,
    "route harus mencatat aktivitas penugasan ke audit log"
  );
});
