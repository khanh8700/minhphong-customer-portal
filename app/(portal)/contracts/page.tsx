import Link from "next/link";
import { FileCheck, ShieldCheck, Download, AlertCircle, FileText, Calendar, ArrowLeft } from "lucide-react";
import { getCustomerSummary, getContractForCustomer, getContractSignedUrl } from "@/lib/data";
import { requirePortalSession } from "@/lib/session";
import { createPortalAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const session = await requirePortalSession();
  const supabase = createPortalAdminClient();

  const [customer, contract] = await Promise.all([
    getCustomerSummary(session.customer_id, supabase),
    getContractForCustomer(session.customer_id, supabase),
  ]);

  const pdfPath = contract?.final_pdf_url || contract?.paper_scan_pdf_url || "";
  const downloadUrl = pdfPath ? await getContractSignedUrl(pdfPath) : "";

  return (
    <main className="page section">
      <div style={{ marginBottom: 20 }}>
        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)", textDecoration: "none" }}>
          <ArrowLeft size={16} /> Quay lại Tổng quan
        </Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Hợp Đồng Cấp Nước</h1>
          <p className="muted-text" style={{ margin: 0 }}>
            Thông tin hợp đồng dịch vụ cấp nước và chứng thư số điện tử
          </p>
        </div>

        {contract?.status === "completed" && (
          <span className="status paid" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 16px", borderRadius: 20, fontSize: 14, fontWeight: 600 }}>
            <ShieldCheck size={16} /> Đã Ký Số Hợp Lệ
          </span>
        )}
      </div>

      {contract ? (
        <div style={{ display: "grid", gap: 24 }}>
          {/* Main Contract Card */}
          <section className="card">
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <FileCheck size={20} color="var(--primary)" />
              Hợp Đồng Điện Tử Số {contract.contract_number}
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
              <div>
                <span className="muted-text" style={{ fontSize: 12, display: "block" }}>Mã khách hàng:</span>
                <strong style={{ fontSize: 15 }}>{contract.customer_code}</strong>
              </div>
              <div>
                <span className="muted-text" style={{ fontSize: 12, display: "block" }}>Họ tên chủ hộ / Đơn vị:</span>
                <strong style={{ fontSize: 15 }}>{customer?.full_name}</strong>
              </div>
              <div>
                <span className="muted-text" style={{ fontSize: 12, display: "block" }}>Mẫu hợp đồng:</span>
                <span>{contract.template_code === "02/HĐ-CNDN" ? "Hợp đồng Doanh nghiệp (02/HĐ-CNDN)" : "Hợp đồng Sinh hoạt (01/HĐ-CNSH)"}</span>
              </div>
              <div>
                <span className="muted-text" style={{ fontSize: 12, display: "block" }}>Kênh ký kết:</span>
                <span>{contract.signing_channel === "on_site_mobile" ? "Ký tại chỗ (Máy thợ)" : contract.signing_channel === "remote_email" ? "Ký từ xa qua Email" : contract.signing_channel === "paper" ? "Hợp đồng bản giấy" : "Ký từ xa qua Zalo"}</span>
              </div>
              {contract.source_created_at && (
                <div>
                  <span className="muted-text" style={{ fontSize: 12, display: "block" }}>Ngày lập hợp đồng:</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Calendar size={14} />
                    {new Date(contract.source_created_at).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              )}
              {contract.pdf_sha256 && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <span className="muted-text" style={{ fontSize: 12, display: "block" }}>Mã băm toàn vẹn SHA-256 (PAdES Tamper-Proof):</span>
                  <code style={{ fontSize: 12, background: "var(--bg-card-subtle, #f1f5f9)", padding: "4px 8px", borderRadius: 4, wordBreak: "break-all" }}>
                    {contract.pdf_sha256}
                  </code>
                </div>
              )}
            </div>

            {/* Download/View action */}
            {(contract.final_pdf_url || contract.paper_scan_pdf_url) ? (
              <div style={{ paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a
                  href={downloadUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="primary-btn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 20px",
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 14,
                    textDecoration: "none",
                    pointerEvents: downloadUrl ? "auto" : "none",
                    opacity: downloadUrl ? 1 : 0.6,
                  }}
                >
                  <FileText size={16} />
                  Xem Hợp Đồng PDF
                </a>
                <a
                  href={downloadUrl || "#"}
                  download={`HopDong_${contract.contract_number}.pdf`}
                  className="ghost-btn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 20px",
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 14,
                    textDecoration: "none",
                    border: "1px solid var(--border)",
                    pointerEvents: downloadUrl ? "auto" : "none",
                    opacity: downloadUrl ? 1 : 0.6,
                  }}
                >
                  <Download size={16} />
                  Tải Bản PDF Lưu Trữ
                </a>
              </div>
            ) : (
              <div style={{ padding: "12px 16px", background: "var(--bg-card-subtle, #f8fafc)", borderRadius: 8, fontSize: 13, color: "var(--muted)" }}>
                Tệp PDF hợp đồng điện tử đang được xử lý đồng bộ từ hệ thống lưu trữ gốc.
              </div>
            )}
          </section>

          {/* Legal Compliance Card */}
          <section className="card" style={{ background: "rgba(37, 99, 235, 0.03)", border: "1px solid rgba(37, 99, 235, 0.15)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1d4ed8", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={18} />
              Giá Trị Pháp Lý Hợp Đồng Điện Tử
            </h3>
            <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: 0 }}>
              Hợp đồng được ký số bởi Công ty TNHH MTV đầu tư Minh Phong bằng Chứng thư số Viettel-CA và được Bên B (Khách hàng) xác nhận theo đúng quy định của Luật Giao dịch Điện tử số 20/2023/QH15. Tệp PDF có giá trị pháp lý tương đương bản hợp đồng giấy truyền thống có đóng dấu đỏ.
            </p>
          </section>
        </div>
      ) : (
        <section className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <AlertCircle size={44} color="var(--muted)" style={{ margin: "0 auto 12px" }} />
          <h2 style={{ fontSize: 17, marginBottom: 8 }}>Chưa Có Thông Tin Hợp Đồng Điện Tử</h2>
          <p className="muted-text" style={{ fontSize: 14, maxWidth: 480, margin: "0 auto 20px", lineHeight: 1.6 }}>
            Hồ sơ khách hàng <strong>{customer?.customer_code}</strong> ({customer?.full_name}) hiện đang sử dụng hợp đồng cấp nước theo hình thức lưu trữ hồ sơ giấy hoặc đang trong quá trình số hóa.
          </p>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            Nếu Quý khách có nhu cầu chuyển đổi sang Hợp đồng điện tử có chứng thư số, vui lòng liên hệ Hotline: <strong>0359 613 267</strong>.
          </div>
        </section>
      )}
    </main>
  );
}
