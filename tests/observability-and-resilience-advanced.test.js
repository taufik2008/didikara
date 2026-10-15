import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { checkRateLimit, checkRateLimitAsync } from "../src/lib/rateLimit.js";
import { captureException, initErrorTracking } from "../src/lib/errorTracker.js";

test("Next.js App Router mendefinisikan global-error.js dengan tag html dan body", () => {
  const globalErrorPath = path.resolve(process.cwd(), "src/app/global-error.js");
  assert.ok(fs.existsSync(globalErrorPath), "src/app/global-error.js harus tersedia");

  const content = fs.readFileSync(globalErrorPath, "utf-8");
  assert.match(content, /['"]use client['"]/, "global-error.js harus merupakan Client Component");
  assert.match(content, /<html/i, "global-error.js harus menyertakan elemen <html>");
  assert.match(content, /<body/i, "global-error.js harus menyertakan elemen <body>");
  assert.match(content, /reset/, "global-error.js harus menerima prop reset");
});

test("src/lib/errorTracker menyediakan pelacakan galat terpusat", async () => {
  assert.equal(typeof captureException, "function", "captureException harus fungsi");
  assert.equal(typeof initErrorTracking, "function", "initErrorTracking harus fungsi");

  // Harus menangani exception tanpa throw meski Sentry tidak dikonfigurasi
  const result = await captureException(new Error("Test crash tracking"), {
    tags: { test: true },
    user: { email: "tester@didikara.id" },
  });

  assert.ok(result, "captureException harus mengembalikan laporan error");
  assert.equal(result.handled, true, "handled harus bernilai true");
});

test("src/lib/rateLimit mendukung async rate limiting (Redis/Distributed ready) dengan backward-compatibility", async () => {
  // Verifikasi backward compatibility sync checkRateLimit
  assert.equal(typeof checkRateLimit, "function");
  const syncRes = checkRateLimit("test-sync-key", 2, 5000);
  assert.equal(typeof syncRes.limited, "boolean");

  // Verifikasi async checkRateLimitAsync
  assert.equal(typeof checkRateLimitAsync, "function");
  const asyncRes1 = await checkRateLimitAsync("test-async-key", 1, 5000);
  assert.equal(asyncRes1.limited, false);

  const asyncRes2 = await checkRateLimitAsync("test-async-key", 1, 5000);
  assert.equal(asyncRes2.limited, true);
  assert.ok(asyncRes2.retryAfter > 0);
});
