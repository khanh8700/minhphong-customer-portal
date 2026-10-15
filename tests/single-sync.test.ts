import { describe, it, expect, vi } from "vitest";
import { syncSingleCustomerAndContract } from "@/lib/sync/single-sync";

describe("single-sync", () => {
  it("trả về lỗi an toàn khi không truyền bất kỳ ID nào", async () => {
    const result = await syncSingleCustomerAndContract({});
    expect(result.success).toBe(false);
    expect(result.error).toContain("Cần cung cấp ít nhất một trong ba");
  });
});
