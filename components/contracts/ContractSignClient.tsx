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
} from "lucide-react";
import { SignaturePad, SignaturePadRef } from "./SignaturePad";
import { ContractPdfViewer } from "./ContractPdfViewer";
import { ContractAuditTimeline } from "./ContractAuditTimeline";
import { ContractAuditModal } from "./ContractAuditModal";
import { CertificateDetailModal } from "./CertificateDetailModal";
import type { ContractDetails, ContractAuditLogItem } from "@/lib/erp-api";

interface ContractSignClientProps {
  initialToken: string;
  initialContract?: ContractDetails | null;
  initialError?: string | null;
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

export function ContractSignClient({
  initialToken,
  initialContract,
  initialError,
}: ContractSignClientProps) {
  const [contract, setContract] = useState<ContractDetails | null>(initialContract || null);
  const [auditLogs, setAuditLogs] = useState<ContractAuditLogItem[]>(initialContract?.auditLogs || []);
  const [loading, setLoading] = useState(!initialContract && !initialError);
  const [error, setError] = useState<string | null>(initialError || null);

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

  // Signing state
  const isStatusCompleted = (s?: string | null) => s === "completed" || s === "signed";
  const [signing, setSigning] = useState(false);
  const [signedSuccess, setSignedSuccess] = useState(
    isStatusCompleted(initialContract?.status)
  );
  const [pdfVersion, setPdfVersion] = useState<number>(0);

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
  const [b2bPkcs7, setB2bPkcs7] = useState("");
  const [b2bSignMethod, setB2bSignMethod] = useState<"usb" | "manual">("usb");
  const [selectedCaProvider, setSelectedCaProvider] = useState<string>("auto");
  const [usbStatus, setUsbStatus] = useState<string | null>(null);
  const [isConnectingUsb, setIsConnectingUsb] = useState(false);
  const [usbStatusType, setUsbStatusType] = useState<"idle" | "connecting" | "success" | "error">("idle");
  const [formError, setFormError] = useState<string | null>(null);

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
      const res = await fetch(`/api/portal/contracts/${initialToken}?_t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setContract(data.data);
        if (data.data.auditLogs) {
          setAuditLogs(data.data.auditLogs);
        }
        if (isStatusCompleted(data.data.status)) {
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
      if (isStatusCompleted(initialContract.status)) {
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

  // Request OTP
  const handleRequestOtp = async () => {
    if (otpCooldown > 0 || otpLoading) return;
    setOtpLoading(true);
    setOtpMessage(null);
    setError(null);

    try {
      const res = await fetch(`/api/portal/contracts/${initialToken}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: otpChannel }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setOtpCooldown(60);
        setOtpMessage(
          otpChannel === "zalo"
            ? `Mã OTP đã được gửi đến Zalo số ${contract?.customer?.phone}. Vui lòng kiểm tra tin nhắn.`
            : `Mã OTP đã được gửi đến email ${contract?.customer?.email}. Vui lòng kiểm tra hộp thư.`
        );
      } else {
        if (data.remainingSeconds) {
          setOtpCooldown(data.remainingSeconds);
        }
        setError(data.error || "Không thể gửi mã OTP");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Lỗi gửi yêu cầu OTP: ${message}`);
    } finally {
      setOtpLoading(false);
    }
  };

  // Submit Individual Signature
  const handleSignIndividual = async (fromModal = false) => {
    setError(null);
    setFormError(null);
    const activeRef = fromModal ? modalSigPadRef.current : sigPadRef.current;
    const canvasEmpty = activeRef ? activeRef.isEmpty() : true;
    const signatureBase64 = activeRef ? activeRef.toDataURL() : "";

    if (canvasEmpty && !otpCode.trim()) {
      const msg = "Vui lòng vẽ chữ ký tay trên khung vẽ HOẶC nhập mã xác thực OTP";
      setFormError(msg);
      setError(msg);
      return;
    }

    setSigning(true);

    try {
      const res = await fetch(`/api/portal/contracts/${initialToken}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature_image_base64: canvasEmpty ? undefined : signatureBase64,
          otp_code: otpCode.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSignedSuccess(true);
        setContract((prev) => (prev ? { ...prev, status: "completed" } : prev));
        setIsSignModalOpen(false);
        await refreshContractData();
      } else {
        const msg = data.error || "Ký hợp đồng không thành công. Vui lòng thử lại.";
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

  // B2B Bước 1: Kết nối USB Token & Đọc thông tin Chứng thư số (Đa nhà mạng CA)
  const handleConnectUsbToken = async () => {
    if (selectedCaProvider === "other") {
      setB2bSignMethod("manual");
      setUsbStatus("Đã chuyển sang chế độ dán chuỗi chữ ký PKCS#7 Base64 thủ công.");
      setUsbStatusType("idle");
      return;
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
            return;
          }

          setUsbStatus(
            "Đã kết nối SignPlugin. Vui lòng chọn chứng thư số của doanh nghiệp trên cửa sổ 'Select Certificate' và nhấn OK..."
          );
          const certBase64 = await postSignPlugin(
            baseUrl,
            "/getCertificate",
            { sessionID: sessionId },
            60000
          );

          if (!certBase64) {
            const lastErr = await postSignPlugin(baseUrl, "/getLastErr", {}, 5000);
            setIsConnectingUsb(false);
            setUsbStatusType("error");
            setUsbStatus(
              lastErr === "100102"
                ? "Không tìm thấy thiết bị USB Token chứa chứng thư số đã chọn. Vui lòng cắm đúng USB Token vào máy tính."
                : "Chưa chọn chứng thư số hoặc người dùng đã đóng cửa sổ chọn chứng thư (Mã: " + (lastErr || "N/A") + ")."
            );
            return;
          }

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
          if (mstMatch && mstMatch[1]) {
            setB2bTaxCode(mstMatch[1]);
          }
          if (cn) {
            setB2bCompanyName(cn);
          }
          setB2bCertSerial(snb || "");
          setB2bCertIssuer(issuer || (selectedCaProvider !== "auto" ? selectedCaProvider : "Viettel-CA"));
          setB2bCertValidTo(expireDate || "");
          if (validDate || expireDate) {
            setB2bCertValidRange(`${validDate || ""} - ${expireDate || ""}`);
          }

          if (isExpired || isNotYetValid) {
            setB2bCertIsExpired(true);
            setUsbActiveUrl("");
            setUsbSessionId("");
            setB2bPkcs7("");
            setUsbStatusType("error");
            const errDetail = isExpired
              ? `Chứng thư số đã chọn đã HẾT HẠN vào ngày ${expireDate}`
              : `Chứng thư số chưa đến ngày có hiệu lực (${validDate})`;
            const errMsg = `⚠️ ${errDetail}. Vui lòng cắm đúng USB Token còn hạn và chọn chứng thư số mới trong cửa sổ Select Certificate.`;
            setUsbStatus(errMsg);
            setFormError(errMsg);
            setIsConnectingUsb(false);
            return;
          }

          setB2bCertIsExpired(false);
          // Lưu phiên SignPlugin để khi bấm "Ký Số Doanh Nghiệp (B2B)" ở Bước 2 sẽ gọi /signHash bật cửa sổ nhập PIN
          setUsbActiveUrl(baseUrl);
          setUsbSessionId(sessionId);
          setB2bPkcs7(certBase64);
          setB2bSignMethod("usb");
          setUsbStatusType("success");
          setUsbStatus(
            `Đã đọc chứng thư số: ${cn || dn} | Serial: ${snb || "N/A"} | Nhà cung cấp: ${issuer || "CA"}${
              validDate && expireDate ? ` (${validDate} → ${expireDate})` : ""
            }. Hãy nhấn 'Ký Số Doanh Nghiệp (B2B)' bên dưới và nhập mã PIN để hoàn tất ký.`
          );
          setIsConnectingUsb(false);
          return;
        }
      } catch {
        // Thử URL tiếp theo
      }
    }

    // 2. Fallback dò cổng WebSocket (BKAV-CA / VNPT-CA / Viettel-CA vSigner: 15208, 11284)
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
              const expDateStr = c.validTo || c.expireDate || '';
              const exp = parseCertDate(expDateStr);
              const isExp = exp ? exp.getTime() < now : false;
              return { ...c, expDateStr, parsedExp: exp, isExpired: isExp };
            });

            // Ưu tiên chứng thư còn hiệu lực và thời hạn dài nhất
            const validCerts = analyzedCerts
              .filter((c) => !c.isExpired)
              .sort((a, b) => (b.parsedExp?.getTime() || 0) - (a.parsedExp?.getTime() || 0));

            if (validCerts.length === 0) {
              const latestExpired = analyzedCerts.sort(
                (a, b) => (b.parsedExp?.getTime() || 0) - (a.parsedExp?.getTime() || 0)
              )[0];
              setB2bCertIsExpired(true);
              setUsbStatusType("error");
              const msg = `⚠️ Tất cả chứng thư số trong USB Token đều đã hết hạn (chứng thư gần nhất hết hạn ngày ${latestExpired.expDateStr || 'N/A'}). Vui lòng liên hệ nhà cung cấp chữ ký số để gia hạn.`;
              setUsbStatus(msg);
              setFormError(msg);
              return;
            }

            const activeCert = validCerts[0];
            setB2bCertIsExpired(false);
            setB2bCompanyName(activeCert.subject || "");
            setB2bCertSerial(activeCert.serialNumber || activeCert.serial || "");
            setB2bCertIssuer(activeCert.issuer || selectedCaProvider);
            setB2bCertValidTo(activeCert.expDateStr || "");
            if (activeCert.validFrom || activeCert.expDateStr) {
              setB2bCertValidRange(`${activeCert.validFrom || ""} - ${activeCert.expDateStr || ""}`);
            }
            setB2bPkcs7(activeCert.signature || activeCert.certBase64 || "USB_TOKEN_CERT_READY");
            setUsbStatusType("success");
            setUsbStatus(`Đã nhận diện chứng thư còn hiệu lực: ${activeCert.subject} (Hạn: ${activeCert.expDateStr || 'N/A'})`);
          } else {
            setUsbStatusType("error");
            setUsbStatus("Đã kết nối nhưng chưa phát hiện thẻ USB Token được cắm vào máy tính.");
          }
        } catch {
          // ignore ws parse error
        } finally {
          setIsConnectingUsb(false);
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
      };
    } catch {
      setIsConnectingUsb(false);
      setUsbStatusType("error");
      setUsbStatus("Trình duyệt chặn kết nối nội bộ tới thiết bị USB Token.");
      setB2bSignMethod("manual");
    }
  };

  // B2B Bước 2: Ký số bằng USB Token (Nhập PIN qua /signHash) và gửi lên Server
  const handleSignBusiness = async () => {
    setError(null);
    setFormError(null);

    if (!b2bTaxCode.trim()) {
      const msg = "Vui lòng nhập Mã số thuế doanh nghiệp (*)";
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

    if (!b2bPkcs7.trim() && !usbSessionId) {
      // Trong môi trường Dev: tự động nạp chữ ký số giả lập và ký để không làm nghẽn kiểm thử
      if (isDev) {
        await handleDevMockSignB2b(true);
        return;
      }
      const msg = "Vui lòng nhấn 'Kết Nối USB Token Chữ Ký Số' trước khi ký";
      setFormError(msg);
      setError(msg);
      return;
    }

    setSigning(true);
    try {
      let finalSignatureBase64 = b2bPkcs7.trim();

      // Nếu đang có phiên kết nối SignPlugin thật (cổng 14007/14407), gọi /signHash để bật hộp thoại nhập mã PIN của USB Token
      if (usbActiveUrl && usbSessionId) {
        setUsbStatus("Vui lòng nhập Mã PIN của USB Token trên cửa sổ hiện lên để ký số hợp đồng...");
        const payloadText = `${contract?.contractNumber || initialToken}|${b2bTaxCode.trim()}|${Date.now()}`;
        const msgBuffer = new TextEncoder().encode(payloadText);
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
        const hashHex = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase();

        const sigFromToken = await postSignPlugin(
          usbActiveUrl,
          "/signHash",
          {
            sessionID: usbSessionId,
            HashVal: hashHex,
            HashOpt: "2", // 2 = SHA-256 theo đặc tả libmobileid.dll (Viettel/FPT/VNPT SignPlugin)
          },
          60000
        );

        if (!sigFromToken) {
          const lastErr = await postSignPlugin(usbActiveUrl, "/getLastErr", {}, 5000);
          const errMsg =
            lastErr === "100102"
              ? "Không tìm thấy thiết bị USB Token khi thực hiện ký. Vui lòng kiểm tra lại cổng cắm USB Token."
              : `Chưa hoàn tất nhập mã PIN USB Token hoặc bạn đã hủy thao tác ký (Mã lỗi: ${lastErr || "N/A"}).`;
          setFormError(errMsg);
          setError(errMsg);
          setSigning(false);
          return;
        }

        finalSignatureBase64 = sigFromToken;
        setB2bPkcs7(sigFromToken);
      }

      const res = await fetch(`/api/portal/contracts/${initialToken}/sign-b2b`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature_base64: finalSignatureBase64,
          tax_code: b2bTaxCode.trim(),
          company_name: b2bCompanyName.trim() || undefined,
          cert_serial: b2bCertSerial.trim() || undefined,
          valid_to: b2bCertValidTo.trim() || undefined,
          issuer:
            b2bCertIssuer.trim() ||
            (selectedCaProvider !== "auto" && selectedCaProvider !== "other"
              ? selectedCaProvider
              : undefined),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSignedSuccess(true);
        setIsSignModalOpen(false);
        await refreshContractData();
      } else {
        const msg = data.error || "Ký số doanh nghiệp thất bại. Vui lòng kiểm tra lại Mã số thuế và Token.";
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

  // Nạp mẫu chữ ký test Profile
  const handleFillDevMock = () => {
    const mockTaxCode = b2bTaxCode.trim() || contract?.customer?.taxCode || contract?.customerCode || "";
    const mockCompany = b2bCompanyName.trim() || contract?.customer?.fullName || "Công ty TNHH MTV đầu tư Minh Phong";
    const providerName = selectedCaProvider !== "auto" && selectedCaProvider !== "other" ? selectedCaProvider : "Viettel-CA";
    const mockPkcs7 = `MOCK_PKCS7_${providerName.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
    setB2bTaxCode(mockTaxCode);
    setB2bCompanyName(mockCompany);
    setB2bCertSerial(`DEV-SERIAL-${Date.now().toString().slice(-6)}`);
    setB2bCertIssuer(`${providerName} (Dev Test)`);
    setUsbActiveUrl("");
    setUsbSessionId("");
    setB2bPkcs7(mockPkcs7);
    setB2bSignMethod("manual");
    setUsbStatus(`🟢 [Dev Sandbox] Đã nạp chữ ký số mẫu ${providerName} thành công. Bạn có thể nhấn 'Ký Số Doanh Nghiệp' ngay.`);
    setUsbStatusType("success");
    setFormError(null);
  };

  // Giả lập Ký số B2B (Doanh nghiệp USB Token)
  const handleDevMockSignB2b = async (autoSubmit = true) => {
    setError(null);
    const mockTaxCode = b2bTaxCode.trim() || contract?.customer?.taxCode || contract?.customerCode || "";
    const mockCompany = b2bCompanyName.trim() || contract?.customer?.fullName || "Công ty TNHH MTV đầu tư Minh Phong";
    const providerName = selectedCaProvider !== "auto" && selectedCaProvider !== "other" ? selectedCaProvider : "VNPT-CA / Viettel-CA";
    const mockPkcs7 = `MOCK_PKCS7_${providerName.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;

    setB2bTaxCode(mockTaxCode);
    setB2bCompanyName(mockCompany);
    setB2bPkcs7(mockPkcs7);
    setUsbStatus(`🟢 [Dev Sandbox] Đã nạp chứng thư số giả lập ${providerName} (Test Profile)`);
    setB2bSignMethod("manual");

    if (!autoSubmit) return;

    setSigning(true);
    try {
      const res = await fetch(`/api/portal/contracts/${initialToken}/sign-b2b`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature_base64: mockPkcs7,
          tax_code: mockTaxCode,
          company_name: mockCompany,
          cert_serial: `DEV-TOKEN-SERIAL-${Date.now().toString().slice(-6)}`,
          issuer: `${providerName} Test Profile (Dev)`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSignedSuccess(true);
        setContract((prev) => (prev ? { ...prev, status: "completed" } : prev));
        setIsSignModalOpen(false);
        await refreshContractData();
      } else {
        setError(data.error || "Giả lập ký số doanh nghiệp thất bại.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Lỗi giả lập ký số: ${message}`);
    } finally {
      setSigning(false);
    }
  };

  // Giả lập Ký số B2C (Cá nhân OTP & Chữ ký tay)
  const handleDevMockSignB2c = async (autoSubmit = true) => {
    setError(null);
    setOtpCode("123456");

    // Tự động vẽ nét chữ ký mẫu lên Canvas
    if (sigPadRef.current?.drawSample) {
      sigPadRef.current.drawSample();
    }
    if (modalSigPadRef.current?.drawSample) {
      modalSigPadRef.current.drawSample();
    }

    if (!autoSubmit) return;

    setSigning(true);
    try {
      const sampleSignature =
        sigPadRef.current?.toDataURL() || modalSigPadRef.current?.toDataURL() || "";

      const res = await fetch(`/api/portal/contracts/${initialToken}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature_image_base64: sampleSignature || undefined,
          otp_code: "123456",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSignedSuccess(true);
        setContract((prev) => (prev ? { ...prev, status: "completed" } : prev));
        setIsSignModalOpen(false);
        await refreshContractData();
      } else {
        setError(data.error || "Giả lập ký hợp đồng cá nhân thất bại.");
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
    try {
      const res = await fetch(`/api/portal/contracts/${initialToken}/reset-dev`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSignedSuccess(false);
        setContract((prev) => (prev ? { ...prev, status: "pending_customer" } : prev));
        await refreshContractData();
      } else {
        setError(data.error || "Không thể reset hợp đồng");
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
        <AlertCircle size={48} color="#ef4444" style={{ margin: "0 auto 16px" }} />
        <h2 style={{ fontSize: 20, color: "#991b1b", marginBottom: 8 }}>Không thể truy cập hợp đồng</h2>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>{error}</p>
        <div style={{ padding: 16, background: "#f8fafc", borderRadius: 12, fontSize: 13, color: "#475569" }}>
          Nếu liên kết đã hết hạn hoặc có sai sót, Quý khách vui lòng liên hệ Tổng đài CSKH: <strong style={{ color: "#2563eb" }}>0359 613 267</strong> để được cấp liên kết mới.
        </div>
      </div>
    );
  }

  const isB2B = contract?.customerSignerType === "business_token" || contract?.templateCode === "02/HĐ-CNDN";
  // Luôn dùng relative proxy URL để đảm bảo các máy trong mạng LAN hoặc remote client đều xem được PDF không phụ thuộc 127.0.0.1
  const displayPdfUrl = pdfVersion > 0
    ? `/api/portal/contracts/${initialToken}/pdf?v=${pdfVersion}`
    : `/api/portal/contracts/${initialToken}/pdf`;

  return (
    <div className="contract-root">
      {/* 1. TOP HEADER BAR (Chuẩn Chuyên Nghiệp Tương Tự ERP) */}
      <header className="contract-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          <div
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
            }}
          >
            <FileText size={17} />
            <span className="hide-on-mobile">Cổng Ký Số HĐĐT</span>
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap" }}>
              <h1 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={contract?.contractNumber || "Hợp Đồng"}>
                {contract?.contractNumber || "Hợp Đồng Cấp Nước"}
              </h1>

              {signedSuccess ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#dcfce7", color: "#15803d", padding: "2px 7px", borderRadius: 10, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                  <ShieldCheck size={12} /> <span className="hide-on-mobile">Đã Ký</span>
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
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#16a34a", fontWeight: 600 }}>
                <ShieldCheck size={16} />
                <span>Bên A (Minh Phong) đã ký số Viettel-CA</span>
              </div>
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
            <div className={mobileTab === "history" ? "hide-on-tablet-down" : ""} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 14, padding: "16px 14px", textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
                <CheckCircle2 size={24} color="#16a34a" />
                <h3 style={{ fontSize: 15, color: "#166534", fontWeight: 700, margin: 0 }}>
                  Hợp Đồng Đã Ký Thành Công!
                </h3>
              </div>
              <p style={{ color: "#475569", fontSize: 12, margin: "0 0 12px" }}>
                Số <strong>{contract?.contractNumber}</strong> đã hoàn tất giao kết với 2 mộc chữ ký số hợp pháp.
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
              {/* Phím tắt mở lịch sử và reset */}
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
                  <span>Xem Lịch Sử ({auditLogs.length})</span>
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
                // ==================== KHÁCH HÀNG CÁ NHÂN ====================
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Mục OTP */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "flex", alignItems: "center", gap: 4 }}>
                        <KeyRound size={14} color="#2563eb" /> Xác thực OTP
                      </span>

                      <div style={{ display: "flex", gap: 6, fontSize: 11 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer", color: "#475569" }}>
                          <input
                            type="radio"
                            name="channel_side"
                            value="zalo"
                            checked={otpChannel === "zalo"}
                            onChange={() => setOtpChannel("zalo")}
                          />
                          Zalo
                        </label>
                        {contract?.customer?.email && (
                          <label style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer", color: "#475569" }}>
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

                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="Mã OTP 6 số"
                        value={otpCode}
                        maxLength={6}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        style={{
                          flex: 1,
                          padding: "9px 12px",
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                          fontSize: 15,
                          fontWeight: 600,
                          letterSpacing: "0.15em",
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={otpCooldown > 0 || otpLoading}
                        style={{
                          background: otpCooldown > 0 ? "#e2e8f0" : "#2563eb",
                          color: otpCooldown > 0 ? "#64748b" : "#ffffff",
                          border: "none",
                          padding: "8px 12px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: otpCooldown > 0 ? "not-allowed" : "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {otpLoading ? "Đang gửi..." : otpCooldown > 0 ? `${otpCooldown}s` : "Gửi mã"}
                      </button>
                    </div>

                    {otpMessage && (
                      <p style={{ margin: "6px 0 0", fontSize: 11, color: "#16a34a" }}>{otpMessage}</p>
                    )}
                  </div>

                  {/* Khung vẽ chữ ký tay */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                      Chữ ký tay ngón tay / chuột:
                    </label>
                    <SignaturePad ref={sigPadRef} />
                  </div>

                  {/* Hiển thị lỗi form trực tiếp ngay trên nút ký cá nhân */}
                  {formError && (
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", color: "#b91c1c", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <AlertCircle size={15} style={{ flexShrink: 0 }} />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Nút bấm ký xác nhận */}
                  <button
                    type="button"
                    onClick={() => handleSignIndividual(false)}
                    disabled={signing}
                    style={{
                      background: signing ? "#94a3b8" : "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      padding: "12px",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: signing ? "not-allowed" : "pointer",
                      boxShadow: "0 4px 10px rgba(37,99,235,0.25)",
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
                        <span>Xác Nhận Ký Hợp Đồng</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                // ==================== KHÁCH HÀNG DOANH NGHIỆP B2B ====================
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                      Mã số thuế doanh nghiệp (*):
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: 2301081775"
                      value={b2bTaxCode}
                      onChange={(e) => {
                        setB2bTaxCode(e.target.value.trim());
                        if (formError) setFormError(null);
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
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                      Nhà cung cấp chữ ký số (CA):
                    </label>
                    <select
                      value={selectedCaProvider}
                      onChange={(e) => setSelectedCaProvider(e.target.value)}
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
                      {CA_PROVIDERS.map((ca) => (
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
                    onClick={handleConnectUsbToken}
                    disabled={isConnectingUsb || signing}
                    style={{
                      background: isConnectingUsb ? "#f1f5f9" : "#f8fafc",
                      border: "1px solid #cbd5e1",
                      padding: "10px 14px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      color: isConnectingUsb ? "#64748b" : "#1e293b",
                      cursor: isConnectingUsb ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isConnectingUsb ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" color="#2563eb" />
                        <span>Đang dò tìm thiết bị USB Token...</span>
                      </>
                    ) : (
                      <>
                        <Building2 size={16} color="#2563eb" />
                        <span>Kết Nối USB Token Chữ Ký Số</span>
                      </>
                    )}
                  </button>

                  {/* Phản hồi trạng thái kết nối USB Token */}
                  {usbStatusType === "error" ? (
                    <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 12px", fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: "#92400e", display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                        <AlertCircle size={15} />
                        Chưa kết nối được phần mềm ký số USB Token
                      </div>
                      <p style={{ margin: "0 0 6px", color: "#78350f", lineHeight: 1.4, fontSize: 11 }}>
                        {usbStatus || "Vui lòng cắm USB Token và bật phần mềm ký số (Viettel-CA SignPlugin, VNPT-CA, FPT-CA, BKAV, MISA...)."}
                      </p>
                      <div style={{ background: "#fef3c7", borderRadius: 6, padding: "6px 8px", marginBottom: 8, fontSize: 10.5, color: "#92400e", lineHeight: 1.4 }}>
                        <strong>💡 Nếu đã bật SignPlugin mà vẫn báo lỗi trên Chrome/Edge mới:</strong>
                        <div>1. Bấm biểu tượng <strong>Cài đặt (Tune/Ổ khóa)</strong> cạnh thanh địa chỉ URL → Bật <strong>&quot;Ứng dụng trên thiết bị&quot; (Local network)</strong> sang <strong>Cho phép</strong>.</div>
                        <div>2. Hoặc mở <code>chrome://flags/#local-network-access-check</code> → chọn <strong>Disabled</strong> → <strong>Relaunch</strong>.</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={handleFillDevMock}
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
                          onClick={() => handleDevMockSignB2b(true)}
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
                    </div>
                  ) : b2bCertIsExpired ? (
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", color: "#991b1b", fontSize: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, marginBottom: 4 }}>
                        <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
                        <span>Chứng thư số USB Token đã hết hạn!</span>
                      </div>
                      <div style={{ fontSize: 11, lineHeight: 1.5, color: "#b91c1c", paddingLeft: 21 }}>
                        <div><strong>Đơn vị:</strong> {b2bCompanyName}</div>
                        <div><strong>Serial:</strong> <code style={{ fontSize: 10.5 }}>{b2bCertSerial}</code></div>
                        <div><strong>Thời hạn:</strong> <span style={{ textDecoration: "line-through" }}>{b2bCertValidRange}</span> (ĐÃ HẾT HẠN)</div>
                        <div style={{ marginTop: 4, fontWeight: 600 }}>
                          ⚠️ Vui lòng cắm đúng USB Token còn hạn, nhấn &quot;Kết Nối USB Token&quot; và chọn chứng thư số mới.
                        </div>
                      </div>
                    </div>
                  ) : usbStatusType === "success" ? (
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 12px", color: "#166534", fontSize: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, marginBottom: 4 }}>
                        <CheckCircle2 size={15} color="#16a34a" style={{ flexShrink: 0 }} />
                        <span>Đã kết nối Chứng thư số USB Token</span>
                      </div>
                      {b2bCertSerial ? (
                        <div style={{ fontSize: 11, lineHeight: 1.5, color: "#15803d", paddingLeft: 21 }}>
                          <div><strong>Đơn vị:</strong> {b2bCompanyName}</div>
                          <div><strong>MST:</strong> {b2bTaxCode} | <strong>Serial:</strong> <code style={{ fontSize: 10.5 }}>{b2bCertSerial}</code></div>
                          <div><strong>Nhà cung cấp:</strong> {b2bCertIssuer || "CA"}{b2bCertValidRange ? ` (${b2bCertValidRange})` : ""}</div>
                          <div style={{ marginTop: 4, color: "#047857", fontWeight: 600 }}>
                            👉 Nhấn &quot;Ký Số Doanh Nghiệp (B2B)&quot; bên dưới để nhập mã PIN và hoàn tất ký.
                          </div>
                        </div>
                      ) : (
                        <div style={{ paddingLeft: 21, fontSize: 11 }}>{usbStatus}</div>
                      )}
                    </div>
                  ) : usbStatus && (
                    <p style={{ margin: 0, fontSize: 11, color: "#64748b", background: "#f1f5f9", padding: 8, borderRadius: 6 }}>
                      {usbStatus}
                    </p>
                  )}

                  {b2bSignMethod === "manual" && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "#334155" }}>
                          Chuỗi chữ ký PKCS#7 Base64:
                        </label>
                        {isDev && (
                          <button
                            type="button"
                            onClick={handleFillDevMock}
                            style={{ background: "transparent", border: "none", color: "#2563eb", fontSize: 11, fontWeight: 600, cursor: "pointer", textDecoration: "underline", padding: 0 }}
                          >
                            Nạp chuỗi test
                          </button>
                        )}
                      </div>
                      <textarea
                        rows={3}
                        placeholder="Dán chuỗi chữ ký PKCS#7 Base64 tại đây..."
                        value={b2bPkcs7}
                        onChange={(e) => {
                          setB2bPkcs7(e.target.value.trim());
                          if (formError) setFormError(null);
                        }}
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          borderRadius: 6,
                          border: !b2bPkcs7 && formError ? "1.5px solid #ef4444" : "1px solid #cbd5e1",
                          fontSize: 11,
                          fontFamily: "monospace",
                        }}
                      />
                    </div>
                  )}

                  {/* Hiển thị lỗi form trực tiếp ngay trên nút ký B2B */}
                  {formError && (
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", color: "#b91c1c", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <AlertCircle size={15} style={{ flexShrink: 0 }} />
                      <span>{formError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSignBusiness}
                    disabled={signing || isConnectingUsb}
                    style={{
                      background: signing ? "#94a3b8" : "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      padding: "12px",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: signing || isConnectingUsb ? "not-allowed" : "pointer",
                      boxShadow: "0 4px 10px rgba(37,99,235,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    {signing ? (
                      <>
                        <RefreshCw size={17} className="animate-spin" />
                        <span>Đang xử lý ký số...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={18} />
                        <span>Ký Số Doanh Nghiệp (B2B)</span>
                      </>
                    )}
                  </button>
                </div>
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
                    background: "#16a34a",
                    color: "#ffffff",
                    padding: "12px 16px",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: "none",
                    boxShadow: "0 3px 10px rgba(22, 163, 74, 0.25)",
                  }}
                >
                  <Download size={16} />
                  <span>Tải Bản Đã Ký</span>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* OTP Section */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>
                      Mã xác thực OTP:
                    </span>
                    <div style={{ display: "flex", gap: 6, fontSize: 11 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="modal_channel"
                          value="zalo"
                          checked={otpChannel === "zalo"}
                          onChange={() => setOtpChannel("zalo")}
                        />
                        Zalo
                      </label>
                      {contract?.customer?.email && (
                        <label style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
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

                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="Nhập OTP 6 số"
                      value={otpCode}
                      maxLength={6}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                        fontSize: 16,
                        fontWeight: 600,
                        letterSpacing: "0.15em",
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      disabled={otpCooldown > 0 || otpLoading}
                      style={{
                        background: otpCooldown > 0 ? "#e2e8f0" : "#2563eb",
                        color: otpCooldown > 0 ? "#64748b" : "#ffffff",
                        border: "none",
                        padding: "8px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: otpCooldown > 0 ? "not-allowed" : "pointer",
                      }}
                    >
                      {otpLoading ? "Đang gửi..." : otpCooldown > 0 ? `${otpCooldown}s` : "Gửi OTP"}
                    </button>
                  </div>
                  {otpMessage && (
                    <p style={{ margin: "6px 0 0", fontSize: 11, color: "#16a34a" }}>{otpMessage}</p>
                  )}
                </div>

                {/* Canvas Signature Pad */}
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                    Vẽ chữ ký ngón tay của Quý khách:
                  </label>
                  <SignaturePad ref={modalSigPadRef} />
                </div>

                {/* Hiển thị lỗi form trực tiếp ngay trên nút ký cá nhân trong modal */}
                {formError && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", color: "#b91c1c", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    <span>{formError}</span>
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => setIsSignModalOpen(false)}
                    style={{
                      flex: 1,
                      background: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      color: "#475569",
                      padding: "10px",
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
                    onClick={() => handleSignIndividual(true)}
                    disabled={signing}
                    style={{
                      flex: 2,
                      background: signing ? "#94a3b8" : "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      padding: "10px",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: signing ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    {signing ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      "Xác Nhận Ký"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                    Mã số thuế doanh nghiệp (*):
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 2301081775"
                    value={b2bTaxCode}
                    onChange={(e) => {
                      setB2bTaxCode(e.target.value.trim());
                      if (formError) setFormError(null);
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
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                    Nhà cung cấp chữ ký số (CA):
                  </label>
                  <select
                    value={selectedCaProvider}
                    onChange={(e) => setSelectedCaProvider(e.target.value)}
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
                    {CA_PROVIDERS.map((ca) => (
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
                  onClick={handleConnectUsbToken}
                  disabled={isConnectingUsb || signing}
                  style={{
                    background: isConnectingUsb ? "#f1f5f9" : "#f8fafc",
                    border: "1px solid #cbd5e1",
                    padding: "9px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    color: isConnectingUsb ? "#64748b" : "#1e293b",
                    cursor: isConnectingUsb ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  {isConnectingUsb ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" color="#2563eb" />
                      <span>Đang dò tìm thiết bị USB Token...</span>
                    </>
                  ) : (
                    <>
                      <Building2 size={15} color="#2563eb" />
                      <span>Kết Nối USB Token Chữ Ký Số</span>
                    </>
                  )}
                </button>

                {/* Phản hồi trạng thái USB Token trong Modal */}
                {usbStatusType === "error" ? (
                  <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 12px", fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: "#92400e", display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                      <AlertCircle size={15} />
                      Chưa kết nối được phần mềm ký số USB Token
                    </div>
                    <p style={{ margin: "0 0 6px", color: "#78350f", lineHeight: 1.4, fontSize: 11 }}>
                      {usbStatus || "Vui lòng cắm USB Token và bật phần mềm ký số (Viettel-CA SignPlugin, VNPT-CA, FPT-CA, BKAV, MISA...)."}
                    </p>
                    <div style={{ background: "#fef3c7", borderRadius: 6, padding: "6px 8px", marginBottom: 8, fontSize: 10.5, color: "#92400e", lineHeight: 1.4 }}>
                      <strong>💡 Nếu đã bật SignPlugin mà vẫn báo lỗi trên Chrome/Edge mới:</strong>
                      <div>1. Bấm biểu tượng <strong>Cài đặt (Tune/Ổ khóa)</strong> cạnh thanh địa chỉ URL → Bật <strong>&quot;Ứng dụng trên thiết bị&quot; (Local network)</strong> sang <strong>Cho phép</strong>.</div>
                      <div>2. Hoặc mở <code>chrome://flags/#local-network-access-check</code> → chọn <strong>Disabled</strong> → <strong>Relaunch</strong>.</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={handleFillDevMock}
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
                        ⚡ Nạp Chữ Ký Test
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDevMockSignB2b(true)}
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
                  </div>
                ) : b2bCertIsExpired ? (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", color: "#991b1b", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, marginBottom: 4 }}>
                      <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0 }} />
                      <span>Chứng thư số USB Token đã hết hạn!</span>
                    </div>
                    <div style={{ fontSize: 11, lineHeight: 1.5, color: "#b91c1c", paddingLeft: 21 }}>
                      <div><strong>Đơn vị:</strong> {b2bCompanyName}</div>
                      <div><strong>Serial:</strong> <code style={{ fontSize: 10.5 }}>{b2bCertSerial}</code></div>
                      <div><strong>Thời hạn:</strong> <span style={{ textDecoration: "line-through" }}>{b2bCertValidRange}</span> (ĐÃ HẾT HẠN)</div>
                      <div style={{ marginTop: 4, fontWeight: 600 }}>
                        ⚠️ Vui lòng cắm đúng USB Token còn hạn, nhấn &quot;Kết Nối USB Token&quot; và chọn chứng thư số mới.
                      </div>
                    </div>
                  </div>
                ) : usbStatusType === "success" ? (
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 12px", color: "#166534", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, marginBottom: 4 }}>
                      <CheckCircle2 size={15} color="#16a34a" style={{ flexShrink: 0 }} />
                      <span>Đã kết nối Chứng thư số USB Token</span>
                    </div>
                    {b2bCertSerial ? (
                      <div style={{ fontSize: 11, lineHeight: 1.5, color: "#15803d", paddingLeft: 21 }}>
                        <div><strong>Đơn vị:</strong> {b2bCompanyName}</div>
                        <div><strong>MST:</strong> {b2bTaxCode} | <strong>Serial:</strong> <code style={{ fontSize: 10.5 }}>{b2bCertSerial}</code></div>
                        <div><strong>Nhà cung cấp:</strong> {b2bCertIssuer || "CA"}{b2bCertValidRange ? ` (${b2bCertValidRange})` : ""}</div>
                        <div style={{ marginTop: 4, color: "#047857", fontWeight: 600 }}>
                          👉 Nhấn &quot;Ký Số Doanh Nghiệp&quot; bên dưới để nhập mã PIN và hoàn tất ký.
                        </div>
                      </div>
                    ) : (
                      <div style={{ paddingLeft: 21, fontSize: 11 }}>{usbStatus}</div>
                    )}
                  </div>
                ) : usbStatus && (
                  <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>{usbStatus}</p>
                )}

                {b2bSignMethod === "manual" && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "#334155" }}>
                        Chuỗi chữ ký PKCS#7 Base64:
                      </label>
                      {isDev && (
                        <button
                          type="button"
                          onClick={handleFillDevMock}
                          style={{ background: "transparent", border: "none", color: "#2563eb", fontSize: 11, fontWeight: 600, cursor: "pointer", textDecoration: "underline", padding: 0 }}
                        >
                          Nạp chuỗi test
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Dán chuỗi chữ ký PKCS#7 Base64 tại đây..."
                      value={b2bPkcs7}
                      onChange={(e) => {
                        setB2bPkcs7(e.target.value.trim());
                        if (formError) setFormError(null);
                      }}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: 6,
                        border: !b2bPkcs7 && formError ? "1.5px solid #ef4444" : "1px solid #cbd5e1",
                        fontSize: 11,
                        fontFamily: "monospace",
                      }}
                    />
                  </div>
                )}

                {/* Hiển thị lỗi form trực tiếp ngay trên nút ký B2B trong modal */}
                {formError && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", color: "#b91c1c", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    <span>{formError}</span>
                  </div>
                )}

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
                    onClick={handleSignBusiness}
                    disabled={signing || isConnectingUsb}
                    style={{
                      flex: 2,
                      background: signing ? "#94a3b8" : "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      padding: "11px",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: signing || isConnectingUsb ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    {signing ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        <span>Ký Số Doanh Nghiệp</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
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
    </div>
  );
}
