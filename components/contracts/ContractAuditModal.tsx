"use client";

import React from "react";
import {
  Clock,
  ShieldCheck,
  X,
  User,
  Monitor,
  FileCheck2,
  ExternalLink,
} from "lucide-react";
import type { ContractDetails, ContractAuditLogItem } from "@/lib/erp-api";

interface ContractAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract?: ContractDetails | null;
  logs?: ContractAuditLogItem[];
  onOpenCertModal?: () => void;
}

const ACTION_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  company_signed: { bg: "#ecfdf5", text: "#059669", border: "#a7f3d0", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  completed: { bg: "#ecfdf5", text: "#047857", border: "#6ee7b7", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  customer_signed: { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  b2b_token_signed: { bg: "#eef2ff", text: "#4f46e5", border: "#c7d2fe", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  rejected: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca", badge: "bg-rose-50 text-rose-700 border-rose-200" },
  viewed: { bg: "#faf5ff", text: "#7c3aed", border: "#e9d5ff", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  portal_viewed: { bg: "#faf5ff", text: "#7c3aed", border: "#e9d5ff", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  otp_requested: { bg: "#fffbeb", text: "#d97706", border: "#fde68a", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  notification_sent: { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  email_delivered: { bg: "#f0fdfa", text: "#0d9488", border: "#99f6e4", badge: "bg-teal-50 text-teal-700 border-teal-200" },
  created: { bg: "#f8fafc", text: "#475569", border: "#cbd5e1", badge: "bg-slate-50 text-slate-700 border-slate-200" },
};

const ACTION_DEFAULT_LABELS: Record<string, string> = {
  created: "Khởi tạo hồ sơ hợp đồng điện tử",
  company_signed: "Bên A (Minh Phong) hoàn tất ký số Viettel-CA",
  notification_sent: "Hệ thống phát hành thông báo ký qua Email / Zalo ZNS",
  viewed: "Khách hàng mở xem văn bản hợp đồng",
  portal_viewed: "Khách hàng truy cập Cổng ký số trực tuyến",
  otp_requested: "Khách hàng yêu cầu gửi mã OTP xác thực ký số",
  customer_signed: "Khách hàng (Bên B) hoàn tất ký tay & xác thực OTP",
  b2b_token_signed: "Đại diện doanh nghiệp hoàn tất ký số USB Token PKCS#7",
  rejected: "Khách hàng từ chối ký kết hợp đồng",
  completed: "Giao kết thành công & Kích hoạt hiệu lực hợp đồng",
  email_delivered: "Hệ thống gửi bản sao lưu hợp đồng hoàn tất qua Email",
};

function formatActionLabel(action: string, rawLabel?: string | null): string {
  if (rawLabel && !rawLabel.includes("??")) {
    return rawLabel;
  }
  return ACTION_DEFAULT_LABELS[action] || rawLabel || action;
}

export function ContractAuditModal({
  isOpen,
  onClose,
  contract,
  logs = [],
  onOpenCertModal,
}: ContractAuditModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 20,
          width: "100%",
          maxWidth: 620,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "16px 20px",
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            borderBottom: "1px solid #334155",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: "rgba(37, 99, 235, 0.2)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#60a5fa",
              }}
            >
              <Clock size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#f8fafc" }}>
                Nhật Ký Giao Kết & Kiểm Toán Chữ Ký (Audit Trail)
              </h3>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: "2px 0 0" }}>
                Hợp đồng số: <strong style={{ color: "#38bdf8" }}>{contract?.contractNumber}</strong> • Khách hàng: {contract?.customer?.fullName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "#cbd5e1",
              borderRadius: 8,
              padding: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>

        {/* Security & Integrity Summary Bar */}
        <div
          style={{
            padding: "10px 20px",
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#16a34a", fontWeight: 600 }}>
            <ShieldCheck size={16} />
            <span>Chuẩn ký số PAdES ISO 32000-1 (Bảo mật thời gian thực)</span>
          </div>

          {onOpenCertModal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCertModal();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#2563eb",
                padding: "4px 8px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <span>Xem Chứng Thư Số</span>
              <ExternalLink size={11} />
            </button>
          )}
        </div>

        {/* Audit Timeline Body */}
        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {logs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
              <Clock size={36} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
              <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Chưa có nhật ký hoạt động nào cho hợp đồng này.</p>
            </div>
          ) : (
            <div style={{ position: "relative", paddingLeft: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Vertical connecting line */}
              <div
                style={{
                  position: "absolute",
                  left: 8,
                  top: 8,
                  bottom: 8,
                  width: 2,
                  backgroundColor: "#e2e8f0",
                }}
              />

              {logs.map((log, index) => {
                const style = ACTION_COLORS[log.action] || {
                  bg: "#f8fafc",
                  text: "#475569",
                  border: "#cbd5e1",
                  badge: "bg-slate-50 text-slate-700 border-slate-200",
                };

                const dateStr = log.created_at
                  ? new Date(log.created_at).toLocaleString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "";

                return (
                  <div key={log.id || index} style={{ position: "relative", display: "flex", flexDirection: "column", gap: 4 }}>
                    {/* Node circle */}
                    <div
                      style={{
                        position: "absolute",
                        left: -24,
                        top: 2,
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        backgroundColor: style.bg,
                        border: `2px solid ${style.text}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 2,
                      }}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: style.text }} />
                    </div>

                    {/* Step Title & Timestamp */}
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: style.text }}>
                        {formatActionLabel(log.action, log.action_label)}
                      </span>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontFamily: "monospace",
                          color: "#64748b",
                          backgroundColor: "#f1f5f9",
                          padding: "2px 6px",
                          borderRadius: 4,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {dateStr}
                      </span>
                    </div>

                    {/* Meta Info: Actor, IP address, Device */}
                    <div
                      style={{
                        fontSize: 12,
                        color: "#475569",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 12,
                        alignItems: "center",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #f1f5f9",
                        borderRadius: 8,
                        padding: "6px 10px",
                        marginTop: 2,
                      }}
                    >
                      {log.actor_name && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <User size={12} color="#2563eb" />
                          <strong>Thực hiện:</strong> {log.actor_name}
                        </span>
                      )}
                      {log.ip_address && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <Monitor size={12} color="#059669" />
                          <strong>Địa chỉ IP:</strong> {log.ip_address}
                        </span>
                      )}
                      {log.actor_identifier && (
                        <span style={{ color: "#64748b" }}>
                          ({log.actor_identifier})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "12px 20px",
            backgroundColor: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
            <FileCheck2 size={16} color="#0284c7" />
            <span>Toàn bộ bản ghi kiểm toán được niêm phong chống sửa đổi</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              padding: "8px 18px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
