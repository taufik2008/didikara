import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

test("Database schema mendefinisikan tabel ai_planner_results", () => {
  const dbCode = fs.readFileSync("src/lib/db.js", "utf8");

  assert.strictEqual(
    dbCode.includes("CREATE TABLE IF NOT EXISTS ai_planner_results"),
    true,
    "db.js harus memiliki migrasi tabel ai_planner_results"
  );
  assert.strictEqual(
    dbCode.includes("gap_analysis"),
    true,
    "ai_planner_results harus memiliki kolom gap_analysis"
  );
  assert.strictEqual(
    dbCode.includes("recommendations"),
    true,
    "ai_planner_results harus memiliki kolom recommendations"
  );
});

test("Route ai-planner mendukung penyimpanan hasil dan GET history", () => {
  const routeCode = fs.readFileSync("src/app/api/ai-planner/route.js", "utf8");

  assert.strictEqual(
    routeCode.includes("export async function GET"),
    true,
    "ai-planner/route.js harus mengekspor fungsi GET untuk mengambil riwayat perencanaan"
  );
  assert.strictEqual(
    routeCode.includes("ai_planner_results"),
    true,
    "ai-planner/route.js harus berinteraksi dengan tabel ai_planner_results"
  );
});
