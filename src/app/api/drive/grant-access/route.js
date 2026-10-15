import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";

function extractDriveFileId(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  const m = trimmed.match(/(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?.*id=|uc\?.*id=|document\/d\/|presentation\/d\/)?([a-zA-Z0-9_-]{15,})/i);
  return m ? m[1] : null;
}

export async function POST(request) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const rawUrl = body.url || "";
    const directFileId = body.fileId || "";
    const userEmail = body.userEmail || "";

    const fileId = directFileId || extractDriveFileId(rawUrl);

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: "ID file Google Drive tidak ditemukan dari URL yang diberikan" },
        { status: 400 }
      );
    }

    // Ambil konfigurasi Google Service Account dari DB atau Env
    let saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    try {
      const { query } = await import("@/lib/db");
      const { rows } = await query(
        "SELECT key, value FROM platform_settings WHERE key = 'google_service_account_json'"
      );
      if (rows.length > 0 && rows[0].value) {
        const { decryptValue } = await import("@/lib/crypto");
        saJson = decryptValue(rows[0].value);
      }
    } catch {
      // Gunakan env
    }

    const shareUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;

    if (!saJson) {
      return NextResponse.json({
        success: false,
        fileId,
        previewUrl,
        shareUrl,
        reason: "no_service_account",
        message:
          "Google Service Account belum dikonfigurasi di pengaturan platform. Pastikan pengaturan berbagi file di Google Drive diatur ke 'Siapa saja yang memiliki link (Pelihat/Viewer)'.",
      });
    }

    // Inisialisasi Google Drive API
    const { google } = await import("googleapis");
    const serviceAccount = JSON.parse(saJson);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    const drive = google.drive({ version: "v3", auth });

    // 1. Coba berikan izin 'anyone' dengan role 'reader' (Siapa saja yang memiliki link)
    try {
      await drive.permissions.create({
        fileId,
        requestBody: { role: "reader", type: "anyone" },
      });

      return NextResponse.json({
        success: true,
        fileId,
        previewUrl,
        permission: "anyone",
        message: "Akses Google Drive berhasil disetel ke publik ('Siapa saja yang memiliki link dapat melihat').",
      });
    } catch (anyoneErr) {
      console.warn("Drive permission (anyone) failed, trying user specific if applicable:", anyoneErr.message);

      // 2. Jika gagal karena domain policy atau pembatasan, coba beri akses khusus ke email user (peserta)
      if (userEmail && userEmail.includes("@") && !userEmail.endsWith("@ailms.id")) {
        try {
          await drive.permissions.create({
            fileId,
            requestBody: { role: "reader", type: "user", emailAddress: userEmail },
          });

          return NextResponse.json({
            success: true,
            fileId,
            previewUrl,
            permission: "user",
            userEmail,
            message: `Akses Google Drive berhasil diberikan khusus ke akun ${userEmail}.`,
          });
        } catch (userErr) {
          console.warn("Drive permission (user) failed:", userErr.message);
        }
      }

      // 3. Jika Service Account tidak memiliki hak akses atas file (mis. file ada di Drive pribadi akun lain)
      return NextResponse.json({
        success: false,
        fileId,
        previewUrl,
        shareUrl,
        reason: "manual_share_required",
        error: anyoneErr.message,
        message:
          "File berada di Google Drive pribadi dan belum dibagikan ke Service Account. Silakan buka file di Google Drive dan ubah akses menjadi 'Siapa saja yang memiliki link' (Anyone with the link).",
      });
    }
  } catch (error) {
    console.error("Grant access error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
