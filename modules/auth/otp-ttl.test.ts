import { describe, expect, it } from "vitest";

import { OTP_TTL_MS } from "./otp";

describe("OTP_TTL_MS", () => {
  it("is 10 minutes (not 24 hours)", () => {
    expect(OTP_TTL_MS).toBe(10 * 60 * 1000);
    expect(OTP_TTL_MS).toBeLessThan(60 * 60 * 1000);
  });
});
