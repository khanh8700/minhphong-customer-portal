import type { SupabaseClient } from "@supabase/supabase-js";
import { sha256 } from "@/lib/crypto";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: string;
};

export async function hitRateLimit(
  supabase: SupabaseClient,
  keyParts: string[],
  options: { bucket?: string; limit?: number; windowSeconds?: number } = {}
): Promise<RateLimitResult> {
  const bucket = options.bucket ?? "lookup";
  const limit = options.limit ?? 6;
  const windowSeconds = options.windowSeconds ?? 15 * 60;
  const keyHash = sha256(keyParts.join(":"));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000).toISOString();

  const { data: existing, error: selectError } = await supabase
    .from("rate_limits")
    .select("count, expires_at")
    .eq("key_hash", keyHash)
    .eq("bucket", bucket)
    .maybeSingle();

  if (selectError) throw new Error(selectError.message);

  if (!existing || new Date(existing.expires_at as string) <= now) {
    const { error } = await supabase.from("rate_limits").upsert({
      key_hash: keyHash,
      bucket,
      count: 1,
      expires_at: expiresAt,
      updated_at: now.toISOString()
    });
    if (error) throw new Error(error.message);
    return { allowed: true, remaining: limit - 1, resetAt: expiresAt };
  }

  const nextCount = Number(existing.count ?? 0) + 1;
  const { error } = await supabase
    .from("rate_limits")
    .update({ count: nextCount, updated_at: now.toISOString() })
    .eq("key_hash", keyHash)
    .eq("bucket", bucket);
  if (error) throw new Error(error.message);

  return {
    allowed: nextCount <= limit,
    remaining: Math.max(limit - nextCount, 0),
    resetAt: existing.expires_at as string
  };
}

