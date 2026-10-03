"use client";

import type { OverlayPlacements } from "@/modules/sizing/garment-size-guide";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

import { DesignSizeGuideContent } from "./design-size-guide-content";
import type { DesignSizeChartPublic } from "./resolve-design-size-chart";
import "./size-guide.css";

type Props = {
  open: boolean;
  onClose: () => void;
  chart: DesignSizeChartPublic | null;
  ghostUrl?: string | null;
  placements?: OverlayPlacements;
  availableSizeLabels: readonly string[];
  selectedSizeLabel: string | null;
  onSelectSize: (sizeLabel: string) => void;
  /** Design name, shown as the subtitle. */
  designName?: string;
};

export function DesignSizeGuideModal({
  open,
  onClose,
  chart,
  ghostUrl,
  placements,
  availableSizeLabels,
  selectedSizeLabel,
  onSelectSize,
  designName,
}: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const pieceNames =
    chart?.components
      .filter((c) => c.rows.length > 0)
      .map((c) => c.componentName) ?? [];
  const subtitle =
    pieceNames.length > 0
      ? pieceNames.join(" · ")
      : (designName ?? "Finished garment measurements");

  const content = (
    <div
      className="shop-proto aks-sg-scrim"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="aks-sg-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="aks-sg-head">
          <div className="aks-sg-mark">
            AKS<span className="dot">&#183;</span>ATELIER
          </div>
          <div className="aks-sg-eyebrow">Minimalist luxury &#183; East meets West</div>
          <h2 id={titleId} className="aks-sg-title">
            Size &amp; Fit Guide
          </h2>
          <p className="aks-sg-sub">{subtitle}</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="aks-sg-close"
            aria-label="Close size guide"
          >
            &#215;
          </button>
        </div>

        <div className="aks-sg-body">
          <DesignSizeGuideContent
            chart={chart}
            ghostUrl={ghostUrl}
            placements={placements}
            availableSizeLabels={availableSizeLabels}
            selectedSizeLabel={selectedSizeLabel}
            onSelectSize={onSelectSize}
            showPieceNames
          />
          <p className="aks-sg-note">
            All measurements are of the finished garment, cut to standard sizes.
            Between sizes? We cut M unless you tell us otherwise.
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
