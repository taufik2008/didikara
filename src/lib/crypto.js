import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(customKey) {
  const rawKey = customKey || process.env.ENCRYPTION_KEY || "";
  if (!rawKey) return null;
  return crypto.createHash("sha256").update(rawKey).digest();
}

export function encryptValue(text, customKey) {
  if (!text || typeof text !== "string") return text;
  const key = getKey(customKey);
  if (!key) return text; // fallback jika key belum dikonfigurasi

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `enc:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptValue(text, customKey) {
  if (!text || typeof text !== "string" || !text.startsWith("enc:")) return text;
  const key = getKey(customKey);
  if (!key) return text;

  try {
    const parts = text.split(":");
    if (parts.length !== 4) return text;
    const [, ivHex, tagHex, dataHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(dataHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.warn("Gagal mendekripsi kredensial:", err.message);
    return text;
  }
}

export function maskSensitiveValue(text) {
  if (!text) return "";
  return "••••••••";
}

export const SENSITIVE_SETTING_KEYS = [
  "smtp_pass",
  "google_service_account_json",
  "s3_access_key_id",
  "s3_secret_access_key",
];
