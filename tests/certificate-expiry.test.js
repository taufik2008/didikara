import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

test("Database schema mendefinisikan kolom valid_until pada tabel certificates", () => {
  const dbCode = fs.readFileSync("src/lib/db.js", "utf8");

  assert.strictEqual(
    dbCode.includes("ALTER TABLE certificates ADD COLUMN IF NOT EXISTS valid_until"),
    true,
    "db.js harus menambahkan kolom valid_until pada certificates"
  );
});

test("exam/submit route menyimpan valid_until dan memperbarui training_assignments", () => {
  const submitCode = fs.readFileSync("src/app/api/exam/submit/route.js", "utf8");

  assert.strictEqual(
    submitCode.includes("valid_until"),
    true,
    "exam/submit harus menyimpan valid_until saat menerbitkan sertifikat"
  );
  assert.strictEqual(
    submitCode.includes("training_assignments"),
    true,
    "exam/submit harus menandai completed_at pada training_assignments saat lulus ujian"
  );
});

test("API verify/[certId] memanfaatkan kolom valid_until dari basis data", () => {
  const verifyCode = fs.readFileSync("src/app/api/verify/[certId]/route.js", "utf8");

  assert.strictEqual(
    verifyCode.includes("c.valid_until"),
    true,
    "verify/[certId] route harus menyeleksi kolom c.valid_until"
  );
});
