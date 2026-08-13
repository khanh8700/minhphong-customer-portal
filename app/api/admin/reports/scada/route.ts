import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin-session";
import { createPortalAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  await requireAdminRole(["system_admin", "scada_operator", "accountant", "viewer"]);
  const customerCode = new URL(request.url).searchParams.get("customerCode")?.trim().toUpperCase();
  if (!customerCode) return NextResponse.json({ error: "Thiếu mã khách hàng." }, { status: 400 });

  const supabase = createPortalAdminClient();
  const since = new Date();
  since.setMonth(since.getMonth() - 3);
  const { data, error } = await supabase
    .from("scada_hourly_readings")
    .select("captured_at, source_time, device_name, forward_flow_total, reverse_flow_total, net_flow_total, flow_rate, velocity, internal_battery, external_battery")
    .eq("customer_code", customerCode)
    .gte("captured_at", since.toISOString())
    .order("captured_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const headers = ["captured_at", "source_time", "device_name", "forward_flow_total", "reverse_flow_total", "net_flow_total", "flow_rate", "velocity", "internal_battery", "external_battery"];
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.join(","), ...(data ?? []).map((row) => headers.map((header) => escape(row[header as keyof typeof row])).join(","))].join("\n");

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="scada-${customerCode}.csv"`,
    },
  });
}
