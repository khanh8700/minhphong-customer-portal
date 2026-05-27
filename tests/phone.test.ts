import { describe, expect, it } from "vitest";
import { extractNormalizedPhones, maskPhone, normalizeCustomerCode, normalizeVietnamPhone } from "@/lib/phone";

describe("phone helpers", () => {
  it("normalizes Vietnamese phone numbers", () => {
    expect(normalizeVietnamPhone("0912 345 678")).toBe("0912345678");
    expect(normalizeVietnamPhone("+84 912 345 678")).toBe("0912345678");
    expect(normalizeVietnamPhone("84912345678")).toBe("0912345678");
  });

  it("extracts multiple full phone numbers and masks only display values", () => {
    expect(extractNormalizedPhones("0912345678 / +84 981 111 222")).toEqual(["0912345678", "0981111222"]);
    expect(maskPhone("0912345678")).toBe("091****678");
  });

  it("normalizes customer code for exact lookup", () => {
    expect(normalizeCustomerCode(" tth 307 ")).toBe("TTH307");
  });
});

