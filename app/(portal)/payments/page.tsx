import { listPayments } from "@/lib/data";
import { formatDate, formatVnd, paymentMethodLabel, statusClass, statusLabel } from "@/lib/format";
import { requirePortalSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const session = await requirePortalSession();
  const payments = await listPayments(session.customer_id);

  return (
    <main className="page section">
      <h1>Lịch sử thanh toán</h1>
      {payments.length === 0 ? (
        <div className="empty">Chưa có lịch sử thanh toán.</div>
      ) : (
        <div className="table-card">
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Ngày thanh toán</th>
                <th>Số tiền</th>
                <th>Phương thức</th>
                <th>Trạng thái</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td data-label="Ngày thanh toán">{formatDate(payment.payment_date)}</td>
                  <td data-label="Số tiền">{formatVnd(payment.amount)}</td>
                  <td data-label="Phương thức">{paymentMethodLabel(payment.payment_method_code)}</td>
                  <td data-label="Trạng thái">
                    <span className={`status ${statusClass(payment.status)}`}>{statusLabel(payment.status)}</span>
                  </td>
                  <td data-label="Ghi chú">{payment.note ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

