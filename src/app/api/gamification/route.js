/**
 * GET  /api/gamification?userEmail=x  — stats poin + badge user
 * POST /api/gamification              — award poin (internal trigger)
 *      body: { userEmail, points, reason }
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";

// XP poin per aksi
export const XP = {
  lesson_complete:  10,
  exam_pass:        50,
  exam_perfect:    100,
  cert_issued:      75,
  streak_bonus:      5,
  forum_post:        3,
  assignment_submit: 15,
  live_attend:       20,
};

// Hitung level dari total poin
function calcLevel(totalPoints) {
  if (totalPoints >= 5000) return 10;
  if (totalPoints >= 3000) return 9;
  if (totalPoints >= 2000) return 8;
  if (totalPoints >= 1500) return 7;
  if (totalPoints >= 1000) return 6;
  if (totalPoints >= 700)  return 5;
  if (totalPoints >= 400)  return 4;
  if (totalPoints >= 200)  return 3;
  if (totalPoints >= 100)  return 2;
  return 1;
}

// Cek & award badge otomatis
async function checkAndAwardBadges(userEmail, stats) {
  const awarded = [];
  try {
    const { rows: allBadges } = await query("SELECT * FROM badges");
    const { rows: existing } = await query(
      "SELECT badge_id FROM user_badges WHERE user_email = $1", [userEmail]
    );
    const ownedIds = new Set(existing.map(r => r.badge_id));

    // Ambil data yang diperlukan untuk pengecekan
    const { rows: [certCount] } = await query(
      "SELECT COUNT(*) FROM certificates WHERE id_code IN (SELECT id_code FROM certificates c JOIN enrollments e ON c.course_id = e.course_id WHERE e.user_email = $1)",
      [userEmail]
    ).catch(() => ({ rows: [{ count: 0 }] }));

    const userStats = {
      total_points: stats.totalPoints || 0,
      streak_days:  stats.streakDays  || 0,
      cert_count:   parseInt(certCount?.count || 0),
    };

    for (const badge of allBadges) {
      if (ownedIds.has(badge.id)) continue;
      let earned = false;
      if (badge.criteria_type === "total_points" && userStats.total_points >= badge.criteria_value) earned = true;
      if (badge.criteria_type === "streak_days"  && userStats.streak_days  >= badge.criteria_value) earned = true;
      if (badge.criteria_type === "cert_count"   && userStats.cert_count   >= badge.criteria_value) earned = true;
      if (badge.criteria_type === "login_count"  && badge.criteria_value <= 1) earned = true;

      if (earned) {
        await query(
          "INSERT INTO user_badges (user_email, badge_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
          [userEmail, badge.id]
        );
        // Kirim notifikasi in-app
        await query(
          `INSERT INTO notifications (user_email, type, title, message)
           VALUES ($1, 'success', $2, $3)`,
          [userEmail, `Badge Baru: ${badge.icon} ${badge.name}`, badge.description]
        ).catch(() => {});
        awarded.push(badge);
      }
    }
  } catch { /* opsional */ }
  return awarded;
}

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const targetEmail = searchParams.get("userEmail") || user.email;

  // Non-admin hanya bisa lihat diri sendiri
  if (user.role !== "admin" && targetEmail !== user.email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Upsert user_points jika belum ada
    await query(
      `INSERT INTO user_points (user_email) VALUES ($1) ON CONFLICT (user_email) DO NOTHING`,
      [targetEmail]
    );

    const { rows: [pts] } = await query(
      "SELECT * FROM user_points WHERE user_email = $1", [targetEmail]
    );
    const { rows: badges } = await query(
      `SELECT b.*, ub.awarded_at FROM user_badges ub
       JOIN badges b ON b.id = ub.badge_id
       WHERE ub.user_email = $1 ORDER BY ub.awarded_at DESC`,
      [targetEmail]
    );
    const { rows: allBadges } = await query("SELECT * FROM badges ORDER BY criteria_value");

    return NextResponse.json({
      success: true,
      points: pts,
      level: calcLevel(pts?.total_points || 0),
      badges,
      allBadges,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Pemberian poin manual. Endpoint ini dulu terbuka untuk siapa pun yang login
 * DAN menerima `userEmail` sembarang, sehingga peserta dapat menaikkan XP,
 * level, badge, dan posisi papan peringkatnya sendiri — atau milik orang lain.
 * XP dari aktivitas nyata (lulus ujian, menyelesaikan pelajaran, hadir live
 * class) diberikan langsung oleh route masing-masing, bukan lewat sini.
 */
export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Poin hanya dapat diberikan administrator" }, { status: 403 }
    );
  }

  const { userEmail, points, reason } = await request.json();
  const targetEmail = userEmail || user.email;

  if (!points || points <= 0) {
    return NextResponse.json({ error: "points harus > 0" }, { status: 400 });
  }

  try {
    // Upsert poin
    const { rows: [updated] } = await query(
      `INSERT INTO user_points (user_email, points, total_points, level, last_activity_date, updated_at)
       VALUES ($1, $2, $2, 1, CURRENT_DATE, NOW())
       ON CONFLICT (user_email) DO UPDATE SET
         points       = user_points.points + $2,
         total_points = user_points.total_points + $2,
         level        = EXCLUDED.level,
         last_activity_date = CURRENT_DATE,
         updated_at   = NOW()
       RETURNING *`,
      [targetEmail, points]
    );

    // Update level
    const newLevel = calcLevel(updated.total_points);
    if (newLevel !== updated.level) {
      await query("UPDATE user_points SET level = $1 WHERE user_email = $2", [newLevel, targetEmail]);
      updated.level = newLevel;
    }

    // Cek badge
    const newBadges = await checkAndAwardBadges(targetEmail, {
      totalPoints: updated.total_points,
      streakDays:  updated.streak_days,
    });

    return NextResponse.json({ success: true, points: updated, newBadges, reason });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
