import { NextResponse } from "next/server";
import { query, pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const envVars = {
    has_DATABASE_URL: !!process.env.DATABASE_URL,
    has_POSTGRES_URL: !!process.env.POSTGRES_URL,
    has_POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
    has_JWT_SECRET: !!process.env.JWT_SECRET,
    is_VERCEL: !!process.env.VERCEL,
    node_env: process.env.NODE_ENV || "development",
  };

  try {
    const res = await query("SELECT NOW() as current_time, count(*) as user_count FROM users");
    return NextResponse.json({
      status: "ok",
      database: "connected",
      environment: envVars,
      data: res.rows[0],
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        environment: envVars,
        error_message: err.message,
      },
      { status: 500 }
    );
  }
}
