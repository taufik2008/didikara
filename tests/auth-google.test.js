import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";

test("Google Auth helper: URL generator dan mock token verification", async () => {
  const { getGoogleAuthUrl, exchangeGoogleCode, verifyGoogleCredentialToken } = await import("../src/lib/googleAuth.js");

  // 1. Saat GOOGLE_CLIENT_ID belum disetel, getGoogleAuthUrl mengembalikan null (graceful)
  const prevId = process.env.GOOGLE_CLIENT_ID;
  const prevPubId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  assert.strictEqual(getGoogleAuthUrl({ redirectUri: "http://localhost:3000/api/auth/google/callback" }), null);

  // 2. Saat GOOGLE_CLIENT_ID disetel, URL OAuth 2.0 tergenerate dengan parameter lengkap
  process.env.GOOGLE_CLIENT_ID = "test-google-client-id.apps.googleusercontent.com";
  const authUrl = getGoogleAuthUrl({
    redirectUri: "http://localhost:3000/api/auth/google/callback",
    state: "/kelas?courseId=c1",
  });

  assert.strictEqual(typeof authUrl, "string");
  assert.strictEqual(authUrl.startsWith("https://accounts.google.com/o/oauth2/v2/auth"), true);
  assert.strictEqual(authUrl.includes("client_id=test-google-client-id.apps.googleusercontent.com"), true);
  assert.strictEqual(authUrl.includes("scope=openid+email+profile"), true);
  assert.strictEqual(authUrl.includes("state=%2Fkelas%3FcourseId%3Dc1"), true);

  // Restore env
  if (prevId) process.env.GOOGLE_CLIENT_ID = prevId;
  else delete process.env.GOOGLE_CLIENT_ID;
  if (prevPubId) process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = prevPubId;
  else delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // 3. Mock code exchange
  const tokenData = await exchangeGoogleCode({
    code: "mock-code-budi.santoso@gmail.com",
    redirectUri: "http://localhost:3000/api/auth/google/callback",
  });
  assert.strictEqual(tokenData.mock, true);
  assert.strictEqual(tokenData.profile.email, "budi.santoso@gmail.com");

  // 4. Mock credential verification
  const cred = await verifyGoogleCredentialToken("mock-credential-token");
  assert.strictEqual(cred.email, "peserta.google@gmail.com");
  assert.strictEqual(cred.email_verified, true);
});

test("Google Auth helper: upsertGoogleUser mendaftarkan user baru sebagai 'student' dengan persetujuan privasi", async () => {
  const { upsertGoogleUser } = await import("../src/lib/googleAuth.js");

  const usersTable = [];
  global._mockDbQuery = async (text, params) => {
    const sql = text.replace(/\s+/g, " ").trim();
    if (sql.startsWith("SELECT * FROM users WHERE LOWER(email) = LOWER($1)")) {
      const [email] = params;
      const found = usersTable.filter((u) => u.email.toLowerCase() === email.toLowerCase());
      return { rows: found };
    }
    if (sql.startsWith("INSERT INTO users")) {
      const [email, password, fullname, role, role_label, avatar, stats, job_title, organization, status, permissions, competencies, google_id] = params;
      const user = { email, password, fullname, role, role_label, avatar, stats, job_title, organization, status, permissions, competencies, google_id };
      usersTable.push(user);
      return { rows: [user] };
    }
    if (sql.startsWith("INSERT INTO user_points") || sql.startsWith("INSERT INTO user_badges")) {
      return { rows: [] };
    }
    if (sql.startsWith("UPDATE users")) {
      return { rows: [] };
    }
    return { rows: [] };
  };

  try {
    // Tes user baru
    const newEmail = "peserta.baru.google@gmail.com";
    const res = await upsertGoogleUser({
      email: newEmail,
      name: "Peserta Baru Google",
      avatarUrl: "https://example.com/avatar.jpg",
      googleId: "google-sub-998877",
    });

    assert.strictEqual(typeof res.user, "object");
    assert.strictEqual(res.user.email.toLowerCase(), newEmail.toLowerCase());
    assert.strictEqual(res.user.role, "student");
    assert.strictEqual(res.user.role_label, "Peserta Mandiri");
    assert.strictEqual(res.isNew, true);

    // Tes user lama (idempotent / tidak duplikat)
    const res2 = await upsertGoogleUser({
      email: newEmail,
      name: "Peserta Baru Google",
    });
    assert.strictEqual(res2.isNew, false);
    assert.strictEqual(usersTable.length, 1);
  } finally {
    delete global._mockDbQuery;
  }
});

test("Proxy.js dan route handlers mencakup endpoint /api/auth/google", () => {
  const proxyCode = fs.readFileSync("src/proxy.js", "utf8");
  assert.strictEqual(
    proxyCode.includes('"/api/auth/google"'),
    true,
    "proxy.js harus menyertakan /api/auth/google pada publicPaths"
  );

  assert.strictEqual(
    fs.existsSync("src/app/api/auth/google/route.js"),
    true,
    "Route /api/auth/google/route.js harus ada"
  );

  assert.strictEqual(
    fs.existsSync("src/app/api/auth/google/callback/route.js"),
    true,
    "Route /api/auth/google/callback/route.js harus ada"
  );

  const routeCode = fs.readFileSync("src/app/api/auth/google/route.js", "utf8");
  assert.strictEqual(routeCode.includes("export async function GET"), true);
  assert.strictEqual(routeCode.includes("export async function POST"), true);

  const callbackCode = fs.readFileSync("src/app/api/auth/google/callback/route.js", "utf8");
  assert.strictEqual(callbackCode.includes("exchangeGoogleCode"), true);
  assert.strictEqual(callbackCode.includes("upsertGoogleUser"), true);
  assert.strictEqual(callbackCode.includes("signToken"), true);
  assert.strictEqual(callbackCode.includes("recordSession"), true);
});

test("LoginPage menampilkan opsi 'Daftar dengan Google' dan 'Masuk dengan Google'", () => {
  const loginCode = fs.readFileSync("src/components/Login/LoginPage.js", "utf8");

  assert.strictEqual(
    loginCode.includes("Daftar dengan Google (Gmail)"),
    true,
    "LoginPage harus memiliki tombol 'Daftar dengan Google (Gmail)' di tab pendaftaran"
  );

  assert.strictEqual(
    loginCode.includes("Masuk dengan Google (Gmail)"),
    true,
    "LoginPage harus memiliki tombol 'Masuk dengan Google (Gmail)' di tab login"
  );

  assert.strictEqual(
    loginCode.includes("/api/auth/google"),
    true,
    "LoginPage harus memanggil endpoint /api/auth/google"
  );

  assert.strictEqual(
    loginCode.includes("renderPasswordToggle"),
    true,
    "LoginPage harus memiliki toggle lihat/sembunyikan password (show password)"
  );
  assert.strictEqual(
    loginCode.includes("showLoginPassword"),
    true,
    "LoginPage harus mendukung toggle visibilitas kata sandi pada login"
  );
  assert.strictEqual(
    loginCode.includes("showRegPassword"),
    true,
    "LoginPage harus mendukung toggle visibilitas kata sandi pada registrasi"
  );
});
