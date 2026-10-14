export const dynamic = "force-dynamic";
export const revalidate = 0;

import LandingPage from "@/components/Landing/LandingPage";
import { query } from "@/lib/db";

/**
 * Landing Page Publik DIDIKARA
 * Server-rendered secara dinamis dari database PostgreSQL agar kursus yang baru
 * dibuat atau diubah langsung muncul seketika di landing page.
 */
export default async function Home() {
  let serverCourses = [];
  let serverCategories = [];
  let serverLevels = [];

  try {
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
      WHERE c.deleted_at IS NULL
      ORDER BY c.id ASC
    `);

    serverCourses = (rawCourses || []).map((row) => {
      let quiz = typeof row.quiz === "string" ? JSON.parse(row.quiz) : (row.quiz || []);
      if (Array.isArray(quiz)) {
        quiz = quiz.map(({ correct: _stripped, ...rest }) => rest);
      }
      let examSettings = row.exam_settings || {};
      if (typeof examSettings === "string") {
        try { examSettings = JSON.parse(examSettings); } catch {}
      }
      let instructor = row.instructor || null;
      if (typeof instructor === "string") {
        try { instructor = JSON.parse(instructor); } catch {}
      }
      let features = row.features || [];
      if (typeof features === "string") {
        try { features = JSON.parse(features); } catch {}
      }
      let modules = row.modules || [];
      if (typeof modules === "string") {
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

    const { rows: cats } = await query("SELECT key, name FROM categories ORDER BY name ASC");
    const { rows: lvls } = await query("SELECT key, name FROM levels ORDER BY name ASC");
    serverCategories = cats || [];
    serverLevels = lvls || [];
  } catch (err) {
    console.error("Home server fetch failed:", err);
  }

  return (
    <LandingPage
      initialCourses={serverCourses.length > 0 ? serverCourses : undefined}
      initialCategories={serverCategories.length > 0 ? serverCategories : undefined}
      initialLevels={serverLevels.length > 0 ? serverLevels : undefined}
    />
  );
}
