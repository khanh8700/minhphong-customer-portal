import { createPortalAdminClient } from "@/lib/supabase/admin";
import { fetchScadaData } from "@/lib/scada";
import { buildScadaHourlyReading, getScadaHistoryStartDate } from "@/lib/scada-history";

type ScadaMapping = {
  customer_code: string;
  api_url: string;
};

export type ScadaCaptureResult = {
  captured: number;
  failed: Array<{ customerCode: string; error: string }>;
  deleted: number;
};

export async function captureScadaHistory(): Promise<ScadaCaptureResult> {
  const supabase = createPortalAdminClient();
  const { data: mappings, error: mappingsError } = await supabase
    .from("scada_mappings")
    .select("customer_code, api_url");

  if (mappingsError) throw new Error(mappingsError.message);

  const failed: ScadaCaptureResult["failed"] = [];
  let captured = 0;
  const capturedAt = new Date();

  for (const mapping of (mappings ?? []) as ScadaMapping[]) {
    try {
      const data = await fetchScadaData(mapping.api_url);
      if (!data) {
        failed.push({ customerCode: mapping.customer_code, error: "SCADA không trả dữ liệu hợp lệ" });
        continue;
      }

      const { error } = await supabase
        .from("scada_hourly_readings")
        .upsert(buildScadaHourlyReading(mapping.customer_code, data, capturedAt), {
          onConflict: "customer_code,captured_at",
        });

      if (error) {
        failed.push({ customerCode: mapping.customer_code, error: error.message });
        continue;
      }

      captured += 1;
    } catch (error: unknown) {
      failed.push({
        customerCode: mapping.customer_code,
        error: error instanceof Error ? error.message : "Lỗi không xác định",
      });
    }
  }

  const { count, error: deleteError } = await supabase
    .from("scada_hourly_readings")
    .delete({ count: "exact" })
    .lt("captured_at", getScadaHistoryStartDate().toISOString());

  if (deleteError) throw new Error(`Không thể dọn dữ liệu SCADA cũ: ${deleteError.message}`);

  return { captured, failed, deleted: count ?? 0 };
}
