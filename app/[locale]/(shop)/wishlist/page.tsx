import { setRequestLocale } from "next-intl/server";

import { WishlistPageView } from "@/modules/wishlist/wishlist-page-view";
import { ShopPageContainer } from "@/modules/shop/shell/page-container";

export default async function WishlistPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <ShopPageContainer>
      <WishlistPageView />
    </ShopPageContainer>
  );
}
