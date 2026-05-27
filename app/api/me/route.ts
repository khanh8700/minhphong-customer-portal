import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-session";
import { getCustomerSummary, getDebtSnapshot, getLatestBill } from "@/lib/data";
import { createPortalAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const session = await requireApiSession(req);
  if (session instanceof NextResponse) return session;

  const supabase = createPortalAdminClient();
  const [customer, debt, latestBill] = await Promise.all([
    getCustomerSummary(session.customer_id, supabase),
    getDebtSnapshot(session.customer_id, supabase),
    getLatestBill(session.customer_id, supabase)
  ]);

  return NextResponse.json({ data: { customer, debt, latestBill, expires_at: session.expires_at } });
}

