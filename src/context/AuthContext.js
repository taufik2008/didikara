"use client";
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { loginApi, logoutApi, getSessionApi } from "@/services/authService";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [activeRole, setActiveRole] = useState("student");
  const [loginEmail, setLoginEmail] = useState("peserta@ailms.id");
  const [loginPassword, setLoginPassword] = useState("password123");

  // Inisialisasi sesi login dari server (anti-flicker)
  useEffect(() => {
    let isMounted = true;
    async function checkSession() {
      try {
        const res = await getSessionApi();
        if (isMounted && res.success && res.data) {
          setCurrentUser(res.data);
        }
      } catch {
        // Fallback jika network error / unauthenticated
      } finally {
        if (isMounted) setSessionChecked(true);
      }
    }
    checkSession();
    return () => { isMounted = false; };
  }, []);

  const handleRoleTabChange = useCallback((role) => {
    setActiveRole(role);
    const emails = {
      student: "peserta@ailms.id",
      corporate: "hr@company.com",
      government: "gov@kemenkeu.go.id",
      admin: "admin@digidaya.tech",
    };
    setLoginEmail(emails[role] || "peserta@ailms.id");
    setLoginPassword("password123");
  }, []);

  const handlePrefill = useCallback(() => {
    const emails = {
      student: "peserta@ailms.id",
      corporate: "hr@company.com",
      government: "gov@kemenkeu.go.id",
      admin: "admin@digidaya.tech",
    };
    setLoginEmail(emails[activeRole] || "peserta@ailms.id");
    setLoginPassword("password123");
  }, [activeRole]);

  const handleLoginSubmit = useCallback(async (e, onSuccess) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    try {
      const json = await loginApi(loginEmail, loginPassword);
      if (json.success) {
        const loggedIn = json.user ?? json.data;
        if (!loggedIn) {
          alert("Respons login tidak terduga dari server.");
          return;
        }
        setCurrentUser(loggedIn);
        if (onSuccess) await onSuccess(loggedIn);
      } else {
        alert(json.error || "Gagal masuk.");
      }
    } catch {
      alert("Gagal terhubung ke server. Coba lagi.");
    }
  }, [loginEmail, loginPassword]);

  const handleLogout = useCallback(async (onLogout) => {
    setCurrentUser(null);
    try {
      await logoutApi();
    } catch {
      // Best-effort
    }
    if (onLogout) await onLogout();
  }, []);

  const value = useMemo(() => ({
    currentUser,
    setCurrentUser,
    sessionChecked,
    setSessionChecked,
    activeRole,
    setActiveRole,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    handleRoleTabChange,
    handlePrefill,
    handleLoginSubmit,
    handleLogout,
  }), [
    currentUser,
    sessionChecked,
    activeRole,
    loginEmail,
    loginPassword,
    handleRoleTabChange,
    handlePrefill,
    handleLoginSubmit,
    handleLogout,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
