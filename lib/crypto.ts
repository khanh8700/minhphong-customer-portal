import crypto from "node:crypto";
import { requireEnv } from "@/lib/env";

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function signValue(value: string, secret = requireEnv("SESSION_SECRET")): string {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function verifySignature(value: string, signature: string, secret = requireEnv("SESSION_SECRET")): boolean {
  const expected = signValue(value, secret);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return sha256(ip);
}

