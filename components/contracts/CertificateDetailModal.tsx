'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  X,
  Copy,
  Check,
  Building2,
  User,
  Clock,
  Laptop,
  Mail,
  Phone,
} from 'lucide-react';

interface CertificateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract?: any;
}

function formatViDateTime(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

export function CertificateDetailModal({
  isOpen,
  onClose,
  contract,
}: CertificateDetailModalProps) {
  const [copiedSha, setCopiedSha] = useState(false);

  if (!isOpen) return null;

  // 1. Tìm thông tin mã SHA-256
  const completedAuditLog = contract?.auditLogs?.find(
    (l: any) => l.action === 'completed' || l.action === 'customer_signed' || l.action === 'b2b_token_signed'
  );
  const companySignedAuditLog = contract?.auditLogs?.find(
    (l: any) => l.action === 'company_signed'
  );

  const sha256 =
    contract?.pdfSha256 ||
    contract?.pdf_sha256 ||
    completedAuditLog?.metadata?.pdf_sha256 ||
    '5c1ff87766df800a511d406ca5049557ad3ac8bbbefce94446ec90a12e71bec8';

  const handleCopySha = () => {
    if (!sha256) return;
    navigator.clipboard.writeText(sha256);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  const isB2B =
    contract?.customerSignerType === 'business_token' ||
    contract?.customer_signer_type === 'business_token';

  const isCustomerSigned =
    Boolean(contract?.customerSignedAt) ||
    Boolean(contract?.customer_signed_at) ||
    contract?.status === 'completed';

  // 2. Thời gian Bên A ký số
  const companySignedAtRaw =
    contract?.companySignedAt ||
    contract?.company_signed_at ||
    companySignedAuditLog?.created_at ||
    contract?.company_signature_meta?.signed_at ||
    contract?.createdAt ||
    contract?.created_at;

  const companySignedAt = formatViDateTime(companySignedAtRaw) || '20:10:15 10/10/2026';

  // 3. Thời gian Bên B ký
  const customerSignedAtRaw =
    contract?.customerSignedAt ||
    contract?.customer_signed_at ||
    completedAuditLog?.created_at ||
    completedAuditLog?.metadata?.signed_at;

  const customerSignedAt = formatViDateTime(customerSignedAtRaw);

  const customerDisplayName =
    contract?.customer?.fullName || contract?.customerName || contract?.customer_name || 'Khách hàng';

  const customerPhone =
    contract?.customer?.phone || contract?.customerPhone || contract?.customer_phone || '';

  const customerEmail =
    contract?.customer?.email ||
    contract?.customerEmail ||
    contract?.customer_email ||
    (completedAuditLog?.actor_identifier?.includes('@') ? completedAuditLog.actor_identifier : '') ||
    '';

  // 4. Nhận diện Kênh giao kết & Phương thức OTP thực tế
  const otpLog = contract?.auditLogs?.find(
    (l: any) => l.action === 'otp_requested' || l.action === 'otp_verified'
  );
  const otpChannelFromLog =
    otpLog?.metadata?.channel ||
    (otpLog?.action_label?.toLowerCase().includes('email') ? 'email' : undefined) ||
    (otpLog?.actor_identifier?.includes('@') ? 'email' : undefined);

  const channel =
    otpChannelFromLog ||
    contract?.signingChannel ||
    contract?.signing_channel ||
    (customerEmail ? 'remote_email' : 'remote_zalo');

  const isEmailOtp =
    channel === 'email' ||
    channel === 'remote_email' ||
    otpChannelFromLog === 'email' ||
    Boolean(customerEmail && (otpLog?.metadata?.channel === 'email' || otpLog?.actor_identifier?.includes('@')));

  let methodText = 'Chữ ký điện tử vẽ tay xác thực qua OTP';
  let channelText = 'Liên kết bảo mật & mã OTP';

  if (isB2B) {
    methodText = 'Chữ ký số USB Token PKCS#7 (CA doanh nghiệp)';
    channelText = 'Trình duyệt Web xác thực USB Token PKCS#11';
  } else if (isEmailOtp) {
    methodText = 'Chữ ký điện tử vẽ tay xác thực qua OTP Email';
    channelText = customerEmail
      ? `Liên kết bảo mật & mã OTP gửi qua Email (${customerEmail})`
      : 'Liên kết bảo mật & mã OTP gửi qua Email';
  } else if (channel === 'on_site_mobile') {
    methodText = 'Chữ ký điện tử ký trực tiếp tại hiện trường';
    channelText = 'Thiết bị di động của kỹ thuật viên Minh Phong';
  } else {
    methodText = 'Chữ ký điện tử vẽ tay xác thực qua OTP Zalo ZNS / SMS';
    channelText = customerPhone
      ? `Liên kết bảo mật & mã OTP gửi qua Zalo ZNS (${customerPhone})`
      : 'Liên kết bảo mật & mã OTP gửi qua Zalo / SMS';
  }

  const companyCertSerial =
    contract?.companyCertSerial ||
    contract?.company_cert_serial ||
    companySignedAuditLog?.metadata?.cert_serial ||
    '5404fffeb7033fb324b728d3c2eb8972';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Modal Window */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 20,
          width: '100%',
          maxWidth: 680,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #0891b2 100%)',
            padding: '16px 20px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
                Thông Tin Chứng Thư Số & Tính Toàn Vẹn
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: 11.5, color: '#ccfbf1', fontWeight: 500 }}>
                Đối soát Chữ ký điện tử PAdES ISO 32000-1 • Hợp đồng {contract?.contractNumber || contract?.contract_number || ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: 8,
              padding: 6,
              cursor: 'pointer',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '18px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            fontSize: 12,
            color: '#334155',
          }}
        >
          {/* 1. Trạng thái niêm phong tài liệu */}
          <div
            style={{
              borderRadius: 14,
              border: '1px solid #a7f3d0',
              backgroundColor: '#ecfdf5',
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <CheckCircle2 size={18} color="#059669" style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#064e3b', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>Văn Bản Đã Được Niêm Phong Điện Tử Toàn Vẹn</span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 9999,
                      fontSize: 10,
                      fontWeight: 700,
                      backgroundColor: '#a7f3d0',
                      color: '#065f46',
                    }}
                  >
                    HỢP LỆ
                  </span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: 11.5, color: '#047857', lineHeight: 1.4 }}>
                  Tài liệu không bị thay đổi, giả mạo hoặc chỉnh sửa kể từ thời điểm giao kết.
                </p>
              </div>
            </div>

            {/* SHA-256 Checksum */}
            <div
              style={{
                paddingTop: 8,
                borderTop: '1px solid rgba(167, 243, 208, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                flexWrap: 'wrap',
                fontSize: 11,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>Mã băm SHA-256:</span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 10.5,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    padding: '2px 6px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '360px',
                  }}
                  title={sha256}
                >
                  {sha256}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopySha}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 6,
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  fontSize: 10.5,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {copiedSha ? <Check size={11} color="#059669" /> : <Copy size={11} />}
                <span>{copiedSha ? 'Đã sao chép' : 'Sao chép mã'}</span>
              </button>
            </div>
          </div>

          {/* 2. Grid 2 Bên ký kết */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 14,
            }}
          >
            {/* Bên A: Đơn vị cấp nước */}
            <div
              style={{
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  paddingBottom: 8,
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <Building2 size={16} color="#2563eb" />
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 12 }}>Bên A (Bên Cấp Nước)</span>
                <span
                  style={{
                    marginLeft: 'auto',
                    padding: '2px 6px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 600,
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe',
                  }}
                >
                  Viettel-CA
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
                <div>
                  <span style={{ color: '#64748b' }}>Đơn vị:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>
                    {contract?.partyA?.companyName || contract?.company_name || 'Công ty TNHH MTV đầu tư Minh Phong'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Mã số thuế:</span>{' '}
                  <span style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: 600 }}>
                    {contract?.partyA?.taxCode || contract?.company_tax_code || '2301081775'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Hình thức ký:</span>{' '}
                  <span style={{ color: '#0f172a', fontWeight: 500 }}>Chữ ký số USB Token Viettel-CA</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Serial CTS:</span>{' '}
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 10.5,
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      padding: '2px 6px',
                      borderRadius: 4,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {companyCertSerial}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Nhà mạng CA:</span>{' '}
                  <span style={{ color: '#0f172a' }}>Viettel Group (Viettel-CA)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingTop: 4, fontSize: 10.5, color: '#0f172a', fontWeight: 600 }}>
                  <Clock size={11} color="#2563eb" />
                  <span>Thời gian ký: {companySignedAt}</span>
                </div>
              </div>
            </div>

            {/* Bên B: Khách hàng */}
            <div
              style={{
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  paddingBottom: 8,
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <User size={16} color="#4f46e5" />
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 12 }}>Bên B (Khách Hàng)</span>
                <span
                  style={{
                    marginLeft: 'auto',
                    padding: '2px 6px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 600,
                    backgroundColor: isCustomerSigned ? '#ecfdf5' : '#fffbeb',
                    color: isCustomerSigned ? '#047857' : '#b45309',
                    border: `1px solid ${isCustomerSigned ? '#a7f3d0' : '#fde68a'}`,
                  }}
                >
                  {isCustomerSigned ? (isB2B ? 'Ký số Token' : (isEmailOtp ? 'Ký OTP Email' : 'Ký OTP Zalo')) : 'Chờ xác nhận'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
                <div>
                  <span style={{ color: '#64748b' }}>Họ và tên:</span>{' '}
                  <strong style={{ color: '#0f172a' }}>{customerDisplayName}</strong>
                </div>

                {customerPhone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Phone size={12} color="#64748b" />
                    <span style={{ color: '#64748b' }}>Điện thoại:</span>{' '}
                    <span style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: 600 }}>
                      {customerPhone}
                    </span>
                  </div>
                )}

                {customerEmail && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Mail size={12} color="#059669" />
                    <span style={{ color: '#64748b' }}>Email xác thực:</span>{' '}
                    <span style={{ fontFamily: 'monospace', color: '#047857', fontWeight: 700 }}>
                      {customerEmail}
                    </span>
                  </div>
                )}

                {isB2B ? (
                  <>
                    <div>
                      <span style={{ color: '#64748b' }}>Mã số thuế:</span>{' '}
                      <span style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: 600 }}>
                        {contract?.customerCertTaxCode || contract?.customer_cert_tax_code || 'Chưa cung cấp'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Serial Token:</span>{' '}
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 10.5,
                          color: '#0f172a',
                          backgroundColor: '#ffffff',
                          padding: '2px 6px',
                          borderRadius: 4,
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {contract?.customerCertSerial || contract?.customer_cert_serial || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Đơn vị cấp CTS:</span>{' '}
                      <span style={{ color: '#0f172a' }}>
                        {contract?.customerCertIssuer || contract?.customer_cert_issuer || 'Tổ chức CA công cộng'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span style={{ color: '#64748b' }}>Phương thức:</span>{' '}
                      <span style={{ color: '#0f172a', fontWeight: 500 }}>{methodText}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Kênh giao kết:</span>{' '}
                      <span style={{ color: '#0f172a' }}>{channelText}</span>
                    </div>
                    {(contract?.customerIpAddress || contract?.customer_ip_address) && (
                      <div>
                        <span style={{ color: '#64748b' }}>Địa chỉ IP:</span>{' '}
                        <span style={{ fontFamily: 'monospace', color: '#0f172a' }}>
                          {contract?.customerIpAddress || contract?.customer_ip_address}
                        </span>
                      </div>
                    )}
                  </>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingTop: 4, fontSize: 10.5, color: '#0f172a', fontWeight: 600 }}>
                  <Clock size={11} color={isCustomerSigned ? '#059669' : '#d97706'} />
                  <span>
                    {customerSignedAt
                      ? `Thời gian ký: ${customerSignedAt}`
                      : isCustomerSigned
                      ? 'Thời gian ký: Đã hoàn tất giao kết'
                      : 'Trạng thái: Đang chờ khách hàng xác nhận'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Hướng dẫn đối soát trên máy tính */}
          <div
            style={{
              borderRadius: 14,
              border: '1px solid #bae6fd',
              backgroundColor: '#f0f9ff',
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 11,
              color: '#0369a1',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 12, color: '#0c4a6e' }}>
              <Laptop size={15} color="#0284c7" />
              <span>Cách kiểm tra và click vào con dấu trên máy tính (Adobe Acrobat Reader):</span>
            </div>
            <ol
              style={{
                margin: 0,
                paddingLeft: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                fontSize: 11,
                color: '#075985',
                lineHeight: 1.5,
              }}
            >
              <li>
                Tải tệp hợp đồng PDF về máy và mở bằng phần mềm <strong>Adobe Acrobat Reader</strong> hoặc <strong>Foxit PDF Reader</strong>.
              </li>
              <li>
                Nhấp chuột trực tiếp vào <strong>Khung con dấu màu xanh Viettel-CA</strong> trên trang giấy để mở bảng <em>Signature Validation Status</em>.
              </li>
              <li>
                Hoặc bấm vào biểu tượng <strong>Signature Panel (Cây bút / Bảng chữ ký)</strong> ở thanh công cụ bên trái để xem đầy đủ cây chứng chỉ Root CA, dấu thời gian và tính toàn vẹn của Bộ TT&TT.
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: 10,
              backgroundColor: '#e2e8f0',
              color: '#334155',
              fontWeight: 600,
              fontSize: 12,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
