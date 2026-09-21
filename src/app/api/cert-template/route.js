/**
 * GET /api/cert-template          → { success, template }
 * PUT /api/cert-template (admin)  → { success, template }
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  org_name:      z.string().min(1).optional(),
  ecosystem:     z.string().optional(),
  accent_r:      z.number().int().min(0).max(255).optional(),
  accent_g:      z.number().int().min(0).max(255).optional(),
  accent_b:      z.number().int().min(0).max(255).optional(),
  signer1_name:  z.string().optional(),
  signer1_title: z.string().optional(),
  signer2_name:  z.string().optional(),
  signer2_title: z.string().optional(),
  logo_url:      z.string().url().optional().or(z.literal("")),
});

// Default template jika DB tidak tersedia
const DEFAULT_TEMPLATE = {
  org_name: "PT. SDI",
  ecosystem: "Platform Pelatihan & Sertifikasi Kompetensi",
  accent_r: 30, accent_g: 58, accent_b: 138,
  signer1_name: "Prof. Dr. Kadir",
  signer1_title: "PT. SDI",
  // Penanda tangan kedua opsional — kosong berarti sertifikat memakai satu tanda tangan.
  signer2_name: "",
  signer2_title: "",
  logo_url: "",
};

export async function GET(request) {
  try {
    const result = await query("SELECT * FROM cert_templates ORDER BY id LIMIT 1");
    const template = result.rows[0] || DEFAULT_TEMPLATE;
    return NextResponse.json({ success: true, template });
  } catch {
    return NextResponse.json({ success: true, template: DEFAULT_TEMPLATE });
  }
}

export async function PUT(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Hanya admin yang dapat mengubah template" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data = parsed.data;
  const fields = [];
  const values = [];
  let idx = 1;

  const allowed = ["org_name","ecosystem","accent_r","accent_g","accent_b","signer1_name","signer1_title","signer2_name","signer2_title","logo_url"];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(data[key]);
    }
  }
  fields.push(`updated_at = NOW()`);

  if (fields.length === 1) {
    return NextResponse.json({ success: false, error: "Tidak ada perubahan" }, { status: 400 });
  }

  values.push(1); // id = 1 (single-row template)
  try {
    const result = await query(
      `UPDATE cert_templates SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    return NextResponse.json({ success: true, template: result.rows[0] });
  } catch {
    return NextResponse.json({ success: false, error: "Gagal update template" }, { status: 500 });
  }
}
