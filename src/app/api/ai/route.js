/**
 * GET  /api/ai?type=recommend  — rekomendasi kursus AI
 * GET  /api/ai?type=analyze    — analisis gap kompetensi
 * POST /api/ai                 — AI chat { message, history }
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { getRecommendations, chatWithAI, analyzeCompetency } from "@/lib/ai";

/**
 * mockReason bisa berisi badan error mentah dari Gemini (sisa kuota, status
 * kunci, nama model). Itu detail operasional — hanya admin yang boleh melihat;
 * pengguna biasa cukup tahu jawabannya simulasi. Log server tetap lengkap.
 */
function sanitizeMock(result, role) {
  if (!result?.mock) return result;
  if (role === "admin") return result;
  return { ...result, mockReason: "Layanan AI sedang tidak tersedia" };
}

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "recommend";

  try {
    // Ambil data user lengkap
    const { rows: [userData] } = await query("SELECT * FROM users WHERE email = $1", [user.email]);
    const { rows: enrolled } = await query(
      `SELECT c.id, c.title, c.category FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.user_email = $1 AND e.status = 'active'`, [user.email]
    );
    const { rows: allCourses } = await query(
      "SELECT id, title, category, level FROM courses LIMIT 20"
    );

    if (type === "recommend") {
      const result = await getRecommendations({
        userEmail: user.email,
        role: user.role,
        organization: userData?.organization,
        completedCourses: enrolled,
        competencies: typeof userData?.competencies === 'string'
          ? JSON.parse(userData.competencies) : userData?.competencies,
        availableCourses: allCourses.filter(c => !enrolled.find(e => e.id === c.id)),
      });

      // Log ke DB
      await query(
        `INSERT INTO ai_interactions (user_email, type, prompt, response)
         VALUES ($1, 'recommend', $2, $3)`,
        [user.email, "course_recommendation", JSON.stringify(result.recommendations)]
      ).catch(() => {});

      return NextResponse.json({ success: true, ...sanitizeMock(result, user.role) });
    }

    if (type === "analyze") {
      const comp = typeof userData?.competencies === 'string'
        ? JSON.parse(userData.competencies) : (userData?.competencies || {});

      const result = await analyzeCompetency({
        userEmail: user.email,
        role: user.role,
        currentScores: comp.current || [],
        targetScores:  comp.target  || [],
        completedCourses: enrolled,
      });

      await query(
        `INSERT INTO ai_interactions (user_email, type, prompt, response)
         VALUES ($1, 'analyze', $2, $3)`,
        [user.email, "competency_analysis", JSON.stringify(result)]
      ).catch(() => {});

      return NextResponse.json({ success: true, ...sanitizeMock(result, user.role) });
    }

    return NextResponse.json({ error: "type tidak valid" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message, history, courseId } = await request.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "message wajib" }, { status: 400 });
  }

  try {
    const { rows: [userData] } = await query("SELECT fullname, role, organization FROM users WHERE email = $1", [user.email]);

    const result = await chatWithAI({
      userMessage: message,
      userContext: {
        name: userData?.fullname,
        role: user.role,
        organization: userData?.organization,
        courseId,
      },
      history: history || [],
    });

    await query(
      `INSERT INTO ai_interactions (user_email, type, prompt, response, course_id)
       VALUES ($1, 'chat', $2, $3, $4)`,
      [user.email, message, result.response, courseId || null]
    ).catch(() => {});

    return NextResponse.json({ success: true, ...sanitizeMock(result, user.role) });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
