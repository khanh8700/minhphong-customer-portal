import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-session";
import { listUsage } from "@/lib/data";

export async function GET(req: NextRequest) {
  const session = await requireApiSession(req);
  if (session instanceof NextResponse) return session;
  const usage = await listUsage(session.customer_id);
  return NextResponse.json({ data: usage });
}

