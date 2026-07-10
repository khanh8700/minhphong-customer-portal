import Link from "next/link";
import { Clock, Droplets, FileText, Wallet, User, Database, AlertCircle, MapPin } from "lucide-react";
import { getCustomerSummary, listBills } from "@/lib/data";
import { formatNumber, formatVnd, statusClass, statusLabel } from "@/lib/format";
import { requirePortalSession } from "@/lib/session";
import { createPortalAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requirePortalSession();
  const supabase = createPortalAdminClient();
  const [customer, bills] = await Promise.all([
    getCustomerSummary(session.customer_id, supabase),
    listBills(session.customer_id, supabase)
  ]);

  const latestBill = bills[0];
  
  // Calculate old debt from bills older than latestBill
  const oldUnpaidBills = bills.filter(b => b.id !== latestBill?.id && b.total_amount > b.paid_amount);
  const oldDebt = oldUnpaidBills.reduce((sum, b) => sum + (b.total_amount - b.paid_amount), 0);
  const totalDebt = (latestBill ? Math.max(0, latestBill.total_amount - latestBill.paid_amount) : 0) + oldDebt;

  return (
    <main className="page section">
      <div className="grid top-cards" style={{ marginBottom: 24 }}>
        <section className="card flex-row">
          <User size={20} color="var(--muted)" />
          <div>
            <div className="muted-text">Mã khách hàng</div>
            <span className="badge" style={{ fontSize: 16, padding: '4px 10px' }}>{customer?.customer_code}</span>
          </div>
        </section>
        <section className="card flex-row">
          <Database size={20} color="var(--muted)" />
          <div>
            <div className="muted-text">Mã đồng hồ</div>
            <span className="badge" style={{ fontSize: 16, padding: '4px 10px' }}>{customer?.meter?.meter_code ?? "-"}</span>
          </div>
        </section>
        <section className="card flex-row">
          <MapPin size={20} color="var(--muted)" />
          <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <div className="muted-text">Địa chỉ</div>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }} title={customer?.address ?? "-"}>{customer?.address ?? "-"}</div>
          </div>
        </section>
      </div>

      <div className={`grid ${oldUnpaidBills.length > 0 ? 'grid-layout-main' : ''}`}>
        <section className="card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={20} color="var(--muted)" /> 
            Hóa đơn hiện tại
          </h2>
          
          {latestBill ? (
            <div className="bill-detail-wrap">
              <div className="bill-period-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="muted-text">Kỳ hóa đơn</div>
                  <strong style={{ fontSize: 18, display: 'block' }}>{latestBill.billing_periods?.period_name ?? "-"}</strong>
                </div>
                <span className={`status ${statusClass(latestBill.status)}`}>{statusLabel(latestBill.status)}</span>
              </div>
              
              <div className="bill-metrics-grid">
                <div>
                  <div className="muted-text">CS cũ</div>
                  <strong>{formatNumber(latestBill.old_reading)}</strong>
                </div>
                <div>
                  <div className="muted-text">CS mới</div>
                  <strong>{formatNumber(latestBill.new_reading)}</strong>
                </div>
                <div>
                  <div className="muted-text">Tiêu thụ</div>
                  <strong>{formatNumber(latestBill.consumption)} m³</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="muted-text">Thành tiền</div>
                  <strong style={{ color: 'var(--good)' }}>{formatVnd(latestBill.total_amount)}</strong>
                </div>
              </div>
              
              <div className="divider"></div>
              
              <div className="bill-summary-rows">
                <div className="summary-row">
                  <span className="muted-text">Nợ cũ:</span>
                  <strong style={{ color: oldDebt > 0 ? 'var(--warn)' : 'inherit' }}>{formatVnd(oldDebt)}</strong>
                </div>
                <div className="summary-row highlight" style={{ marginTop: 8, fontWeight: 'bold' }}>
                  <span className="muted-text" style={{ color: 'inherit', fontSize: 16 }}>Tổng cần thanh toán:</span>
                  <strong style={{ color: 'var(--danger)', fontSize: 20 }}>{formatVnd(totalDebt)}</strong>
                </div>
              </div>

              {totalDebt > 0 && (
                <div style={{ marginTop: 16, padding: '12px 16px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 'var(--radius-sm)', fontSize: 13, color: '#854d0e', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <AlertCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <strong>Lưu ý:</strong> Khách hàng thanh toán chuyển khoản vui lòng ghi rõ nội dung chuyển tiền là <strong>{customer?.customer_code}</strong> để hệ thống gạch nợ tự động.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty" style={{ marginTop: 16 }}>Không có dữ liệu hóa đơn.</div>
          )}
        </section>

        {oldUnpaidBills.length > 0 && (
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <FileText size={20} color="var(--muted)" /> 
              Các tháng còn nợ
            </h2>
            {oldDebt > 0 && <span className="badge-warn">{formatVnd(oldDebt)}</span>}
          </div>

          <div className="unpaid-list">
            {oldUnpaidBills.length > 0 ? (
              oldUnpaidBills.map(bill => (
                <div key={bill.id} className="unpaid-item">
                  <div className="unpaid-header">
                    <strong style={{ fontSize: 14 }}>{bill.billing_periods?.period_name ?? "Kỳ không rõ"}</strong>
                    <div className="unpaid-amount">
                      <span className="muted-text">Còn nợ</span>
                      <strong style={{ color: 'var(--danger)' }}>{formatVnd(bill.total_amount - bill.paid_amount)}</strong>
                    </div>
                  </div>
                  <div className="muted-text" style={{ fontSize: 12, marginTop: 4 }}>
                    Tổng {formatVnd(bill.total_amount)} · Đã thu {formatVnd(bill.paid_amount)}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty">Không có nợ cũ.</div>
            )}
          </div>
        </section>
        )}
      </div>

      <div className="grid cols-3" style={{ marginTop: 24 }}>
        <Link className="card" href="/bills">
          <FileText size={22} color="var(--brand)" />
          <h3>Danh sách hóa đơn</h3>
          <p className="muted">Xem chi tiết từng kỳ và tải PDF.</p>
        </Link>
        <Link className="card" href="/usage">
          <Droplets size={22} color="var(--brand)" />
          <h3>Lịch sử dùng nước</h3>
          <p className="muted">Theo dõi chỉ số cũ, mới và tiêu thụ.</p>
        </Link>
        <Link className="card" href="/payments">
          <Wallet size={22} color="var(--brand)" />
          <h3>Lịch sử thanh toán</h3>
          <p className="muted">Xem khoản thu và phương thức đã ghi nhận.</p>
        </Link>
      </div>

      <div className="muted" style={{ marginTop: 24, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Clock size={16} />
          Thời điểm tra cứu: <strong>{new Date().toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "medium" })}</strong>
        </span>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Clock size={16} />
          Phiên tra cứu hết hạn lúc {new Date(session.expires_at).toLocaleTimeString("vi-VN")}
        </span>
      </div>
    </main>
  );
}
