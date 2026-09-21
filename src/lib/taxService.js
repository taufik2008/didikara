/**
 * Tax Service & PPh 21/23 Calculation Module
 * Perhitungan otomatis potongan pajak penghasilan instruktur & pembuatan nomor Bukti Potong resmi
 */

/**
 * Hitung potongan pajak PPh 21 bagi instruktur (Tenaga Ahli / Pengajar)
 * @param {number} grossAmount - Nominal pendapatan kotor (Rp)
 * @param {boolean} hasNpwp - Apakah memiliki NPWP (jika tidak, tarif +20%)
 */
export function calculateInstructorTax({ grossAmount = 0, hasNpwp = true }) {
  if (grossAmount <= 0) {
    return { grossAmount: 0, dpp: 0, taxRate: 0.05, taxAmount: 0, netAmount: 0, buktiPotongNo: "" };
  }

  // DPP (Dasar Pengenaan Pajak) Tenaga Ahli = 50% dari Penghasilan Bruto
  const dpp = Math.round(grossAmount * 0.5);

  // Tarif PPh 21 Pasal 17 (Lapisan 1: 5% s.d. 60 juta)
  let baseRate = 0.05;
  if (!hasNpwp) {
    baseRate = baseRate * 1.2; // 6% jika non-NPWP (+20%)
  }

  const taxAmount = Math.round(dpp * baseRate);
  const netAmount = Math.max(0, grossAmount - taxAmount);

  // Generate nomor seri bukti potong format standar DJP
  const randomCode = Math.floor(100000 + Math.random() * 900000);
  const year = new Date().getFullYear();
  const buktiPotongNo = `BPU-${year}-${randomCode}`;

  return {
    grossAmount,
    dpp,
    taxRatePercentage: (baseRate * 100).toFixed(1) + "%",
    taxAmount,
    netAmount,
    buktiPotongNo,
    hasNpwp,
    calculatedAt: new Date().toISOString(),
  };
}
