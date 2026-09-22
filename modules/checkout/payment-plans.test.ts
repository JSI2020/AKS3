import { describe, expect, it } from "vitest";

import {
  computeDepositAmounts,
  getAvailablePaymentPlans,
  isPaymentPlanAllowed,
} from "./payment-plans";

describe("payment plans", () => {
  it("soft launch offers full COD only (online flags off by default)", () => {
    const lines = [{ sizeMode: "STANDARD" as const }];
    const options = getAvailablePaymentPlans(lines);
    expect(options.map((o) => o.plan)).toEqual(["FULL_COD"]);
    expect(isPaymentPlanAllowed("FULL_COD", lines)).toBe(true);
    expect(isPaymentPlanAllowed("FULL_PREPAID", lines)).toBe(false);
    expect(isPaymentPlanAllowed("DEPOSIT_50_COD_50", lines)).toBe(false);
    expect(isPaymentPlanAllowed("DEPOSIT_70_COD_30", lines)).toBe(false);
  });

  it("disables COD when the customer is blocked", () => {
    const lines = [{ sizeMode: "STANDARD" as const }];
    const options = getAvailablePaymentPlans(lines, { codDisabled: true });
    expect(options.find((o) => o.plan === "FULL_COD")?.disabled).toBe(true);
    expect(isPaymentPlanAllowed("FULL_COD", lines, { codDisabled: true })).toBe(
      false,
    );
  });

  it("computes full COD and full prepaid in integer minor units", () => {
    expect(
      computeDepositAmounts({ totalMinor: 100_000, plan: "FULL_COD" }),
    ).toEqual({ depositAmountMinor: 0, balanceAmountMinor: 100_000 });

    expect(
      computeDepositAmounts({ totalMinor: 100_000, plan: "FULL_PREPAID" }),
    ).toEqual({ depositAmountMinor: 100_000, balanceAmountMinor: 0 });

    // Historical plans still compute for old orders
    expect(
      computeDepositAmounts({ totalMinor: 100_000, plan: "DEPOSIT_50_COD_50" }),
    ).toEqual({ depositAmountMinor: 50_000, balanceAmountMinor: 50_000 });
  });
});
