"use client";
/**
 * AppContext.js — Konduktor state modular LMS DIDIKARA.
 *
 * Refaktor Gelombang E (E.1):
 * State monolitik 1318 baris telah dipecah menjadi 4 domain context terspesialisasi:
 * 1. UIContext       → Tema, Sidebar Collapse, Navigasi Halaman URL-aware
 * 2. AuthContext     → Otentikasi, Sesi Pengguna, Role Switcher, Login/Logout
 * 3. CourseContext   → Katalog Kursus, Pelajaran, Video Progress, Ujian, Sertifikat
 * 4. AdminContext    → Manajemen Pengguna, Kategori/Level, Modal CRUD, Platform Settings
 *
 * Seluruh context menggunakan `useMemo` untuk mencegah re-render ke seluruh pohon komponen.
 * `useApp()` dipertahankan 100% backward-compatible untuk 23+ komponen yang sudah ada.
 */
import { createContext, useContext, useMemo } from "react";
import { UIProvider, useUI } from "./UIContext";
import { AuthProvider, useAuth } from "./AuthContext";
import { CourseProvider, useCourse } from "./CourseContext";
import { AdminProvider, useAdmin } from "./AdminContext";

export const AppContext = createContext(null);

function AppBridgeProvider({ children }) {
  const ui = useUI();
  const auth = useAuth();
  const course = useCourse();
  const admin = useAdmin();

  const combinedValue = useMemo(() => ({
    ...ui,
    ...auth,
    ...course,
    ...admin,
  }), [ui, auth, course, admin]);

  return (
    <AppContext.Provider value={combinedValue}>
      {children}
    </AppContext.Provider>
  );
}

export function AppProvider({ children }) {
  return (
    <UIProvider>
      <AuthProvider>
        <CourseProvider>
          <AdminProvider>
            <AppBridgeProvider>
              {children}
            </AppBridgeProvider>
          </AdminProvider>
        </CourseProvider>
      </AuthProvider>
    </UIProvider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export { useUI, useAuth, useCourse, useAdmin };
