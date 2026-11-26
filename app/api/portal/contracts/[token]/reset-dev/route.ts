import { NextRequest, NextResponse } from "next/server";
import { getErpBaseUrl } from "@/lib/erp-api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ success: false, error: "Mã token không hợp lệ" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const targetEnv =
    (typeof body?.target_env === "string" ? body.target_env : undefined) ||
    request.nextUrl.searchParams.get("env") ||
    request.cookies.get("erp_target_env")?.value;

  const erpBaseUrl = getErpBaseUrl(targetEnv);
  try {
    const res = await fetch(`${erpBaseUrl}/api/portal/contracts/${token}/reset-dev`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
