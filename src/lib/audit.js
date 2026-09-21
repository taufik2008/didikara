/**
 * audit.js — satu pintu pencatatan jejak audit.
 *
 * Sebelumnya hanya CRUD lewat /api/db yang tercatat, sehingga tindakan paling
 * bernilai di platform — menyetujui pembayaran, mendaftarkan satu departemen ke
 * kursus berbayar, mengubah nomor rekening penerima, menilai tugas — tidak
 * meninggalkan jejak sama sekali.
 *
 * Pencatatan bersifat best-effort: kegagalan audit tidak boleh menggagalkan
 * transaksi bisnisnya, tetapi selalu muncul di log server agar tidak hilang
 * tanpa jejak.
 */
import { query } from "@/lib/db";

/**
 * @param {string} actorEmail  pelaku tindakan
 * @param {string} action      kata kerja pendek, mis. "approve_payment"
 * @param {string} entityType  jenis objek, mis. "payment_order"
 * @param {string|number} entityId
 * @param {object} detail      konteks tambahan (nominal, penerima, nilai lama/baru)
 */
export async function catatAudit(actorEmail, action, entityType, entityId, detail = {}) {
  try {
    await query(
      `INSERT INTO audit_logs (actor_email, action, entity_type, entity_id, detail)
       VALUES ($1, $2, $3, $4, $5)`,
      [actorEmail || "system", action, entityType, String(entityId ?? ""), JSON.stringify(detail)]
    );
  } catch (err) {
    console.warn(`[AUDIT] gagal mencatat ${action}:`, err.message);
  }
}
