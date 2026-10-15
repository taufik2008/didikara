import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Tiered Health Check (A.7):
 * - Publik / Monitor eksternal (UptimeRobot, pingdom, AWS/Vercel):
 *   Balas status bersih tanpa membocorkan jumlah pengguna atau konfigurasi environment.
 * - Internal SRE / Tim Teknis (disertai x-health-secret / x-cron-secret):
 *   Balas diagnostik lengkap termasuk latensi milidetik dan status environment.
 */
export async function GET(request) {
  const secretHeader =
    request.headers.get("x-health-secret") ||
    request.headers.get("x-cron-secret");

  const expectedSecret =
    process.env.HEALTH_CHECK_SECRET ||
    process.env.CRON_SECRET ||
    "didikara-internal-health";

  const isAuthorized = Boolean(secretHeader && secretHeader === expectedSecret);

  const startTime = Date.now();
  let dbConnected = false;
  let latencyMs = 0;
  let dbError = null;

  try {
    // Probe database atomik & ringan O(1), tidak menggunakan scan tabel users
    const runQuery = global._mockDbQuery || query;
    await runQuery("SELECT 1");
    dbConnected = true;
    latencyMs = Date.now() - startTime;
  } catch (err) {
    dbConnected = false;
    dbError = err.message || "Database connection unavailable";
    latencyMs = Date.now() - startTime;
  }

  const timestamp = new Date().toISOString();

  // Jika koneksi DB bermasalah
  if (!dbConnected) {
    if (isAuthorized) {
      return NextResponse.json(
        {
          status: "degraded",
          timestamp,
          diagnostic: {
            database: "disconnected",
            error: dbError,
            latency_ms: latencyMs,
          },
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      {
        status: "degraded",
        timestamp,
      },
      { status: 503 }
    );
  }

  // Jika sehat dan terhubung
  if (isAuthorized) {
    return NextResponse.json({
      status: "ok",
      timestamp,
      diagnostic: {
        database: "connected",
        latency_ms: latencyMs,
        environment: {
          node_env: process.env.NODE_ENV || "development",
          has_DATABASE_URL: Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL),
          has_JWT_SECRET: Boolean(process.env.JWT_SECRET),
          is_VERCEL: Boolean(process.env.VERCEL),
        },
      },
    });
  }

  // Respon publik bersih standar
  return NextResponse.json({
    status: "ok",
    timestamp,
  });
}
