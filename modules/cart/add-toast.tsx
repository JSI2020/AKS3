"use client";

import { useEffect, useState } from "react";

import { useCart } from "./cart-context";

/**
 * Fixed bottom-end toast after successful add-to-cart (prototype C).
 * Suppressed while the cart drawer is open — the drawer already shows the new
 * line, and the toast would sit on top of its checkout button.
 */
export function AddToCartToast() {
  const { lastAddedName, clearLastAdded, openDrawer, drawerOpen } = useCart();
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!lastAddedName) return;
    if (drawerOpen) {
      setVisible(false);
      clearLastAdded();
      return;
    }

    setText(lastAddedName);
    setVisible(true);

    const hide = window.setTimeout(() => {
      setVisible(false);
      clearLastAdded();
    }, 2600);

    return () => window.clearTimeout(hide);
  }, [lastAddedName, clearLastAdded, drawerOpen]);

  return (
    <div
      className={`toast${visible ? " show" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="g">Added</span>
      <span>{text}</span>
      <button
        type="button"
        className="toast-bag"
        tabIndex={visible ? 0 : -1}
        onClick={() => {
          openDrawer();
          setVisible(false);
          clearLastAdded();
        }}
      >
        View bag
      </button>
    </div>
  );
}
