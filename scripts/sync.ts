import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());
  const { runErpSync } = await import("../lib/sync/run");
  console.log("Starting ERP Data Sync...");
  // You can pass --full to force a full sync
  const full = process.argv.includes("--full");
  
  try {
    const result = await runErpSync({ full });
    console.log("Sync completed successfully!");
    console.log("Run ID:", result.runId);
    console.log("Stats:", result.stats);
    process.exit(0);
  } catch (error) {
    console.error("Sync failed:");
    console.error(error);
    process.exit(1);
  }
}

main();
