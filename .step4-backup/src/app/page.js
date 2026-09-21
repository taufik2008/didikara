"use client";
import { useApp } from "@/context/AppContext";
import LoginPage from "@/components/Login/LoginPage";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import DashboardPage from "@/components/Dashboard/DashboardPage";
import MarketplacePage from "@/components/Marketplace/MarketplacePage";
import LmsPage from "@/components/Lms/LmsPage";
import WalletPage from "@/components/Wallet/WalletPage";
import AiPlannerPage from "@/components/AiPlanner/AiPlannerPage";
import AdminPage from "@/components/Admin/AdminPage";
import PaymentModal from "@/components/Modals/PaymentModalV2";
import CertModal from "@/components/Modals/CertModal";
import CrudModal from "@/components/Modals/CrudModal";
import LmsManageModal from "@/components/Modals/LmsManageModal";

export default function Home() {
  const { currentUser, activePage } = useApp();

  if (!currentUser) return <LoginPage />;

  return (
    <div id="app">
      <Sidebar />
      <div className="main-content">
        <Header />
        {activePage === "dashboard-page" && <DashboardPage />}
        {activePage === "marketplace-page" && <MarketplacePage />}
        {activePage === "lms-page" && <LmsPage />}
        {activePage === "wallet-page" && <WalletPage />}
        {activePage === "ai-planner-page" && <AiPlannerPage />}
        {activePage === "admin-page" && <AdminPage />}
      </div>
      <PaymentModal />
      <CertModal />
      <CrudModal />
      <LmsManageModal />
    </div>
  );
}
