import { NextRequest, NextResponse } from "next/server";
import { requireEnv } from "@/lib/env";
import { runErpSync } from "@/lib/sync/run";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${requireEnv("CRON_SECRET")}`;
  if (auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const full = url.searchParams.get("full") === "1";
  const result = await runErpSync({ full });
  return NextResponse.json({ data: result });
}

