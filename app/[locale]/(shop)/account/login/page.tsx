import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CustomerLoginForm } from "@/modules/account/customer-login-form";
import { storefrontAuthChannels } from "@/modules/auth/social-providers";
import { AksBrandLogo } from "@/modules/shop/shell/aks-brand-logo";
import { ShopPageContainer } from "@/modules/shop/shell/page-container";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

function oauthErrorMessage(
  error: string | undefined,
  t: (key: string) => string,
): string | null {
  if (!error) return null;
  switch (error) {
    case "AccessDenied":
      return t("errorOAuthAccessDenied");
    case "OAuthAccountNotLinked":
      return t("errorOAuthNotLinked");
    case "OAuthCallback":
    case "OAuthCreateAccount":
    case "OAuthSignIn":
    case "Callback":
    case "Configuration":
    case "Default":
      return t("errorOAuthGeneric");
    default:
      return t("errorOAuthGeneric");
  }
}

export default async function CustomerLoginPage({ searchParams }: Props) {
  const session = await auth();
  const t = await getTranslations("AccountLogin");
  const params = await searchParams;

  if (session?.user?.id) {
    redirect("/account/orders");
  }

  const channels = storefrontAuthChannels();
  const oauthError = oauthErrorMessage(params.error, t);

  return (
    <ShopPageContainer>
      <section className="auth-gate" aria-labelledby="auth-title">
        <div className="auth-gate-panel">
          <div className="auth-gate-brand">
            <AksBrandLogo variant="mark" className="auth-gate-mark" />
            <p className="auth-gate-eyebrow">{t("eyebrow")}</p>
            <h1 id="auth-title" className="auth-gate-title serif">
              {t("title")}
            </h1>
            <p className="auth-gate-lead">{t("lead")}</p>
          </div>

          <CustomerLoginForm
            redirectTo="/account/orders"
            channels={channels}
            initialError={oauthError}
          />
        </div>
      </section>
    </ShopPageContainer>
  );
}
