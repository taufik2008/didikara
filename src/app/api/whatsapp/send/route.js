/**
 * POST /api/whatsapp/send
 * Endpoint untuk memicu pengiriman pesan WhatsApp terotomatisasi
 */

import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { sendWhatsAppMessage, WA_TEMPLATES } from "@/services/whatsappService";

export async function POST(request) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Hanya administrator yang dapat memicu pengiriman pesan WhatsApp." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { phone, type, data, rawMessage } = body;

    let messageToSend = rawMessage;
    if (type && WA_TEMPLATES[type] && data) {
      messageToSend = WA_TEMPLATES[type](data);
    }

    if (!phone || !messageToSend) {
      return NextResponse.json(
        { success: false, error: "Parameter 'phone' dan template 'data' atau 'rawMessage' wajib disediakan" },
        { status: 400 }
      );
    }

    const result = await sendWhatsAppMessage({ phone, message: messageToSend });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("POST /api/whatsapp/send error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
