import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Droplets } from "lucide-react";
import { LookupForm } from "@/components/LookupForm";
import { getSessionFromCookies } from "@/lib/session";

import { createPortalAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface LookupPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LookupPage(props: LookupPageProps) {
  const params = props.searchParams ? await props.searchParams : {};
  const paramCode = ((params?.code || params?.customer_code || "") as string).trim();
  const auto = params?.auto;

  const session = await getSessionFromCookies().catch(() => null);

  if (session) {
    if (!paramCode && !auto) {
      // Direct visit without specific customer query -> go to active dashboard
      redirect("/dashboard");
    }

    if (paramCode) {
      // Check if active session belongs to this requested customer
      try {
        const supabase = createPortalAdminClient();
        const { data: customer } = await supabase
          .from("customers")
          .select("customer_code, customer_code_normalized")
          .eq("id", session.customer_id)
          .maybeSingle();

        const normalizedParamCode = paramCode.toUpperCase();
        const currentCode = (customer?.customer_code || "").toUpperCase();
        const currentCodeNorm = (customer?.customer_code_normalized || "").toUpperCase();

        if (currentCode === normalizedParamCode || currentCodeNorm === normalizedParamCode) {
          // Already authenticated as this exact customer
          redirect("/dashboard");
        }
      } catch (err) {
        // In case of error, allow LookupForm to proceed
      }
      // If DIFFERENT customer, DO NOT redirect! Let LookupForm authenticate the new customer!
    }
  }

  const isAuto = (auto === "1" || auto === "true") && Boolean(paramCode);

  if (isAuto) {
    return (
      <main className="lookup-wrap" style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <Suspense fallback={
          <div style={{ textAlign: 'center', padding: 32, color: '#0284c7', fontWeight: 700 }}>
            Đang khởi tạo cổng tra cứu...
          </div>
        }>
          <LookupForm isAuto={true} />
        </Suspense>
      </main>
    );
  }

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
        <Suspense fallback={<div className="form-panel" style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Đang tải...</div>}>
          <LookupForm />
        </Suspense>
      </div>
    </main>
  );
}

