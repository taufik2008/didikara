// tests/forum-access-control.test.js
//
// Tes perilaku sungguhan (bukan pencocokan string kode) untuk dua celah
// yang ditemukan pada modul forum:
//   1. GET/POST /api/forum tidak memeriksa keikutsertaan (enrollment) —
//      siapa pun yang login bisa membaca/menulis forum kursus apa pun.
//   2. PATCH action "report" bisa dipanggil berkali-kali oleh satu orang
//      yang sama untuk memicu auto-flag (report_count >= 3) sendirian.
//
// Memakai seam global._mockDbQuery di src/lib/db.js: SQL asli route/
// courseAccess.js tetap dijalankan sungguhan, hanya baris hasilnya yang
// dipalsukan sesuai skenario — bukan menebak dari isi file.
import test from "node:test";
import assert from "node:assert/strict";

function buatMockQuery(state) {
  return async (text, params) => {
    const sql = text.replace(/\s+/g, " ").trim();

    if (sql.startsWith("SELECT 1 FROM course_instructors")) {
      const [courseId, email] = params;
      const diampu = state.instructors.some(i => i.course_id === courseId && i.user_email === email);
      return { rows: diampu ? [{ "?column?": 1 }] : [] };
    }
    if (sql.startsWith("SELECT 1 FROM enrollments")) {
      const [email, courseId] = params;
      const terdaftar = state.enrollments.some(e => e.user_email === email && e.course_id === courseId && e.status === "active");
      return { rows: terdaftar ? [{ "?column?": 1 }] : [] };
    }
    if (sql.startsWith("SELECT id FROM forum_posts WHERE id")) {
      const [id] = params;
      return { rows: state.posts.filter(p => String(p.id) === String(id)) };
    }
    if (sql.startsWith("INSERT INTO forum_post_reports")) {
      const [postId, reporterEmail, reason] = params;
      const sudahAda = state.reports.some(r => r.post_id === postId && r.reporter_email === reporterEmail);
      if (!sudahAda) state.reports.push({ post_id: postId, reporter_email: reporterEmail, reason });
      return { rows: [] };
    }
    if (sql.startsWith("SELECT COUNT(*) AS count FROM forum_post_reports")) {
      const [postId] = params;
      const jumlah = state.reports.filter(r => r.post_id === postId).length;
      return { rows: [{ count: String(jumlah) }] };
    }
    if (sql.startsWith("UPDATE forum_posts SET report_count")) {
      const [id, reportCount, reason] = params;
      const post = state.posts.find(p => String(p.id) === String(id));
      post.report_count = reportCount;
      if (reportCount >= 3) post.status = "flagged";
      return { rows: [{ id: post.id, report_count: post.report_count, status: post.status }] };
    }
    if (sql.startsWith("INSERT INTO forum_posts")) {
      const [courseId, userEmail] = params;
      const baru = { id: state.posts.length + 1, course_id: courseId, user_email: userEmail };
      state.posts.push(baru);
      return { rows: [baru] };
    }
    throw new Error("Pola SQL tidak dikenali oleh mock test ini: " + sql.substring(0, 80));
  };
}

test("GET /api/forum menolak pengguna yang TIDAK terdaftar di kursus itu (403)", async () => {
  const state = {
    instructors: [],
    enrollments: [{ user_email: "peserta-lain@ailms.id", course_id: "c1", status: "active" }],
    posts: [], reports: [],
  };
  global._mockDbQuery = buatMockQuery(state);
  global._mockAuthUser = { email: "bukan-peserta@ailms.id", role: "student" };

  try {
    const { GET } = await import("../src/app/api/forum/route.js");
    const req = new Request("http://localhost:3000/api/forum?courseId=c1", { method: "GET" });
    const res = await GET(req);
    assert.equal(res.status, 403, "Pengguna yang tidak terdaftar harus ditolak 403, bukan diberi akses baca forum");
  } finally {
    delete global._mockDbQuery;
    delete global._mockAuthUser;
  }
});

test("GET /api/forum MENGIZINKAN peserta yang terdaftar aktif di kursus itu", async () => {
  const state = {
    instructors: [],
    enrollments: [{ user_email: "peserta@ailms.id", course_id: "c1", status: "active" }],
    posts: [], reports: [],
  };
  global._mockDbQuery = buatMockQuery(state);
  global._mockAuthUser = { email: "peserta@ailms.id", role: "student" };

  try {
    const { GET } = await import("../src/app/api/forum/route.js");
    const req = new Request("http://localhost:3000/api/forum?courseId=c1", { method: "GET" });
    const res = await GET(req);
    assert.notEqual(res.status, 403, "Peserta terdaftar aktif tidak boleh ditolak akses forum kursusnya sendiri");
  } finally {
    delete global._mockDbQuery;
    delete global._mockAuthUser;
  }
});

test("GET /api/forum MENGIZINKAN pengajar kursus walau dia tidak enrolled (lewat course_instructors)", async () => {
  const state = {
    instructors: [{ course_id: "c1", user_email: "pengajar@ailms.id" }],
    enrollments: [],
    posts: [], reports: [],
  };
  global._mockDbQuery = buatMockQuery(state);
  global._mockAuthUser = { email: "pengajar@ailms.id", role: "corporate" };

  try {
    const { GET } = await import("../src/app/api/forum/route.js");
    const req = new Request("http://localhost:3000/api/forum?courseId=c1", { method: "GET" });
    const res = await GET(req);
    assert.notEqual(res.status, 403, "Pengajar kursus (course_instructors) harus tetap bisa membaca forum kursusnya");
  } finally {
    delete global._mockDbQuery;
    delete global._mockAuthUser;
  }
});

test("PATCH /api/forum action=report: SATU pelapor yang sama memanggil 3x TIDAK memicu auto-flag (regresi)", async () => {
  const state = {
    instructors: [], enrollments: [],
    posts: [{ id: 99, course_id: "c1", status: "approved", report_count: 0 }],
    reports: [],
  };
  global._mockDbQuery = buatMockQuery(state);
  global._mockAuthUser = { email: "satu-orang@ailms.id", role: "student" };

  try {
    const { PATCH } = await import("../src/app/api/forum/route.js");
    let lastPost;
    for (let i = 0; i < 3; i++) {
      const req = new Request("http://localhost:3000/api/forum", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: 99, action: "report", reason: "spam" }),
      });
      const res = await PATCH(req);
      const data = await res.json();
      lastPost = data.post;
    }
    assert.equal(lastPost.report_count, 1, "report_count harus tetap 1 — satu pelapor yang sama tidak boleh dihitung tiga kali");
    assert.notEqual(lastPost.status, "flagged", "Post tidak boleh auto-flag hanya karena satu orang melaporkan berulang kali");
  } finally {
    delete global._mockDbQuery;
    delete global._mockAuthUser;
  }
});

test("PATCH /api/forum action=report: TIGA pelapor berbeda memicu auto-flag (status 'flagged')", async () => {
  const state = {
    instructors: [], enrollments: [],
    posts: [{ id: 100, course_id: "c1", status: "approved", report_count: 0 }],
    reports: [],
  };
  global._mockDbQuery = buatMockQuery(state);

  try {
    const { PATCH } = await import("../src/app/api/forum/route.js");
    const pelapor = ["a@ailms.id", "b@ailms.id", "c@ailms.id"];
    let lastPost;
    for (const email of pelapor) {
      global._mockAuthUser = { email, role: "student" };
      const req = new Request("http://localhost:3000/api/forum", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: 100, action: "report", reason: "spam" }),
      });
      const res = await PATCH(req);
      const data = await res.json();
      lastPost = data.post;
    }
    assert.equal(lastPost.report_count, 3);
    assert.equal(lastPost.status, "flagged", "Tiga pelapor berbeda memang harus memicu auto-flag");
  } finally {
    delete global._mockDbQuery;
    delete global._mockAuthUser;
  }
});
