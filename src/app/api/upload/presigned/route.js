/**
 * POST /api/upload/presigned
 * Menghasilkan presigned URL untuk upload file materi kursus ke S3 / R2.
 *
 * Body: { filename: string, contentType: string, courseId: string }
 * Response: { url: string, fields: object, finalUrl: string, mockMode: boolean }
 *
 * Konfigurasi (di .env.local):
 *   S3_BUCKET_NAME=my-bucket
 *   S3_REGION=ap-southeast-1
 *   S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com   (opsional, untuk R2/MinIO)
 *   AWS_ACCESS_KEY_ID=...
 *   AWS_SECRET_ACCESS_KEY=...
 *   NEXT_PUBLIC_CDN_URL=https://cdn.example.com          (opsional, URL publik CDN)
 */

import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { canManageCourse, isEnrolled } from "@/lib/courseAccess";
import { z } from "zod";

// GET — deteksi strategi upload yang tersedia (baca DB lalu env)
export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { query } = await import("@/lib/db");
    const { rows }  = await query("SELECT key, value FROM platform_settings WHERE key IN ('storage_provider','google_drive_folder_id','google_service_account_json','s3_bucket','s3_access_key_id')");
    const s = {};
    rows.forEach(r => { s[r.key] = r.value; });

    const provider = s.storage_provider || process.env.STORAGE_PROVIDER || "mock";

    if (provider === "drive" && (s.google_service_account_json || process.env.GOOGLE_SERVICE_ACCOUNT_JSON) && (s.google_drive_folder_id || process.env.GOOGLE_DRIVE_FOLDER_ID)) {
      return NextResponse.json({ success: true, strategy: "drive", uploadUrl: "/api/upload/drive" });
    }
    if (provider === "s3" && (s.s3_bucket || process.env.S3_BUCKET_NAME) && (s.s3_access_key_id || process.env.AWS_ACCESS_KEY_ID)) {
      return NextResponse.json({ success: true, strategy: "s3" });
    }
  } catch { /* fallback ke env */ }

  // Env fallback
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_DRIVE_FOLDER_ID)
    return NextResponse.json({ success: true, strategy: "drive", uploadUrl: "/api/upload/drive" });
  if (process.env.S3_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID)
    return NextResponse.json({ success: true, strategy: "s3" });

  return NextResponse.json({ success: true, strategy: "local", uploadUrl: "/api/upload/local" });
}

const bodySchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  courseId: z.string().min(1),
  // "material"   → materi kursus, hanya pengajar/admin
  // "assignment" → berkas tugas peserta, hanya yang terdaftar di kelas
  scope: z.enum(["material", "assignment"]).optional().default("material"),
});

const ALLOWED_TYPES = [
  "video/mp4", "video/webm", "video/ogg",
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg", "image/png", "image/gif", "image/webp",
];

const MAX_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

export async function POST(request) {
  try {
    const user = await authenticateRequest(request);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues.map(e => e.message).join("; ") }, { status: 400 });
    }

    const { filename, contentType, courseId, scope } = parsed.data;

    // Dua jenis unggahan dengan izin yang berbeda: materi kursus hanya boleh
    // dari pengajar kursus itu, sedangkan berkas tugas justru datang dari
    // peserta — dan dulu tidak punya jalur sama sekali.
    if (scope === "assignment") {
      if (!(await isEnrolled(user.email, courseId))) {
        return NextResponse.json({ success: false, error: "Anda belum terdaftar di kursus ini" }, { status: 403 });
      }
      if (contentType !== "application/pdf") {
        return NextResponse.json({ success: false, error: "Tugas hanya menerima berkas PDF" }, { status: 400 });
      }
    } else {
      if (!(await canManageCourse(user, courseId))) {
        return NextResponse.json({ success: false, error: "Hanya pengajar kursus ini yang dapat mengunggah materi" }, { status: 403 });
      }
      if (!ALLOWED_TYPES.includes(contentType)) {
        return NextResponse.json({ success: false, error: `Tipe file tidak diizinkan: ${contentType}` }, { status: 400 });
      }
    }

    const s3Bucket = process.env.S3_BUCKET_NAME;
    const s3Region = process.env.S3_REGION;
    const awsKey = process.env.AWS_ACCESS_KEY_ID;
    const awsSecret = process.env.AWS_SECRET_ACCESS_KEY;

    // ── Mode S3 nyata ──────────────────────────────────────────────────────────
    if (s3Bucket && s3Region && awsKey && awsSecret) {
      try {
        const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
        const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

        const clientConfig = {
          region: s3Region,
          credentials: { accessKeyId: awsKey, secretAccessKey: awsSecret },
        };
        if (process.env.S3_ENDPOINT) clientConfig.endpoint = process.env.S3_ENDPOINT;

        const s3 = new S3Client(clientConfig);
        const namaAman = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        const key = scope === "assignment"
          ? `assignments/${courseId}/${user.email.replace(/[^a-zA-Z0-9._-]/g, "_")}/${Date.now()}-${namaAman}`
          : `courses/${courseId}/${Date.now()}-${namaAman}`;

        const cmd = new PutObjectCommand({
          Bucket: s3Bucket,
          Key: key,
          ContentType: contentType,
          ContentLength: MAX_SIZE_BYTES,
        });

        const presignedUrl = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
        const cdnBase = process.env.NEXT_PUBLIC_CDN_URL || `https://${s3Bucket}.s3.${s3Region}.amazonaws.com`;
        const finalUrl = `${cdnBase}/${key}`;

        return NextResponse.json({ success: true, url: presignedUrl, fields: {}, finalUrl, mockMode: false, key });
      } catch (s3Err) {
        console.error("S3 presigned URL error:", s3Err);
        // Jatuhkan ke mode mock jika SDK gagal
      }
    }

    // ── Mode Demo / Mock ───────────────────────────────────────────────────────
    // Digunakan ketika S3 tidak dikonfigurasi. Frontend melakukan simulasi upload.
    const mockKey = `${scope === "assignment" ? "assignments" : "courses"}/${courseId}/${Date.now()}-${filename}`;
    return NextResponse.json({
      success: true,
      url: `/api/upload/mock`, // endpoint dummy
      fields: { key: mockKey, "Content-Type": contentType },
      finalUrl: "", // kosong — frontend harus isi URL manual
      mockMode: true,
      message: "S3 tidak dikonfigurasi. Upload disimulasikan. Isi URL materi secara manual.",
    });
  } catch (err) {
    console.error("POST /api/upload/presigned error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
