/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'http://127.0.0.1:54331',
  'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz',
  { auth: { persistSession: false } }
);

async function seed() {
  const customerId = '00000000-0000-0000-0000-000000000001';
  
  // Upsert customer
  const { error: custError } = await supabase.from('customers').upsert({
    id: customerId,
    customer_code: 'AL348',
    customer_code_normalized: 'AL348',
    full_name: 'Khách hàng Demo (AL348)',
    address: 'Đình Tổ, Thuận Thành, Bắc Ninh',
    phone_masked: '090****226',
    phone_normalized_values: ['0904949226'],
    credit_balance: 0
  });

  if (custError) {
    console.error("Error inserting customer:", custError);
  } else {
    console.log("Customer AL348 inserted/updated.");
  }
  
  // Upsert debt snapshot
  const { error: debtError } = await supabase.from('customer_debt_snapshots').upsert({
    customer_id: customerId,
    customer_code: 'AL348',
    full_name: 'Khách hàng Demo (AL348)',
    total_invoiced: 550000,
    total_collected: 450000,
    debt_amount: 100000,
    credit_balance: 0
  });
  
  if (debtError) {
    console.error("Error inserting debt snapshot:", debtError);
  } else {
    console.log("Debt snapshot inserted/updated.");
  }
}

seed();
