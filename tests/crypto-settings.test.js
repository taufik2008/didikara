// tests/crypto-settings.test.js
import test from "node:test";
import assert from "node:assert";

test("encryptValue and decryptValue can roundtrip sensitive credentials", async () => {
  const { encryptValue, decryptValue, maskSensitiveValue } = await import("../src/lib/crypto.js");
  const secret = "rahasia-smtp-12345!@#";
  const key = "01234567890123456789012345678901"; // 32-byte key

  const encrypted = encryptValue(secret, key);
  assert.notStrictEqual(encrypted, secret);
  assert.strictEqual(encrypted.startsWith("enc:"), true);

  const decrypted = decryptValue(encrypted, key);
  assert.strictEqual(decrypted, secret);

  const masked = maskSensitiveValue(secret);
  assert.strictEqual(masked, "••••••••");
});

test("decryptValue handles plaintext gracefully without error", async () => {
  const { decryptValue } = await import("../src/lib/crypto.js");
  const plain = "my-plain-string";
  assert.strictEqual(decryptValue(plain, "any-key"), plain);
});
