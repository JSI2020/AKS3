"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

import type { ProductionBoardCard, StaffOption } from "../queries";
import {
  REWORK_FAULT_ATTRIBUTIONS,
  type ReworkFaultAttribution,
} from "../constants";

type ProductionCardProps = {
  card: ProductionBoardCard;
  staff: StaffOption[];
  onAssign: (jobId: string, staffId: string | null) => Promise<void>;
  onStart?: (jobId: string) => Promise<void>;
  onBlock?: (jobId: string, reason: string) => Promise<void>;
  onQcPass?: (jobId: string) => Promise<void>;
  onQcFail?: (
    jobId: string,
    fault: ReworkFaultAttribution,
    reason: string,
  ) => Promise<void>;
  dragging?: boolean;
  showStart?: boolean;
};

export function ProductionCard({
  card,
  staff,
  onAssign,
  onStart,
  onBlock,
  onQcPass,
  onQcFail,
  dragging = false,
  showStart = false,
}: ProductionCardProps) {
  const daysLabel =
    card.daysToShip === null
      ? "—"
      : card.daysToShip < 0
        ? `${Math.abs(card.daysToShip)}d late`
        : `${card.daysToShip}d`;

  const canBlock =
    Boolean(onBlock) &&
    card.status !== "BLOCKED" &&
    card.status !== "DONE";

  const canQc =
    card.stage === "QC" &&
    card.status !== "BLOCKED" &&
    Boolean(onQcPass) &&
    Boolean(onQcFail);

  return (
    <article
      className={cn(
        "border bg-indigo p-2 touch-manipulation select-none",
        card.atRisk ? "border-madder bg-madder/10" : "border-chalk/30",
        card.status === "BLOCKED" && "border-madder",
        dragging && "opacity-80",
      )}
    >
      <div className="flex gap-2">
        {card.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.thumbnailUrl}
            alt=""
            className="size-12 shrink-0 border border-chalk/20 object-cover"
          />
        ) : (
          <div className="size-12 shrink-0 border border-chalk/20 bg-indigo-lift" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[12px] text-greige">
            {card.orderId ? (
              <Link
                href={`/admin/orders/${card.orderId}`}
                className="text-greige hover:text-zari"
                onPointerDown={(e) => e.stopPropagation()}
              >
                {card.orderNumber}
              </Link>
            ) : (
              card.orderNumber
            )}
          </p>
          <p className="truncate text-[13px] text-greige">{card.customerFirstName}</p>
          <p className="truncate text-[11px] text-chalk">
            {card.designId ? (
              <Link
                href={`/admin/designs/${card.designId}`}
                className="text-chalk hover:text-zari"
                onPointerDown={(e) => e.stopPropagation()}
              >
                {card.designName}
              </Link>
            ) : (
              card.designName
            )}
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
        <Link
          href={`/admin/production/${card.id}/spec`}
          className="border border-zari/60 px-1.5 py-0.5 font-mono uppercase tracking-wide text-zari hover:border-zari hover:text-greige"
          onPointerDown={(e) => e.stopPropagation()}
        >
          Spec
        </Link>
        <span className="border border-chalk/30 px-1.5 py-0.5 font-mono uppercase tracking-wide text-chalk">
          {card.sizeModeLabel}
        </span>
        <span
          className={cn(
            "font-mono",
            card.atRisk ? "text-madder" : "text-chalk",
          )}
        >
          {daysLabel}
        </span>
        {card.status === "BLOCKED" ? (
          <span className="text-madder">Blocked</span>
        ) : card.status === "PENDING" ? (
          <span className="text-chalk">Queued</span>
        ) : null}
      </div>

      <label className="mt-2 block text-[10px] uppercase tracking-[0.1em] text-chalk">
        Karigar
        <select
          className="mt-0.5 w-full border border-chalk/30 bg-indigo px-1.5 py-1 text-[12px] text-greige"
          value={card.assignedToId ?? ""}
          onChange={(e) => {
            void onAssign(card.id, e.target.value || null);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <option value="">Unassigned</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      {(showStart || canBlock || canQc) && (
        <div
          className="mt-2 flex flex-wrap gap-1.5"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {showStart && onStart ? (
            <button
              type="button"
              className="border border-zari/60 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-zari hover:border-zari hover:text-greige"
              onClick={() => {
                void onStart(card.id);
              }}
            >
              Start
            </button>
          ) : null}
          {canBlock ? (
            <button
              type="button"
              className="border border-madder/60 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-madder hover:border-madder"
              onClick={() => {
                const reason = window.prompt("Blocked reason?");
                if (!reason?.trim() || !onBlock) return;
                void onBlock(card.id, reason.trim());
              }}
            >
              Block
            </button>
          ) : null}
          {canQc ? (
            <>
              <button
                type="button"
                className="border border-zari/60 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-zari hover:border-zari hover:text-greige"
                onClick={() => {
                  if (!onQcPass) return;
                  void onQcPass(card.id);
                }}
              >
                QC Pass
              </button>
              <button
                type="button"
                className="border border-madder/60 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-madder hover:border-madder"
                onClick={() => {
                  if (!onQcFail) return;
                  const faultRaw =
                    window.prompt(
                      `Fault attribution (${REWORK_FAULT_ATTRIBUTIONS.join(" | ")})`,
                      "UNDETERMINED",
                    ) ?? "";
                  const fault = REWORK_FAULT_ATTRIBUTIONS.find(
                    (f) => f === faultRaw.trim(),
                  );
                  if (!fault) {
                    window.alert("Invalid fault attribution.");
                    return;
                  }
                  const reason =
                    window.prompt("Rework reason?", "QC failed")?.trim() ||
                    "QC failed";
                  void onQcFail(card.id, fault, reason);
                }}
              >
                QC Fail
              </button>
            </>
          ) : null}
        </div>
      )}

      {card.blockedReason ? (
        <p className="mt-1 text-[11px] text-madder">{card.blockedReason}</p>
      ) : null}
    </article>
  );
}
