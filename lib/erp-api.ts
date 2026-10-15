/**
 * Client & Server service for communicating with Minh Phong ERP e-Contract REST APIs.
 */

export interface ContractAuditLogItem {
  id: string;
  action: string;
  action_label?: string;
  actor_type?: string;
  actor_name?: string;
  actor_identifier?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface ContractDetails {
  id: string;
  contractNumber: string;
  customerCode: string;
  status: string;
  templateCode: string;
  customerSignerType: "individual_draw" | "business_token";
  tokenExpiresAt: string;
  pdfUrl: string;
  customer: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    taxCode?: string;
  };
  meter: {
    meterSerial: string;
    initialReading: number;
  };
  route: {
    routeCode: string;
    routeName: string;
  };
  auditLogs?: ContractAuditLogItem[];
  createdAt?: string;
  companySignedAt?: string;
  companyCertSerial?: string;
  customerSignedAt?: string;
  customerCertSubject?: string;
  customerCertTaxCode?: string;
  customerCertSerial?: string;
  customerCertIssuer?: string;
  customerIpAddress?: string;
  pdfSha256?: string;
  signingChannel?: string;
}

export interface ContractApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  remainingSeconds?: number;
}

export function getErpBaseUrl(): string {
  const envUrl = process.env.ERP_API_BASE_URL || process.env.NEXT_PUBLIC_ERP_API_BASE_URL;
  if (envUrl) {
    return envUrl.trim().replace(/\/+$/, "");
  }
  // Default fallback for development
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }
  return "https://nuocsachdinhto.com";
}

async function safeParseJson<T>(res: Response, defaultError: string): Promise<ContractApiResponse<T>> {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch (parseErr) {
      console.error("[erp-api] Lỗi parse JSON:", parseErr);
    }
  }
  return {
    success: false,
    error: res.status === 404
      ? "Hợp đồng không tồn tại hoặc liên kết đã hết hạn"
      : defaultError,
  };
}

/**
 * Fetch contract info by signing token from ERP
 */
export async function getContractByToken(token: string): Promise<ContractApiResponse<ContractDetails>> {
  const baseUrl = getErpBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/portal/contracts/${token}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    return await safeParseJson<ContractDetails>(res, "Không thể kết nối đến máy chủ ERP");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[erp-api] getContractByToken lỗi mạng:", msg);
    return { success: false, error: "Không thể kết nối đến máy chủ ERP. Vui lòng thử lại sau." };
  }
}

export interface ClientRequestMeta {
  userAgent?: string | null;
  clientIp?: string | null;
}

/**
 * Request OTP via Zalo or Email from ERP
 */
export async function sendContractOtp(
  token: string,
  channel: "zalo" | "email",
  clientMeta?: ClientRequestMeta
): Promise<ContractApiResponse<null>> {
  const baseUrl = getErpBaseUrl();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (clientMeta?.userAgent) {
    headers["User-Agent"] = clientMeta.userAgent;
    headers["X-Client-User-Agent"] = clientMeta.userAgent;
  }
  if (clientMeta?.clientIp) {
    headers["X-Forwarded-For"] = clientMeta.clientIp;
    headers["X-Real-IP"] = clientMeta.clientIp;
  }

  try {
    const res = await fetch(`${baseUrl}/api/portal/contracts/${token}/send-otp`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        channel,
        user_agent: clientMeta?.userAgent || undefined,
        client_ip: clientMeta?.clientIp || undefined,
      }),
    });

    return await safeParseJson<null>(res, "Không thể gửi mã OTP");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[erp-api] sendContractOtp error:", msg);
    return { success: false, error: "Lỗi kết nối máy chủ khi gửi mã OTP" };
  }
}

/**
 * Confirm signature for Individual Customer
 */
export async function signContractIndividual(
  token: string,
  payload: {
    signature_image_base64?: string;
    otp_code?: string;
    latitude?: number;
    longitude?: number;
    user_agent?: string;
    client_ip?: string;
    terms_agreed?: boolean;
  },
  clientMeta?: ClientRequestMeta
): Promise<ContractApiResponse<{ finalPdfUrl?: string; contractNumber?: string }>> {
  const baseUrl = getErpBaseUrl();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const effectiveUA = payload.user_agent || clientMeta?.userAgent || undefined;
  const effectiveIP = payload.client_ip || clientMeta?.clientIp || undefined;

  if (effectiveUA) {
    headers["User-Agent"] = effectiveUA;
    headers["X-Client-User-Agent"] = effectiveUA;
  }
  if (effectiveIP) {
    headers["X-Forwarded-For"] = effectiveIP;
    headers["X-Real-IP"] = effectiveIP;
  }

  try {
    const res = await fetch(`${baseUrl}/api/portal/contracts/${token}/sign`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...payload,
        user_agent: effectiveUA,
        client_ip: effectiveIP,
      }),
    });

    return await safeParseJson<{ finalPdfUrl?: string; contractNumber?: string }>(res, "Không thể hoàn tất ký hợp đồng");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[erp-api] signContractIndividual error:", msg);
    return { success: false, error: "Lỗi kết nối máy chủ khi hoàn tất ký hợp đồng" };
  }
}

/**
 * Confirm signature for Business Customer (Dual-CA USB Token)
 */
export async function signContractBusiness(
  token: string,
  payload: {
    signature_base64: string;
    tax_code: string;
    company_name?: string;
    cert_serial?: string;
    issuer?: string;
    user_agent?: string;
    client_ip?: string;
    terms_agreed?: boolean;
  },
  clientMeta?: ClientRequestMeta
): Promise<ContractApiResponse<{ finalPdfUrl?: string; contractNumber?: string }>> {
  const baseUrl = getErpBaseUrl();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const effectiveUA = payload.user_agent || clientMeta?.userAgent || undefined;
  const effectiveIP = payload.client_ip || clientMeta?.clientIp || undefined;

  if (effectiveUA) {
    headers["User-Agent"] = effectiveUA;
    headers["X-Client-User-Agent"] = effectiveUA;
  }
  if (effectiveIP) {
    headers["X-Forwarded-For"] = effectiveIP;
    headers["X-Real-IP"] = effectiveIP;
  }

  try {
    const res = await fetch(`${baseUrl}/api/portal/contracts/${token}/sign-b2b`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...payload,
        user_agent: effectiveUA,
        client_ip: effectiveIP,
      }),
    });

    return await safeParseJson<{ finalPdfUrl?: string; contractNumber?: string }>(res, "Ký số doanh nghiệp thất bại");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[erp-api] signContractBusiness error:", msg);
    return { success: false, error: "Lỗi kết nối máy chủ khi ký số doanh nghiệp" };
  }
}
