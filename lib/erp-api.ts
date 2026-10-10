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

    const data = await res.json();
    return data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Không thể kết nối đến máy chủ ERP: ${msg}` };
  }
}

/**
 * Request OTP via Zalo or Email from ERP
 */
export async function sendContractOtp(
  token: string,
  channel: "zalo" | "email"
): Promise<ContractApiResponse<null>> {
  const baseUrl = getErpBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/portal/contracts/${token}/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channel }),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Lỗi gửi OTP: ${msg}` };
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
  }
): Promise<ContractApiResponse<{ finalPdfUrl?: string; contractNumber?: string }>> {
  const baseUrl = getErpBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/portal/contracts/${token}/sign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Lỗi hoàn tất ký hợp đồng: ${msg}` };
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
  }
): Promise<ContractApiResponse<{ finalPdfUrl?: string; contractNumber?: string }>> {
  const baseUrl = getErpBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/portal/contracts/${token}/sign-b2b`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Lỗi ký số doanh nghiệp: ${msg}` };
  }
}
