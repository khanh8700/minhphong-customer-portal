import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { hashIp } from "@/lib/crypto";
import { normalizeCustomerCode, normalizeVietnamPhone } from "@/lib/phone";
import { hitRateLimit } from "@/lib/rate-limit";
import { getRequestIp, getUserAgent } from "@/lib/request";
import { createLookupSession, setSessionCookie } from "@/lib/session";
import { createPortalAdminClient } from "@/lib/supabase/admin";

const lookupSchema = z.object({
  customer_code: z.string().min(1).max(64),
  phone: z.string().min(4).max(64)
});

const GENERIC_ERROR = "Không tìm thấy thông tin phù hợp. Vui lòng kiểm tra lại mã KH, SĐT hoặc liên hệ Hotline: 0359 613 267 để được hỗ trợ.";

export async function POST(req: NextRequest) {
  const supabase = createPortalAdminClient();
  const ipHash = hashIp(getRequestIp(req));
  const userAgent = getUserAgent(req);

  let parsed: z.infer<typeof lookupSchema>;
  try {
    parsed = lookupSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const customerCode = normalizeCustomerCode(parsed.customer_code);
  const rawAuthInput = parsed.phone.trim();

  // Validate early if raw input is not even a potential password or phone
  if (!rawAuthInput) {
    await logAudit(supabase, {
      action: "lookup_failed_invalid_input",
      metadata: { customer_code: customerCode },
      ipHash,
      userAgent
    });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const rateLimit = await hitRateLimit(supabase, [ipHash ?? "unknown", customerCode], {
    bucket: "lookup",
    limit: 6,
    windowSeconds: 15 * 60
  });

  if (!rateLimit.allowed) {
    await logAudit(supabase, {
      action: "lookup_rate_limited",
      metadata: { customer_code: customerCode, reset_at: rateLimit.resetAt },
      ipHash,
      userAgent
    });
    return NextResponse.json(
      { error: "Bạn thử quá nhiều lần. Vui lòng quay lại sau ít phút." },
      { status: 429 }
    );
  }

  let { data: customer, error } = await supabase
    .from("customers")
    .select("id, customer_code, phone_normalized_values")
    .eq("customer_code_normalized", customerCode)
    .maybeSingle();

  // On-demand fallback: Nếu chưa có trong Portal DB, tự động kéo tức thì từ ERP DB
  if (!customer) {
    try {
      const { syncSingleCustomerAndContract } = await import("@/lib/sync/single-sync");
      const syncRes = await syncSingleCustomerAndContract({ customerCode });
      if (syncRes.success) {
        const retry = await supabase
          .from("customers")
          .select("id, customer_code, phone_normalized_values")
          .eq("customer_code_normalized", customerCode)
          .maybeSingle();
        if (retry.data) {
          customer = retry.data;
          error = retry.error;
        }
      }
    } catch (syncErr) {
      console.warn("[lookup] Lỗi on-demand sync customer:", syncErr);
    }
  }

  let matched = false;

  if (!error && customer) {
    const { data: auth } = await supabase
      .from("customer_auth")
      .select("hashed_password")
      .eq("customer_code", customer.customer_code)
      .maybeSingle();

    if (auth && auth.hashed_password) {
      // Bắt buộc dùng mật khẩu tuỳ chỉnh
      const crypto = await import("@/lib/crypto");
      matched = auth.hashed_password === crypto.sha256(rawAuthInput);
    } else {
      // Fallback về xác thực số điện thoại
      const normalizedPhone = normalizeVietnamPhone(rawAuthInput);
      if (normalizedPhone) {
        const phones = ((customer.phone_normalized_values ?? []) as string[]) || [];
        matched = phones.includes(normalizedPhone);
      }
    }
  }

  if (!matched) {
    await logAudit(supabase, {
      action: "lookup_failed",
      metadata: { customer_code: customerCode },
      ipHash,
      userAgent
    });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const session = await createLookupSession(supabase, {
    customerId: customer!.id as string,
    ipHash,
    userAgent
  });

  await logAudit(supabase, {
    customerId: customer!.id as string,
    action: "lookup_success",
    metadata: { customer_code: customerCode },
    ipHash,
    userAgent
  });

  const res = NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  setSessionCookie(res, session.cookieValue, session.expiresAt);
  return res;
}

