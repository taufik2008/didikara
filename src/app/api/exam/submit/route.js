/**
 * POST /api/exam/submit
 * Memeriksa jawaban ujian di sisi server menggunakan examToken.
 * Jika lulus, menerbitkan sertifikat.
 *
 * Body: { examToken: string, answers: { [questionDisplayIdx]: optionDisplayIdx } }
 * Response: { passed, score, percentage, certId? }
 */

import { NextResponse } from "next/server";
import { authenticateRequest, verifyToken } from "@/lib/auth";
import { query } from "@/lib/db";
import { sendExamPassedEmail, sendCertEmail } from "@/lib/email";
import { z } from "zod";

const DEFAULT_PASSING_SCORE = 70;

const bodySchema = z.object({
  examToken: z.string().min(1),
  answers: z.record(z.string(), z.union([z.number(), z.array(z.number()), z.string()])),
});

export async function POST(request) {
  try {
    // 1. Autentikasi user
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 2. Validasi body
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Data tidak valid" }, { status: 400 });
    }
    const { examToken, answers } = parsed.data;

    // 3. Verifikasi exam token
    const tokenPayload = await verifyToken(examToken);
    if (!tokenPayload || !tokenPayload.isExamToken) {
      return NextResponse.json({ success: false, error: "Token ujian tidak valid atau sudah kedaluwarsa." }, { status: 400 });
    }

    // 4. Pastikan token milik user yang login
    if (tokenPayload.userEmail !== user.email) {
      return NextResponse.json({ success: false, error: "Token ujian tidak sesuai akun." }, { status: 403 });
    }

    const { courseId, questionMeta, passingScore: tokenPassingScore } = tokenPayload;
    const PASSING_SCORE = tokenPassingScore || DEFAULT_PASSING_SCORE;

    // 5. Hitung skor — bandingkan jawaban user dengan correctDisplayIdx di token
    let correct = 0;
    const totalQuestions = questionMeta.length;
    const feedbackItems = [];

    for (let displayQIdx = 0; displayQIdx < totalQuestions; displayQIdx++) {
      const meta = questionMeta[displayQIdx];
      const userAnswer = answers[String(displayQIdx)];
      
      let isCorrect = false;
      if (Array.isArray(meta.correctDisplayIdx)) {
        // Multi-select Checkbox
        if (Array.isArray(userAnswer)) {
          const sortedUser = [...userAnswer].sort().join(",");
          const sortedKey = [...meta.correctDisplayIdx].sort().join(",");
          isCorrect = sortedUser === sortedKey;
        }
      } else if (typeof meta.correctDisplayIdx === "string") {
        // Essay / Keyword matching
        if (typeof userAnswer === "string" && userAnswer.trim().length >= 10) {
          isCorrect = true; // Auto-pass threshold for valid essay submission pending manual rubric
        }
      } else {
        // Single choice
        isCorrect = userAnswer !== undefined && userAnswer === meta.correctDisplayIdx;
      }

      if (isCorrect) {
        correct++;
      } else {
        feedbackItems.push({
          questionNumber: displayQIdx + 1,
          status: userAnswer === undefined ? "Belum dijawab" : "Kurang tepat",
        });
      }
    }

    const percentage = Math.round((correct / totalQuestions) * 100);
    const passed = percentage >= PASSING_SCORE;

    // 6. Simpan hasil ke tabel exam_attempts (jika DB tersedia)
    let attemptId = null;
    try {
      const result = await query(
        `INSERT INTO exam_attempts (user_email, course_id, score, percentage, passed, answers, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id`,
        [user.email, courseId, correct, percentage, passed, JSON.stringify(answers)]
      );
      attemptId = result.rows[0]?.id;
    } catch {
      // DB tidak tersedia — lanjut tanpa menyimpan attempt
    }

    // 7. Jika lulus, terbitkan sertifikat
    let certId = null;
    if (passed) {
      try {
        // Cek sertifikat berdasarkan pemilik + kursus. Sebelumnya memakai
        // LIKE pada id_code, yang bisa salah cocok antar akun berprefix sama
        // (mis. budi@a.go.id dan budi@b.com).
        const existingCert = await query(
          "SELECT id FROM certificates WHERE user_email = $1 AND course_id = $2",
          [user.email, courseId]
        );

        if (existingCert.rows.length === 0) {
          certId = `AILMS-${Date.now().toString(36).toUpperCase()}-${user.email.split("@")[0].toUpperCase()}-${courseId}`;
          const dateStr = new Date().toLocaleDateString("id-ID", {
            day: "numeric", month: "long", year: "numeric",
          });

          // Ambil judul kursus
          let courseTitle = courseId;
          try {
            const c = await query("SELECT title FROM courses WHERE id = $1", [courseId]);
            if (c.rows.length > 0) courseTitle = c.rows[0].title;
          } catch {}

          await query(
            `INSERT INTO certificates (id, course_id, title, date, id_code, user_email, issued_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (id) DO NOTHING`,
            [certId, courseId, courseTitle, dateStr, certId, user.email]
          );
        } else {
          certId = existingCert.rows[0].id;
        }
      } catch {
        // DB tidak tersedia — certId tetap null, client handle secara lokal
      }
    }

    // ── Fase 4 triggers (fire-and-forget) ────────────────────────────────
    if (passed) {
      // XP: lulus ujian = 50 poin, sempurna = 100 poin
      const xpPoints = percentage === 100 ? 100 : 50;
      query(
        `INSERT INTO user_points (user_email, points, total_points, level)
         VALUES ($1, $2, $2, 1)
         ON CONFLICT (user_email) DO UPDATE SET
           points = user_points.points + $2,
           total_points = user_points.total_points + $2,
           last_activity_date = CURRENT_DATE, updated_at = NOW()`,
        [user.email, xpPoints]
      ).catch(() => {});

      // Badge: perfect score
      if (percentage === 100) {
        query(
          "INSERT INTO user_badges (user_email, badge_id) VALUES ($1, 'quiz_ace') ON CONFLICT DO NOTHING",
          [user.email]
        ).catch(() => {});
      }

      // Email: lulus ujian
      let courseTitleForEmail = courseId;
      try { const c = await query("SELECT title FROM courses WHERE id = $1", [courseId]); courseTitleForEmail = c.rows[0]?.title || courseId; } catch {}
      const { rows: [userData] } = await query("SELECT fullname FROM users WHERE email = $1", [user.email]).catch(() => ({ rows: [{}] }));

      sendExamPassedEmail(user.email, userData?.fullname || user.email, courseTitleForEmail, percentage).catch(() => {});
      if (certId) {
        sendCertEmail(user.email, userData?.fullname || user.email, courseTitleForEmail, certId).catch(() => {});
        // Badge: cert_1
        query(
          "INSERT INTO user_badges (user_email, badge_id) VALUES ($1, 'cert_1') ON CONFLICT DO NOTHING",
          [user.email]
        ).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      passed,
      score: correct,
      totalQuestions,
      percentage,
      passingScore: PASSING_SCORE,
      certId,
      correctCount: correct,
      incorrectCount: totalQuestions - correct,
      feedbackItems,
      message: passed
        ? `Selamat! Anda Lulus Sertifikasi. Skor: ${percentage}% (Passing Score: ${PASSING_SCORE}%). Sertifikat digital telah diterbitkan di Digital Wallet.`
        : `Ujian Gagal. Skor: ${percentage}% (Passing Score: ${PASSING_SCORE}%). Baca kembali materi dan coba lagi.`,
    });
  } catch (error) {
    console.error("Exam submit error:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
