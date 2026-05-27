export type CustomerSummary = {
  id: string;
  customer_code: string;
  full_name: string;
  address: string | null;
  phone_masked: string | null;
  area_name: string | null;
  route_name: string | null;
  status_bool: boolean | null;
  credit_balance: number;
  meter?: {
    meter_code: string | null;
    meter_size: string | null;
    meter_class: string | null;
  } | null;
};

export type DebtSnapshot = {
  total_invoiced: number;
  total_collected: number;
  debt_amount: number;
  credit_balance: number;
};

export type Bill = {
  id: string;
  customer_id: string;
  period_id: string | null;
  old_reading: number | null;
  new_reading: number | null;
  consumption: number | null;
  unit_price: number | null;
  pre_tax_amount: number | null;
  tax: number | null;
  tax_amount: number | null;
  total_amount: number;
  paid_amount: number;
  status: string | null;
  due_date: string | null;
  start_date: string | null;
  end_date: string | null;
  source_created_at: string | null;
  billing_periods?: { period_name: string | null; start_date: string | null; end_date: string | null } | null;
};

export type MeterReading = {
  id: string;
  customer_id: string;
  period_id: string | null;
  old_reading: number | null;
  new_reading: number | null;
  consumption: number | null;
  status: string | null;
  reading_time: string | null;
  source_created_at: string | null;
  billing_periods?: { period_name: string | null } | null;
};

export type Payment = {
  id: string;
  customer_id: string;
  amount: number;
  payment_method_code: string | null;
  note: string | null;
  payment_date: string | null;
  status: string | null;
  source_created_at: string | null;
};

export type PortalSession = {
  id: string;
  customer_id: string;
  expires_at: string;
};

