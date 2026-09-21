/**
 * In-memory rate limiter.
 * For production with multiple instances, replace with Redis (e.g. Upstash).
 */

const store = new Map();

/**
 * @param {string} key       - Unique key (e.g. IP address)
 * @param {number} max       - Max attempts in window
 * @param {number} windowMs  - Window in milliseconds
 * @returns {{ limited: boolean, retryAfter?: number }}
 */
export function checkRateLimit(key, max = 5, windowMs = 60_000) {
  const now = Date.now();
  let record = store.get(key);

  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + windowMs };
  }

  record.count += 1;
  store.set(key, record);

  if (record.count > max) {
    return { limited: true, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }
  return { limited: false };
}

// Periodically clean up expired entries (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetAt) store.delete(key);
    }
  }, 5 * 60_000);
}
