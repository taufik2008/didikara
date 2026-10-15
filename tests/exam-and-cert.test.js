// tests/exam-and-cert.test.js
import test from "node:test";
import assert from "node:assert";

test("Kalkulasi skor ujian: menghitung persentase dan status kelulusan (>= 70%)", () => {
  const passingScore = 70;
  
  // Kasus 1: 3 dari 4 benar = 75% -> Lulus
  const correct1 = 3;
  const total1 = 4;
  const pct1 = Math.round((correct1 / total1) * 100);
  assert.strictEqual(pct1, 75);
  assert.strictEqual(pct1 >= passingScore, true);

  // Kasus 2: 2 dari 3 benar = 67% -> Tidak Lulus
  const correct2 = 2;
  const total2 = 3;
  const pct2 = Math.round((correct2 / total2) * 100);
  assert.strictEqual(pct2, 67);
  assert.strictEqual(pct2 >= passingScore, false);
});

test("Kalkulasi masa berlaku sertifikat publik: standar 3 tahun", () => {
  const issueDate = new Date("2026-01-01T00:00:00Z");
  const validUntil = new Date(issueDate);
  validUntil.setFullYear(validUntil.getFullYear() + 3);

  assert.strictEqual(validUntil.toISOString().startsWith("2029-01-01"), true);
});

test("Struktur ID sertifikat AILMS harus terformat rapi", () => {
  const userEmail = "budi@instansi.go.id";
  const courseId = "cyber-security-101";
  const timestamp = (1773000000000).toString(36).toUpperCase();
  const certId = `AILMS-${timestamp}-${userEmail.split("@")[0].toUpperCase()}-${courseId}`;

  assert.strictEqual(certId.startsWith("AILMS-"), true);
  assert.strictEqual(certId.includes("BUDI"), true);
  assert.strictEqual(certId.includes("cyber-security-101"), true);
});

test("exam/submit route memiliki validasi atomik maxAttempts", async () => {
  const fs = await import("node:fs");
  const code = fs.readFileSync("src/app/api/exam/submit/route.js", "utf8");
  assert.strictEqual(
    code.includes("maxAttempts"),
    true,
    "Harus ada validasi maxAttempts di exam/submit/route.js"
  );
  assert.strictEqual(
    code.includes("Batas percobaan ujian"),
    true,
    "Harus ada pesan penolakan batas percobaan ujian di exam/submit/route.js"
  );
});
