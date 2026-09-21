/**
 * bankConfig.js — ambil konfigurasi dari DB (platform_settings).
 * Fallback ke env vars, lalu ke nilai default.
 */

export function generateUniqueCode() {
  return Math.floor(100 + Math.random() * 900);
}

/**
 * Ambil config pembayaran dari DB.
 * Dipanggil dari server-side (API routes).
 */
export async function getPaymentConfig() {
  try {
    const { query } = await import("@/lib/db");
    const { rows }  = await query("SELECT key, value FROM platform_settings");
    const s = {};
    rows.forEach(r => { s[r.key] = r.value; });

    const banks = [];
    for (let i = 1; i <= 3; i++) {
      const name    = s[`bank${i}_name`]    || process.env[`NEXT_PUBLIC_BANK${i}_NAME`]    || "";
      const account = s[`bank${i}_account`] || process.env[`NEXT_PUBLIC_BANK${i}_ACCOUNT`] || "";
      const holder  = s[`bank${i}_holder`]  || process.env[`NEXT_PUBLIC_BANK${i}_HOLDER`]  || "";
      if (name && account) banks.push({ bank: name, account, holder });
    }

    return {
      bankAccounts:         banks.length ? banks : [{ bank:"BCA", account:"1234567890", holder:"PT. SDI" }],
      qrisImageUrl:         s.qris_image       || process.env.NEXT_PUBLIC_QRIS_URL      || "",
      platformName:         s.platform_name    || process.env.NEXT_PUBLIC_PLATFORM_NAME || "DIDIKARA",
      paymentInstructions:  s.payment_instructions || "Transfer nominal TEPAT termasuk 3 digit kode unik.",
      expiryHours:          Number(s.payment_expiry_hours || "24"),
      adminWhatsapp:        s.admin_whatsapp || "",
    };
  } catch {
    return {
      bankAccounts: [
        { bank: process.env.NEXT_PUBLIC_BANK1_NAME || "BCA", account: process.env.NEXT_PUBLIC_BANK1_ACCOUNT || "1234567890", holder: process.env.NEXT_PUBLIC_BANK1_HOLDER || "PT. SDI" },
      ],
      qrisImageUrl: process.env.NEXT_PUBLIC_QRIS_URL || "",
      platformName: process.env.NEXT_PUBLIC_PLATFORM_NAME || "DIDIKARA",
      paymentInstructions: "Transfer nominal TEPAT termasuk 3 digit kode unik.",
      expiryHours: 24,
      adminWhatsapp: "",
    };
  }
}
