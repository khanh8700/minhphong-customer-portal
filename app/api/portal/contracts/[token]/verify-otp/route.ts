import { NextRequest, NextResponse } from "next/server";
import { getErpHttpStatus, verifyContractOtp } from "@/lib/erp-api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Mã token không hợp lệ" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const userAgent = request.headers.get("user-agent") || "Unknown";
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";
  const targetEnv =
    body.target_env ||
    request.nextUrl.searchParams.get("env") ||
    request.cookies.get("erp_target_env")?.value;

  const result = await verifyContractOtp(
    token,
    {
      otp_code: typeof body.otp_code === "string" ? body.otp_code : "",
      user_agent: body.user_agent,
      client_ip: body.client_ip,
    },
    { userAgent, clientIp },
    targetEnv
  );

  const status = getErpHttpStatus(result, result.success ? 200 : 400);
  return NextResponse.json(result, { status });
}
