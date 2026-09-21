/**
 * AI helper — Google Gemini dengan mock fallback.
 *
 * ENV:
 *   GEMINI_API_KEY  wajib untuk mode nyata; jika kosong seluruh fungsi
 *                   mengembalikan data mock.
 *   GEMINI_MODEL    opsional, menimpa model default.
 *
 * Kontrak respons: setiap fungsi selalu mengembalikan objek yang bisa dipakai,
 * tidak pernah melempar. Ketika hasilnya mock, `mock: true` disertai
 * `mockReason` supaya pemanggil (dan UI) tahu ini simulasi — bukan jawaban AI.
 */

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/** Baca kunci saat dipanggil, bukan saat modul dimuat (aman untuk `next build`). */
function apiKey() {
  const k = process.env.GEMINI_API_KEY;
  if (!k || !k.trim() || k === "YOUR_GEMINI_API_KEY_HERE") return null;
  return k.trim();
}

export function isMockMode() {
  return apiKey() === null;
}

/**
 * Panggil Gemini. Melempar bila gagal — pemanggil yang memutuskan mau
 * jatuh ke mock atau meneruskan error.
 * @param {string} prompt
 * @param {{ json?: boolean, maxOutputTokens?: number, temperature?: number }} opts
 */
export async function callGemini(prompt, opts = {}) {
  const key = apiKey();
  if (!key) throw new Error("GEMINI_API_KEY belum diset");

  const generationConfig = {
    maxOutputTokens: opts.maxOutputTokens ?? 1024,
    temperature: opts.temperature ?? 0.7,
  };
  if (opts.json) generationConfig.responseMimeType = "application/json";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig }),
  });

  if (!res.ok) {
    // Sertakan badan respons: pesan Gemini menjelaskan sebabnya (model tidak
    // ditemukan, kunci ditolak, kuota habis) — informasi ini sebelumnya hilang.
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status} (${GEMINI_MODEL}): ${detail.slice(0, 400)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const reason = data.candidates?.[0]?.finishReason || "tidak ada kandidat";
    throw new Error(`Gemini tidak mengembalikan teks (${reason})`);
  }
  return text;
}

/** Catat kegagalan dengan konteks, lalu kembalikan alasannya untuk disematkan ke respons. */
function jatuhKeMock(fungsi, err) {
  const pesan = err?.message || String(err);
  console.error(`[ai] ${fungsi} gagal, memakai data mock — ${pesan}`);
  return pesan;
}

// ── Mock responses ────────────────────────────────────────────────────────────
const MOCK_RECOMMEND = [
  { courseId: null, title: "Manajemen Risiko Keuangan", reason: "Sesuai kompetensi keuangan Anda yang perlu ditingkatkan", match: 95 },
  { courseId: null, title: "Leadership & Kepemimpinan Strategis", reason: "Cocok untuk pengembangan karir level manajerial", match: 88 },
  { courseId: null, title: "Transformasi Digital Sektor Publik", reason: "Relevan dengan tren digitalisasi di instansi Anda", match: 82 },
];

const MOCK_CHAT = [
  "Berdasarkan profil kompetensi Anda, saya merekomendasikan untuk fokus pada penguatan skill analitik data dan kepemimpinan.",
  "Untuk mencapai target kompetensi Anda, jadwal belajar ideal adalah 2-3 jam per hari dengan fokus pada modul inti terlebih dahulu.",
  "Hasil ujian Anda menunjukkan kekuatan di bidang regulasi. Pertimbangkan untuk mengambil kursus lanjutan di manajemen strategis.",
];

const MOCK_ANALYSIS = {
  analysis: "Analisis kompetensi Anda menunjukkan gap terbesar di bidang Kepemimpinan dan Manajemen Risiko. Fokuskan 3 bulan ke depan pada kursus-kursus di area tersebut untuk mencapai target kompetensi Anda.",
  gaps: ["Kepemimpinan Strategis", "Manajemen Risiko", "Komunikasi Publik"],
  priority: "high",
};

function mockRecommendations(availableCourses) {
  // Sisipkan judul kursus asli dari DB bila tersedia agar mock tetap relevan.
  return MOCK_RECOMMEND.map((r, i) => ({
    ...r,
    courseId: availableCourses?.[i]?.id || null,
    title: availableCourses?.[i]?.title || r.title,
  }));
}

// ── AI Recommendation ─────────────────────────────────────────────────────────
export async function getRecommendations({ userEmail, role, organization, completedCourses, competencies, availableCourses }) {
  if (isMockMode()) {
    return { recommendations: mockRecommendations(availableCourses), mock: true, mockReason: "GEMINI_API_KEY belum diset" };
  }

  const completedTitles = completedCourses?.map(c => c.title).join(", ") || "belum ada";
  const availableTitles = availableCourses?.slice(0, 10).map(c => `${c.id}: ${c.title} (${c.category})`).join("\n") || "";

  const prompt = `Kamu adalah AI advisor platform pelatihan DIDIKARA untuk sektor pemerintahan dan korporat Indonesia.

Data pengguna:
- Email: ${userEmail}
- Peran: ${role}
- Organisasi: ${organization || "-"}
- Kursus selesai: ${completedTitles}
- Kompetensi target (skala 0-100): ${JSON.stringify(competencies || {})}

Daftar kursus tersedia:
${availableTitles}

Rekomendasikan 3 kursus TERBAIK dari daftar di atas untuk pengguna ini. Format respons JSON array:
[{"courseId": "id_kursus", "title": "judul", "reason": "alasan singkat", "match": 0-100}]

Hanya kembalikan JSON array, tidak ada teks lain.`;

  try {
    const text = await callGemini(prompt, { json: true });
    const json = text.match(/\[[\s\S]*\]/)?.[0];
    const recommendations = JSON.parse(json || "[]");
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      throw new Error("respons bukan array rekomendasi yang valid");
    }
    return { recommendations, mock: false };
  } catch (err) {
    return {
      recommendations: mockRecommendations(availableCourses),
      mock: true,
      mockReason: jatuhKeMock("getRecommendations", err),
    };
  }
}

// ── AI Chat ───────────────────────────────────────────────────────────────────
export async function chatWithAI({ userMessage, userContext, history = [] }) {
  if (isMockMode()) {
    return {
      response: MOCK_CHAT[Math.floor(Math.random() * MOCK_CHAT.length)],
      mock: true,
      mockReason: "GEMINI_API_KEY belum diset",
    };
  }

  const systemContext = `Kamu adalah Asisten Belajar DIDIKARA — platform pelatihan SDM Indonesia.
Bantu pengguna dengan pertanyaan tentang kursus, ujian, sertifikasi, dan pengembangan kompetensi.
Konteks pengguna: ${JSON.stringify(userContext || {})}.
Jawab dalam Bahasa Indonesia, ramah, singkat (max 3 paragraf).`;

  const conversationHistory = history.slice(-6).map(h =>
    `${h.role === "user" ? "Pengguna" : "AI"}: ${h.content}`
  ).join("\n");

  const prompt = `${systemContext}\n\nRiwayat percakapan:\n${conversationHistory}\n\nPengguna: ${userMessage}\n\nAI:`;

  try {
    const response = await callGemini(prompt);
    return { response, mock: false };
  } catch (err) {
    return { response: MOCK_CHAT[0], mock: true, mockReason: jatuhKeMock("chatWithAI", err) };
  }
}

// ── AI Competency Analysis ────────────────────────────────────────────────────
export async function analyzeCompetency({ userEmail, role, currentScores, targetScores, completedCourses }) {
  if (isMockMode()) {
    return { ...MOCK_ANALYSIS, mock: true, mockReason: "GEMINI_API_KEY belum diset" };
  }

  const labels = ["Teknis", "Kepemimpinan", "Komunikasi", "Analitik", "Regulasi", "Inovasi"];
  const gapData = labels.map((l, i) => ({
    area: l,
    current: currentScores?.[i] || 0,
    target: targetScores?.[i] || 0,
    gap: (targetScores?.[i] || 0) - (currentScores?.[i] || 0),
  })).filter(g => g.gap > 0).sort((a, b) => b.gap - a.gap);

  const prompt = `Analisis gap kompetensi SDM berikut dan berikan rekomendasi pengembangan:

Peran: ${role}
Gap kompetensi (urut dari terbesar): ${gapData.map(g => `${g.area}: gap ${g.gap} poin`).join(", ")}
Kursus selesai: ${completedCourses?.map(c => c.title).join(", ") || "belum ada"}

Berikan analisis singkat (2 paragraf) dan 3 area prioritas pengembangan. Format JSON:
{"analysis": "...", "gaps": ["area1","area2","area3"], "priority": "high/medium/low"}`;

  try {
    const text = await callGemini(prompt, { json: true });
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    const parsed = JSON.parse(json || "{}");
    if (!parsed.analysis) throw new Error("respons tidak memuat field 'analysis'");
    return { ...parsed, mock: false };
  } catch (err) {
    return { ...MOCK_ANALYSIS, mock: true, mockReason: jatuhKeMock("analyzeCompetency", err) };
  }
}
