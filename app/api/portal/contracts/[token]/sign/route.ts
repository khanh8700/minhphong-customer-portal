import { NextRequest, NextResponse } from "next/server";
import { signContractIndividual } from "@/lib/erp-api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ success: false, error: "Mã token không hợp lệ" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const userAgent = body.user_agent || request.headers.get("user-agent");
  const clientIp = body.client_ip || request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip");
  const targetEnv =
    body.target_env ||
    request.nextUrl.searchParams.get("env") ||
    request.cookies.get("erp_target_env")?.value;

  const result = await signContractIndividual(token, body, { userAgent, clientIp }, targetEnv);

  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
