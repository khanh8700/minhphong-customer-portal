import { PortalNav } from "@/components/PortalNav";
import { getCustomerSummary } from "@/lib/data";
import { requirePortalSession } from "@/lib/session";

import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePortalSession();
  const customer = await getCustomerSummary(session.customer_id);
  
  // Fetch capabilities
  let hasScada = false;
  let canChangePassword = false;

  if (customer?.customer_code) {
    const supabase = await import("@/lib/supabase/admin").then(m => m.createPortalAdminClient());
    
    const [scadaRes, authRes] = await Promise.all([
      supabase.from("scada_mappings").select("id").eq("customer_code", customer.customer_code).maybeSingle(),
      supabase.from("customer_auth").select("can_change_password").eq("customer_code", customer.customer_code).maybeSingle()
    ]);
    
    if (scadaRes.data) hasScada = true;
    if (authRes.data?.can_change_password) canChangePassword = true;
  }

  return (
    <div className="shell">
      <PortalNav 
        customerName={customer?.full_name} 
        hasScada={hasScada} 
        canChangePassword={canChangePassword} 
      />
      {children}
      <Footer />
    </div>
  );
}

