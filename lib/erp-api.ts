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
  code?: string;
  remainingSeconds?: number;
  environment?: ErpEnvironment;
}

export interface VerifyOtpPayload {
  otp_code: string;
  user_agent?: string;
  client_ip?: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  verifiedAt?: string;
  verified_at?: string;
  error?: string;
  code?: string;
  remainingAttempts?: number;
}

export interface PrepareB2bPayload {
  cert_base64: string;
  tax_code: string;
  company_name?: string;
  cert_serial?: string;
  valid_to?: string;
  issuer?: string;
  user_agent?: string;
  client_ip?: string;
}

export interface PrepareB2bResponse {
  success: boolean;
  session_id?: string;
  hash_to_sign?: string;
  extracted_tax_code?: string;
  cert_subject?: string;
  cert_serial?: string;
  error?: string;
  code?: string;
}

export interface SignB2bPayload {
  session_id: string;
  signature_base64: string;
  cert_base64: string;
  tax_code: string;
  company_name?: string;
  cert_serial?: string;
  valid_to?: string;
  issuer?: string;
  representative?: string;
  representative_position?: string;
  user_agent?: string;
  client_ip?: string;
  terms_agreed?: boolean;
}

export interface SignB2bData {
  finalPdfUrl?: string;
  contractNumber?: string;
  customerCode?: string;
  status?: string;
  completedAt?: string;
}

export interface SignB2bResponse extends ContractApiResponse<SignB2bData> {
  finalPdfUrl?: string;
  code?: string;
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

const erpHttpStatusMap = new WeakMap<object, number>();

export function getErpHttpStatus(result: unknown, fallbackStatus: number): number {
  if (result && typeof result === "object") {
    return erpHttpStatusMap.get(result) ?? fallbackStatus;
  }
  return fallbackStatus;
}

async function safeParseJson<T extends object = ContractApiResponse<unknown>>(
  res: Response,
  defaultError: string,
  targetUrl?: string
): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const parsed = (await res.json()) as T;
      if (parsed && typeof parsed === "object") {
        erpHttpStatusMap.set(parsed, res.status);
      }
      return parsed;
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

  const fallback = {
    success: false,
    error: res.status === 404
      ? "Hợp đồng không tồn tại hoặc liên kết đã hết hạn"
      : `${defaultError} (${res.status} ${res.statusText || ""})`.trim(),
  } as unknown as T;
  erpHttpStatusMap.set(fallback, res.status);
  return fallback;
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

    const parsed = await safeParseJson<ContractApiResponse<ContractDetails>>(
      res,
      "Không thể kết nối đến máy chủ ERP",
      targetReqUrl
    );

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
        const fallbackParsed = await safeParseJson<ContractApiResponse<ContractDetails>>(
          fallbackRes,
          "Lỗi máy chủ dự phòng",
          fallbackReqUrl
        );
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

async function postToErp<TResponse extends object>(
  token: string,
  actionPath: string,
  payload: Record<string, unknown>,
  defaultError: string,
  clientMeta?: ClientRequestMeta,
  targetEnv?: string | null
): Promise<TResponse> {
  const baseUrl = getErpBaseUrl(targetEnv);
  const targetReqUrl = `${baseUrl}/api/portal/contracts/${token}/${actionPath}`;
  const headers: Record<string, string> = {
    ...DEFAULT_SERVER_HEADERS,
    "Content-Type": "application/json",
  };
  const payloadUA = typeof payload.user_agent === "string" ? payload.user_agent : undefined;
  const payloadIP = typeof payload.client_ip === "string" ? payload.client_ip : undefined;
  const effectiveUA = payloadUA || clientMeta?.userAgent || undefined;
  const effectiveIP = clientMeta?.clientIp || payloadIP || undefined;

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

    return await safeParseJson<TResponse>(res, defaultError, targetReqUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[erp-api] ${actionPath} error:`, msg);
    const errRes = {
      success: false,
      error: `${defaultError} (${msg})`,
    } as unknown as TResponse;
    erpHttpStatusMap.set(errRes, 502);
    return errRes;
  }
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
  return postToErp<ContractApiResponse<null>>(
    token,
    "send-otp",
    { channel },
    "Không thể gửi mã OTP",
    clientMeta,
    targetEnv
  );
}

/**
 * Verify OTP code for contract signing (used before B2B USB Token signing)
 */
export async function verifyContractOtp(
  token: string,
  payload: VerifyOtpPayload,
  clientMeta?: ClientRequestMeta,
  targetEnv?: string | null
): Promise<VerifyOtpResponse> {
  return postToErp<VerifyOtpResponse>(
    token,
    "verify-otp",
    { ...payload },
    "Không thể xác thực mã OTP",
    clientMeta,
    targetEnv
  );
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
  return postToErp<ContractApiResponse<{ finalPdfUrl?: string; contractNumber?: string }>>(
    token,
    "sign",
    { ...payload },
    "Không thể hoàn tất ký hợp đồng",
    clientMeta,
    targetEnv
  );
}

/**
 * Phase 1 of B2B PAdES 2-Phase Signing: Prepare signing session and get SHA-256 hash_to_sign
 */
export async function prepareContractBusiness(
  token: string,
  payload: PrepareB2bPayload,
  clientMeta?: ClientRequestMeta,
  targetEnv?: string | null
): Promise<PrepareB2bResponse> {
  return postToErp<PrepareB2bResponse>(
    token,
    "prepare-b2b",
    { ...payload },
    "Không thể khởi tạo phiên ký số doanh nghiệp",
    clientMeta,
    targetEnv
  );
}

/**
 * Phase 2 of B2B PAdES 2-Phase Signing: Finalize business signature with signed hash
 */
export async function signContractBusiness(
  token: string,
  payload: SignB2bPayload,
  clientMeta?: ClientRequestMeta,
  targetEnv?: string | null
): Promise<SignB2bResponse> {
  return postToErp<SignB2bResponse>(
    token,
    "sign-b2b",
    { ...payload },
    "Ký số doanh nghiệp thất bại",
    clientMeta,
    targetEnv
  );
}

export function getDirectErpBaseUrl(env: ErpEnvironment): string {
  if (env === "staging") return "https://staging.nuocsachdinhto.com";
  if (env === "local") return "http://localhost:3000";
  return "https://erp.nuocsachdinhto.com";
}

function shouldFallbackToDirectErp(status: number, json: Record<string, unknown> | null): boolean {
  if (!json) return true;
  if (status === 403 || status >= 500) return true;
  const errMsg = typeof json.error === "string" ? json.error : "";
  return errMsg.includes("Không thể kết nối") || errMsg.includes("HTTP 403");
}

/**
 * Client-side helper: gọi proxy nội bộ Portal trước, chỉ fallback gọi trực tiếp ERP
 * khi gặp lỗi mạng, Cloudflare 403 hoặc 5xx (tránh gọi trùng khi gặp lỗi nghiệp vụ 4xx).
 */
export async function postContractActionWithFallback<TResp extends { success: boolean; error?: string }>(
  token: string,
  actionPath: string,
  payload: Record<string, unknown>,
  currentEnv: ErpEnvironment
): Promise<{ ok: boolean; status: number; data: TResp | null }> {
  let proxyData: (TResp & Record<string, unknown>) | null = null;
  let proxyStatus = 0;

  try {
    const res = await fetch(`/api/portal/contracts/${token}/${actionPath}?env=${currentEnv}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, target_env: currentEnv }),
    });
    proxyStatus = res.status;
    proxyData = (await res.json().catch(() => null)) as (TResp & Record<string, unknown>) | null;

    if (res.ok && proxyData?.success) {
      return { ok: true, status: res.status, data: proxyData };
    }

    if (!shouldFallbackToDirectErp(res.status, proxyData)) {
      return { ok: false, status: res.status, data: proxyData };
    }
  } catch (proxyErr) {
    console.warn(`[portal] Proxy ${actionPath} failed, attempting direct ERP...`, proxyErr);
  }

  try {
    const directBaseUrl = getDirectErpBaseUrl(currentEnv);
    const directBody = { ...payload };
    delete directBody.target_env;
    const directRes = await fetch(`${directBaseUrl}/api/portal/contracts/${token}/${actionPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(directBody),
    });
    const directJson = (await directRes.json().catch(() => null)) as TResp | null;
    if (directJson) {
      return {
        ok: directRes.ok && Boolean(directJson.success),
        status: directRes.status,
        data: directJson,
      };
    }
    return { ok: false, status: directRes.status, data: proxyData };
  } catch (directErr) {
    console.warn(`[portal] Direct ${actionPath} fallback failed:`, directErr);
    return { ok: false, status: proxyStatus || 502, data: proxyData };
  }
}
