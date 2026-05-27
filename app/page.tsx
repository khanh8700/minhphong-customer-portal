import { redirect } from "next/navigation";
import { Droplets } from "lucide-react";
import { LookupForm } from "@/components/LookupForm";
import { getSessionFromCookies } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LookupPage() {
  const session = await getSessionFromCookies().catch(() => null);
  if (session) redirect("/dashboard");

  return (
    <main className="lookup-wrap">
      <div className="page lookup-grid">
        <section className="intro">
          <div className="brand" style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="brand-mark">
              <Droplets size={21} />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <strong style={{ fontSize: '1rem', lineHeight: 1.2 }}>Công ty TNHH MTV đầu tư Minh Phong</strong>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #666)' }}>Nhà máy nước Đình Tổ</span>
            </div>
          </div>
          <h1>Hệ thống tra cứu hóa đơn tiền nước dành cho Khách hàng.</h1>
          <p>
            Nhập đúng mã khách hàng và số điện thoại đã đăng ký để xem hóa đơn, công nợ, sản lượng
            tiêu thụ và lịch sử thanh toán.
          </p>
        </section>
        <LookupForm />
      </div>
    </main>
  );
}

