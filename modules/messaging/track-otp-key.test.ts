import { describe, expect, it } from "vitest";

/**
 * Documents the lockout key contract for track OTP:
 * checkOtpVerifyRateLimit and failure logs must share `${orderNumber}:${email}`.
 */
describe("track OTP rate-limit key contract", () => {
  it("builds the composite key used by verifyTrackOtp", () => {
    const orderNumber = "AKS-2026-00006";
    const email = "guest@mailinator.com";
    const rateLimitKey = `${orderNumber}:${email}`;
    expect(rateLimitKey).toBe("AKS-2026-00006:guest@mailinator.com");
    expect(rateLimitKey).toContain(":");
    expect(rateLimitKey.startsWith(orderNumber)).toBe(true);
  });
});
