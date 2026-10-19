/**
 * Payment helper — Midtrans Snap + mock fallback
 * ENV: MIDTRANS_SERVER_KEY, MIDTRANS_CLIENT_KEY, MIDTRANS_IS_PRODUCTION
 */
import crypto from "node:crypto";


const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";
const SERVER_KEY    = process.env.MIDTRANS_SERVER_KEY || "";
const MOCK_MODE     = !SERVER_KEY;

const MIDTRANS_BASE = IS_PRODUCTION
  ? "https://app.midtrans.com/snap/v1"
  : "https://app.sandbox.midtrans.com/snap/v1";

export const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || "SB-Mid-client-xxxx";

// Generate invoice number
export function generateInvoiceNumber() {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
  const rand = Math.random().toString(36).substring(2,7).toUpperCase();
  return `INV-${ymd}-${rand}`;
}

// Create Snap transaction token (Midtrans)
export async function createSnapToken({ orderId, amount, customerName, customerEmail, courseTitle }) {
  if (MOCK_MODE) {
    return {
      token: `mock-token-${orderId}`,
      redirectUrl: `https://app.sandbox.midtrans.com/snap/v2/vtweb/mock-${orderId}`,
      mock: true,
    };
  }

  const auth = Buffer.from(`${SERVER_KEY}:`).toString("base64");
  const res = await fetch(`${MIDTRANS_BASE}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    body: JSON.stringify({
      transaction_details: { order_id: orderId, gross_amount: amount },
      customer_details: { first_name: customerName, email: customerEmail },
      item_details: [{ id: orderId, price: amount, quantity: 1, name: courseTitle.substring(0, 50) }],
      expiry: { unit: "hours", duration: 24 },
    }),
  });

  if (!res.ok) throw new Error(`Midtrans error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return { token: data.token, redirectUrl: data.redirect_url, mock: false };
}

// Verify webhook signature from Midtrans
export function verifyWebhookSignature(orderId, statusCode, grossAmount, serverKey) {
  const key = serverKey || SERVER_KEY;
  const input = `${orderId}${statusCode}${grossAmount}${key}`;
  return crypto.createHash("sha512").update(input).digest("hex");
}

// Map Midtrans transaction status to our status
export function mapMidtransStatus(transactionStatus, fraudStatus) {
  if (transactionStatus === "capture" && fraudStatus === "accept") return "paid";
  if (transactionStatus === "settlement") return "paid";
  if (transactionStatus === "pending") return "pending";
  if (["deny","cancel","expire","failure"].includes(transactionStatus)) return "failed";
  return "pending";
}

// ─────────────────────────────────────────────────────────────────────────────
// MAYAR PAYMENT GATEWAY INTEGRATION (mayar.id)
// ─────────────────────────────────────────────────────────────────────────────
const MAYAR_IS_PRODUCTION = process.env.MAYAR_IS_PRODUCTION === "true";
const MAYAR_API_KEY       = process.env.MAYAR_API_KEY || "";
const MAYAR_MOCK_MODE     = !MAYAR_API_KEY;

const MAYAR_BASE = MAYAR_IS_PRODUCTION
  ? "https://api.mayar.id"
  : "https://api.mayar.io";

export const MAYAR_WEBHOOK_TOKEN = process.env.MAYAR_WEBHOOK_TOKEN || "";

/**
 * Buat payment link / invoice Mayar untuk pembayaran instan
 * (QRIS, VA Bank BCA/Mandiri/BRI/BNI/Permata, GoPay, OVO, ShopeePay, Kartu Kredit)
 */
export async function createMayarPaymentLink({
  orderId,
  amount,
  customerName,
  customerEmail,
  customerPhone,
  courseTitle,
  redirectUrl,
}) {
  if (MAYAR_MOCK_MODE) {
    return {
      id: `mock-mayar-${orderId}`,
      transactionId: `mock-tx-${orderId}`,
      paymentUrl: `https://sandbox.mayar.id/invoices/mock-${orderId}`,
      mock: true,
    };
  }

  const res = await fetch(`${MAYAR_BASE}/hl/v1/invoice/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MAYAR_API_KEY}`,
    },
    body: JSON.stringify({
      name: customerName || "Pelanggan",
      email: customerEmail,
      amount: Math.round(Number(amount)),
      mobile: customerPhone || "081234567890",
      description: (courseTitle || `Pembayaran Pelatihan DIDIKARA (${orderId})`).substring(0, 100),
      redirectUrl: redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL || "https://didikara.vercel.app"}/kelas`,
      expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Mayar error (${res.status}): ${errorText}`);
  }

  const json = await res.json();
  const data = json.data || json;
  return {
    id: data.id || data.invoice_id || `mayar-${orderId}`,
    transactionId: data.transaction_id || data.transactionId || data.id,
    paymentUrl: data.link || data.paymentUrl || data.url || `https://pub.mayar.id/invoices/${data.id}`,
    mock: false,
  };
}

/**
 * Pemetaan status Mayar ke status sistem kita (paid | pending | failed)
 */
export function mapMayarStatus(status, event) {
  const s = String(status || "").toUpperCase();
  const e = String(event || "").toLowerCase();

  if (e === "payment.received" || s === "PAID" || s === "SUCCESS" || s === "SETTLED") {
    return "paid";
  }
  if (s === "PENDING" || s === "UNPAID" || e === "payment.reminder") {
    return "pending";
  }
  if (s === "EXPIRED" || s === "FAILED" || s === "CANCELLED" || s === "CANCELED") {
    return "failed";
  }
  return "pending";
}
