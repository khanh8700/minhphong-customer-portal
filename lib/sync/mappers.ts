import { extractNormalizedPhones, maskPhone, normalizeCustomerCode } from "@/lib/phone";

export function mapCustomer(row: any): Record<string, unknown> {
  const normalizedPhones = extractNormalizedPhones(row.phone);
  const area = Array.isArray(row.area) ? row.area[0] : row.area;
  const route = Array.isArray(row.route) ? row.route[0] : row.route;

  return {
    id: row.id,
    customer_code: row.customer_code,
    customer_code_normalized: normalizeCustomerCode(row.customer_code ?? ""),
    full_name: row.full_name,
    address: row.address ?? null,
    phone_masked: maskPhone(row.phone),
    phone_normalized_values: normalizedPhones,
    tax_code: row.tax_code ?? null,
    current_meter_id: row.current_meter_id ?? null,
    area_name: area?.name ?? null,
    route_name: route?.name ?? null,
    status_bool: row.status_bool ?? null,
    credit_balance: Number(row.credit_balance ?? 0),
    source_created_at: row.created_at ?? null,
    source_updated_at: row.updated_at ?? row.created_at ?? null,
    synced_at: new Date().toISOString()
  };
}

export function mapMeter(row: any): Record<string, unknown> {
  return {
    id: row.id,
    meter_code: row.meter_code,
    meter_size: row.meter_size ?? null,
    meter_class: row.meter_class ?? null,
    status: row.status ?? null,
    source_created_at: row.created_at ?? null,
    synced_at: new Date().toISOString()
  };
}

export function mapBillingPeriod(row: any): Record<string, unknown> {
  return {
    id: row.id,
    period_name: row.period_name,
    start_date: row.start_date ?? null,
    end_date: row.end_date ?? null,
    status: row.status ?? null,
    source_created_at: row.created_at ?? null,
    synced_at: new Date().toISOString()
  };
}

export function mapMeterReading(row: any): Record<string, unknown> {
  return {
    id: row.id,
    customer_id: row.customer_id,
    period_id: row.period_id ?? null,
    meter_id: row.meter_id ?? null,
    old_reading: row.old_reading ?? null,
    new_reading: row.new_reading ?? null,
    consumption: row.consumption ?? null,
    status: row.status ?? null,
    reading_time: row.reading_time ?? null,
    source_created_at: row.created_at ?? null,
    source_updated_at: row.updated_at ?? row.created_at ?? null,
    synced_at: new Date().toISOString()
  };
}

export function mapBill(row: any): Record<string, unknown> {
  return {
    id: row.id,
    customer_id: row.customer_id,
    reading_id: row.reading_id ?? null,
    period_id: row.period_id ?? null,
    old_reading: row.old_reading ?? null,
    new_reading: row.new_reading ?? null,
    consumption: row.consumption ?? null,
    unit_price: row.unit_price ?? null,
    pre_tax_amount: row.pre_tax_amount ?? null,
    tax: row.tax ?? null,
    tax_amount: row.tax_amount ?? null,
    total_amount: Number(row.total_amount ?? 0),
    paid_amount: Number(row.paid_amount ?? 0),
    status: row.status ?? null,
    due_date: row.due_date ?? null,
    start_date: row.start_date ?? null,
    end_date: row.end_date ?? null,
    source_created_at: row.created_at ?? null,
    source_updated_at: row.updated_at ?? row.created_at ?? null,
    synced_at: new Date().toISOString()
  };
}

export function mapPayment(row: any): Record<string, unknown> {
  return {
    id: row.id,
    customer_id: row.customer_id,
    amount: Number(row.amount ?? 0),
    payment_method_code: row.payment_method_code ?? null,
    note: row.note ?? null,
    payment_date: row.payment_date ?? null,
    status: row.status ?? null,
    source_created_at: row.created_at ?? null,
    synced_at: new Date().toISOString()
  };
}

export function mapPaymentAllocation(row: any): Record<string, unknown> | null {
  const payment = Array.isArray(row.payment) ? row.payment[0] : row.payment;
  const customerId = row.customer_id ?? payment?.customer_id;
  if (!customerId) return null;
  return {
    id: row.id,
    payment_id: row.payment_id,
    bill_id: row.invoice_id,
    customer_id: customerId,
    allocated_amount: Number(row.allocated_amount ?? 0),
    source_created_at: row.created_at ?? null,
    synced_at: new Date().toISOString()
  };
}

export function mapDebtSnapshot(row: any): Record<string, unknown> {
  return {
    customer_id: row.customer_id,
    customer_code: row.customer_code ?? null,
    full_name: row.full_name ?? null,
    total_invoiced: Number(row.total_invoiced ?? row.total_invoices ?? 0),
    total_collected: Number(row.total_collected ?? 0),
    debt_amount: Number(row.debt_amount ?? 0),
    credit_balance: Number(row.credit_balance ?? 0),
    source_refreshed_at: row.updated_at ?? row.last_refresh_at ?? null,
    synced_at: new Date().toISOString()
  };
}

