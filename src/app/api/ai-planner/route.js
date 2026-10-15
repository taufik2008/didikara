import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { callGemini, isMockMode } from "@/lib/ai";
import { query } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export async function GET(request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { rows: history } = await query(
      `SELECT id, planner_type, organization, target_role, current_skills, gap_analysis, recommendations, created_at
       FROM ai_planner_results
       WHERE user_email = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [auth.email]
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("AI Planner GET Error:", error);
    return NextResponse.json({ success: false, error: "Gagal memuat riwayat AI planner" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // Peran diambil dari JWT, bukan header x-user-role yang disuntikkan proxy —
    // header dapat dipalsukan klien jika lapisan proxy terlewat.
    const auth = await authenticateRequest(request);
    if (!auth?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Izin dibaca dari DB, bukan dari peran saja. Menyembunyikan menu di klien
    // tidak menghalangi siapa pun memanggil endpoint ini langsung.
    let permissions = null;
    try {
      const { rows: [row] } = await query("SELECT permissions FROM users WHERE email = $1", [auth.email]);
      permissions = typeof row?.permissions === "string" ? JSON.parse(row.permissions) : row?.permissions ?? null;
    } catch { /* DB tidak tersedia → jatuh ke izin bawaan peran */ }

    if (!hasPermission({ role: auth.role, permissions }, PERMISSIONS.ACCESS_AI_PORTAL)) {
      return NextResponse.json({ success: false, error: "Akses ditolak: izin AI Portal tidak dimiliki" }, { status: 403 });
    }

    const body = await request.json();
    const { type } = body; // 'gov' or 'corp'

    // Kunci belum dikonfigurasi → klien memakai simulasinya sendiri.
    if (isMockMode()) {
      return NextResponse.json({
        success: true,
        isMock: true,
        message: "GEMINI_API_KEY belum diset. Menampilkan hasil simulasi.",
      });
    }

    let prompt = "";
    let orgName = "";
    let targetRole = "";
    if (type === 'gov') {
      const { instansi, jabatan, target, pegawai } = body;
      orgName = instansi || "";
      targetRole = jabatan || "";
      prompt = `Anda adalah AI Training Recommendation Engine untuk AI LMS.
Berdasarkan input perencanaan berikut:
- Nama Instansi/Kementerian: ${instansi}
- Jabatan Target: ${jabatan}
- Kompetensi Target: ${target}
- Jumlah Pegawai: ${pegawai}

Buatlah rekomendasi program pelatihan, sertifikasi keahlian, estimasi anggaran total (logis untuk jumlah pegawai tersebut), durasi, dan jadwal pelaksanaan.
Format JSON output harus tepat seperti berikut:
{
  "budget": <angka estimasi anggaran total dalam rupiah, contoh: 125000000>,
  "duration": "<string durasi, contoh: '3 Bulan'>",
  "steps": [
    { "title": "<tahap atau modul>", "desc": "<deskripsi detail materi dan kegunaan untuk instansi tersebut>" }
  ]
}
HANYA kembalikan JSON. Jangan sertakan teks markdown, penjelasan, atau blok kode. Output harus berupa JSON murni yang valid.`;
    } else {
      const { currentJob, targetJob } = body;
      targetRole = targetJob || "";
      prompt = `Anda adalah Competency Development Planner untuk AI LMS.
Berdasarkan input jalur karir berikut:
- Jabatan Saat Ini: ${currentJob}
- Jabatan Target: ${targetJob}

Buatlah analisis kesenjangan kompetensi (skill gap) dan roadmap pengembangan kompetensi terperinci untuk kenaikan jabatan ini.
Format JSON output harus tepat seperti berikut:
{
  "cost": <angka estimasi biaya total per orang dalam rupiah, contoh: 15000000>,
  "time": "<string estimasi waktu, contoh: '6 Bulan'>",
  "gaps": [
    "<kesenjangan kompetensi atau materi 1>",
    "<kesenjangan kompetensi atau materi 2>"
  ],
  "steps": [
    { "title": "<tahap atau modul>", "desc": "<deskripsi singkat detail pengembangan>" }
  ]
}
HANYA kembalikan JSON. Jangan sertakan teks markdown, penjelasan, atau blok kode. Output harus berupa JSON murni yang valid.`;
    }

    // Satu pintu ke Gemini (lihat lib/ai.js): model, penanganan error, dan
    // pesan kegagalannya seragam dengan fitur AI lainnya.
    const resultText = await callGemini(prompt, { json: true, maxOutputTokens: 2048 });
    const parsedResult = JSON.parse(resultText.trim());

    // Simpan hasil perencanaan ke tabel ai_planner_results (D.4)
    let savedId = null;
    try {
      const { rows: [saved] } = await query(
        `INSERT INTO ai_planner_results (user_email, planner_type, organization, target_role, gap_analysis, recommendations)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          auth.email,
          type || "gov",
          orgName,
          targetRole,
          JSON.stringify(parsedResult.gaps || {}),
          JSON.stringify(parsedResult.steps || parsedResult.recommendations || []),
        ]
      );
      savedId = saved?.id;
    } catch (saveErr) {
      console.warn("Failed to persist AI planner result:", saveErr.message);
    }

    return NextResponse.json({
      success: true,
      isMock: false,
      data: parsedResult,
      savedId,
    });

  } catch (error) {
    console.error("AI Planner Route Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
