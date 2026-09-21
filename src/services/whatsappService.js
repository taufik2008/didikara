/**
 * WhatsApp Notification Gateway Service
 * Mendukung pengiriman pesan notifikasi otomatis via WhatsApp API
 * (Kompatibel dengan Fonnte, Wablas, Twilio, Meta Cloud API, atau Local Logger).
 */

export const WA_TEMPLATES = {
  ENROLLMENT_SUCCESS: ({ fullname, courseTitle, orderId }) =>
    `*Konfirmasi Pendaftaran Pelatihan - LMS PINTAR*\n\n` +
    `Halo *${fullname}*,\n` +
    `Pendaftaran Anda pada kursus *${courseTitle}* (No. Order: #${orderId}) telah *BERHASIL DIAKTIFKAN*.\n\n` +
    `Silakan akses materi pembelajaran di platform Anda:\n` +
    `🔗 https://ailms.id/kelas\n\n` +
    `Selamat belajar dan sukses meraih sertifikasi kompetensi! 🎓`,

  WEBINAR_REMINDER: ({ fullname, sessionTitle, startTime, joinUrl }) =>
    `*Pengingat Sesi Kelas Virtual (Webinar) - LMS PINTAR*\n\n` +
    `Halo *${fullname}*,\n` +
    `Sesi interaktif *${sessionTitle}* akan dimulai pada:\n` +
    `⏰ *${startTime} WIB* (15 menit sebelum mulai tombol aktif)\n\n` +
    `Tautan langsung bergabung kelas:\n` +
    `🔗 ${joinUrl || "https://ailms.id/kelas"}\n\n` +
    `Pastikan koneksi internet dan audio Anda siap. Sampai jumpa di kelas! 💻`,

  CERTIFICATE_ISSUED: ({ fullname, courseTitle, certIdCode, verifyUrl }) =>
    `*Selamat! Sertifikat Kompetensi Resmi Telah Terbit*\n\n` +
    `Halo *${fullname}*,\n` +
    `Selamat atas kelulusan Anda pada pelatihan *${courseTitle}*.\n\n` +
    `📄 *Nomor Registrasi:* \`${certIdCode}\`\n` +
    `⏳ *Masa Berlaku:* 3 Tahun (Standar Kompetensi Nasional)\n` +
    `🔍 *Verifikasi Sertifikat:* ${verifyUrl}\n\n` +
    `Sertifikat dalam format PDF dapat diunduh di dashboard akun Anda. 🎉`,

  RECERTIFICATION_ALERT: ({ fullname, certTitle, validUntil, renewUrl }) =>
    `*Peringatan Masa Berlaku Sertifikasi Kompetensi*\n\n` +
    `Halo *${fullname}*,\n` +
    `Masa berlaku sertifikat Anda pada *${certTitle}* akan segera berakhir pada tanggal *${validUntil}*.\n\n` +
    `Untuk mempertahankan status lisensi kompetensi aktif, silakan ikuti uji resertifikasi berkala:\n` +
    `🔗 ${renewUrl || "https://ailms.id/marketplace"}\n\n` +
    `Tim Lembaga Sertifikasi Kompetensi LMS Pintar.`,
};

/**
 * Kirim pesan WhatsApp ke nomor tujuan
 * @param {string} phone - Nomor telepon (contoh: "08123456789" atau "628123456789")
 * @param {string} message - Isi teks pesan WhatsApp
 */
export async function sendWhatsAppMessage({ phone, message }) {
  if (!phone || !message) {
    return { success: false, error: "Nomor telepon dan pesan wajib diisi" };
  }

  // Normalisasi nomor telepon ke format internasional (628xxx)
  let cleanPhone = phone.replace(/[^0-9]/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "62" + cleanPhone.substring(1);
  }

  const endpoint = process.env.WA_API_ENDPOINT;
  const token = process.env.WA_API_TOKEN;

  // Jika belum dikonfigurasi di server, catat ke log sistem (Simulator Mode)
  if (!endpoint || !token) {
    console.log(`[WHATSAPP-GATEWAY-SIMULATOR] Kirim WA ke +${cleanPhone}:\n${message}\n-------------------`);
    return {
      success: true,
      simulated: true,
      recipient: cleanPhone,
      status: "SENT_SIMULATED",
      message: "Pesan WhatsApp tersimulasi berhasil (Mode Dev/Staging)",
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({
        target: cleanPhone,
        message: message,
      }),
    });

    const data = await response.json();
    return { success: response.ok, data };
  } catch (error) {
    console.error("[WHATSAPP-GATEWAY-ERROR]", error);
    return { success: false, error: error.message };
  }
}
