"use client";

import {
  Clock,
  User,
  Monitor,
  Maximize2,
} from "lucide-react";
import type { ContractAuditLogItem } from "@/lib/erp-api";

interface ContractAuditTimelineProps {
  logs?: ContractAuditLogItem[];
  isLoading?: boolean;
  className?: string;
  onOpenDetailModal?: () => void;
}

const ACTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  company_signed: { bg: "#ecfdf5", text: "#059669", border: "#a7f3d0" },
  completed: { bg: "#ecfdf5", text: "#047857", border: "#6ee7b7" },
  customer_signed: { bg: "#f0f9ff", text: "#0284c7", border: "#bae6fd" },
  b2b_token_signed: { bg: "#eef2ff", text: "#4f46e5", border: "#c7d2fe" },
  rejected: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  viewed: { bg: "#faf5ff", text: "#7c3aed", border: "#e9d5ff" },
  portal_viewed: { bg: "#faf5ff", text: "#7c3aed", border: "#e9d5ff" },
  otp_requested: { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  notification_sent: { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
  email_delivered: { bg: "#f0fdfa", text: "#0d9488", border: "#99f6e4" },
};

const ACTION_DEFAULT_LABELS: Record<string, string> = {
  created: "Khởi tạo hồ sơ hợp đồng",
  company_signed: "Công ty ký số Viettel-CA",
  notification_sent: "Đã gửi thông báo ký số tới khách hàng",
  viewed: "Khách hàng mở xem hợp đồng",
  portal_viewed: "Khách hàng truy cập cổng ký số",
  otp_requested: "Khách hàng yêu cầu mã OTP xác thực",
  customer_signed: "Khách hàng hoàn tất ký xác nhận",
  b2b_token_signed: "Doanh nghiệp hoàn tất ký số USB Token",
  rejected: "Khách hàng từ chối ký hợp đồng",
  completed: "Hoàn tất giao kết & Kích hoạt dịch vụ",
  email_delivered: "Đã gửi bản hợp đồng hoàn tất qua Email",
};

function formatActionLabel(action: string, rawLabel?: string | null): string {
  if (rawLabel && !rawLabel.includes("??")) {
    return rawLabel;
  }
  return ACTION_DEFAULT_LABELS[action] || rawLabel || action;
}

export function ContractAuditTimeline({
  logs = [],
  isLoading = false,
  className = "",
  onOpenDetailModal,
}: ContractAuditTimelineProps) {
  if (isLoading) {
    return (
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }} className={className}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#e2e8f0" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ height: 12, background: "#e2e8f0", borderRadius: 4, width: "50%" }} />
              <div style={{ height: 10, background: "#f1f5f9", borderRadius: 4, width: "80%" }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 12 }} className={className}>
        <Clock size={28} style={{ margin: "0 auto 8px", opacity: 0.6 }} />
        <p style={{ margin: 0 }}>Chưa có nhật ký hoạt động nào.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "14px 16px" }} className={className}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h4
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#334155",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Clock size={14} color="#2563eb" />
          Lịch Sử Giao Kết ({logs.length})
        </h4>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {onOpenDetailModal && (
            <button
              type="button"
              onClick={onOpenDetailModal}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#2563eb",
                padding: "3px 7px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
              title="Phóng to xem đầy đủ toàn bộ lịch sử giao kết"
            >
              <Maximize2 size={11} />
              <span>Xem chi tiết</span>
            </button>
          )}
          <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#16a34a" }} />
            Bảo mật số
          </span>
        </div>
      </div>

      <div style={{ position: "relative", paddingLeft: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Đường kẻ dọc liên kết các bước */}
        <div
          style={{
            position: "absolute",
            left: 7,
            top: 6,
            bottom: 6,
            width: 2,
            backgroundColor: "#e2e8f0",
          }}
        />

        {logs.map((log) => {
          const style = ACTION_COLORS[log.action] || { bg: "#f8fafc", text: "#475569", border: "#cbd5e1" };

          const dateStr = log.created_at
            ? new Date(log.created_at).toLocaleString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : "";

          return (
            <div key={log.id} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Nút mốc tròn */}
              <div
                style={{
                  position: "absolute",
                  left: -22,
                  top: 0,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  backgroundColor: style.bg,
                  border: `2px solid ${style.text}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: style.text }} />
              </div>

              {/* Tiêu đề bước */}
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: style.text }}>
                  {formatActionLabel(log.action, log.action_label)}
                </span>
                <span style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>
                  {dateStr}
                </span>
              </div>

              {/* Thông tin chi tiết */}
              <div style={{ fontSize: 11, color: "#64748b", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {log.actor_name && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <User size={11} />
                    {log.actor_name}
                  </span>
                )}
                {log.ip_address && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Monitor size={11} />
                    IP: {log.ip_address}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
