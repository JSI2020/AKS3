"use client";

import { useState } from "react";

import { Money } from "@/modules/ui";

import {
  computeDepositAmounts,
  getAvailablePaymentPlans,
  PAYMENT_POLICY_COPY,
  type PaymentPlan,
} from "./payment-plans";
import type { CheckoutDiscountPreview } from "./types";
import { DiscountCodeField } from "./discount-code-field";

type Props = {
  lines: { sizeMode: "STANDARD" | "MADE_TO_MEASURE" }[];
  subtotalMinor: number;
  shippingMinor?: number;
  selected: PaymentPlan | null;
  codDisabled?: boolean;
  discountCode: string;
  discountPreview: CheckoutDiscountPreview | null;
  onDiscountCodeChange: (value: string) => void;
  onDiscountApplied: (preview: CheckoutDiscountPreview | null) => void;
  onBack: () => void;
  onContinue: (plan: PaymentPlan) => void;
};

export function PaymentStep({
  lines,
  subtotalMinor,
  shippingMinor = 0,
  selected,
  codDisabled = false,
  discountCode,
  discountPreview,
  onDiscountCodeChange,
  onDiscountApplied,
  onBack,
  onContinue,
}: Props) {
  const options = getAvailablePaymentPlans(lines, { codDisabled });
  const defaultPlan =
    selected ??
    (options.length === 1 && !options[0]!.disabled ? options[0]!.plan : null);
  const [plan, setPlan] = useState<PaymentPlan | null>(defaultPlan);
  const [error, setError] = useState<string | null>(null);
  const effectiveTotalMinor =
    discountPreview?.totalMinor ?? subtotalMinor + shippingMinor;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!plan) {
      setError("Choose how you would like to pay.");
      return;
    }
    const option = options.find((o) => o.plan === plan);
    if (option?.disabled) {
      setError(option.disabledReason ?? "This payment option is not available.");
      return;
    }
    setError(null);
    onContinue(plan);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="font-display text-[20px] text-ink">Payment</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-ink/65">
          Soft launch is cash on delivery — pay the full amount when your order
          arrives.
        </p>
      </div>

      <p className="border border-greige-deep px-4 py-3 text-[14px] leading-relaxed text-ink/75">
        {PAYMENT_POLICY_COPY}
      </p>

      <fieldset className="space-y-3">
        <legend className="sr-only">Choose how to pay</legend>
        {options.map((option) => {
          const amounts = computeDepositAmounts({
            totalMinor: effectiveTotalMinor,
            plan: option.plan,
          });
          const checked = plan === option.plan;

          return (
            <label
              key={option.plan}
              className={
                option.disabled
                  ? "block cursor-not-allowed border border-greige-deep bg-greige-deep/20 px-4 py-4 opacity-60"
                  : checked
                    ? "block cursor-pointer border border-ink bg-greige px-4 py-4"
                    : "block cursor-pointer border border-greige-deep px-4 py-4"
              }
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="paymentPlan"
                  value={option.plan}
                  disabled={option.disabled}
                  checked={checked}
                  onChange={() => setPlan(option.plan)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[16px] text-ink">
                    {option.label}
                  </p>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink/70">
                    {option.description}
                  </p>
                  {!option.disabled ? (
                    <p className="mt-2 text-[13px] text-ink/60">
                      {amounts.depositAmountMinor > 0 ? (
                        <>
                          Pay now{" "}
                          <Money
                            value={amounts.depositAmountMinor}
                            className="inline"
                          />
                          {amounts.balanceAmountMinor > 0 ? (
                            <>
                              {" "}
                              · Balance{" "}
                              <Money
                                value={amounts.balanceAmountMinor}
                                className="inline"
                              />
                            </>
                          ) : null}
                        </>
                      ) : (
                        <>
                          Pay on delivery{" "}
                          <Money
                            value={amounts.balanceAmountMinor}
                            className="inline"
                          />
                        </>
                      )}
                    </p>
                  ) : (
                    <p className="mt-2 text-[13px] text-madder">
                      {option.disabledReason}
                    </p>
                  )}
                </div>
              </div>
            </label>
          );
        })}
      </fieldset>

      {plan ? (
        <DiscountCodeField
          code={discountCode}
          onCodeChange={onDiscountCodeChange}
          paymentPlan={plan}
          applied={discountPreview}
          onApplied={onDiscountApplied}
        />
      ) : null}

      {error ? (
        <p className="text-[14px] text-madder" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={onBack} className="btn-secondary">
          Back
        </button>
        <button type="submit" className="btn-primary">
          Review order
        </button>
      </div>
    </form>
  );
}
