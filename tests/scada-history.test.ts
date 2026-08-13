import { describe, expect, it } from "vitest";
import { getHourlyCaptureTime, toDailyProduction } from "@/lib/scada-history";

describe("SCADA history", () => {
  it("rounds captures to the scheduled hour", () => {
    expect(getHourlyCaptureTime(new Date("2026-08-13T10:48:12.400Z")).toISOString())
      .toBe("2026-08-13T10:00:00.000Z");
  });

  it("calculates daily production from the first and final index", () => {
    const result = toDailyProduction([
      { captured_at: "2026-08-12T17:15:00.000Z", forward_flow_total: 120.25 },
      { captured_at: "2026-08-12T21:15:00.000Z", forward_flow_total: 123.5 },
      { captured_at: "2026-08-13T01:15:00.000Z", forward_flow_total: 124.75 },
      { captured_at: "2026-08-13T10:15:00.000Z", forward_flow_total: 130 },
    ]);

    expect(result).toEqual([
      { date: "2026-08-13", label: "13/08", production: 9.75, samples: 4 },
    ]);
  });

  it("does not report negative production after a meter reset", () => {
    const result = toDailyProduction([
      { captured_at: "2026-08-13T00:00:00.000Z", forward_flow_total: 100 },
      { captured_at: "2026-08-13T01:00:00.000Z", forward_flow_total: 10 },
    ]);

    expect(result[0]?.production).toBeNull();
  });
});
