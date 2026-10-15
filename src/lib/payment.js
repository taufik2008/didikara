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
