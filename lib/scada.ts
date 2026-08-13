import { requireEnv } from "@/lib/env";

export interface ScadaResponse {
  thoi_gian: string;
  Forward_flow_total: number;
  Reverse_flow_total: number;
  Net_flow_total: number;
  Flow_rate: number;
  Velocity: number;
  External_battery: number;
  Internal_battery: number;
  name: string;
}

export const SCADA_STALE_AFTER_MINUTES = 120;

export function parseScadaTimestamp(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;

  const normalized = value.trim();
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(normalized)) {
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const match = normalized.match(
    /^(?:(\d{4})-(\d{2})-(\d{2})|(\d{2})\/(\d{2})\/(\d{4}))[ T](\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match) return null;

  const year = Number(match[1] ?? match[6]);
  const month = Number(match[2] ?? match[5]);
  const day = Number(match[3] ?? match[4]);
  const hour = Number(match[7]);
  const minute = Number(match[8]);
  const second = Number(match[9] ?? 0);
  const parsed = new Date(Date.UTC(year, month - 1, day, hour - 7, minute, second));

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getScadaDataDelayMinutes(
  timestamp: string | null | undefined,
  now = new Date(),
): number | null {
  const updatedAt = parseScadaTimestamp(timestamp);
  if (!updatedAt) return null;

  const delay = Math.floor((now.getTime() - updatedAt.getTime()) / 60_000);
  return delay >= 0 ? delay : null;
}

export function isScadaDataStale(delayMinutes: number | null | undefined): boolean {
  return delayMinutes !== null
    && delayMinutes !== undefined
    && delayMinutes > SCADA_STALE_AFTER_MINUTES;
}

export function formatScadaDelay(delayMinutes: number): string {
  if (delayMinutes < 60) return `${delayMinutes} phút`;

  const hours = Math.floor(delayMinutes / 60);
  const minutes = delayMinutes % 60;
  return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
}

export async function fetchScadaData(apiUrl: string): Promise<ScadaResponse | null> {
  const apiKey = requireEnv("SCADA_API_KEY");
  
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ key: apiKey }),
      cache: 'no-store'
    });

    if (!res.ok) {
      console.error(`SCADA API returned status ${res.status}: ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    if (data.error) {
      console.error(`SCADA API error: ${data.error}`);
      return null;
    }

    return data as ScadaResponse;
  } catch (error) {
    console.error("Failed to fetch SCADA data:", error);
    return null;
  }
}
