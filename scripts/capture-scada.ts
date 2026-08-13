import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());
  const { captureScadaHistory } = await import("../lib/scada-capture");
  console.log("Starting hourly SCADA capture...");
  const result = await captureScadaHistory();
  console.log(`Captured ${result.captured} SCADA readings; deleted ${result.deleted} expired SCADA readings.`);

  if (result.failed.length > 0) {
    console.warn("Some SCADA mappings could not be captured:", result.failed);
  }
}

main().catch((error: unknown) => {
  console.error("SCADA capture failed:", error);
  process.exit(1);
});
