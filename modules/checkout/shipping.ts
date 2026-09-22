import type { SiteSettingsPublic } from "@/modules/content/types";

export type ShippingQuote = {
  shippingMinor: number;
  /** Short line for checkout totals, e.g. "Free within Pakistan". */
  label: string;
};

/**
 * Soft-launch shipping: Pakistan addresses only (checkout already requires a
 * Pakistan province). Fee comes from storefront settings — free by default,
 * or a flat fee in paisa — so the zero is an explicit promise, not a stub.
 */
export function quoteShipping(
  settings: Pick<
    SiteSettingsPublic,
    "shippingMode" | "shippingFlatMinor" | "shippingPromise"
  >,
): ShippingQuote {
  const promise =
    settings.shippingPromise?.trim() || "Free shipping within Pakistan";

  if (settings.shippingMode === "FLAT_PAKISTAN") {
    const flat = Math.max(0, Math.trunc(settings.shippingFlatMinor ?? 0));
    return {
      shippingMinor: flat,
      label: flat === 0 ? promise : "Shipping within Pakistan",
    };
  }

  return { shippingMinor: 0, label: promise };
}
