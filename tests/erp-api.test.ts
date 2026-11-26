import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getErpHttpStatus,
  verifyContractOtp,
  prepareContractBusiness,
  signContractBusiness,
  postContractActionWithFallback,
} from "@/lib/erp-api";

describe("erp-api B2B 2-phase & OTP helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("verifyContractOtp forwards payload and preserves ERP HTTP status", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: "Mã OTP không chính xác",
          code: "OTP_INVALID",
          remainingAttempts: 3,
        }),
        {
          status: 422,
          headers: { "content-type": "application/json" },
        }
      )
    );

    const res = await verifyContractOtp(
      "tok-123",
      { otp_code: "654321" },
      { userAgent: "TestAgent", clientIp: "1.2.3.4" },
      "local"
    );

    expect(res.success).toBe(false);
    expect(res.remainingAttempts).toBe(3);
    expect(getErpHttpStatus(res, 400)).toBe(422);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/portal/contracts/tok-123/verify-otp");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      otp_code: "654321",
      user_agent: "TestAgent",
      client_ip: "1.2.3.4",
    });
  });

  it("prepareContractBusiness forwards cert_base64 and returns hash_to_sign & session_id", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          session_id: "sess-abc",
          hash_to_sign: "A".repeat(64),
          extracted_tax_code: "2301081775",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )
    );

    const res = await prepareContractBusiness(
      "tok-123",
      {
        cert_base64: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A",
        tax_code: "2301081775",
        cert_serial: "SN123",
        valid_to: "2028-01-01",
      },
      { userAgent: "UA", clientIp: "5.6.7.8" },
      "local"
    );

    expect(res.success).toBe(true);
    expect(res.session_id).toBe("sess-abc");
    expect(res.hash_to_sign).toBe("A".repeat(64));
    expect(getErpHttpStatus(res, 400)).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("signContractBusiness forwards session_id, cert_base64, valid_to, signature_base64", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          finalPdfUrl: "https://cdn.example.com/final.pdf",
          data: { contractNumber: "HD-01", status: "signed_by_customer" },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )
    );

    const res = await signContractBusiness(
      "tok-123",
      {
        session_id: "sess-abc",
        signature_base64: "SIG_BASE64",
        cert_base64: "CERT_BASE64",
        tax_code: "2301081775",
        valid_to: "2028-01-01",
        terms_agreed: true,
      },
      { userAgent: "UA", clientIp: "5.6.7.8" },
      "local"
    );

    expect(res.success).toBe(true);
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      session_id: "sess-abc",
      signature_base64: "SIG_BASE64",
      cert_base64: "CERT_BASE64",
      tax_code: "2301081775",
      valid_to: "2028-01-01",
      terms_agreed: true,
    });
  });

  it("postContractActionWithFallback does not double-call direct ERP on 400 business error, but falls back on 403", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, error: "Sai mã OTP", remainingAttempts: 2 }),
          { status: 400, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response("Forbidden", { status: 403, headers: { "content-type": "text/html" } })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, verifiedAt: "2026-11-26T00:00:00Z" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );

    const bizErr = await postContractActionWithFallback(
      "tok-123",
      "verify-otp",
      { otp_code: "000000" },
      "staging"
    );
    expect(bizErr.ok).toBe(false);
    expect(bizErr.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const cfFallback = await postContractActionWithFallback(
      "tok-123",
      "verify-otp",
      { otp_code: "123456" },
      "staging"
    );
    expect(cfFallback.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
