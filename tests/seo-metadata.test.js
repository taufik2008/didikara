import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

test("Next.js sitemap dan robots generator tersedia untuk katalog publik", () => {
  assert.strictEqual(
    fs.existsSync("src/app/sitemap.js"),
    true,
    "src/app/sitemap.js harus tersedia"
  );
  assert.strictEqual(
    fs.existsSync("src/app/robots.js"),
    true,
    "src/app/robots.js harus tersedia"
  );

  const robotsCode = fs.readFileSync("src/app/robots.js", "utf8");
  assert.strictEqual(
    robotsCode.includes("sitemap"),
    true,
    "robots.js harus menautkan ke sitemap.xml"
  );
  assert.strictEqual(
    robotsCode.includes("/admin"),
    true,
    "robots.js harus membatasi crawling ke route /admin"
  );

  const sitemapCode = fs.readFileSync("src/app/sitemap.js", "utf8");
  assert.strictEqual(
    sitemapCode.includes("/legal/privasi"),
    true,
    "sitemap.js harus memuat route legal"
  );
});

test("Root layout memuat metadata Open Graph dan Twitter Card", () => {
  const layoutCode = fs.readFileSync("src/app/layout.js", "utf8");

  assert.strictEqual(
    layoutCode.includes("openGraph"),
    true,
    "layout.js harus mendefinisikan openGraph metadata"
  );
  assert.strictEqual(
    layoutCode.includes("siteName: \"DIDIKARA\"") || layoutCode.includes("siteName: 'DIDIKARA'"),
    true,
    "layout.js openGraph harus mendefinisikan siteName DIDIKARA"
  );
});
