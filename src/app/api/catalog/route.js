/**
 * GET /api/catalog?q=search&category=x&level=x&maxPrice=x&sort=rating
 * Public endpoint — tidak perlu login
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q         = searchParams.get("q") || "";
  const category  = searchParams.get("category") || "";
  const level     = searchParams.get("level") || "";
  const maxPrice  = parseInt(searchParams.get("maxPrice") || "0");
  const sort      = searchParams.get("sort") || "rating";
  const page      = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit     = Math.min(24, parseInt(searchParams.get("limit") || "12"));
  const offset    = (page - 1) * limit;

  try {
    // Kursus yang dihapus lunak tidak boleh muncul di katalog publik.
    const conditions = ["c.deleted_at IS NULL"];
    const params = [];

    if (q) { params.push(`%${q}%`); conditions.push(`(c.title ILIKE $${params.length} OR c.description ILIKE $${params.length})`); }
    if (category) { params.push(category); conditions.push(`c.category = $${params.length}`); }
    if (level)    { params.push(level);    conditions.push(`c.level = $${params.length}`); }
    if (maxPrice > 0) { params.push(maxPrice); conditions.push(`c.price <= $${params.length}`); }

    const where = `WHERE ${conditions.join(" AND ")}`;
    const orderMap = { rating: "avg_rating DESC", newest: "c.id DESC", price_asc: "c.price ASC", price_desc: "c.price DESC", popular: "enrollment_count DESC" };
    const orderBy  = orderMap[sort] || "avg_rating DESC";

    params.push(limit, offset);
    const { rows: courses } = await query(`
      SELECT
        c.id, c.title, c.category, c.level, c.price, c.price_label, c.duration, c.badge,
        c.description,
        COALESCE(r.avg_rating, 0) AS avg_rating,
        COALESCE(r.review_count, 0) AS review_count,
        COALESCE(e.enrollment_count, 0) AS enrollment_count,
        CASE WHEN c.price = 0 THEN true ELSE false END AS is_free
      FROM courses c
      LEFT JOIN (
        SELECT course_id, ROUND(AVG(rating)::numeric,1) AS avg_rating, COUNT(*) AS review_count
        FROM course_reviews GROUP BY course_id
      ) r ON r.course_id = c.id
      LEFT JOIN (
        SELECT course_id, COUNT(*) AS enrollment_count FROM enrollments WHERE status='active' GROUP BY course_id
      ) e ON e.course_id = c.id
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    const countParams = params.slice(0, -2);
    const { rows: [{ count }] } = await query(
      `SELECT COUNT(*) FROM courses c ${where}`, countParams
    );

    // Categories & levels untuk filter
    const { rows: categories } = await query("SELECT key, name FROM categories ORDER BY name");
    const { rows: levels }     = await query("SELECT key, name FROM levels ORDER BY name");

    return NextResponse.json({ success: true, courses, total: parseInt(count), page, limit, categories, levels });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
