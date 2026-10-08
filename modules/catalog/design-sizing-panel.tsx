"use client";

import type { OverlayPlacements } from "@/modules/sizing/garment-size-guide";

import type { DesignSizeChartPublic } from "./resolve-design-size-chart";
import "./size-guide.css";

type Props = {
  chart: DesignSizeChartPublic | null;
  ghostUrl?: string | null;
  placements?: OverlayPlacements;
  availableSizeLabels: readonly string[];
  selectedSizeLabel: string | null;
  onSelectSize: (sizeLabel: string) => void;
  designName?: string;
  /** Opens the shared size-guide modal owned by the parent configurator. */
  onOpen: () => void;
};

/**
 * Storefront size guide trigger — opens the branded modal owned by
 * DesignConfigurator (single portal instance).
 */
export function DesignSizingPanel({
  chart,
  ghostUrl,
  onOpen,
}: Props) {
  const hasChart =
    Boolean(chart?.components.some((c) => c.rows.length > 0)) ||
    Boolean(ghostUrl);
  if (!hasChart) return null;

  return (
    <button
      type="button"
      className="aks-sg-trigger"
      onClick={onOpen}
    >
      <svg viewBox="0 0 24 24" aria-hidden>
        <path
          d="M3 8h18M3 8v8h18V8M7 8v3M11 8v4M15 8v3M19 8v4"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
      Size &amp; fit guide
    </button>
  );
}
