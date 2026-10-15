import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("G.2: Next.js App Router mendefinisikan Root & App Error Boundaries, Not Found, dan Loading states", () => {
  const rootErrorPath = path.resolve(process.cwd(), "src/app/error.js");
  const rootNotFoundPath = path.resolve(process.cwd(), "src/app/not-found.js");
  const rootLoadingPath = path.resolve(process.cwd(), "src/app/loading.js");
  const appErrorPath = path.resolve(process.cwd(), "src/app/(app)/error.js");
  const appLoadingPath = path.resolve(process.cwd(), "src/app/(app)/loading.js");

  assert.ok(fs.existsSync(rootErrorPath), "src/app/error.js harus tersedia");
  assert.ok(fs.existsSync(rootNotFoundPath), "src/app/not-found.js harus tersedia");
  assert.ok(fs.existsSync(rootLoadingPath), "src/app/loading.js harus tersedia");
  assert.ok(fs.existsSync(appErrorPath), "src/app/(app)/error.js harus tersedia");
  assert.ok(fs.existsSync(appLoadingPath), "src/app/(app)/loading.js harus tersedia");

  // Error boundary di Next.js App Router WAJIB berupa Client Component ('use client')
  const rootErrorContent = fs.readFileSync(rootErrorPath, "utf-8");
  assert.match(rootErrorContent, /['"]use client['"]/, "src/app/error.js harus Client Component ('use client')");
  assert.match(rootErrorContent, /reset/, "src/app/error.js harus menerima prop reset");

  const appErrorContent = fs.readFileSync(appErrorPath, "utf-8");
  assert.match(appErrorContent, /['"]use client['"]/, "src/app/(app)/error.js harus Client Component ('use client')");
  assert.match(appErrorContent, /reset/, "src/app/(app)/error.js harus menerima prop reset");

  const notFoundContent = fs.readFileSync(rootNotFoundPath, "utf-8");
  assert.match(notFoundContent, /404|Tidak Ditemukan/i, "Halaman not-found harus memiliki indikasi 404 / Tidak Ditemukan");
  assert.match(notFoundContent, /href/i, "Halaman not-found harus memiliki tautan navigasi");
});

test("G.1: globals.css mencakup breakpoint komprehensif mobile & responsive safe area", () => {
  const cssPath = path.resolve(process.cwd(), "src/app/globals.css");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  assert.ok(cssContent.includes("@media (max-width: 640px)"), "globals.css harus mendukung breakpoint mobile 640px");
  assert.ok(cssContent.includes("@media (max-width: 480px)"), "globals.css harus mendukung breakpoint layar kecil 480px");
  assert.ok(cssContent.includes("safe-area-inset"), "globals.css harus memperhatikan safe-area-inset");
});
