import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

test("API register mewajibkan privacyConsent dan mencatat timestamp serta versi", () => {
  const registerCode = fs.readFileSync("src/app/api/auth/register/route.js", "utf8");

  assert.strictEqual(
    registerCode.includes("privacyConsent"),
    true,
    "register/route.js harus memeriksa field privacyConsent"
  );
  assert.strictEqual(
    registerCode.includes("privacy_consent_at"),
    true,
    "register/route.js harus menyimpan kolom privacy_consent_at ke database"
  );
  assert.strictEqual(
    registerCode.includes("privacy_policy_version"),
    true,
    "register/route.js harus menyimpan kolom privacy_policy_version ke database"
  );
});

test("LoginPage memiliki checkbox persetujuan kebijakan privasi pada form registrasi", () => {
  const loginCode = fs.readFileSync("src/components/Login/LoginPage.js", "utf8");

  assert.strictEqual(
    loginCode.includes("privacyConsent"),
    true,
    "LoginPage.js harus memiliki state dan validasi privacyConsent"
  );
  assert.strictEqual(
    loginCode.includes("/legal/privasi"),
    true,
    "LoginPage.js form registrasi harus menautkan ke /legal/privasi"
  );
  assert.strictEqual(
    loginCode.includes("/legal/syarat-ketentuan"),
    true,
    "LoginPage.js form registrasi harus menautkan ke /legal/syarat-ketentuan"
  );
});
