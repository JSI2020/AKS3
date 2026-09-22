import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Link, redirect } from "@/i18n/routing";
import { BankTransferPayForm } from "@/modules/checkout/bank-transfer-pay-form";
import { SafepayPayForm } from "@/modules/checkout/safepay-pay-form";
import { readBankTransferConfigOrNull } from "@/modules/payments/bank-transfer/config";
import { getOrderForBankTransfer } from "@/modules/payments/bank-transfer/queries";
import { readSafepayConfigOrNull } from "@/modules/payments/config";
import {
  isPaymentMethodEnabled,
  isOnlinePrepaidEnabled,
} from "@/modules/payments/methods-config";
import { ShopPageContainer } from "@/modules/shop/shell/page-container";
import { Money } from "@/modules/ui";

type Props = {
  searchParams: Promise<{ order?: string }>;
};

export default async function CheckoutPayPage({ searchParams }: Props) {
  const params = await searchParams;
  const orderNumber = params.order?.trim() ?? "";

  if (!orderNumber) {
    const locale = await getLocale();
    redirect({ href: "/", locale });
  }

  if (!isOnlinePrepaidEnabled()) {
    const locale = await getLocale();
    redirect({
      href: `/checkout/confirmation?order=${encodeURIComponent(orderNumber)}`,
      locale,
    });
  }

  const order = await getOrderForBankTransfer(orderNumber);
  if (!order) {
    notFound();
  }

  const showBank =
    isPaymentMethodEnabled("BANK_TRANSFER") &&
    Boolean(readBankTransferConfigOrNull());
  const bank = showBank ? readBankTransferConfigOrNull() : null;
  const showSafepay =
    isPaymentMethodEnabled("SAFEPAY") && Boolean(readSafepayConfigOrNull());
  const showJazzCash = isPaymentMethodEnabled("JAZZCASH");
  const showEasyPaisa = isPaymentMethodEnabled("EASYPAISA");
  const defaultPhone = order.guestPhone || order.whatsappNumber || "";

  return (
    <ShopPageContainer>
      <div className="mx-auto max-w-[640px] py-12">
        <Link
          href={`/checkout/confirmation?order=${encodeURIComponent(orderNumber)}`}
          className="text-[12px] uppercase tracking-[0.08em] text-ink/55"
        >
          Back to confirmation
        </Link>
        <h1 className="mt-4 font-display text-[28px] font-medium text-ink">
          Pay online
        </h1>
        <p className="mt-3 text-[16px] leading-relaxed text-ink/75">
          Order {orderNumber} —{" "}
          <Money value={order.depositAmountMinor} className="text-ink" /> due
          now.
        </p>

        {order.status !== "AWAITING_DEPOSIT" ? (
          <p className="mt-8 text-[15px] leading-relaxed text-ink/75">
            This order is no longer waiting for online payment. Contact us on
            WhatsApp if you need help.
          </p>
        ) : (
          <div className="mt-10 space-y-10">
            {showSafepay ? (
              <section>
                <h2 className="text-[12px] uppercase tracking-[0.08em] text-ink/55">
                  Pay with Raast
                </h2>
                <div className="mt-4">
                  <SafepayPayForm
                    orderNumber={order.orderNumber}
                    depositAmountMinor={order.depositAmountMinor}
                    defaultPhone={defaultPhone}
                    orderStatus={order.status}
                    alreadyPending={order.hasSafepayPending}
                  />
                </div>
              </section>
            ) : null}

            {showJazzCash ? (
              <section className="border border-greige-deep px-4 py-4">
                <h2 className="text-[12px] uppercase tracking-[0.08em] text-ink/55">
                  JazzCash
                </h2>
                <p className="mt-2 text-[14px] text-ink/70">
                  JazzCash checkout is switched on but the merchant adapter is
                  still being finished. Use another method, or contact the
                  studio.
                </p>
              </section>
            ) : null}

            {showEasyPaisa ? (
              <section className="border border-greige-deep px-4 py-4">
                <h2 className="text-[12px] uppercase tracking-[0.08em] text-ink/55">
                  EasyPaisa
                </h2>
                <p className="mt-2 text-[14px] text-ink/70">
                  EasyPaisa checkout is switched on but the merchant adapter is
                  still being finished. Use another method, or contact the
                  studio.
                </p>
              </section>
            ) : null}

            {showBank && bank ? (
              <section>
                <h2 className="text-[12px] uppercase tracking-[0.08em] text-ink/55">
                  Pay by bank transfer
                </h2>
                <div className="mt-4">
                  <BankTransferPayForm
                    order={{
                      orderNumber: order.orderNumber,
                      depositAmountMinor: order.depositAmountMinor,
                      hasPendingVerification: order.hasPendingVerification,
                      status: order.status,
                    }}
                    bank={bank}
                  />
                </div>
              </section>
            ) : null}

            {!showSafepay && !showBank && !showJazzCash && !showEasyPaisa ? (
              <p className="border border-madder/40 bg-madder/5 px-4 py-3 text-[14px] text-ink">
                No online payment methods are configured. Contact the studio to
                complete payment.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </ShopPageContainer>
  );
}
