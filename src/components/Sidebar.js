"use client";
import { Cpu, LayoutDashboard, ShoppingBag, PlayCircle, Wallet, Compass, Settings, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { canAccessPage } from "@/lib/permissions";

export default function Sidebar() {
  const { currentUser, activePage, setActivePage, handleLogout, sidebarCollapsed, toggleSidebar, platformSettings } = useApp();

  const brandName = (platformSettings?.platform_name && !platformSettings.platform_name.includes("SDI") && platformSettings.platform_name !== "AI LMS")
    ? platformSettings.platform_name
    : "DIDIKARA";
  const brandLogo = platformSettings?.platform_logo || "/logos/didikara-symbol-redblue-2.jpg";

  const menuItems = [
    { page: "dashboard-page",   icon: LayoutDashboard, label: "Dashboard" },
    { page: "marketplace-page", icon: ShoppingBag,     label: "Marketplace Pelatihan" },
    { page: "lms-page",         icon: PlayCircle,      label: "Kelas Aktif" },
    { page: "wallet-page",      icon: Wallet,          label: "Digital Wallet" },
    { page: "ai-planner-page",  icon: Compass,         label: "AI Portal Perencanaan" },
    { page: "admin-page",       icon: Settings,        label: "Modul Admin" },
  ].filter(item => canAccessPage(currentUser, item.page));

  return (
    <aside className={`sidebar glass-panel ${sidebarCollapsed ? "collapsed" : ""}`}>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: sidebarCollapsed ? 20 : 0 }}>
          <div className="brand" style={{ gap: sidebarCollapsed ? 0 : 12, justifyContent: sidebarCollapsed ? "center" : "flex-start", width: "100%" }}>
            {brandLogo ? (
              <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "#090d16", border: "1px solid var(--border-color)" }}>
                <img src={brandLogo} alt={brandName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ) : (
              <div className="brand-icon" style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0 }}>
                <Cpu size={18} />
              </div>
            )}
            {!sidebarCollapsed && (
              <span className="brand-name" style={{ fontSize: "1.25rem", whiteSpace: "nowrap", letterSpacing: "-0.02em", color: "var(--text-primary)", fontWeight: 800 }}>{brandName}</span>
            )}
          </div>
          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="sidebar-collapse-btn"
              title="Lipat Sidebar (Autohide)"
              aria-label="Lipat Sidebar">
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {sidebarCollapsed && (
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <button
              type="button"
              onClick={toggleSidebar}
              className="sidebar-collapse-btn"
              style={{ width: "100%", height: 28 }}
              title="Perluas Sidebar"
              aria-label="Perluas Sidebar">
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        <nav className="sidebar-menu" style={{ marginTop: sidebarCollapsed ? 16 : 28 }}>
          {menuItems.map(({ page, icon: Icon, label }) => {
            const isActive = activePage === page;
            return (
              <button
                type="button"
                key={page}
                className={`menu-item ${isActive ? 'active' : ''} ${sidebarCollapsed ? 'item-collapsed' : ''}`}
                aria-current={isActive ? "page" : undefined}
                title={sidebarCollapsed ? label : undefined}
                onClick={() => setActivePage(page)}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!sidebarCollapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        <div className="user-profile-badge" style={{
          marginBottom: 12, backgroundColor: "transparent", border: "none", padding: 0,
          justifyContent: sidebarCollapsed ? "center" : "flex-start"
        }}>
          <div className="avatar" title={currentUser?.fullname}>{currentUser?.avatar}</div>
          {!sidebarCollapsed && (
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{currentUser?.fullname}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{currentUser?.roleLabel}</div>
            </div>
          )}
        </div>
        <button
          type="button"
          className={`menu-item ${sidebarCollapsed ? 'item-collapsed' : ''}`}
          style={{ color: "var(--danger)", justifyContent: sidebarCollapsed ? "center" : "flex-start" }}
          title={sidebarCollapsed ? "Keluar" : undefined}
          onClick={handleLogout}
        >
          <LogOut size={18} style={{ flexShrink: 0 }} />
          {!sidebarCollapsed && <span>Keluar</span>}
        </button>
      </div>
    </aside>
  );
}
