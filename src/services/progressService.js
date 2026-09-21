/**
 * progressService.js
 * Fetch calls untuk progress belajar per lesson.
 */

/**
 * Load semua progress lessons untuk sebuah kursus.
 * @param {string} courseId
 * @returns {{ progress: Object, lastLesson: number }}
 */
export async function loadProgress(courseId) {
  try {
    const res = await fetch(`/api/progress?courseId=${encodeURIComponent(courseId)}`);
    return await res.json();
  } catch (err) {
    console.error("loadProgress failed:", err);
    return { success: false };
  }
}

/**
 * Simpan progress satu lesson ke database.
 * @param {string} courseId
 * @param {number} lessonIndex
 * @param {number} progressPct  (0-100)
 * @param {boolean} completed
 */
export async function saveProgress(courseId, lessonIndex, progressPct, completed) {
  try {
    const res = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, lessonIndex, progressPct, completed }),
    });
    return (await res.json()).success;
  } catch (err) {
    console.error("saveProgress failed:", err);
    return false;
  }
}

/**
 * Load riwayat percobaan ujian.
 * @param {string} courseId
 */
export async function loadExamHistory(courseId) {
  try {
    const res = await fetch(`/api/exam/history?courseId=${encodeURIComponent(courseId)}`);
    return await res.json();
  } catch (err) {
    console.error("loadExamHistory failed:", err);
    return { success: false, history: [] };
  }
}
