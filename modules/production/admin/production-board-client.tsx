"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  advanceProductionJobAction,
  assignProductionJobAction,
  blockProductionJobAction,
  recordQcCheckAction,
  startProductionJobAction,
} from "../actions";
import type { ProductionJobStage, ReworkFaultAttribution } from "../constants";
import type { ProductionBoardCard, StaffOption } from "../queries";
import type { StaffWorkloadRow } from "../workload";
import { ProductionKanban } from "./production-kanban";

type ProductionBoardClientProps = {
  columns: Record<ProductionJobStage, ProductionBoardCard[]>;
  staff: StaffOption[];
  workload: StaffWorkloadRow[];
};

export function ProductionBoardClient({
  columns,
  staff,
  workload,
}: ProductionBoardClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function onAdvance(jobId: string, toStage: ProductionJobStage) {
    const result = await advanceProductionJobAction({ jobId, toStage });
    if (!result.ok) throw new Error(result.error);
    refresh();
  }

  async function onAssign(jobId: string, staffId: string | null) {
    const result = await assignProductionJobAction({ jobId, staffId });
    if (!result.ok) throw new Error(result.error);
    refresh();
  }

  async function onStart(jobId: string) {
    const result = await startProductionJobAction({ jobId });
    if (!result.ok) throw new Error(result.error);
    refresh();
  }

  async function onBlock(jobId: string, reason: string) {
    const result = await blockProductionJobAction({ jobId, reason });
    if (!result.ok) throw new Error(result.error);
    refresh();
  }

  async function onQcPass(jobId: string) {
    const result = await recordQcCheckAction({
      jobId,
      checklist: { overall: "pass" },
      result: "PASS",
    });
    if (!result.ok) throw new Error(result.error);
    refresh();
  }

  async function onQcFail(
    jobId: string,
    fault: ReworkFaultAttribution,
    reason: string,
  ) {
    const result = await recordQcCheckAction({
      jobId,
      checklist: { overall: "fail" },
      result: "FAIL",
      faultAttribution: fault,
      reason,
    });
    if (!result.ok) throw new Error(result.error);
    refresh();
  }

  return (
    <ProductionKanban
      initialColumns={columns}
      staff={staff}
      workload={workload}
      onAdvance={onAdvance}
      onAssign={onAssign}
      onStart={onStart}
      onBlock={onBlock}
      onQcPass={onQcPass}
      onQcFail={onQcFail}
    />
  );
}
