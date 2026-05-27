import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, revokeRequestSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  await revokeRequestSession(req);
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}

