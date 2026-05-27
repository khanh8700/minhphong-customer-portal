import { describe, expect, it } from "vitest";
import { buildSessionCookieValue, parseSessionCookie } from "@/lib/session";

process.env.SESSION_SECRET = "test-session-secret";

describe("session cookie signatures", () => {
  it("parses a valid signed cookie", () => {
    const value = buildSessionCookieValue("session-token");
    expect(parseSessionCookie(value)).toBe("session-token");
  });

  it("rejects a tampered cookie", () => {
    const value = buildSessionCookieValue("session-token");
    expect(parseSessionCookie(value.replace("session-token", "other-token"))).toBeNull();
  });
});

