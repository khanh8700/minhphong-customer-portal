import { listUsage } from "@/lib/data";
import { formatDate, formatNumber, statusClass, statusLabel } from "@/lib/format";
import { requirePortalSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function UsagePage() {
  const session = await requirePortalSession();
  const usage = await listUsage(session.customer_id);
  const maxConsumption = Math.max(...usage.map((row) => Number(row.consumption ?? 0)), 1);

  return (
    <main className="page section">
      <h1>Lịch sử sử dụng nước</h1>
      {usage.length === 0 ? (
        <div className="empty">Chưa có lịch sử chỉ số nước.</div>
      ) : (
        <div className="grid">
          <section className="card chart">
            {usage.slice(0, 12).map((row) => {
              const width = `${Math.max((Number(row.consumption ?? 0) / maxConsumption) * 100, 3)}%`;
              return (
                <div className="bar-row" key={row.id}>
                  <span>{row.billing_periods?.period_name ?? formatDate(row.reading_time)}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width }} />
                  </div>
                  <strong>{formatNumber(row.consumption, " m³")}</strong>
                </div>
              );
            })}
          </section>

          <div className="table-card">
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>Kỳ</th>
                  <th>Ngày ghi</th>
                  <th>Chỉ số cũ</th>
                  <th>Chỉ số mới</th>
                  <th>Tiêu thụ</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Kỳ">{row.billing_periods?.period_name ?? "-"}</td>
                    <td data-label="Ngày ghi">{formatDate(row.reading_time)}</td>
                    <td data-label="Chỉ số cũ">{formatNumber(row.old_reading)}</td>
                    <td data-label="Chỉ số mới">{formatNumber(row.new_reading)}</td>
                    <td data-label="Tiêu thụ">{formatNumber(row.consumption, " m³")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}

