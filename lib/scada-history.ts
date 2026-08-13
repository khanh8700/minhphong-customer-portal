import type { SupabaseClient } from "@supabase/supabase-js";
import { createPortalAdminClient } from "@/lib/supabase/admin";
import type { ScadaResponse } from "@/lib/scada";

const RETENTION_MONTHS = 3;

export type ScadaHourlyReading = {
  captured_at: string;
  forward_flow_total: number | null;
};

export type ScadaDailyProduction = {
  date: string;
  label: string;
  production: number | null;
  samples: number;
};

type ScadaHourlyReadingRow = {
  captured_at: string;
  forward_flow_total: number | string | null;
};

export function getScadaHistoryStartDate(now = new Date()): Date {
  const start = new Date(now);
  start.setMonth(start.getMonth() - RETENTION_MONTHS);
  return start;
}

export function getHourlyCaptureTime(now = new Date()): Date {
  const capturedAt = new Date(now);
  capturedAt.setUTCMinutes(0, 0, 0);
  return capturedAt;
}

export function buildScadaHourlyReading(customerCode: string, data: ScadaResponse, capturedAt = new Date()) {
  return {
    customer_code: customerCode,
    captured_at: getHourlyCaptureTime(capturedAt).toISOString(),
    source_time: data.thoi_gian || null,
    device_name: data.name || null,
    forward_flow_total: numberOrNull(data.Forward_flow_total),
    reverse_flow_total: numberOrNull(data.Reverse_flow_total),
    net_flow_total: numberOrNull(data.Net_flow_total),
    flow_rate: numberOrNull(data.Flow_rate),
    velocity: numberOrNull(data.Velocity),
    internal_battery: numberOrNull(data.Internal_battery),
    external_battery: numberOrNull(data.External_battery),
  };
}

export function toDailyProduction(readings: ScadaHourlyReading[]): ScadaDailyProduction[] {
  const days = new Map<string, number[]>();

  for (const reading of readings) {
    if (reading.forward_flow_total === null || !Number.isFinite(reading.forward_flow_total)) continue;

    const key = vietnamDateKey(reading.captured_at);
    const totals = days.get(key) ?? [];
    totals.push(reading.forward_flow_total);
    days.set(key, totals);
  }

  return [...days.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([date, totals]) => {
      const first = totals[0];
      const last = totals[totals.length - 1];
      const production = totals.length >= 2 && last >= first ? last - first : null;

      return {
        date,
        label: formatVietnamDateLabel(date),
        production: production === null ? null : roundToThreeDecimals(production),
        samples: totals.length,
      };
    });
}

export async function getScadaDailyProduction(
  customerCode: string,
  supabase: SupabaseClient = createPortalAdminClient(),
): Promise<ScadaDailyProduction[]> {
  const { data, error } = await supabase
    .from("scada_hourly_readings")
    .select("captured_at, forward_flow_total")
    .eq("customer_code", customerCode)
    .gte("captured_at", getScadaHistoryStartDate().toISOString())
    .order("captured_at", { ascending: true });

  if (error) throw new Error(error.message);

  const readings = (data ?? []).map((row: ScadaHourlyReadingRow) => ({
    captured_at: row.captured_at,
    forward_flow_total: numberOrNull(row.forward_flow_total),
  }));

  return toDailyProduction(readings);
}

function vietnamDateKey(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatVietnamDateLabel(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

function numberOrNull(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundToThreeDecimals(value: number): number {
  return Math.round(value * 1000) / 1000;
}
