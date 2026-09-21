/**
 * POST /api/gamification/redeem — Tukar Poin XP dengan Hadiah / Voucher Diskon
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";

const REWARDS_CATALOG = {
  "voucher-25k": {
    id: "voucher-25k",
    title: "Voucher Diskon Pelatihan Rp 25.000",
    cost: 200,
    prefix: "XP25K",
    discountAmount: 25000,
    desc: "Potongan harga Rp 25.000 untuk kursus apa pun di Marketplace.",
  },
  "voucher-50k": {
    id: "voucher-50k",
    title: "Voucher Diskon Pelatihan Rp 50.000",
    cost: 400,
    prefix: "XP50K",
    discountAmount: 50000,
    desc: "Potongan harga Rp 50.000 untuk kursus apa pun di Marketplace.",
  },
  "voucher-100k": {
    id: "voucher-100k",
    title: "Voucher Spesial Pelatihan Rp 100.000",
    cost: 750,
    prefix: "XP100K",
    discountAmount: 100000,
    desc: "Potongan harga Rp 100.000 untuk paket kursus dan sertifikasi.",
  },
  "badge-gold": {
    id: "badge-gold",
    title: "Lencana Kehormatan: Top Learner Gold",
    cost: 300,
    prefix: null,
    badgeId: "top-scholar",
    desc: "Lencana eksklusif yang terpampang di profil dan portofolio Anda.",
  },
};

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    success: true,
    catalog: Object.values(REWARDS_CATALOG),
  });
}

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { rewardId } = body;

  const reward = REWARDS_CATALOG[rewardId];
  if (!reward) {
    return NextResponse.json({ error: "Pilihan hadiah tidak valid" }, { status: 400 });
  }

  try {
    // Ambil poin user saat ini
    const { rows: [pts] } = await query(
      "SELECT * FROM user_points WHERE user_email = $1",
      [user.email]
    );

    const currentPoints = pts?.points || 0;
    if (currentPoints < reward.cost) {
      return NextResponse.json({
        error: `XP Anda tidak mencukupi. Dibutuhkan ${reward.cost} XP (Saldo Anda: ${currentPoints} XP).`,
      }, { status: 400 });
    }

    // Kurangi poin
    const newPoints = currentPoints - reward.cost;
    await query(
      "UPDATE user_points SET points = $1, updated_at = NOW() WHERE user_email = $2",
      [newPoints, user.email]
    );

    let voucherCode = null;
    if (reward.prefix) {
      // Generate kode unik 5-karakter
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      voucherCode = `${reward.prefix}-${randomSuffix}`;
    }

    // Jika berupa lencana, berikan ke user_badges
    if (reward.badgeId) {
      await query(
        "INSERT INTO user_badges (user_email, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [user.email, reward.badgeId]
      ).catch(() => {});
    }

    // Kirim notifikasi in-app
    await query(
      `INSERT INTO notifications (user_email, type, title, message)
       VALUES ($1, 'success', $2, $3)`,
      [
        user.email,
        `Penukaran XP Berhasil: ${reward.title}`,
        voucherCode
          ? `Gunakan kode kupon [${voucherCode}] saat checkout di Marketplace untuk mendapatkan diskon!`
          : `Lencana kehormatan baru telah ditambahkan ke profil Anda.`
      ]
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Selamat! Penukaran ${reward.title} berhasil.`,
      voucherCode,
      reward,
      remainingPoints: newPoints,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
