import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-session";
import { getBillForCustomer } from "@/lib/data";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession(req);
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  const bill = await getBillForCustomer(session.customer_id, id);
  if (!bill) return NextResponse.json({ error: "Không tìm thấy hóa đơn." }, { status: 404 });
  return NextResponse.json({ data: bill });
}

