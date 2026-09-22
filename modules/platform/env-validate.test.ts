import { afterEach, describe, expect, it } from "vitest";

import { __envValidateTest, validateEnv } from "@/lib/env-validate";

describe("validateEnv production requirements", () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevDb = process.env.DATABASE_URL;
  const prevResendKey = process.env.RESEND_API_KEY;
  const prevResendFrom = process.env.RESEND_FROM_EMAIL;
  const prevAuth = process.env.AUTH_SECRET;
  const prevTotp = process.env.TWO_FACTOR_ENCRYPTION_KEY;

  afterEach(() => {
    process.env.NODE_ENV = prevNodeEnv;
    process.env.DATABASE_URL = prevDb;
    process.env.RESEND_API_KEY = prevResendKey;
    process.env.RESEND_FROM_EMAIL = prevResendFrom;
    process.env.AUTH_SECRET = prevAuth;
    process.env.TWO_FACTOR_ENCRYPTION_KEY = prevTotp;
  });

  it("lists AUTH_SECRET and TWO_FACTOR_ENCRYPTION_KEY as prod-required", () => {
    expect(__envValidateTest.PROD_REQUIRED).toContain("AUTH_SECRET");
    expect(__envValidateTest.PROD_REQUIRED).toContain(
      "TWO_FACTOR_ENCRYPTION_KEY",
    );
    expect(__envValidateTest.PROD_RECOMMENDED).not.toContain("AUTH_SECRET");
  });

  it("throws in production when AUTH_SECRET is missing", () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://x";
    process.env.RESEND_API_KEY = "re_x";
    process.env.RESEND_FROM_EMAIL = "AKS <a@b.c>";
    delete process.env.AUTH_SECRET;
    process.env.TWO_FACTOR_ENCRYPTION_KEY =
      "dGVzdC1rZXktMzItYnl0ZXMtZXhhY3Qh";
    expect(() => validateEnv()).toThrow(/AUTH_SECRET/);
  });

  it("throws in production when TWO_FACTOR_ENCRYPTION_KEY is missing", () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://x";
    process.env.RESEND_API_KEY = "re_x";
    process.env.RESEND_FROM_EMAIL = "AKS <a@b.c>";
    process.env.AUTH_SECRET = "secret";
    delete process.env.TWO_FACTOR_ENCRYPTION_KEY;
    expect(() => validateEnv()).toThrow(/TWO_FACTOR_ENCRYPTION_KEY/);
  });
});
