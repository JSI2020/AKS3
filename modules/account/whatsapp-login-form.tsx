"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/routing";

import { WhatsAppChannelIcon } from "./auth-channel-icons";

type Step = "phone" | "code";

export function WhatsappLoginForm({ redirectTo }: { redirectTo: string }) {
  const t = useTranslations("AccountLogin");
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function requestCode() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/auth/customer/whatsapp/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        detail?: string;
        devCode?: string;
      };
      if (!res.ok) {
        const detail = data.detail?.trim();
        setError(
          detail && process.env.NODE_ENV !== "production"
            ? `${data.error ?? t("errorSendCode")} (${detail})`
            : (data.error ?? t("errorSendCode")),
        );
        return;
      }
      setMessage(
        data.devCode
          ? t("devCodeFilled")
          : (data.message ?? t("checkWhatsapp")),
      );
      if (data.devCode) setCode(data.devCode);
      setStep("code");
    });
  }

  function verify() {
    setError(null);
    startTransition(async () => {
      const result = await signIn("customer-whatsapp", {
        phone,
        otp: code,
        redirect: false,
      });
      if (!result || result.error) {
        setError(t("errorBadCode"));
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    });
  }

  return (
    <div className="auth-form">
      <form
        className="auth-fields"
        onSubmit={(e) => {
          e.preventDefault();
          if (step === "phone") requestCode();
          else verify();
        }}
      >
        <div className="auth-field">
          <label htmlFor="wa-phone">{t("phoneLabel")}</label>
          <div className="auth-input-wrap">
            <WhatsAppChannelIcon className="auth-input-icon" />
            <input
              id="wa-phone"
              type="tel"
              autoComplete="tel"
              required
              disabled={step !== "phone" || pending}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("whatsappPlaceholder")}
            />
          </div>
          <p className="auth-hint">{t("phoneHint")}</p>
        </div>

        {step === "code" ? (
          <div className="auth-field">
            <label htmlFor="wa-code">{t("codeLabel")}</label>
            <input
              id="wa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              disabled={pending}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="auth-code"
            />
          </div>
        ) : null}

        {message ? <p className="auth-message">{message}</p> : null}
        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className="btn-primary">
          {pending
            ? t("pleaseWait")
            : step === "phone"
              ? t("whatsappCode")
              : t("continue")}
        </button>

        {step === "code" ? (
          <button
            type="button"
            className="auth-back"
            onClick={() => {
              setStep("phone");
              setCode("");
              setError(null);
              setMessage(null);
            }}
          >
            {t("differentPhone")}
          </button>
        ) : null}
      </form>

      <p className="auth-footnote">
        <Link href="/account/login">{t("backToSignIn")}</Link>
      </p>
    </div>
  );
}
