/**
 * Centralized Error Tracking and Observability helper for DIDIKARA LMS.
 * 
 * Sesuai rekomendasi Gelombang E.6:
 * - Menangkap galat tak terduga secara terpusat alih-alih 500 polos tanpa jejak.
 * - Siap menghubungkan ke Sentry jika SENTRY_DSN tersedia di environment.
 * - Mencatat error terstruktur dengan konteks pengguna dan URL.
 */

let isInitialized = false;

export function initErrorTracking() {
  if (isInitialized) return;
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (dsn) {
    // Sentry terdeteksi di lingkungan produksi
    console.info("[ErrorTracker] Sentry DSN detected, initialized remote error capture.");
  } else {
    // Mode dev/default: Structured standard logging
    console.info("[ErrorTracker] Error tracking initialized with structured console fallback.");
  }
  isInitialized = true;
}

/**
 * Capture an exception with contextual information.
 *
 * @param {Error|any} error - The caught error
 * @param {object} [context] - Contextual metadata (tags, user, request, etc.)
 * @returns {Promise<{ handled: boolean, id: string, timestamp: string }>}
 */
export async function captureException(error, context = {}) {
  const errorId = `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = new Date().toISOString();

  const payload = {
    id: errorId,
    timestamp,
    message: error?.message || String(error),
    stack: error?.stack || null,
    name: error?.name || "Error",
    context,
  };

  // Structured logging ke console/stderr
  console.error(`[DIDIKARA ERROR TRACKER ${errorId}]`, JSON.stringify(payload, null, 2));

  // Jika SENTRY_DSN tersedia dan berada di environment server, dapat dikirim via REST envelope
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (dsn && typeof fetch !== "undefined") {
    try {
      // Non-blocking telemetry dispatch
      fetch(dsn, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {
      // Ignored: logging telemetry should never throw
    }
  }

  return {
    handled: true,
    id: errorId,
    timestamp,
  };
}
