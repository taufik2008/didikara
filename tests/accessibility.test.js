import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

test("PaymentHistoryPanel menggunakan semantik button untuk filter pills", () => {
  const code = fs.readFileSync("src/components/Admin/PaymentHistoryPanel.js", "utf8");

  assert.strictEqual(
    code.includes('<button type="button" key={f.key} className={`filter-pill'),
    true,
    "PaymentHistoryPanel filter-pill harus menggunakan tag semantik <button type='button'>"
  );
});

test("LandingPage modal paket pelatihan memiliki role='button' dan keyboard listener", () => {
  const code = fs.readFileSync("src/components/Landing/LandingPage.js", "utf8");

  assert.strictEqual(
    code.includes('role="button"'),
    true,
    "LandingPage kartu paket modal harus memiliki atribut role='button'"
  );
  assert.strictEqual(
    code.includes('tabIndex={0}'),
    true,
    "LandingPage kartu paket modal harus memiliki tabIndex={0} agar fokus keyboard berfungsi"
  );
  assert.strictEqual(
    code.includes("onKeyDown"),
    true,
    "LandingPage kartu paket modal harus memiliki penanganan tombol keyboard (onKeyDown)"
  );
});

test("NotificationCenter item interaktif dapat diakses melalui keyboard", () => {
  const code = fs.readFileSync("src/components/Notifications/NotificationCenter.js", "utf8");

  assert.strictEqual(
    code.includes('role="button"'),
    true,
    "NotificationCenter item harus memiliki role='button'"
  );
  assert.strictEqual(
    code.includes("tabIndex={0}"),
    true,
    "NotificationCenter item harus memiliki tabIndex={0}"
  );
  assert.strictEqual(
    code.includes("onKeyDown"),
    true,
    "NotificationCenter item harus menangani onKeyDown untuk aktivasi keyboard"
  );
});
