import { NextRequest, NextResponse } from "next/server";
import { getContractByToken } from "@/lib/erp-api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ success: false, error: "Mã token không hợp lệ" }, { status: 400 });
  }

  const result = await getContractByToken(token);
  if (result.success && result.data) {
    result.data.pdfUrl = `/api/portal/contracts/${token}/pdf`;
  }
  return NextResponse.json(result, { status: result.success ? 200 : (result.error?.includes("410") ? 410 : 400) });
}
