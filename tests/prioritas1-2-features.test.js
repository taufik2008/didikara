import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { calculateInstructorTax } from "../src/lib/taxService.js";

test("Prioritas 1.1: Free Preview (Materi Sampel Gratis) di LmsPage, Marketplace & Silabus", () => {
  const lmsPath = path.resolve(process.cwd(), "src/components/Lms/LmsPage.js");
  const lmsCode = fs.readFileSync(lmsPath, "utf8");

  // Memastikan banner Free Preview dan logic penandaan materi gratis tersedia
  assert.ok(lmsCode.includes("Mode Pratinjau Gratis (Free Preview)"), "LmsPage harus menampilkan banner Pratinjau Gratis");
  assert.ok(lmsCode.includes("isCurrentLessonFree"), "LmsPage harus mengecek apakah materi yang dipilih adalah free preview");
  assert.ok(lmsCode.includes("isCurrentLessonLocked"), "LmsPage harus mengecek status kunci materi untuk non-enrolled");
  assert.ok(lmsCode.includes("Materi Terkunci"), "LmsPage harus memiliki fallback state in-player untuk materi terkunci");
  assert.ok(lmsCode.includes("Gratis"), "CurriculumNav harus memiliki badge Gratis untuk materi sampel");

  const marketPath = path.resolve(process.cwd(), "src/components/Marketplace/MarketplacePage.js");
  const marketCode = fs.readFileSync(marketPath, "utf8");
  assert.ok(marketCode.includes("Coba Gratis"), "MarketplacePage harus menampilkan tombol 'Coba Gratis'");

  const landingPath = path.resolve(process.cwd(), "src/components/Landing/LandingPage.js");
  const landingCode = fs.readFileSync(landingPath, "utf8");
  assert.ok(landingCode.includes("Coba Gratis"), "LandingPage harus menampilkan tombol 'Coba Gratis' pada kartu kursus");
  assert.ok(landingCode.includes("Pratinjau Gratis"), "LandingPage harus memiliki badge 'Pratinjau Gratis' pada silabus modal");

  const modalPath = path.resolve(process.cwd(), "src/components/Modals/LmsManageModal.js");
  const modalCode = fs.readFileSync(modalPath, "utf8");
  assert.ok(modalCode.includes("isFreePreview"), "LmsManageModal harus mengizinkan instruktur menandai materi Free Preview");
});

test("Prioritas 1.2: Tombol 'Add to LinkedIn' pada Sertifikat Kelulusan & Portofolio", () => {
  const certModalPath = path.resolve(process.cwd(), "src/components/Modals/CertModal.js");
  const certModalCode = fs.readFileSync(certModalPath, "utf8");

  // Memastikan URL Add to Profile LinkedIn resmi diimplementasikan
  assert.ok(certModalCode.includes("startTask=CERTIFICATION_NAME"), "CertModal harus menggunakan LinkedIn Certification Add-to-Profile URL");
  assert.ok(certModalCode.includes("organizationName"), "CertModal harus menyertakan nama organisasi DIDIKARA");
  assert.ok(certModalCode.includes("Tambah ke Profil LinkedIn"), "CertModal harus menyertakan label tombol 'Tambah ke Profil LinkedIn'");

  const walletPath = path.resolve(process.cwd(), "src/components/Wallet/WalletPage.js");
  const walletCode = fs.readFileSync(walletPath, "utf8");
  assert.ok(walletCode.includes("+ LinkedIn"), "WalletPage harus memiliki tombol direct add to LinkedIn di setiap kartu sertifikat");
});

test("Prioritas 1.3: Mode Layar Penuh (Dedicated Full-Screen View) untuk Modal Silabus", () => {
  const modalPath = path.resolve(process.cwd(), "src/components/Modals/LmsManageModal.js");
  const modalCode = fs.readFileSync(modalPath, "utf8");

  assert.ok(modalCode.includes("isMaximized"), "LmsManageModal harus memiliki state isMaximized");
  assert.ok(modalCode.includes("Maximize2"), "LmsManageModal harus mengimpor dan menggunakan Maximize2");
  assert.ok(modalCode.includes("Minimize2"), "LmsManageModal harus mengimpor dan menggunakan Minimize2");
  assert.ok(modalCode.includes("100vw"), "LmsManageModal harus mendukung ekspansi ke lebar 100vw");
  assert.ok(modalCode.includes("100vh"), "LmsManageModal harus mendukung ekspansi ke tinggi 100vh");
});

test("Prioritas 2.1: Dasbor Bagi Hasil & Payout Instruktur + Perhitungan PPh 21", () => {
  const studioPath = path.resolve(process.cwd(), "src/components/Instructor/InstructorStudioPage.js");
  const studioCode = fs.readFileSync(studioPath, "utf8");

  assert.ok(studioCode.includes("Bagi Hasil & Payout"), "InstructorStudioPage harus memiliki tab Bagi Hasil & Payout");
  assert.ok(studioCode.includes("Ajukan Penarikan Dana"), "InstructorStudioPage harus memiliki tombol & modal penarikan dana");
  assert.ok(studioCode.includes("payoutRingkas"), "InstructorStudioPage harus menampilkan rekap metrik keuangan instruktur");

  const payoutRoutePath = path.resolve(process.cwd(), "src/app/api/instructor-payouts/route.js");
  const payoutRouteCode = fs.readFileSync(payoutRoutePath, "utf8");

  assert.ok(payoutRouteCode.includes("request_withdrawal"), "API instructor-payouts harus mendukung aksi request_withdrawal");
  assert.ok(payoutRouteCode.includes("calculateInstructorTax"), "API instructor-payouts harus menggunakan calculateInstructorTax");

  // Tes kalkulasi PPh 21 instruktur
  const taxCalc = calculateInstructorTax({ grossAmount: 10000000, hasNpwp: true });
  assert.equal(taxCalc.dpp, 5000000, "DPP harus 50% dari bruto");
  assert.equal(taxCalc.taxAmount, 250000, "Pajak 5% dari DPP Rp 5.000.000 = Rp 250.000");
  assert.equal(taxCalc.netAmount, 9750000, "Net = Bruto - Pajak");
  assert.ok(taxCalc.buktiPotongNo.startsWith("BPU-"), "Nomor bukti potong harus berawalan BPU-");
});

test("Prioritas 2.2: Rubrik Koreksi & Feedback Tugas Terstruktur", () => {
  const modalPath = path.resolve(process.cwd(), "src/components/Modals/LmsManageModal.js");
  const modalCode = fs.readFileSync(modalPath, "utf8");

  assert.ok(modalCode.includes("Rubrik Penilaian"), "LmsManageModal harus menampilkan antarmuka rubrik penilaian tugas");
  assert.ok(modalCode.includes("Pemahaman Materi"), "Rubrik harus memiliki kriteria Pemahaman Materi");
  assert.ok(modalCode.includes("Analisis"), "Rubrik harus memiliki kriteria Analisis");
  assert.ok(modalCode.includes("Sistematika"), "Rubrik harus memiliki kriteria Sistematika");
  assert.ok(modalCode.includes("revision_needed"), "Rubrik harus mendukung status revision_needed");

  const instructorRoutePath = path.resolve(process.cwd(), "src/app/api/instructor/route.js");
  const instructorRouteCode = fs.readFileSync(instructorRoutePath, "utf8");
  assert.ok(instructorRouteCode.includes("isRevision"), "API instructor harus memproses status revisi dan penilaian");
});

test("Prioritas 2.3: Sistem Pengingat Belajar (Nudge System) Instruktur", () => {
  const instructorRoutePath = path.resolve(process.cwd(), "src/app/api/instructor/route.js");
  const instructorRouteCode = fs.readFileSync(instructorRoutePath, "utf8");

  assert.ok(instructorRouteCode.includes("action === \"nudge\""), "API instructor harus mendukung aksi nudge");
  assert.ok(instructorRouteCode.includes("Pengingat Belajar dari Instruktur"), "API instructor harus mengirim notifikasi pengingat belajar");

  const modalPath = path.resolve(process.cwd(), "src/components/Modals/LmsManageModal.js");
  const modalCode = fs.readFileSync(modalPath, "utf8");

  assert.ok(modalCode.includes("handleNudge"), "LmsManageModal harus memiliki fungsi pengiriman nudge individual");
  assert.ok(modalCode.includes("handleBatchNudge"), "LmsManageModal harus memiliki fungsi pengiriman nudge massal (batch)");
});
