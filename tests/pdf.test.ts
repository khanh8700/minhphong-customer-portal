import { describe, expect, it } from "vitest";
import { generateInvoicePdf } from "@/lib/pdf/invoice";
import type { Bill, CustomerSummary } from "@/lib/types";

describe("invoice PDF", () => {
  it("generates a valid PDF buffer containing bill data", () => {
    const customer: CustomerSummary = {
      id: "customer-id",
      customer_code: "KH001",
      full_name: "Nguyễn Văn A",
      address: "Dia chi test",
      phone_masked: "091****678",
      area_name: null,
      route_name: null,
      status_bool: true,
      credit_balance: 0,
      meter: { meter_code: "M001", meter_size: null, meter_class: null }
    };
    const bill: Bill = {
      id: "bill-id",
      customer_id: "customer-id",
      period_id: null,
      old_reading: 10,
      new_reading: 20,
      consumption: 10,
      unit_price: 7000,
      pre_tax_amount: 70000,
      tax: 5,
      tax_amount: 3500,
      total_amount: 73500,
      paid_amount: 0,
      status: "unpaid",
      due_date: null,
      start_date: null,
      end_date: null,
      source_created_at: null,
      billing_periods: { period_name: "05/2026", start_date: null, end_date: null }
    };

    const pdf = generateInvoicePdf({ customer, bill });
    const text = pdf.toString("latin1");

    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("KH001");
    expect(text).toContain("05/2026");
    expect(text).toContain("73.500 VND");
  });
});
