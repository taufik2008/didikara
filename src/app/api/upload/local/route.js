import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { mkdir } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = new Set([
  // Video
  "mp4", "webm", "ogg",
  // Dokumen
  "pdf", "pptx", "ppt", "docx", "xlsx",
  // Gambar
  "png", "jpg", "jpeg", "webp", "gif"
]);

const DANGEROUS_EXTENSIONS = new Set([
  "html", "htm", "svg", "js", "mjs", "cjs", "jsx", "ts", "tsx",
  "php", "exe", "bat", "cmd", "sh", "ps1", "vbs", "jar", "war"
]);

function validateFilename(filename) {
  if (!filename || typeof filename !== "string") return null;
  const cleanName = path.basename(filename).trim();
  const parts = cleanName.split(".");
  if (parts.length < 2) return null;
  const ext = parts.pop().toLowerCase();
  
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Tipe file .${ext} dilarang demi keamanan sistem.` };
  }
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Ekstensi .${ext} tidak didukung. Harap unggah video (mp4/webm), dokumen (pdf/pptx), atau gambar.` };
  }
  
  const base = parts.join(".").replace(/[^a-zA-Z0-9._-]/g, "_");
  const safeName = `${Date.now()}-${base}.${ext}`;
  return { valid: true, safeName, ext };
}

export async function POST(request) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Sesi login belum aktif atau kedaluwarsa (Unauthorized)" },
        { status: 401 }
      );
    }

    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          success: false,
          error: "Penyimpanan berkas lokal tidak didukung di lingkungan Vercel Serverless (filesystem read-only). Silakan gunakan tautan URL video langsung (Google Drive, YouTube, Vimeo, atau direct MP4 URL) pada kolom URL materi, atau hubungkan Cloud Storage (S3 / Cloudflare R2) di Pengaturan Platform.",
        },
        { status: 400 }
      );
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    // Method 1: Direct Binary Stream
    const rawFilename = request.headers.get("x-filename");
    const uploadScope = request.headers.get("x-upload-scope") || "material";

    if (rawFilename) {
      const decodedName = decodeURIComponent(rawFilename);
      const validation = validateFilename(decodedName);
      if (!validation?.valid) {
        return NextResponse.json(
          { success: false, error: validation?.error || "Format nama file tidak valid" },
          { status: 400 }
        );
      }

      // Siswa hanya boleh mengunggah PDF (tugas) atau gambar (avatar)
      if (user.role === "student" && !["pdf", "png", "jpg", "jpeg", "webp"].includes(validation.ext)) {
        return NextResponse.json(
          { success: false, error: "Peserta hanya diperkenankan mengunggah berkas PDF tugas atau gambar profil." },
          { status: 403 }
        );
      }

      const filePath = path.join(uploadsDir, validation.safeName);

      if (!request.body) {
        return NextResponse.json({ success: false, error: "Body stream kosong" }, { status: 400 });
      }

      const nodeStream = Readable.fromWeb(request.body);
      const writeStream = createWriteStream(filePath);
      await pipeline(nodeStream, writeStream);

      const publicUrl = `/uploads/${validation.safeName}`;
      return NextResponse.json({
        success: true,
        url: publicUrl,
        filename: validation.safeName,
        message: "File berhasil diunggah ke penyimpanan lokal.",
      });
    }

    // Method 2: FormData Fallback
    try {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!file || typeof file === "string") {
        return NextResponse.json({ success: false, error: "File tidak ditemukan dalam form" }, { status: 400 });
      }

      const validation = validateFilename(file.name);
      if (!validation?.valid) {
        return NextResponse.json(
          { success: false, error: validation?.error || "Format nama file tidak valid" },
          { status: 400 }
        );
      }

      if (user.role === "student" && !["pdf", "png", "jpg", "jpeg", "webp"].includes(validation.ext)) {
        return NextResponse.json(
          { success: false, error: "Peserta hanya diperkenankan mengunggah berkas PDF tugas atau gambar profil." },
          { status: 403 }
        );
      }

      const filePath = path.join(uploadsDir, validation.safeName);
      const bytes = await file.arrayBuffer();
      const { writeFile } = await import("node:fs/promises");
      await writeFile(filePath, Buffer.from(bytes));

      const publicUrl = `/uploads/${validation.safeName}`;
      return NextResponse.json({
        success: true,
        url: publicUrl,
        filename: validation.safeName,
        message: "File berhasil diunggah ke penyimpanan lokal.",
      });
    } catch (formErr) {
      throw new Error(`Gagal memproses berkas: ${formErr.message}`);
    }
  } catch (err) {
    console.error("Local upload error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
