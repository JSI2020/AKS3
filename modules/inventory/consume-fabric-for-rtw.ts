import { and, asc, eq, gt, sql } from "drizzle-orm";

import {
  colourways,
  designs,
  fabricLots,
  rtwStock,
  stockAdjustments,
} from "@aks/db";
import { uuidv7 } from "@aks/shared";

import type { DbTx } from "@/modules/platform/types";

import { maybeEnqueueLowStockAlert } from "./allocate-fabric";
import { lotAvailableMeters, refreshFabricLotStatus } from "./lot-status";
import { FabricStockError } from "./types";

/**
 * When finished RTW units are received into inventory, cloth for those
 * pieces has already been cut — deduct metres from lots (FIFO).
 * Selling STANDARD RTW later must not reserve/consume fabric again.
 */
export async function consumeFabricForRtwReceiveTx(
  tx: DbTx,
  input: {
    rtwStockId: string;
    quantity: number;
    actorId: string;
  },
): Promise<void> {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) return;

  const [stock] = await tx
    .select({
      designId: rtwStock.designId,
      colourwayId: rtwStock.colourwayId,
    })
    .from(rtwStock)
    .where(eq(rtwStock.id, input.rtwStockId))
    .limit(1);

  if (!stock) {
    throw new FabricStockError("RTW stock not found for fabric consume.");
  }

  const [design] = await tx
    .select({ fabricConsumptionMeters: designs.fabricConsumptionMeters })
    .from(designs)
    .where(eq(designs.id, stock.designId))
    .limit(1);

  const [colourway] = await tx
    .select({ fabricId: colourways.fabricId })
    .from(colourways)
    .where(eq(colourways.id, stock.colourwayId))
    .limit(1);

  const metersPerUnit = design?.fabricConsumptionMeters ?? 0;
  if (metersPerUnit <= 0) {
    throw new FabricStockError(
      "Set fabric metres on the design Costing tab before receiving RTW stock.",
    );
  }
  if (!colourway?.fabricId) {
    throw new FabricStockError(
      "Colourway has no fabric — assign cloth on the design before receiving stock.",
    );
  }

  const metersRequired = metersPerUnit * input.quantity;
  await consumeFabricMetresFifoTx(tx, {
    fabricId: colourway.fabricId,
    metersRequired,
    actorId: input.actorId,
    note: `RTW receive ${input.quantity} pc — ${metersRequired} hundredths m`,
  });
}

async function consumeFabricMetresFifoTx(
  tx: DbTx,
  input: {
    fabricId: string;
    metersRequired: number;
    actorId: string;
    note: string;
  },
): Promise<void> {
  let remaining = input.metersRequired;

  const lots = await tx
    .select({
      id: fabricLots.id,
      metersOnHand: fabricLots.metersOnHand,
      metersReserved: fabricLots.metersReserved,
      status: fabricLots.status,
    })
    .from(fabricLots)
    .where(
      and(
        eq(fabricLots.fabricId, input.fabricId),
        eq(fabricLots.status, "AVAILABLE"),
        gt(
          sql`${fabricLots.metersOnHand} - ${fabricLots.metersReserved}`,
          0,
        ),
      ),
    )
    .orderBy(asc(fabricLots.receivedAt), asc(fabricLots.createdAt));

  for (const candidate of lots) {
    if (remaining <= 0) break;

    const locked = await tx
      .select({
        id: fabricLots.id,
        metersOnHand: fabricLots.metersOnHand,
        metersReserved: fabricLots.metersReserved,
        fabricId: fabricLots.fabricId,
      })
      .from(fabricLots)
      .where(eq(fabricLots.id, candidate.id))
      .for("update");

    const lot = locked[0];
    if (!lot) continue;

    const available = lotAvailableMeters(lot);
    if (available <= 0) continue;

    const take = Math.min(available, remaining);
    await tx
      .update(fabricLots)
      .set({
        metersOnHand: lot.metersOnHand - take,
        updatedAt: new Date(),
      })
      .where(eq(fabricLots.id, lot.id));

    await tx.insert(stockAdjustments).values({
      id: uuidv7(),
      fabricLotId: lot.id,
      deltaMeters: -take,
      reason: "OTHER",
      note: input.note,
      actorId: input.actorId,
    });

    await refreshFabricLotStatus(tx, lot.id);
    remaining -= take;
  }

  if (remaining > 0) {
    throw new FabricStockError(
      `Insufficient fabric for RTW receive: short by ${remaining} hundredths of a metre.`,
    );
  }

  await maybeEnqueueLowStockAlert(tx, input.fabricId);
}
