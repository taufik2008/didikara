/**
 * B2B & B2G Multi-Tier Order Approval Workflow Service
 * Alur Otorisasi Pengadaan: Maker -> Checker -> Approver (PPK -> KPA / HR Director)
 */

export const APPROVAL_STATUSES = {
  DRAFT: { key: "DRAFT", label: "Konsep Pengadaan (Draft)", color: "#94a3b8" },
  SUBMITTED_BY_MAKER: { key: "SUBMITTED_BY_MAKER", label: "Diajukan oleh Pembuat (Maker)", color: "#38bdf8" },
  VERIFIED_BY_CHECKER: { key: "VERIFIED_BY_CHECKER", label: "Diverifikasi Pejabat Pengadaan (Checker)", color: "#facc15" },
  APPROVED_BY_KPA: { key: "APPROVED_BY_KPA", label: "Disetujui PPK / KPA (Authorized)", color: "#4ade80" },
  REJECTED: { key: "REJECTED", label: "Ditolak / Dikembalikan untuk Revisi", color: "#f87171" },
  INVOICED_AND_ENROLLED: { key: "INVOICED_AND_ENROLLED", label: "Faktur Terbit & Lisensi Aktif", color: "#22c55e" },
};

/**
 * Validasi transisi status alur persetujuan pengadaan institusi
 */
export function transitionApprovalStatus({ currentStatus, action, userRole }) {
  if (action === "SUBMIT" && (currentStatus === "DRAFT" || !currentStatus)) {
    return { success: true, nextStatus: "SUBMITTED_BY_MAKER", message: "Usulan pengadaan berhasil diajukan ke Checker." };
  }

  if (action === "VERIFY" && currentStatus === "SUBMITTED_BY_MAKER") {
    if (!["admin", "government", "corporate"].includes(userRole)) {
      return { success: false, error: "Hanya Checker / Pejabat Pengadaan yang berhak memverifikasi." };
    }
    return { success: true, nextStatus: "VERIFIED_BY_CHECKER", message: "Usulan terverifikasi dan diteruskan ke PPK/KPA." };
  }

  if (action === "APPROVE" && currentStatus === "VERIFIED_BY_CHECKER") {
    if (!["admin", "government"].includes(userRole)) {
      return { success: false, error: "Hanya Kuasa Pengguna Anggaran (KPA/PPK) yang berhak menyetujui." };
    }
    return { success: true, nextStatus: "APPROVED_BY_KPA", message: "Otorisasi pengadaan DIPA/PO berhasil disetujui." };
  }

  if (action === "REJECT") {
    return { success: true, nextStatus: "REJECTED", message: "Usulan pengadaan dikembalikan dengan catatan revisi." };
  }

  if (action === "ENROLL" && currentStatus === "APPROVED_BY_KPA") {
    return { success: true, nextStatus: "INVOICED_AND_ENROLLED", message: "Faktur resmi diterbitkan dan kuota peserta aktif." };
  }

  return { success: false, error: `Transisi aksi '${action}' dari status '${currentStatus}' tidak diizinkan.` };
}
