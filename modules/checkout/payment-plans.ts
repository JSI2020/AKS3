import type { PakistanProvince } from "@aks/db";

import { isOnlinePrepaidEnabled } from "@/modules/payments/methods-config";

export type PaymentPlan =
  | "FULL_COD"
  | "FULL_PREPAID"
  /** @deprecated Historical orders only — not offered at checkout. */
  | "DEPOSIT_50_COD_50"
  /** @deprecated Historical orders only — not offered at checkout. */
  | "DEPOSIT_70_COD_30";

export type CartLineForPlan = {
  sizeMode: "STANDARD" | "MADE_TO_MEASURE";
};

export type PaymentPlanOption = {
  plan: PaymentPlan;
  label: string;
  description: string;
  /** 0 = full COD; 100 = pay online in full. */
  depositPercent: number;
  disabled: boolean;
  disabledReason?: string;
};

export function cartHasMadeToMeasure(lines: CartLineForPlan[]): boolean {
  return lines.some((line) => line.sizeMode === "MADE_TO_MEASURE");
}

/**
 * Soft launch: full COD only.
 * Online full prepaid appears when any AKS_PAY_* method flag is on.
 * 50/30 deposit plans are retired for new checkouts.
 */
export function getAvailablePaymentPlans(
  _lines: CartLineForPlan[],
  options?: { codDisabled?: boolean },
): PaymentPlanOption[] {
  const codDisabled = options?.codDisabled ?? false;
  const onlineEnabled = isOnlinePrepaidEnabled();

  const plans: PaymentPlanOption[] = [
    {
      plan: "FULL_COD",
      label: "Cash on delivery",
      description:
        "Pay the full amount in cash when your order arrives. Nothing to pay online now.",
      depositPercent: 0,
      disabled: codDisabled,
      disabledReason: codDisabled
        ? "Cash on delivery is not available on your account — pay online in full for your next order."
        : undefined,
    },
  ];

  if (onlineEnabled) {
    plans.push({
      plan: "FULL_PREPAID",
      label: "Pay online in full",
      description:
        "Pay the full amount now by bank transfer, Raast, JazzCash, or EasyPaisa — whichever methods are switched on.",
      depositPercent: 100,
      disabled: false,
    });
  }

  return plans;
}

export function isPaymentPlanAllowed(
  plan: PaymentPlan,
  _lines: CartLineForPlan[],
  options?: { codDisabled?: boolean },
): boolean {
  if (plan === "DEPOSIT_50_COD_50" || plan === "DEPOSIT_70_COD_30") {
    return false;
  }
  if (plan === "FULL_COD") {
    return !(options?.codDisabled ?? false);
  }
  if (plan === "FULL_PREPAID") {
    return isOnlinePrepaidEnabled();
  }
  return false;
}

export function computeDepositAmounts(input: {
  totalMinor: number;
  plan: PaymentPlan;
}): { depositAmountMinor: number; balanceAmountMinor: number } {
  const { totalMinor, plan } = input;

  let depositPercent: number;
  switch (plan) {
    case "FULL_COD":
      depositPercent = 0;
      break;
    case "FULL_PREPAID":
      depositPercent = 100;
      break;
    case "DEPOSIT_50_COD_50":
      depositPercent = 50;
      break;
    case "DEPOSIT_70_COD_30":
      depositPercent = 70;
      break;
    default:
      depositPercent = 0;
  }

  const depositAmountMinor = Math.round((totalMinor * depositPercent) / 100);
  const balanceAmountMinor = totalMinor - depositAmountMinor;

  return { depositAmountMinor, balanceAmountMinor };
}

export const PAYMENT_POLICY_COPY =
  "Soft launch: pay in full on delivery. Online payment methods will open later — bank transfer, Raast, JazzCash, and EasyPaisa.";

/** @deprecated Use PAYMENT_POLICY_COPY */
export const DEPOSIT_POLICY_COPY = PAYMENT_POLICY_COPY;

export const PAKISTAN_PROVINCES: {
  value: PakistanProvince;
  label: string;
}[] = [
  { value: "PUNJAB", label: "Punjab" },
  { value: "SINDH", label: "Sindh" },
  { value: "KPK", label: "KPK" },
  { value: "BALOCHISTAN", label: "Balochistan" },
  { value: "GILGIT_BALTISTAN", label: "Gilgit-Baltistan" },
  { value: "AJK", label: "AJK" },
  { value: "ICT", label: "ICT" },
];

export function provinceLabel(province: PakistanProvince): string {
  return PAKISTAN_PROVINCES.find((p) => p.value === province)?.label ?? province;
}
