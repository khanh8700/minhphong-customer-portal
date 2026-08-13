import { describe, expect, it } from "vitest";
import {
  SCADA_STALE_AFTER_MINUTES,
  getScadaDataDelayMinutes,
  isScadaDataStale,
  parseScadaTimestamp,
} from "@/lib/scada";

describe("SCADA timestamp freshness", () => {
  it("parses SCADA timestamps as Vietnam time", () => {
    expect(parseScadaTimestamp("2026-08-13 10:30:00")?.toISOString())
      .toBe("2026-08-13T03:30:00.000Z");
  });

  it("warns only when the SCADA reading is more than 120 minutes behind", () => {
    const now = new Date("2026-08-13T06:31:00.000Z");
    const staleDelay = getScadaDataDelayMinutes("2026-08-13 10:30:00", now);
    const currentDelay = getScadaDataDelayMinutes("2026-08-13 11:30:00", now);

    expect(staleDelay).toBe(181);
    expect(isScadaDataStale(staleDelay)).toBe(true);
    expect(currentDelay).toBe(121);
    expect(isScadaDataStale(currentDelay)).toBe(true);
    expect(isScadaDataStale(SCADA_STALE_AFTER_MINUTES)).toBe(false);
  });
});
