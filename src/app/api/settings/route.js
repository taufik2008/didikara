/**
 * GET  /api/settings          — ambil semua setting (publik: payment settings)
 * POST /api/settings          — simpan setting (admin only)
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { catatAudit } from "@/lib/audit";
import { resetEmailConfigCache } from "@/lib/email";
import { encryptValue, maskSensitiveValue, SENSITIVE_SETTING_KEYS } from "@/lib/crypto";

// Nilai default jika belum diset di DB
const DEFAULTS = {
  // Umum
  platform_name:    "DIDIKARA",
  platform_tagline: "Platform Pelatihan & Sertifikasi Profesional",
  platform_logo:    "/logos/didikara-symbol-redblue-2.jpg",
  // Pembayaran
  bank1_name:       "BCA",
  bank1_account:    "1234567890",
  bank1_holder:     "PT. SDI",
  bank2_name:       "BNI",
  bank2_account:    "0987654321",
  bank2_holder:     "PT. SDI",
  bank3_name:       "",
  bank3_account:    "",
  bank3_holder:     "",
  qris_image:       "",
  payment_instructions: "Transfer nominal TEPAT termasuk 3 digit kode unik agar pembayaran mudah diverifikasi. Konfirmasi dalam 1×24 jam.",
  payment_expiry_hours: "24",
  admin_whatsapp:   "",
  // Storage
  storage_provider:           "mock",   // mock | drive | s3
  google_drive_folder_id:     "",
  google_service_account_json:"",
  s3_bucket:                  "",
  s3_region:                  "ap-southeast-1",
  s3_endpoint:                "",
  s3_access_key_id:           "",
  s3_secret_access_key:       "",
  cdn_url:                    "",
  // Email / SMTP
  smtp_host:    "",
  smtp_port:    "587",
  smtp_user:    "",
  smtp_pass:    "",
  smtp_from:    "noreply@ailms.id",
  // Alamat yang dipakai sebagai Reply-To sekaligus tujuan email masuk.
  // Balasan peserta jatuh ke sini, bukan ke alamat no-reply.
  support_email: "",
  // Tarif Berlangganan (Membership All-Access)
  membership_monthly_price: "149000",
  membership_annual_price:  "999000",
  membership_annual_badge:  "HEMAT 44%",
  // Tanda Tangan Digital & Pejabat Sertifikat
  cert_signature:    "",
  cert_signer_name:  "Prof. Dr. Kadir",
  cert_signer_title: "Direktur LSP & Penjamin Mutu",
};

/**
 * Setelan yang aman dilihat pengguna biasa: identitas platform dan informasi
 * pembayaran yang memang harus tampil di halaman checkout. Sisanya — kata sandi
 * SMTP, kunci rahasia S3, dan JSON service account Google — hanya untuk admin.
 * Sebelumnya GET ini tanpa pemeriksaan peran sama sekali, sehingga setiap
 * peserta yang login dapat membaca seluruh kredensial pihak ketiga.
 */
const KUNCI_PUBLIK = [
  "platform_name", "platform_tagline", "platform_logo",
  "bank1_name", "bank1_account", "bank1_holder",
  "bank2_name", "bank2_account", "bank2_holder",
  "bank3_name", "bank3_account", "bank3_holder",
  "qris_image", "payment_instructions", "payment_expiry_hours",
  "admin_whatsapp", "cdn_url", "storage_provider", "support_email",
  "membership_monthly_price", "membership_annual_price", "membership_annual_badge",
  "cert_signature", "cert_signer_name", "cert_signer_title",
];

function hanyaPublik(settings) {
  const hasil = {};
  for (const k of KUNCI_PUBLIK) if (k in settings) hasil[k] = settings[k];
  return hasil;
}

export async function GET(request) {
  const user = await authenticateRequest(request);

  let settings = { ...DEFAULTS };
  try {
    const { rows } = await query("SELECT key, value FROM platform_settings");
    rows.forEach(r => { settings[r.key] = r.value; });
  } catch { /* pakai nilai bawaan */ }

  // Pastikan platform_name selalu DIDIKARA jika belum diisi atau berisi nilai lama
  if (!settings.platform_name || settings.platform_name.includes("SDI") || settings.platform_name === "AI LMS") {
    settings.platform_name = "DIDIKARA";
  }
  if (!settings.platform_tagline) {
    settings.platform_tagline = "Platform Pelatihan & Sertifikasi Profesional";
  }
  if (!settings.platform_logo) {
    settings.platform_logo = "/logos/didikara-symbol-redblue-2.jpg";
  }

  const isAdmin = user?.role === "admin";
  let finalSettings = isAdmin ? { ...settings } : hanyaPublik(settings);
  if (isAdmin) {
    for (const key of SENSITIVE_SETTING_KEYS) {
      if (finalSettings[key]) {
        finalSettings[key] = maskSensitiveValue(finalSettings[key]);
      }
    }
  }

  return NextResponse.json({
    success: true,
    settings: finalSettings,
    partial: !isAdmin,
  });
}

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await request.json();
  const allowed = Object.keys(DEFAULTS);
  const berubah = [];

  try {
    for (const [key, value] of Object.entries(body)) {
      if (!allowed.includes(key)) continue;
      let valStr = String(value ?? "");

      // Enkripsi nilai sensitif jika diisi dan bukan placeholder mask
      if (SENSITIVE_SETTING_KEYS.includes(key)) {
        if (valStr === "••••••••") continue; // Jangan timpa jika user tidak mengubah
        if (valStr && !valStr.startsWith("enc:")) {
          valStr = encryptValue(valStr);
        }
      }

      berubah.push(key);
      await query(
        `INSERT INTO platform_settings (key, value, updated_at, updated_by)
         VALUES ($1, $2, NOW(), $3)
         ON CONFLICT (key) DO UPDATE
           SET value=$2, updated_at=NOW(), updated_by=$3`,
        [key, valStr, user.email]
      );
    }
    // Yang dicatat adalah nama kuncinya saja. Nilainya sengaja tidak ikut:
    // sebagian berisi kata sandi SMTP dan kunci rahasia S3, dan audit log
    // dibaca lebih banyak orang daripada tabel pengaturan.
    // Konfigurasi email dibaca ulang segera setelah diubah, tanpa restart.
    if (berubah.some(k => k.startsWith("smtp_") || k === "support_email")) {
      resetEmailConfigCache();
    }

    if (berubah.length > 0) {
      await catatAudit(user.email, "update_platform_settings", "platform_settings", "-", {
        keys: berubah,
        mengandung_kredensial: berubah.some(k => /pass|secret|key|json/i.test(k)),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
