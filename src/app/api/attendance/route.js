/**
 * POST /api/attendance   { courseId, action: "in" | "out", latitude?, longitude?, accuracy? }
 * GET  /api/attendance?courseId=x[&all=1][&date=YYYY-MM-DD]
 *
 * Menggantikan catatan kehadiran yang selama ini ditulis mati di klien
 * ("IP: 192.168.1.45, Lokasi GPS Terverifikasi"): alamat IP kini dibaca dari
 * header permintaan di server, koordinat dikirim peramban hanya bila peserta
 * mengizinkan, dan satu baris disimpan per peserta per kursus per hari.
 *
 * Catatan kejujuran data: IP di balik proxy/VPN dan koordinat dari peramban
 * sama-sama bisa dipalsukan. Ini bukti kehadiran administratif, bukan bukti
 * lokasi forensik — jangan dipakai untuk klaim yang lebih kuat dari itu.
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { canManageCourse, isEnrolled } from "@/lib/courseAccess";
import { z } from "zod";

const bodySchema = z.object({
  courseId:  z.string().min(1),
  action:    z.enum(["in", "out"]),
  latitude:  z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  accuracy:  z.number().min(0).optional(),
});

function alamatIP(request) {
  const fwd = request.headers.get("x-forwarded-for") || "";
  return (fwd.split(",")[0] || request.headers.get("x-real-ip") || "").trim().slice(0, 64);
}

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { courseId, action, latitude, longitude, accuracy } = parsed.data;

  if (!(await isEnrolled(user.email, courseId))) {
    return NextResponse.json({ error: "Anda belum terdaftar di kursus ini" }, { status: 403 });
  }

  const ip = alamatIP(request);
  const ua = (request.headers.get("user-agent") || "").slice(0, 400);

  try {
    if (action === "in") {
      const { rows: [baris] } = await query(`
        INSERT INTO class_attendance
          (course_id, user_email, session_date, check_in_at, ip_address, user_agent, latitude, longitude, accuracy_m)
        VALUES ($1,$2,CURRENT_DATE,NOW(),$3,$4,$5,$6,$7)
        ON CONFLICT (course_id, user_email, session_date) DO NOTHING
        RETURNING *
      `, [courseId, user.email, ip, ua, latitude ?? null, longitude ?? null, accuracy ?? null]);

      if (!baris) {
        const { rows: [sudah] } = await query(
          `SELECT * FROM class_attendance
            WHERE course_id = $1 AND user_email = $2 AND session_date = CURRENT_DATE`,
          [courseId, user.email]
        );
        return NextResponse.json({
          success: true, sudahAda: true, attendance: sudah,
          message: "Anda sudah tercatat hadir hari ini.",
        });
      }
      return NextResponse.json({ success: true, attendance: baris, message: "Check-in tercatat." });
    }

    // action === "out"
    const { rows: [keluar] } = await query(`
      UPDATE class_attendance SET check_out_at = NOW()
       WHERE course_id = $1 AND user_email = $2 AND session_date = CURRENT_DATE
         AND check_out_at IS NULL
       RETURNING *
    `, [courseId, user.email]);

    if (!keluar) {
      return NextResponse.json(
        { error: "Belum ada check-in hari ini, atau check-out sudah dilakukan." }, { status: 409 }
      );
    }
    return NextResponse.json({ success: true, attendance: keluar, message: "Check-out tercatat." });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  const semua    = searchParams.get("all") === "1";
  const tanggal  = searchParams.get("date") || "";
  if (!courseId) return NextResponse.json({ error: "courseId wajib" }, { status: 400 });

  const pengelola = semua ? await canManageCourse(user, courseId) : false;
  if (semua && !pengelola) {
    return NextResponse.json({ error: "Anda bukan pengajar kursus ini" }, { status: 403 });
  }

  try {
    const params = [courseId];
    let filter = "a.course_id = $1";
    if (!pengelola) { params.push(user.email); filter += ` AND a.user_email = $${params.length}`; }
    if (tanggal)    { params.push(tanggal);    filter += ` AND a.session_date = $${params.length}`; }

    const { rows } = await query(`
      SELECT a.*, u.fullname, u.organization
        FROM class_attendance a
        LEFT JOIN users u ON u.email = a.user_email
       WHERE ${filter}
       ORDER BY a.session_date DESC, a.check_in_at DESC
       LIMIT 200
    `, params);

    return NextResponse.json({ success: true, attendance: rows, canManage: pengelola });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
