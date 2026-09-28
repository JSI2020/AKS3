"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a whole number from 0 → value once on mount. The initial render is
 * the real value (so SSR, no-JS and reduced-motion all show the true figure
 * immediately — never a stuck 0), then the effect replays it as a quick
 * count-up when motion is allowed.
 */
export function CountUp({
  value,
  className,
  durationMs = 850,
}: {
  value: number;
  className?: string;
  durationMs?: number;
}) {
  const [display, setDisplay] = useState(value);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      value <= 0
    ) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    const start = performance.now();
    setDisplay(0);
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return <span className={className}>{display}</span>;
}
