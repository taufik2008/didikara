/**
 * stitch-gen.mjs — hasilkan layar UI lewat Google Stitch, simpan HTML + screenshot.
 *
 * Jalur ini TIDAK melewati MCP client, jadi bug skema `$defs`/`ScreenInstance`
 * yang membuat `claude mcp get stitch` gagal mengambil daftar tool tidak relevan
 * di sini. SDK bicara langsung ke stitch.googleapis.com.
 *
 * Prasyarat:
 *   npm install @google/stitch-sdk
 *   STITCH_API_KEY di .env.local (sudah diisi)
 *
 * Pakai:
 *   node scripts/stitch-gen.mjs login
 *   node scripts/stitch-gen.mjs dashboard
 *   node scripts/stitch-gen.mjs login --device MOBILE
 *   node scripts/stitch-gen.mjs "prompt bebas Anda sendiri" --name percobaan
 *
 * Keluaran: design/<nama>.html dan design/<nama>.png
 *
 * Catatan: pemanggilan pertama membuat project Stitch baru dan mencetak
 * STITCH_PROJECT_ID. Simpan nilai itu ke .env.local agar pemanggilan berikutnya
 * menumpuk di project yang sama, bukan membuat project baru terus-menerus.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "design");

// ─── Preset prompt untuk halaman NHCIE ───────────────────────────────────────
// Deskripsi visual mengikuti design system yang sudah ada di src/app/globals.css:
// gelap, glassmorphic, aksen oranye (#f97316) di atas biru gelap.
const LOOK =
  "Dark premium enterprise look: deep navy-to-black gradient background, " +
  "glassmorphic frosted panels with subtle borders, orange (#f97316) accent " +
  "for primary actions and highlights, soft neon glow orbs in the background, " +
  "clean sans-serif typography, generous spacing. Indonesian language labels.";

const PRESETS = {
  login: {
    name: "login",
    device: "DESKTOP",
    prompt:
      "A login page for NHCIE, an Indonesian national workforce training and " +
      "certification platform. Left side: brand mark 'NHCIE' with a chip icon, " +
      "tagline, and a short list of platform capabilities. Right side: a login " +
      "card with email and password fields, a primary 'Masuk' button, and four " +
      "role tabs above the form labelled Peserta, Korporat, Pemerintah, Admin. " +
      LOOK,
  },
  dashboard: {
    name: "dashboard",
    device: "DESKTOP",
    prompt:
      "A learner dashboard for NHCIE, an Indonesian workforce training platform. " +
      "Left vertical sidebar with navigation items. Main area: a welcome header " +
      "with user avatar, four stat cards (jam belajar, kursus aktif, sertifikat, " +
      "level kompetensi), a radar chart comparing current versus target " +
      "competencies across six areas, and a list of courses in progress with " +
      "progress bars. " +
      LOOK,
  },
  marketplace: {
    name: "marketplace",
    device: "DESKTOP",
    prompt:
      "A course catalog page for NHCIE, an Indonesian workforce training " +
      "platform. Filter pills by category at the top, a search field, and a grid " +
      "of course cards. Each card shows title, category badge, duration, level, " +
      "star rating, price in rupiah, and an enrol button. " +
      LOOK,
  },
};

// ─── Argumen ─────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
if (argv.length === 0) {
  console.error(
    `Pakai: node scripts/stitch-gen.mjs <${Object.keys(PRESETS).join("|")}|"prompt bebas"> [--name x] [--device DESKTOP|MOBILE|TABLET|AGNOSTIC]`
  );
  process.exit(1);
}

function flag(nama, fallback) {
  const i = argv.indexOf(`--${nama}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
}

const first = argv[0];
const preset = PRESETS[first];
const prompt = preset ? preset.prompt : first;
const name = flag("name", preset ? preset.name : "screen");
const device = flag("device", preset ? preset.device : "DESKTOP");

if (!preset && !first.trim()) {
  console.error("Prompt kosong.");
  process.exit(1);
}

// ─── Kredensial ──────────────────────────────────────────────────────────────
/** Baca satu kunci dari .env.local tanpa dependensi tambahan. */
function fromEnvFile(key) {
  const p = join(ROOT, ".env.local");
  if (!existsSync(p)) return undefined;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[1] === key) return m[2].replace(/^["']|["']$/g, "");
  }
  return undefined;
}

const apiKey = process.env.STITCH_API_KEY || fromEnvFile("STITCH_API_KEY");
if (!apiKey) {
  console.error("STITCH_API_KEY tidak ditemukan di environment maupun .env.local");
  process.exit(1);
}

const { Stitch, StitchToolClient, StitchError } = await import("@google/stitch-sdk");

const client = new StitchToolClient({ apiKey, timeout: 300_000 });
const sdk = new Stitch(client);

/**
 * Ambil project ID. Bentuk respons create_project tidak dijamin stabil, jadi
 * ID diekstrak dari JSON mentah dan responsnya tetap disimpan untuk ditelusuri
 * bila ekstraksi gagal.
 */
async function resolveProjectId() {
  const existing = process.env.STITCH_PROJECT_ID || fromEnvFile("STITCH_PROJECT_ID");
  if (existing) return existing;

  console.log("STITCH_PROJECT_ID belum diset — membuat project baru…");
  const result = await client.callTool("create_project", { title: "NHCIE LMS" });
  const raw = JSON.stringify(result, null, 2);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "_create-project-response.json"), raw);

  const id = raw.match(/projects\/(\d+)/)?.[1] || raw.match(/"(?:projectId|id)"\s*:\s*"?(\d{6,})"?/)?.[1];
  if (!id) {
    console.error(
      "Tidak bisa membaca project ID dari respons. Lihat design/_create-project-response.json, " +
        "lalu set STITCH_PROJECT_ID=<id> di .env.local."
    );
    process.exit(1);
  }
  console.log(`\n>>> Tambahkan ke .env.local agar tidak membuat project baru lagi:\n    STITCH_PROJECT_ID=${id}\n`);
  return id;
}

/** getHtml()/getImage() mengembalikan URL unduhan, bukan isinya. */
async function download(url, target) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Unduhan gagal ${res.status} untuk ${target}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(target, buf);
  return buf.length;
}

try {
  const projectId = await resolveProjectId();
  const project = sdk.project(projectId);

  console.log(`Membuat layar "${name}" (${device})…`);
  const screen = await project.generate(prompt, device);
  console.log(`  screenId: ${screen.id}`);

  mkdirSync(OUT_DIR, { recursive: true });

  const htmlUrl = await screen.getHtml();
  const htmlPath = join(OUT_DIR, `${name}.html`);
  console.log(`  HTML  ${await download(htmlUrl, htmlPath)} byte → design/${name}.html`);

  const imgUrl = await screen.getImage();
  const imgPath = join(OUT_DIR, `${name}.png`);
  console.log(`  PNG   ${await download(imgUrl, imgPath)} byte → design/${name}.png`);

  console.log("\nSelesai. Buka file HTML-nya di browser untuk melihat hasilnya.");
} catch (err) {
  if (StitchError && err instanceof StitchError) {
    console.error(`StitchError [${err.code}] ${err.message} (recoverable: ${err.recoverable})`);
  } else {
    console.error(err);
  }
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
