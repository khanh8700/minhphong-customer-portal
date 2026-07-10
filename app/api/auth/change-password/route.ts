import { NextResponse } from "next/server";
import { requirePortalSession } from "@/lib/session";
import { createPortalAdminClient } from "@/lib/supabase/admin";
import { sha256 } from "@/lib/crypto";
import { hitRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const session = await requirePortalSession();
    const { oldPassword, newPassword } = await req.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createPortalAdminClient();
    
    // Get customer code first to query customer_auth
    const { data: customer } = await supabase
      .from("customers")
      .select("customer_code, phone_normalized_values")
      .eq("id", session.customer_id)
      .single();

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Rate Limit Check (5 attempts per 15 minutes)
    const ipHash = req.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = await hitRateLimit(supabase, ["change_pwd", ipHash, customer.customer_code], {
      limit: 5,
      windowSeconds: 60 * 15,
    });

    if (!rateLimit.allowed) {
      const waitMinutes = Math.ceil((new Date(rateLimit.resetAt).getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ${waitMinutes} phút.` },
        { status: 429 }
      );
    }

    const { data: auth } = await supabase
      .from("customer_auth")
      .select("can_change_password, hashed_password")
      .eq("customer_code", customer.customer_code)
      .single();

    if (!auth || !auth.can_change_password) {
      return NextResponse.json({ error: "Unauthorized to change password" }, { status: 403 });
    }

    // Verify old password
    let validOld = false;
    if (auth.hashed_password) {
      validOld = auth.hashed_password === sha256(oldPassword);
    } else {
      // Fallback to checking phone array if no custom password is set
      const phoneArray = customer.phone_normalized_values || [];
      const normalizedInput = oldPassword.replace(/[^0-9]/g, "");
      validOld = phoneArray.includes(normalizedInput);
    }

    if (!validOld) {
      return NextResponse.json({ error: "Mật khẩu cũ không chính xác" }, { status: 401 });
    }

    // Update password
    const { error } = await supabase
      .from("customer_auth")
      .update({ hashed_password: sha256(newPassword), updated_at: new Date().toISOString() })
      .eq("customer_code", customer.customer_code);

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
