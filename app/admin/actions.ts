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
    const scadaModule = await import("@/lib/scada");
    const data = await scadaModule.fetchScadaData(apiUrl);
    if (!data) return { error: "Không nhận được dữ liệu hợp lệ từ SCADA" };
    return { success: true, data };
  } catch (error: any) {
    return { error: error.message || "Lỗi kết nối API" };
  }
}

export async function updateSystemSetting(key: string, value: any) {
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
