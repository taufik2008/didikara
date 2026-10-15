import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

test("Arsitektur context terpisah per domain (UIContext, AuthContext, CourseContext, AdminContext)", () => {
  const uiExists = fs.existsSync("src/context/UIContext.js");
  const authExists = fs.existsSync("src/context/AuthContext.js");
  const courseExists = fs.existsSync("src/context/CourseContext.js");
  const adminExists = fs.existsSync("src/context/AdminContext.js");

  assert.strictEqual(uiExists, true, "src/context/UIContext.js harus tersedia");
  assert.strictEqual(authExists, true, "src/context/AuthContext.js harus tersedia");
  assert.strictEqual(courseExists, true, "src/context/CourseContext.js harus tersedia");
  assert.strictEqual(adminExists, true, "src/context/AdminContext.js harus tersedia");

  const uiCode = fs.readFileSync("src/context/UIContext.js", "utf8");
  assert.strictEqual(uiCode.includes("export function UIProvider"), true, "UIContext harus mengekspor UIProvider");
  assert.strictEqual(uiCode.includes("export function useUI"), true, "UIContext harus mengekspor useUI");
  assert.strictEqual(uiCode.includes("useMemo"), true, "UIContext harus memanfaatkan useMemo untuk memoize value");

  const authCode = fs.readFileSync("src/context/AuthContext.js", "utf8");
  assert.strictEqual(authCode.includes("export function AuthProvider"), true, "AuthContext harus mengekspor AuthProvider");
  assert.strictEqual(authCode.includes("export function useAuth"), true, "AuthContext harus mengekspor useAuth");
  assert.strictEqual(authCode.includes("useMemo"), true, "AuthContext harus memanfaatkan useMemo untuk memoize value");

  const courseCode = fs.readFileSync("src/context/CourseContext.js", "utf8");
  assert.strictEqual(courseCode.includes("export function CourseProvider"), true, "CourseContext harus mengekspor CourseProvider");
  assert.strictEqual(courseCode.includes("export function useCourse"), true, "CourseContext harus mengekspor useCourse");
  assert.strictEqual(courseCode.includes("useMemo"), true, "CourseContext harus memanfaatkan useMemo untuk memoize value");

  const adminCode = fs.readFileSync("src/context/AdminContext.js", "utf8");
  assert.strictEqual(adminCode.includes("export function AdminProvider"), true, "AdminContext harus mengekspor AdminProvider");
  assert.strictEqual(adminCode.includes("export function useAdmin"), true, "AdminContext harus mengekspor useAdmin");
  assert.strictEqual(adminCode.includes("useMemo"), true, "AdminContext harus memanfaatkan useMemo untuk memoize value");
});

test("AppContext mengorkestrasi seluruh domain provider dan mempertahankan useApp backward-compatible", () => {
  const appCode = fs.readFileSync("src/context/AppContext.js", "utf8");

  assert.strictEqual(
    appCode.includes("UIProvider") &&
    appCode.includes("AuthProvider") &&
    appCode.includes("CourseProvider") &&
    appCode.includes("AdminProvider"),
    true,
    "AppProvider harus mengompilasi seluruh domain provider secara bertingkat"
  );

  assert.strictEqual(
    appCode.includes("export function useApp") || appCode.includes("export { useApp }"),
    true,
    "AppContext harus mengekspor useApp untuk kompatibilitas 23+ komponen yang ada"
  );

  assert.strictEqual(
    appCode.includes("export { useUI") || appCode.includes("export function useUI") || appCode.includes("useUI,"),
    true,
    "AppContext harus mengekspor domain hook useUI"
  );
  assert.strictEqual(
    appCode.includes("export { useAuth") || appCode.includes("export function useAuth") || appCode.includes("useAuth,"),
    true,
    "AppContext harus mengekspor domain hook useAuth"
  );
});
