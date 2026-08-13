import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret } from "@/lib/secret";
import { getScadaDataDelayMinutes, type ScadaResponse } from "@/lib/scada";
import { getScadaDailyProduction } from "@/lib/scada-history";
import { sendTelegramMessage } from "@/lib/telegram";

export type ScadaAlertThresholds = {
  stale_minutes: number;
  battery_voltage: number;
  anomaly_multiplier: number;
  notification_cooldown_minutes: number;
};

export type TelegramAlertConfig = {
  enabled: boolean;
  chat_id: string;
  bot_token_encrypted: string;
  alert_types: Record<string, boolean>;
};

const defaultThresholds: ScadaAlertThresholds = {
  stale_minutes: 120,
  battery_voltage: 3.3,
  anomaly_multiplier: 2,
  notification_cooldown_minutes: 360,
};

const defaultTelegramConfig: TelegramAlertConfig = {
  enabled: false,
  chat_id: "",
  bot_token_encrypted: "",
  alert_types: { scada_offline: true, scada_stale: true, battery_low: true, usage_anomaly: true },
};

export async function getScadaAlertThresholds(supabase: SupabaseClient): Promise<ScadaAlertThresholds> {
  const { data } = await supabase.from("system_settings").select("value").eq("key", "scada_alert_thresholds").maybeSingle();
  return { ...defaultThresholds, ...(asRecord(data?.value) ?? {}) } as ScadaAlertThresholds;
}

export async function getTelegramAlertConfig(supabase: SupabaseClient): Promise<TelegramAlertConfig> {
  const { data } = await supabase.from("system_settings").select("value").eq("key", "telegram_alert_config").maybeSingle();
  const value = asRecord(data?.value) ?? {};
  return {
    ...defaultTelegramConfig,
    ...value,
    alert_types: { ...defaultTelegramConfig.alert_types, ...(asRecord(value.alert_types) ?? {}) },
  } as TelegramAlertConfig;
}

export async function recordScadaStatus(input: {
  supabase: SupabaseClient;
  customerCode: string;
  data?: ScadaResponse | null;
  error?: string | null;
}): Promise<void> {
  const { supabase, customerCode, data, error } = input;
  const thresholds = await getScadaAlertThresholds(supabase);
  const delay = data ? getScadaDataDelayMinutes(data.thoi_gian) : null;
  const lowBattery = data && [data.Internal_battery, data.External_battery].some((value) => Number(value) < thresholds.battery_voltage);
  const stale = delay !== null && delay > thresholds.stale_minutes;
  const status = error || !data ? "offline" : lowBattery ? "warning" : stale ? "stale" : "online";

  await supabase.from("scada_device_statuses").upsert({
    customer_code: customerCode,
    status,
    last_checked_at: new Date().toISOString(),
    last_source_at: data ? sourceTimestamp(data.thoi_gian) : null,
    last_success_at: data ? new Date().toISOString() : null,
    last_error: error ?? null,
    internal_battery: data?.Internal_battery ?? null,
    external_battery: data?.External_battery ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "customer_code" });

  await syncAlert(supabase, customerCode, "scada_offline", !data || Boolean(error), {
    severity: "critical",
    title: "Không thể kết nối SCADA",
    message: error ?? "Thiết bị không trả dữ liệu hợp lệ.",
  });
  await syncAlert(supabase, customerCode, "scada_stale", Boolean(data && stale), {
    severity: "warning",
    title: "Dữ liệu SCADA cập nhật chậm",
    message: `Dữ liệu SCADA chậm ${delay ?? 0} phút, vượt ngưỡng ${thresholds.stale_minutes} phút.`,
    metadata: { delay_minutes: delay, threshold_minutes: thresholds.stale_minutes },
  });
  await syncAlert(supabase, customerCode, "battery_low", Boolean(lowBattery), {
    severity: "warning",
    title: "Điện áp pin đồng hồ thấp",
    message: `Pin trong: ${data?.Internal_battery ?? "—"}V · Pin ngoài: ${data?.External_battery ?? "—"}V.`,
    metadata: { internal_battery: data?.Internal_battery, external_battery: data?.External_battery, threshold_voltage: thresholds.battery_voltage },
  });
}

export async function detectUsageAnomaly(supabase: SupabaseClient, customerCode: string): Promise<void> {
  const thresholds = await getScadaAlertThresholds(supabase);
  const days = await getScadaDailyProduction(customerCode, supabase);
  const current = [...days].reverse().find((day) => day.production !== null);
  const prior = days.filter((day) => day.production !== null && day.date !== current?.date).slice(-7);
  const average = prior.length ? prior.reduce((sum, day) => sum + (day.production ?? 0), 0) / prior.length : 0;
  const anomalous = Boolean(current?.production && prior.length >= 3 && average > 0 && current.production >= average * thresholds.anomaly_multiplier);

  await syncAlert(supabase, customerCode, "usage_anomaly", anomalous, {
    severity: "warning",
    title: "Sản lượng sử dụng bất thường",
    message: `Sản lượng ${current?.label ?? "hôm nay"} là ${current?.production ?? 0} m³, cao hơn ${thresholds.anomaly_multiplier} lần mức trung bình 7 ngày (${Math.round(average * 100) / 100} m³).`,
    metadata: { date: current?.date, production: current?.production, average, multiplier: thresholds.anomaly_multiplier },
  });
}

export async function syncAlert(
  supabase: SupabaseClient,
  customerCode: string,
  type: string,
  active: boolean,
  content: { severity: "info" | "warning" | "critical"; title: string; message: string; metadata?: Record<string, unknown> },
): Promise<void> {
  const { data: existing } = await supabase
    .from("system_alerts")
    .select("id, status, last_notified_at")
    .eq("customer_code", customerCode)
    .eq("type", type)
    .maybeSingle();

  if (!active) {
    if (existing && existing.status !== "resolved") {
      await supabase.from("system_alerts").update({ status: "resolved", resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", existing.id);
    }
    return;
  }

  const now = new Date();
  const isNew = !existing || existing.status === "resolved";
  const alert = existing
    ? await supabase.from("system_alerts").update({ ...content, status: "open", last_detected_at: now.toISOString(), resolved_at: null, updated_at: now.toISOString() }).eq("id", existing.id).select("id, last_notified_at").single()
    : await supabase.from("system_alerts").insert({ customer_code: customerCode, type, ...content, status: "open" }).select("id, last_notified_at").single();
  if (alert.error || !alert.data) return;

  const thresholds = await getScadaAlertThresholds(supabase);
  const lastNotified = alert.data.last_notified_at ? new Date(alert.data.last_notified_at) : null;
  const cooldownElapsed = !lastNotified || now.getTime() - lastNotified.getTime() >= thresholds.notification_cooldown_minutes * 60_000;
  if (isNew || cooldownElapsed) await notifyTelegram(supabase, alert.data.id, customerCode, type, content);
}

async function notifyTelegram(supabase: SupabaseClient, alertId: string, customerCode: string, type: string, content: { severity: string; title: string; message: string }) {
  const config = await getTelegramAlertConfig(supabase);
  if (!config.enabled || !config.alert_types[type]) return;
  const token = decryptSecret(config.bot_token_encrypted);
  if (!token) return;

  const result = await sendTelegramMessage(token, config.chat_id, `⚠️ ${content.title}\nKhách hàng: ${customerCode}\nMức độ: ${content.severity}\n${content.message}`);
  if (result.ok) await supabase.from("system_alerts").update({ last_notified_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", alertId);
}

function sourceTimestamp(value: string): string | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]) - 7, Number(match[5]), Number(match[6] ?? 0))).toISOString();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
