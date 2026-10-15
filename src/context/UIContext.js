"use client";
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

export const UIContext = createContext(null);

const PATH_BY_PAGE = {
  "dashboard-page":   "/dashboard",
  "marketplace-page": "/marketplace",
  "lms-page":         "/kelas",
  "wallet-page":      "/wallet",
  "ai-planner-page":  "/ai-planner",
  "admin-page":       "/admin",
};

const PAGE_BY_PATH = Object.fromEntries(
  Object.entries(PATH_BY_PAGE).map(([page, path]) => [path, page])
);

export function UIProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  const [theme, setTheme] = useState("dark");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Active page diturunkan dari URL
  const activePage = PAGE_BY_PATH[pathname] || "dashboard-page";

  const setActivePage = useCallback((page) => {
    router.push(PATH_BY_PAGE[page] || "/dashboard");
  }, [router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("lms_theme") || "dark";
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);

      const savedSidebar = localStorage.getItem("lms_sidebar_collapsed");
      if (savedSidebar !== null) setSidebarCollapsed(savedSidebar === "true");
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        localStorage.setItem("lms_theme", next);
        document.documentElement.setAttribute("data-theme", next);
      }
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("lms_sidebar_collapsed", String(next));
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    theme,
    toggleTheme,
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
    activePage,
    setActivePage,
  }), [theme, toggleTheme, sidebarCollapsed, toggleSidebar, activePage, setActivePage]);

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
