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

test("LoginPage: Checkbox persetujuan UU PDP telah dihapus dari form pendaftaran", () => {
  const loginCode = fs.readFileSync("src/components/Login/LoginPage.js", "utf8");

  assert.strictEqual(
    loginCode.includes("DIDIKARA sesuai UU No. 27/2022 (UU PDP)"),
    false,
    "Checkbox UU PDP harus sudah dihapus dari form pendaftaran LoginPage"
  );
});
