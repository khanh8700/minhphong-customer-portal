import { NextRequest, NextResponse } from "next/server";
import { ERP_ENV_URLS, getErpBaseUrl, resolveErpEnvironment } from "@/lib/erp-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  // Chặn hoàn toàn trên môi trường Production để ngăn ngừa rò rỉ hạ tầng
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  // Trên môi trường dev/staging: yêu cầu token bảo mật nội bộ
  const debugKey = request.headers.get("x-debug-key") || request.nextUrl.searchParams.get("key");
  const expectedKey = process.env.DEBUG_ERP_KEY;
  if (!expectedKey || debugKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized debug access" }, { status: 401 });
  }

  const token = request.nextUrl.searchParams.get("token") || "c80db5a0-a677-4988-916d-4f8f4d5e74c5";
  const envParam = request.nextUrl.searchParams.get("env") || "staging";
  const resolved = resolveErpEnvironment(envParam);
  const targetBaseUrl = getErpBaseUrl(resolved);

  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    ERP_API_BASE_URL: process.env.ERP_API_BASE_URL || null,
    ERP_API_PROD_URL: process.env.ERP_API_PROD_URL || null,
    ERP_API_STAGING_URL: process.env.ERP_API_STAGING_URL || null,
    ERP_ENV_URLS,
    resolvedEnvironment: resolved,
    targetBaseUrl,
  };

  const testUrls = [
    `${targetBaseUrl}/api/portal/contracts/${token}`,
    `https://staging.nuocsachdinhto.com/api/portal/contracts/${token}`,
  ];

  const results: Record<string, unknown> = {};

  for (const url of testUrls) {
    const startTime = Date.now();
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 MinhPhongPortal/1.0",
        },
        cache: "no-store",
      });

      const durationMs = Date.now() - startTime;
      const contentType = res.headers.get("content-type") || "";
      const text = await res.text();
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        // text only
      }

      results[url] = {
        status: res.status,
        statusText: res.statusText,
        durationMs,
        contentType,
        headers: {
          server: res.headers.get("server"),
          date: res.headers.get("date"),
          contentLength: res.headers.get("content-length"),
        },
        bodyPreview: parsed || (text.length > 500 ? `${text.slice(0, 500)}...` : text),
      };
    } catch (err: unknown) {
      results[url] = {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : null,
        durationMs: Date.now() - startTime,
      };
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    envVars,
    tests: results,
  });
}
