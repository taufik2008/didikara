/**
 * GET  /api/organizations          → list organisations + departments
 * POST /api/organizations          → create org
 * PUT  /api/organizations?id=1     → update org
 * DELETE /api/organizations?id=1   → soft delete
 *
 * POST /api/organizations?action=dept         → create dept
 * PUT  /api/organizations?action=dept&id=1    → update dept
 * DELETE /api/organizations?action=dept&id=1  → soft delete dept
 *
 * POST /api/organizations?action=assign  body:{userEmail, departmentId}  → assign user to dept
 */
import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";
import { organisasiPengguna } from "@/lib/courseAccess";
import { catatAudit } from "@/lib/audit";

/**
 * Modul organisasi menampung banyak instansi sekaligus. Sebelumnya GET
 * mengembalikan SELURUH organisasi beserta jumlah pegawainya kepada setiap
 * pengguna yang login, dan peran corporate/government dapat membuat serta
 * mengubah organisasi milik siapa pun. Kini setiap operasi dibatasi pada
 * organisasi pemanggil; admin tetap melihat dan mengelola semuanya.
 */

/** Kembalikan id organisasi pemanggil, atau null bila ia admin (bebas). */
async function batasOrganisasi(user) {
  if (user.role === "admin") return { admin: true, id: null };
  const org = await organisasiPengguna(user.email);
  return { admin: false, id: org?.id ?? null, nama: org?.nama || "" };
}

const orgSchema  = z.object({ name: z.string().min(1), code: z.string().optional(), description: z.string().optional() });
const deptSchema = z.object({ organizationId: z.number().int(), name: z.string().min(1), code: z.string().optional() });
const assignSchema = z.object({ userEmail: z.string().email(), departmentId: z.number().int().nullable() });

export async function GET(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const batas = await batasOrganisasi(user);
  if (!batas.admin && !batas.id) {
    return NextResponse.json({ success: true, organizations: [] });
  }

  try {
    const orgs = await query(`
      SELECT o.*,
        json_agg(
          json_build_object('id', d.id, 'name', d.name, 'code', d.code,
            'user_count', (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.deleted_at IS NULL))
          ORDER BY d.name
        ) FILTER (WHERE d.id IS NOT NULL) AS departments
      FROM organizations o
      LEFT JOIN departments d ON d.organization_id = o.id AND d.deleted_at IS NULL
      WHERE o.deleted_at IS NULL
        AND ($1::int IS NULL OR o.id = $1)
      GROUP BY o.id
      ORDER BY o.name
    `, [batas.admin ? null : batas.id]);
    return NextResponse.json({ success: true, organizations: orgs.rows });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 503 });
  }
}

/** Bolehkah pemanggil menyentuh organisasi/departemen dengan id ini? */
async function bolehSentuh(batas, action, id) {
  if (batas.admin) return true;
  if (!batas.id || !id) return false;
  if (action === "dept") {
    const { rows: [dept] } = await query(
      "SELECT organization_id FROM departments WHERE id = $1", [id]
    );
    return dept?.organization_id === batas.id;
  }
  return id === batas.id;
}

export async function POST(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "org";
  const body = await request.json();
  const batas = await batasOrganisasi(user);

  try {
    if (action === "org") {
      // Organisasi baru hanya dibuat admin: ini menentukan batas tenancy,
      // bukan sekadar data master biasa.
      if (!batas.admin) {
        return NextResponse.json({ error: "Hanya admin yang dapat membuat organisasi" }, { status: 403 });
      }
      const p = orgSchema.safeParse(body);
      if (!p.success) return NextResponse.json({ error: p.error.issues[0].message }, { status: 400 });
      const r = await query(
        "INSERT INTO organizations (name, code, description) VALUES ($1,$2,$3) RETURNING *",
        [p.data.name, p.data.code||null, p.data.description||""]
      );
      await catatAudit(user.email, "create_organization", "organization", r.rows[0].id, { name: p.data.name });
      return NextResponse.json({ success: true, organization: r.rows[0] }, { status: 201 });
    }
    if (action === "dept") {
      const p = deptSchema.safeParse(body);
      if (!p.success) return NextResponse.json({ error: p.error.issues[0].message }, { status: 400 });
      if (!batas.admin && p.data.organizationId !== batas.id) {
        return NextResponse.json({ error: "Organisasi ini bukan milik Anda" }, { status: 403 });
      }
      const r = await query(
        "INSERT INTO departments (organization_id, name, code) VALUES ($1,$2,$3) RETURNING *",
        [p.data.organizationId, p.data.name, p.data.code||null]
      );
      await catatAudit(user.email, "create_department", "department", r.rows[0].id, {
        organization_id: p.data.organizationId, name: p.data.name,
      });
      return NextResponse.json({ success: true, department: r.rows[0] }, { status: 201 });
    }
    if (action === "assign") {
      const p = assignSchema.safeParse(body);
      if (!p.success) return NextResponse.json({ error: p.error.issues[0].message }, { status: 400 });

      // Departemen tujuan harus berada di organisasi pemanggil.
      let orgTujuan = null;
      if (p.data.departmentId !== null) {
        const { rows: [dept] } = await query(
          `SELECT d.id, d.organization_id, o.name AS org_name
             FROM departments d JOIN organizations o ON o.id = d.organization_id
            WHERE d.id = $1 AND d.deleted_at IS NULL`,
          [p.data.departmentId]
        );
        if (!dept) return NextResponse.json({ error: "Departemen tidak ditemukan" }, { status: 404 });
        if (!batas.admin && dept.organization_id !== batas.id) {
          return NextResponse.json({ error: "Departemen ini bukan milik organisasi Anda" }, { status: 403 });
        }
        orgTujuan = dept;
      }

      // Pengguna yang dipindahkan pun harus berasal dari organisasi pemanggil.
      if (!batas.admin) {
        const { rows: [target] } = await query(
          "SELECT organization_id FROM users WHERE email = $1 AND deleted_at IS NULL",
          [p.data.userEmail]
        );
        if (!target) return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
        if (target.organization_id !== batas.id) {
          return NextResponse.json({ error: "Pengguna ini bukan anggota organisasi Anda" }, { status: 403 });
        }
      }

      // Relasi adalah sumber kebenaran; kolom teks `organization` diturunkan
      // darinya supaya laporan dan struktur organisasi tidak lagi berbeda.
      await query(
        `UPDATE users
            SET department_id   = $1,
                organization_id = COALESCE($2, organization_id),
                organization    = COALESCE($3, organization)
          WHERE email = $4`,
        [p.data.departmentId, orgTujuan?.organization_id ?? null, orgTujuan?.org_name ?? null, p.data.userEmail]
      );
      await catatAudit(user.email, "assign_department", "user", p.data.userEmail, {
        department_id: p.data.departmentId, organization_id: orgTujuan?.organization_id ?? null,
      });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "action tidak valid" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const batas = await batasOrganisasi(user);

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "org";
  const id = parseInt(searchParams.get("id") || "0");
  const body = await request.json();

  if (!(await bolehSentuh(batas, action, id))) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    if (action === "org") {
      const p = orgSchema.partial().safeParse(body);
      if (!p.success) return NextResponse.json({ error: p.error.issues[0].message }, { status: 400 });
      const sets = [], vals = [];
      if (p.data.name) { sets.push(`name=$${sets.length+1}`); vals.push(p.data.name); }
      if (p.data.code !== undefined) { sets.push(`code=$${sets.length+1}`); vals.push(p.data.code); }
      if (p.data.description !== undefined) { sets.push(`description=$${sets.length+1}`); vals.push(p.data.description); }
      vals.push(id);
      const r = await query(`UPDATE organizations SET ${sets.join(",")} WHERE id=$${vals.length} RETURNING *`, vals);
      return NextResponse.json({ success: true, organization: r.rows[0] });
    }
    if (action === "dept") {
      const p = deptSchema.partial().safeParse(body);
      if (!p.success) return NextResponse.json({ error: p.error.issues[0].message }, { status: 400 });
      const sets = [], vals = [];
      if (p.data.name) { sets.push(`name=$${sets.length+1}`); vals.push(p.data.name); }
      if (p.data.code !== undefined) { sets.push(`code=$${sets.length+1}`); vals.push(p.data.code); }
      vals.push(id);
      const r = await query(`UPDATE departments SET ${sets.join(",")} WHERE id=$${vals.length} RETURNING *`, vals);
      return NextResponse.json({ success: true, department: r.rows[0] });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const user = await authenticateRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const batas = await batasOrganisasi(user);

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "org";
  const id = parseInt(searchParams.get("id") || "0");

  if (!(await bolehSentuh(batas, action, id))) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const table = action === "dept" ? "departments" : "organizations";
    await query(`UPDATE ${table} SET deleted_at = NOW() WHERE id = $1`, [id]);
    await catatAudit(user.email, action === "dept" ? "delete_department" : "delete_organization",
      action === "dept" ? "department" : "organization", id, {});
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
