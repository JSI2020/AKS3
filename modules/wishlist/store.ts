"use client";

import { useEffect, useState } from "react";

/**
 * Client-side wishlist. Kept in localStorage so a guest can build one without an
 * account; a small product snapshot is stored with each entry so the wishlist
 * page renders without a server round-trip. Changes broadcast on a window event
 * so every header badge, heart, and the wishlist page stay in sync in one tab.
 */

export type WishItem = {
  id: string;
  slug: string;
  name: string;
  garmentType?: string;
  priceMinor: number;
  thumbnailUrl?: string | null;
};

const KEY = "aks:wishlist";
const EVENT = "aks:wishlist-change";

function read(): WishItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WishItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: WishItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* private mode — ignore */
  }
  // Same-tab sync (the native `storage` event only fires in *other* tabs).
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function toggleWish(item: WishItem): boolean {
  const items = read();
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) {
    items.splice(idx, 1);
    write(items);
    return false;
  }
  write([item, ...items]);
  return true;
}

export function removeWish(id: string): void {
  write(read().filter((i) => i.id !== id));
}

/** Reactive list of wishlist items, kept in sync across the app. */
export function useWishlist(): WishItem[] {
  const [items, setItems] = useState<WishItem[]>([]);
  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync); // other tabs
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return items;
}

/** Reactive count, for the header badge. */
export function useWishCount(): number {
  return useWishlist().length;
}

/** Reactive "is this id saved", for a heart toggle. */
export function useIsWished(id: string): boolean {
  return useWishlist().some((i) => i.id === id);
}
