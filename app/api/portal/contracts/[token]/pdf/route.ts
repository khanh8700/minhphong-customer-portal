import { NextRequest, NextResponse } from "next/server";
import { getErpBaseUrl } from "@/lib/erp-api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return new NextResponse("Mã token không hợp lệ", { status: 400 });
  }

  const targetEnv =
    request.nextUrl.searchParams.get("env") ||
    request.cookies.get("erp_target_env")?.value;

  const erpBaseUrl = getErpBaseUrl(targetEnv);
  try {
    const res = await fetch(`${erpBaseUrl}/api/portal/contracts/${token}/pdf`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 MinhPhongPortal/1.0",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return new NextResponse("Không thể tải tệp PDF từ hệ thống ERP", {
        status: res.status,
      });
    }

    const pdfBuffer = await res.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new NextResponse(`Lỗi proxy PDF: ${msg}`, { status: 502 });
  }
}
