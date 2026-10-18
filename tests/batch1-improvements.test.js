import test from "node:test";
import assert from "node:assert/strict";
import { getDbConfig } from "../src/lib/db.js";
import { POST as registerPost } from "../src/app/api/auth/register/route.js";
import { POST as loginPost } from "../src/app/api/auth/login/route.js";
import { createScorm12Adapter } from "../src/lib/scormRuntime.js";

test("getDbConfig: mengoptimalkan pool dan timeout untuk serverless Vercel", () => {
  const prevVercel = process.env.VERCEL;
  const prevPoolMax = process.env.DB_POOL_MAX;

  try {
    // 1. Lingkungan Vercel Serverless tanpa override DB_POOL_MAX
    process.env.VERCEL = "1";
    delete process.env.DB_POOL_MAX;

    const serverlessConfig = getDbConfig();
    assert.equal(serverlessConfig.max, 3, "Di Vercel serverless default pool max harus 3");
    assert.equal(serverlessConfig.idleTimeoutMillis, 10000, "Idle timeout serverless harus 10 detik");

    // 2. Lingkungan Vercel dengan override DB_POOL_MAX eksplisit
    process.env.DB_POOL_MAX = "5";
    const customConfig = getDbConfig();
    assert.equal(customConfig.max, 5, "Harus menghormati DB_POOL_MAX eksplisit");

    // 3. Lingkungan Non-Serverless (Standard Node.js)
    delete process.env.VERCEL;
    delete process.env.DB_POOL_MAX;
    const standardConfig = getDbConfig();
    assert.equal(standardConfig.max, 10, "Di standard server pool max default 10");
    assert.equal(standardConfig.idleTimeoutMillis, 30000, "Idle timeout non-serverless default 30 detik");
  } finally {
    if (prevVercel !== undefined) process.env.VERCEL = prevVercel;
    else delete process.env.VERCEL;
    if (prevPoolMax !== undefined) process.env.DB_POOL_MAX = prevPoolMax;
    else delete process.env.DB_POOL_MAX;
  }
});

test("POST /api/auth/register: menolak bot spam saat field honeypot terisi", async () => {
  const reqWithHoneypot = new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "bot_spammer@example.com",
      password: "SecretPassword123",
      fullname: "Spam Bot",
      privacyConsent: true,
      website_url: "http://spam-link.ru", // Bot mengisi field honeypot
    }),
  });

  const res = await registerPost(reqWithHoneypot);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /Spam bot request terdeteksi/);
});

test("POST /api/auth/login: menolak bot spam saat field honeypot terisi", async () => {
  const reqWithHoneypot = new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "bot@example.com",
      password: "password123",
      honeypot: "automated_fill",
    }),
  });

  const res = await loginPost(reqWithHoneypot);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /Spam bot request terdeteksi/);
});

test("createScorm12Adapter: adapter SCORM 1.2 runtime berfungsi dan memicu callback commit", () => {
  let committedData = null;

  const adapter = createScorm12Adapter({
    userId: "test-user-1",
    userName: "Budi Test",
    lessonId: "modul-scorm-1",
    onCommit: (data) => {
      committedData = data;
    },
  });

  assert.equal(adapter.LMSInitialize(""), "true");
  assert.equal(adapter.LMSGetValue("cmi.core.student_name"), "Budi Test");

  // Set lesson status completed & score
  assert.equal(adapter.LMSSetValue("cmi.core.lesson_status", "completed"), "true");
  assert.equal(adapter.LMSSetValue("cmi.core.score.raw", "95"), "true");
  assert.equal(adapter.LMSCommit(""), "true");

  assert.ok(committedData, "onCommit harus terpanggil");
  assert.equal(committedData["cmi.core.lesson_status"], "completed");
  assert.equal(committedData["cmi.core.score.raw"], "95");

  assert.equal(adapter.LMSFinish(""), "true");
});
