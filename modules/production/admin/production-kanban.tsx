"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import {
  PRODUCTION_JOB_STAGES,
  PRODUCTION_STAGE_LABELS,
  type ProductionJobStage,
  type ReworkFaultAttribution,
} from "../constants";
import type { ProductionBoardCard, StaffOption } from "../queries";
import type { StaffWorkloadRow } from "../workload";
import { ProductionCard } from "./production-card";
import { ProductionFilters } from "./production-filters";
import { WorkloadPanel } from "./workload-panel";

const READY_COLUMN_ID = "READY" as const;

type ProductionKanbanProps = {
  initialColumns: Record<ProductionJobStage, ProductionBoardCard[]>;
  staff: StaffOption[];
  workload: StaffWorkloadRow[];
  onAdvance: (jobId: string, toStage: ProductionJobStage) => Promise<void>;
  onAssign: (jobId: string, staffId: string | null) => Promise<void>;
  onStart: (jobId: string) => Promise<void>;
  onBlock: (jobId: string, reason: string) => Promise<void>;
  onQcPass: (jobId: string) => Promise<void>;
  onQcFail: (
    jobId: string,
    fault: ReworkFaultAttribution,
    reason: string,
  ) => Promise<void>;
};

function splitReady(
  columns: Record<ProductionJobStage, ProductionBoardCard[]>,
): {
  ready: ProductionBoardCard[];
  active: Record<ProductionJobStage, ProductionBoardCard[]>;
} {
  const ready: ProductionBoardCard[] = [];
  const active = PRODUCTION_JOB_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = [];
      return acc;
    },
    {} as Record<ProductionJobStage, ProductionBoardCard[]>,
  );

  for (const stage of PRODUCTION_JOB_STAGES) {
    for (const card of columns[stage] ?? []) {
      if (card.status === "PENDING") {
        ready.push(card);
      } else {
        active[stage].push(card);
      }
    }
  }

  return { ready, active };
}

type CardHandlers = {
  staff: StaffOption[];
  onAssign: (jobId: string, staffId: string | null) => Promise<void>;
  onStart: (jobId: string) => Promise<void>;
  onBlock: (jobId: string, reason: string) => Promise<void>;
  onQcPass: (jobId: string) => Promise<void>;
  onQcFail: (
    jobId: string,
    fault: ReworkFaultAttribution,
    reason: string,
  ) => Promise<void>;
};

function SortableCard({
  card,
  handlers,
  showStart,
}: {
  card: ProductionBoardCard;
  handlers: CardHandlers;
  showStart?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
    >
      <ProductionCard
        card={card}
        staff={handlers.staff}
        onAssign={handlers.onAssign}
        onStart={handlers.onStart}
        onBlock={handlers.onBlock}
        onQcPass={handlers.onQcPass}
        onQcFail={handlers.onQcFail}
        dragging={isDragging}
        showStart={showStart}
      />
    </div>
  );
}

function Column({
  id,
  title,
  cards,
  handlers,
  showStart,
}: {
  id: string;
  title: string;
  cards: ProductionBoardCard[];
  handlers: CardHandlers;
  showStart?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const ids = useMemo(() => cards.map((c) => c.id), [cards]);

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex w-[min(100%,17rem)] shrink-0 flex-col border bg-indigo-lift/40",
        isOver ? "border-zari" : "border-chalk/25",
      )}
      data-column={id}
    >
      <header className="border-b border-chalk/20 px-3 py-2">
        <h2 className="font-sans text-[11px] uppercase tracking-[0.12em] text-chalk">
          {title}
        </h2>
        <p className="font-mono text-[11px] text-greige/70">{cards.length}</p>
      </header>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-[12rem] flex-col gap-2 p-2">
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              handlers={handlers}
              showStart={showStart}
            />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}

export function ProductionKanban({
  initialColumns,
  staff,
  workload,
  onAdvance,
  onAssign,
  onStart,
  onBlock,
  onQcPass,
  onQcFail,
}: ProductionKanbanProps) {
  const [columns, setColumns] = useState(initialColumns);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  const { ready, active } = useMemo(() => splitReady(columns), [columns]);

  const handlers: CardHandlers = {
    staff,
    onAssign,
    onStart,
    onBlock,
    onQcPass,
    onQcFail,
  };

  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 6 },
    }),
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const activeCard = useMemo(() => {
    if (!activeId) return null;
    const fromReady = ready.find((c) => c.id === activeId);
    if (fromReady) return fromReady;
    for (const stage of PRODUCTION_JOB_STAGES) {
      const found = active[stage]?.find((c) => c.id === activeId);
      if (found) return found;
    }
    return null;
  }, [activeId, ready, active]);

  function findLocation(
    jobId: string,
  ): { kind: "ready" } | { kind: "stage"; stage: ProductionJobStage } | null {
    if (ready.some((c) => c.id === jobId)) return { kind: "ready" };
    for (const stage of PRODUCTION_JOB_STAGES) {
      if (active[stage]?.some((c) => c.id === jobId)) {
        return { kind: "stage", stage };
      }
    }
    return null;
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const jobId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || busy) return;

    const from = findLocation(jobId);
    if (!from) return;

    let toStage: ProductionJobStage | typeof READY_COLUMN_ID | null = null;

    if (overId === READY_COLUMN_ID) {
      toStage = READY_COLUMN_ID;
    } else if ((PRODUCTION_JOB_STAGES as readonly string[]).includes(overId)) {
      toStage = overId as ProductionJobStage;
    } else {
      const overLoc = findLocation(overId);
      if (overLoc?.kind === "ready") toStage = READY_COLUMN_ID;
      else if (overLoc?.kind === "stage") toStage = overLoc.stage;
    }

    if (!toStage) return;

    // Ready → Cutting: start cutting (PENDING → IN_PROGRESS).
    if (from.kind === "ready" && toStage === "CUTTING") {
      setBusy(true);
      try {
        await onStart(jobId);
      } finally {
        setBusy(false);
      }
      return;
    }

    // Ready → Stitching: advance from CUTTING (backend still owns fabric/order sync).
    if (from.kind === "ready" && toStage === "STITCHING") {
      const card = ready.find((c) => c.id === jobId);
      if (!card || card.stage !== "CUTTING") return;

      setBusy(true);
      const prev = columns;
      setColumns((current) => {
        const next = { ...current };
        next.CUTTING = (next.CUTTING ?? []).filter((c) => c.id !== jobId);
        next.STITCHING = [
          ...(next.STITCHING ?? []),
          { ...card, stage: "STITCHING", status: "IN_PROGRESS" },
        ];
        return next;
      });

      try {
        await onAdvance(jobId, "STITCHING");
      } catch {
        setColumns(prev);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (from.kind !== "stage") return;
    if (toStage === READY_COLUMN_ID || toStage === from.stage || toStage === "PACKED") {
      return;
    }

    const fromIndex = PRODUCTION_JOB_STAGES.indexOf(from.stage);
    const toIndex = PRODUCTION_JOB_STAGES.indexOf(toStage);
    if (toIndex !== fromIndex + 1) return;

    const card = active[from.stage]?.find((c) => c.id === jobId);
    if (!card) return;

    setBusy(true);
    const prev = columns;
    setColumns((current) => {
      const next = { ...current };
      next[from.stage] = next[from.stage].filter((c) => c.id !== jobId);
      next[toStage!] = [
        ...(next[toStage!] ?? []),
        { ...card, stage: toStage as ProductionJobStage, status: "IN_PROGRESS" },
      ];
      return next;
    });

    try {
      await onAdvance(jobId, toStage);
    } catch {
      setColumns(prev);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <ProductionFilters staff={staff} />
      <WorkloadPanel rows={workload} />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="flex min-w-max gap-3">
            <Column
              id={READY_COLUMN_ID}
              title="Ready"
              cards={ready}
              handlers={handlers}
              showStart
            />
            {PRODUCTION_JOB_STAGES.filter((s) => s !== "PACKED").map((stage) => (
              <Column
                key={stage}
                id={stage}
                title={PRODUCTION_STAGE_LABELS[stage]}
                cards={active[stage] ?? []}
                handlers={handlers}
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {activeCard ? (
            <ProductionCard
              card={activeCard}
              staff={staff}
              onAssign={onAssign}
              dragging
              showStart={activeCard.status === "PENDING"}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
