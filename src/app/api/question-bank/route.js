/**
 * GET  /api/question-bank?courseId=c1&category=&difficulty=
 *   → { success, questions: [{id, question, options, correct, category, difficulty}] }
 * POST /api/question-bank
 *   body: { courseId, question, options:[str,str,str,str], correct:0-3, category, difficulty }
 *   → { success, question }
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

// Bank soal menentukan isi ujian sertifikasi: kewenangannya mengikuti
// penugasan pengajar per kursus, bukan peran. Lihat src/lib/courseAccess.js.
import { canManageCourse } from "@/lib/courseAccess";

const addSchema = z.object({
  courseId:   z.string().min(1),
  question:   z.string().min(3),
  options:    z.array(z.string().min(1)).length(4),
  correct:    z.number().int().min(0).max(3),
  category:   z.string().optional().default(""),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
});

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const courseId   = searchParams.get("courseId");
  const category   = searchParams.get("category") || "";
  const difficulty = searchParams.get("difficulty") || "";

  if (!courseId) return NextResponse.json({ success: false, error: "courseId wajib" }, { status: 400 });

  // Respons memuat kunci jawaban, jadi hanya pengelola kursus yang boleh baca.
  if (!(await canManageCourse(user, courseId))) {
    return NextResponse.json({ success: false, error: "Akses ditolak" }, { status: 403 });
  }

  const page       = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit      = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const offset     = (page - 1) * limit;

  try {
    let countSql = "SELECT COUNT(*) AS count FROM question_bank WHERE course_id = $1";
    const countParams = [courseId];
    if (category) { countSql += ` AND category = $${countParams.length + 1}`; countParams.push(category); }
    if (difficulty) { countSql += ` AND difficulty = $${countParams.length + 1}`; countParams.push(difficulty); }
    const { rows: [{ count: totalCount }] } = await query(countSql, countParams);

    let sql = "SELECT id, question, options, correct, category, difficulty, created_at FROM question_bank WHERE course_id = $1";
    const params = [courseId];

    if (category) { sql += ` AND category = $${params.length + 1}`; params.push(category); }
    if (difficulty) { sql += ` AND difficulty = $${params.length + 1}`; params.push(difficulty); }
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    return NextResponse.json({
      success: true,
      questions: result.rows,
      total: parseInt(totalCount, 10),
      page,
      limit,
    });
  } catch {
    return NextResponse.json({ success: false, error: "DB tidak tersedia" }, { status: 503 });
  }
}

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { courseId, question, options, correct, category, difficulty } = parsed.data;

  if (!(await canManageCourse(user, courseId))) {
    return NextResponse.json({ success: false, error: "Anda bukan pengajar kursus ini" }, { status: 403 });
  }

  try {
    const result = await query(
      `INSERT INTO question_bank (course_id, question, options, correct, category, difficulty)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, question, options, correct, category, difficulty, created_at`,
      [courseId, question, JSON.stringify(options), correct, category, difficulty]
    );
    return NextResponse.json({ success: true, question: result.rows[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Gagal menyimpan soal" }, { status: 500 });
  }
}
