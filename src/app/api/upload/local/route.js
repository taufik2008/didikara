import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { mkdir } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Sesi login belum aktif atau kedaluwarsa (Unauthorized)" },
        { status: 401 }
      );
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    // Method 1: Direct Binary Stream (Highly recommended for large videos to avoid FormData parser memory limit)
    const rawFilename = request.headers.get("x-filename");
    if (rawFilename) {
      const decodedName = decodeURIComponent(rawFilename);
      const safeName = decodedName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filename = `${Date.now()}-${safeName}`;
      const filePath = path.join(uploadsDir, filename);

      if (!request.body) {
        return NextResponse.json({ success: false, error: "Body stream kosong" }, { status: 400 });
      }

      const nodeStream = Readable.fromWeb(request.body);
      const writeStream = createWriteStream(filePath);
      await pipeline(nodeStream, writeStream);

      const publicUrl = `/uploads/${filename}`;
      return NextResponse.json({
        success: true,
        url: publicUrl,
        filename,
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

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filename = `${Date.now()}-${safeName}`;
      const filePath = path.join(uploadsDir, filename);

      const bytes = await file.arrayBuffer();
      const { writeFile } = await import("node:fs/promises");
      await writeFile(filePath, Buffer.from(bytes));

      const publicUrl = `/uploads/${filename}`;
      return NextResponse.json({
        success: true,
        url: publicUrl,
        filename,
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
