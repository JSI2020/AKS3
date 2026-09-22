import { PaymentProviderError, type PaymentProvider } from "../../types";

/**
 * JazzCash hosted / wallet checkout — scaffold only.
 * Enable with AKS_PAY_JAZZCASH=1 + merchant credentials when ready.
 */
export function createJazzCashProvider(): PaymentProvider {
  return {
    name: "JAZZCASH",
    async createCheckout() {
      throw new PaymentProviderError(
        "JazzCash is not enabled yet. Set AKS_PAY_JAZZCASH=1 and merchant credentials.",
        "NOT_ENABLED",
      );
    },
    verifyWebhook() {
      throw new PaymentProviderError(
        "JazzCash webhooks are not wired yet.",
        "NOT_ENABLED",
      );
    },
    async refund() {
      throw new PaymentProviderError(
        "JazzCash refunds are not wired yet.",
        "NOT_ENABLED",
      );
    },
    async getStatus() {
      throw new PaymentProviderError(
        "JazzCash status inquiry is not wired yet.",
        "NOT_ENABLED",
      );
    },
  };
}
