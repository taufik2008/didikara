/**
 * authService.js
 * Semua fetch call yang berhubungan dengan autentikasi.
 */

export async function loginApi(email, password) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function logoutApi() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {}
  document.cookie = "token=; path=/; max-age=0";
}

export async function getSessionApi() {
  const res = await fetch("/api/auth/me");
  return res.json();
}

export async function registerApi(data) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}
