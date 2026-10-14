/**
 * POST /api/upload/drive
 * Upload file materi (PDF/PPTX) ke Google Drive via Service Account.
 *
 * Konfigurasi di .env.local:
 *   GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":...}
 *   GOOGLE_DRIVE_FOLDER_ID=1aBcDeFgHiJkLmNoPqRsTuVwXyZ
 *
 * Body: multipart/form-data — field "file" + field "courseId"
 * Response: { success: true, url: string, fileId: string }
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";

export async function POST(request) {
  try {
    const user = await authenticateRequest(request);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (!["admin", "corporate", "government"].includes(user.role))
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    // Baca dari DB dulu, fallback ke env
    let saJson   = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    try {
      const { query } = await import("@/lib/db");
      const { rows }  = await query("SELECT key, value FROM platform_settings WHERE key IN ('google_service_account_json','google_drive_folder_id')");
      rows.forEach(r => {
        if (r.key === "google_service_account_json" && r.value) saJson   = r.value;
        if (r.key === "google_drive_folder_id"      && r.value) folderId = r.value;
      });
    } catch { /* pakai env */ }
    if (!saJson || !folderId)
      return NextResponse.json({ success: false, error: "Google Drive belum dikonfigurasi" }, { status: 500 });

    const formData = await request.formData();
    const file     = formData.get("file");
    const courseId = formData.get("courseId") || "general";

    if (!file || typeof file === "string")
      return NextResponse.json({ success: false, error: "File tidak ditemukan" }, { status: 400 });

    const buffer      = Buffer.from(await file.arrayBuffer());
    const mimeType    = file.type;
    const originalName = file.name.replace(/[^a-zA-Z0-9._\-\s]/g, "_");
    const fileName    = `[${courseId}] ${Date.now()}-${originalName}`;

    // Init googleapis
    const { google } = await import("googleapis");
    const serviceAccount = JSON.parse(saJson);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    const drive = google.drive({ version: "v3", auth });

    // Upload ke Drive
    const { Readable } = await import("stream");
    const stream = Readable.from(buffer);

    const uploaded = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
        mimeType,
      },
      media: { mimeType, body: stream },
      fields: "id,name,mimeType",
    });

    const fileId = uploaded.data.id;

    // Set permission: anyone with link can view
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
    });

    // Buat URL yang bisa di-embed langsung ke iframe player
    let url;
    if (mimeType === "application/pdf") {
      url = `https://drive.google.com/file/d/${fileId}/preview`;
    } else if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
      url = `https://docs.google.com/presentation/d/${fileId}/embed?start=false&loop=false&delayms=3000`;
    } else {
      // Untuk video (MP4, WEBM, dll.) dan berkas media lainnya, gunakan /preview agar bisa di-embed langsung
      url = `https://drive.google.com/file/d/${fileId}/preview`;
    }

    return NextResponse.json({ success: true, url, fileId, fileName });
  } catch (err) {
    console.error("Drive upload error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
