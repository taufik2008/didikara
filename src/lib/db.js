import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

export function getDbConfig() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.didikara_db_DATABASE_URL ||
    process.env.didikara_db_POSTGRES_URL ||
    process.env.didikara_db_POSTGRES_PRISMA_URL;

  const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const defaultMax = isServerless ? 3 : 10;
  const maxPool = process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : defaultMax;
  const idleTimeout = isServerless ? 10000 : 30000;
  const connectionTimeout = 10000;

  if (connectionString) {
    const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    return {
      connectionString,
      max: maxPool,
      idleTimeoutMillis: idleTimeout,
      connectionTimeoutMillis: connectionTimeout,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    };
  }

  // Fallback ke discrete variables yang disediakan oleh Vercel Postgres / Storage
  if (process.env.POSTGRES_HOST) {
    return {
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT, 10) : 5432,
      database: process.env.POSTGRES_DATABASE,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      ssl: { rejectUnauthorized: false },
      max: maxPool,
      idleTimeoutMillis: idleTimeout,
      connectionTimeoutMillis: connectionTimeout,
    };
  }

  return {
    connectionString: 'postgresql://postgres:postgres@localhost:5432/ailms_db',
    max: maxPool,
    idleTimeoutMillis: idleTimeout,
    ssl: false,
  };
}

if (!global._postgresPool) {
  global._postgresPool = new Pool(getDbConfig());
}
const pool = global._postgresPool;

// Auto-init flag — ensures initDatabase runs once per process
if (!global._dbInitialized) {
  global._dbInitialized = false;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_USERS = [
  {
    email: "peserta@ailms.id", password: "password123",
    fullname: "Ahmad Hidayat", role: "student", roleLabel: "Peserta Mandiri",
    avatar: "AH", stats: { hours: 14.5, courses: 1, certs: 1, competency: "B1 (Intermediate)" },
    jobTitle: "Staff Procurement", organization: "Mandiri", status: "active",
    permissions: ["view_dashboard", "access_lms"],
    competencies: { current: [65, 70, 50, 45, 60, 40], target: [80, 85, 75, 70, 80, 75] },
  },
  {
    email: "hr@company.com", password: "password123",
    fullname: "Siti Rahmawati", role: "corporate", roleLabel: "HR Manager - PT Bank Mandiri",
    avatar: "SR", stats: { hours: 450, courses: 8, certs: 32, competency: "Enterprise Account" },
    jobTitle: "Human Capital Director", organization: "PT Bank Mandiri", status: "active",
    permissions: ["view_dashboard", "access_lms", "access_ai_portal"],
    competencies: { current: [75, 80, 60, 70, 65, 80], target: [90, 90, 80, 85, 80, 90] },
  },
  {
    email: "gov@kemenkeu.go.id", password: "password123",
    fullname: "Drs. Bambang Wijaya, M.Si", role: "government", roleLabel: "Kepala Biro SDM - Kemenkeu",
    avatar: "BW", stats: { hours: 1250, courses: 15, certs: 142, competency: "Echelon II Portal" },
    jobTitle: "Biro Kepegawaian", organization: "Kementerian Keuangan", status: "active",
    permissions: ["view_dashboard", "access_lms", "access_ai_portal"],
    competencies: { current: [80, 75, 70, 85, 75, 60], target: [95, 90, 85, 95, 90, 85] },
  },
  {
    email: "admin@digidaya.tech", password: "password123",
    fullname: "Super Administrator", role: "admin", roleLabel: "Platform Admin & Auditor",
    avatar: "SA", stats: { hours: 0, courses: 10, certs: 250, competency: "Superuser" },
    jobTitle: "System Admin", organization: "PT. SDI", status: "active",
    permissions: ["view_dashboard", "access_lms", "access_ai_portal", "manage_master_data"],
    competencies: { current: [80, 80, 80, 80, 80, 80], target: [90, 90, 90, 90, 90, 90] },
  },
];

const SEED_COURSES = [
  {
    id: "c1",
    title: "PBJ Level 1 (Pengadaan Barang & Jasa Pemerintah)",
    category: "Procurement",
    learningType: "offline",
    typeLabel: "Offline (Tatap Muka)",
    duration: "32 Jam (4 Hari)",
    level: "Dasar",
    price: 2500000,
    priceLabel: "Rp 2,500,000",
    rating: "4.9",
    badge: "BNSP / LKPP Ready",
    venue: "Hotel Grand Sahid Jaya, Jakarta Pusat",
    schedule: "15 - 18 Oktober 2026 (08:30 - 16:30 WIB)",
    quota: "Sisa 6 Kursi",
    image: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80",
    instructor: { name: "Dr. Ir. Budi Santoso, M.Si", title: "Ahli Pengadaan Utama & Asesor BNSP", org: "LKPP RI", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80" },
    desc: "Pelatihan tatap muka intensif persiapan ujian sertifikasi PBJ Tingkat Dasar dengan simulasi kasus nyata, modul cetak, konsumsi, dan uji kompetensi asesor BNSP langsung di lokasi.",
    features: ["Workshop Tatap Muka 4 Hari", "Modul Cetak & Seminar Kit Eksklusif", "Simulasi Studi Kasus Langsung", "Uji Kompetensi BNSP di Tempat", "Sertifikat Fisik & Digital"],
    modules: [
      {
        title: "Modul 1: Ketentuan Umum & Pengantar PBJ",
        lessons: [
          { title: "1.1 Latar Belakang & Definisi PBJ Pemerintah", type: "video", url: "https://www.youtube.com/watch?v=kYJv_t7H6_I" },
          { title: "1.2 Ruang Lingkup & Tujuan Pengadaan", type: "video", url: "https://www.youtube.com/watch?v=kYJv_t7H6_I" },
          { title: "1.3 Etika & Prinsip Dasar Pengadaan", type: "video", url: "https://www.youtube.com/watch?v=kYJv_t7H6_I" },
          { title: "1.4 Slide Presentasi: Ringkasan Regulasi PBJ (PowerPoint)", type: "pptx", url: "https://docs.google.com/presentation/d/1gKk9E7z3L0Bq5m9sY4vX8w/pub" }
        ]
      },
      {
        title: "Modul 2: Perencanaan Pengadaan",
        lessons: [
          { title: "2.1 Identifikasi Kebutuhan & RUP", type: "video", url: "https://www.youtube.com/watch?v=kYJv_t7H6_I" },
          { title: "2.2 Penyusunan Anggaran & Pemaketan", type: "video", url: "https://www.youtube.com/watch?v=kYJv_t7H6_I" }
        ]
      },
      {
        title: "Modul 3: Persiapan & Pelaksanaan Kontrak",
        lessons: [
          { title: "3.1 Penyusunan HPS & Dokumen Pengadaan", type: "video", url: "https://www.youtube.com/watch?v=kYJv_t7H6_I" },
          { title: "3.2 Pengawasan & Serah Terima Hasil Pekerjaan", type: "video", url: "https://www.youtube.com/watch?v=kYJv_t7H6_I" }
        ]
      }
    ],
    quiz: [
      { q: "Siapakah yang menetapkan Rencana Umum Pengadaan (RUP)?", options: ["Pengguna Anggaran (PA) / Kuasa Pengguna Anggaran (KPA)", "Pejabat Pembuat Komitmen (PPK)", "Pokja Pemilihan", "Pejabat Pengadaan"], correct: 0 },
      { q: "Berikut ini yang merupakan prinsip pengadaan barang/jasa pemerintah adalah...", options: ["Rahasia, Subyektif, Menguntungkan Sepihak", "Efisien, Efektif, Transparan, Terbuka, Bersaing, Adil, Akuntabel", "Cepat, Murah, Tanpa Dokumen, Langsung Beli", "Monopoli, Tertutup, Fleksibel Berlebihan"], correct: 1 },
      { q: "Metode pemilihan Penyedia Barang/Pekerjaan Konstruksi/Jasa Lainnya yang dilakukan untuk barang/jasa yang bernilai di atas Rp 200 juta secara umum adalah...", options: ["Pengadaan Langsung", "Penunjukan Langsung", "Tender", "E-Purchasing"], correct: 2 }
    ]
  },
  {
    id: "c2",
    title: "AI Strategy & Governance for Public Sector - Live Webinar Series",
    category: "AI",
    learningType: "online",
    typeLabel: "Online (Live Webinar)",
    duration: "18 Jam (6 Sesi Live)",
    level: "Eksekutif",
    price: 1500000,
    priceLabel: "Rp 1,500,000",
    rating: "4.9",
    badge: "AI LMS Executive",
    venue: "Live Zoom Interactive & AI Learning Portal",
    schedule: "Setiap Selasa & Kamis (19:00 - 21:30 WIB)",
    quota: "Sisa 14 Slot",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
    instructor: { name: "Prof. Rian Gunawan, Ph.D", title: "AI Ethics & Public Policy Advisor", org: "Center for Digital Government", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80" },
    desc: "Kelas online interaktif dengan bimbingan langsung dari pakar AI kebijakan publik, diskusi studi kasus live, review tugas kebijakan AI instansi, dan rekaman sesi penuh.",
    features: ["6 Sesi Live Webinar Interaktif (Zoom)", "Tanya Jawab & Bimbingan Langsung", "Review Tugas Kebijakan AI Instansi", "Akses Rekaman Video & Bahan Ajar", "Sertifikat Eksekutif Terverifikasi QR"],
    modules: [
      {
        title: "Modul 1: Landasan Kecerdasan Buatan (AI Foundation)",
        lessons: [
          { title: "1.1 Pengantar AI & Transformasi Sektor Publik", type: "video", url: "https://www.youtube.com/watch?v=aircAruvnKk" },
          { title: "1.2 Machine Learning & Generative AI", type: "video", url: "https://www.youtube.com/watch?v=G2fqAlgmoPo" },
          { title: "1.3 Dampak AI terhadap Layanan Masyarakat", type: "video", url: "https://www.youtube.com/watch?v=aircAruvnKk" },
          { title: "1.4 Slide PPT: Framework Tata Kelola AI Sektor Publik", type: "pptx", url: "https://docs.google.com/presentation/d/1gKk9E7z3L0Bq5m9sY4vX8w/pub" }
        ]
      },
      {
        title: "Modul 2: Tata Kelola AI & Regulasi",
        lessons: [
          { title: "2.1 Tata Kelola AI Sektor Publik", type: "video", url: "https://www.youtube.com/watch?v=G2fqAlgmoPo" },
          { title: "2.2 Analisis Kebijakan Berbasis AI", type: "video", url: "https://www.youtube.com/watch?v=aircAruvnKk" }
        ]
      }
    ],
    quiz: [
      { q: "Apa fokus utama dari AI Governance di sektor publik?", options: ["Mencari keuntungan komersial tertinggi dari AI", "Memastikan kepatuhan etika, keamanan, privasi data, dan keadilan dalam pengambilan keputusan AI", "Menggantikan seluruh staf pemerintahan dengan agen AI", "Menghapus regulasi hukum teknologi"], correct: 1 }
    ]
  },
  {
    id: "c3",
    title: "Dasar Analisis Data & SQL untuk Pengambilan Keputusan",
    category: "Tech",
    learningType: "self_learning",
    typeLabel: "Self-Learning (Belajar Mandiri)",
    duration: "25 Jam",
    level: "Dasar",
    price: 0,
    priceLabel: "Gratis (Free)",
    rating: "4.8",
    badge: "Open Courseware",
    venue: "Akses Belajar Mandiri On-Demand 24/7",
    schedule: "Fleksibel Kapan Saja (Tanpa Jadwal)",
    quota: "Tanpa Batas Kuota",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80",
    instructor: { name: "Siti Rahmawati, M.Kom", title: "Lead Data Architect & BI Specialist", org: "TechGov Analytics", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80" },
    desc: "Materi belajar mandiri gratis tanpa biaya untuk memahami fondasi analisis data, logika database SQL, dan pembuatan dashboard visualisasi interaktif.",
    features: ["100% Gratis Tanpa Syarat", "Akses Video On-Demand 24/7", "Slide Materi PPT & Modul PDF", "Kuis Evaluasi Pemahaman Otomatis", "Sertifikat Kelulusan Digital Standar"],
    modules: [
      {
        title: "Modul 1: Fundamental Data Analytics & SQL",
        lessons: [
          { title: "1.1 Pengantar Analisis Data & Visualisasi BI", type: "video", url: "https://www.youtube.com/watch?v=8j0UDiN7my4" },
          { title: "1.2 Logika SQL & Data Modeling Praktis", type: "video", url: "https://www.youtube.com/watch?v=HXV3zeRR3h4" },
          { title: "1.3 Slide PPT: Arsitektur Data Warehouse & BI Pipeline", type: "pptx", url: "https://docs.google.com/presentation/d/1gKk9E7z3L0Bq5m9sY4vX8w/pub" }
        ]
      }
    ],
    quiz: [{ q: "Fungsi agregat SQL mana yang digunakan untuk mencari rata-rata nilai kolom?", options: ["AVG", "SUM", "MEAN", "COUNT"], correct: 0 }]
  },
  {
    id: "c4",
    title: "Executive Leadership & Strategic Change Management - Offline Bootcamp",
    category: "Leadership",
    learningType: "offline",
    typeLabel: "Offline (Tatap Muka)",
    duration: "24 Jam (3 Hari)",
    level: "Eksekutif",
    price: 4800000,
    priceLabel: "Rp 4,800,000",
    rating: "4.9",
    badge: "Top Management",
    venue: "Hotel Sheraton Surabaya / Jakarta Room",
    schedule: "24 - 26 November 2026 (09:00 - 17:00 WIB)",
    quota: "Sisa 4 Kursi",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&auto=format&fit=crop&q=80",
    instructor: { name: "Drs. Hendra Kusuma, MM", title: "Executive Leadership Coach", org: "Lembaga Administrasi Negara", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80" },
    desc: "Bootcamp kepemimpinan tatap muka eksklusif bagi pimpinan organisasi untuk merumuskan manajemen perubahan strategis, simulasi kepemimpinan krisis, dan coaching 1-on-1.",
    features: ["Workshop Tatap Muka 3 Hari di Hotel Bintang 5", "Executive Coaching 1-on-1", "Simulasi Kepemimpinan & Manajemen Krisis", "Makan Siang & Coffee Break Premium", "Sertifikat Eksekutif LAN / Asosiasi"],
    modules: [
      {
        title: "Modul 1: Kepemimpinan Transformatif",
        lessons: [
          { title: "1.1 Menggerakkan Tim dan Visi Organisasi", type: "video", url: "https://www.youtube.com/watch?v=vlpKyLklDDY" },
          { title: "1.2 Komunikasi Efektif dan Negosiasi Konflik", type: "video", url: "https://www.youtube.com/watch?v=HAnw168huqA" }
        ]
      }
    ],
    quiz: [{ q: "Apa kunci utama keberhasilan manajemen perubahan dalam organisasi?", options: ["Komunikasi transparan dan keterlibatan seluruh pemangku kepentingan", "Mengabaikan masukan dari karyawan", "Melakukan restrukturisasi tanpa pemberitahuan", "Menerapkan sanksi berat secara sepihak"], correct: 0 }]
  },
  {
    id: "c5",
    title: "Public Finance & Government Budgeting Essentials - Live Masterclass",
    category: "Procurement",
    learningType: "online",
    typeLabel: "Online (Live Webinar)",
    duration: "20 Jam (5 Sesi Live)",
    level: "Menengah",
    price: 1250000,
    priceLabel: "Rp 1,250,000",
    rating: "4.8",
    badge: "Kemenkeu Standard",
    venue: "Live Zoom Webinar & LMS Cloud",
    schedule: "Setiap Rabu & Jumat (19:30 - 21:30 WIB)",
    quota: "Sisa 18 Slot",
    image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80",
    instructor: { name: "Dra. Nurul Hidayati, Ak., CA", title: "Senior Public Financial Analyst", org: "Kementerian Keuangan RI", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80" },
    desc: "Bedah mendalam sistem pengelolaan keuangan negara, siklus APBN/APBD, mekanisme perbendaharaan, serta audit kepatuhan melalui sesi tatap muka online interaktif.",
    features: ["5 Sesi Live Webinar Interaktif", "Studi Kasus Penyusunan DIPA & RKA-KL", "Kompilasi Regulasi Keuangan Negara", "Tanya Jawab Langsung Asesor Kemenkeu", "Sertifikat Kelulusan Terakreditasi"],
    modules: [
      {
        title: "Modul 1: Siklus Anggaran Negara",
        lessons: [
          { title: "1.1 Tahapan Perencanaan dan Penganggaran", type: "video", url: "https://www.youtube.com/watch?v=8j0UDiN7my4" },
          { title: "1.2 Pelaksanaan dan Pengawasan Anggaran", type: "video", url: "https://www.youtube.com/watch?v=8j0UDiN7my4" }
        ]
      }
    ],
    quiz: [{ q: "Dokumen apa yang memuat rencana kerja dan anggaran Kementerian/Lembaga?", options: ["DIPA (Daftar Isian Pelaksanaan Anggaran)", "RKA-KL", "APBN", "RUP"], correct: 1 }]
  },
  {
    id: "c6",
    title: "Pengantar Efisiensi Administrasi & Birokrasi Lean",
    category: "Leadership",
    learningType: "self_learning",
    typeLabel: "Self-Learning (Belajar Mandiri)",
    duration: "15 Jam",
    level: "Dasar",
    price: 0,
    priceLabel: "Gratis (Free)",
    rating: "4.7",
    badge: "Efficiency Special",
    venue: "Akses Belajar Mandiri On-Demand 24/7",
    schedule: "Fleksibel Kapan Saja (Self-Paced)",
    quota: "Tanpa Batas Kuota",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80",
    instructor: { name: "Bambang Wijaya, S.T., MBA", title: "Lean Process & Efficiency Consultant", org: "Public Sector Excellence", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80" },
    desc: "Materi belajar mandiri gratis untuk memahami konsep dasar Lean Government, eliminasi pemborosan proses administrasi, dan percepatan alur layanan birokrasi.",
    features: ["100% Gratis Tanpa Biaya", "Akses Materi Video & Slide 24/7", "Studi Kasus Lean Administration", "Kuis Pemahaman Mandiri", "Sertifikat Partisipasi Digital"],
    modules: [
      {
        title: "Modul 1: Dasar Manajemen Operasional",
        lessons: [
          { title: "1.1 Pemetaan Proses Bisnis & Lean Operations", type: "video", url: "https://www.youtube.com/watch?v=vlpKyLklDDY" },
          { title: "1.2 Eliminasi Pemborosan (Waste) di Birokrasi", type: "video", url: "https://www.youtube.com/watch?v=vlpKyLklDDY" }
        ]
      }
    ],
    quiz: [{ q: "Metodologi apa yang fokus pada eliminasi pemborosan untuk efisiensi?", options: ["Lean Management", "Traditional Management", "Ad-hoc Planning", "Crisis Management"], correct: 0 }]
  }
];

const SEED_CATEGORIES = [
  { key: "AI", name: "Kecerdasan Buatan (AI)" },
  { key: "Tech", name: "Teknologi Informasi" },
  { key: "Procurement", name: "Pengadaan Barang/Jasa" },
  { key: "Leadership", name: "Leadership & Management" },
];

const SEED_LEVELS = [
  { key: "Dasar", name: "Dasar" },
  { key: "Menengah", name: "Menengah" },
  { key: "Lanjutan", name: "Lanjutan" },
  { key: "Eksekutif", name: "Eksekutif" },
];

// ─── Schema Creation ──────────────────────────────────────────────────────────

async function createTables(client) {
  // Core tables
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      email VARCHAR(255) PRIMARY KEY,
      password VARCHAR(255) NOT NULL,
      fullname VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      role_label VARCHAR(100) NOT NULL,
      avatar VARCHAR(10) NOT NULL,
      stats JSONB NOT NULL,
      job_title VARCHAR(255),
      organization VARCHAR(255),
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      permissions JSONB NOT NULL DEFAULT '[]',
      competencies JSONB NOT NULL DEFAULT '{}'
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id VARCHAR(50) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      duration VARCHAR(50) NOT NULL,
      level VARCHAR(50) NOT NULL,
      price INT NOT NULL DEFAULT 0,
      price_label VARCHAR(100) NOT NULL,
      rating VARCHAR(10) NOT NULL DEFAULT '5.0',
      badge VARCHAR(100) NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      modules JSONB NOT NULL DEFAULT '[]',
      quiz JSONB NOT NULL DEFAULT '[]',
      exam_settings JSONB NOT NULL DEFAULT '{"timeLimit":0,"maxAttempts":0,"passingScore":70}'
    )
  `);

  // Fase 2 & Landing Page: tambah kolom exam_settings, image, instructor, learning_type, type_label, venue, schedule, quota, features
  await client.query(`
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS exam_settings JSONB NOT NULL DEFAULT '{"timeLimit":0,"maxAttempts":0,"passingScore":70}';
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS image TEXT NOT NULL DEFAULT '';
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor JSONB NOT NULL DEFAULT '{}';
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_type VARCHAR(50) NOT NULL DEFAULT 'self_learning';
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS type_label VARCHAR(100) NOT NULL DEFAULT 'Self-Learning (Belajar Mandiri)';
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS venue TEXT NOT NULL DEFAULT '';
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS schedule TEXT NOT NULL DEFAULT '';
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS quota VARCHAR(50) NOT NULL DEFAULT '';
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '[]';
  `);

  // Backfill seed image, instructor, learning_type, type_label, venue, schedule, quota, features jika masih kosong atau perlu sinkronisasi
  for (const c of SEED_COURSES) {
    await client.query(`
      UPDATE courses
      SET image = CASE WHEN image = '' OR image IS NULL THEN $1 ELSE image END,
          instructor = CASE WHEN instructor = '{}'::jsonb OR instructor IS NULL THEN $2::jsonb ELSE instructor END,
          learning_type = $3,
          type_label = $4,
          venue = CASE WHEN venue IS NULL OR venue = '' THEN $5 ELSE venue END,
          schedule = $6,
          quota = CASE WHEN quota IS NULL OR quota = '' THEN $7 ELSE quota END,
          features = CASE WHEN features IS NULL OR features = '[]'::jsonb THEN $8::jsonb ELSE features END
      WHERE id = $9
    `, [
      c.image, JSON.stringify(c.instructor || {}), c.learningType, c.typeLabel,
      c.venue, c.schedule, c.quota, JSON.stringify(c.features || []), c.id
    ]).catch(() => {});
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      invoice VARCHAR(100) PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      program VARCHAR(255) NOT NULL,
      amount INT NOT NULL DEFAULT 0,
      type VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'Berhasil'
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS certificates (
      id VARCHAR(100) PRIMARY KEY,
      course_id VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      date VARCHAR(100) NOT NULL,
      id_code VARCHAR(100) NOT NULL
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS categories (
      key VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      deleted_at TIMESTAMPTZ DEFAULT NULL
    )
  `);
  await client.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS levels (
      key VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      deleted_at TIMESTAMPTZ DEFAULT NULL
    )
  `);
  await client.query(`ALTER TABLE levels ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL`);

  // Enterprise tables (Fase 1)
  await client.query(`
    CREATE TABLE IF NOT EXISTS exam_attempts (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR(255) NOT NULL,
      course_id VARCHAR(50) NOT NULL,
      score INT NOT NULL DEFAULT 0,
      percentage INT NOT NULL DEFAULT 0,
      passed BOOLEAN NOT NULL DEFAULT FALSE,
      answers JSONB,
      submitted_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS user_progress (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR(255) NOT NULL,
      course_id VARCHAR(50) NOT NULL,
      lesson_index INT NOT NULL DEFAULT 0,
      progress_pct INT NOT NULL DEFAULT 0,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      last_accessed TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_email, course_id, lesson_index)
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS forum_posts (
      id SERIAL PRIMARY KEY,
      course_id VARCHAR(50) NOT NULL,
      user_email VARCHAR(255) NOT NULL,
      user_label VARCHAR(100),
      content TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'approved',
      report_count INT NOT NULL DEFAULT 0,
      flagged_reason TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      actor_email VARCHAR(255) NOT NULL,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50),
      entity_id VARCHAR(100),
      detail JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR(255) NOT NULL,
      course_id VARCHAR(50) NOT NULL,
      enrolled_at TIMESTAMPTZ DEFAULT NOW(),
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      UNIQUE(user_email, course_id)
    )
  `);

  // ─── Kepemilikan sertifikat ────────────────────────────────────────────────
  // Tabel certificates semula tidak menyimpan pemilik sama sekali; beberapa
  // route menebaknya lewat LIKE pada id_code atau join ke exam_attempts
  // berdasarkan course_id saja — yang bisa menautkan sertifikat ke peserta lain
  // yang kebetulan lulus kursus sama.
  await client.query(`ALTER TABLE users ALTER COLUMN avatar TYPE TEXT`).catch(() => {});
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255)`).catch(() => {});
  await client.query(`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`).catch(() => {});
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive'`).catch(() => {});
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT NULL`).catch(() => {});
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ DEFAULT NULL`).catch(() => {});
  await client.query(`CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_status)`).catch(() => {});
  await client.query(`CREATE TABLE IF NOT EXISTS user_subscriptions (id SERIAL PRIMARY KEY, user_email VARCHAR(255) NOT NULL, plan VARCHAR(50) NOT NULL DEFAULT 'monthly', status VARCHAR(50) NOT NULL DEFAULT 'active', starts_at TIMESTAMPTZ DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL, order_id VARCHAR(100), created_at TIMESTAMPTZ DEFAULT NOW())`).catch(() => {});
  await client.query(`CREATE INDEX IF NOT EXISTS idx_user_subs_email ON user_subscriptions(user_email)`).catch(() => {});
  await client.query(`ALTER TABLE certificates ADD COLUMN IF NOT EXISTS user_email VARCHAR(255)`);
  await client.query(`ALTER TABLE certificates ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ DEFAULT NOW()`);
  await client.query(`ALTER TABLE certificates ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ DEFAULT NULL`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_email)`);

  // Backfill: sertifikat lama diterbitkan dengan pola id
  // AILMS-<base36>-<PREFIX_EMAIL>-<courseId>. Cocokkan prefix itu ke pengguna
  // yang memang tercatat lulus kursus bersangkutan — bukan sembarang pengguna.
  await client.query(`
    UPDATE certificates c
       SET user_email = u.email
      FROM users u
     WHERE c.user_email IS NULL
       AND UPPER(SPLIT_PART(u.email, '@', 1)) = SPLIT_PART(c.id, '-', 3)
       AND EXISTS (
         SELECT 1 FROM exam_attempts ea
          WHERE ea.user_email = u.email AND ea.course_id = c.course_id AND ea.passed
       )
  `).catch(() => {});

  // Sisanya (mis. sertifikat seed) dipetakan dari catatan kelulusan paling awal.
  await client.query(`
    UPDATE certificates c
       SET user_email = sub.user_email
      FROM (
        SELECT DISTINCT ON (course_id) course_id, user_email
          FROM exam_attempts WHERE passed ORDER BY course_id, submitted_at ASC
      ) sub
     WHERE c.user_email IS NULL AND sub.course_id = c.course_id
  `).catch(() => {});

  // Fase 2: tabel question_bank
  await client.query(`
    CREATE TABLE IF NOT EXISTS question_bank (
      id SERIAL PRIMARY KEY,
      course_id VARCHAR(50) NOT NULL,
      question TEXT NOT NULL,
      options JSONB NOT NULL DEFAULT '[]',
      correct INT NOT NULL DEFAULT 0,
      category VARCHAR(100),
      difficulty VARCHAR(20) NOT NULL DEFAULT 'medium',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await client.query(`CREATE INDEX IF NOT EXISTS idx_question_bank_course ON question_bank(course_id)`);

  // Fase 2+: tabel template sertifikat kustom
  await client.query(`
    CREATE TABLE IF NOT EXISTS cert_templates (
      id SERIAL PRIMARY KEY,
      org_name     VARCHAR(255) NOT NULL DEFAULT 'PT. SDI',
      ecosystem    VARCHAR(255) NOT NULL DEFAULT 'Platform Pelatihan & Sertifikasi Kompetensi',
      accent_r     INT NOT NULL DEFAULT 30,
      accent_g     INT NOT NULL DEFAULT 58,
      accent_b     INT NOT NULL DEFAULT 138,
      signer1_name  VARCHAR(100) NOT NULL DEFAULT 'Prof. Dr. Kadir',
      signer1_title VARCHAR(100) NOT NULL DEFAULT 'PT. SDI',
      signer2_name  VARCHAR(100) NOT NULL DEFAULT '',
      signer2_title VARCHAR(100) NOT NULL DEFAULT '',
      logo_url     TEXT DEFAULT '',
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Seed template default jika kosong
  await client.query(`
    INSERT INTO cert_templates (id, org_name) VALUES (1, 'PT. SDI')
    ON CONFLICT (id) DO NOTHING
  `);

  // Migrasi merek: basis data yang dibuat sebelum pergantian nama masih
  // menyimpan penerbit lama pada baris template. Hanya baris yang benar-benar
  // masih berisi nilai lama yang disentuh, sehingga kustomisasi admin aman.
  await client.query(`
    UPDATE cert_templates
       SET org_name      = 'PT. SDI',
           ecosystem     = 'Platform Pelatihan & Sertifikasi Kompetensi',
           signer1_title = 'PT. SDI',
           signer2_name  = '',
           signer2_title = '',
           updated_at    = NOW()
     WHERE org_name IN ('Trisakti AI Solutions', 'NHCIE Learning')
        OR signer1_title = 'Universitas Trisakti'
        OR signer2_title = 'PT Royal Artindo Kreasi'
  `).catch(() => {});

  // Fase 2+: kolom prerequisite_course_id di courses
  await client.query(`
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS prerequisite_course_id VARCHAR(50) DEFAULT NULL
  `);

  // ─── Fase 3: Organisasi & Departemen ────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) UNIQUE,
      description TEXT DEFAULT '',
      deleted_at TIMESTAMPTZ DEFAULT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS departments (
      id SERIAL PRIMARY KEY,
      organization_id INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50),
      deleted_at TIMESTAMPTZ DEFAULT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Kolom tambahan di users untuk org/dept
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id INT DEFAULT NULL`);
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id INT DEFAULT NULL`);
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL`);

  // Soft delete di courses
  await client.query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL`);

  // ─── Fase 3: Notifikasi ───────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'info',
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      link VARCHAR(255) DEFAULT '',
      read_at TIMESTAMPTZ DEFAULT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_email)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_email, read_at)`);

  // ─── Fase 3: Pengumuman Kelas ─────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      course_id VARCHAR(50) NOT NULL,
      author_email VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_announcements_course ON announcements(course_id)`);

  // ─── Fase 3: Penilaian Tugas ──────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS assignment_grades (
      id SERIAL PRIMARY KEY,
      course_id VARCHAR(50) NOT NULL,
      user_email VARCHAR(255) NOT NULL,
      lesson_index INT NOT NULL DEFAULT 0,
      grade INT NOT NULL DEFAULT 0,
      feedback TEXT DEFAULT '',
      graded_by VARCHAR(255) NOT NULL,
      graded_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(course_id, user_email, lesson_index)
        )
  `);

  // ─── Fase 3: Migrasi kolom tambahan ──────────────────────────────────────
  await client.query(`ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL`);
  await client.query(`ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'approved'`).catch(()=>{});
  await client.query(`ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS report_count INT NOT NULL DEFAULT 0`).catch(()=>{});
  await client.query(`ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS flagged_reason TEXT DEFAULT ''`).catch(()=>{});

  // ─── Pencatatan pelapor forum (perbaikan: cegah satu orang melaporkan
  // post yang sama berkali-kali untuk memicu auto-flag report_count >= 3) ──
  await client.query(`
    CREATE TABLE IF NOT EXISTS forum_post_reports (
      id SERIAL PRIMARY KEY,
      post_id        INT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
      reporter_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      reason         TEXT DEFAULT '',
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(post_id, reporter_email)
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_forum_post_reports_post ON forum_post_reports(post_id)`);

  // Performance indexes
  await client.query(`CREATE INDEX IF NOT EXISTS idx_exam_attempts_user    ON exam_attempts(user_email)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_exam_attempts_course  ON exam_attempts(course_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_user_progress_user    ON user_progress(user_email)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_forum_posts_course    ON forum_posts(course_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_actor      ON audit_logs(actor_email)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_enrollments_user      ON enrollments(user_email)`);

  // ─── Migrasi: hash password plain text yang belum di-hash ─────────────────
  try {
    const { rows: plainUsers } = await client.query(
      "SELECT email, password FROM users WHERE password NOT LIKE '$2%'"
    );
    for (const u of plainUsers) {
      const hashed = await bcrypt.hash(u.password, 10);
      await client.query('UPDATE users SET password = $1 WHERE email = $2', [hashed, u.email]);
    }
    if (plainUsers.length > 0) console.log(`✅ Hashed ${plainUsers.length} plain-text password(s)`);
  } catch { /* tabel mungkin belum ada */ }

  // ─── Migrasi: Akun Admin admin@digidaya.tech ────────────────────────────────
  if (process.env.SEED_DEMO_ACCOUNTS !== "false") {
    try {
      const { rows: digidayaAdmin } = await client.query("SELECT email FROM users WHERE email = 'admin@digidaya.tech'");
      if (digidayaAdmin.length === 0) {
        const hashed = await bcrypt.hash('password123', 10);
        await client.query(
          `INSERT INTO users
             (email, password, fullname, role, role_label, avatar, stats, job_title, organization, status, permissions, competencies)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (email) DO NOTHING`,
          [
            'admin@digidaya.tech',
            hashed,
            'Super Administrator',
            'admin',
            'Platform Admin & Auditor',
            'SA',
            JSON.stringify({ hours: 0, courses: 10, certs: 250, competency: 'Superuser' }),
            'System Admin',
            'PT. SDI',
            'active',
            JSON.stringify(['view_dashboard', 'access_lms', 'access_ai_portal', 'manage_master_data']),
            JSON.stringify({ current: [80, 80, 80, 80, 80, 80], target: [90, 90, 90, 90, 90, 90] }),
          ]
        );
        console.log('✅ Akun admin@digidaya.tech berhasil dipersiapkan');
      }
    } catch (adminErr) {
      console.warn('Admin init note:', adminErr?.message);
    }
  }


  // ─── Fase 4: Gamifikasi ───────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_points (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      points INT NOT NULL DEFAULT 0,
      total_points INT NOT NULL DEFAULT 0,
      level INT NOT NULL DEFAULT 1,
      streak_days INT NOT NULL DEFAULT 0,
      last_activity_date DATE,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_email)
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS badges (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      icon VARCHAR(10) NOT NULL,
      color VARCHAR(20) DEFAULT '#f59e0b',
      criteria_type VARCHAR(50) NOT NULL,
      criteria_value INT NOT NULL DEFAULT 1
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS user_badges (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      badge_id VARCHAR(50) NOT NULL REFERENCES badges(id),
      awarded_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_email, badge_id)
    )
  `);

  // ─── Fase 4: Live Sessions ────────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS live_sessions (
      id SERIAL PRIMARY KEY,
      course_id VARCHAR(50) REFERENCES courses(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      instructor_email VARCHAR(255) REFERENCES users(email) ON DELETE SET NULL,
      scheduled_at TIMESTAMPTZ NOT NULL,
      duration_minutes INT NOT NULL DEFAULT 60,
      meet_link VARCHAR(500) DEFAULT '',
      platform VARCHAR(50) DEFAULT 'zoom',
      max_participants INT DEFAULT 100,
      status VARCHAR(20) DEFAULT 'scheduled',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ DEFAULT NULL
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS live_session_registrations (
      id SERIAL PRIMARY KEY,
      session_id INT NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
      user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      registered_at TIMESTAMPTZ DEFAULT NOW(),
      attended BOOLEAN DEFAULT FALSE,
      UNIQUE(session_id, user_email)
    )
  `);

  // ─── Fase 4: Email Queue ──────────────────────────────────────────────────
  // ─── Tiket dukungan (email masuk) ─────────────────────────────────────────
  // Platform ini hanya pernah mengirim email dari alamat no-reply; balasan
  // peserta jatuh ke kotak surat yang tidak pernah dibaca siapa pun. Dua tabel
  // berikut menampung balasan itu sebagai tiket yang bisa dijawab dari Modul
  // Admin, dengan jawabannya ikut terkirim kembali lewat email.
  await client.query(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id SERIAL PRIMARY KEY,
      ticket_no       VARCHAR(20) UNIQUE,
      from_email      VARCHAR(255) NOT NULL,
      from_name       VARCHAR(255) DEFAULT '',
      user_email      VARCHAR(255) DEFAULT NULL,
      subject         VARCHAR(500) NOT NULL DEFAULT '(tanpa subjek)',
      status          VARCHAR(20) NOT NULL DEFAULT 'open',
      assigned_to     VARCHAR(255) DEFAULT '',
      last_message_at TIMESTAMPTZ DEFAULT NOW(),
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status, last_message_at DESC)`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS support_ticket_messages (
      id SERIAL PRIMARY KEY,
      ticket_id    INT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      direction    VARCHAR(10) NOT NULL,          -- inbound | outbound
      author_email VARCHAR(255) DEFAULT '',
      body         TEXT NOT NULL,
      message_id   VARCHAR(255) DEFAULT '',
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_ticket_msgs ON support_ticket_messages(ticket_id, created_at)`);
  // Message-ID dipakai menolak kiriman ganda dari penyedia email.
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_msg_unik
      ON support_ticket_messages(message_id) WHERE message_id <> ''
  `).catch(() => {});

  // ─── Profil instruktur ────────────────────────────────────────────────────
  // Sebelumnya daftar instruktur hanya array di state React: jadwal berupa teks
  // bebas ("Senin & Rabu"), persentase bagi hasil tidak dipakai perhitungan apa
  // pun, dan barisnya tidak tertaut akun mana pun — sehingga tidak ada alamat
  // yang bisa dikirimi pengingat. Profil kini menempel pada akun pengguna;
  // jadwal diturunkan dari live_sessions, bukan diketik ulang.
  await client.query(`
    CREATE TABLE IF NOT EXISTS instructor_profiles (
      user_email          VARCHAR(255) PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
      specialty           VARCHAR(255) DEFAULT '',
      bio                 TEXT DEFAULT '',
      phone               VARCHAR(50) DEFAULT '',
      revenue_share_pct   NUMERIC(5,2) NOT NULL DEFAULT 30,
      active              BOOLEAN NOT NULL DEFAULT TRUE,
      -- Penanda anti-kirim-ulang untuk masing-masing jenis pengingat.
      last_weekly_digest_at  TIMESTAMPTZ DEFAULT NULL,
      last_grading_nudge_at  TIMESTAMPTZ DEFAULT NULL,
      last_payout_digest_at  TIMESTAMPTZ DEFAULT NULL,
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      updated_at          TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ─── Bagi hasil instruktur ────────────────────────────────────────────────
  // Satu baris per instruktur per periode. Nilai bruto dihitung dari order
  // berstatus lunas pada kursus yang ia ampu, lalu dikalikan persentasenya.
  await client.query(`
    CREATE TABLE IF NOT EXISTS instructor_payouts (
      id SERIAL PRIMARY KEY,
      user_email    VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      period_start  DATE NOT NULL,
      period_end    DATE NOT NULL,
      gross_amount  BIGINT NOT NULL DEFAULT 0,
      share_pct     NUMERIC(5,2) NOT NULL DEFAULT 0,
      payout_amount BIGINT NOT NULL DEFAULT 0,
      order_count   INT NOT NULL DEFAULT 0,
      status        VARCHAR(20) NOT NULL DEFAULT 'unpaid',
      paid_at       TIMESTAMPTZ DEFAULT NULL,
      paid_by       VARCHAR(255) DEFAULT '',
      reference     VARCHAR(255) DEFAULT '',
      notes         TEXT DEFAULT '',
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_email, period_start, period_end)
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_payouts_user ON instructor_payouts(user_email, status)`);

  // Penanda pengingat khusus instruktur — terpisah dari pengingat peserta agar
  // keduanya tidak saling mematikan.
  await client.query(`ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS instructor_reminder_24h_at TIMESTAMPTZ DEFAULT NULL`);
  await client.query(`ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS instructor_reminder_1h_at  TIMESTAMPTZ DEFAULT NULL`);

  // ─── Pengumpulan tugas ────────────────────────────────────────────────────
  // Tabel nilai (`assignment_grades`) sudah ada sejak Fase 3, tetapi tabel
  // pengumpulannya tidak pernah dibuat: instruktur menilai berkas yang tidak
  // pernah tersimpan, dan tombol unggah di kelas hanya `setTimeout` dua detik.
  await client.query(`
    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id SERIAL PRIMARY KEY,
      course_id    VARCHAR(50)  NOT NULL,
      user_email   VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      lesson_index INT NOT NULL DEFAULT 0,
      file_url     TEXT DEFAULT '',
      file_name    VARCHAR(255) DEFAULT '',
      note         TEXT DEFAULT '',
      status       VARCHAR(20) NOT NULL DEFAULT 'submitted',
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(course_id, user_email, lesson_index)
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_submissions_course ON assignment_submissions(course_id, lesson_index)`);

  // ─── Kehadiran kelas ──────────────────────────────────────────────────────
  // Menggantikan teks "IP: 192.168.1.45, Lokasi GPS Terverifikasi" yang ditulis
  // mati di klien. Satu baris per peserta per kursus per hari.
  await client.query(`
    CREATE TABLE IF NOT EXISTS class_attendance (
      id SERIAL PRIMARY KEY,
      course_id    VARCHAR(50)  NOT NULL,
      user_email   VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      session_date DATE NOT NULL DEFAULT CURRENT_DATE,
      check_in_at  TIMESTAMPTZ DEFAULT NOW(),
      check_out_at TIMESTAMPTZ DEFAULT NULL,
      ip_address   VARCHAR(64) DEFAULT '',
      user_agent   TEXT DEFAULT '',
      latitude     NUMERIC DEFAULT NULL,
      longitude    NUMERIC DEFAULT NULL,
      accuracy_m   NUMERIC DEFAULT NULL,
      UNIQUE(course_id, user_email, session_date)
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_attendance_course ON class_attendance(course_id, session_date)`);

  // ─── Penyatuan data organisasi ───────────────────────────────────────────
  // Sampai kini organisasi punya dua wujud: teks bebas `users.organization`
  // (dipakai laporan dan sertifikat) dan relasi `users.organization_id`
  // (dipakai modul organisasi). Keduanya tidak pernah disinkronkan, sehingga
  // laporan per instansi dan struktur organisasi menceritakan dua hal berbeda.
  // Migrasi ini menjadikan relasi sebagai sumber kebenaran: setiap nama
  // organisasi yang sudah dipakai pengguna dibuatkan barisnya, lalu ditautkan.
  await client.query(`
    INSERT INTO organizations (name)
    SELECT DISTINCT TRIM(u.organization)
      FROM users u
     WHERE u.organization IS NOT NULL AND TRIM(u.organization) <> ''
       AND NOT EXISTS (
         SELECT 1 FROM organizations o WHERE LOWER(o.name) = LOWER(TRIM(u.organization))
       )
  `).catch(() => {});

  await client.query(`
    UPDATE users u
       SET organization_id = o.id
      FROM organizations o
     WHERE u.organization_id IS NULL
       AND o.deleted_at IS NULL
       AND LOWER(o.name) = LOWER(TRIM(u.organization))
  `).catch(() => {});

  // ─── Kolom & tabel yang dirujuk kode tetapi belum pernah dibuat ──────────
  // Ketiganya adalah akibat skema yang tumbuh lewat CREATE TABLE IF NOT EXISTS
  // tanpa migrasi berversi: kode memakainya, basis data tidak memilikinya, dan
  // galatnya ditelan blok catch sehingga fiturnya diam-diam mati.

  // Balasan berulir di forum kelas — INSERT-nya sudah menulis kolom ini.
  await client.query(`ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS reply_to INT DEFAULT NULL`);

  // Tanggal bergabung pengguna — dipakai laporan "pengguna baru per periode".
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMPTZ DEFAULT NULL`);
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_policy_version VARCHAR(50) DEFAULT NULL`);

  // Waktu penyelesaian pelajaran — dipakai laporan penyelesaian dan tren harian.
  await client.query(`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL`);
  // Isi mundur dari waktu akses terakhir untuk baris yang sudah selesai.
  await client.query(`
    UPDATE user_progress SET completed_at = last_accessed
     WHERE completed = TRUE AND completed_at IS NULL
  `).catch(() => {});

  // ─── Sesi login aktif ─────────────────────────────────────────────────────
  // Yang disimpan adalah hash SHA-256 token, bukan tokennya: basis data yang
  // bocor tidak boleh berisi kunci sesi yang langsung bisa dipakai.
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id SERIAL PRIMARY KEY,
      user_email    VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      session_token VARCHAR(64)  NOT NULL,
      user_agent    TEXT DEFAULT '',
      ip_address    VARCHAR(64) DEFAULT '',
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      last_active   TIMESTAMPTZ DEFAULT NOW(),
      revoked_at    TIMESTAMPTZ DEFAULT NULL,
      UNIQUE(session_token)
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user   ON user_sessions(user_email, revoked_at)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_token  ON user_sessions(session_token)`);

  // ─── Reset Password Token (Sekali Pakai & Kedaluwarsa 30 Menit) ──────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      token_hash VARCHAR(128) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at    TIMESTAMPTZ DEFAULT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_reset_token_hash  ON password_reset_tokens(token_hash)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_reset_token_email ON password_reset_tokens(user_email)`);

  // ─── Live class: kapasitas, kehadiran, rekaman, pengingat ────────────────
  // Kolom-kolom ini menyusul setelah tabel live_sessions dipakai, jadi
  // ditambahkan lewat ALTER agar basis data lama ikut terbawa.
  await client.query(`ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS recording_url TEXT DEFAULT ''`);
  await client.query(`ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS reminder_24h_at TIMESTAMPTZ DEFAULT NULL`);
  await client.query(`ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS reminder_1h_at  TIMESTAMPTZ DEFAULT NULL`);

  // status: 'registered' (dapat kursi) | 'waitlisted' (antre) | 'cancelled'
  await client.query(`ALTER TABLE live_session_registrations ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'registered'`);
  await client.query(`ALTER TABLE live_session_registrations ADD COLUMN IF NOT EXISTS attended_at TIMESTAMPTZ DEFAULT NULL`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_lsr_session_status ON live_session_registrations(session_id, status)`);

  // ─── Kepemilikan kursus ───────────────────────────────────────────────────
  // Sebelumnya siapa pun berperan corporate/government menjadi "instruktur"
  // setiap kursus di platform. Tabel ini menjadikan kewenangan mengajar sebagai
  // penugasan yang tercatat, bukan efek samping dari peran.
  await client.query(`
    CREATE TABLE IF NOT EXISTS course_instructors (
      id SERIAL PRIMARY KEY,
      course_id   VARCHAR(50)  NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      user_email  VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      assigned_by VARCHAR(255) DEFAULT '',
      assigned_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(course_id, user_email)
    )
  `);

  // ─── Penugasan Pelatihan Karyawan & Pelacakan Kepatuhan (D.1) ───────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS training_assignments (
      id SERIAL PRIMARY KEY,
      course_id    VARCHAR(50)  NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      assigned_to  VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      assigned_by  VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      due_date     TIMESTAMPTZ,
      is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
      completed_at TIMESTAMPTZ DEFAULT NULL,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(course_id, assigned_to)
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_ta_assigned_to ON training_assignments(assigned_to)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_ta_course      ON training_assignments(course_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_course_instructors_user ON course_instructors(user_email)`);

  // ─── Riwayat Rekomendasi & Perencanaan AI Planner (D.4) ─────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_planner_results (
      id SERIAL PRIMARY KEY,
      user_email      VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      planner_type    VARCHAR(50)  NOT NULL DEFAULT 'gov',
      organization    VARCHAR(255) DEFAULT '',
      target_role     VARCHAR(255) DEFAULT '',
      current_skills  JSONB NOT NULL DEFAULT '[]',
      gap_analysis    JSONB NOT NULL DEFAULT '{}',
      recommendations JSONB NOT NULL DEFAULT '[]',
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_planner_user ON ai_planner_results(user_email)`);

  // ─── Webhook Keluar ke HRIS Klien (D.12) ─────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS webhook_subscriptions (
      id SERIAL PRIMARY KEY,
      organization_id VARCHAR(100) NOT NULL,
      target_url TEXT NOT NULL,
      secret_key VARCHAR(255) NOT NULL,
      events JSONB NOT NULL DEFAULT '["course.completed", "certificate.issued"]',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_webhook_subs_org ON webhook_subscriptions(organization_id)`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS email_queue (
      id SERIAL PRIMARY KEY,
      to_email VARCHAR(255) NOT NULL,
      to_name VARCHAR(255) DEFAULT '',
      subject VARCHAR(500) NOT NULL,
      body_html TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      attempts INT DEFAULT 0,
      sent_at TIMESTAMPTZ,
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ─── Fase 4: AI Interactions ──────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_interactions (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL DEFAULT 'chat',
      prompt TEXT NOT NULL,
      response TEXT NOT NULL,
      course_id VARCHAR(50),
      tokens_used INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Fase 4 indexes
  await client.query(`CREATE INDEX IF NOT EXISTS idx_user_points_email     ON user_points(user_email)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_user_badges_email     ON user_badges(user_email)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_live_sessions_course  ON live_sessions(course_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_live_sessions_date    ON live_sessions(scheduled_at)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_email_queue_status    ON email_queue(status)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_interactions_user  ON ai_interactions(user_email)`);


  // ─── Fase 5: Payment Orders ───────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id VARCHAR(100) PRIMARY KEY,
      user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      course_id VARCHAR(50) REFERENCES courses(id) ON DELETE SET NULL,
      amount BIGINT NOT NULL,
      currency VARCHAR(10) DEFAULT 'IDR',
      status VARCHAR(30) DEFAULT 'pending',
      payment_method VARCHAR(50) DEFAULT '',
      snap_token TEXT DEFAULT '',
      snap_redirect_url TEXT DEFAULT '',
      paid_at TIMESTAMPTZ,
      expired_at TIMESTAMPTZ,
      invoice_number VARCHAR(50) UNIQUE,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // Tambah kolom updated_at jika belum ada (migration-safe)
  await client.query(`ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`).catch(()=>{});

  // ─── Fase 5: Course Reviews ───────────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS course_reviews (
      id SERIAL PRIMARY KEY,
      course_id VARCHAR(50) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT DEFAULT '',
      helpful_count INT DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'approved',
      report_count INT NOT NULL DEFAULT 0,
      flagged_reason TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(course_id, user_email)
    )
  `);
  await client.query(`ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'approved'`).catch(()=>{});
  await client.query(`ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS report_count INT NOT NULL DEFAULT 0`).catch(()=>{});
  await client.query(`ALTER TABLE course_reviews ADD COLUMN IF NOT EXISTS flagged_reason TEXT DEFAULT ''`).catch(()=>{});

  // ─── Fase 5: Push Subscriptions ──────────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR(255) NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_email, endpoint)
    )
  `);

  // ─── Fase 5: KPI Targets & Records ───────────────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS kpi_targets (
      id SERIAL PRIMARY KEY,
      organization VARCHAR(255) NOT NULL,
      department VARCHAR(255) DEFAULT '',
      metric_key VARCHAR(100) NOT NULL,
      metric_label VARCHAR(255) NOT NULL,
      target_value NUMERIC NOT NULL,
      unit VARCHAR(50) DEFAULT '%',
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      created_by VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(organization, department, metric_key, period_start)
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS kpi_records (
      id SERIAL PRIMARY KEY,
      target_id INT NOT NULL REFERENCES kpi_targets(id) ON DELETE CASCADE,
      actual_value NUMERIC NOT NULL,
      recorded_at TIMESTAMPTZ DEFAULT NOW(),
      recorded_by VARCHAR(255),
      notes TEXT DEFAULT ''
    )
  `);

  // Platform Settings
  await client.query(`
    CREATE TABLE IF NOT EXISTS platform_settings (
      key   VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      updated_by VARCHAR(255) DEFAULT ''
    )
  `);

  // Fase 5 indexes
  await client.query(`CREATE INDEX IF NOT EXISTS idx_payment_orders_user    ON payment_orders(user_email)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_payment_orders_status  ON payment_orders(status)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_course_reviews_course  ON course_reviews(course_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_push_subs_user         ON push_subscriptions(user_email)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_kpi_targets_org        ON kpi_targets(organization)`);

    console.log("✅ Database schema initialized successfully");
}

// ─── query helper ────────────────────────────────────────────────────────────
export async function query(text, params) {
  // Seam untuk pengujian: tes otomatis (lihat tests/) bisa menimpa query
  // sungguhan dengan global._mockDbQuery(text, params) tanpa butuh Postgres
  // nyata, dan tanpa setiap route perlu seam-nya sendiri (lihat api/health
  // yang sebelumnya menulis pola ini sendiri secara lokal).
  if (global._mockDbQuery) return global._mockDbQuery(text, params);
  if (!global._dbInitialized) {
    try { await initDatabase(); } catch(e) { console.warn("DB auto-init warning:", e.message); }
  }
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 2000) console.warn("Slow query detected:", { text: text.substring(0, 80), duration });
    return res;
  } catch (err) {
    console.error("DB query error:", err.message, "| Query:", text.substring(0, 120));
    throw err;
  }
}

// Alias untuk kompatibilitas — beberapa route memanggil initDB
export async function initDB() {
  const client = await pool.connect();
  try {
    await createTables(client);
  } finally {
    client.release();
  }
}
// ─── Seed Functions ───────────────────────────────────────────────────────────

async function seedUsers(client) {
  if (process.env.SEED_DEMO_ACCOUNTS === "false") {
    return;
  }
  for (const u of SEED_USERS) {
    const hashed = await bcrypt.hash(u.password, 10);
    await client.query(
      `INSERT INTO users
         (email, password, fullname, role, role_label, avatar, stats, job_title, organization, status, permissions, competencies)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (email) DO NOTHING`,
      [u.email, hashed, u.fullname, u.role, u.roleLabel, u.avatar,
       JSON.stringify(u.stats), u.jobTitle, u.organization, u.status,
       JSON.stringify(u.permissions), JSON.stringify(u.competencies)]
    );
  }
}

async function seedCourses(client) {
  for (const c of SEED_COURSES) {
    await client.query(
      `INSERT INTO courses
         (id, title, category, duration, level, price, price_label, rating, badge, image, instructor, description, modules, quiz, learning_type, type_label, venue, schedule, quota, features)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       ON CONFLICT (id) DO NOTHING`,
      [c.id, c.title, c.category, c.duration, c.level, c.price, c.priceLabel,
       c.rating, c.badge, c.image || '', JSON.stringify(c.instructor || {}), c.desc, JSON.stringify(c.modules), JSON.stringify(c.quiz),
       c.learningType || 'self_learning', c.typeLabel || 'Self-Learning (Belajar Mandiri)', c.venue || '', c.schedule || '', c.quota || '', JSON.stringify(c.features || [])]
    );
  }
}

async function seedTransactions(client) {
  await client.query(
    `INSERT INTO transactions (invoice, username, program, amount, type, status)
     VALUES ('INV-2026-001', 'Ahmad Hidayat', 'PBJ Level 1', 2500000, 'QRIS', 'Berhasil')
     ON CONFLICT (invoice) DO NOTHING`
  );
}

async function seedCertificates(client) {
  await client.query(
    `INSERT INTO certificates (id, course_id, title, date, id_code)
     VALUES ('AILMS-TX-1002A', 'c1', 'PBJ Level 1 (Pengadaan Barang & Jasa Pemerintah)', '05 Juni 2026', 'AILMS-TX-1002A')
     ON CONFLICT (id) DO NOTHING`
  );
}

async function seedCategories(client) {
  for (const cat of SEED_CATEGORIES) {
    await client.query(
      'INSERT INTO categories (key, name) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
      [cat.key, cat.name]
    );
  }
}

async function seedLevels(client) {
  for (const lvl of SEED_LEVELS) {
    await client.query(
      'INSERT INTO levels (key, name) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
      [lvl.key, lvl.name]
    );
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────


async function seedBadges(client) {
  const BADGES = [
    { id: 'first_login',    name: 'Langkah Pertama',   description: 'Pertama kali login',              icon: '👣', color: '#94a3b8', criteria_type: 'login_count',    criteria_value: 1  },
    { id: 'first_course',   name: 'Penjelajah',         description: 'Mendaftar kursus pertama',        icon: '🗺️', color: '#60a5fa', criteria_type: 'enrollment_count', criteria_value: 1 },
    { id: 'fast_learner',   name: 'Pelajar Cepat',      description: 'Selesaikan kursus dalam 7 hari',  icon: '⚡', color: '#fbbf24', criteria_type: 'course_speed',    criteria_value: 7  },
    { id: 'streak_7',       name: 'Konsisten 7 Hari',   description: 'Belajar 7 hari berturut-turut',   icon: '🔥', color: '#f97316', criteria_type: 'streak_days',     criteria_value: 7  },
    { id: 'streak_30',      name: 'Dedikasi Penuh',     description: 'Belajar 30 hari berturut-turut',  icon: '💎', color: '#a78bfa', criteria_type: 'streak_days',     criteria_value: 30 },
    { id: 'quiz_ace',       name: 'Jagoan Kuis',        description: 'Skor sempurna 100% di ujian',     icon: '🎯', color: '#34d399', criteria_type: 'perfect_score',   criteria_value: 1  },
    { id: 'cert_1',         name: 'Tersertifikasi',     description: 'Mendapat sertifikat pertama',     icon: '🏆', color: '#fbbf24', criteria_type: 'cert_count',      criteria_value: 1  },
    { id: 'cert_5',         name: 'Kolektor Sertifikat','description': 'Mendapat 5 sertifikat',         icon: '🥇', color: '#f59e0b', criteria_type: 'cert_count',      criteria_value: 5  },
    { id: 'points_500',     name: 'Bintang Baru',       description: 'Kumpulkan 500 poin XP',           icon: '⭐', color: '#fde68a', criteria_type: 'total_points',    criteria_value: 500 },
    { id: 'points_2000',    name: 'Pahlawan Belajar',   description: 'Kumpulkan 2000 poin XP',          icon: '🦸', color: '#6ee7b7', criteria_type: 'total_points',    criteria_value: 2000 },
  ];

  for (const b of BADGES) {
    await client.query(
      `INSERT INTO badges (id, name, description, icon, color, criteria_type, criteria_value)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [b.id, b.name, b.description, b.icon, b.color, b.criteria_type, b.criteria_value]
    );
  }
}

let initPromise = null;

export async function initDatabase() {
  if (global._dbInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const client = await pool.connect();
    try {
      await client.query('SELECT pg_advisory_lock(987654321)').catch(() => {});
      try {
        // 1. Pastikan tabel schema_migrations ada untuk melacak versi migrasi
        await client.query(`
          CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(100) PRIMARY KEY,
            applied_at TIMESTAMPTZ DEFAULT NOW()
          )
        `).catch(() => {});

        // 2. Ambil daftar migrasi yang sudah pernah diaplikasikan
        const { rows: migrationRows } = await client.query(
          "SELECT version FROM schema_migrations"
        ).catch(() => ({ rows: [] }));
        const appliedMigrations = new Set((migrationRows || []).map(r => r.version));

        // 3. Eksekusi DDL jika skema base belum tercatat
        if (!appliedMigrations.has('20261019_base_schema_v2')) {
          await client.query('BEGIN');
          await createTables(client);
          await client.query(
            "INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING",
            ['20261019_base_schema_v2']
          );
          await client.query('COMMIT');
          console.log('✅ Base schema v2 migration applied successfully');
        }

        // 4. Eksekusi Seeders hanya jika belum pernah dijalankan
        if (!appliedMigrations.has('20261019_initial_seeds')) {
          await client.query('BEGIN');
          await seedUsers(client);
          await seedCourses(client);
          await seedTransactions(client);
          await seedCertificates(client);
          await seedCategories(client);
          await seedLevels(client);
          await seedBadges(client);
          await client.query(
            "INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING",
            ['20261019_initial_seeds']
          );
          await client.query('COMMIT');
          console.log('✅ Initial seeds applied successfully');
        }

        global._dbInitialized = true;
      } finally {
        await client.query('SELECT pg_advisory_unlock(987654321)').catch(() => {});
      }
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Database init/seed error:', err);
      throw err;
    } finally {
      client.release();
      initPromise = null;
    }
  })();

  return initPromise;
}

export { pool };


