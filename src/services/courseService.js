/**
 * courseService.js
 * Semua fetch call yang berhubungan dengan kursus, transaksi, dan sertifikat.
 */

/**
 * Load semua data awal aplikasi dari database.
 * Identitas & peran ditentukan server dari cookie JWT — klien tidak mengirim
 * header x-user-* apa pun (dulu dikirim, dan itu menyesatkan).
 */
export async function loadAppData() {
  const res = await fetch("/api/db");
  return res.json();
}

/**
 * Kursus yang benar-benar dimiliki pengguna, menurut tabel enrollments.
 * Mengembalikan array courseId; array kosong bila belum ada / gagal.
 */
export async function loadEnrollments() {
  try {
    const res  = await fetch("/api/enrollments");
    const json = await res.json();
    if (!json.success) return [];
    return (json.enrollments || []).map(e => e.courseId);
  } catch (err) {
    console.error("loadEnrollments gagal:", err);
    return [];
  }
}

/**
 * Sinkronisasi satu entitas ke database (upsert / delete).
 * @param {string} type      - "course" | "user" | "transaction" | "certificate" | "category" | "level"
 * @param {"save"|"delete"} action
 * @param {object} data
 */
export async function syncEntity(type, action, data) {
  try {
    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, action, data }),
    });
    return (await res.json()).success;
  } catch (err) {
    console.error(`syncEntity failed [${type}/${action}]:`, err);
    return false;
  }
}
