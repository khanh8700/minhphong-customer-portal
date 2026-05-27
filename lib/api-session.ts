import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import type { PortalSession } from "@/lib/types";

export async function requireApiSession(req: NextRequest): Promise<PortalSession | NextResponse> {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Phiên tra cứu đã hết hạn. Vui lòng tra cứu lại." }, { status: 401 });
  }
  return session;
}

