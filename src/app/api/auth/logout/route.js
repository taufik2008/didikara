import { NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { revokeToken } from "@/lib/session";

export async function POST(request) {
  // Cookie dihapus di peramban, dan sesinya ditandai dicabut di server supaya
  // token yang sempat disalin ke tempat lain ikut mati.
  await revokeToken(getTokenFromRequest(request));

  const response = NextResponse.json({ success: true });
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
