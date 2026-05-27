import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { getBillForCustomer } from "@/lib/data";
import { formatDate, formatNumber, formatVnd, statusClass, statusLabel } from "@/lib/format";
import { requirePortalSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePortalSession();
  const { id } = await params;
  const bill = await getBillForCustomer(session.customer_id, id);
  if (!bill) notFound();

  const remaining = bill.total_amount - bill.paid_amount;

  return (
    <main className="page section">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 18 }}>
        <div>
          <h1>Chi tiết hóa đơn</h1>
          <p className="muted">{bill.billing_periods?.period_name ?? "Không rõ kỳ"}</p>
        </div>
        <a className="primary-button" href={`/api/bills/${bill.id}/pdf`}>
          <Download size={16} />
          Tải PDF
        </a>
      </div>

      <section className="card">
        <div className="detail-list">
          <div className="detail-item">
            <span>Trạng thái</span>
            <span className={`status ${statusClass(bill.status)}`}>{statusLabel(bill.status)}</span>
          </div>
          <div className="detail-item">
            <span>Hạn thanh toán</span>
            {formatDate(bill.due_date)}
          </div>
          <div className="detail-item">
            <span>Ngày bắt đầu</span>
            {formatDate(bill.start_date ?? bill.billing_periods?.start_date)}
          </div>
          <div className="detail-item">
            <span>Ngày kết thúc</span>
            {formatDate(bill.end_date ?? bill.billing_periods?.end_date)}
          </div>
          <div className="detail-item">
            <span>Chỉ số cũ</span>
            {formatNumber(bill.old_reading)}
          </div>
          <div className="detail-item">
            <span>Chỉ số mới</span>
            {formatNumber(bill.new_reading)}
          </div>
          <div className="detail-item">
            <span>Tiêu thụ</span>
            {formatNumber(bill.consumption, " m³")}
          </div>
          <div className="detail-item">
            <span>Đơn giá</span>
            {formatVnd(bill.unit_price)}
          </div>
          <div className="detail-item">
            <span>Tiền trước thuế</span>
            {formatVnd(bill.pre_tax_amount)}
          </div>
          <div className="detail-item">
            <span>VAT</span>
            {formatVnd(bill.tax_amount)} ({formatNumber(bill.tax, "%")})
          </div>
          <div className="detail-item">
            <span>Tổng tiền</span>
            <strong>{formatVnd(bill.total_amount)}</strong>
          </div>
          <div className="detail-item">
            <span>Còn lại</span>
            <strong>{formatVnd(remaining)}</strong>
          </div>
        </div>
      </section>

      <p style={{ marginTop: 18 }}>
        <Link className="secondary-button" href="/bills">
          Quay lại danh sách
        </Link>
      </p>
    </main>
  );
}

