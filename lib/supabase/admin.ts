import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

let portalClient: SupabaseClient | null = null;
let erpClient: SupabaseClient | null = null;

export function createPortalAdminClient(): SupabaseClient {
  if (!portalClient) {
    portalClient = createClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
  }
  return portalClient;
}

export function createErpReadClient(): SupabaseClient {
  if (!erpClient) {
    erpClient = createClient(
      requireEnv("ERP_SUPABASE_URL"),
      requireEnv("ERP_SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
  }
  return erpClient;
}

