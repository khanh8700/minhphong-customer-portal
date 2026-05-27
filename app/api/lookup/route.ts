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
  phone: z.string().min(8).max(32)
});

const GENERIC_ERROR = "Không tìm thấy thông tin phù hợp. Vui lòng kiểm tra lại mã khách hàng và số điện thoại.";

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
  const phone = normalizeVietnamPhone(parsed.phone);
  if (!phone) {
    await logAudit(supabase, {
      action: "lookup_failed_invalid_phone",
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

  const { data: customer, error } = await supabase
    .from("customers")
    .select("id, phone_normalized_values")
    .eq("customer_code_normalized", customerCode)
    .maybeSingle();

  const phones = ((customer?.phone_normalized_values ?? []) as string[]) || [];
  const matched = !error && customer && phones.includes(phone);

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
    customerId: customer.id as string,
    ipHash,
    userAgent
  });

  await logAudit(supabase, {
    customerId: customer.id as string,
    action: "lookup_success",
    metadata: { customer_code: customerCode },
    ipHash,
    userAgent
  });

  const res = NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  setSessionCookie(res, session.cookieValue, session.expiresAt);
  return res;
}

