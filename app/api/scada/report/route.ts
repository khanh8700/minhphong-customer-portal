import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-session";
import { getCustomerSummary } from "@/lib/data";
import { createPortalAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const session = await requireApiSession(request);
  if (session instanceof NextResponse) return session;
  const supabase = createPortalAdminClient();
  const customer = await getCustomerSummary(session.customer_id, supabase);
  if (!customer) return NextResponse.json({ error: "Không tìm thấy khách hàng." }, { status: 404 });

  const since = new Date();
  since.setMonth(since.getMonth() - 3);
  const { data, error } = await supabase
    .from("scada_hourly_readings")
    .select("captured_at, source_time, forward_flow_total, flow_rate, internal_battery, external_battery")
    .eq("customer_code", customer.customer_code)
    .gte("captured_at", since.toISOString())
    .order("captured_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const headers = ["captured_at", "source_time", "forward_flow_total", "flow_rate", "internal_battery", "external_battery"];
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.join(","), ...(data ?? []).map((row) => headers.map((header) => escape(row[header as keyof typeof row])).join(","))].join("\n");
  return new NextResponse(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="scada-${customer.customer_code}.csv"` } });
}
