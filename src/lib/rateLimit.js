/**
 * Rate Limiter for DIDIKARA LMS (Gelombang F.3).
 *
 * Mendukung mode distributed lintas-instance via Upstash Redis REST API
 * dengan seamless in-memory fallback saat Redis belum dikonfigurasi.
 */

const inMemoryStore = new Map();

/**
 * Synchronous rate limit check (in-memory).
 * Dipertahankan untuk 100% backward compatibility dengan modul yang sudah ada.
 *
 * @param {string} key       - Unique key (misal: IP address atau user email)
 * @param {number} max       - Max attempts in window
 * @param {number} windowMs  - Window in milliseconds
 * @returns {{ limited: boolean, retryAfter?: number }}
 */
export function checkRateLimit(key, max = 5, windowMs = 60_000) {
  const now = Date.now();
  let record = inMemoryStore.get(key);

  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + windowMs };
  }

  record.count += 1;
  inMemoryStore.set(key, record);

  if (record.count > max) {
    return { limited: true, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }
  return { limited: false };
}

/**
 * Asynchronous distributed rate limit check.
 * Menggunakan Upstash Redis REST API jika tersedia, atau inMemoryStore sebagai fallback.
 *
 * @param {string} key       - Unique identifier
 * @param {number} max       - Max attempts allowed
 * @param {number} windowMs  - Window in milliseconds
 * @returns {Promise<{ limited: boolean, retryAfter?: number }>}
 */
export async function checkRateLimitAsync(key, max = 5, windowMs = 60_000) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken && typeof fetch !== "undefined") {
    try {
      const windowSeconds = Math.ceil(windowMs / 1000);
      const redisKey = `ratelimit:${key}`;

      // Upstash REST multi-command pipeline: INCR then EXPIRE
      const res = await fetch(`${redisUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redisToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", redisKey],
          ["EXPIRE", redisKey, windowSeconds],
          ["TTL", redisKey],
        ]),
      });

      if (res.ok) {
        const data = await res.json();
        const count = data[0]?.result || 1;
        const ttl = data[2]?.result || windowSeconds;

        if (count > max) {
          return { limited: true, retryAfter: Math.max(1, ttl) };
        }
        return { limited: false };
      }
    } catch {
      // Jika terjadi gangguan koneksi Redis, beralih ke fallback in-memory tanpa throw
    }
  }

  // Fallback in-memory
  return checkRateLimit(key, max, windowMs);
}

// Periodically clean up expired entries (every 5 minutes)
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of inMemoryStore.entries()) {
      if (now > record.resetAt) inMemoryStore.delete(key);
    }
  }, 5 * 60_000);
  if (cleanupTimer && typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }
}
