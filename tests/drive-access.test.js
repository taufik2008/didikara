// tests/drive-access.test.js
import test from "node:test";
import assert from "node:assert";

test("POST /api/drive/grant-access tanpa sesi harus ditolak (401)", async () => {
  // Simulasi mock request tanpa cookie/authorization header
  const req = new Request("http://localhost:3000/api/drive/grant-access", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId: "test-file-123" }),
  });

  const { POST } = await import("../src/app/api/drive/grant-access/route.js");
  const response = await POST(req);
  assert.strictEqual(response.status, 401);
  const data = await response.json();
  assert.strictEqual(data.success, false);
});
