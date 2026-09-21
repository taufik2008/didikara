/**
 * PUT    /api/question-bank/[id]  — update soal
 * DELETE /api/question-bank/[id]  — hapus soal
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

import { canManageCourse } from "@/lib/courseAccess";

/** Kursus pemilik sebuah soal — dasar pemeriksaan kewenangan. */
async function kursusSoal(id) {
  const { rows: [soal] } = await query("SELECT course_id FROM question_bank WHERE id = $1", [id]);
  return soal?.course_id ?? null;
}

const updateSchema = z.object({
  question:   z.string().min(3).optional(),
  options:    z.array(z.string().min(1)).length(4).optional(),
  correct:    z.number().int().min(0).max(3).optional(),
  category:   z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

export async function PUT(request, { params }) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const courseId = await kursusSoal(id);
  if (!courseId) return NextResponse.json({ success: false, error: "Soal tidak ditemukan" }, { status: 404 });
  if (!(await canManageCourse(user, courseId))) {
    return NextResponse.json({ success: false, error: "Anda bukan pengajar kursus ini" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data = parsed.data;
  const fields = [];
  const values = [];
  let idx = 1;

  if (data.question  !== undefined) { fields.push(`question = $${idx++}`);   values.push(data.question); }
  if (data.options   !== undefined) { fields.push(`options = $${idx++}`);    values.push(JSON.stringify(data.options)); }
  if (data.correct   !== undefined) { fields.push(`correct = $${idx++}`);    values.push(data.correct); }
  if (data.category  !== undefined) { fields.push(`category = $${idx++}`);   values.push(data.category); }
  if (data.difficulty !== undefined) { fields.push(`difficulty = $${idx++}`); values.push(data.difficulty); }

  if (fields.length === 0) {
    return NextResponse.json({ success: false, error: "Tidak ada field yang diupdate" }, { status: 400 });
  }

  values.push(id);
  try {
    const result = await query(
      `UPDATE question_bank SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Soal tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ success: true, question: result.rows[0] });
  } catch {
    return NextResponse.json({ success: false, error: "Gagal mengupdate soal" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const courseId = await kursusSoal(id);
  if (!courseId) return NextResponse.json({ success: false, error: "Soal tidak ditemukan" }, { status: 404 });
  if (!(await canManageCourse(user, courseId))) {
    return NextResponse.json({ success: false, error: "Anda bukan pengajar kursus ini" }, { status: 403 });
  }

  try {
    const result = await query("DELETE FROM question_bank WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Soal tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Gagal menghapus soal" }, { status: 500 });
  }
}
