import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/routing";
import { auth } from "@/auth";
import { getOrSetAnonToken } from "@/modules/measure/anon-cookie";
import { loadActiveCart } from "@/modules/cart/queries";
import { CheckoutFlow, getCheckoutCodStatus, getCheckoutShippingQuote } from "@/modules/checkout";
import { ShopPageContainer } from "@/modules/shop/shell/page-container";

export default async function CheckoutPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const anonId = await getOrSetAnonToken();
  const cart = await loadActiveCart({ userId, anonId });

  if (cart.lines.length === 0) {
    const locale = await getLocale();
    redirect({ href: "/", locale });
  }

  const [codStatus, shipping] = await Promise.all([
    getCheckoutCodStatus(),
    getCheckoutShippingQuote(),
  ]);

  return (
    <ShopPageContainer>
      <div className="py-8 md:py-12">
        <CheckoutFlow
          cart={cart}
          isSignedIn={Boolean(userId)}
          codDisabled={codStatus.codDisabled}
          shippingMinor={shipping.shippingMinor}
          shippingLabel={shipping.label}
        />
      </div>
    </ShopPageContainer>
  );
}
