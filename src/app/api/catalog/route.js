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
  const limit     = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "100")));
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
    const orderMap = {
      rating: "avg_rating DESC, c.id ASC",
      newest: "c.id DESC",
      price_asc: "c.price ASC",
      price_desc: "c.price DESC",
      popular: "enrollment_count DESC"
    };
    const orderBy = orderMap[sort] || "avg_rating DESC, c.id ASC";

    params.push(limit, offset);
    const { rows: rawCourses } = await query(`
      SELECT
        c.id, c.title, c.category, c.level, c.price, c.price_label, c.duration, c.badge,
        c.description, c.image, c.instructor, c.modules, c.quiz, c.exam_settings,
        c.prerequisite_course_id,
        c.learning_type, c.type_label, c.venue, c.schedule, c.quota, c.features,
        COALESCE(c.rating, '5.0') AS rating,
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

    // Format fields agar persis sesuai struktur data Frontend AppContext & LandingPage
    const courses = rawCourses.map(row => {
      let quiz = typeof row.quiz === 'string' ? JSON.parse(row.quiz) : (row.quiz || []);
      if (Array.isArray(quiz)) {
        // Keamanan: buang kunci jawaban (field correct) dari endpoint publik
        quiz = quiz.map(({ correct: _stripped, ...rest }) => rest);
      }
      let examSettings = row.exam_settings || {};
      if (typeof examSettings === 'string') {
        try { examSettings = JSON.parse(examSettings); } catch {}
      }
      let instructor = row.instructor || null;
      if (typeof instructor === 'string') {
        try { instructor = JSON.parse(instructor); } catch {}
      }
      let features = row.features || [];
      if (typeof features === 'string') {
        try { features = JSON.parse(features); } catch {}
      }
      let modules = row.modules || [];
      if (typeof modules === 'string') {
        try { modules = JSON.parse(modules); } catch {}
      }

      const learningType = row.learning_type || (row.price === 0 ? "self_learning" : "online");
      const typeLabel = row.type_label || (
        learningType === "online" ? "Online (Live Webinar)" :
        learningType === "offline" ? "Offline (Tatap Muka)" :
        "Self-Learning (Belajar Mandiri)"
      );

      return {
        id: row.id,
        title: row.title,
        category: row.category,
        learningType,
        typeLabel,
        duration: row.duration,
        level: row.level,
        price: Number(row.price) || 0,
        priceLabel: row.price_label || (Number(row.price) === 0 ? "Gratis (Free)" : `Rp ${Number(row.price).toLocaleString("id-ID")}`),
        rating: row.rating || (row.avg_rating > 0 ? String(row.avg_rating) : "5.0"),
        badge: row.badge || "",
        image: row.image || "",
        venue: row.venue || "",
        schedule: row.schedule || "",
        quota: row.quota || "",
        features: Array.isArray(features) ? features : [],
        instructor: instructor && instructor.name ? instructor : null,
        desc: row.description || "",
        description: row.description || "",
        modules: Array.isArray(modules) ? modules : [],
        quiz: Array.isArray(quiz) ? quiz : [],
        examSettings: { timeLimit: 0, maxAttempts: 0, passingScore: 70, ...examSettings },
        prerequisiteCourseId: row.prerequisite_course_id || null,
        avgRating: row.avg_rating,
        reviewCount: row.review_count,
        enrollmentCount: row.enrollment_count,
        isFree: row.is_free,
      };
    });

    // Categories & levels untuk filter
    const { rows: categories } = await query("SELECT key, name FROM categories ORDER BY name");
    const { rows: levels }     = await query("SELECT key, name FROM levels ORDER BY name");

    return NextResponse.json({ success: true, courses, total: parseInt(count), page, limit, categories, levels });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
