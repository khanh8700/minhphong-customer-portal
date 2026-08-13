import { cleanupExpiredAuditLogs } from "../lib/audit";
import { createPortalAdminClient } from "../lib/supabase/admin";

async function main() {
  const deleted = await cleanupExpiredAuditLogs(createPortalAdminClient());
  console.log(`Deleted ${deleted} audit logs older than 180 days.`);
}

main().catch((error: unknown) => {
  console.error("Audit log cleanup failed:", error);
  process.exit(1);
});
