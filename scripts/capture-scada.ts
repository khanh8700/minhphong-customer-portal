import { captureScadaHistory } from "../lib/scada-capture";

async function main() {
  console.log("Starting hourly SCADA capture...");
  const result = await captureScadaHistory();
  console.log(`Captured ${result.captured} SCADA readings; deleted ${result.deleted} expired readings.`);

  if (result.failed.length > 0) {
    console.warn("Some SCADA mappings could not be captured:", result.failed);
  }
}

main().catch((error: unknown) => {
  console.error("SCADA capture failed:", error);
  process.exit(1);
});
