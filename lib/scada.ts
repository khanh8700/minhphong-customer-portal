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
