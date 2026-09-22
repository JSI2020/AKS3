import { describe, expect, it } from "vitest";

import { quoteShipping } from "./shipping";

describe("quoteShipping", () => {
  it("defaults free Pakistan shipping to 0 with promise label", () => {
    const quote = quoteShipping({
      shippingMode: "FREE_PAKISTAN",
      shippingFlatMinor: 50_000,
      shippingPromise: "Free shipping within Pakistan",
    });
    expect(quote.shippingMinor).toBe(0);
    expect(quote.label).toBe("Free shipping within Pakistan");
  });

  it("charges flat fee in paisa when mode is FLAT_PAKISTAN", () => {
    const quote = quoteShipping({
      shippingMode: "FLAT_PAKISTAN",
      shippingFlatMinor: 35_000,
      shippingPromise: "Free shipping within Pakistan",
    });
    expect(quote.shippingMinor).toBe(35_000);
    expect(quote.label).toBe("Shipping within Pakistan");
  });
});
