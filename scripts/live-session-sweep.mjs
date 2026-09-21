#!/usr/bin/env node
/**
 * live-session-sweep.mjs — pemicu penyapu live class.
 *
 *   node scripts/live-session-sweep.mjs
 *
 * Menekan POST /api/live-sessions/sweep pada aplikasi yang sedang berjalan:
 * pengingat H-1 dan H-1 jam, perpindahan status sesi scheduled → live →
 * completed, penandaan order pembayaran yang kedaluwarsa, dan pengiriman
 * ulang email yang gagal.
 *
 * Jadwalkan tiap 15 menit lewat Task Scheduler Windows:
 *   Program : node
 *   Argumen : scripts\live-session-sweep.mjs
 *   Mulai di: E:\lms
 *
 * Env yang dipakai (boleh diletakkan di .env.local):
 *   APP_URL      alamat aplikasi, bawaan http://localhost:3000
 *   CRON_SECRET  rahasia yang sama dengan yang dibaca route sweep
 */

import fs from "node:fs";
import path from "node:path";

function bacaEnvLokal() {
  const berkas = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(berkas)) return {};
  const hasil = {};
  for (const baris of fs.readFileSync(berkas, "utf8").split(/\r?\n/)) {
    const m = baris.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) hasil[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return hasil;
}

const env     = { ...bacaEnvLokal(), ...process.env };
const appUrl  = (env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const rahasia = env.CRON_SECRET;

if (!rahasia) {
  console.error("CRON_SECRET belum diset di .env.local — penyapu akan ditolak 401.");
  process.exit(1);
}

try {
  const res = await fetch(`${appUrl}/api/live-sessions/sweep`, {
    method: "POST",
    headers: { "x-cron-secret": rahasia, "Content-Type": "application/json" },
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.success) {
    console.error(`[${new Date().toISOString()}] GAGAL ${res.status}:`, data.error || res.statusText);
    process.exit(1);
  }

  console.log(
    `[${new Date().toISOString()}] OK — pengingat H-1: ${data.reminder24h}, ` +
    `H-1 jam: ${data.reminder1h}, penerima: ${data.penerima}, ` +
    `jadi live: ${data.jadiLive}, selesai: ${data.jadiSelesai}, ` +
    `order kedaluwarsa: ${data.orderKedaluwarsa}, email dikirim ulang: ${data.emailDikirimUlang}, ` +
    `pengingat instruktur: ${data.pengingatInstruktur}, jadwal mingguan: ${data.ringkasanMingguan}, ` +
    `pengingat penilaian: ${data.pengingatPenilaian}, rekap bagi hasil: ${data.ringkasanBagiHasil}`
  );
} catch (err) {
  console.error(`[${new Date().toISOString()}] Tidak dapat menghubungi ${appUrl}:`, err.message);
  process.exit(1);
}
