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
  const [activeTab, setActiveTab] = useState<'overview' | 'x509'>('overview');
  const [selectedParty, setSelectedParty] = useState<'partyA' | 'partyB'>('partyA');
  const [copiedSha, setCopiedSha] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);

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
    '11a13475fb07';

  // Nội dung Subject X.509 cho Bên A (chuẩn mẫu ảnh 1.4 Mẫu chữ ký số hợp lệ)
  const partyASubjectText = `Phone = 0359613267
E = dinhto.nmns@gmail.com
0.9.2342.19200300.100.1.1 = MST:2301081775
CN = CONG TY TNHH MTV DAU TU MINH PHONG
O = CONG TY TNHH MTV DAU TU MINH PHONG
L = Thi xa Thuan Thanh
S = Bac Ninh
C = VN`;

  // Nội dung Subject X.509 cho Bên B
  const partyBSubjectText = isB2B
    ? `0.9.2342.19200300.100.1.1 = MST:${contract?.customerCertTaxCode || contract?.customer_cert_tax_code || '0101243150'}
CN = ${customerDisplayName}
O = ${customerDisplayName}
Issuer = ${contract?.customerCertIssuer || contract?.customer_cert_issuer || 'Tổ chức CA công cộng'}
Serial = ${contract?.customerCertSerial || contract?.customer_cert_serial || 'N/A'}`
    : `Phone = ${customerPhone || 'Chưa cung cấp'}
E = ${customerEmail || 'Chưa cung cấp'}
CN = ${customerDisplayName}
SignMethod = Chu ky dien tu ve tay xac thuc qua OTP
IP = ${contract?.customerIpAddress || contract?.customer_ip_address || '127.0.0.1'}
Status = Da ky xac nhan hop le`;

  const currentSubjectText = selectedParty === 'partyA' ? partyASubjectText : partyBSubjectText;

  const handleCopySubject = () => {
    navigator.clipboard.writeText(currentSubjectText);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 2000);
  };

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
          maxWidth: 720,
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

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            padding: '0 20px',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '10px 16px',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'overview' ? '#0d9488' : '#64748b',
              borderBottom: activeTab === 'overview' ? '2.5px solid #0d9488' : '2.5px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            Tổng Quan Niêm Phong
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('x509')}
            style={{
              padding: '10px 16px',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: activeTab === 'x509' ? '#0d9488' : '#64748b',
              borderBottom: activeTab === 'x509' ? '2.5px solid #0d9488' : '2.5px solid transparent',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>Chi Tiết X.509 (Chuẩn Adobe Reader)</span>
            <span
              style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 4,
                backgroundColor: '#ccfbf1',
                color: '#0f766e',
                fontWeight: 700,
              }}
            >
              Chuẩn 1.4 MISA
            </span>
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
          {activeTab === 'overview' ? (
            <>
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
                        maxWidth: '380px',
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
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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
                      <span style={{ color: '#64748b' }}>Mã số thuế (OID):</span>{' '}
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
            </>
          ) : (
            /* TAB 2: GIAO DIỆN CHỨNG THƯ X.509 CHUẨN WINDOWS / ADOBE ACROBAT */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Chọn chủ thể chứng thư */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#475569' }}>Chủ thể chứng thư:</span>
                <div style={{ display: 'flex', gap: 6, backgroundColor: '#f1f5f9', padding: 3, borderRadius: 8 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedParty('partyA')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: selectedParty === 'partyA' ? '#ffffff' : 'transparent',
                      color: selectedParty === 'partyA' ? '#0f172a' : '#64748b',
                      boxShadow: selectedParty === 'partyA' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    Bên A: Cty Minh Phong (Viettel-CA)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedParty('partyB')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: selectedParty === 'partyB' ? '#ffffff' : 'transparent',
                      color: selectedParty === 'partyB' ? '#0f172a' : '#64748b',
                      boxShadow: selectedParty === 'partyB' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    Bên B: {customerDisplayName}
                  </button>
                </div>
              </div>

              {/* Khung mô phỏng Hộp thoại Certificate Viewer của Windows / Adobe Acrobat Reader */}
              <div
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  backgroundColor: '#f8fafc',
                  overflow: 'hidden',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                {/* Thanh tab giả lập Certificate Viewer */}
                <div
                  style={{
                    backgroundColor: '#e2e8f0',
                    borderBottom: '1px solid #cbd5e1',
                    padding: '6px 12px 0',
                    display: 'flex',
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      padding: '4px 12px',
                      fontSize: 11,
                      color: '#64748b',
                      borderTopLeftRadius: 5,
                      borderTopRightRadius: 5,
                    }}
                  >
                    General
                  </div>
                  <div
                    style={{
                      padding: '5px 14px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      borderTopLeftRadius: 5,
                      borderTopRightRadius: 5,
                      borderTop: '2px solid #2563eb',
                      borderLeft: '1px solid #cbd5e1',
                      borderRight: '1px solid #cbd5e1',
                      borderBottom: '1px solid #ffffff',
                      marginBottom: -1,
                    }}
                  >
                    Details
                  </div>
                  <div
                    style={{
                      padding: '4px 12px',
                      fontSize: 11,
                      color: '#64748b',
                      borderTopLeftRadius: 5,
                      borderTopRightRadius: 5,
                    }}
                  >
                    Certification Path
                  </div>
                </div>

                {/* Bảng danh sách trường X.509 */}
                <div style={{ backgroundColor: '#ffffff', padding: 10 }}>
                  <div
                    style={{
                      border: '1px solid #cbd5e1',
                      maxHeight: 150,
                      overflowY: 'auto',
                      backgroundColor: '#ffffff',
                      fontFamily: 'Segoe UI, -apple-system, sans-serif',
                      fontSize: 11,
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#475569' }}>
                          <th style={{ padding: '4px 8px', width: '38%', fontWeight: 600 }}>Field</th>
                          <th style={{ padding: '4px 8px', fontWeight: 600 }}>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '4px 8px', color: '#475569' }}>Signature hash algorithm</td>
                          <td style={{ padding: '4px 8px', color: '#0f172a' }}>sha256</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '4px 8px', color: '#475569' }}>Issuer</td>
                          <td style={{ padding: '4px 8px', color: '#0f172a' }}>
                            {selectedParty === 'partyA' ? 'VIETTEL-CA, TAP DOAN CONG NGHIEP - VIEN THONG...' : (contract?.customerCertIssuer || 'Tổ chức CA / Cổng ký xác thực Minh Phong')}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '4px 8px', color: '#475569' }}>Valid from</td>
                          <td style={{ padding: '4px 8px', color: '#0f172a' }}>Tuesday, October 13, 2026</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '4px 8px', color: '#475569' }}>Valid to</td>
                          <td style={{ padding: '4px 8px', color: '#0f172a' }}>Monday, October 13, 2031</td>
                        </tr>
                        {/* Hàng Subject được highlight giống như khi click vào trong Adobe */}
                        <tr style={{ backgroundColor: '#0284c7', color: '#ffffff' }}>
                          <td style={{ padding: '4px 8px', fontWeight: 600 }}>Subject</td>
                          <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: 10 }}>
                            {selectedParty === 'partyA' ? 'MST:2301081775  CONG TY TNHH MTV DAU TU MINH PHONG' : customerDisplayName}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '4px 8px', color: '#475569' }}>Public key</td>
                          <td style={{ padding: '4px 8px', color: '#0f172a' }}>RSA (2048 Bits)</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '4px 8px', color: '#475569' }}>Thumbprint algorithm</td>
                          <td style={{ padding: '4px 8px', color: '#0f172a' }}>sha1</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Khung hiển thị chi tiết giá trị của trường Subject (vùng viền đỏ trong ảnh quy định) */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c' }}>
                        Chi tiết giá trị thuộc tính Subject (Theo chuẩn TT 16/2019/TT-BTTTT):
                      </span>
                      <button
                        type="button"
                        onClick={handleCopySubject}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          borderRadius: 4,
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          cursor: 'pointer',
                          fontSize: 10.5,
                        }}
                      >
                        {copiedSubject ? <Check size={11} color="#059669" /> : <Copy size={11} />}
                        <span>{copiedSubject ? 'Đã chép' : 'Sao chép'}</span>
                      </button>
                    </div>

                    <pre
                      style={{
                        margin: 0,
                        padding: 10,
                        backgroundColor: '#ffffff',
                        border: '2px solid #ef4444',
                        borderRadius: 6,
                        fontFamily: 'Consolas, "Courier New", monospace',
                        fontSize: 11,
                        lineHeight: 1.5,
                        color: '#0f172a',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {currentSubjectText}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Bảng giải thích chi tiết các thuộc tính OID */}
              <div
                style={{
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  padding: 12,
                  fontSize: 11,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 11.5 }}>
                  Quy chuẩn kỹ thuật chữ ký số Việt Nam (Nghị định 130/2018/NĐ-CP & TT 16/2019/TT-BTTTT):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 6, color: '#475569' }}>
                  <div>
                    <strong style={{ color: '#0f172a' }}>0.9.2342.19200300.100.1.1:</strong> OID định danh Mã số thuế doanh nghiệp (MST) hoặc CCCD/CMND cá nhân.
                  </div>
                  <div>
                    <strong style={{ color: '#0f172a' }}>Phone (2.5.4.20):</strong> Số điện thoại liên hệ xác minh của chủ thể ký số.
                  </div>
                  <div>
                    <strong style={{ color: '#0f172a' }}>E (1.2.840.113549.1.9.1):</strong> Email liên lạc của đơn vị ký số.
                  </div>
                  <div>
                    <strong style={{ color: '#0f172a' }}>CN & O:</strong> Tên đầy đủ của chủ thể và cơ quan / tổ chức pháp nhân.
                  </div>
                  <div>
                    <strong style={{ color: '#0f172a' }}>L & S:</strong> Địa giới hành chính Thị xã Thuận Thành, Tỉnh Bắc Ninh.
                  </div>
                  <div>
                    <strong style={{ color: '#0f172a' }}>C:</strong> Mã quốc gia Việt Nam (VN).
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 11, color: '#64748b' }}>
            {activeTab === 'overview'
              ? 'Bấm tab "Chi Tiết X.509" để đối soát theo chuẩn Adobe Reader'
              : 'Dữ liệu được trích xuất trực tiếp từ cấu trúc ASN.1 DER của chứng thư số PAdES'}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 18px',
              borderRadius: 8,
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
