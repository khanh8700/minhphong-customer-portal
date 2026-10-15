import { NextRequest, NextResponse } from "next/server";
import { getContractByToken } from "@/lib/erp-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ success: false, error: "Mã token không hợp lệ" }, { status: 400 });
  }

  const targetEnv =
    request.nextUrl.searchParams.get("env") ||
    request.cookies.get("erp_target_env")?.value;

  const result = await getContractByToken(token, targetEnv);
  if (result.success && result.data) {
    result.data.pdfUrl = `/api/portal/contracts/${token}/pdf`;
  }
  return NextResponse.json(result, {
    status: result.success ? 200 : (result.error?.includes("410") ? 410 : 400),
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
