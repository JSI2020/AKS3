import { PaymentProviderError, type PaymentProvider } from "../../types";

/**
 * EasyPaisa mobile-account / OTC checkout — scaffold only.
 * Enable with AKS_PAY_EASYPAISA=1 + merchant credentials when ready.
 */
export function createEasyPaisaProvider(): PaymentProvider {
  return {
    name: "EASYPAISA",
    async createCheckout() {
      throw new PaymentProviderError(
        "EasyPaisa is not enabled yet. Set AKS_PAY_EASYPAISA=1 and merchant credentials.",
        "NOT_ENABLED",
      );
    },
    verifyWebhook() {
      throw new PaymentProviderError(
        "EasyPaisa webhooks are not wired yet.",
        "NOT_ENABLED",
      );
    },
    async refund() {
      throw new PaymentProviderError(
        "EasyPaisa refunds are not wired yet.",
        "NOT_ENABLED",
      );
    },
    async getStatus() {
      throw new PaymentProviderError(
        "EasyPaisa status inquiry is not wired yet.",
        "NOT_ENABLED",
      );
    },
  };
}
