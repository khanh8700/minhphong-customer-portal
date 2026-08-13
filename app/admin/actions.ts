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
import { requireAdminSession } from "@/lib/admin-session";
import { fetchScadaData, type ScadaResponse } from "@/lib/scada";
import { getScadaDailyProduction, type ScadaDailyProduction } from "@/lib/scada-history";

export type AdminScadaDetailsResult =
  | { success: true; customerCode: string; data: ScadaResponse }
  | { success: false; error: string };

export type AdminScadaHistoryResult =
  | { success: true; customerCode: string; data: ScadaDailyProduction[] }
  | { success: false; error: string };

export async function addScadaMapping(formData: FormData) {
  await requireAdminSession();
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

  revalidatePath("/admin");
}

export async function updateScadaMapping(formData: FormData) {
  await requireAdminSession();
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

  revalidatePath("/admin");
}

export async function deleteScadaMapping(id: string) {
  await requireAdminSession();
  const supabase = createPortalAdminClient();
  await supabase.from("scada_mappings").delete().eq("id", id);
  revalidatePath("/admin");
}

export async function toggleCustomerAuth(customerCode: string, canChange: boolean) {
  await requireAdminSession();
  const supabase = createPortalAdminClient();
  
  // Upsert customer auth
  const { error } = await supabase.from("customer_auth").upsert({
    customer_code: customerCode,
    can_change_password: canChange,
  }, { onConflict: "customer_code" });

  if (error) {
    console.error(error);
  }

  revalidatePath("/admin");
}

export async function resetCustomerPassword(customerCode: string) {
  await requireAdminSession();
  const supabase = createPortalAdminClient();
  
  await supabase.from("customer_auth").update({
    hashed_password: null,
  }).eq("customer_code", customerCode);

  revalidatePath("/admin");
}

export async function deleteCustomerAuth(customerCode: string) {
  await requireAdminSession();
  const supabase = createPortalAdminClient();
  await supabase.from("customer_auth").delete().eq("customer_code", customerCode);
  revalidatePath("/admin");
}

export async function testScadaApi(apiUrl: string) {
  await requireAdminSession();
  try {
    const data = await fetchScadaData(apiUrl);
    if (!data) return { error: "Không nhận được dữ liệu hợp lệ từ SCADA" };
    return { success: true, data };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "Lỗi kết nối API" };
  }
}

export async function getScadaDetails(mappingId: string): Promise<AdminScadaDetailsResult> {
  await requireAdminSession();

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
  await requireAdminSession();

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
  await requireAdminSession();
  const supabase = createPortalAdminClient();
  const { error } = await supabase.from("system_settings").upsert({
    key: key,
    value: value,
    updated_at: new Date().toISOString()
  }, { onConflict: "key" });

  if (error) {
    console.error(error);
  }

  revalidatePath("/admin");
}
