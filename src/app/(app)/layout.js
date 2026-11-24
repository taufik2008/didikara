"use client";
/**
 * Kerangka aplikasi untuk seluruh halaman setelah login.
 *
 * Sidebar, Header, dan modal global dulu hidup di src/app/page.js bersama
 * saklar `activePage`. Sekarang keenam halaman menjadi rute sungguhan dan
 * berbagi kerangka ini, sehingga URL, tombol Back, dan refresh bekerja normal.
 */
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { canAccessPage } from "@/lib/permissions";
import LoginPage from "@/components/Login/LoginPage";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import PaymentModal from "@/components/Modals/PaymentModalV2";
import SubscriptionModal from "@/components/Modals/SubscriptionModal";
import CertModal from "@/components/Modals/CertModal";
import CrudModal from "@/components/Modals/CrudModal";
import LmsManageModal from "@/components/Modals/LmsManageModal";
import MobileBottomNav from "@/components/Common/MobileBottomNav";

export default function AppLayout({ children }) {
  const pathname = usePathname();
  const { currentUser, sessionChecked, activePage } = useApp();

  // Jangan tampilkan halaman login sebelum sesi selesai diperiksa — kalau tidak,
  // pengguna yang sudah masuk akan melihatnya berkedip setiap kali refresh.
  if (!sessionChecked) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--text-muted)" }}>
        Memuat…
      </div>
    );
  }

  // Izinkan calon peserta mencoba Pratinjau Gratis (Free Preview) di /kelas
  // atau menjelajahi katalog di /marketplace tanpa harus login terlebih dahulu
  const isGuestAllowedPage = pathname === "/kelas" || pathname === "/marketplace";

  if (!currentUser && !isGuestAllowedPage) return <LoginPage />;

  // Menyembunyikan menu saja tidak cukup: URL bisa diketik langsung. Gerbang ini
  // hanya untuk pengalaman pengguna — penegakan sungguhan tetap di API route.
  const diizinkan = (!currentUser && isGuestAllowedPage) ? true : canAccessPage(currentUser, activePage);

  return (
    <div id="app">
      <Sidebar />
      <div className="main-content">
        <Header />
        {diizinkan ? children : (
          <main className="page-view active">
            <div style={{ textAlign: "center", padding: 48 }}>
              <h3>Akses Ditolak</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: 8 }}>
                Akun Anda tidak memiliki izin untuk membuka halaman ini.
                Hubungi administrator bila menurut Anda ini keliru.
              </p>
            </div>
          </main>
        )}
      </div>
      <MobileBottomNav />
      <PaymentModal />
      <SubscriptionModal />
      <CertModal />
      <CrudModal />
      <LmsManageModal />
    </div>
  );
}
