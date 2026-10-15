import { initDatabase, query } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";
import { authenticateRequest, hashPassword } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Identitas diambil dari JWT lewat authenticateRequest(), BUKAN dari header
 * x-user-* yang disuntikkan proxy. Header bisa dikirim klien secara langsung;
 * ia hanya aman selama proxy pasti berjalan dan menimpanya. Route ini
 * membocorkan hash password serta kunci jawaban ujian, jadi otorisasinya tidak
 * boleh bergantung pada satu lapis saja (bandingkan CVE-2026-64642).
 */
export async function GET(request) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = auth.role === "admin";

    // 2. Ambil data — dibatasi menurut peran.
    //    Daftar pengguna hanya untuk admin; peserta tidak berkepentingan
    //    mengetahui email, jabatan, dan organisasi seluruh pengguna platform.
    const usersResult = isAdmin
      ? await query("SELECT * FROM users WHERE deleted_at IS NULL ORDER BY email")
      : { rows: [] };
    const coursesResult = await query("SELECT * FROM courses WHERE deleted_at IS NULL");
    // Transaksi & sertifikat: hanya milik sendiri, kecuali admin.
    const txResult = isAdmin
      ? await query("SELECT * FROM transactions")
      : await query("SELECT * FROM transactions WHERE username = $1",
          [auth.fullname || ""]);
    const certResult = isAdmin
      ? await query("SELECT * FROM certificates")
      : await query("SELECT * FROM certificates WHERE user_email = $1", [auth.email]);
    const categoriesResult = await query("SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY name ASC");
    const levelsResult = await query("SELECT * FROM levels WHERE deleted_at IS NULL ORDER BY name ASC");

    // Format database fields to match Frontend JS state keys
    // Hash password TIDAK PERNAH ikut dikirim ke klien. Sebelumnya field ini
    // terkirim ke setiap pengguna yang login, termasuk hash milik admin.
    const users = usersResult.rows.map(row => ({
      email: row.email,
      fullname: row.fullname,
      role: row.role,
      roleLabel: row.role_label,
      avatar: row.avatar,
      stats: typeof row.stats === 'string' ? JSON.parse(row.stats) : row.stats,
      jobTitle: row.job_title,
      organization: row.organization,
      status: row.status,
      permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
      competencies: typeof row.competencies === 'string' ? JSON.parse(row.competencies) : row.competencies
    }));

    // Hanya admin yang boleh melihat kunci jawaban (field 'correct')

    const courses = coursesResult.rows.map(row => {
      let quiz = typeof row.quiz === 'string' ? JSON.parse(row.quiz) : row.quiz;
      if (!isAdmin && Array.isArray(quiz)) {
        // Strip kunci jawaban dari response untuk non-admin
        quiz = quiz.map(({ correct: _stripped, ...rest }) => rest);
      }
      let examSettings = row.exam_settings || {};
      if (typeof examSettings === 'string') examSettings = JSON.parse(examSettings);
      let instructor = row.instructor || null;
      if (typeof instructor === 'string') {
        try { instructor = JSON.parse(instructor); } catch {}
      }
      let features = row.features || [];
      if (typeof features === 'string') {
        try { features = JSON.parse(features); } catch {}
      }

      const learningType = row.learning_type || (row.price === 0 ? "self_learning" : "online");
      const typeLabel = row.type_label || (
        learningType === "online" ? "Online (Live Webinar)" :
        learningType === "offline" ? "Offline (Tatap Muka)" :
        "Self-Learning (Belajar Mandiri)"
      );

      return {
        id: row.id,
        title: row.title,
        category: row.category,
        learningType,
        typeLabel,
        duration: row.duration,
        level: row.level,
        price: row.price,
        priceLabel: row.price_label,
        rating: row.rating,
        badge: row.badge,
        image: row.image || '',
        venue: row.venue || '',
        schedule: row.schedule || '',
        quota: row.quota || '',
        features: Array.isArray(features) ? features : [],
        instructor: instructor && instructor.name ? instructor : (row.instructor || null),
        desc: row.description,
        modules: typeof row.modules === 'string' ? JSON.parse(row.modules) : row.modules,
        quiz,
        examSettings: { timeLimit: 0, maxAttempts: 0, passingScore: 70, ...examSettings },
        prerequisiteCourseId: row.prerequisite_course_id || null,
      };
    });

    const transactions = txResult.rows.map(row => ({
      invoice: row.invoice,
      user: row.username,
      program: row.program,
      amount: row.amount,
      type: row.type,
      status: row.status
    }));

    const certificates = certResult.rows.map(row => ({
      id: row.id,
      courseId: row.course_id,
      title: row.title,
      date: row.date,
      idCode: row.id_code
    }));

    return NextResponse.json({
      success: true,
      database_mode: "postgresql",
      data: { 
        users, 
        courses, 
        transactions, 
        certificates,
        categories: categoriesResult.rows.map(row => ({ key: row.key, name: row.name })),
        levels: levelsResult.rows.map(row => ({ key: row.key, name: row.name }))
      }
    });
  } catch (error) {
    console.error("Database connection or query failed. Falling back to Demo Mode. Error:", error);
    return NextResponse.json({
      success: false,
      database_mode: "fallback",
      error: error.message
    });
  }
}

// Helper: catat audit log tanpa throw
async function auditLog(actorEmail, action, entityType, entityId, detail = {}) {
  try {
    await query(
      `INSERT INTO audit_logs (actor_email, action, entity_type, entity_id, detail)
       VALUES ($1, $2, $3, $4, $5)`,
      [actorEmail, action, entityType, String(entityId || ""), JSON.stringify(detail)]
    );
  } catch { /* audit bersifat opsional */ }
}

export async function POST(request) {
  try {
    const auth      = await authenticateRequest(request);
    const userRole  = auth?.role;
    const userEmail = auth?.email || "system";
    if (userRole !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden: Admin only" }, { status: 403 });
    }

    const body = await request.json();
    const { type, action, data } = body;

    if (type === "user") {
      if (action === "save") {
        const { email, password, fullname, role, roleLabel, avatar, stats, jobTitle, organization, status, permissions, competencies } = data;

        // Password WAJIB di-hash di sini. Sebelumnya nilai mentah dari formulir
        // admin masuk langsung ke kolom users.password, sehingga pengguna baru
        // tidak bisa login (comparePassword membandingkan teks polos dengan
        // hash) sampai migrasi di lib/db.js meng-hash ulang saat proses restart.
        const isHashed = typeof password === "string" && password.startsWith("$2");
        const hashed = password && !isHashed ? await hashPassword(password) : password;

        // Pengguna baru wajib punya password; pengguna lama boleh dikirim kosong
        // (berarti tidak diubah).
        const { rows: sudahAda } = await query("SELECT 1 FROM users WHERE email = $1", [email]);
        if (sudahAda.length === 0 && !hashed) {
          return NextResponse.json(
            { success: false, error: "Password wajib diisi untuk pengguna baru" },
            { status: 400 }
          );
        }

        await query(`
          INSERT INTO users (email, password, fullname, role, role_label, avatar, stats, job_title, organization, status, permissions, competencies)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (email)
          DO UPDATE SET
            -- Password kosong = "jangan ubah". Ini penting karena respons GET
            -- tidak lagi memuat password, jadi form edit mengirimnya kosong.
            password = COALESCE(NULLIF(EXCLUDED.password, ''), users.password),
            fullname = EXCLUDED.fullname,
            role = EXCLUDED.role,
            role_label = EXCLUDED.role_label,
            avatar = EXCLUDED.avatar,
            stats = EXCLUDED.stats,
            job_title = EXCLUDED.job_title,
            organization = EXCLUDED.organization,
            status = EXCLUDED.status,
            permissions = EXCLUDED.permissions,
            competencies = EXCLUDED.competencies
        `, [
          email, hashed || "", fullname, role, roleLabel, avatar,
          JSON.stringify(stats), jobTitle, organization, status,
          JSON.stringify(permissions), JSON.stringify(competencies)
        ]);
      } else if (action === "delete") {
        // Penghapusan permanen memutus sertifikat, pendaftaran, riwayat ujian,
        // dan jejak audit yang menunjuk pengguna ini — sekaligus melanggar
        // kebijakan retensi yang justru sudah disiapkan lewat kolom deleted_at.
        // Akun ditandai terhapus dan ditangguhkan agar tidak bisa login lagi.
        await query(
          "UPDATE users SET deleted_at = NOW(), status = 'suspended' WHERE email = $1",
          [data.id]
        );
        // Sesi yang masih hidup ikut dicabut supaya akses berhenti seketika.
        await query(
          "UPDATE user_sessions SET revoked_at = NOW() WHERE user_email = $1 AND revoked_at IS NULL",
          [data.id]
        ).catch(() => {});
      }
      // Kirim welcome email untuk user baru
      if (action === "save") {
        sendWelcomeEmail(data.email, data.fullname).catch(() => {});
      }
    } else if (type === "course") {
      if (action === "save") {
        const {
          id, title, category, duration, level, price, priceLabel, rating, badge,
          image, instructor, desc, modules, quiz, examSettings, prerequisiteCourseId,
          learningType, typeLabel, venue, schedule, quota, features
        } = data;
        const examSettingsJson = JSON.stringify(examSettings || { timeLimit: 0, maxAttempts: 0, passingScore: 70 });
        const instructorJson = JSON.stringify(instructor || {});
        const featuresJson = JSON.stringify(features || []);
        const resolvedLearningType = learningType || (price === 0 ? "self_learning" : "online");
        const resolvedTypeLabel = typeLabel || (
          resolvedLearningType === "online" ? "Online (Live Webinar)" :
          resolvedLearningType === "offline" ? "Offline (Tatap Muka)" :
          "Self-Learning (Belajar Mandiri)"
        );

        await query(`
          INSERT INTO courses (
            id, title, category, duration, level, price, price_label, rating, badge,
            image, instructor, description, modules, quiz, exam_settings, prerequisite_course_id,
            learning_type, type_label, venue, schedule, quota, features
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
          ON CONFLICT (id)
          DO UPDATE SET
            title = EXCLUDED.title,
            category = EXCLUDED.category,
            duration = EXCLUDED.duration,
            level = EXCLUDED.level,
            price = EXCLUDED.price,
            price_label = EXCLUDED.price_label,
            rating = EXCLUDED.rating,
            badge = EXCLUDED.badge,
            image = EXCLUDED.image,
            instructor = EXCLUDED.instructor,
            description = EXCLUDED.description,
            modules = EXCLUDED.modules,
            quiz = EXCLUDED.quiz,
            exam_settings = EXCLUDED.exam_settings,
            prerequisite_course_id = EXCLUDED.prerequisite_course_id,
            learning_type = EXCLUDED.learning_type,
            type_label = EXCLUDED.type_label,
            venue = EXCLUDED.venue,
            schedule = EXCLUDED.schedule,
            quota = EXCLUDED.quota,
            features = EXCLUDED.features,
            deleted_at = NULL
        `, [
          id, title, category, duration, level, price, priceLabel,
          rating || '5.0', badge || '', image || '', instructorJson, desc || '', JSON.stringify(modules || []), JSON.stringify(quiz || []),
          examSettingsJson, prerequisiteCourseId || null,
          resolvedLearningType, resolvedTypeLabel, venue || '', schedule || '', quota || '', featuresJson
        ]);
      } else if (action === "delete") {
        // Idem: sertifikat dan riwayat ujian menunjuk course_id ini.
        await query("UPDATE courses SET deleted_at = NOW() WHERE id = $1", [data.id]);
      }
    } else if (type === "transaction") {
      if (action === "save") {
        const { invoice, user, program, amount, type: payType, status } = data;
        await query(`
          INSERT INTO transactions (invoice, username, program, amount, type, status)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (invoice) DO UPDATE SET
            username = EXCLUDED.username,
            program = EXCLUDED.program,
            amount = EXCLUDED.amount,
            type = EXCLUDED.type,
            status = EXCLUDED.status
        `, [invoice, user, program, amount, payType, status]);
      }
    } else if (type === "certificate") {
      if (action === "save") {
        const { id, courseId, title, date, idCode } = data;
        await query(`
          INSERT INTO certificates (id, course_id, title, date, id_code)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE SET
            course_id = EXCLUDED.course_id,
            title = EXCLUDED.title,
            date = EXCLUDED.date,
            id_code = EXCLUDED.id_code
        `, [id, courseId, title, date, idCode]);
      }
    } else if (type === "category") {
      if (action === "save") {
        const { key, name } = data;
        await query(`
          INSERT INTO categories (key, name)
          VALUES ($1, $2)
          ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, deleted_at = NULL
        `, [key, name]);
      } else if (action === "delete") {
        await query(`UPDATE categories SET deleted_at = NOW() WHERE key = $1`, [data.key]);
      }
    } else if (type === "level") {
      if (action === "save") {
        const { key, name } = data;
        await query(`
          INSERT INTO levels (key, name)
          VALUES ($1, $2)
          ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, deleted_at = NULL
        `, [key, name]);
      } else if (action === "delete") {
        await query(`UPDATE levels SET deleted_at = NOW() WHERE key = $1`, [data.key]);
      }
    }

    // Audit log setelah operasi berhasil
    await auditLog(userEmail, `${action}_${type}`, type, data?.id || data?.email || data?.key || "", { action, type });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Database POST CRUD API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
