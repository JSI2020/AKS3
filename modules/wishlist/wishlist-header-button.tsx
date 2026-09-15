"use client";

import { Link } from "@/i18n/routing";

import { useWishCount } from "./store";

/** Header heart with a live saved-count badge, matching the bag icon button. */
export function WishlistHeaderButton({ label }: { label: string }) {
  const count = useWishCount();
  return (
    <Link href={"/wishlist" as "/"} className="icobtn wishlist" aria-label={label}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <use href="#ic-heart" />
      </svg>
      <span className={`count${count > 0 ? " show" : ""}`}>{count}</span>
    </Link>
  );
}
