"use client";

import type { OverlayPlacements } from "@/modules/sizing/garment-size-guide";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { AksBrandLogo } from "@/modules/shop/shell/aks-brand-logo";

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
  const [mounted, setMounted] = useState(false);
  /** Ignore the same user gesture that opened the modal (scrim under cursor). */
  const armedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      armedRef.current = false;
      return;
    }
    armedRef.current = false;
    const arm = window.setTimeout(() => {
      armedRef.current = true;
      closeRef.current?.focus();
    }, 50);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(arm);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const pieceNames =
    chart?.components
      .filter((c) => c.rows.length > 0)
      .map((c) => c.componentName) ?? [];
  const subtitle =
    pieceNames.length > 0
      ? pieceNames.join(" · ")
      : (designName ?? "Finished garment measurements");

  function handleScrimClick() {
    if (!armedRef.current) return;
    onClose();
  }

  return createPortal(
    <div
      className="shop-proto aks-sg-scrim"
      role="presentation"
      onClick={handleScrimClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="aks-sg-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="aks-sg-head">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="aks-sg-close"
            aria-label="Close size guide"
          >
            &#215;
          </button>
          <AksBrandLogo variant="full" className="aks-sg-logo" />
          <h2 id={titleId} className="aks-sg-title">
            Size Guide
          </h2>
          <p className="aks-sg-sub">{subtitle}</p>
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
        </div>
      </div>
    </div>,
    document.body,
  );
}
