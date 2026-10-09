"use client";

import { useEffect, useMemo, useState } from "react";

import { Link } from "@/i18n/routing";
import type { AnnouncementPublic } from "@/modules/content/types";

/** Phones: a "A · B" announcement rotates as A, then B, so it fits one line. */
const NARROW_QUERY = "(max-width: 600px)";

function splitForNarrow(items: AnnouncementPublic[]): AnnouncementPublic[] {
  return items.flatMap((item) => {
    const parts = item.message
      .split(/\s+·\s+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length <= 1) return [item];
    return parts.map((message, i) => ({ ...item, id: `${item.id}-${i}`, message }));
  });
}

export function AnnouncementTicker({
  items: sourceItems,
}: {
  items: AnnouncementPublic[];
}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [narrow, setNarrow] = useState(false);

  // Decided after mount (server render = full messages) to keep hydration stable.
  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const items = useMemo(
    () => (narrow ? splitForNarrow(sourceItems) : sourceItems),
    [narrow, sourceItems],
  );

  useEffect(() => {
    setIndex(0);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = window.setInterval(() => {
      setPhase("out");
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % items.length);
        setPhase("in");
      }, 320);
    }, 4800);
    return () => window.clearInterval(id);
  }, [items.length]);

  if (items.length === 0) return null;
  const current = items[index] ?? items[0]!;

  const inner = (
    <span
      className={`ticker-msg ticker-msg--${phase}`}
      key={`${current.id}-${index}`}
    >
      {current.message}
    </span>
  );

  return (
    <div className="announcement-ticker" role="status" aria-live="polite">
      <div className="ticker-track">
        {current.href ? (
          current.href.startsWith("http") ? (
            <a href={current.href} rel="noreferrer" target="_blank">
              {inner}
            </a>
          ) : (
            <Link href={current.href as "/collections"}>{inner}</Link>
          )
        ) : (
          inner
        )}
      </div>
      {items.length > 1 ? (
        <div className="ticker-dots" aria-hidden>
          {items.map((item, i) => (
            <span
              key={item.id}
              className={i === index ? "ticker-dot ticker-dot--on" : "ticker-dot"}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
