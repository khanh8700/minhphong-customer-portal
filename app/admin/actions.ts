"use server";

import { revalidatePath } from "next/cache";
export async function searchCustomersAction(query: string) {
  await requireAdminSession();
  if (!query || query.trim().length < 2) return [];
  
  const supabase = createPortalAdminClient();
  const { data } = await supabase
    .from("customers")
    .select("customer_code, full_name, address")
    .ilike("customer_code", `%${query.trim()}%`)
    .limit(10);
    
  return data || [];
}
import { createPortalAdminClient } from "@/lib/supabase/admin";
import { ADMIN_ROLES, requireAdminRole, requireAdminSession, type AdminRole } from "@/lib/admin-session";
import { fetchScadaData, type ScadaResponse } from "@/lib/scada";
import { getScadaDailyProduction, type ScadaDailyProduction } from "@/lib/scada-history";
import { deleteAuditLogsOlderThan } from "@/lib/audit";
import { logAudit } from "@/lib/audit";
import { encryptSecret, decryptSecret } from "@/lib/secret";
import { getTelegramAlertConfig } from "@/lib/scada-operations";
import { sendTelegramMessage } from "@/lib/telegram";

export type AdminScadaDetailsResult =
  | { success: true; customerCode: string; data: ScadaResponse }
  | { success: false; error: string };

export type AdminScadaHistoryResult =
  | { success: true; customerCode: string; data: ScadaDailyProduction[] }
  | { success: false; error: string };

export async function addScadaMapping(formData: FormData) {
  const admin = await requireAdminRole(["system_admin", "scada_operator"]);
  const customerCode = formData.get("customerCode")?.toString().trim();
  const apiUrl = formData.get("apiUrl")?.toString().trim();

  if (!customerCode || !apiUrl) {
    return;
  }

  const supabase = createPortalAdminClient();
  const { error } = await supabase.from("scada_mappings").upsert({
    customer_code: customerCode.toUpperCase(),
    api_url: apiUrl,
  }, { onConflict: 'customer_code' });

  if (error) {
    console.error(error);
    return;
  }
  await logAudit(supabase, { action: "admin_add_scada_mapping", metadata: { customer_code: customerCode.toUpperCase(), admin: admin.email } });

  revalidatePath("/admin");
}

export async function updateScadaMapping(formData: FormData) {
  const admin = await requireAdminRole(["system_admin", "scada_operator"]);
  const customerCode = formData.get("customerCode")?.toString().trim();
  const apiUrl = formData.get("apiUrl")?.toString().trim();

  if (!customerCode || !apiUrl) {
    return;
  }

  const supabase = createPortalAdminClient();
  const { error } = await supabase
    .from("scada_mappings")
    .update({ api_url: apiUrl })
    .eq("customer_code", customerCode.toUpperCase());

  if (error) {
    console.error(error);
    return;
  }
  await logAudit(supabase, { action: "admin_update_scada_mapping", metadata: { customer_code: customerCode.toUpperCase(), admin: admin.email } });

  revalidatePath("/admin");
}

export async function deleteScadaMapping(id: string) {
  const admin = await requireAdminRole(["system_admin", "scada_operator"]);
  const supabase = createPortalAdminClient();
  await supabase.from("scada_mappings").delete().eq("id", id);
  await logAudit(supabase, { action: "admin_delete_scada_mapping", metadata: { mapping_id: id, admin: admin.email } });
  revalidatePath("/admin");
}

export async function toggleCustomerAuth(customerCode: string, canChange: boolean) {
  const admin = await requireAdminRole(["system_admin"]);
  const supabase = createPortalAdminClient();
  
  // Upsert customer auth
  const { error } = await supabase.from("customer_auth").upsert({
    customer_code: customerCode,
    can_change_password: canChange,
  }, { onConflict: "customer_code" });

  if (error) {
    console.error(error);
  }
  await logAudit(supabase, { action: "admin_update_customer_auth", metadata: { customer_code: customerCode, can_change_password: canChange, admin: admin.email } });

  revalidatePath("/admin");
}

export async function resetCustomerPassword(customerCode: string) {
  const admin = await requireAdminRole(["system_admin"]);
  const supabase = createPortalAdminClient();
  
  await supabase.from("customer_auth").update({
    hashed_password: null,
  }).eq("customer_code", customerCode);
  await logAudit(supabase, { action: "admin_reset_customer_password", metadata: { customer_code: customerCode, admin: admin.email } });

  revalidatePath("/admin");
}

export async function deleteCustomerAuth(customerCode: string) {
  const admin = await requireAdminRole(["system_admin"]);
  const supabase = createPortalAdminClient();
  await supabase.from("customer_auth").delete().eq("customer_code", customerCode);
  await logAudit(supabase, { action: "admin_delete_customer_auth", metadata: { customer_code: customerCode, admin: admin.email } });
  revalidatePath("/admin");
}

export async function testScadaApi(apiUrl: string) {
  await requireAdminRole(["system_admin", "scada_operator"]);
  try {
    const data = await fetchScadaData(apiUrl);
    if (!data) return { error: "Không nhận được dữ liệu hợp lệ từ SCADA" };
    return { success: true, data };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Lỗi kết nối API" };
  }
}

export async function getScadaDetails(mappingId: string): Promise<AdminScadaDetailsResult> {
  await requireAdminRole(["system_admin", "scada_operator", "viewer"]);

  if (!mappingId) {
    return { success: false, error: "Không xác định được mapping SCADA." };
  }

  const supabase = createPortalAdminClient();
  const { data: mapping, error: mappingError } = await supabase
    .from("scada_mappings")
    .select("customer_code, api_url")
    .eq("id", mappingId)
    .maybeSingle();

  if (mappingError || !mapping) {
    return { success: false, error: "Không tìm thấy mapping SCADA của khách hàng." };
  }

  try {
    const data = await fetchScadaData(mapping.api_url);
    if (!data) {
      return { success: false, error: "Không thể lấy thông số hiện tại từ đồng hồ điện từ." };
    }

    return { success: true, customerCode: mapping.customer_code, data };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi kết nối hệ thống SCADA.",
    };
  }
}

export async function getScadaDailyProductionForAdmin(mappingId: string): Promise<AdminScadaHistoryResult> {
  await requireAdminRole(["system_admin", "scada_operator", "viewer"]);

  const supabase = createPortalAdminClient();
  const { data: mapping, error } = await supabase
    .from("scada_mappings")
    .select("customer_code")
    .eq("id", mappingId)
    .maybeSingle();

  if (error || !mapping) {
    return { success: false, error: "Không tìm thấy mapping SCADA của khách hàng." };
  }

  try {
    const data = await getScadaDailyProduction(mapping.customer_code, supabase);
    return { success: true, customerCode: mapping.customer_code, data };
  } catch (historyError: unknown) {
    return {
      success: false,
      error: historyError instanceof Error ? historyError.message : "Không thể tải lịch sử SCADA.",
    };
  }
}

export async function updateSystemSetting(key: string, value: unknown) {
  const admin = await requireAdminRole(["system_admin"]);
  const supabase = createPortalAdminClient();
  const { error } = await supabase.from("system_settings").upsert({
    key: key,
    value: value,
    updated_at: new Date().toISOString()
  }, { onConflict: "key" });

  if (error) {
    console.error(error);
  }
  await logAudit(supabase, { action: "admin_update_setting", metadata: { key, admin: admin.email } });

  revalidatePath("/admin");
}

export async function deleteAuditLogs(mode: "all" | "keep_90_days") {
  const admin = await requireAdminRole(["system_admin"]);
  const supabase = createPortalAdminClient();

  const { error } = mode === "all"
    ? await supabase.from("audit_logs").delete()
    : { error: null };

  if (error) {
    throw new Error(error.message);
  }

  if (mode === "keep_90_days") {
    await deleteAuditLogsOlderThan(supabase, 90);
  }

  await logAudit(supabase, { action: "admin_delete_audit_logs", metadata: { mode, admin: admin.email } });

  revalidatePath("/admin");
}

export async function saveTelegramSettings(formData: FormData) {
  const admin = await requireAdminRole(["system_admin"]);
  const supabase = createPortalAdminClient();
  const current = await getTelegramAlertConfig(supabase);
  const token = formData.get("botToken")?.toString().trim();
  const chatId = formData.get("chatId")?.toString().trim() ?? "";
  const enabled = formData.get("enabled") === "on";
  const alertTypes = {
    scada_offline: formData.get("alert_scada_offline") === "on",
    scada_stale: formData.get("alert_scada_stale") === "on",
    battery_low: formData.get("alert_battery_low") === "on",
    usage_anomaly: formData.get("alert_usage_anomaly") === "on",
  };
  const botTokenEncrypted = token ? encryptSecret(token) : current.bot_token_encrypted;

  const { error } = await supabase.from("system_settings").upsert({
    key: "telegram_alert_config",
    value: { enabled, chat_id: chatId, bot_token_encrypted: botTokenEncrypted, alert_types: alertTypes },
    updated_at: new Date().toISOString(),
  }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  await logAudit(supabase, { action: "admin_update_telegram", metadata: { enabled, chat_id: chatId, admin: admin.email } });
  revalidatePath("/admin");
}

export async function testTelegramSettings(): Promise<{ success: boolean; message: string }> {
  await requireAdminRole(["system_admin"]);
  const supabase = createPortalAdminClient();
  const config = await getTelegramAlertConfig(supabase);
  const token = decryptSecret(config.bot_token_encrypted);
  if (!token) return { success: false, message: "Chưa có Bot Token Telegram hợp lệ." };
  const result = await sendTelegramMessage(token, config.chat_id, "✅ Kết nối Telegram thành công. Hệ thống Customer Portal đã sẵn sàng gửi cảnh báo.");
  return result.ok ? { success: true, message: "Đã gửi tin nhắn thử đến Telegram." } : { success: false, message: result.error };
}

export async function saveAdminUser(formData: FormData) {
  const admin = await requireAdminRole(["system_admin"]);
  const email = formData.get("email")?.toString().trim().toLowerCase();
  const role = formData.get("role")?.toString() as AdminRole;
  if (!email || !ADMIN_ROLES.includes(role)) throw new Error("Thông tin tài khoản quản trị không hợp lệ.");
  const supabase = createPortalAdminClient();
  const { error } = await supabase.from("admin_users").upsert({ email, role, is_active: true, updated_at: new Date().toISOString() }, { onConflict: "email" });
  if (error) throw new Error(error.message);
  await logAudit(supabase, { action: "admin_save_admin_user", metadata: { email, role, admin: admin.email } });
  revalidatePath("/admin");
}

export async function toggleAdminUser(id: string, isActive: boolean) {
  const admin = await requireAdminRole(["system_admin"]);
  const supabase = createPortalAdminClient();
  const { error } = await supabase.from("admin_users").update({ is_active: isActive, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  await logAudit(supabase, { action: "admin_toggle_admin_user", metadata: { admin_user_id: id, is_active: isActive, admin: admin.email } });
  revalidatePath("/admin");
}

export async function acknowledgeSystemAlert(id: string) {
  const admin = await requireAdminRole(["system_admin", "scada_operator"]);
  const supabase = createPortalAdminClient();
  const { error } = await supabase.from("system_alerts").update({ status: "acknowledged", updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  await logAudit(supabase, { action: "admin_acknowledge_alert", metadata: { alert_id: id, admin: admin.email } });
  revalidatePath("/admin");
}
