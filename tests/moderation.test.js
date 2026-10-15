import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

test("Database schema mendefinisikan kolom moderasi pada forum_posts dan course_reviews", () => {
  const dbCode = fs.readFileSync("src/lib/db.js", "utf8");

  assert.strictEqual(
    dbCode.includes("ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS status") ||
    dbCode.includes("status VARCHAR(20) NOT NULL DEFAULT 'approved'"),
    true,
    "forum_posts harus memiliki kolom status untuk moderasi"
  );
  assert.strictEqual(
    dbCode.includes("ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS report_count") ||
    dbCode.includes("report_count INT NOT NULL DEFAULT 0"),
    true,
    "forum_posts harus memiliki kolom report_count"
  );
  assert.strictEqual(
    dbCode.includes("ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS status") ||
    dbCode.includes("status VARCHAR(20) NOT NULL DEFAULT 'approved'"),
    true,
    "course_reviews harus memiliki kolom status untuk moderasi"
  );
  assert.strictEqual(
    dbCode.includes("ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS report_count") ||
    dbCode.includes("report_count INT NOT NULL DEFAULT 0"),
    true,
    "course_reviews harus memiliki kolom report_count"
  );
});

test("Route /api/forum mendukung pelaporan konten (report) dan moderasi admin (PATCH)", () => {
  const forumCode = fs.readFileSync("src/app/api/forum/route.js", "utf8");

  assert.strictEqual(
    forumCode.includes("export async function PATCH"),
    true,
    "/api/forum harus mengekspor fungsi PATCH untuk moderasi"
  );
  assert.strictEqual(
    forumCode.includes("report") && forumCode.includes("report_count"),
    true,
    "PATCH /api/forum harus menangani aksi report dan menambah report_count"
  );
  assert.strictEqual(
    forumCode.includes("moderate") && (forumCode.includes("admin") || forumCode.includes("user.role")),
    true,
    "PATCH /api/forum harus mengizinkan admin melakukan tindakan moderasi status"
  );
  assert.strictEqual(
    forumCode.includes("hidden") && (forumCode.includes("!= 'hidden'") || forumCode.includes("<> 'hidden'")),
    true,
    "GET /api/forum harus menyembunyikan post yang berstatus hidden dari peserta"
  );
});

test("Route /api/reviews mendukung pelaporan ulasan dan moderasi admin (PATCH)", () => {
  const reviewCode = fs.readFileSync("src/app/api/reviews/route.js", "utf8");

  assert.strictEqual(
    reviewCode.includes("export async function PATCH"),
    true,
    "/api/reviews harus mengekspor fungsi PATCH untuk moderasi"
  );
  assert.strictEqual(
    reviewCode.includes("report") && reviewCode.includes("report_count"),
    true,
    "PATCH /api/reviews harus menangani aksi report dan menambah report_count"
  );
  assert.strictEqual(
    reviewCode.includes("moderate") && (reviewCode.includes("admin") || reviewCode.includes("user.role")),
    true,
    "PATCH /api/reviews harus mengizinkan admin memoderasi review ke approved/hidden"
  );
  assert.strictEqual(
    reviewCode.includes("hidden") && (reviewCode.includes("!= 'hidden'") || reviewCode.includes("<> 'hidden'")),
    true,
    "GET /api/reviews harus mengecualikan ulasan berstatus hidden dari tampilan dan rating agregat"
  );
});
