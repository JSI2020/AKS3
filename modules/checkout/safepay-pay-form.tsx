"use client";

import { useState, useTransition } from "react";

import { Money } from "@/modules/ui";
import { startSafepayDepositAction } from "@/modules/payments/safepay/start-deposit";

type Props = {
  orderNumber: string;
  depositAmountMinor: number;
  defaultPhone?: string | null;
  orderStatus: string;
  alreadyPending?: boolean;
};

export function SafepayPayForm({
  orderNumber,
  depositAmountMinor,
  defaultPhone,
  orderStatus,
  alreadyPending = false,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(alreadyPending);

  if (orderStatus !== "AWAITING_DEPOSIT") {
    return null;
  }

  if (sent) {
    return (
      <div className="border border-greige-deep px-4 py-4">
        <p className="font-display text-[18px] text-ink">Raast request sent</p>
        <p className="mt-2 text-[14px] leading-relaxed text-ink/70">
          Open your banking app and approve the payment request for{" "}
          <Money value={depositAmountMinor} className="text-ink" />. This page
          will update once Safepay confirms — usually within a minute.
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await startSafepayDepositAction({
            orderNumber,
            raastPhone: phone,
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setSent(true);
        });
      }}
    >
      <p className="text-[14px] leading-relaxed text-ink/70">
        We send a Raast request to your phone — approve it in your bank app. No
        card form on this site.
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] uppercase tracking-[0.08em] text-ink/55">
          Raast mobile number
        </span>
        <input
          type="tel"
          name="raastPhone"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="03XX XXXXXXX"
          className="border border-greige-deep bg-transparent px-3 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
        />
      </label>
      <div className="flex items-center justify-between gap-4 text-[14px]">
        <span className="text-ink/55">Amount</span>
        <Money value={depositAmountMinor} className="text-ink" />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-ink px-4 py-3 text-[12px] uppercase tracking-[0.08em] text-greige disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send Raast request"}
      </button>
      {error ? (
        <p className="text-[14px] text-madder" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
