import type { SupabaseClient } from "@supabase/supabase-js";

export const AUDIT_LOG_RETENTION_DAYS = 180;

type AuditInput = {
  customerId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
  ipHash?: string | null;
  userAgent?: string | null;
};

export async function logAudit(supabase: SupabaseClient, input: AuditInput): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    customer_id: input.customerId ?? null,
    action: input.action,
    metadata: input.metadata ?? {},
    ip_hash: input.ipHash ?? null,
    user_agent: input.userAgent ?? null
  });

  if (error) {
    console.warn("[audit] failed to write audit log", error.message);
  }
}

export async function deleteAuditLogsOlderThan(
  supabase: SupabaseClient,
  days: number,
): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const { count, error } = await supabase
    .from("audit_logs")
    .delete({ count: "exact" })
    .lt("created_at", cutoff.toISOString());

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function cleanupExpiredAuditLogs(supabase: SupabaseClient): Promise<number> {
  return deleteAuditLogsOlderThan(supabase, AUDIT_LOG_RETENTION_DAYS);
}
