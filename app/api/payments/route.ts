import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-session";
import { listPayments } from "@/lib/data";

export async function GET(req: NextRequest) {
  const session = await requireApiSession(req);
  if (session instanceof NextResponse) return session;
  const payments = await listPayments(session.customer_id);
  return NextResponse.json({ data: payments });
}

