/**
 * examService.js
 * Fetch calls untuk memulai dan mengirim ujian.
 */

/**
 * Mulai sesi ujian — mendapatkan soal teracak + examToken dari server.
 * @param {string} courseId
 */
export async function startExam(courseId) {
  const res = await fetch("/api/exam/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId }),
  });
  return res.json();
}

/**
 * Kirim jawaban ujian ke server — mendapatkan skor dan certId jika lulus.
 * @param {string} examToken
 * @param {Record<string, number>} answers  - { "0": 2, "1": 0, ... }
 */
export async function submitExam(examToken, answers) {
  const res = await fetch("/api/exam/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ examToken, answers }),
  });
  return res.json();
}

/**
 * Load riwayat percobaan ujian untuk kursus tertentu.
 * @param {string} courseId
 */
export async function getExamHistory(courseId) {
  try {
    const res = await fetch(`/api/exam/history?courseId=${encodeURIComponent(courseId)}`);
    return res.json();
  } catch {
    return { success: false, history: [] };
  }
}
