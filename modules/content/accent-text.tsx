import type { ReactNode } from "react";
import { Fragment } from "react";

/**
 * House dash convention: an em-dash (—) always renders as a spaced en-dash
 * (word – word). Applied at render so stale copy in the DB — seeded before the
 * convention — matches without a data migration. Also folds a typed double
 * hyphen into the same mark.
 */
export function normalizeDashes(text: string): string {
  return text.replace(/\s*—\s*/g, " – ").replace(/ -- /g, " – ");
}

/**
 * Render admin headline with optional *italic* accent spans.
 * Plain segments stay inline (Fragment) so CSS `display:block` on wrapper
 * lines is not applied to every word fragment (which looked like stray dots).
 */
export function renderAccentText(text: string): ReactNode {
  const parts = normalizeDashes(text)
    .split(/(\*[^*]+\*)/g)
    .filter((p) => p.length > 0);
  return parts.map((part, i) => {
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
