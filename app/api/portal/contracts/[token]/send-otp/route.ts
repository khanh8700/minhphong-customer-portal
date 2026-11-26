import { NextRequest, NextResponse } from "next/server";
import { getErpHttpStatus, sendContractOtp } from "@/lib/erp-api";

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
  const userAgent = request.headers.get("user-agent") || "Unknown";
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "127.0.0.1";
  const targetEnv =
    body.target_env ||
    request.nextUrl.searchParams.get("env") ||
    request.cookies.get("erp_target_env")?.value;

  const result = await sendContractOtp(token, channel, { userAgent, clientIp }, targetEnv);
  const fallbackStatus = result.success ? 200 : (result.remainingSeconds ? 429 : 400);

  return NextResponse.json(result, { status: getErpHttpStatus(result, fallbackStatus) });
}
