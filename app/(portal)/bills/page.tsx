import Link from "next/link";
import { Download, Eye } from "lucide-react";
import { listBills } from "@/lib/data";
import { formatDate, formatNumber, formatVnd, statusClass, statusLabel } from "@/lib/format";
import { requirePortalSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BillsPage() {
  const session = await requirePortalSession();
  const bills = await listBills(session.customer_id);

  return (
    <main className="page section">
      <h1>Hóa đơn tiền nước</h1>
      {bills.length === 0 ? (
        <div className="empty">Chưa có hóa đơn nào được đồng bộ.</div>
      ) : (
        <div className="table-card">
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Kỳ</th>
                <th>Ngày tạo</th>
                <th>Tiêu thụ</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.id}>
                  <td data-label="Kỳ">{bill.billing_periods?.period_name ?? "-"}</td>
                  <td data-label="Ngày tạo">{formatDate(bill.source_created_at)}</td>
                  <td data-label="Tiêu thụ">{formatNumber(bill.consumption, " m³")}</td>
                  <td data-label="Tổng tiền">{formatVnd(bill.total_amount)}</td>
                  <td data-label="Trạng thái">
                    <span className={`status ${statusClass(bill.status)}`}>{statusLabel(bill.status)}</span>
                  </td>
                  <td data-label="Thao tác">
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Link className="icon-button" href={`/bills/${bill.id}`} title="Xem chi tiết hóa đơn">
                        <Eye size={16} />
                      </Link>
                      <a className="icon-button" href={`/api/bills/${bill.id}/pdf`} title="Tải PDF hóa đơn">
                        <Download size={16} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

