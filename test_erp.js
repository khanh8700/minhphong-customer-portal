/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const erpUrl = envLocal.match(/ERP_SUPABASE_URL=(.*)/)[1].trim();
const erpKey = envLocal.match(/ERP_SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const erpClient = createClient(erpUrl, erpKey, { auth: { persistSession: false } });

async function test() {
  const { data, error } = await erpClient.from('customers').select('id').limit(1);
  if (error) {
    console.error("ERP DB Error:", error);
  } else {
    console.log("ERP DB Success. Rows found:", data.length);
  }
}
test();
