#!/usr/bin/env node
/**
 * rename-account-emails.mjs — memindahkan akun dari domain lama ke domain baru.
 *
 *   node scripts/rename-account-emails.mjs          # dry run: hanya melaporkan
 *   node scripts/rename-account-emails.mjs --apply  # benar-benar mengubah data
 *
 * Mengapa tidak cukup satu UPDATE?
 * `users.email` adalah kunci primer, dan delapan tabel merujuknya lewat foreign
 * key tanpa ON UPDATE CASCADE (user_points, user_badges, live_sessions,
 * live_session_registrations, ai_interactions, payment_orders, course_reviews,
 * push_subscriptions). Mengubah kunci primer secara langsung akan ditolak.
 * Karena itu skrip ini menempuh jalur salin → alihkan anak → hapus lama:
 *
 *   1. Salin baris users ke email baru (seluruh kolom, termasuk hash sandi).
 *   2. Alihkan semua baris anak dari email lama ke email baru.
 *   3. Hapus baris users lama, yang saat itu sudah tidak dirujuk siapa pun.
 *
 * Seluruhnya dalam satu transaksi: gagal di tengah berarti tidak ada yang
 * berubah. Skrip aman dijalankan ulang — akun yang sudah dipindahkan dilewati.
 */

import fs from "node:fs";
import path from "node:path";
import pg from "pg";

// ── Konfigurasi pemetaan domain ─────────────────────────────────────────────
const PEMETAAN_DOMAIN = [
  ["@nhcie.go.id", "@digidaya.tech"],
  ["@nhcie.id", "@digidaya.tech"],
  ["@ailms.id", "@digidaya.tech"],
  ["@digidaya.id", "@digidaya.tech"],
];

const APPLY = process.argv.includes("--apply");

// ── Ambil DATABASE_URL dari .env.local ──────────────────────────────────────
function bacaDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const berkas = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(berkas)) {
    throw new Error("DATABASE_URL tidak diset dan .env.local tidak ditemukan. Jalankan skrip dari akar proyek.");
  }
  const isi = fs.readFileSync(berkas, "utf8");
  const m = isi.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m);
  if (!m) throw new Error("DATABASE_URL tidak ada di .env.local");
  return m[1].trim().replace(/^["']|["']$/g, "");
}

// Kolom yang menyimpan email pengguna di seluruh skema. Ditemukan secara
// dinamis agar tetap benar bila ada tabel baru dengan pola penamaan yang sama.
const NAMA_KOLOM_EMAIL = [
  "user_email", "actor_email", "author_email", "instructor_email",
  "to_email", "graded_by", "created_by", "recorded_by", "updated_by",
];

async function main() {
  const client = new pg.Client({ connectionString: bacaDatabaseUrl() });
  await client.connect();

  try {
    // 1. Cari akun yang perlu dipindahkan
    const { rows: kandidat } = await client.query(
      `SELECT email FROM users
        WHERE ${PEMETAAN_DOMAIN.map((_, i) => `email LIKE $${i + 1}`).join(" OR ")}
        ORDER BY email`,
      PEMETAAN_DOMAIN.map(([lama]) => `%${lama}`)
    );

    if (kandidat.length === 0) {
      console.log("Tidak ada akun berdomain lama. Tidak ada yang perlu dikerjakan.");
      return;
    }

    // 2. Kumpulkan kolom email di seluruh skema
    const { rows: kolom } = await client.query(
      `SELECT table_name, column_name
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name <> 'users'
          AND column_name = ANY($1)
        ORDER BY table_name, column_name`,
      [NAMA_KOLOM_EMAIL]
    );

    console.log(`Akun yang akan dipindahkan : ${kandidat.length}`);
    console.log(`Kolom email yang disentuh  : ${kolom.length}`);
    console.log("");

    const rencana = [];
    for (const { email } of kandidat) {
      const pasangan = PEMETAAN_DOMAIN.find(([lama]) => email.endsWith(lama));
      const emailBaru = email.slice(0, -pasangan[0].length) + pasangan[1];

      const { rows: [bentrok] } = await client.query(
        "SELECT 1 AS ada FROM users WHERE email = $1", [emailBaru]
      );
      if (bentrok) {
        console.log(`  LEWATI  ${email} → ${emailBaru}  (email tujuan sudah ada)`);
        continue;
      }
      rencana.push([email, emailBaru]);
      console.log(`  PINDAH  ${email} → ${emailBaru}`);
    }

    if (rencana.length === 0) {
      console.log("\nTidak ada yang dapat dipindahkan.");
      return;
    }

    if (!APPLY) {
      console.log("\n[DRY RUN] Tidak ada data yang diubah.");
      console.log("Jalankan ulang dengan --apply untuk menerapkan perubahan.");
      return;
    }

    // 3. Terapkan dalam satu transaksi
    await client.query("BEGIN");
    let totalBaris = 0;

    // Daftar kolom tabel users, dibaca sekali. Salinan dilakukan kolom per
    // kolom — bukan lewat hstore — supaya tidak bergantung pada ekstensi
    // opsional, dan supaya kegagalan tidak membatalkan transaksi.
    const { rows: kolomUser } = await client.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name='users' ORDER BY ordinal_position`
    );
    const daftarKolomUser = kolomUser.map(r => `"${r.column_name}"`).join(", ");
    const pilihKolomUser  = kolomUser
      .map(r => (r.column_name === "email" ? "$2" : `"${r.column_name}"`))
      .join(", ");

    for (const [lama, baru] of rencana) {
      // 3a. Salin baris users apa adanya, hanya email yang diganti.
      await client.query(
        `INSERT INTO users (${daftarKolomUser})
         SELECT ${pilihKolomUser} FROM users WHERE email = $1`,
        [lama, baru]
      );

      // 3b. Alihkan seluruh baris anak.
      for (const { table_name, column_name } of kolom) {
        const r = await client.query(
          `UPDATE "${table_name}" SET "${column_name}" = $2 WHERE "${column_name}" = $1`,
          [lama, baru]
        );
        if (r.rowCount) {
          totalBaris += r.rowCount;
          console.log(`    ${table_name}.${column_name}: ${r.rowCount} baris`);
        }
      }

      // 3c. Hapus baris lama yang kini tidak dirujuk lagi.
      await client.query("DELETE FROM users WHERE email = $1", [lama]);
      console.log(`  SELESAI ${lama} → ${baru}`);
    }

    await client.query("COMMIT");
    console.log(`\nBerhasil. ${rencana.length} akun dipindahkan, ${totalBaris} baris terkait diperbarui.`);
    console.log("Kata sandi tidak berubah. Sesi login yang sedang berjalan perlu login ulang.");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("\nGAGAL — tidak ada perubahan yang disimpan.");
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
