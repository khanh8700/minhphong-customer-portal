import type { SupabaseClient } from "@supabase/supabase-js";

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

