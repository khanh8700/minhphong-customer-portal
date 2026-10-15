import { NextRequest, NextResponse } from "next/server";
import { sendContractOtp } from "@/lib/erp-api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ success: false, error: "Mã token không hợp lệ" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const channel = body.channel === "email" ? "email" : "zalo";
  const userAgent = body.user_agent || request.headers.get("user-agent");
  const clientIp = body.client_ip || request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip");
  const result = await sendContractOtp(token, channel, { userAgent, clientIp });

  return NextResponse.json(result, { status: result.success ? 200 : (result.remainingSeconds ? 429 : 400) });
}
