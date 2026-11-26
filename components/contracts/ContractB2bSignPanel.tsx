"use client";

import React from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { ContractDetails } from "@/lib/erp-api";

export interface CaProviderOption {
  id: string;
  name: string;
}

export interface ContractB2bSignPanelProps {
  variant?: "sidebar" | "modal";
  contract: ContractDetails | null;
  isDev: boolean;
  signing: boolean;
  isConnectingUsb: boolean;
  consentLegal: boolean;
  onConsentLegalChange: (checked: boolean) => void;
  formError: string | null;
  onClearFormError: () => void;

  // B2B Email OTP
  b2bOtpCode: string;
  onB2bOtpCodeChange: (value: string) => void;
  b2bOtpVerified: boolean;
  b2bOtpVerifiedAt: string | null;
  b2bOtpSending: boolean;
  b2bOtpVerifying: boolean;
  b2bOtpCooldown: number;
  b2bOtpMessage: string | null;
  b2bOtpError: string | null;
  onSendB2bOtp: () => void;
  onVerifyB2bOtp: () => void;

  // USB Token & Cert
  b2bTaxCode: string;
  onTaxCodeChange: (value: string) => void;
  selectedCaProvider: string;
  onCaProviderChange: (value: string) => void;
  caProviders: ReadonlyArray<CaProviderOption>;
  b2bCompanyName: string;
  b2bCertSerial: string;
  b2bCertIssuer: string;
  b2bCertValidRange: string;
  b2bCertIsExpired: boolean;
  b2bCertBase64: string;
  usbStatus: string | null;
  usbStatusType: "idle" | "connecting" | "success" | "error";
  b2bSignMethod: "usb" | "manual";
  b2bSignatureBase64: string;
  onSignatureBase64Change: (value: string) => void;
  onConnectUsbToken: () => void;
  onSignBusiness: () => void;
  onFillDevMock: () => void;
  onDevMockSignB2b: (autoSubmit: boolean) => void;
  onCloseModal?: () => void;
}

export function ContractB2bSignPanel({
  variant = "sidebar",
  contract,
  isDev,
  signing,
  isConnectingUsb,
  consentLegal,
  onConsentLegalChange,
  formError,
  onClearFormError,
  b2bOtpCode,
  onB2bOtpCodeChange,
  b2bOtpVerified,
  b2bOtpVerifiedAt,
  b2bOtpSending,
  b2bOtpVerifying,
  b2bOtpCooldown,
  b2bOtpMessage,
  b2bOtpError,
  onSendB2bOtp,
  onVerifyB2bOtp,
  b2bTaxCode,
  onTaxCodeChange,
  selectedCaProvider,
  onCaProviderChange,
  caProviders,
  b2bCompanyName,
  b2bCertSerial,
  b2bCertIssuer,
  b2bCertValidRange,
  b2bCertIsExpired,
  b2bCertBase64,
  usbStatus,
  usbStatusType,
  b2bSignMethod,
  b2bSignatureBase64,
  onSignatureBase64Change,
  onConnectUsbToken,
  onSignBusiness,
  onFillDevMock,
  onDevMockSignB2b,
  onCloseModal,
}: ContractB2bSignPanelProps) {
  const isModal = variant === "modal";
  const isSignLocked =
    signing || isConnectingUsb || !b2bOtpVerified || !consentLegal || b2bCertIsExpired;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* BƯỚC 1: XÁC THỰC OTP EMAIL B2B */}
      <div
        style={{
          background: b2bOtpVerified ? "#f0fdf4" : "#eff6ff",
          border: `1px solid ${b2bOtpVerified ? "#86efac" : "#bfdbfe"}`,
          borderRadius: 10,
          padding: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 6,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {b2bOtpVerified ? (
              <CheckCircle2 size={15} color="#16a34a" />
            ) : (
              <Mail size={15} color="#2563eb" />
            )}
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: b2bOtpVerified ? "#166534" : "#1e40af",
              }}
            >
              1. Xác thực OTP Email doanh nghiệp
            </span>
          </div>
          {b2bOtpVerified && (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                background: "#dcfce7",
                color: "#15803d",
                border: "1px solid #86efac",
                padding: "2px 8px",
                borderRadius: 999,
              }}
            >
              Đã xác thực OTP Email
            </span>
          )}
        </div>

        <p style={{ margin: "0 0 10px", fontSize: 11.5, color: "#334155", lineHeight: 1.45 }}>
          {b2bOtpVerified
            ? `Email ${contract?.customer?.email || "đăng ký"} đã xác thực hợp lệ${
                b2bOtpVerifiedAt
                  ? ` lúc ${new Date(b2bOtpVerifiedAt).toLocaleTimeString("vi-VN")}`
                  : ""
              }. Quý khách có thể tiếp tục cắm USB Token để ký số.`
            : `Nhận mã OTP qua email ${
                contract?.customer?.email ? `(${contract.customer.email})` : "đăng ký"
              } để mở khóa thao tác ký số USB Token.`}
        </p>

        {!b2bOtpVerified && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              type="button"
              onClick={onSendB2bOtp}
              disabled={b2bOtpCooldown > 0 || b2bOtpSending}
              style={{
                width: "100%",
                background: b2bOtpCooldown > 0 || b2bOtpSending ? "#cbd5e1" : "#2563eb",
                color: b2bOtpCooldown > 0 || b2bOtpSending ? "#475569" : "#ffffff",
                border: "none",
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: b2bOtpCooldown > 0 || b2bOtpSending ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {b2bOtpSending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang gửi mã OTP...</span>
                </>
              ) : b2bOtpCooldown > 0 ? (
                <>
                  <Clock size={14} />
                  <span>Gửi lại mã OTP ({b2bOtpCooldown}s)</span>
                </>
              ) : (
                <>
                  <Mail size={14} />
                  <span>Gửi mã OTP qua Email</span>
                </>
              )}
            </button>

            <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Nhập 6 số OTP"
                value={b2bOtpCode}
                maxLength={6}
                onChange={(e) => {
                  onB2bOtpCodeChange(e.target.value.replace(/\D/g, ""));
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: b2bOtpError ? "1.5px solid #ef4444" : "1px solid #93c5fd",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textAlign: "center",
                  background: "#ffffff",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={onVerifyB2bOtp}
                disabled={b2bOtpVerifying || b2bOtpCode.trim().length < 6}
                style={{
                  flexShrink: 0,
                  background:
                    b2bOtpVerifying || b2bOtpCode.trim().length < 6 ? "#e2e8f0" : "#0f766e",
                  color:
                    b2bOtpVerifying || b2bOtpCode.trim().length < 6 ? "#64748b" : "#ffffff",
                  border: "none",
                  padding: "8px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor:
                    b2bOtpVerifying || b2bOtpCode.trim().length < 6
                      ? "not-allowed"
                      : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  whiteSpace: "nowrap",
                }}
              >
                {b2bOtpVerifying ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Đang kiểm tra...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={13} />
                    <span>Xác nhận OTP</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {b2bOtpMessage && (
          <p style={{ margin: "6px 0 0", fontSize: 11, color: "#15803d", fontWeight: 500 }}>
            {b2bOtpMessage}
          </p>
        )}
        {b2bOtpError && (
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 11.5,
              color: "#b91c1c",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <AlertCircle size={13} style={{ flexShrink: 0 }} />
            <span>{b2bOtpError}</span>
          </p>
        )}
      </div>

      {/* BƯỚC 2: THÔNG TIN DOANH NGHIỆP & KẾT NỐI USB TOKEN */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            color: "#334155",
            marginBottom: 4,
          }}
        >
          Mã số thuế doanh nghiệp (*):
        </label>
        <input
          type="text"
          placeholder="Ví dụ: 2301081775"
          value={b2bTaxCode}
          onChange={(e) => {
            onTaxCodeChange(e.target.value.trim());
            if (formError) onClearFormError();
          }}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 6,
            border: !b2bTaxCode && formError ? "1.5px solid #ef4444" : "1px solid #cbd5e1",
            fontSize: 13,
            fontWeight: 600,
          }}
        />
      </div>

      <div>
        <label
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            color: "#334155",
            marginBottom: 4,
          }}
        >
          Nhà cung cấp chữ ký số (CA):
        </label>
        <select
          value={selectedCaProvider}
          onChange={(e) => onCaProviderChange(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid #cbd5e1",
            fontSize: 13,
            fontWeight: 500,
            backgroundColor: "#ffffff",
            color: "#1e293b",
          }}
        >
          {caProviders.map((ca) => (
            <option key={ca.id} value={ca.id}>
              {ca.name}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 11, color: "#64748b", marginTop: 2, display: "block" }}>
          Hỗ trợ tất cả các nhà cung cấp: VNPT, Viettel, FPT, BKAV, MISA...
        </span>
      </div>

      <button
        type="button"
        onClick={onConnectUsbToken}
        disabled={isConnectingUsb || signing}
        style={{
          background: isConnectingUsb ? "#f1f5f9" : "#f8fafc",
          border: "1px solid #cbd5e1",
          padding: isModal ? "9px 12px" : "10px 14px",
          borderRadius: 8,
          fontSize: isModal ? 12 : 13,
          fontWeight: 600,
          color: isConnectingUsb ? "#64748b" : "#1e293b",
          cursor: isConnectingUsb ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: isModal ? 6 : 8,
          transition: "all 0.15s ease",
        }}
      >
        {isConnectingUsb ? (
          <>
            <RefreshCw size={isModal ? 14 : 15} className="animate-spin" color="#2563eb" />
            <span>Đang dò tìm thiết bị USB Token...</span>
          </>
        ) : (
          <>
            <Building2 size={isModal ? 15 : 16} color="#2563eb" />
            <span>
              {b2bCertBase64
                ? "Đọc Lại Chứng Thư USB Token"
                : "Kết Nối USB Token Chữ Ký Số"}
            </span>
          </>
        )}
      </button>

      {/* Phản hồi trạng thái USB Token */}
      {usbStatusType === "error" ? (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 12,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: "#92400e",
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginBottom: 4,
            }}
          >
            <AlertCircle size={15} />
            Chưa kết nối được phần mềm ký số USB Token
          </div>
          <p style={{ margin: "0 0 6px", color: "#78350f", lineHeight: 1.4, fontSize: 11 }}>
            {usbStatus ||
              "Vui lòng cắm USB Token và bật phần mềm ký số (Viettel-CA SignPlugin, VNPT-CA, FPT-CA, BKAV, MISA...)."}
          </p>
          <div
            style={{
              background: "#fef3c7",
              borderRadius: 6,
              padding: "6px 8px",
              marginBottom: isDev ? 8 : 0,
              fontSize: 10.5,
              color: "#92400e",
              lineHeight: 1.4,
            }}
          >
            <strong>💡 Nếu đã bật SignPlugin mà vẫn báo lỗi trên Chrome/Edge mới:</strong>
            <div>
              1. Bấm biểu tượng <strong>Cài đặt (Tune/Ổ khóa)</strong> cạnh thanh địa chỉ URL → Bật{" "}
              <strong>&quot;Ứng dụng trên thiết bị&quot; (Local network)</strong> sang{" "}
              <strong>Cho phép</strong>.
            </div>
            <div>
              2. Hoặc mở <code>chrome://flags/#local-network-access-check</code> → chọn{" "}
              <strong>Disabled</strong> → <strong>Relaunch</strong>.
            </div>
          </div>
          {isDev && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={onFillDevMock}
                style={{
                  background: "#ffffff",
                  color: "#b45309",
                  border: "1px solid #d97706",
                  padding: "5px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ⚡ Tự Động Nạp Chữ Ký Test
              </button>
              <button
                type="button"
                onClick={() => onDevMockSignB2b(true)}
                disabled={signing}
                style={{
                  background: "#d97706",
                  color: "#ffffff",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: signing ? "not-allowed" : "pointer",
                }}
              >
                ⚡ Ký Giả Lập 1-Click
              </button>
            </div>
          )}
        </div>
      ) : b2bCertIsExpired ? (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: "10px 12px",
            color: "#991b1b",
            fontSize: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
            <span>Chứng thư số USB Token đã hết hạn!</span>
          </div>
          <div style={{ fontSize: 11, lineHeight: 1.5, color: "#b91c1c", paddingLeft: 21 }}>
            <div>
              <strong>Đơn vị:</strong> {b2bCompanyName}
            </div>
            <div>
              <strong>Serial:</strong>{" "}
              <code style={{ fontSize: 10.5 }}>{b2bCertSerial}</code>
            </div>
            <div>
              <strong>Thời hạn:</strong>{" "}
              <span style={{ textDecoration: "line-through" }}>{b2bCertValidRange}</span> (ĐÃ
              HẾT HẠN)
            </div>
            <div style={{ marginTop: 4, fontWeight: 600 }}>
              ⚠️ Vui lòng cắm đúng USB Token còn hạn, nhấn &quot;Kết Nối USB Token&quot; và chọn
              chứng thư số mới.
            </div>
          </div>
        </div>
      ) : usbStatusType === "success" ? (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 8,
            padding: "10px 12px",
            color: "#166534",
            fontSize: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            <CheckCircle2 size={15} color="#16a34a" style={{ flexShrink: 0 }} />
            <span>Đã kết nối Chứng thư số USB Token</span>
          </div>
          {b2bCertSerial ? (
            <div style={{ fontSize: 11, lineHeight: 1.5, color: "#15803d", paddingLeft: 21 }}>
              <div>
                <strong>Đơn vị:</strong> {b2bCompanyName}
              </div>
              <div>
                <strong>MST:</strong> {b2bTaxCode} | <strong>Serial:</strong>{" "}
                <code style={{ fontSize: 10.5 }}>{b2bCertSerial}</code>
              </div>
              <div>
                <strong>Nhà cung cấp:</strong> {b2bCertIssuer || "CA"}
                {b2bCertValidRange ? ` (${b2bCertValidRange})` : ""}
              </div>
              <div style={{ marginTop: 4, color: "#047857", fontWeight: 600 }}>
                👉 Nhấn &quot;Ký số bằng USB Token&quot; bên dưới để nhập mã PIN và hoàn tất ký.
              </div>
            </div>
          ) : (
            <div style={{ paddingLeft: 21, fontSize: 11 }}>{usbStatus}</div>
          )}
        </div>
      ) : (
        usbStatus && (
          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: "#64748b",
              background: isModal ? "transparent" : "#f1f5f9",
              padding: isModal ? 0 : 8,
              borderRadius: 6,
            }}
          >
            {usbStatus}
          </p>
        )
      )}

      {b2bSignMethod === "manual" && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <label style={{ fontSize: 11, fontWeight: 600, color: "#334155" }}>
              Chuỗi chữ ký PKCS#7 Base64:
            </label>
            {isDev && (
              <button
                type="button"
                onClick={onFillDevMock}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#2563eb",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                Nạp chuỗi test
              </button>
            )}
          </div>
          <textarea
            rows={3}
            placeholder="Dán chuỗi chữ ký PKCS#7 Base64 tại đây..."
            value={b2bSignatureBase64}
            onChange={(e) => {
              onSignatureBase64Change(e.target.value.trim());
              if (formError) onClearFormError();
            }}
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: 6,
              border:
                !b2bSignatureBase64 && formError ? "1.5px solid #ef4444" : "1px solid #cbd5e1",
              fontSize: 11,
              fontFamily: "monospace",
            }}
          />
        </div>
      )}

      {formError && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: "8px 12px",
            color: "#b91c1c",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{formError}</span>
        </div>
      )}

      {/* Cam kết pháp lý bắt buộc */}
      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          cursor: "pointer",
          background: consentLegal ? "#f0fdf4" : "#f8fafc",
          border: consentLegal ? "1px solid #86efac" : "1px solid #e2e8f0",
          borderRadius: 8,
          padding: "8px 10px",
          marginTop: 2,
          transition: "all 0.15s ease",
        }}
      >
        <input
          type="checkbox"
          checked={consentLegal}
          onChange={(e) => {
            onConsentLegalChange(e.target.checked);
            if (e.target.checked && formError?.includes("điều khoản")) {
              onClearFormError();
            }
          }}
          style={{
            marginTop: 2,
            cursor: "pointer",
            accentColor: "#2563eb",
            width: 15,
            height: 15,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 11.5, color: "#334155", lineHeight: 1.45 }}>
          Đại diện doanh nghiệp xác nhận đã đọc, hiểu rõ và đồng ý toàn bộ điều khoản Hợp đồng
          dịch vụ cấp nước và các quy định pháp luật về giao kết hợp đồng điện tử bằng chữ ký
          số.
        </span>
      </label>

      {(!b2bOtpVerified || !consentLegal) && (
        <p style={{ margin: 0, fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>
          {!b2bOtpVerified
            ? "🔒 Vui lòng xác thực OTP Email và đồng ý điều khoản để mở khóa nút ký số."
            : "🔒 Vui lòng tích chọn đồng ý điều khoản hợp đồng để thực hiện ký số."}
        </p>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: isModal ? 4 : 0 }}>
        {isModal && onCloseModal && (
          <button
            type="button"
            onClick={onCloseModal}
            style={{
              flex: 1,
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              color: "#475569",
              padding: "11px",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Đóng
          </button>
        )}
        <button
          type="button"
          onClick={onSignBusiness}
          disabled={isSignLocked}
          style={{
            flex: isModal ? 2 : undefined,
            width: isModal ? undefined : "100%",
            background: isSignLocked ? "#94a3b8" : "#2563eb",
            color: "#ffffff",
            border: "none",
            padding: isModal ? "11px" : "12px",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: isModal ? 13 : 14,
            cursor: isSignLocked ? "not-allowed" : "pointer",
            boxShadow: isSignLocked ? "none" : "0 4px 10px rgba(37,99,235,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: isModal ? 6 : 8,
          }}
        >
          {signing ? (
            <>
              <RefreshCw size={isModal ? 15 : 17} className="animate-spin" />
              <span>{isModal ? "Đang xử lý..." : "Đang xử lý ký số PAdES..."}</span>
            </>
          ) : (
            <>
              <ShieldCheck size={isModal ? 16 : 18} />
              <span>Ký số bằng USB Token</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
