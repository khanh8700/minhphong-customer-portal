import crypto from "node:crypto";
import { requireEnv } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";

function encryptionKey(): Buffer {
  return crypto.createHash("sha256").update(requireEnv("SESSION_SECRET")).digest();
}

export function encryptSecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptSecret(value: string): string | null {
  try {
    const payload = Buffer.from(value, "base64url");
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function maskSecret(value: string | null | undefined): string {
  if (!value) return "Chưa cấu hình";
  return value.length <= 8 ? "Đã cấu hình" : `${value.slice(0, 4)}••••${value.slice(-4)}`;
}
