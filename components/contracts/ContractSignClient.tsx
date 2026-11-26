"use client";

import { useState, useRef, useEffect } from "react";
import { 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Download, 
  ShieldCheck, 
  User, 
  KeyRound,
  PenTool,
  FileSignature,
  Building2,
  X,
  Sparkles,
  RefreshCw,
  Clock,
  Loader2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Check,
  Server,
} from "lucide-react";
import { SignaturePad, SignaturePadRef } from "./SignaturePad";
import { ContractPdfViewer } from "./ContractPdfViewer";
import { ContractAuditTimeline } from "./ContractAuditTimeline";
import { ContractAuditModal } from "./ContractAuditModal";
import { CertificateDetailModal } from "./CertificateDetailModal";
import { ContractB2bSignPanel } from "./ContractB2bSignPanel";
import {
  getDirectErpBaseUrl,
  postContractActionWithFallback,
  type ContractDetails,
  type ContractAuditLogItem,
  type ErpEnvironment,
  type VerifyOtpResponse,
  type PrepareB2bResponse,
  type SignB2bResponse,
} from "@/lib/erp-api";

interface ContractSignClientProps {
  initialToken: string;
  initialContract?: ContractDetails | null;
  initialError?: string | null;
  initialTargetEnv?: "production" | "staging" | "local";
  allowDevTools?: boolean;
}

interface EnvironmentSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEnv: "production" | "staging" | "local";
  onSelectEnv: (env: "production" | "staging" | "local") => void;
}

function EnvironmentSwitcherModal({
  isOpen,
  onClose,
  currentEnv,
  onSelectEnv,
}: EnvironmentSwitcherModalProps) {
  const [selected, setSelected] = useState<"production" | "staging" | "local">(currentEnv);

  useEffect(() => {
    if (isOpen) setSelected(currentEnv);
  }, [isOpen, currentEnv]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          backgroundColor: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid #f1f5f9",
            backgroundColor: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Server size={18} color="#2563eb" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              Cấu hình Môi trường ERP
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: 4,
              borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
            Chọn máy chủ ERP để nạp dữ liệu hợp đồng và thực hiện ký số. Lựa chọn này áp dụng riêng trên trình duyệt của bạn:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              {
                id: "production",
                name: "Production (Mặc định)",
                badge: "CHÍNH THỨC",
                badgeBg: "#dcfce7",
                badgeColor: "#15803d",
                url: "https://erp.nuocsachdinhto.com",
                desc: "Hệ thống vận hành chính thức của nhà máy",
              },
              {
                id: "staging",
                name: "Staging (Kiểm thử)",
                badge: "TESTING",
                badgeBg: "#ffedd5",
                badgeColor: "#c2410c",
                url: "https://staging.nuocsachdinhto.com",
                desc: "Môi trường nghiệm thu tính năng mới",
              },
              {
                id: "local",
                name: "Local Development",
                badge: "LOCAL",
                badgeBg: "#e0e7ff",
                badgeColor: "#3730a3",
                url: "http://localhost:3000",
                desc: "Môi trường lập trình nội bộ",
              },
            ].map((item) => {
              const isChecked = selected === item.id;
              return (
                <label
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: `1.5px solid ${isChecked ? "#2563eb" : "#e2e8f0"}`,
                    backgroundColor: isChecked ? "#eff6ff" : "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <input
                    type="radio"
                    name="erp_env_option"
                    value={item.id}
                    checked={isChecked}
                    onChange={() => setSelected(item.id as any)}
                    style={{ marginTop: 3, accentColor: "#2563eb" }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                        {item.name}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: 4,
                          backgroundColor: item.badgeBg,
                          color: item.badgeColor,
                        }}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, fontFamily: "monospace", color: "#64748b", marginBottom: 2 }}>
                      {item.url}
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>{item.desc}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            padding: "14px 20px",
            borderTop: "1px solid #f1f5f9",
            backgroundColor: "#f8fafc",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              color: "#64748b",
              backgroundColor: "transparent",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectEnv(selected);
              onClose();
            }}
            style={{
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 600,
              color: "#ffffff",
              backgroundColor: "#2563eb",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Áp dụng & Tải lại
          </button>
        </div>
      </div>
    </div>
  );
}

const CA_PROVIDERS = [
  { id: "auto", name: "Tự động nhận diện thiết bị (Tất cả nhà mạng CA)" },
  { id: "Viettel-CA", name: "Viettel-CA (Tập đoàn Viettel)" },
  { id: "VNPT-CA", name: "VNPT-CA (Tập đoàn VNPT)" },
  { id: "FPT-CA", name: "FPT-CA (Tập đoàn FPT)" },
  { id: "BKAV-CA", name: "BKAV-CA (Tập đoàn BKAV)" },
  { id: "MISA-eSign", name: "MISA eSign (Công ty MISA)" },
  { id: "EasyCA", name: "EasyCA (Softdreams)" },
  { id: "FastCA", name: "FastCA / NewTel-CA" },
  { id: "SmartSign", name: "SmartSign (Vina-CA)" },
  { id: "CA2", name: "CA2 (Nacencomm)" },
  { id: "VGCA", name: "VGCA (Ban Cơ yếu Chính phủ)" },
  { id: "other", name: "Nhà cung cấp khác / Dán PKCS#7 thủ công" },
];

function parseCertDate(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const s = dateStr.trim();
  if (!s) return null;
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmyMatch) {
    const [, d, m, y, h = "0", min = "0", sec = "0"] = dmyMatch;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(sec));
  }
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function encodeDerLength(len: number): Uint8Array {
  if (len < 0x80) return new Uint8Array([len]);
  const bytes: number[] = [];
  let n = len;
  while (n > 0) {
    bytes.unshift(n & 0xff);
    n >>= 8;
  }
  return new Uint8Array([0x80 | bytes.length, ...bytes]);
}

function derTag(tag: number, content: Uint8Array): Uint8Array {
  return concatBytes([new Uint8Array([tag]), encodeDerLength(content.length), content]);
}

const derSeq = (items: Uint8Array[]) => derTag(0x30, concatBytes(items));
const derSet = (items: Uint8Array[]) => derTag(0x31, concatBytes(items));
const derNull = () => new Uint8Array([0x05, 0x00]);
const derOctetString = (bytes: Uint8Array) => derTag(0x04, bytes);
const derBitString = (bytes: Uint8Array) => derTag(0x03, concatBytes([new Uint8Array([0]), bytes]));
const derUtf8 = (str: string) => derTag(0x0c, new TextEncoder().encode(str));
const derPrintable = (str: string) => derTag(0x13, new TextEncoder().encode(str));

function derInt(bytes: Uint8Array): Uint8Array {
  let start = 0;
  while (start < bytes.length - 1 && bytes[start] === 0 && (bytes[start + 1] & 0x80) === 0) {
    start++;
  }
  const trimmed = bytes.slice(start);
  const needZero = trimmed.length === 0 || (trimmed[0] & 0x80) !== 0;
  return derTag(0x02, needZero ? concatBytes([new Uint8Array([0]), trimmed]) : trimmed);
}

function derOid(oid: string): Uint8Array {
  const arcs = oid.split(".").map((n) => Number(n));
  const encoded: number[] = [arcs[0] * 40 + arcs[1]];
  for (let i = 2; i < arcs.length; i++) {
    let v = arcs[i];
    const chunks: number[] = [];
    do {
      chunks.unshift((v & 0x7f) | (chunks.length > 0 ? 0x80 : 0));
      v = Math.floor(v / 128);
    } while (v > 0);
    encoded.push(...chunks);
  }
  return derTag(0x06, new Uint8Array(encoded));
}

function derUtcTime(date: Date): Uint8Array {
  const p = (n: number) => String(n).padStart(2, "0");
  const str = `${p(date.getUTCFullYear() % 100)}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}Z`;
  return derTag(0x17, new TextEncoder().encode(str));
}

function derName(rdns: Array<{ oid: string; value: string; printable?: boolean }>): Uint8Array {
  return derSeq(
    rdns.map((r) =>
      derSet([
        derSeq([
          derOid(r.oid),
          r.printable ? derPrintable(r.value) : derUtf8(r.value),
        ]),
      ])
    )
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const std = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = std + "=".repeat((4 - (std.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let res = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    res = (res << BigInt(8)) + BigInt(bytes[i]);
  }
  return res;
}

function bigIntToBytes(val: bigint, len: number): Uint8Array {
  const out = new Uint8Array(len);
  let v = val;
  const mask = BigInt(0xff);
  const shift = BigInt(8);
  for (let i = len - 1; i >= 0; i--) {
    out[i] = Number(v & mask);
    v >>= shift;
  }
  return out;
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = BigInt(1);
  let b = base % mod;
  let e = exp;
  const zero = BigInt(0);
  const one = BigInt(1);
  while (e > zero) {
    if ((e & one) === one) result = (result * b) % mod;
    b = (b * b) % mod;
    e >>= one;
  }
  return result;
}

async function generateDevB2bKeyPairAndCert(params: {
  taxCode: string;
  companyName: string;
  providerName: string;
}): Promise<{
  certBase64: string;
  serialHex: string;
  validFromIso: string;
  validToIso: string;
  privateJwk: JsonWebKey;
}> {
  const subtle = window.crypto?.subtle;
  if (!subtle) {
    throw new Error("Trình duyệt không hỗ trợ WebCrypto API để tạo chứng thư số giả lập.");
  }

  const keyPair = await subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );

  const spkiBytes = new Uint8Array(await subtle.exportKey("spki", keyPair.publicKey));
  const privateJwk = await subtle.exportKey("jwk", keyPair.privateKey);

  const serialBytes = new Uint8Array(8);
  window.crypto.getRandomValues(serialBytes);
  serialBytes[0] = (serialBytes[0] & 0x7f) | 0x01;
  const serialHex = Array.from(serialBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  const now = new Date();
  const validFrom = new Date(now.getTime() - 5 * 60 * 1000);
  const validTo = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const sigAlgId = derSeq([derOid("1.2.840.113549.1.1.11"), derNull()]);

  const subjectRdns = [
    { oid: "0.9.2342.19200300.100.1.1", value: `MST:${params.taxCode}` },
    { oid: "2.5.4.3", value: params.companyName },
    { oid: "2.5.4.10", value: params.companyName },
    { oid: "2.5.4.6", value: "VN", printable: true },
  ];
  const issuerRdns = [
    { oid: "2.5.4.3", value: `${params.providerName} Dev Sandbox` },
    { oid: "2.5.4.10", value: params.providerName },
    { oid: "2.5.4.6", value: "VN", printable: true },
  ];

  const keyUsageBits = derTag(0x03, new Uint8Array([0x06, 0xc0]));
  const extensions = derSeq([
    derSeq([derOid("2.5.29.15"), new Uint8Array([0x01, 0x01, 0xff]), derOctetString(keyUsageBits)]),
    derSeq([derOid("2.5.29.19"), derOctetString(derSeq([]))]),
  ]);

  const tbsCert = derSeq([
    derTag(0xa0, derInt(new Uint8Array([2]))),
    derInt(serialBytes),
    sigAlgId,
    derName(issuerRdns),
    derSeq([derUtcTime(validFrom), derUtcTime(validTo)]),
    derName(subjectRdns),
    spkiBytes,
    derTag(0xa3, extensions),
  ]);

  const tbsBuf = tbsCert.buffer.slice(tbsCert.byteOffset, tbsCert.byteOffset + tbsCert.byteLength) as ArrayBuffer;
  const tbsSig = new Uint8Array(await subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, keyPair.privateKey, tbsBuf));
  const certDer = derSeq([tbsCert, sigAlgId, derBitString(tbsSig)]);

  return {
    certBase64: bytesToBase64(certDer),
    serialHex,
    validFromIso: validFrom.toISOString(),
    validToIso: validTo.toISOString(),
    privateJwk,
  };
}

function signSha256HashPkcs1v15(hashHex: string, privateJwk: JsonWebKey): string {
  if (!privateJwk.n || !privateJwk.d) {
    throw new Error("Thiếu khóa bí mật RSA để ký mã băm hợp đồng.");
  }
  const cleanHex = hashHex.trim();
  const match = cleanHex.match(/.{1,2}/g);
  if (!match || match.length !== 32) {
    throw new Error("Mã băm SHA-256 (hash_to_sign) không hợp lệ.");
  }
  const hashBytes = new Uint8Array(match.map((b) => parseInt(b, 16)));
  const digestInfoPrefix = new Uint8Array([
    0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01, 0x05, 0x00, 0x04, 0x20,
  ]);
  const nBytes = base64UrlToBytes(privateJwk.n);
  const k = nBytes.length;
  const psLen = k - digestInfoPrefix.length - hashBytes.length - 3;
  const em = new Uint8Array(k);
  em[0] = 0x00;
  em[1] = 0x01;
  em.fill(0xff, 2, 2 + psLen);
  em[2 + psLen] = 0x00;
  em.set(digestInfoPrefix, 3 + psLen);
  em.set(hashBytes, 3 + psLen + digestInfoPrefix.length);

  const n = bytesToBigInt(nBytes);
  const d = bytesToBigInt(base64UrlToBytes(privateJwk.d));
  const sigInt = modPow(bytesToBigInt(em), d, n);
  return bytesToBase64(bigIntToBytes(sigInt, k));
}

export function ContractSignClient({
  initialToken,
  initialContract,
  initialError,
  initialTargetEnv = "production",
  allowDevTools = false,
}: ContractSignClientProps) {
  const [contract, setContract] = useState<ContractDetails | null>(initialContract || null);
  const [auditLogs, setAuditLogs] = useState<ContractAuditLogItem[]>(initialContract?.auditLogs || []);
  const [loading, setLoading] = useState(!initialContract && !initialError);
  const [error, setError] = useState<string | null>(initialError || null);

  // Quản lý môi trường ERP kết nối (Production | Staging | Local)
  const [currentEnv, setCurrentEnv] = useState<"production" | "staging" | "local">(initialTargetEnv);
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSecretTrigger = () => {
    setClickCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setIsEnvModalOpen(true);
        return 0;
      }
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickTimerRef.current = setTimeout(() => {
        setClickCount(0);
      }, 1200);
      return next;
    });
  };

  const handleChangeEnv = (newEnv: "production" | "staging" | "local") => {
    document.cookie = `erp_target_env=${newEnv}; path=/; max-age=604800`;
    setCurrentEnv(newEnv);
    const url = new URL(window.location.href);
    if (newEnv === "production") {
      url.searchParams.delete("env");
    } else {
      url.searchParams.set("env", newEnv);
    }
    window.location.href = url.toString();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setIsEnvModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Modal ký số (cho mobile hoặc khi bấm nút ký ở header)
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  // Modal xem chi tiết lịch sử giao kết (Audit Trail)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  // Modal xem chi tiết chứng thư số PAdES
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  // Tab điều hướng trên Mobile WebApp: 'pdf' (xem văn bản) | 'sign' (ký số) | 'history' (lịch sử)
  const [mobileTab, setMobileTab] = useState<"pdf" | "sign" | "history">("pdf");

  // OTP state
  const [otpCode, setOtpCode] = useState("");
  const [otpChannel, setOtpChannel] = useState<"zalo" | "email">("zalo");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);

  // B2C 2-step wizard signing flow state (Bước 1: Vẽ chữ ký -> Bước 2: Nhập OTP & Hoàn tất)
  const [b2cStep, setB2cStep] = useState<1 | 2>(1);
  const [savedSignatureBase64, setSavedSignatureBase64] = useState<string>("");
  // Pháp lý: Checkbox cam kết điều khoản hợp đồng trước khi hoàn tất giao kết
  const [consentLegal, setConsentLegal] = useState<boolean>(false);
  const otpInputRef = useRef<HTMLInputElement | null>(null);
  const modalOtpInputRef = useRef<HTMLInputElement | null>(null);

  // Tự động focus vào ô OTP khi chuyển sang Bước 2
  useEffect(() => {
    if (b2cStep === 2) {
      const timer = setTimeout(() => {
        if (isSignModalOpen) {
          modalOtpInputRef.current?.focus();
        } else {
          otpInputRef.current?.focus();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [b2cStep, isSignModalOpen]);

  // Signing state helpers (Hỗ trợ luồng HĐĐT v2: Bên B ký trước, Bên A phê duyệt ký sau)
  const isCustomerSigned = (s?: string | null) => s === "signed_by_customer";
  const isStatusCompleted = (s?: string | null) => s === "completed" || s === "signed";
  const hasCustomerSubmittedSignature = (s?: string | null) => isCustomerSigned(s) || isStatusCompleted(s);

  const [signing, setSigning] = useState(false);
  const [signedSuccess, setSignedSuccess] = useState(
    hasCustomerSubmittedSignature(initialContract?.status)
  );
  const [pdfVersion, setPdfVersion] = useState<number>(0);

  // Kiểm tra yêu cầu ký lại từ Ban Quản lý (nếu có trong lịch sử kiểm toán)
  const resignLog = auditLogs.find((log) => log.action === "customer_resign_requested");
  const resignReason =
    ((resignLog?.metadata as Record<string, any>)?.reason ||
      (resignLog?.metadata as Record<string, any>)?.rejection_reason ||
      "") as string;

  // Business B2B USB token state
  const [b2bTaxCode, setB2bTaxCode] = useState(
    initialContract?.customer?.taxCode || initialContract?.customerCode || ""
  );
  const [b2bCompanyName, setB2bCompanyName] = useState(
    initialContract?.customer?.fullName || ""
  );
  const [b2bCertSerial, setB2bCertSerial] = useState("");
  const [b2bCertIssuer, setB2bCertIssuer] = useState("");
  const [b2bCertValidRange, setB2bCertValidRange] = useState("");
  const [b2bCertValidTo, setB2bCertValidTo] = useState("");
  const [b2bCertIsExpired, setB2bCertIsExpired] = useState(false);
  const [usbSessionId, setUsbSessionId] = useState("");
  const [usbActiveUrl, setUsbActiveUrl] = useState("");
  const [b2bWsConnected, setB2bWsConnected] = useState(false);
  const [b2bCertBase64, setB2bCertBase64] = useState("");
  const [b2bSignatureBase64, setB2bSignatureBase64] = useState("");
  const [b2bSignMethod, setB2bSignMethod] = useState<"usb" | "manual">("usb");
  const [selectedCaProvider, setSelectedCaProvider] = useState<string>("auto");
  const [usbStatus, setUsbStatus] = useState<string | null>(null);
  const [isConnectingUsb, setIsConnectingUsb] = useState(false);
  const [usbStatusType, setUsbStatusType] = useState<"idle" | "connecting" | "success" | "error">("idle");
  const [formError, setFormError] = useState<string | null>(null);

  // Business B2B Email OTP state
  const [b2bOtpCode, setB2bOtpCode] = useState("");
  const [b2bOtpVerified, setB2bOtpVerified] = useState(false);
  const [b2bOtpVerifiedAt, setB2bOtpVerifiedAt] = useState<string | null>(null);
  const [b2bOtpSending, setB2bOtpSending] = useState(false);
  const [b2bOtpVerifying, setB2bOtpVerifying] = useState(false);
  const [b2bOtpCooldown, setB2bOtpCooldown] = useState(0);
  const [b2bOtpMessage, setB2bOtpMessage] = useState<string | null>(null);
  const [b2bOtpError, setB2bOtpError] = useState<string | null>(null);

  const sigPadRef = useRef<SignaturePadRef | null>(null);
  const modalSigPadRef = useRef<SignaturePadRef | null>(null);
  const signSectionRef = useRef<HTMLDivElement | null>(null);

  // Tự động điền thông tin doanh nghiệp khi tải dữ liệu hợp đồng
  useEffect(() => {
    if (contract) {
      if (!b2bTaxCode && (contract.customer?.taxCode || contract.customerCode)) {
        setB2bTaxCode(contract.customer?.taxCode || contract.customerCode || "");
      }
      if (!b2bCompanyName && contract.customer?.fullName) {
        setB2bCompanyName(contract.customer.fullName);
      }
    }
  }, [contract, b2bTaxCode, b2bCompanyName]);

  // Hàm tải lại hợp đồng và timeline lịch sử
  const refreshContractData = async () => {
    try {
      setPdfVersion(Date.now());
      let loadedData: ContractDetails | null = null;

      // 1. Thử qua proxy nội bộ Portal
      try {
        const res = await fetch(`/api/portal/contracts/${initialToken}?env=${currentEnv}&_t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
          },
        });
        const data = await res.json();
        if (data.success && data.data) {
          loadedData = data.data;
        }
      } catch (proxyErr) {
        console.warn("[portal] Proxy fetch error, attempting direct fallback...", proxyErr);
      }

      // 2. Client-side Smart Fallback: nếu proxy bị Cloudflare 403 hoặc lỗi mạng, fetch trực tiếp từ máy chủ ERP
      if (!loadedData) {
        try {
          const directBaseUrl = getDirectErpBaseUrl(currentEnv);
          const directRes = await fetch(`${directBaseUrl}/api/portal/contracts/${initialToken}`, {
            cache: "no-store",
            headers: { "Accept": "application/json" },
          });
          if (directRes.ok) {
            const directData = await directRes.json();
            if (directData.success && directData.data) {
              console.log("[portal] Client-side direct fetch thành công từ:", directBaseUrl);
              loadedData = directData.data;
            }
          }
        } catch (directErr) {
          console.warn("[portal] Direct fetch fallback error:", directErr);
        }
      }

      if (loadedData) {
        setContract(loadedData);
        setError(null);
        if (loadedData.auditLogs) {
          setAuditLogs(loadedData.auditLogs);
        }
        if (hasCustomerSubmittedSignature(loadedData.status)) {
          setSignedSuccess(true);
        }
      }
    } catch {
      // ignore
    }
  };

  // Luôn đồng bộ dữ liệu khi initialContract prop thay đổi
  useEffect(() => {
    if (initialContract) {
      setContract(initialContract);
      if (initialContract.auditLogs) {
        setAuditLogs(initialContract.auditLogs);
      }
      if (hasCustomerSubmittedSignature(initialContract.status)) {
        setSignedSuccess(true);
      }
    }
  }, [initialContract]);

  // Luôn làm tươi dữ liệu một lần khi component mount ở Client
  useEffect(() => {
    refreshContractData();
  }, [initialToken]);

  // Handle OTP countdown
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  // Handle B2B Email OTP countdown
  useEffect(() => {
    if (b2bOtpCooldown <= 0) return;
    const timer = setInterval(() => {
      setB2bOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [b2bOtpCooldown]);

  const resetB2bOtpSession = (reason?: string) => {
    setB2bOtpVerified(false);
    setB2bOtpVerifiedAt(null);
    setB2bOtpCode("");
    setB2bOtpMessage(null);
    setB2bOtpError(
      reason ||
        "Phiên xác thực OTP Email đã hết hạn (15 phút). Vui lòng nhận và xác thực lại mã OTP."
    );
  };

  const isOtpSessionExpiredError = (code?: string, errorMsg?: string) => {
    const normCode = (code || "").toUpperCase();
    if (
      normCode === "OTP_EXPIRED" ||
      normCode === "OTP_NOT_VERIFIED" ||
      normCode === "OTP_SESSION_EXPIRED" ||
      normCode === "OTP_REQUIRED"
    ) {
      return true;
    }
    const lower = (errorMsg || "").toLowerCase();
    return (
      lower.includes("otp") &&
      (lower.includes("hết hạn") ||
        lower.includes("chưa xác thực") ||
        lower.includes("expired") ||
        lower.includes("15 phút"))
    );
  };

  // Gửi OTP Email cho luồng Doanh nghiệp B2B
  const handleSendB2bOtp = async () => {
    if (b2bOtpCooldown > 0 || b2bOtpSending) return;
    setB2bOtpSending(true);
    setB2bOtpMessage(null);
    setB2bOtpError(null);
    setError(null);

    try {
      const { ok, data } = await postContractActionWithFallback<{
        success: boolean;
        error?: string;
        message?: string;
        remainingSeconds?: number;
      }>(
        initialToken,
        "send-otp",
        {
          channel: "email",
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        },
        currentEnv
      );

      if (ok && data?.success) {
        setB2bOtpCooldown(60);
        setB2bOtpMessage(
          data.message ||
            `Mã OTP đã được gửi đến email ${contract?.customer?.email || "đăng ký"}. Vui lòng kiểm tra hộp thư.`
        );
      } else {
        if (data?.remainingSeconds) {
          setB2bOtpCooldown(data.remainingSeconds);
        }
        setB2bOtpError(data?.error || "Không thể gửi mã OTP qua Email");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setB2bOtpError(`Lỗi gửi yêu cầu OTP Email: ${msg}`);
    } finally {
      setB2bOtpSending(false);
    }
  };

  // Xác thực OTP Email cho luồng Doanh nghiệp B2B (/verify-otp)
  const handleVerifyB2bOtp = async () => {
    const trimmed = b2bOtpCode.trim();
    if (trimmed.length < 6) {
      setB2bOtpError("Vui lòng nhập đủ 6 chữ số mã OTP Email.");
      return;
    }
    if (b2bOtpVerifying) return;

    setB2bOtpVerifying(true);
    setB2bOtpError(null);
    setB2bOtpMessage(null);
    setError(null);
    setFormError(null);

    try {
      const { ok, data } = await postContractActionWithFallback<VerifyOtpResponse>(
        initialToken,
        "verify-otp",
        {
          otp_code: trimmed,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        },
        currentEnv
      );

      if (ok && data?.success) {
        setB2bOtpVerified(true);
        setB2bOtpVerifiedAt(data.verifiedAt || data.verified_at || new Date().toISOString());
        setB2bOtpMessage("Đã xác thực OTP Email thành công.");
        setB2bOtpError(null);
      } else {
        setB2bOtpVerified(false);
        const attemptsHint =
          typeof data?.remainingAttempts === "number"
            ? ` (Còn ${data.remainingAttempts} lần thử)`
            : "";
        setB2bOtpError(
          `${data?.error || "Mã OTP không chính xác hoặc đã hết hạn."}${attemptsHint}`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setB2bOtpError(`Lỗi xác thực OTP Email: ${msg}`);
    } finally {
      setB2bOtpVerifying(false);
    }
  };

  // Request OTP
  const handleRequestOtp = async () => {
    if (otpCooldown > 0 || otpLoading) return;
    setOtpLoading(true);
    setOtpMessage(null);
    setError(null);

    try {
      const { ok, data } = await postContractActionWithFallback<{
        success: boolean;
        error?: string;
        remainingSeconds?: number;
      }>(
        initialToken,
        "send-otp",
        {
          channel: otpChannel,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        },
        currentEnv
      );

      if (ok && data?.success) {
        setOtpCooldown(60);
        setOtpMessage(
          otpChannel === "zalo"
            ? `Mã OTP đã được gửi đến Zalo số ${contract?.customer?.phone}. Vui lòng kiểm tra tin nhắn.`
            : `Mã OTP đã được gửi đến email ${contract?.customer?.email}. Vui lòng kiểm tra hộp thư.`
        );
      } else {
        if (data?.remainingSeconds) {
          setOtpCooldown(data.remainingSeconds);
        }
        setError(data?.error || "Không thể gửi mã OTP");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Lỗi gửi yêu cầu OTP: ${message}`);
    } finally {
      setOtpLoading(false);
    }
  };

  // B2C Bước 1 -> Bước 2: Lưu chữ ký tay & kích hoạt gửi mã OTP
  const handleProceedToOtp = async (fromModal = false) => {
    setError(null);
    setFormError(null);
    const activeRef = fromModal ? modalSigPadRef.current : sigPadRef.current;
    const canvasEmpty = activeRef ? activeRef.isEmpty() : true;
    const signatureBase64 = activeRef ? activeRef.toDataURL() : "";

    if (canvasEmpty || !signatureBase64) {
      const msg = "Vui lòng vẽ chữ ký tay của Quý khách lên khung ký trước khi tiếp tục";
      setFormError(msg);
      setError(msg);
      return;
    }

    setSavedSignatureBase64(signatureBase64);
    setB2cStep(2);

    // Tự động kích hoạt gửi mã OTP nếu chưa trong thời gian đếm ngược
    if (otpCooldown <= 0 && !otpLoading) {
      await handleRequestOtp();
    }
  };

  // Submit Individual Signature (Hoàn tất giao kết hợp đồng cá nhân với Chữ ký tay + OTP)
  const handleSignIndividual = async (fromModal = false) => {
    setError(null);
    setFormError(null);

    // Ưu tiên lấy chữ ký đã lưu ở Bước 1
    let signatureBase64 = savedSignatureBase64;
    if (!signatureBase64) {
      const activeRef = fromModal ? modalSigPadRef.current : sigPadRef.current;
      const canvasEmpty = activeRef ? activeRef.isEmpty() : true;
      if (!canvasEmpty && activeRef) {
        signatureBase64 = activeRef.toDataURL();
        setSavedSignatureBase64(signatureBase64);
      }
    }

    if (!signatureBase64) {
      const msg = "Vui lòng vẽ chữ ký tay của Quý khách lên khung ký trước khi xác nhận";
      setFormError(msg);
      setError(msg);
      setB2cStep(1);
      return;
    }

    if (!otpCode.trim()) {
      const msg = "Vui lòng nhập mã xác thực OTP gửi qua " + (otpChannel === "zalo" ? "Zalo" : "Email");
      setFormError(msg);
      setError(msg);
      return;
    }

    if (otpCode.trim().length < 6) {
      const msg = "Mã xác thực OTP gồm đúng 6 chữ số";
      setFormError(msg);
      setError(msg);
      return;
    }

    if (!consentLegal) {
      const msg = "Quý khách vui lòng tích chọn đồng ý với các điều khoản hợp đồng trước khi hoàn tất ký";
      setFormError(msg);
      setError(msg);
      return;
    }

    setSigning(true);

    try {
      const { ok, data } = await postContractActionWithFallback<{
        success: boolean;
        error?: string;
        data?: { status?: string };
      }>(
        initialToken,
        "sign",
        {
          signature_image_base64: signatureBase64,
          otp_code: otpCode.trim(),
          terms_agreed: true,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        },
        currentEnv
      );

      if (ok && data?.success) {
        setSignedSuccess(true);
        setContract((prev) => (prev ? { ...prev, status: data?.data?.status || "signed_by_customer" } : prev));
        setIsSignModalOpen(false);
        await refreshContractData();
      } else {
        const msg = data?.error || "Ký hợp đồng không thành công. Vui lòng kiểm tra lại mã OTP.";
        setFormError(msg);
        setError(msg);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const msg = `Lỗi hoàn tất ký: ${message}`;
      setFormError(msg);
      setError(msg);
    } finally {
      setSigning(false);
    }
  };

  // Helper giao tiếp chuẩn SignPlugin REST (HTTP 14007 / HTTPS 14407 - Viettel, FPT, VNPT, EasyCA, FastCA, SmartSign, CA2)
  const postSignPlugin = async (
    baseUrl: string,
    path: string,
    params: Record<string, string>,
    timeoutMs = 15000
  ) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const bodyStr = Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
      const res = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: bodyStr,
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.text()).trim();
    } finally {
      clearTimeout(timer);
    }
  };

  const normalizeCertBase64 = (raw: string): string =>
    raw
      .replace(/-----BEGIN CERTIFICATE-----/gi, "")
      .replace(/-----END CERTIFICATE-----/gi, "")
      .replace(/\s+/g, "")
      .trim();

  const normalizeSignatureToBase64 = (sigRaw: string): string => {
    let sigToSend = sigRaw.trim();
    if (/^[0-9A-Fa-f]+$/.test(sigToSend) && sigToSend.length >= 128 && sigToSend.length % 2 === 0) {
      try {
        const match = sigToSend.match(/.{1,2}/g);
        if (match) {
          const u8 = new Uint8Array(match.map((byte) => parseInt(byte, 16)));
          let binary = "";
          for (let i = 0; i < u8.length; i++) {
            binary += String.fromCharCode(u8[i]);
          }
          sigToSend = btoa(binary);
        }
      } catch {
        // fallback
      }
    }
    return sigToSend.replace(/\s+/g, "");
  };

  interface UsbCertConnectResult {
    certBase64: string;
    taxCode: string;
    companyName: string;
    serial: string;
    issuer: string;
    validTo: string;
    activeUrl: string;
    sessionId: string;
    viaWs: boolean;
  }

  const signHashViaWebSocket = (hashHex: string, certSerial?: string): Promise<string | null> =>
    new Promise((resolve) => {
      try {
        const ws = new WebSocket("wss://127.0.0.1:15208");
        const timer = setTimeout(() => {
          try {
            ws.close();
          } catch {}
          resolve(null);
        }, 60000);

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              function: "signHash",
              hash: hashHex,
              hashAlg: "SHA256",
              serialNumber: certSerial || undefined,
            })
          );
        };

        ws.onmessage = (event) => {
          clearTimeout(timer);
          try {
            const resp = JSON.parse(event.data);
            const sig = resp.signature || resp.signedHash || resp.data || "";
            resolve(typeof sig === "string" && sig.trim() ? sig.trim() : null);
          } catch {
            resolve(null);
          } finally {
            try {
              ws.close();
            } catch {}
          }
        };

        ws.onerror = () => {
          clearTimeout(timer);
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });

  // B2B Bước 1: Kết nối USB Token & Đọc thông tin Chứng thư số (Đa nhà mạng CA)
  const handleConnectUsbToken = async (): Promise<UsbCertConnectResult | null> => {
    if (selectedCaProvider === "other") {
      setB2bSignMethod("manual");
      setUsbStatus("Đã chuyển sang chế độ dán chuỗi chữ ký PKCS#7 Base64 thủ công.");
      setUsbStatusType("idle");
      return null;
    }

    setIsConnectingUsb(true);
    setUsbStatusType("connecting");
    setUsbStatus(
      "Đang dò tìm phần mềm ký số (SignPlugin cổng 14007/14407, VNPT 11284, MISA 12018, BKAV 15208)... Nếu cửa sổ 'Select Certificate' hiện lên, vui lòng chọn chứng thư số của doanh nghiệp và bấm OK."
    );
    setError(null);
    setFormError(null);

    // Danh sách PKCS#11 DLL của tất cả các CA tại Việt Nam + '*' (cho phép đọc từ Windows Certificate Store / CNG)
    const liblistByProvider: Record<string, string> = {
      "Viettel-CA": "viettel-ca_v6.dll;viettel-ca_v5.dll;viettel-ca_v4.dll;viettel-ca_v2.dll;*",
      "VNPT-CA": "vnpt-ca_csp11.dll;vnpt-ca_v34.dll;wdpkcs.dll;vnptca_p11_v6.dll;*",
      "FPT-CA": "fptca_v3.dll;fptca_v4.dll;fpt-ca.dll;eps2003csp11.dll;*",
      "BKAV-CA": "bkavca.dll;bkavcsp11.dll;bkavca_v2.dll;*",
      "CA2": "ca2_v34.dll;ostc1_csp11.dll;ca2_csp11.dll;*",
      "SmartSign": "smartsign.dll;vina-ca.dll;ShuttleCsp11_3003.dll;*",
    };
    const defaultMultiCaLibList =
      "viettel-ca_v6.dll;viettel-ca_v5.dll;viettel-ca_v4.dll;viettel-ca_v2.dll;vnpt-ca_csp11.dll;vnpt-ca_v34.dll;wdpkcs.dll;fptca_v3.dll;fpt-ca.dll;eps2003csp11.dll;bkavca.dll;bkavcsp11.dll;ca2_v34.dll;ostc1_csp11.dll;etpkcs11.dll;ShuttleCsp11_3003.dll;*";

    const liblist = liblistByProvider[selectedCaProvider] || defaultMultiCaLibList;

    // 1. Ưu tiên kết nối qua chuẩn SignPlugin v2.0 / Mobile-ID (HTTP 14007 / HTTPS 14407)
    // Dùng chung cho Viettel-CA, FPT-CA, VNPT-CA, EasyCA, FastCA, SmartSign, CA2 và mọi Token trong Windows Cert Store (*)
    const pluginUrls = ["http://127.0.0.1:14007", "https://127.0.0.1:14407"];
    for (const baseUrl of pluginUrls) {
      try {
        const echo = await postSignPlugin(baseUrl, "/echo", { value: "ping" }, 2500);
        if (echo === "ping") {
          const sessionId = await postSignPlugin(baseUrl, "/getSession", { liblist }, 10000);
          if (!sessionId) {
            setIsConnectingUsb(false);
            setUsbStatusType("error");
            setUsbStatus("Đã kết nối SignPlugin nhưng chưa tìm thấy USB Token. Vui lòng cắm USB Token vào máy tính.");
            return null;
          }

          setUsbStatus(
            "Đã kết nối SignPlugin. Vui lòng chọn chứng thư số của doanh nghiệp trên cửa sổ 'Select Certificate' và nhấn OK..."
          );
          const rawCertBase64 = await postSignPlugin(
            baseUrl,
            "/getCertificate",
            { sessionID: sessionId },
            60000
          );

          if (!rawCertBase64) {
            const lastErr = await postSignPlugin(baseUrl, "/getLastErr", {}, 5000);
            setIsConnectingUsb(false);
            setUsbStatusType("error");
            setUsbStatus(
              lastErr === "100102"
                ? "Không tìm thấy thiết bị USB Token chứa chứng thư số đã chọn. Vui lòng cắm đúng USB Token vào máy tính."
                : "Chưa chọn chứng thư số hoặc người dùng đã đóng cửa sổ chọn chứng thư (Mã: " + (lastErr || "N/A") + ")."
            );
            return null;
          }

          const cleanCertBase64 = normalizeCertBase64(rawCertBase64);

          const [snb, cn, dn, issuer, validDate, expireDate] = await Promise.all([
            postSignPlugin(baseUrl, "/getCertSNB", {}, 5000),
            postSignPlugin(baseUrl, "/getCertCN", {}, 5000),
            postSignPlugin(baseUrl, "/getCertDN", {}, 5000),
            postSignPlugin(baseUrl, "/getCertIssuer", {}, 5000),
            postSignPlugin(baseUrl, "/getCertValidDate", {}, 5000),
            postSignPlugin(baseUrl, "/getCertExpireDate", {}, 5000),
          ]);

          const parsedExp = parseCertDate(expireDate);
          const isExpired = parsedExp ? parsedExp.getTime() < Date.now() : false;
          const parsedVal = parseCertDate(validDate);
          const isNotYetValid = parsedVal ? parsedVal.getTime() > Date.now() : false;

          // Trích xuất MST từ DN nếu có (VD: MST:2301081775 hoặc UID=MST:2301081775)
          const mstMatch = dn.match(/MST[:=]([0-9\-]+)/i);
          const extractedTaxCode = mstMatch && mstMatch[1] ? mstMatch[1] : b2bTaxCode;
          if (mstMatch && mstMatch[1]) {
            setB2bTaxCode(mstMatch[1]);
          }
          const resolvedCompanyName = cn || b2bCompanyName;
          if (cn) {
            setB2bCompanyName(cn);
          }
          const resolvedIssuer =
            issuer || (selectedCaProvider !== "auto" ? selectedCaProvider : "Viettel-CA");
          setB2bCertSerial(snb || "");
          setB2bCertIssuer(resolvedIssuer);
          setB2bCertValidTo(expireDate || "");
          if (validDate || expireDate) {
            setB2bCertValidRange(`${validDate || ""} - ${expireDate || ""}`);
          }

          // Kiểm tra đối soát Mã số thuế ngay khi đọc USB Token (Chống cắm nhầm Token công ty khác)
          const expectedMst = (contract?.customer?.taxCode || "").trim().replace(/[\s\-]/g, "");
          const tokenMst = (mstMatch && mstMatch[1] ? mstMatch[1] : "").trim().replace(/[\s\-]/g, "");
          if (expectedMst && tokenMst && expectedMst !== tokenMst && !isDev) {
            setUsbStatusType("error");
            const mismatchMsg = `⚠️ USB Token vừa cắm có MST (${mstMatch![1]}) KHÔNG TRÙNG KHỚP với Mã số thuế của doanh nghiệp trên hợp đồng (${contract?.customer?.taxCode}). Vui lòng cắm đúng USB Token của doanh nghiệp để ký.`;
            setUsbStatus(mismatchMsg);
            setFormError(mismatchMsg);
            setIsConnectingUsb(false);
            return null;
          }

          if (isExpired || isNotYetValid) {
            setB2bCertIsExpired(true);
            setUsbActiveUrl("");
            setUsbSessionId("");
            setB2bWsConnected(false);
            setB2bCertBase64("");
            setB2bSignatureBase64("");
            setUsbStatusType("error");
            const errDetail = isExpired
              ? `Chứng thư số đã chọn đã HẾT HẠN vào ngày ${expireDate}`
              : `Chứng thư số chưa đến ngày có hiệu lực (${validDate})`;
            const errMsg = `⚠️ ${errDetail}. Vui lòng cắm đúng USB Token còn hạn và chọn chứng thư số mới trong cửa sổ Select Certificate.`;
            setUsbStatus(errMsg);
            setFormError(errMsg);
            setIsConnectingUsb(false);
            return null;
          }

          setB2bCertIsExpired(false);
          setUsbActiveUrl(baseUrl);
          setUsbSessionId(sessionId);
          setB2bWsConnected(false);
          setB2bCertBase64(cleanCertBase64);
          setB2bSignatureBase64("");
          setB2bSignMethod("usb");
          setUsbStatusType("success");
          setUsbStatus(
            `Đã đọc chứng thư số: ${cn || dn} | Serial: ${snb || "N/A"} | Nhà cung cấp: ${resolvedIssuer}${
              validDate && expireDate ? ` (${validDate} → ${expireDate})` : ""
            }. Hãy nhấn 'Ký số bằng USB Token' bên dưới và nhập mã PIN để hoàn tất ký.`
          );
          setIsConnectingUsb(false);
          return {
            certBase64: cleanCertBase64,
            taxCode: extractedTaxCode,
            companyName: resolvedCompanyName,
            serial: snb || "",
            issuer: resolvedIssuer,
            validTo: expireDate || "",
            activeUrl: baseUrl,
            sessionId,
            viaWs: false,
          };
        }
      } catch {
        // Thử URL tiếp theo
      }
    }

    // 2. Fallback dò cổng WebSocket (BKAV-CA / VNPT-CA / Viettel-CA vSigner: 15208, 11284)
    return await new Promise<UsbCertConnectResult | null>((resolve) => {
      try {
        const ws = new WebSocket("wss://127.0.0.1:15208");

        const timeout = setTimeout(() => {
          try {
            ws.close();
          } catch {
            // ignore
          }
          setIsConnectingUsb(false);
          setUsbStatusType("error");
          setUsbStatus(
            "Không tìm thấy phần mềm ký số (Viettel-CA / VNPT-CA / FPT-CA / MISA / BKAV SignPlugin) đang chạy hoặc trình duyệt đang chặn kết nối Local Network."
          );
          setB2bSignMethod("manual");
          resolve(null);
        }, 2500);

        ws.onopen = () => {
          clearTimeout(timeout);
          setUsbStatusType("connecting");
          setUsbStatus("Đã kết nối với phần mềm ký số qua WebSocket. Đang đọc danh sách chứng thư số từ USB Token...");
          ws.send(JSON.stringify({ function: "getCertificateList" }));
        };

        ws.onmessage = (event) => {
          try {
            const resp = JSON.parse(event.data);
            const rawCerts = (resp.certificates || []) as Array<{
              subject?: string;
              serialNumber?: string;
              serial?: string;
              issuer?: string;
              validFrom?: string;
              validTo?: string;
              expireDate?: string;
              signature?: string;
              certBase64?: string;
            }>;

            if (rawCerts.length > 0) {
              const now = Date.now();
              const analyzedCerts = rawCerts.map((c) => {
                const expDateStr = c.validTo || c.expireDate || "";
                const exp = parseCertDate(expDateStr);
                const isExp = exp ? exp.getTime() < now : false;
                return { ...c, expDateStr, parsedExp: exp, isExpired: isExp };
              });

              const validCerts = analyzedCerts
                .filter((c) => !c.isExpired)
                .sort((a, b) => (b.parsedExp?.getTime() || 0) - (a.parsedExp?.getTime() || 0));

              if (validCerts.length === 0) {
                const latestExpired = analyzedCerts.sort(
                  (a, b) => (b.parsedExp?.getTime() || 0) - (a.parsedExp?.getTime() || 0)
                )[0];
                setB2bCertIsExpired(true);
                setUsbStatusType("error");
                const msg = `⚠️ Tất cả chứng thư số trong USB Token đều đã hết hạn (chứng thư gần nhất hết hạn ngày ${latestExpired.expDateStr || "N/A"}). Vui lòng liên hệ nhà cung cấp chữ ký số để gia hạn.`;
                setUsbStatus(msg);
                setFormError(msg);
                resolve(null);
                return;
              }

              const activeCert = validCerts[0];
              const cleanWsCert = normalizeCertBase64(activeCert.certBase64 || "");
              const mstMatch = (activeCert.subject || "").match(/MST[:=]([0-9\-]+)/i);
              const resolvedTax = mstMatch && mstMatch[1] ? mstMatch[1] : b2bTaxCode;
              const resolvedCompany = activeCert.subject || b2bCompanyName;
              const resolvedSerial = activeCert.serialNumber || activeCert.serial || "";
              const resolvedIssuer = activeCert.issuer || selectedCaProvider;

              if (mstMatch && mstMatch[1]) setB2bTaxCode(mstMatch[1]);
              setB2bCertIsExpired(false);
              setB2bCompanyName(resolvedCompany);
              setB2bCertSerial(resolvedSerial);
              setB2bCertIssuer(resolvedIssuer);
              setB2bCertValidTo(activeCert.expDateStr || "");
              if (activeCert.validFrom || activeCert.expDateStr) {
                setB2bCertValidRange(`${activeCert.validFrom || ""} - ${activeCert.expDateStr || ""}`);
              }
              setUsbActiveUrl("");
              setUsbSessionId("");
              setB2bWsConnected(Boolean(cleanWsCert));
              setB2bCertBase64(cleanWsCert);
              setB2bSignatureBase64("");
              if (!cleanWsCert) {
                setUsbStatusType("error");
                setUsbStatus(
                  "Phần mềm ký số WebSocket không trả về dữ liệu chứng thư X.509 (certBase64). Vui lòng dùng SignPlugin cổng 14007/14407."
                );
                resolve(null);
                return;
              }
              setB2bSignMethod("usb");
              setUsbStatusType("success");
              setUsbStatus(
                `Đã nhận diện chứng thư còn hiệu lực: ${activeCert.subject} (Hạn: ${activeCert.expDateStr || "N/A"})`
              );
              resolve({
                certBase64: cleanWsCert,
                taxCode: resolvedTax,
                companyName: resolvedCompany,
                serial: resolvedSerial,
                issuer: resolvedIssuer,
                validTo: activeCert.expDateStr || "",
                activeUrl: "",
                sessionId: "",
                viaWs: true,
              });
            } else {
              setUsbStatusType("error");
              setUsbStatus("Đã kết nối nhưng chưa phát hiện thẻ USB Token được cắm vào máy tính.");
              resolve(null);
            }
          } catch {
            resolve(null);
          } finally {
            setIsConnectingUsb(false);
            try {
              ws.close();
            } catch {}
          }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          setIsConnectingUsb(false);
          setUsbStatusType("error");
          setUsbStatus(
            "Không thể kết nối phần mềm ký số (cổng 14007 / 14407 / 15208). Vui lòng kiểm tra USB Token, bật SignPlugin hoặc cấp quyền 'Ứng dụng trên thiết bị (Local Network)' trên trình duyệt."
          );
          setB2bSignMethod("manual");
          resolve(null);
        };
      } catch {
        setIsConnectingUsb(false);
        setUsbStatusType("error");
        setUsbStatus("Trình duyệt chặn kết nối nội bộ tới thiết bị USB Token.");
        setB2bSignMethod("manual");
        resolve(null);
      }
    });
  };

  // B2B Bước 2: Ký số PAdES 2-Phase bằng USB Token (Prepare -> Sign Hash -> Finalize)
  const handleSignBusiness = async () => {
    setError(null);
    setFormError(null);

    if (!b2bOtpVerified) {
      const msg = "Vui lòng xác thực mã OTP Email trước khi thực hiện ký số doanh nghiệp.";
      setFormError(msg);
      setError(msg);
      return;
    }

    if (!consentLegal) {
      const msg = "Quý khách vui lòng tích chọn đồng ý với các điều khoản hợp đồng trước khi thực hiện ký số doanh nghiệp";
      setFormError(msg);
      setError(msg);
      return;
    }

    if (b2bCertIsExpired) {
      const msg = `Chứng thư số đã hết hạn (Hạn: ${b2bCertValidTo || "N/A"}). Vui lòng kết nối lại và chọn chứng thư số còn hiệu lực trước khi ký!`;
      setFormError(msg);
      setError(msg);
      return;
    }

    // Bước 1: Đọc chứng thư số từ USB Token nếu chưa có chứng thư hoặc chưa có phiên SignPlugin/WS
    let effectiveCertBase64 = b2bCertBase64.trim();
    let effectiveTaxCode = b2bTaxCode.trim();
    let effectiveCompanyName = b2bCompanyName.trim();
    let effectiveSerial = b2bCertSerial.trim();
    let effectiveValidTo = b2bCertValidTo.trim();
    let effectiveIssuer =
      b2bCertIssuer.trim() ||
      (selectedCaProvider !== "auto" && selectedCaProvider !== "other" ? selectedCaProvider : "");
    let effectiveActiveUrl = usbActiveUrl;
    let effectiveSessionId = usbSessionId;
    let effectiveViaWs = b2bWsConnected;

    if (b2bSignMethod === "usb" && (!effectiveCertBase64 || (!effectiveActiveUrl && !effectiveViaWs))) {
      const connected = await handleConnectUsbToken();
      if (!connected || !connected.certBase64) {
        return;
      }
      effectiveCertBase64 = connected.certBase64;
      effectiveTaxCode = connected.taxCode.trim() || effectiveTaxCode;
      effectiveCompanyName = connected.companyName.trim() || effectiveCompanyName;
      effectiveSerial = connected.serial.trim() || effectiveSerial;
      effectiveValidTo = connected.validTo.trim() || effectiveValidTo;
      effectiveIssuer = connected.issuer.trim() || effectiveIssuer;
      effectiveActiveUrl = connected.activeUrl;
      effectiveSessionId = connected.sessionId;
      effectiveViaWs = connected.viaWs;
    }

    if (!effectiveTaxCode) {
      const msg = "Vui lòng nhập Mã số thuế doanh nghiệp (*)";
      setFormError(msg);
      setError(msg);
      return;
    }

    const contractTaxCode = (contract?.customer?.taxCode || contract?.customerCode || "")
      .trim()
      .replace(/[\s\-]/g, "");
    const inputTaxCode = effectiveTaxCode.replace(/[\s\-]/g, "");

    if (contractTaxCode && inputTaxCode && contractTaxCode !== inputTaxCode && !isDev) {
      const msg = `Mã số thuế trên USB Token (${effectiveTaxCode}) không trùng khớp với Mã số thuế của Bên B trong hợp đồng (${contract?.customer?.taxCode || contractTaxCode}). Vui lòng cắm đúng USB Token của doanh nghiệp để ký.`;
      setFormError(msg);
      setError(msg);
      return;
    }

    if (!effectiveCertBase64) {
      if (isDev && b2bSignMethod === "manual" && b2bSignatureBase64.trim()) {
        await handleDevMockSignB2b(true);
        return;
      }
      const msg = "Không tìm thấy dữ liệu chứng thư số X.509 từ USB Token. Vui lòng kết nối lại USB Token.";
      setFormError(msg);
      setError(msg);
      return;
    }

    setSigning(true);
    try {
      const userAgentStr = typeof navigator !== "undefined" ? navigator.userAgent : undefined;

      // Bước 2: Gọi ERP /prepare-b2b để lấy session_id & hash_to_sign (SHA-256 64 ký tự hex)
      setUsbStatus("Đang khởi tạo phiên ký số PAdES và nhận mã băm PDF từ máy chủ ERP...");
      const { ok: prepOk, data: prepData } =
        await postContractActionWithFallback<PrepareB2bResponse>(
          initialToken,
          "prepare-b2b",
          {
            cert_base64: effectiveCertBase64,
            tax_code: effectiveTaxCode,
            company_name: effectiveCompanyName || undefined,
            cert_serial: effectiveSerial || undefined,
            valid_to: effectiveValidTo || undefined,
            issuer: effectiveIssuer || undefined,
            user_agent: userAgentStr,
          },
          currentEnv
        );

      if (!prepOk || !prepData?.success || !prepData.session_id || !prepData.hash_to_sign) {
        if (isOtpSessionExpiredError(prepData?.code, prepData?.error)) {
          resetB2bOtpSession(prepData?.error);
        }
        const msg =
          prepData?.error ||
          "Không thể khởi tạo phiên ký số PAdES. Vui lòng kiểm tra chứng thư số, Mã số thuế hoặc trạng thái OTP.";
        setFormError(msg);
        setError(msg);
        setSigning(false);
        return;
      }

      if (prepData.extracted_tax_code && !effectiveTaxCode) {
        effectiveTaxCode = prepData.extracted_tax_code;
        setB2bTaxCode(prepData.extracted_tax_code);
      }

      // Bước 3: Gọi USB Token SignPlugin /signHash (hoặc WebSocket) ký đúng lên hash_to_sign
      let finalSignatureBase64 = b2bSignatureBase64.trim();
      const hashToSignHex = prepData.hash_to_sign.trim().toUpperCase();

      if (effectiveActiveUrl && effectiveSessionId) {
        setUsbStatus("Vui lòng nhập Mã PIN của USB Token trên cửa sổ hiện lên để ký số hợp đồng...");
        const sigFromToken = await postSignPlugin(
          effectiveActiveUrl,
          "/signHash",
          {
            sessionID: effectiveSessionId,
            HashVal: hashToSignHex,
            HashOpt: "2", // 2 = SHA-256 theo đặc tả libmobileid.dll (Viettel/FPT/VNPT SignPlugin)
          },
          60000
        );

        if (!sigFromToken) {
          const lastErr = await postSignPlugin(effectiveActiveUrl, "/getLastErr", {}, 5000);
          let errMsg = `Chưa hoàn tất nhập mã PIN USB Token hoặc bạn đã hủy thao tác ký (Mã lỗi: ${lastErr || "N/A"}).`;
          if (lastErr === "100102" || lastErr === "100105") {
            errMsg = "Không tìm thấy thiết bị USB Token khi thực hiện ký. Vui lòng kiểm tra lại cổng cắm USB Token.";
          } else if (lastErr === "100203" || lastErr === "PIN_INCORRECT") {
            errMsg = "Mã PIN USB Token không chính xác hoặc bạn đã hủy thao tác nhập PIN.";
          } else if (lastErr === "100201") {
            errMsg = "Không thể truy cập khóa bí mật trong USB Token. Vui lòng rút ra cắm lại thiết bị.";
          } else if (lastErr === "100103" || lastErr === "100205") {
            errMsg = "Phiên làm việc với USB Token đã hết hạn. Vui lòng bấm 'Đọc Lại Chứng Thư USB Token' để kết nối lại.";
          }
          setFormError(errMsg);
          setError(errMsg);
          setSigning(false);
          return;
        }

        finalSignatureBase64 = normalizeSignatureToBase64(sigFromToken);
        setB2bSignatureBase64(finalSignatureBase64);
      } else if (effectiveViaWs) {
        setUsbStatus("Vui lòng xác nhận mã PIN trên phần mềm ký số WebSocket...");
        const wsSig = await signHashViaWebSocket(hashToSignHex, effectiveSerial);
        if (!wsSig) {
          const errMsg = "Không nhận được chữ ký từ phần mềm ký số WebSocket hoặc bạn đã hủy nhập PIN.";
          setFormError(errMsg);
          setError(errMsg);
          setSigning(false);
          return;
        }
        finalSignatureBase64 = normalizeSignatureToBase64(wsSig);
        setB2bSignatureBase64(finalSignatureBase64);
      }

      if (!finalSignatureBase64) {
        const msg = "Chưa có dữ liệu chữ ký số từ USB Token. Vui lòng thử ký lại.";
        setFormError(msg);
        setError(msg);
        setSigning(false);
        return;
      }

      // Bước 4: Gửi chữ ký đã ký hash_to_sign cùng session_id + cert_base64 lên ERP /sign-b2b
      setUsbStatus("Đang hoàn tất niêm phong chữ ký số PAdES lên hợp đồng PDF...");
      const { ok: signOk, data: signData } =
        await postContractActionWithFallback<SignB2bResponse>(
          initialToken,
          "sign-b2b",
          {
            session_id: prepData.session_id,
            signature_base64: finalSignatureBase64,
            cert_base64: effectiveCertBase64,
            tax_code: effectiveTaxCode,
            company_name: effectiveCompanyName || undefined,
            cert_serial: effectiveSerial || undefined,
            valid_to: effectiveValidTo || undefined,
            issuer: effectiveIssuer || undefined,
            terms_agreed: true,
            user_agent: userAgentStr,
          },
          currentEnv
        );

      if (signOk && signData?.success) {
        setSignedSuccess(true);
        setContract((prev) =>
          prev ? { ...prev, status: signData?.data?.status || "signed_by_customer" } : prev
        );
        setIsSignModalOpen(false);
        await refreshContractData();
      } else {
        if (isOtpSessionExpiredError(signData?.code, signData?.error)) {
          resetB2bOtpSession(signData?.error);
        }
        const msg =
          signData?.error ||
          "Ký số doanh nghiệp thất bại. Vui lòng kiểm tra lại Mã số thuế, chứng thư số và Token.";
        setFormError(msg);
        setError(msg);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const msg = `Lỗi ký số doanh nghiệp: ${message}`;
      setFormError(msg);
      setError(msg);
    } finally {
      setSigning(false);
    }
  };

  // ==================== CÁC HÀM GIẢ LẬP KÝ SỐ MÔI TRƯỜNG DEV ====================
  const isDev =
    process.env.NODE_ENV !== "production" ||
    (typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.startsWith("192.168.") ||
        window.location.hostname.startsWith("10.") ||
        window.location.port === "3001" ||
        window.location.port === "3000"));

  // Nạp mẫu chữ ký test Profile (tạo chứng thư X.509 RSA-2048 tự ký hợp lệ)
  const handleFillDevMock = () => {
    void handleDevMockSignB2b(false);
  };

  // Giả lập Ký số B2B (Doanh nghiệp USB Token) theo đúng chu trình 2-Phase PAdES:
  // 1. Verify OTP -> 2. Generate RSA-2048 & X.509 (UID=MST) -> 3. prepare-b2b -> 4. RSA sign hash -> 5. sign-b2b
  const handleDevMockSignB2b = async (autoSubmit = true) => {
    setError(null);
    setFormError(null);
    setB2bOtpError(null);

    const mockTaxCode = (
      b2bTaxCode.trim() ||
      contract?.customer?.taxCode ||
      contract?.customerCode ||
      ""
    ).trim();
    const mockCompany = (
      b2bCompanyName.trim() ||
      contract?.customer?.fullName ||
      "Doanh nghiệp kiểm thử"
    ).trim();
    const providerName =
      selectedCaProvider !== "auto" && selectedCaProvider !== "other"
        ? selectedCaProvider
        : "Viettel-CA";
    const issuerLabel = `${providerName} Dev Sandbox`;

    if (!mockTaxCode) {
      const msg = "Vui lòng nhập Mã số thuế doanh nghiệp trước khi thực hiện ký giả lập B2B.";
      setFormError(msg);
      setError(msg);
      return;
    }

    setSigning(true);
    try {
      const userAgentStr = typeof navigator !== "undefined" ? navigator.userAgent : undefined;

      // Bước 1: Sinh cặp khóa RSA-2048 & chứng thư số X.509 tự ký mang UID=MST:<taxCode>
      setUsbStatus("🟢 [Dev Sandbox] Đang khởi tạo cặp khóa RSA-2048 & chứng thư X.509 tự ký...");
      setUsbStatusType("connecting");

      const { certBase64, serialHex, validFromIso, validToIso, privateJwk } =
        await generateDevB2bKeyPairAndCert({
          taxCode: mockTaxCode,
          companyName: mockCompany,
          providerName,
        });

      const validFromDate = new Date(validFromIso).toLocaleDateString("vi-VN");
      const validToDate = new Date(validToIso).toLocaleDateString("vi-VN");

      setB2bTaxCode(mockTaxCode);
      setB2bCompanyName(mockCompany);
      setB2bCertSerial(serialHex);
      setB2bCertIssuer(issuerLabel);
      setB2bCertValidRange(`${validFromDate} - ${validToDate}`);
      setB2bCertValidTo(validToIso);
      setB2bCertIsExpired(false);
      setUsbActiveUrl("");
      setUsbSessionId("");
      setB2bWsConnected(false);
      setB2bCertBase64(certBase64);
      setB2bSignatureBase64("");
      setConsentLegal(true);
      setB2bSignMethod("usb");
      setUsbStatusType("success");
      setUsbStatus(
        `🟢 [Dev Sandbox] Đã tạo chứng thư số X.509 RSA-2048 hợp lệ (UID=MST:${mockTaxCode}, Serial: ${serialHex}).`
      );

      if (!autoSubmit) {
        if (!b2bOtpVerified) {
          setB2bOtpCode("123456");
          setB2bOtpMessage(
            "Đã điền sẵn OTP mẫu 123456. Nếu máy chủ chưa bật ALLOW_DEV_OTP_BYPASS, vui lòng bấm 'Gửi mã OTP qua Email' để nhận OTP thật."
          );
        }
        return;
      }

      // Bước 2: Nếu chưa verify OTP -> gọi /verify-otp với mã dev 123456 (hoặc mã đã nhập)
      if (!b2bOtpVerified) {
        const otpAttempt = b2bOtpCode.trim() || "123456";
        setB2bOtpCode(otpAttempt);
        const { ok: otpOk, data: otpData } =
          await postContractActionWithFallback<VerifyOtpResponse>(
            initialToken,
            "verify-otp",
            {
              otp_code: otpAttempt,
              user_agent: userAgentStr,
            },
            currentEnv
          );

        if (!otpOk || !otpData?.success) {
          const rawErr = otpData?.error || "Chưa xác thực được mã OTP Email.";
          const guideMsg = `${rawErr} Nếu máy chủ chưa bật ALLOW_DEV_OTP_BYPASS, vui lòng bấm "Gửi mã OTP qua Email", nhập mã OTP từ hộp thư và bấm "Xác nhận OTP" trước khi ký giả lập.`;
          setB2bOtpVerified(false);
          setB2bOtpError(guideMsg);
          setError(guideMsg);
          return;
        }

        setB2bOtpVerified(true);
        setB2bOtpVerifiedAt(
          otpData.verifiedAt || otpData.verified_at || new Date().toISOString()
        );
        setB2bOtpMessage("Đã xác thực OTP Email thành công.");
        setB2bOtpError(null);
      }

      // Bước 3: Gọi prepare-b2b lấy session_id & hash_to_sign
      setUsbStatus("🟢 [Dev Sandbox] Đang gọi /prepare-b2b để lấy mã băm PAdES...");
      const { ok: prepOk, data: prepData } =
        await postContractActionWithFallback<PrepareB2bResponse>(
          initialToken,
          "prepare-b2b",
          {
            cert_base64: certBase64,
            tax_code: mockTaxCode,
            company_name: mockCompany,
            cert_serial: serialHex,
            valid_to: validToIso,
            issuer: issuerLabel,
            user_agent: userAgentStr,
          },
          currentEnv
        );

      if (!prepOk || !prepData?.success || !prepData.session_id || !prepData.hash_to_sign) {
        if (isOtpSessionExpiredError(prepData?.code, prepData?.error)) {
          resetB2bOtpSession(prepData?.error);
        }
        const msg = prepData?.error || "Không thể khởi tạo phiên ký giả lập B2B (/prepare-b2b).";
        setFormError(msg);
        setError(msg);
        return;
      }

      // Bước 4: Dùng khóa bí mật RSA-2048 vừa tạo ký PKCS#1 v1.5 DigestInfo(SHA-256) lên hash_to_sign
      setUsbStatus("🟢 [Dev Sandbox] Đang ký RSA-SHA256 lên hash_to_sign...");
      const signatureBase64 = signSha256HashPkcs1v15(prepData.hash_to_sign, privateJwk);
      setB2bSignatureBase64(signatureBase64);

      // Bước 5: Gọi sign-b2b hoàn tất ký PAdES
      setUsbStatus("🟢 [Dev Sandbox] Đang gửi chữ ký số lên /sign-b2b...");
      const { ok: signOk, data: signData } =
        await postContractActionWithFallback<SignB2bResponse>(
          initialToken,
          "sign-b2b",
          {
            session_id: prepData.session_id,
            signature_base64: signatureBase64,
            cert_base64: certBase64,
            tax_code: mockTaxCode,
            company_name: mockCompany,
            cert_serial: serialHex,
            valid_to: validToIso,
            issuer: issuerLabel,
            terms_agreed: true,
            user_agent: userAgentStr,
          },
          currentEnv
        );

      if (signOk && signData?.success) {
        setSignedSuccess(true);
        setContract((prev) =>
          prev ? { ...prev, status: signData?.data?.status || "signed_by_customer" } : prev
        );
        setIsSignModalOpen(false);
        await refreshContractData();
      } else {
        if (isOtpSessionExpiredError(signData?.code, signData?.error)) {
          resetB2bOtpSession(signData?.error);
        }
        const msg = signData?.error || "Giả lập ký số doanh nghiệp thất bại.";
        setFormError(msg);
        setError(msg);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const msg = `Lỗi giả lập ký số B2B: ${message}`;
      setFormError(msg);
      setError(msg);
    } finally {
      setSigning(false);
    }
  };

  // Giả lập Ký số B2C (Cá nhân OTP & Chữ ký tay)
  const handleDevMockSignB2c = async (autoSubmit = true) => {
    console.log("[portal] handleDevMockSignB2c triggered, autoSubmit:", autoSubmit);
    setError(null);
    setFormError(null);
    setOtpCode("123456");
    setConsentLegal(true);

    // Tự động vẽ nét chữ ký mẫu lên Canvas
    if (sigPadRef.current?.drawSample) {
      sigPadRef.current.drawSample();
    }
    if (modalSigPadRef.current?.drawSample) {
      modalSigPadRef.current.drawSample();
    }

    const sampleSignature =
      sigPadRef.current?.toDataURL() || modalSigPadRef.current?.toDataURL() || "";
    
    // Đảm bảo luôn có chuỗi base64 chữ ký hợp lệ ngay cả khi Canvas chưa render xong
    const effectiveSignature = sampleSignature && sampleSignature.length >= 50
      ? sampleSignature
      : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAAAyCAYAAACqNX6+AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAFMSURBVHhe7ds9CsIwGAbgq6iLu6uI4CY4O4kndHQTD+Dk3WkXh1Zwk466uDh0E/8kSdpA2uKfhPq+8ARCSZtXnra0h0AIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEII4d9aLF/z7b6/j228399eYztK3W6q5oK32mru+v1kNt9U4/F0s0gIhxBCfI8g5oK32moq4l0+Zp5v95vdvF/vF/s9r9lCCCEhTghCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCF+V1W16a/6vX39p6b6rC9V1c1eZ7q/3vH7qgkhhBBCCOHfmB/3x+N2M295+PfrWn0OQgghhBBCrO6qC04IIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQggRjxD/6Xp+G8kghBBCCCGEEEIIIYQQQgghhH8hIUI47wD11o/c0kH6bQAAAABJRU5ErkJggg==";

    setSavedSignatureBase64(effectiveSignature);

    if (!autoSubmit) {
      // Chế độ "Điền mẫu": Nạp chữ ký & chuyển sang Bước 2 để kiểm tra giao diện OTP
      setB2cStep(2);
      return;
    }

    setSigning(true);
    try {
      const { ok, data } = await postContractActionWithFallback<{
        success: boolean;
        error?: string;
        data?: { status?: string };
      }>(
        initialToken,
        "sign",
        {
          signature_image_base64: effectiveSignature,
          otp_code: otpCode.trim() || "123456",
          terms_agreed: true,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        },
        currentEnv
      );

      if (ok && data?.success) {
        setSignedSuccess(true);
        setContract((prev) => (prev ? { ...prev, status: data?.data?.status || "signed_by_customer" } : prev));
        setIsSignModalOpen(false);
        await refreshContractData();
      } else {
        const rawErr = data?.error || "Giả lập ký hợp đồng cá nhân thất bại.";
        const msg = rawErr.includes("Chưa có yêu cầu OTP")
          ? `${rawErr} (Nếu máy chủ chưa bật ALLOW_DEV_OTP_BYPASS, vui lòng bấm "Tiếp tục & Nhận mã OTP" và nhập mã OTP thật.)`
          : rawErr;
        setFormError(msg);
        setError(msg);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Lỗi giả lập ký cá nhân: ${message}`);
    } finally {
      setSigning(false);
    }
  };

  // Reset trạng thái hợp đồng về pending_customer trong Dev để test lại luồng
  const [resetting, setResetting] = useState(false);
  const handleDevResetContract = async () => {
    setResetting(true);
    setError(null);
    setFormError(null);
    try {
      const { ok, data } = await postContractActionWithFallback<{
        success: boolean;
        error?: string;
      }>(initialToken, "reset-dev", {}, currentEnv);

      if (ok && data?.success) {
        setSignedSuccess(false);
        setContract((prev) => (prev ? { ...prev, status: "pending_customer" } : prev));
        setB2cStep(1);
        setSavedSignatureBase64("");
        setOtpCode("");
        setOtpMessage(null);
        setB2bOtpCode("");
        setB2bOtpVerified(false);
        setB2bOtpVerifiedAt(null);
        setB2bOtpCooldown(0);
        setB2bOtpMessage(null);
        setB2bOtpError(null);
        setB2bCertBase64("");
        setB2bSignatureBase64("");
        setB2bCertSerial("");
        setB2bCertIssuer("");
        setB2bCertValidRange("");
        setB2bCertValidTo("");
        setB2bCertIsExpired(false);
        setUsbSessionId("");
        setUsbActiveUrl("");
        setB2bWsConnected(false);
        setUsbStatus(null);
        setUsbStatusType("idle");
        setConsentLegal(false);
        await refreshContractData();
      } else {
        setError(data?.error || "Không thể reset hợp đồng");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Lỗi reset: ${msg}`);
    } finally {
      setResetting(false);
    }
  };

  const handleOpenHistory = () => {
    // 1. Mở Modal Lịch Sử (Audit Trail Modal) ngay lập tức để xem trọn vẹn không bị che khuất
    setIsHistoryModalOpen(true);
    // 2. Chuyển mobileTab sang 'history' nếu đang ở mobile
    setMobileTab("history");
    // 3. Cuộn mượt mà vùng sidebar trên desktop tới thẻ lịch sử
    if (signSectionRef.current) {
      const el = document.getElementById("contract-audit-timeline-section");
      if (el) {
        signSectionRef.current.scrollTo({
          top: el.offsetTop - 12,
          behavior: "smooth",
        });
      }
    }
  };

  const scrollToSigning = () => {
    // Trên mobile, mở modal ký hoặc chuyển thẳng sang tab Ký hợp đồng
    setMobileTab("sign");
    setIsSignModalOpen(true);
    // Đồng thời cuộn vùng ký ở sidebar (cho desktop khi đóng modal)
    if (signSectionRef.current) {
      signSectionRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 680, margin: "80px auto", padding: 24, textAlign: "center" }}>
        <div className="spinner" style={{ margin: "0 auto 16px" }} />
        <h2 style={{ fontSize: 18, color: "#334155" }}>Đang tải hợp đồng điện tử...</h2>
        <p style={{ color: "#64748b", fontSize: 14 }}>Vui lòng đợi trong giây lát</p>
      </div>
    );
  }

  if (error && !contract) {
    return (
      <div style={{ maxWidth: 600, margin: "60px auto", padding: "32px 24px", textAlign: "center", background: "#ffffff", borderRadius: 16, border: "1px solid #fee2e2", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}>
        <div onClick={handleSecretTrigger} style={{ display: "inline-block", cursor: "pointer" }} title="Nhấn 3 lần để mở cấu hình kiểm thử">
          <AlertCircle size={48} color="#ef4444" style={{ margin: "0 auto 16px" }} />
        </div>
        <h2 style={{ fontSize: 20, color: "#991b1b", marginBottom: 16 }}>Không thể truy cập hợp đồng</h2>
        <div style={{ padding: 16, background: "#f8fafc", borderRadius: 12, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
          Nếu liên kết đã hết hạn hoặc có sai sót, Quý khách vui lòng liên hệ Tổng đài CSKH: <strong style={{ color: "#2563eb" }}>0359 613 267</strong> để được cấp liên kết mới.
        </div>

        {allowDevTools && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px dashed #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setIsEnvModalOpen(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: currentEnv === "staging" ? "#ffedd5" : "#eff6ff",
                  color: currentEnv === "staging" ? "#c2410c" : "#2563eb",
                  border: `1px solid ${currentEnv === "staging" ? "#fdba74" : "#bfdbfe"}`,
                  cursor: "pointer",
                }}
              >
                <Server size={14} />
                Đổi Môi Trường (Đang là: {currentEnv})
              </button>
              <button
                type="button"
                onClick={() => refreshContractData()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: "#f8fafc",
                  color: "#334155",
                  border: "1px solid #cbd5e1",
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={14} />
                Thử Lại Kết Nối
              </button>
            </div>
            {error && (
              <div style={{ marginTop: 12, fontSize: 11, fontFamily: "monospace", color: "#94a3b8", wordBreak: "break-all" }}>
                Chi tiết: {error}
              </div>
            )}
          </div>
        )}

        <EnvironmentSwitcherModal
          isOpen={isEnvModalOpen}
          onClose={() => setIsEnvModalOpen(false)}
          currentEnv={currentEnv}
          onSelectEnv={handleChangeEnv}
        />
      </div>
    );
  }

  const isB2B = contract?.customerSignerType === "business_token" || contract?.templateCode === "02/HĐ-CNDN";
  // Ưu tiên signed URL trực tiếp từ Supabase Storage CDN nếu có, hoặc proxy kèm param env
  const displayPdfUrl = contract?.pdfUrl && contract.pdfUrl.startsWith("http")
    ? contract.pdfUrl
    : (pdfVersion > 0
        ? `/api/portal/contracts/${initialToken}/pdf?env=${currentEnv}&v=${pdfVersion}`
        : `/api/portal/contracts/${initialToken}/pdf?env=${currentEnv}`);

  return (
    <div className="contract-root">
      {/* 1. TOP HEADER BAR (Chuẩn Chuyên Nghiệp Tương Tự ERP) */}
      <header className="contract-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          <div
            onClick={handleSecretTrigger}
            style={{
              padding: "6px 8px",
              backgroundColor: "#eff6ff",
              color: "#2563eb",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 5,
              flexShrink: 0,
              cursor: "pointer",
              userSelect: "none",
            }}
            title="Nhấn 3 lần để mở cấu hình kiểm thử (Staging / Production)"
          >
            <FileText size={17} />
            <span className="hide-on-mobile">Cổng Ký Số HĐĐT</span>
          </div>

          {currentEnv !== "production" && (
            <button
              type="button"
              onClick={() => setIsEnvModalOpen(true)}
              style={{
                padding: "3px 8px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                backgroundColor: currentEnv === "staging" ? "#ffedd5" : "#e0e7ff",
                color: currentEnv === "staging" ? "#c2410c" : "#3730a3",
                border: `1px solid ${currentEnv === "staging" ? "#fdba74" : "#a5b4fc"}`,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                textTransform: "uppercase",
              }}
              title="Đang ở môi trường kiểm thử. Nhấn để đổi sang Production"
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: currentEnv === "staging" ? "#ea580c" : "#4f46e5",
                }}
              />
              {currentEnv}
            </button>
          )}

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap" }}>
              <h1 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={contract?.contractNumber || "Hợp Đồng"}>
                {contract?.contractNumber || "Hợp Đồng Cấp Nước"}
              </h1>

              {isStatusCompleted(contract?.status) ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#dcfce7", color: "#15803d", padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                  <ShieldCheck size={12} /> <span className="hide-on-mobile">Đã Hoàn Tất</span>
                </span>
              ) : isCustomerSigned(contract?.status) || signedSuccess ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#eff6ff", color: "#1d4ed8", padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                  <Clock size={12} /> <span className="hide-on-mobile">Khách Đã Ký - Chờ Duyệt</span>
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#fef3c7", color: "#b45309", padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                  <PenTool size={11} /> <span className="hide-on-mobile">Chờ Ký</span>
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 11.5, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {contract?.customer?.fullName} • {contract?.customer?.phone}
            </p>
          </div>
        </div>

        {/* Cụm Action Toolbar ở Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* Nút xem lịch sử giao kết */}
          <button
            type="button"
            onClick={handleOpenHistory}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              backgroundColor: "#f8fafc",
              border: "1px solid #cbd5e1",
              color: "#334155",
              padding: "6px 10px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Xem toàn bộ lịch sử kiểm toán giao kết"
          >
            <Clock size={13} color="#2563eb" />
            <span className="hide-on-mobile">Lịch Sử</span>
            <span style={{ backgroundColor: "#e2e8f0", padding: "1px 5px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
              {auditLogs.length}
            </span>
          </button>

          {!signedSuccess ? (
            <>
              {isDev && (
                <button
                  type="button"
                  className="hide-on-mobile"
                  onClick={() => (isB2B ? handleDevMockSignB2b(true) : handleDevMockSignB2c(true))}
                  disabled={signing}
                  title="Giả lập ký số khách hàng trên môi trường Dev"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    backgroundColor: "#f59e0b",
                    color: "#ffffff",
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    border: "none",
                    cursor: signing ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 8px rgba(245, 158, 11, 0.25)",
                  }}
                >
                  <Sparkles size={13} />
                  <span>{signing ? "Đang ký..." : "⚡ Ký Dev"}</span>
                </button>
              )}
              <button
                type="button"
                onClick={scrollToSigning}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  padding: "7px 14px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 3px 10px rgba(37, 99, 235, 0.25)",
                  transition: "all 0.15s ease",
                }}
              >
                <FileSignature size={15} />
                <span>✍️ Ký Ngay</span>
              </button>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {isDev && (
                <button
                  type="button"
                  className="hide-on-mobile"
                  onClick={handleDevResetContract}
                  disabled={resetting}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    backgroundColor: "#f1f5f9",
                    color: "#475569",
                    padding: "6px 10px",
                    borderRadius: 8,
                    fontSize: 11.5,
                    fontWeight: 600,
                    border: "1px solid #cbd5e1",
                    cursor: resetting ? "not-allowed" : "pointer",
                  }}
                >
                  <RefreshCw size={12} className={resetting ? "animate-spin" : ""} />
                  <span>{resetting ? "Reset..." : "🔄 Reset Dev"}</span>
                </button>
              )}
              {displayPdfUrl && (
                <a
                  href={displayPdfUrl}
                  download={`HopDong_${contract?.contractNumber}.pdf`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    backgroundColor: "#16a34a",
                    color: "#ffffff",
                    padding: "7px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "none",
                    boxShadow: "0 3px 8px rgba(22, 163, 74, 0.2)",
                  }}
                >
                  <Download size={14} />
                  <span>Tải Bản Ký</span>
                </a>
              )}
            </div>
          )}
        </div>
      </header>

      {/* 2. MOBILE SEGMENTED CONTROL TABS */}
      <nav className="contract-mobile-tabs">
        <button
          type="button"
          className={`contract-tab-btn ${mobileTab === "pdf" ? "active" : ""}`}
          onClick={() => setMobileTab("pdf")}
        >
          <FileText size={15} />
          <span>Văn Bản HĐ</span>
        </button>
        <button
          type="button"
          className={`contract-tab-btn ${mobileTab === "sign" ? "active" : ""}`}
          onClick={() => setMobileTab("sign")}
        >
          <PenTool size={15} />
          <span>{signedSuccess ? "Hồ Sơ Đã Ký" : "Ký Hợp Đồng"}</span>
        </button>
        <button
          type="button"
          className={`contract-tab-btn ${mobileTab === "history" ? "active" : ""}`}
          onClick={() => setMobileTab("history")}
        >
          <Clock size={15} />
          <span>Lịch Sử ({auditLogs.length})</span>
        </button>
      </nav>

      {/* 3. MAIN 2-COLUMN SPLIT VIEW / MOBILE SINGLE VIEW */}
      <div className="contract-main-layout">
        
        {/* CỘT TRÁI (65% desktop / 100% mobile tab 'pdf'): PDF VIEWER */}
        <section className={`contract-pdf-section ${mobileTab !== "pdf" ? "hidden-mobile" : ""}`}>
          <ContractPdfViewer
            pdfUrl={displayPdfUrl}
            title={`Hợp Đồng Số: ${contract?.contractNumber} - ${contract?.customer?.fullName}`}
            contract={contract}
          />
        </section>

        {/* CỘT PHẢI (35% desktop / 100% mobile tab 'sign' hoặc 'history') */}
        <aside
          ref={signSectionRef}
          className={`contract-sidebar-section ${mobileTab === "pdf" ? "hidden-mobile" : ""}`}
        >
          {/* Cảnh báo yêu cầu ký lại nếu Ban Quản lý từ chối chữ ký cũ */}
          {contract?.status === "pending_customer" && resignLog && (
            <div
              style={{
                backgroundColor: "#fff7ed",
                border: "1px solid #fdba74",
                borderRadius: 14,
                padding: "12px 14px",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <AlertCircle size={20} color="#ea580c" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <h4 style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 700, color: "#9a3412" }}>
                  Hồ Sơ Được Yêu Cầu Ký Lại
                </h4>
                <p style={{ margin: 0, fontSize: 12, color: "#c2410c", lineHeight: 1.45 }}>
                  Ban Quản lý đã gửi yêu cầu ký lại đối với hợp đồng này.
                  {resignReason ? (
                    <>
                      {" "}Lý do: <strong>&ldquo;{resignReason}&rdquo;</strong>.
                    </>
                  ) : null}{" "}
                  Quý khách vui lòng kiểm tra lại thông tin và thực hiện ký xác nhận lại bên dưới.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", color: "#b91c1c", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* CARD TÓM TẮT THÔNG TIN HỢP ĐỒNG */}
          <div className={mobileTab === "history" ? "hide-on-tablet-down" : ""} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
              <User size={15} color="#2563eb" />
              Thông Tin Khách Hàng (Bên B)
            </h3>

            <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
              <div>
                <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>Họ tên khách hàng / Đơn vị:</span>
                <strong style={{ color: "#0f172a", fontSize: 14 }}>{contract?.customer?.fullName}</strong>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>Số điện thoại:</span>
                  <span style={{ color: "#0f172a", fontWeight: 600 }}>{contract?.customer?.phone}</span>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>Số đồng hồ:</span>
                  <span style={{ color: "#0f172a", fontWeight: 600 }}>{contract?.meter?.meterSerial || "-"}</span>
                </div>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>Tuyến cấp nước:</span>
                <span style={{ color: "#334155" }}>{contract?.route?.routeName || "-"}</span>
              </div>
              <div>
                <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>Địa chỉ lắp đặt:</span>
                <span style={{ color: "#334155", lineHeight: 1.4 }}>{contract?.customer?.address || "-"}</span>
              </div>
            </div>

            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, fontSize: 12 }}>
              {isStatusCompleted(contract?.status) || Boolean(contract?.companySignedAt) ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#16a34a", fontWeight: 600 }}>
                  <ShieldCheck size={16} />
                  <span>Bên A (Minh Phong) đã duyệt & ký số PAdES</span>
                </div>
              ) : isCustomerSigned(contract?.status) || signedSuccess ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#0284c7", fontWeight: 600 }}>
                  <Clock size={16} />
                  <span>Bên A đang thẩm định & duyệt ký</span>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#b45309", fontWeight: 600 }}>
                  <PenTool size={16} />
                  <span>Bên B (Khách hàng) ký trước</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleOpenHistory}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  color: "#2563eb",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  padding: "3px 8px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                title="Bấm để xem chi tiết lịch sử giao kết"
              >
                <Clock size={12} />
                <span>Lịch sử ({auditLogs.length})</span>
              </button>
            </div>
          </div>

          {/* CARD THỰC HIỆN KÝ SỐ */}
          {signedSuccess ? (
            isStatusCompleted(contract?.status) ? (
              /* TRƯỜNG HỢP 1: ĐÃ HOÀN TẤT GIAO KẾT (CẢ 2 BÊN ĐÃ KÝ & ĐÓNG DẤU PAdES) */
              <div className={mobileTab === "history" ? "hide-on-tablet-down" : ""} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 14, padding: "16px 14px", textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
                  <CheckCircle2 size={24} color="#16a34a" />
                  <h3 style={{ fontSize: 15, color: "#166534", fontWeight: 700, margin: 0 }}>
                    Hợp Đồng Đã Hoàn Tất Giao Kết!
                  </h3>
                </div>
                <p style={{ color: "#475569", fontSize: 12, margin: "0 0 12px" }}>
                  Số <strong>{contract?.contractNumber}</strong> đã hoàn tất giao kết với đầy đủ 2 mộc chữ ký số và dấu niêm phong PAdES hợp pháp.
                </p>
                {displayPdfUrl && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <a
                      href={displayPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        background: "#2563eb",
                        color: "#ffffff",
                        padding: "8px 10px",
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: 12,
                        textDecoration: "none",
                      }}
                    >
                      <FileText size={14} />
                      Mở Văn Bản
                    </a>
                    <a
                      href={displayPdfUrl}
                      download={`HopDong_${contract?.contractNumber}.pdf`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        background: "#ffffff",
                        color: "#334155",
                        padding: "8px 10px",
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: 12,
                        textDecoration: "none",
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      <Download size={14} />
                      Tải Tệp PDF
                    </a>
                  </div>
                )}
                {/* Phím tắt mở lịch sử và xem chứng thư số PAdES */}
                <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setIsCertModalOpen(true)}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      border: "1px solid #bfdbfe",
                      padding: "7px 10px",
                      borderRadius: 8,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                    title="Xem chứng thư số X.509 và thông tin niêm phong PAdES"
                  >
                    <ShieldCheck size={13} color="#2563eb" />
                    <span>Chứng Thư Số PAdES</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenHistory}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      background: "#ecfdf5",
                      color: "#047857",
                      border: "1px solid #a7f3d0",
                      padding: "7px 10px",
                      borderRadius: 8,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Clock size={13} />
                    <span>Lịch Sử ({auditLogs.length})</span>
                  </button>
                  {isDev && (
                    <button
                      type="button"
                      onClick={handleDevResetContract}
                      disabled={resetting}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        background: "#f8fafc",
                        color: "#475569",
                        border: "1px dashed #cbd5e1",
                        padding: "7px 10px",
                        borderRadius: 8,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: resetting ? "not-allowed" : "pointer",
                      }}
                      title="Reset về chờ ký trong môi trường dev"
                    >
                      <RefreshCw size={12} className={resetting ? "animate-spin" : ""} />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* TRƯỜNG HỢP 2: KHÁCH HÀNG ĐÃ KÝ BÊN B - ĐANG CHỜ CÔNG TY PHÊ DUYỆT & KÝ SỐ BÊN A */
              <div className={mobileTab === "history" ? "hide-on-tablet-down" : ""} style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 14, padding: "16px 14px", textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
                  <CheckCircle2 size={24} color="#0284c7" />
                  <h3 style={{ fontSize: 15, color: "#0369a1", fontWeight: 700, margin: 0 }}>
                    Quý Khách Đã Ký Hợp Đồng Thành Công!
                  </h3>
                </div>
                <p style={{ color: "#475569", fontSize: 12, margin: "0 0 12px", lineHeight: 1.5 }}>
                  Hồ sơ số <strong>{contract?.contractNumber}</strong> đã được chuyển đến Ban Giám Đốc Công ty Cấp nước Minh Phong để thẩm định và đóng dấu số niêm phong điện tử Bên A. Sau khi hoàn tất phê duyệt, hệ thống sẽ tự động gửi bản hợp đồng chính thức có đầy đủ chữ ký 2 bên qua Email và Zalo.
                </p>
                {displayPdfUrl && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <a
                      href={displayPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        background: "#0284c7",
                        color: "#ffffff",
                        padding: "8px 10px",
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: 12,
                        textDecoration: "none",
                      }}
                    >
                      <FileText size={14} />
                      Xem Bản Đã Ký
                    </a>
                    <a
                      href={displayPdfUrl}
                      download={`HopDong_${contract?.contractNumber}_BanTam.pdf`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        background: "#ffffff",
                        color: "#334155",
                        padding: "8px 10px",
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: 12,
                        textDecoration: "none",
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      <Download size={14} />
                      Tải Bản Ký Tạm
                    </a>
                  </div>
                )}
                <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={handleOpenHistory}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      background: "#e0f2fe",
                      color: "#0369a1",
                      border: "1px solid #7dd3fc",
                      padding: "7px 10px",
                      borderRadius: 8,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Clock size={13} />
                    <span>Lịch Sử Giao Kết ({auditLogs.length})</span>
                  </button>
                  {isDev && (
                    <button
                      type="button"
                      onClick={handleDevResetContract}
                      disabled={resetting}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        background: "#f8fafc",
                        color: "#475569",
                        border: "1px dashed #cbd5e1",
                        padding: "7px 10px",
                        borderRadius: 8,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: resetting ? "not-allowed" : "pointer",
                      }}
                      title="Reset về chờ ký trong môi trường dev"
                    >
                      <RefreshCw size={12} className={resetting ? "animate-spin" : ""} />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>
            )
          ) : (
            <div className={mobileTab === "history" ? "hide-on-tablet-down" : ""} style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 16, padding: 18, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
                <PenTool size={16} color="#2563eb" />
                Thực Hiện Ký Hợp Đồng
              </h3>
              <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 14px" }}>
                {!isB2B
                  ? "Quý khách vui lòng xác thực mã OTP và vẽ chữ ký tay để hoàn tất."
                  : "Quý khách cắm USB Token để thực hiện ký số doanh nghiệp."}
              </p>

              {/* Dev Simulation Box */}
              {isDev && (
                <div
                  style={{
                    background: "#fffbeb",
                    border: "1px dashed #f59e0b",
                    borderRadius: 10,
                    padding: "10px 12px",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#b45309" }}>
                      <Sparkles size={14} />
                      GIẢ LẬP KÝ SỐ (DEV SANDBOX)
                    </div>
                    <span style={{ fontSize: 9, background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                      MÔI TRƯỜNG DEV
                    </span>
                  </div>
                  <p style={{ margin: "0 0 10px", fontSize: 11, color: "#78350f", lineHeight: 1.4 }}>
                    {isB2B
                      ? "Giả lập kết nối USB Token Viettel-CA và sinh chuỗi mã hóa ký số PKCS#7 tự động."
                      : "Giả lập chữ ký tay nét bút và tự động xác thực mã OTP test (123456)."}
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => (isB2B ? handleDevMockSignB2b(true) : handleDevMockSignB2c(true))}
                      disabled={signing}
                      style={{
                        flex: 2,
                        background: signing ? "#94a3b8" : "#d97706",
                        color: "#ffffff",
                        border: "none",
                        padding: "8px 10px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: signing ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 5,
                        boxShadow: "0 2px 6px rgba(217, 119, 6, 0.25)",
                      }}
                    >
                      <Sparkles size={13} />
                      {signing ? "Đang ký số..." : "⚡ Ký Giả Lập Ngay (1-Click)"}
                    </button>
                    <button
                      type="button"
                      onClick={() => (isB2B ? handleDevMockSignB2b(false) : handleDevMockSignB2c(false))}
                      style={{
                        flex: 1,
                        background: "#ffffff",
                        color: "#b45309",
                        border: "1px solid #fcd34d",
                        padding: "8px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Điền mẫu
                    </button>
                  </div>
                </div>
              )}

              {!isB2B ? (
                // ==================== KHÁCH HÀNG CÁ NHÂN (LUỒNG 2 BƯỚC TUẦN TỰ) ====================
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Stepper chỉ báo tiến trình trực quan */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0 6px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: b2cStep === 2 ? "pointer" : "default",
                      }}
                      onClick={() => {
                        if (b2cStep === 2) {
                          setB2cStep(1);
                          setFormError(null);
                        }
                      }}
                      title={b2cStep === 2 ? "Bấm để quay lại Bước 1 (Vẽ lại chữ ký)" : undefined}
                    >
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: b2cStep === 1 ? "#2563eb" : "#16a34a",
                          color: "#ffffff",
                          fontSize: 11,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {b2cStep > 1 ? <Check size={13} /> : "1"}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: b2cStep === 1 ? "#1e293b" : "#16a34a",
                        }}
                      >
                        1. Vẽ chữ ký
                      </span>
                    </div>

                    <div
                      style={{
                        flex: 1,
                        height: 2,
                        background: b2cStep === 2 ? "#16a34a" : "#e2e8f0",
                        transition: "background 0.3s ease",
                      }}
                    />

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: b2cStep === 2 ? "#2563eb" : "#94a3b8",
                          color: "#ffffff",
                          fontSize: 11,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        2
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: b2cStep === 2 ? "#1e293b" : "#94a3b8",
                        }}
                      >
                        2. Nhập OTP
                      </span>
                    </div>
                  </div>

                  {/* BƯỚC 1: VẼ CHỮ KÝ TAY & CHỌN KÊNH OTP */}
                  <div style={{ display: b2cStep === 1 ? "flex" : "none", flexDirection: "column", gap: 14 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
                          Vẽ chữ ký tay của Quý khách: <span style={{ color: "#dc2626" }}>(Bắt buộc)</span>
                        </label>
                      </div>
                      <SignaturePad ref={sigPadRef} />
                    </div>

                    {/* Khung lựa chọn kênh nhận mã OTP */}
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "flex", alignItems: "center", gap: 5 }}>
                          <KeyRound size={14} color="#2563eb" />
                          Nhận mã OTP qua:
                        </span>
                        <div style={{ display: "flex", gap: 10, fontSize: 12 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", color: "#334155", fontWeight: otpChannel === "zalo" ? 600 : 400 }}>
                            <input
                              type="radio"
                              name="channel_side"
                              value="zalo"
                              checked={otpChannel === "zalo"}
                              onChange={() => setOtpChannel("zalo")}
                            />
                            Zalo {contract?.customer?.phone ? `(${contract.customer.phone})` : ""}
                          </label>
                          {contract?.customer?.email && (
                            <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", color: "#334155", fontWeight: otpChannel === "email" ? 600 : 400 }}>
                              <input
                                type="radio"
                                name="channel_side"
                                value="email"
                                checked={otpChannel === "email"}
                                onChange={() => setOtpChannel("email")}
                              />
                              Email
                            </label>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Hiển thị lỗi form nếu chưa vẽ chữ ký */}
                    {formError && (
                      <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", color: "#b91c1c", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <AlertCircle size={15} style={{ flexShrink: 0 }} />
                        <span>{formError}</span>
                      </div>
                    )}

                    {/* Nút bấm chuyển sang Bước 2 & tự động gửi mã OTP */}
                    <button
                      type="button"
                      onClick={() => handleProceedToOtp(false)}
                      disabled={otpLoading}
                      style={{
                        background: "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        padding: "12px",
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: "pointer",
                        boxShadow: "0 4px 10px rgba(37,99,235,0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      {otpLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Đang gửi mã OTP...</span>
                        </>
                      ) : (
                        <>
                          <span>Tiếp tục & Nhận mã OTP</span>
                          <ArrowRight size={17} />
                        </>
                      )}
                    </button>
                  </div>

                  {/* BƯỚC 2: XÁC THỰC OTP & HOÀN TẤT KÝ */}
                  <div style={{ display: b2cStep === 2 ? "flex" : "none", flexDirection: "column", gap: 14 }}>
                    {/* Thẻ preview chữ ký tay đã vẽ */}
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.03em", display: "flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle2 size={13} color="#16a34a" /> Chữ ký tay đã ghi nhận
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setB2cStep(1);
                            setFormError(null);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#2563eb",
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            padding: 0,
                          }}
                          title="Quay lại Bước 1 để vẽ lại nét chữ ký"
                        >
                          <RotateCcw size={12} />
                          <span>Vẽ lại chữ ký</span>
                        </button>
                      </div>
                      {savedSignatureBase64 && (
                        <div style={{ background: "#ffffff", border: "1px dashed #cbd5e1", borderRadius: 8, padding: 6, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 64 }}>
                          <img
                            src={savedSignatureBase64}
                            alt="Chữ ký đã vẽ"
                            style={{ maxHeight: 60, maxWidth: "100%", objectFit: "contain" }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Thẻ nhập mã xác thực OTP */}
                    <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <KeyRound size={15} color="#2563eb" />
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#1e40af" }}>
                          Nhập mã xác thực OTP 6 số
                        </span>
                      </div>

                      <p style={{ margin: "0 0 10px", fontSize: 12, color: "#334155", lineHeight: 1.4 }}>
                        {otpChannel === "zalo"
                          ? `Hệ thống đã tự động gửi mã OTP tới Zalo số ${contract?.customer?.phone || ""}.`
                          : `Hệ thống đã tự động gửi mã OTP tới email ${contract?.customer?.email || ""}.`}
                      </p>

                      <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                        <input
                          ref={otpInputRef}
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          placeholder="Nhập 6 số OTP"
                          value={otpCode}
                          maxLength={6}
                          onChange={(e) => {
                            setOtpCode(e.target.value.replace(/\D/g, ""));
                            if (formError) setFormError(null);
                          }}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            padding: "10px 12px",
                            borderRadius: 8,
                            border: "1px solid #93c5fd",
                            fontSize: 16,
                            fontWeight: 700,
                            letterSpacing: "0.2em",
                            textAlign: "center",
                            background: "#ffffff",
                            boxSizing: "border-box",
                          }}
                        />

                        <button
                          type="button"
                          onClick={handleRequestOtp}
                          disabled={otpCooldown > 0 || otpLoading}
                          style={{
                            flexShrink: 0,
                            background: otpCooldown > 0 ? "#e2e8f0" : "#2563eb",
                            color: otpCooldown > 0 ? "#64748b" : "#ffffff",
                            border: "none",
                            padding: "8px 12px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: otpCooldown > 0 || otpLoading ? "not-allowed" : "pointer",
                            whiteSpace: "nowrap",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 4,
                            minWidth: 80,
                          }}
                          title="Gửi lại mã OTP"
                        >
                          {otpLoading ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              <span>Đang gửi...</span>
                            </>
                          ) : otpCooldown > 0 ? (
                            <>
                              <Clock size={12} />
                              <span>{otpCooldown}s</span>
                            </>
                          ) : (
                            "Gửi lại mã"
                          )}
                        </button>
                      </div>

                      {otpMessage && (
                        <p style={{ margin: "6px 0 0", fontSize: 11, color: "#16a34a" }}>{otpMessage}</p>
                      )}

                      {/* Tùy chọn đổi kênh gửi OTP nếu có cả Zalo và Email */}
                      {contract?.customer?.email && (
                        <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px dashed #bfdbfe", fontSize: 11, color: "#475569", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span>Chưa nhận được mã?</span>
                          <button
                            type="button"
                            onClick={async () => {
                              const nextChannel = otpChannel === "zalo" ? "email" : "zalo";
                              setOtpChannel(nextChannel);
                              setOtpCooldown(0);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#2563eb",
                              fontWeight: 600,
                              cursor: "pointer",
                              padding: 0,
                              textDecoration: "underline",
                            }}
                          >
                            {otpChannel === "zalo" ? "Đổi sang nhận qua Email" : "Đổi sang nhận qua Zalo"}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Hiển thị lỗi form trực tiếp */}
                    {formError && (
                      <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", color: "#b91c1c", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <AlertCircle size={15} style={{ flexShrink: 0 }} />
                        <span>{formError}</span>
                      </div>
                    )}

                    {/* Cam kết pháp lý bắt buộc (Terms & Conditions Consent) */}
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
                          setConsentLegal(e.target.checked);
                          if (e.target.checked && formError?.includes("điều khoản")) {
                            setFormError(null);
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
                        Tôi xác nhận đã đọc, hiểu rõ và đồng ý toàn bộ điều khoản Hợp đồng dịch vụ cấp nước và các quy định pháp luật về giao kết hợp đồng điện tử.
                      </span>
                    </label>

                    {/* Hàng nút: Quay lại + Hoàn tất ký */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setB2cStep(1);
                          setFormError(null);
                        }}
                        disabled={signing}
                        style={{
                          flex: 1,
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          color: "#475569",
                          padding: "12px",
                          borderRadius: 10,
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: signing ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 5,
                        }}
                      >
                        <ArrowLeft size={15} />
                        <span>Quay lại</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSignIndividual(false)}
                        disabled={signing}
                        style={{
                          flex: 2,
                          background: signing ? "#94a3b8" : "#16a34a",
                          color: "#ffffff",
                          border: "none",
                          padding: "12px",
                          borderRadius: 10,
                          fontWeight: 700,
                          fontSize: 14,
                          cursor: signing ? "not-allowed" : "pointer",
                          boxShadow: "0 4px 10px rgba(22,163,74,0.25)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        {signing ? (
                          <>
                            <RefreshCw size={17} className="animate-spin" />
                            <span>Đang lưu & hoàn tất ký...</span>
                          </>
                        ) : (
                          <>
                            <FileSignature size={18} />
                            <span>Hoàn Tất Ký Hợp Đồng</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // ==================== KHÁCH HÀNG DOANH NGHIỆP B2B ====================
                <ContractB2bSignPanel
                  variant="sidebar"
                  contract={contract}
                  isDev={isDev}
                  signing={signing}
                  isConnectingUsb={isConnectingUsb}
                  consentLegal={consentLegal}
                  onConsentLegalChange={setConsentLegal}
                  formError={formError}
                  onClearFormError={() => setFormError(null)}
                  b2bOtpCode={b2bOtpCode}
                  onB2bOtpCodeChange={(val) => {
                    setB2bOtpCode(val);
                    if (b2bOtpError) setB2bOtpError(null);
                  }}
                  b2bOtpVerified={b2bOtpVerified}
                  b2bOtpVerifiedAt={b2bOtpVerifiedAt}
                  b2bOtpSending={b2bOtpSending}
                  b2bOtpVerifying={b2bOtpVerifying}
                  b2bOtpCooldown={b2bOtpCooldown}
                  b2bOtpMessage={b2bOtpMessage}
                  b2bOtpError={b2bOtpError}
                  onSendB2bOtp={handleSendB2bOtp}
                  onVerifyB2bOtp={handleVerifyB2bOtp}
                  b2bTaxCode={b2bTaxCode}
                  onTaxCodeChange={setB2bTaxCode}
                  selectedCaProvider={selectedCaProvider}
                  onCaProviderChange={setSelectedCaProvider}
                  caProviders={CA_PROVIDERS}
                  b2bCompanyName={b2bCompanyName}
                  b2bCertSerial={b2bCertSerial}
                  b2bCertIssuer={b2bCertIssuer}
                  b2bCertValidRange={b2bCertValidRange}
                  b2bCertIsExpired={b2bCertIsExpired}
                  b2bCertBase64={b2bCertBase64}
                  usbStatus={usbStatus}
                  usbStatusType={usbStatusType}
                  b2bSignMethod={b2bSignMethod}
                  b2bSignatureBase64={b2bSignatureBase64}
                  onSignatureBase64Change={setB2bSignatureBase64}
                  onConnectUsbToken={() => {
                    void handleConnectUsbToken();
                  }}
                  onSignBusiness={() => {
                    void handleSignBusiness();
                  }}
                  onFillDevMock={handleFillDevMock}
                  onDevMockSignB2b={(auto) => {
                    void handleDevMockSignB2b(auto);
                  }}
                />
              )}
            </div>
          )}

          {/* CARD LỊCH SỬ GIAO KẾT (TIMELINE AUDIT TRAIL) */}
          <div
            id="contract-audit-timeline-section"
            className={mobileTab === "sign" ? "hide-on-tablet-down" : ""}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <ContractAuditTimeline
              logs={auditLogs}
              onOpenDetailModal={() => setIsHistoryModalOpen(true)}
            />
          </div>
        </aside>
      </div>

      {/* 4. MOBILE FLOATING ACTION BAR (STICKY DƯỚI ĐÁY KHI XEM PDF) */}
      {mobileTab === "pdf" && (
        <div className="contract-floating-bar">
          {!signedSuccess ? (
            <button
              type="button"
              onClick={scrollToSigning}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                color: "#ffffff",
                padding: "13px 20px",
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
              }}
            >
              <FileSignature size={18} />
              <span>✍️ Ký Hợp Đồng Ngay</span>
            </button>
          ) : (
            <div style={{ display: "flex", width: "100%", gap: 8 }}>
              {displayPdfUrl && (
                <a
                  href={displayPdfUrl}
                  download={`HopDong_${contract?.contractNumber}.pdf`}
                  style={{
                    flex: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    background: isStatusCompleted(contract?.status) ? "#16a34a" : "#0284c7",
                    color: "#ffffff",
                    padding: "12px 16px",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: "none",
                    boxShadow: isStatusCompleted(contract?.status) ? "0 3px 10px rgba(22, 163, 74, 0.25)" : "0 3px 10px rgba(2, 132, 199, 0.25)",
                  }}
                >
                  <Download size={16} />
                  <span>{isStatusCompleted(contract?.status) ? "Tải Bản Đã Ký" : "Tải Bản Ký Tạm"}</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setMobileTab("history")}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  background: "#f1f5f9",
                  color: "#334155",
                  padding: "12px 14px",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 600,
                  border: "1px solid #cbd5e1",
                  cursor: "pointer",
                }}
              >
                <Clock size={15} color="#2563eb" />
                <span>Lịch Sử</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. MODAL KÝ SỐ / MOBILE BOTTOM SHEET MODAL */}
      {isSignModalOpen && (
        <div
          className="contract-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSignModalOpen(false);
          }}
        >
          <div className="contract-modal-sheet">
            {/* Pull handle indicator cho mobile */}
            <div className="sheet-pull-handle" />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, borderBottom: "1px solid #f1f5f9", paddingBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ padding: 6, background: "#eff6ff", borderRadius: 8, color: "#2563eb" }}>
                  <FileSignature size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    Ký Xác Nhận Hợp Đồng
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                    Số HĐ: {contract?.contractNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSignModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", color: "#b91c1c", fontSize: 12, marginBottom: 14 }}>
                {error}
              </div>
            )}

            {/* Dev Sandbox inside Modal */}
            {isDev && (
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px dashed #f59e0b",
                  borderRadius: 10,
                  padding: "10px 12px",
                  marginBottom: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#b45309" }}>
                    <Sparkles size={13} />
                    GIẢ LẬP KÝ SỐ DEV
                  </div>
                  <span style={{ fontSize: 9, background: "#fef3c7", color: "#92400e", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>
                    DEV SANDBOX
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => (isB2B ? handleDevMockSignB2b(true) : handleDevMockSignB2c(true))}
                    disabled={signing}
                    style={{
                      flex: 1,
                      background: signing ? "#94a3b8" : "#d97706",
                      color: "#ffffff",
                      border: "none",
                      padding: "7px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: signing ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                    }}
                  >
                    <Sparkles size={12} />
                    {signing ? "Đang ký..." : "⚡ Ký Giả Lập Ngay"}
                  </button>
                  <button
                    type="button"
                    onClick={() => (isB2B ? handleDevMockSignB2b(false) : handleDevMockSignB2c(false))}
                    style={{
                      background: "#ffffff",
                      color: "#b45309",
                      border: "1px solid #fcd34d",
                      padding: "7px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Điền mẫu
                  </button>
                </div>
              </div>
            )}

            {!isB2B ? (
              // ==================== KHÁCH HÀNG CÁ NHÂN (MODAL 2 BƯỚC TUẦN TỰ) ====================
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Stepper chỉ báo tiến trình */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0 4px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: b2cStep === 2 ? "pointer" : "default",
                    }}
                    onClick={() => {
                      if (b2cStep === 2) {
                        setB2cStep(1);
                        setFormError(null);
                      }
                    }}
                    title={b2cStep === 2 ? "Bấm để quay lại Bước 1 (Vẽ lại chữ ký)" : undefined}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: b2cStep === 1 ? "#2563eb" : "#16a34a",
                        color: "#ffffff",
                        fontSize: 11,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {b2cStep > 1 ? <Check size={13} /> : "1"}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: b2cStep === 1 ? "#1e293b" : "#16a34a",
                      }}
                    >
                      1. Vẽ chữ ký
                    </span>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      background: b2cStep === 2 ? "#16a34a" : "#e2e8f0",
                      transition: "background 0.3s ease",
                    }}
                  />

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: b2cStep === 2 ? "#2563eb" : "#94a3b8",
                        color: "#ffffff",
                        fontSize: 11,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      2
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: b2cStep === 2 ? "#1e293b" : "#94a3b8",
                      }}
                    >
                      2. Nhập OTP
                    </span>
                  </div>
                </div>

                {/* BƯỚC 1: VẼ CHỮ KÝ TAY TRÊN MODAL */}
                <div style={{ display: b2cStep === 1 ? "flex" : "none", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                      Vẽ chữ ký tay của Quý khách: <span style={{ color: "#dc2626", fontWeight: 700 }}>(Bắt buộc)</span>
                    </label>
                    <SignaturePad ref={modalSigPadRef} />
                  </div>

                  {/* Kênh nhận mã OTP */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "flex", alignItems: "center", gap: 5 }}>
                        <KeyRound size={14} color="#2563eb" />
                        Nhận mã OTP qua:
                      </span>
                      <div style={{ display: "flex", gap: 10, fontSize: 12 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", color: "#334155", fontWeight: otpChannel === "zalo" ? 600 : 400 }}>
                          <input
                            type="radio"
                            name="modal_channel"
                            value="zalo"
                            checked={otpChannel === "zalo"}
                            onChange={() => setOtpChannel("zalo")}
                          />
                          Zalo {contract?.customer?.phone ? `(${contract.customer.phone})` : ""}
                        </label>
                        {contract?.customer?.email && (
                          <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", color: "#334155", fontWeight: otpChannel === "email" ? 600 : 400 }}>
                            <input
                              type="radio"
                              name="modal_channel"
                              value="email"
                              checked={otpChannel === "email"}
                              onChange={() => setOtpChannel("email")}
                            />
                            Email
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hiển thị lỗi form trực tiếp */}
                  {formError && (
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", color: "#b91c1c", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <AlertCircle size={15} style={{ flexShrink: 0 }} />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Hàng nút: Đóng modal + Tiếp tục */}
                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => setIsSignModalOpen(false)}
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
                    <button
                      type="button"
                      onClick={() => handleProceedToOtp(true)}
                      disabled={otpLoading}
                      style={{
                        flex: 2,
                        background: "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        padding: "11px",
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: 13.5,
                        cursor: "pointer",
                        boxShadow: "0 4px 10px rgba(37,99,235,0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      {otpLoading ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>Đang gửi mã OTP...</span>
                        </>
                      ) : (
                        <>
                          <span>Tiếp tục & Nhận OTP</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* BƯỚC 2: XÁC THỰC OTP TRÊN MODAL */}
                <div style={{ display: b2cStep === 2 ? "flex" : "none", flexDirection: "column", gap: 14 }}>
                  {/* Xem lại ảnh chữ ký đã vẽ */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.03em", display: "flex", alignItems: "center", gap: 4 }}>
                        <CheckCircle2 size={13} color="#16a34a" /> Chữ ký tay đã ghi nhận
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setB2cStep(1);
                          setFormError(null);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#2563eb",
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          padding: 0,
                        }}
                        title="Quay lại vẽ lại chữ ký"
                      >
                        <RotateCcw size={12} />
                        <span>Vẽ lại chữ ký</span>
                      </button>
                    </div>
                    {savedSignatureBase64 && (
                      <div style={{ background: "#ffffff", border: "1px dashed #cbd5e1", borderRadius: 8, padding: 6, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 60 }}>
                        <img
                          src={savedSignatureBase64}
                          alt="Chữ ký đã vẽ"
                          style={{ maxHeight: 56, maxWidth: "100%", objectFit: "contain" }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Nhập mã OTP */}
                  <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <KeyRound size={15} color="#2563eb" />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "#1e40af" }}>
                        Nhập mã xác thực OTP 6 số
                      </span>
                    </div>

                    <p style={{ margin: "0 0 10px", fontSize: 12, color: "#334155", lineHeight: 1.4 }}>
                      {otpChannel === "zalo"
                        ? `Mã OTP đã gửi đến Zalo số ${contract?.customer?.phone || ""}.`
                        : `Mã OTP đã gửi đến email ${contract?.customer?.email || ""}.`}
                    </p>

                    <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                      <input
                        ref={modalOtpInputRef}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="Nhập 6 số OTP"
                        value={otpCode}
                        maxLength={6}
                        onChange={(e) => {
                          setOtpCode(e.target.value.replace(/\D/g, ""));
                          if (formError) setFormError(null);
                        }}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          padding: "10px 10px",
                          borderRadius: 8,
                          border: "1px solid #93c5fd",
                          fontSize: 16,
                          fontWeight: 700,
                          letterSpacing: "0.2em",
                          textAlign: "center",
                          background: "#ffffff",
                          boxSizing: "border-box",
                        }}
                      />

                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={otpCooldown > 0 || otpLoading}
                        style={{
                          flexShrink: 0,
                          background: otpCooldown > 0 ? "#e2e8f0" : "#2563eb",
                          color: otpCooldown > 0 ? "#64748b" : "#ffffff",
                          border: "none",
                          padding: "8px 12px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: otpCooldown > 0 || otpLoading ? "not-allowed" : "pointer",
                          whiteSpace: "nowrap",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          minWidth: 80,
                        }}
                      >
                        {otpLoading ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>Đang gửi...</span>
                          </>
                        ) : otpCooldown > 0 ? (
                          <>
                            <Clock size={12} />
                            <span>{otpCooldown}s</span>
                          </>
                        ) : (
                          "Gửi lại"
                        )}
                      </button>
                    </div>

                    {otpMessage && (
                      <p style={{ margin: "6px 0 0", fontSize: 11, color: "#16a34a" }}>{otpMessage}</p>
                    )}

                    {contract?.customer?.email && (
                      <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px dashed #bfdbfe", fontSize: 11, color: "#475569", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span>Chưa nhận được mã?</span>
                        <button
                          type="button"
                          onClick={() => {
                            const nextChannel = otpChannel === "zalo" ? "email" : "zalo";
                            setOtpChannel(nextChannel);
                            setOtpCooldown(0);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#2563eb",
                            fontWeight: 600,
                            cursor: "pointer",
                            padding: 0,
                            textDecoration: "underline",
                          }}
                        >
                          {otpChannel === "zalo" ? "Đổi sang nhận qua Email" : "Đổi sang nhận qua Zalo"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Hiển thị lỗi form trực tiếp */}
                  {formError && (
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", color: "#b91c1c", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <AlertCircle size={15} style={{ flexShrink: 0 }} />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Cam kết pháp lý bắt buộc (Terms & Conditions Consent) */}
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
                        setConsentLegal(e.target.checked);
                        if (e.target.checked && formError?.includes("điều khoản")) {
                          setFormError(null);
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
                      Tôi xác nhận đã đọc, hiểu rõ và đồng ý toàn bộ điều khoản Hợp đồng dịch vụ cấp nước và các quy định pháp luật về giao kết hợp đồng điện tử.
                    </span>
                  </label>

                  {/* Hàng nút: Quay lại + Hoàn tất ký */}
                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setB2cStep(1);
                        setFormError(null);
                      }}
                      disabled={signing}
                      style={{
                        flex: 1,
                        background: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        color: "#475569",
                        padding: "11px",
                        borderRadius: 10,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: signing ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 5,
                      }}
                    >
                      <ArrowLeft size={15} />
                      <span>Quay lại</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSignIndividual(true)}
                      disabled={signing}
                      style={{
                        flex: 2,
                        background: signing ? "#94a3b8" : "#16a34a",
                        color: "#ffffff",
                        border: "none",
                        padding: "11px",
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: 13.5,
                        cursor: signing ? "not-allowed" : "pointer",
                        boxShadow: "0 4px 10px rgba(22,163,74,0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      {signing ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" />
                          <span>Đang hoàn tất...</span>
                        </>
                      ) : (
                        <>
                          <FileSignature size={16} />
                          <span>Hoàn Tất Ký</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <ContractB2bSignPanel
                variant="modal"
                contract={contract}
                isDev={isDev}
                signing={signing}
                isConnectingUsb={isConnectingUsb}
                consentLegal={consentLegal}
                onConsentLegalChange={setConsentLegal}
                formError={formError}
                onClearFormError={() => setFormError(null)}
                b2bOtpCode={b2bOtpCode}
                onB2bOtpCodeChange={(val) => {
                  setB2bOtpCode(val);
                  if (b2bOtpError) setB2bOtpError(null);
                }}
                b2bOtpVerified={b2bOtpVerified}
                b2bOtpVerifiedAt={b2bOtpVerifiedAt}
                b2bOtpSending={b2bOtpSending}
                b2bOtpVerifying={b2bOtpVerifying}
                b2bOtpCooldown={b2bOtpCooldown}
                b2bOtpMessage={b2bOtpMessage}
                b2bOtpError={b2bOtpError}
                onSendB2bOtp={handleSendB2bOtp}
                onVerifyB2bOtp={handleVerifyB2bOtp}
                b2bTaxCode={b2bTaxCode}
                onTaxCodeChange={setB2bTaxCode}
                selectedCaProvider={selectedCaProvider}
                onCaProviderChange={setSelectedCaProvider}
                caProviders={CA_PROVIDERS}
                b2bCompanyName={b2bCompanyName}
                b2bCertSerial={b2bCertSerial}
                b2bCertIssuer={b2bCertIssuer}
                b2bCertValidRange={b2bCertValidRange}
                b2bCertIsExpired={b2bCertIsExpired}
                b2bCertBase64={b2bCertBase64}
                usbStatus={usbStatus}
                usbStatusType={usbStatusType}
                b2bSignMethod={b2bSignMethod}
                b2bSignatureBase64={b2bSignatureBase64}
                onSignatureBase64Change={setB2bSignatureBase64}
                onConnectUsbToken={() => {
                  void handleConnectUsbToken();
                }}
                onSignBusiness={() => {
                  void handleSignBusiness();
                }}
                onFillDevMock={handleFillDevMock}
                onDevMockSignB2b={(auto) => {
                  void handleDevMockSignB2b(auto);
                }}
                onCloseModal={() => setIsSignModalOpen(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* 6. MODAL XEM LỊCH SỬ GIAO KẾT (AUDIT TRAIL MODAL) */}
      <ContractAuditModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        contract={contract}
        logs={auditLogs}
        onOpenCertModal={() => setIsCertModalOpen(true)}
      />

      {/* 7. MODAL XEM CHI TIẾT CHỨNG THƯ SỐ PAdES */}
      <CertificateDetailModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        contract={contract}
      />

      {/* 8. MODAL CẤU HÌNH MÔI TRƯỜNG KIỂM THỬ (SECRET TESTER SWITCHER) */}
      <EnvironmentSwitcherModal
        isOpen={isEnvModalOpen}
        onClose={() => setIsEnvModalOpen(false)}
        currentEnv={currentEnv}
        onSelectEnv={handleChangeEnv}
      />
    </div>
  );
}
