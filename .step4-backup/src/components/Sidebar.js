"use client";
import { Cpu, LayoutDashboard, ShoppingBag, PlayCircle, Wallet, Compass, Settings, LogOut, Bell } from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function Sidebar() {
  const { currentUser, activePage, setActivePage, handleLogout } = useApp();

  const menuItems = [
    { page: "dashboard-page", icon: LayoutDashboard, label: "Dashboard" },
    { page: "marketplace-page", icon: ShoppingBag, label: "Marketplace Pelatihan" },
    { page: "lms-page", icon: PlayCircle, label: "Kelas Aktif" },
    { page: "wallet-page", icon: Wallet, label: "Digital Wallet" },
  ];

  if (currentUser?.role === "government" || currentUser?.role === "corporate") {
    menuItems.push({ page: "ai-planner-page", icon: Compass, label: "AI Portal Perencanaan" });
  }
  if (currentUser?.role === "admin") {
    menuItems.push({ page: "admin-page", icon: Settings, label: "Modul Admin" });
  }

  return (
    <aside className="sidebar glass-panel" style={{ borderRadius: 0, border: "none", borderRight: "1px solid var(--border-color)" }}>
      <div>
        <div className="brand">
          <div className="brand-icon" style={{ width: 32, height: 32, borderRadius: 8 }}><Cpu size={18} /></div>
          <span className="brand-name" style={{ fontSize: "1.25rem" }}>NHCIE</span>
        </div>
        <nav className="sidebar-menu">
          {menuItems.map(({ page, icon: Icon, label }) => (
            <a key={page} className={`menu-item ${activePage === page ? 'active' : ''}`} onClick={() => setActivePage(page)}>
              <Icon size={18} /><span>{label}</span>
            </a>
          ))}
        </nav>
      </div>
      <div>
        <div className="user-profile-badge" style={{ marginBottom: 12, backgroundColor: "transparent", border: "none", padding: 0 }}>
          <div className="avatar">{currentUser?.avatar}</div>
          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{currentUser?.fullname}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{currentUser?.roleLabel}</div>
          </div>
        </div>
        <a className="menu-item" style={{ color: "var(--danger)" }} onClick={handleLogout}>
          <LogOut size={18} /><span>Keluar</span>
        </a>
      </div>
    </aside>
  );
}
