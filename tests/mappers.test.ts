import { describe, expect, it } from "vitest";
import { mapBill, mapCustomer, mapPaymentAllocation, mapContract } from "@/lib/sync/mappers";

describe("sync mappers", () => {
  it("maps ERP customer rows without exposing raw phone", () => {
    const mapped = mapCustomer({
      id: "11111111-1111-1111-1111-111111111111",
      customer_code: "kh001",
      full_name: "Nguyễn Văn A",
      address: "Xã Minh Phong",
      phone: "0912345678, +84 981 111 222",
      area: { name: "Khu A" },
      route: { name: "Tuyến 1" },
      credit_balance: 1000
    });

    expect(mapped?.customer_code_normalized).toBe("KH001");
    expect(mapped?.phone_normalized_values).toEqual(["0912345678", "0981111222"]);
    expect(mapped?.phone_masked).toBe("091****678");
    expect(mapped).not.toHaveProperty("phone");
  });

  it("returns null for customers with missing or empty customer_code", () => {
    expect(mapCustomer({ id: "123", customer_code: null })).toBeNull();
    expect(mapCustomer({ id: "123", customer_code: "" })).toBeNull();
    expect(mapCustomer({ id: "123", customer_code: "   " })).toBeNull();
    expect(mapCustomer({ customer_code: "KH001" })).toBeNull();
  });

  it("maps ERP invoices to portal bills", () => {
    const mapped = mapBill({
      id: "bill-id",
      customer_id: "customer-id",
      total_amount: "120000",
      paid_amount: "20000",
      status: "partial"
    });

    expect(mapped.id).toBe("bill-id");
    expect(mapped.total_amount).toBe(120000);
    expect(mapped.paid_amount).toBe(20000);
  });

  it("derives allocation customer from payment relation", () => {
    const mapped = mapPaymentAllocation({
      id: "allocation-id",
      payment_id: "payment-id",
      invoice_id: "bill-id",
      allocated_amount: "50000",
      payment: { customer_id: "customer-id" }
    });

    expect(mapped).toMatchObject({
      id: "allocation-id",
      bill_id: "bill-id",
      customer_id: "customer-id",
      allocated_amount: 50000
    });
  });

  it("maps ERP contract rows to portal contracts", () => {
    const mapped = mapContract({
      id: "contract-123",
      customer_id: "cust-1",
      customer_code: "KH001",
      contract_number: "HĐ-KH001",
      status: "completed",
      template_code: "01/HĐ-CNSH",
      signing_channel: "remote_zalo",
      customer_signer_type: "individual_draw",
      final_pdf_url: "contracts/final_123.pdf",
      pdf_sha256: "abc123sha"
    });

    expect(mapped).toMatchObject({
      id: "contract-123",
      customer_id: "cust-1",
      customer_code: "KH001",
      contract_number: "HĐ-KH001",
      status: "completed",
      final_pdf_url: "contracts/final_123.pdf",
      pdf_sha256: "abc123sha"
    });
  });
});

