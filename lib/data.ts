import type { SupabaseClient } from "@supabase/supabase-js";
import { createPortalAdminClient } from "@/lib/supabase/admin";
import type { Bill, CustomerSummary, DebtSnapshot, MeterReading, Payment, PortalContract } from "@/lib/types";
import { getSystemSetting } from "@/lib/settings";

export async function getCustomerSummary(customerId: string, supabase = createPortalAdminClient()): Promise<CustomerSummary | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("id, customer_code, full_name, address, phone_masked, email, contract_id, area_name, route_name, status_bool, credit_balance, current_meter_id")
    .eq("id", customerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as any;
  let meter: CustomerSummary["meter"] = null;
  if (row.current_meter_id) {
    const { data: meterRow } = await supabase
      .from("meters")
      .select("meter_code, meter_size, meter_class")
      .eq("id", row.current_meter_id)
      .maybeSingle();
    meter = meterRow as CustomerSummary["meter"];
  }

  return {
    id: row.id,
    customer_code: row.customer_code,
    full_name: row.full_name,
    address: row.address,
    phone_masked: row.phone_masked,
    email: row.email ?? null,
    contract_id: row.contract_id ?? null,
    area_name: row.area_name,
    route_name: row.route_name,
    status_bool: row.status_bool,
    credit_balance: Number(row.credit_balance ?? 0),
    meter
  };
}

export async function getDebtSnapshot(customerId: string, supabase = createPortalAdminClient()): Promise<DebtSnapshot> {
  const { data, error } = await supabase
    .from("customer_debt_snapshots")
    .select("total_invoiced, total_collected, debt_amount, credit_balance")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return {
    total_invoiced: Number(data?.total_invoiced ?? 0),
    total_collected: Number(data?.total_collected ?? 0),
    debt_amount: Number(data?.debt_amount ?? 0),
    credit_balance: Number(data?.credit_balance ?? 0)
  };
}

export async function listBills(customerId: string, supabase = createPortalAdminClient()): Promise<Bill[]> {
  const limitMonths = await getSystemSetting('data_history_months_limit', '12');
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - parseInt(limitMonths as string, 10));

  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .eq("customer_id", customerId)
    .gte("source_created_at", startDate.toISOString())
    .order("source_created_at", { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) throw new Error(error.message);
  
  const bills = (data ?? []).map(toBill);
  await populateBillingPeriods(bills, supabase);
  return bills;
}

export async function getBillForCustomer(customerId: string, billId: string, supabase = createPortalAdminClient()): Promise<Bill | null> {
  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .eq("customer_id", customerId)
    .eq("id", billId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  const bill = toBill(data as any);
  await populateBillingPeriods([bill], supabase);
  return bill;
}

export async function listUsage(customerId: string, supabase = createPortalAdminClient()): Promise<MeterReading[]> {
  const limitMonths = await getSystemSetting('data_history_months_limit', '12');
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - parseInt(limitMonths as string, 10));

  const { data, error } = await supabase
    .from("meter_readings")
    .select("*")
    .eq("customer_id", customerId)
    .gte("reading_time", startDate.toISOString())
    .order("reading_time", { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) throw new Error(error.message);
  const readings = (data ?? []).map((row: any) => ({
    id: row.id,
    customer_id: row.customer_id,
    period_id: row.period_id,
    old_reading: numberOrNull(row.old_reading),
    new_reading: numberOrNull(row.new_reading),
    consumption: numberOrNull(row.consumption),
    status: row.status,
    reading_time: row.reading_time,
    source_created_at: row.source_created_at,
    billing_periods: null
  }));
  
  await populateBillingPeriods(readings, supabase);
  return readings;
}

export async function listPayments(customerId: string, supabase = createPortalAdminClient()): Promise<Payment[]> {
  const limitMonths = await getSystemSetting('data_history_months_limit', '12');
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - parseInt(limitMonths as string, 10));

  const { data, error } = await supabase
    .from("payments")
    .select("id, customer_id, amount, payment_method_code, note, payment_date, status, created_at")
    .eq("customer_id", customerId)
    .gte("payment_date", startDate.toISOString())
    .order("payment_date", { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    customer_id: row.customer_id,
    amount: Number(row.amount ?? 0),
    payment_method_code: row.payment_method_code,
    note: row.note,
    payment_date: row.payment_date,
    status: row.status,
    source_created_at: row.created_at ?? null
  }));
}

export async function getLatestBill(customerId: string, supabase: SupabaseClient): Promise<Bill | null> {
  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .eq("customer_id", customerId)
    .order("source_created_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const bill = toBill(data as any);
  await populateBillingPeriods([bill], supabase);
  return bill;
}

async function populateBillingPeriods(items: any[], supabase: SupabaseClient) {
  const periodIds = [...new Set(items.map(i => i.period_id).filter(Boolean))];
  if (periodIds.length === 0) return;
  
  const { data } = await supabase
    .from("billing_periods")
    .select("id, period_name, start_date, end_date")
    .in("id", periodIds);
    
  if (data) {
    const periodMap = new Map(data.map(p => [p.id, p]));
    items.forEach(item => {
      if (item.period_id && periodMap.has(item.period_id)) {
        item.billing_periods = periodMap.get(item.period_id);
      }
    });
  }
}

function toBill(row: any): Bill {
  return {
    id: row.id,
    customer_id: row.customer_id,
    period_id: row.period_id,
    old_reading: numberOrNull(row.old_reading),
    new_reading: numberOrNull(row.new_reading),
    consumption: numberOrNull(row.consumption),
    unit_price: numberOrNull(row.unit_price),
    pre_tax_amount: numberOrNull(row.pre_tax_amount),
    tax: numberOrNull(row.tax),
    tax_amount: numberOrNull(row.tax_amount),
    total_amount: Number(row.total_amount ?? 0),
    paid_amount: Number(row.paid_amount ?? 0),
    status: row.status,
    due_date: row.due_date,
    start_date: row.start_date,
    end_date: row.end_date,
    source_created_at: row.source_created_at,
    billing_periods: row.billing_periods
  };
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

export async function getContractForCustomer(customerId: string, supabase = createPortalAdminClient()): Promise<PortalContract | null> {
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("customer_id", customerId)
    .order("source_created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Lỗi đọc hợp đồng từ portal DB:", error.message);
    return null;
  }
  if (data) return data as PortalContract;

  // On-demand fallback: Nếu chưa có trong Portal DB, tự động kéo tức thì từ ERP DB
  try {
    const { syncSingleCustomerAndContract } = await import("@/lib/sync/single-sync");
    const syncRes = await syncSingleCustomerAndContract({ customerId });
    if (syncRes.success) {
      const { data: refreshed } = await supabase
        .from("contracts")
        .select("*")
        .eq("customer_id", customerId)
        .order("source_created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (refreshed) return refreshed as PortalContract;
    }
  } catch (syncErr) {
    console.warn("Lỗi on-demand sync hợp đồng:", syncErr);
  }

  return null;
}

export async function getContractSignedUrl(filePath: string): Promise<string> {
  if (!filePath) return "";
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }
  try {
    const { createErpReadClient } = await import("@/lib/supabase/admin");
    const erp = createErpReadClient();
    const { data, error } = await erp.storage.from("contracts").createSignedUrl(filePath, 3600);
    if (error || !data?.signedUrl) {
      console.warn("Không thể sinh Signed URL hợp đồng từ ERP:", error?.message);
      return "";
    }
    return data.signedUrl;
  } catch (err) {
    console.warn("Lỗi gọi ERP Storage sinh Signed URL:", err);
    return "";
  }
}

