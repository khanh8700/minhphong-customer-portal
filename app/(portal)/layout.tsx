import { PortalNav } from "@/components/PortalNav";
import { getCustomerSummary } from "@/lib/data";
import { requirePortalSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePortalSession();
  const customer = await getCustomerSummary(session.customer_id);

  return (
    <div className="shell">
      <PortalNav customerName={customer?.full_name} />
      {children}
    </div>
  );
}

