import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());
  const [{ cleanupExpiredAuditLogs }, { createPortalAdminClient }] = await Promise.all([
    import("../lib/audit"),
    import("../lib/supabase/admin"),
  ]);
  const deleted = await cleanupExpiredAuditLogs(createPortalAdminClient());
  console.log(`Deleted ${deleted} audit logs older than 180 days.`);
}

main().catch((error: unknown) => {
  console.error("Audit log cleanup failed:", error);
  process.exit(1);
});
