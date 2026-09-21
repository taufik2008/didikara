/**
 * Definisi izin — satu sumber kebenaran untuk klien dan server.
 *
 * Editor izin di Modul Admin selama ini dekoratif: Sidebar menentukan menu
 * murni dari `role`, sedangkan array `permissions` tiap pengguna tidak pernah
 * dibaca. Admin yang mencabut `access_ai_portal` akan menyangka akses hilang,
 * padahal tidak. Modul ini menutup celah itu.
 */

export const PERMISSIONS = {
  VIEW_DASHBOARD: "view_dashboard",
  ACCESS_LMS: "access_lms",
  ACCESS_AI_PORTAL: "access_ai_portal",
  MANAGE_MASTER_DATA: "manage_master_data",
};

/** Izin yang dibutuhkan tiap halaman. Halaman tanpa entri berarti bebas. */
export const PAGE_PERMISSION = {
  "dashboard-page":   PERMISSIONS.VIEW_DASHBOARD,
  "marketplace-page": null,
  "lms-page":         PERMISSIONS.ACCESS_LMS,
  "wallet-page":      null,
  "ai-planner-page":  PERMISSIONS.ACCESS_AI_PORTAL,
  "admin-page":       PERMISSIONS.MANAGE_MASTER_DATA,
};

/** Izin bawaan per peran — dipakai bila data pengguna belum punya daftar izin. */
export const DEFAULT_PERMISSIONS = {
  student:    [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.ACCESS_LMS],
  corporate:  [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.ACCESS_LMS, PERMISSIONS.ACCESS_AI_PORTAL],
  government: [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.ACCESS_LMS, PERMISSIONS.ACCESS_AI_PORTAL],
  admin:      Object.values(PERMISSIONS),
};

/**
 * Daftar izin efektif seorang pengguna.
 * Peran admin selalu memperoleh seluruh izin agar akun admin tidak bisa
 * mengunci dirinya sendiri keluar dari Modul Admin.
 */
export function effectivePermissions(user) {
  if (!user) return [];
  if (user.role === "admin") return Object.values(PERMISSIONS);
  const daftar = Array.isArray(user.permissions) ? user.permissions : null;
  return daftar ?? DEFAULT_PERMISSIONS[user.role] ?? [];
}

export function hasPermission(user, permission) {
  if (!permission) return true;
  return effectivePermissions(user).includes(permission);
}

export function canAccessPage(user, page) {
  return hasPermission(user, PAGE_PERMISSION[page]);
}
