/**
 * Online payment method flags — all off for first launch (COD only).
 * Flip env to "1" when merchant credentials are ready.
 */

export type OnlinePaymentMethod =
  | "BANK_TRANSFER"
  | "SAFEPAY"
  | "JAZZCASH"
  | "EASYPAISA";

function flagOn(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

export function isPaymentMethodEnabled(method: OnlinePaymentMethod): boolean {
  switch (method) {
    case "BANK_TRANSFER":
      return flagOn("AKS_PAY_BANK_TRANSFER");
    case "SAFEPAY":
      return flagOn("AKS_PAY_SAFEPAY");
    case "JAZZCASH":
      return flagOn("AKS_PAY_JAZZCASH");
    case "EASYPAISA":
      return flagOn("AKS_PAY_EASYPAISA");
    default:
      return false;
  }
}

/** True when any online prepaid rail is switched on for checkout. */
export function isOnlinePrepaidEnabled(): boolean {
  return (
    isPaymentMethodEnabled("BANK_TRANSFER") ||
    isPaymentMethodEnabled("SAFEPAY") ||
    isPaymentMethodEnabled("JAZZCASH") ||
    isPaymentMethodEnabled("EASYPAISA")
  );
}

export function listEnabledOnlineMethods(): OnlinePaymentMethod[] {
  return (
    ["BANK_TRANSFER", "SAFEPAY", "JAZZCASH", "EASYPAISA"] as const
  ).filter(isPaymentMethodEnabled);
}
