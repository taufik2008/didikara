"use client";
import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  LayoutDashboard,
  Compass,
  GraduationCap,
  ShieldCheck,
  Award,
  Wallet
} from "lucide-react";

export default function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, activeCourse } = useApp();

  if (!currentUser) return null;

  const role = currentUser.role || "student";
  const isAdmin = ["admin", "superadmin", "instruktur", "assessor"].includes(role);

  const navItems = [
    {
      id: "dashboard",
      label: "Beranda",
      icon: LayoutDashboard,
      path: "/dashboard",
      isActive: pathname === "/dashboard",
    },
    {
      id: "marketplace",
      label: "Katalog",
      icon: Compass,
      path: "/marketplace",
      isActive: pathname === "/marketplace",
    },
    {
      id: "kelas",
      label: "Belajar",
      icon: GraduationCap,
      path: "/kelas",
      isActive: pathname === "/kelas",
      badge: activeCourse ? "1" : null,
    },
    {
      id: "wallet",
      label: "Dompet",
      icon: Wallet,
      path: "/wallet",
      isActive: pathname === "/wallet",
    },
    ...(isAdmin
      ? [
          {
            id: "admin",
            label: "Admin",
            icon: ShieldCheck,
            path: "/admin",
            isActive: pathname === "/admin",
          },
        ]
      : [
          {
            id: "cert",
            label: "Sertifikat",
            icon: Award,
            path: "/dashboard",
            isActive: false,
          },
        ]),
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Navigasi Mobile">
      <div className="mobile-bottom-nav-inner">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => router.push(item.path)}
              className={`mobile-nav-btn ${active ? "is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <div className="mobile-nav-icon-wrapper">
                <Icon size={20} />
                {item.badge && (
                  <span className="mobile-nav-badge">{item.badge}</span>
                )}
              </div>
              <span className="mobile-nav-label">{item.label}</span>
              {active && <span className="mobile-nav-indicator" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
