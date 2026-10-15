import { NextRequest, NextResponse } from "next/server";
import { syncSingleCustomerAndContract } from "@/lib/sync/single-sync";

export async function POST(req: NextRequest) {
  // Xác thực request: chấp nhận CRON_SECRET, ERP service key hoặc header nội bộ
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isDev = process.env.NODE_ENV === "development";
  const internalHeader = req.headers.get("x-internal-sync");

  const isAuthorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (isDev && internalHeader === "minhphong-internal-sync") ||
    (process.env.SUPABASE_SERVICE_ROLE_KEY && authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const contractId = body.contract_id || body.contractId;
    const customerId = body.customer_id || body.customerId;
    const customerCode = body.customer_code || body.customerCode;

    if (!contractId && !customerId && !customerCode) {
      return NextResponse.json(
        { error: "Missing contract_id, customer_id or customer_code in request body" },
        { status: 400 }
      );
    }

    const result = await syncSingleCustomerAndContract({
      contractId,
      customerId,
      customerCode,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to sync record" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Internal sync error: ${message}` }, { status: 500 });
  }
}
