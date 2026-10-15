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
  environment?: ErpEnvironment;
}

export type ErpEnvironment = "production" | "staging" | "local";

export const ERP_ENV_URLS: Record<ErpEnvironment, string> = {
  production: process.env.ERP_API_PROD_URL || process.env.ERP_API_BASE_URL || "https://erp.nuocsachdinhto.com",
  staging: process.env.ERP_API_STAGING_URL || "https://staging.nuocsachdinhto.com",
  local: process.env.ERP_API_LOCAL_URL || "http://localhost:3000",
};

export function resolveErpEnvironment(explicitEnv?: string | null): ErpEnvironment {
  const norm = (explicitEnv || "").toLowerCase().trim();
  if (norm === "staging" || norm === "stg" || norm === "stage") return "staging";
  if (norm === "local" || norm === "dev" || norm === "development") return "local";
  if (norm === "production" || norm === "prod") return "production";

  // Kiểm tra cookie ở Client-side nếu có
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)erp_target_env=([^;]+)/);
    if (match?.[1]) {
      const cookieEnv = match[1].toLowerCase().trim();
      if (cookieEnv === "staging" || cookieEnv === "local" || cookieEnv === "production") {
        return cookieEnv as ErpEnvironment;
      }
    }
  }

  // Mặc định ở môi trường development local
  if (process.env.NODE_ENV === "development") {
    return "local";
  }

  return "production";
}

export function getErpBaseUrl(targetEnv?: ErpEnvironment | string | null): string {
  if (targetEnv) {
    const resolved = resolveErpEnvironment(targetEnv);
    return ERP_ENV_URLS[resolved].trim().replace(/\/+$/, "");
  }

  const envUrl = process.env.ERP_API_BASE_URL || process.env.NEXT_PUBLIC_ERP_API_BASE_URL;
  if (envUrl) {
    return envUrl.trim().replace(/\/+$/, "");
  }

  const resolved = resolveErpEnvironment();
  return ERP_ENV_URLS[resolved].trim().replace(/\/+$/, "");
}

const DEFAULT_SERVER_HEADERS: Record<string, string> = {
  "Accept": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 MinhPhongPortal/1.0",
};

async function safeParseJson<T>(
  res: Response,
  defaultError: string,
  targetUrl?: string
): Promise<ContractApiResponse<T>> {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch (parseErr) {
      console.error("[erp-api] Lỗi parse JSON:", parseErr);
    }
  }

  let textSnippet = "";
  try {
    const rawText = await res.text();
    textSnippet = rawText.slice(0, 200).trim();
  } catch {}

  const errDetail = `[HTTP ${res.status}] ${targetUrl || ""}: ${textSnippet || res.statusText || defaultError}`;
  console.error(`[erp-api] safeParseJson failure:`, errDetail);

  return {
    success: false,
    error: res.status === 404
      ? "Hợp đồng không tồn tại hoặc liên kết đã hết hạn"
      : `${defaultError} (${res.status} ${res.statusText || ""})`.trim(),
  };
}

/**
 * Fetch contract info by signing token from ERP.
 * Có cơ chế Smart Fallback: nếu không tìm thấy ở môi trường chỉ định (404),
 * tự động kiểm tra môi trường đối ứng (Staging <-> Production) để hỗ trợ tester.
 */
export async function getContractByToken(
  token: string,
  targetEnv?: string | null
): Promise<ContractApiResponse<ContractDetails>> {
  const primaryEnv = resolveErpEnvironment(targetEnv);
  const primaryUrl = getErpBaseUrl(primaryEnv);
  const targetReqUrl = `${primaryUrl}/api/portal/contracts/${token}`;

  try {
    const res = await fetch(targetReqUrl, {
      method: "GET",
      headers: { ...DEFAULT_SERVER_HEADERS },
      cache: "no-store",
    });

    const parsed = await safeParseJson<ContractDetails>(res, "Không thể kết nối đến máy chủ ERP", targetReqUrl);

    // Nếu tìm thấy hoặc lỗi không phải 404 (ví dụ đã ký xong) -> trả về kết quả ngay
    if (parsed.success) {
      parsed.environment = primaryEnv;
      return parsed;
    }

    // Nếu bị 404: Tự động thử môi trường còn lại (Smart Fallback)
    // Nếu đang ở Production bị 404 -> thử Staging; nếu đang ở Staging bị 404 -> thử Production
    const fallbackEnv: ErpEnvironment = primaryEnv === "production" ? "staging" : "production";
    const fallbackUrl = getErpBaseUrl(fallbackEnv);
    const fallbackReqUrl = `${fallbackUrl}/api/portal/contracts/${token}`;

    try {
      const fallbackRes = await fetch(fallbackReqUrl, {
        method: "GET",
        headers: { ...DEFAULT_SERVER_HEADERS },
        cache: "no-store",
      });

      if (fallbackRes.ok) {
        const fallbackParsed = await safeParseJson<ContractDetails>(fallbackRes, "Lỗi máy chủ dự phòng", fallbackReqUrl);
        if (fallbackParsed.success && fallbackParsed.data) {
          console.log(`[erp-api] Smart Fallback: Hợp đồng được tìm thấy tại máy chủ ${fallbackEnv}`);
          fallbackParsed.environment = fallbackEnv;
          return fallbackParsed;
        }
      }
    } catch (fbErr) {
      // Bỏ qua lỗi fallback, trả về kết quả ban đầu
    }

    return parsed;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[erp-api] getContractByToken lỗi mạng:", msg);
    return { success: false, error: `Không thể kết nối đến máy chủ ERP (${msg})` };
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
  clientMeta?: ClientRequestMeta,
  targetEnv?: string | null
): Promise<ContractApiResponse<null>> {
  const baseUrl = getErpBaseUrl(targetEnv);
  const targetReqUrl = `${baseUrl}/api/portal/contracts/${token}/send-otp`;
  const headers: Record<string, string> = {
    ...DEFAULT_SERVER_HEADERS,
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
    const res = await fetch(targetReqUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        channel,
        user_agent: clientMeta?.userAgent || undefined,
        client_ip: clientMeta?.clientIp || undefined,
      }),
    });

    return await safeParseJson<null>(res, "Không thể gửi mã OTP", targetReqUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[erp-api] sendContractOtp error:", msg);
    return { success: false, error: `Lỗi kết nối máy chủ khi gửi mã OTP (${msg})` };
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
  clientMeta?: ClientRequestMeta,
  targetEnv?: string | null
): Promise<ContractApiResponse<{ finalPdfUrl?: string; contractNumber?: string }>> {
  const baseUrl = getErpBaseUrl(targetEnv);
  const targetReqUrl = `${baseUrl}/api/portal/contracts/${token}/sign`;
  const headers: Record<string, string> = {
    ...DEFAULT_SERVER_HEADERS,
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
    const res = await fetch(targetReqUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...payload,
        user_agent: effectiveUA,
        client_ip: effectiveIP,
      }),
    });

    return await safeParseJson<{ finalPdfUrl?: string; contractNumber?: string }>(res, "Không thể hoàn tất ký hợp đồng", targetReqUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[erp-api] signContractIndividual error:", msg);
    return { success: false, error: `Lỗi kết nối máy chủ khi hoàn tất ký hợp đồng (${msg})` };
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
  clientMeta?: ClientRequestMeta,
  targetEnv?: string | null
): Promise<ContractApiResponse<{ finalPdfUrl?: string; contractNumber?: string }>> {
  const baseUrl = getErpBaseUrl(targetEnv);
  const targetReqUrl = `${baseUrl}/api/portal/contracts/${token}/sign-b2b`;
  const headers: Record<string, string> = {
    ...DEFAULT_SERVER_HEADERS,
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
    const res = await fetch(targetReqUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...payload,
        user_agent: effectiveUA,
        client_ip: effectiveIP,
      }),
    });

    return await safeParseJson<{ finalPdfUrl?: string; contractNumber?: string }>(res, "Ký số doanh nghiệp thất bại", targetReqUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[erp-api] signContractBusiness error:", msg);
    return { success: false, error: `Lỗi kết nối máy chủ khi ký số doanh nghiệp (${msg})` };
  }
}
