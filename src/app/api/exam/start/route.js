/**
 * POST /api/exam/start
 * Memulai sesi ujian. Mengembalikan soal yang diacak (tanpa kunci jawaban)
 * dan examToken yang berisi jawaban benar di sisi server (signed JWT).
 *
 * Body: { courseId: string }
 * Response: { questions: [...], examToken: string }
 */

import { NextResponse } from "next/server";
import { authenticateRequest, signToken } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  courseId: z.string().min(1),
});

/** Fisher-Yates shuffle — returns new shuffled array + mapping from new index → original index */
function shuffleWithMap(arr) {
  const indices = arr.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return {
    shuffled: indices.map((origIdx) => arr[origIdx]),
    map: indices, // map[displayIdx] = originalIdx
  };
}

export async function POST(request) {
  try {
    // 1. Autentikasi
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 2. Validasi input
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "courseId wajib diisi" }, { status: 400 });
    }
    const { courseId } = parsed.data;

    // 3. Ambil kuis + exam_settings + prasyarat dari database
    let quiz, examSettings, prasyarat;
    try {
      const result = await query(
        "SELECT quiz, exam_settings, prerequisite_course_id FROM courses WHERE id = $1",
        [courseId]
      );
      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, error: "Kursus tidak ditemukan" }, { status: 404 });
      }
      quiz = result.rows[0].quiz;
      if (typeof quiz === "string") quiz = JSON.parse(quiz);
      examSettings = result.rows[0].exam_settings || {};
      if (typeof examSettings === "string") examSettings = JSON.parse(examSettings);
      prasyarat = result.rows[0].prerequisite_course_id || null;
    } catch {
      return NextResponse.json(
        { success: false, error: "Layanan sedang tidak tersedia. Coba lagi nanti." },
        { status: 503 }
      );
    }

    // ── 3a. Kelayakan menempuh ujian ─────────────────────────────────────────
    // Dulu endpoint ini hanya butuh sesi login yang sah dan sebuah courseId:
    // siapa pun bisa menempuh ujian kursus berbayar yang tidak pernah dibelinya
    // dan memperoleh sertifikat yang sah menurut sistem. Prasyarat kursus pun
    // hanya diperiksa di komponen React, jadi cukup dilangkahi dengan memanggil
    // API langsung. Admin dikecualikan supaya tetap bisa menguji soal.
    if (user.role !== "admin") {
      const { rows: terdaftar } = await query(
        "SELECT 1 FROM enrollments WHERE user_email = $1 AND course_id = $2 AND status = 'active'",
        [user.email, courseId]
      );
      if (terdaftar.length === 0) {
        return NextResponse.json({
          success: false,
          error: "Anda belum terdaftar di kursus ini. Selesaikan pendaftaran terlebih dahulu.",
        }, { status: 403 });
      }

      if (prasyarat) {
        const { rows: sertifikatPrasyarat } = await query(
          "SELECT 1 FROM certificates WHERE user_email = $1 AND course_id = $2",
          [user.email, prasyarat]
        );
        if (sertifikatPrasyarat.length === 0) {
          const { rows: [kursusPrasyarat] } = await query(
            "SELECT title FROM courses WHERE id = $1", [prasyarat]
          ).catch(() => ({ rows: [] }));
          return NextResponse.json({
            success: false,
            error: `Selesaikan dan lulus "${kursusPrasyarat?.title || prasyarat}" sebelum menempuh ujian ini.`,
          }, { status: 403 });
        }
      }
    }

    const maxAttempts = examSettings.maxAttempts || 0;
    const timeLimit   = examSettings.timeLimit   || 0; // menit, 0 = unlimited
    const passingScore = examSettings.passingScore || 70;

    // 3a. Cek batas jumlah percobaan
    if (maxAttempts > 0) {
      const attemptsResult = await query(
        "SELECT COUNT(*) FROM exam_attempts WHERE user_email = $1 AND course_id = $2",
        [user.email, courseId]
      );
      const totalAttempts = parseInt(attemptsResult.rows[0].count, 10);
      if (totalAttempts >= maxAttempts) {
        return NextResponse.json({
          success: false,
          error: `Batas percobaan ujian tercapai (${maxAttempts}x). Hubungi instruktur untuk tambahan percobaan.`,
          attemptsUsed: totalAttempts,
          maxAttempts,
        }, { status: 403 });
      }
    }

    // 3b. Coba ambil soal dari question_bank terlebih dahulu
    try {
      const bankResult = await query(
        "SELECT question AS q, options, correct, category, difficulty FROM question_bank WHERE course_id = $1 ORDER BY RANDOM()",
        [courseId]
      );
      if (bankResult.rows.length > 0) {
        // Gunakan soal dari bank (sudah teracak via ORDER BY RANDOM())
        quiz = bankResult.rows.map(r => ({
          q: r.q,
          options: typeof r.options === "string" ? JSON.parse(r.options) : r.options,
          correct: r.correct,
        }));
      }
    } catch { /* bank tidak tersedia, lanjut pakai quiz dari course */ }

    if (!Array.isArray(quiz) || quiz.length === 0) {
      return NextResponse.json({ success: false, error: "Kursus ini belum memiliki soal ujian." }, { status: 400 });
    }

    // 4. Acak urutan soal
    const { shuffled: shuffledQuestions, map: questionOrder } = shuffleWithMap(quiz);

    // 5. Untuk setiap soal, acak pilihan jawaban dan catat mapping
    const questionMeta = []; // Data untuk token (jawaban benar per soal)
    const clientQuestions = shuffledQuestions.map((q, displayQIdx) => {
      const originalQIdx = questionOrder[displayQIdx];
      const qText = q.q || q.question || "";
      const qType = q.type || (Array.isArray(q.correct) ? "multiple" : (q.options && q.options.length > 0 ? "single" : "essay"));

      if (qType === "essay") {
        questionMeta.push({
          originalQIdx,
          type: "essay",
          rubric: q.rubric || q.correct || "",
          correctDisplayIdx: typeof q.correct === "string" ? q.correct : "essay",
        });
        return {
          q: qText,
          type: "essay",
          rubric: q.rubric || "",
        };
      }

      const options = Array.isArray(q.options) ? q.options : (typeof q.options === "string" ? JSON.parse(q.options || "[]") : []);
      const { shuffled: shuffledOptions, map: optionMap } = shuffleWithMap(options);

      if (qType === "multiple") {
        const correctArr = Array.isArray(q.correct) ? q.correct : [Number(q.correct) || 0];
        const displayCorrectArr = correctArr.map(idx => optionMap.indexOf(idx)).filter(idx => idx !== -1).sort();
        questionMeta.push({
          originalQIdx,
          type: "multiple",
          optionMap,
          correctDisplayIdx: displayCorrectArr,
        });
        return {
          q: qText,
          type: "multiple",
          options: shuffledOptions,
        };
      }

      // Default: single choice
      const singleCorrect = typeof q.correct === "number" ? q.correct : (parseInt(q.correct, 10) || 0);
      const displayCorrectOptIdx = optionMap.indexOf(singleCorrect);

      questionMeta.push({
        originalQIdx,
        type: "single",
        optionMap,
        correctDisplayIdx: displayCorrectOptIdx !== -1 ? displayCorrectOptIdx : 0,
      });

      return {
        q: qText,
        type: "single",
        options: shuffledOptions,
      };
    });

    // 6. Buat exam token (berlaku 2 jam atau sesuai time limit)
    const tokenExpiry = timeLimit > 0 ? `${timeLimit + 10}m` : "2h";
    const examToken = await signToken(
      {
        courseId,
        userEmail: user.email,
        questionOrder,
        questionMeta,
        passingScore,
        isExamToken: true,
      },
      { expiresIn: tokenExpiry }
    );

    return NextResponse.json({
      success: true,
      questions: clientQuestions,
      examToken,
      totalQuestions: clientQuestions.length,
      passingScore,
      timeLimit,   // menit; 0 = unlimited
      maxAttempts,
    });
  } catch (error) {
    console.error("Exam start error:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
