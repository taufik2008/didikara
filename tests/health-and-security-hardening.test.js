import test from "node:test";
import assert from "node:assert/strict";
import { GET as healthGet } from "../src/app/api/health/route.js";
import { POST as registerPost } from "../src/app/api/auth/register/route.js";

test("GET /api/health menyajikan Tiered Health Check (tanpa kebocoran data untuk publik)", async () => {
  const secret = "test-health-secret-key-2026";
  process.env.HEALTH_CHECK_SECRET = secret;

  try {
    // ─── Skenario A: Database Terhubung Normal (HTTP 200) ────────────────────
    global._mockDbQuery = async () => ({ rows: [{ "?column?": 1 }] });

    // 1. Panggilan publik (tanpa secret header)
    const publicReq = new Request("http://localhost:3000/api/health", { method: "GET" });
    const publicRes = await healthGet(publicReq);
    assert.equal(publicRes.status, 200);

    const publicData = await publicRes.json();
    assert.equal(publicData.status, "ok");
    assert.ok(publicData.timestamp, "Harus menyertakan timestamp");
    assert.equal(publicData.user_count, undefined, "user_count tidak boleh dibocorkan ke publik");
    assert.equal(publicData.data, undefined, "data baris user tidak boleh dibocorkan ke publik");
    assert.equal(publicData.environment, undefined, "variabel lingkungan tidak boleh dibocorkan ke publik");
    assert.equal(publicData.diagnostic, undefined, "objek diagnostic tidak boleh dibocorkan ke publik");

    // 2. Panggilan internal dengan secret header yang valid
    const authReq = new Request("http://localhost:3000/api/health", {
      method: "GET",
      headers: { "x-health-secret": secret },
    });
    const authRes = await healthGet(authReq);
    assert.equal(authRes.status, 200);

    const authData = await authRes.json();
    assert.equal(authData.status, "ok");
    assert.ok(authData.diagnostic, "Harus menyertakan objek diagnostic untuk pemanggil resmi");
    assert.equal(authData.diagnostic.database, "connected");
    assert.ok(typeof authData.diagnostic.latency_ms === "number", "Harus menyertakan metrik latensi ms");
    assert.ok(authData.diagnostic.environment, "Harus menyertakan info environment di diagnostik resmi");

    // ─── Skenario B: Database Gagal / Terputus (HTTP 503) ───────────────────
    global._mockDbQuery = async () => {
      throw new Error("Simulated connection timeout");
    };

    // 1. Publik saat DB down (harus 503 dan tetap tidak bocor)
    const publicDownRes = await healthGet(new Request("http://localhost:3000/api/health", { method: "GET" }));
    assert.equal(publicDownRes.status, 503);
    const publicDownData = await publicDownRes.json();
    assert.equal(publicDownData.status, "degraded");
    assert.equal(publicDownData.diagnostic, undefined, "Error detail tidak boleh bocor ke publik saat down");

    // 2. Authorized saat DB down (harus 503 dengan detail diagnostic error)
    const authDownRes = await healthGet(new Request("http://localhost:3000/api/health", {
      method: "GET",
      headers: { "x-health-secret": secret },
    }));
    assert.equal(authDownRes.status, 503);
    const authDownData = await authDownRes.json();
    assert.equal(authDownData.status, "degraded");
    assert.equal(authDownData.diagnostic.database, "disconnected");
    assert.match(authDownData.diagnostic.error, /Simulated connection timeout/);
  } finally {
    delete global._mockDbQuery;
  }
});

test("POST /api/auth/register menegakkan kebijakan password minimal 8 karakter dengan kombinasi huruf dan angka", async () => {
  // 1. Password hanya angka (lemah) -> ditolak 400 Bad Request
  const reqOnlyNumber = new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "test_weak1@ailms.id",
      password: "12345678",
      fullname: "User Lemah Angka",
      privacyConsent: true,
    }),
  });
  const res1 = await registerPost(reqOnlyNumber);
  assert.equal(res1.status, 400);
  const data1 = await res1.json();
  assert.match(data1.error, /huruf.*angka|kombinasi/i);

  // 2. Password hanya huruf (lemah) -> ditolak 400 Bad Request
  const reqOnlyLetters = new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "test_weak2@ailms.id",
      password: "abcdefghi",
      fullname: "User Lemah Huruf",
      privacyConsent: true,
    }),
  });
  const res2 = await registerPost(reqOnlyLetters);
  assert.equal(res2.status, 400);
  const data2 = await res2.json();
  assert.match(data2.error, /huruf.*angka|kombinasi/i);

  // 3. Password kurang dari 8 karakter -> ditolak 400 Bad Request
  const reqShort = new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "test_short@ailms.id",
      password: "abc12",
      fullname: "User Pendek",
      privacyConsent: true,
    }),
  });
  const res3 = await registerPost(reqShort);
  assert.equal(res3.status, 400);
});
