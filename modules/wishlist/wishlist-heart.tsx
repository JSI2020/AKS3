"use client";

import { useIsWished, toggleWish, type WishItem } from "./store";

/**
 * Save/remove heart for product cards and the PDP. Filled when saved. Stops the
 * click from bubbling so it never triggers the card's own navigation.
 */
export function WishlistHeart({
  item,
  className = "",
}: {
  item: WishItem;
  className?: string;
}) {
  const wished = useIsWished(item.id);
  return (
    <button
      type="button"
      className={`wish-heart${wished ? " on" : ""} ${className}`}
      aria-pressed={wished}
      aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWish(item);
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <use href="#ic-heart" />
      </svg>
    </button>
  );
}
