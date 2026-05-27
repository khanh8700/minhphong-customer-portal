import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-session";
import { logAudit } from "@/lib/audit";
import { hashIp } from "@/lib/crypto";
import { getBillForCustomer, getCustomerSummary } from "@/lib/data";
import { generateInvoicePdf } from "@/lib/pdf/invoice";
import { getRequestIp, getUserAgent } from "@/lib/request";
import { createPortalAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession(req);
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  const supabase = createPortalAdminClient();
  const [customer, bill] = await Promise.all([
    getCustomerSummary(session.customer_id, supabase),
    getBillForCustomer(session.customer_id, id, supabase)
  ]);

  if (!customer || !bill) {
    return NextResponse.json({ error: "Không tìm thấy hóa đơn." }, { status: 404 });
  }

  const pdf = generateInvoicePdf({ customer, bill });
  await logAudit(supabase, {
    customerId: session.customer_id,
    action: "download_invoice_pdf",
    metadata: { bill_id: id },
    ipHash: hashIp(getRequestIp(req)),
    userAgent: getUserAgent(req)
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="hoa-don-${bill.id}.pdf"`
    }
  });
}
