import { NextRequest, NextResponse } from "next/server";
import { ERP_ENV_URLS, getErpBaseUrl, resolveErpEnvironment } from "@/lib/erp-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
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
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        contentType,
        durationMs,
        responseHeaders: Object.fromEntries(res.headers.entries()),
        bodySnippet: text.slice(0, 500),
        isJson: !!parsed,
      };
    } catch (err) {
      results[url] = {
        ok: false,
        durationMs: Date.now() - startTime,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      };
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    envVars,
    results,
  });
}
