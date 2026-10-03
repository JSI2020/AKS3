"use client";

import type { OverlayPlacements } from "@/modules/sizing/garment-size-guide";
import { useState } from "react";

import { DesignSizeGuideModal } from "./design-size-guide-modal";
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
};

/**
 * Storefront size guide — an elegant branded popup rather than an inline
 * table. The button sits under the add-to-bag area; the modal shows every
 * piece's chart (Kameez, Trouser…).
 */
export function DesignSizingPanel({
  chart,
  ghostUrl,
  placements,
  availableSizeLabels,
  selectedSizeLabel,
  onSelectSize,
  designName,
}: Props) {
  const [open, setOpen] = useState(false);

  const hasChart =
    Boolean(chart?.components.some((c) => c.rows.length > 0)) || Boolean(ghostUrl);
  if (!hasChart) return null;

  return (
    <>
      <button
        type="button"
        className="aks-sg-trigger"
        onClick={() => setOpen(true)}
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

      <DesignSizeGuideModal
        open={open}
        onClose={() => setOpen(false)}
        chart={chart}
        ghostUrl={ghostUrl}
        placements={placements}
        availableSizeLabels={availableSizeLabels}
        selectedSizeLabel={selectedSizeLabel}
        onSelectSize={onSelectSize}
        designName={designName}
      />
    </>
  );
}
