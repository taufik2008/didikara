import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

test("Halaman legalitas Kebijakan Privasi dan Syarat & Ketentuan tersedia", () => {
  assert.strictEqual(
    fs.existsSync("src/app/legal/layout.js"),
    true,
    "src/app/legal/layout.js harus tersedia"
  );
  assert.strictEqual(
    fs.existsSync("src/app/legal/privasi/page.js"),
    true,
    "src/app/legal/privasi/page.js harus tersedia"
  );
  assert.strictEqual(
    fs.existsSync("src/app/legal/syarat-ketentuan/page.js"),
    true,
    "src/app/legal/syarat-ketentuan/page.js harus tersedia"
  );

  const privasiCode = fs.readFileSync("src/app/legal/privasi/page.js", "utf8");
  assert.strictEqual(
    privasiCode.includes("Undang-Undang") || privasiCode.includes("UU PDP") || privasiCode.includes("Pelindungan Data Pribadi"),
    true,
    "Halaman privasi harus mencantumkan kepatuhan UU Pelindungan Data Pribadi (PDP)"
  );

  const syaratCode = fs.readFileSync("src/app/legal/syarat-ketentuan/page.js", "utf8");
  assert.strictEqual(
    syaratCode.includes("Syarat") && syaratCode.includes("DIDIKARA"),
    true,
    "Halaman syarat ketentuan harus mencakup regulasi layanan DIDIKARA"
  );
});

test("LandingPage footer menautkan ke halaman legal resmi", () => {
  const landingCode = fs.readFileSync("src/components/Landing/LandingPage.js", "utf8");
  assert.strictEqual(
    landingCode.includes("/legal/syarat-ketentuan"),
    true,
    "LandingPage footer harus menautkan ke /legal/syarat-ketentuan"
  );
  assert.strictEqual(
    landingCode.includes("/legal/privasi"),
    true,
    "LandingPage footer harus menautkan ke /legal/privasi"
  );
});
