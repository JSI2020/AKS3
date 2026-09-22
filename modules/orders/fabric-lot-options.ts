"use server";

import { eq, inArray } from "drizzle-orm";

import {
  colourways,
  designs,
  orderItems,
} from "@aks/db";
import { db } from "@aks/db";

import { requirePermission } from "@/modules/auth";
import { listViableFabricLots } from "@/modules/inventory";

/** Viable lots for MTM lines on an order (FIFO). Empty for RTW-only. */
export async function listOrderFabricLotOptionsAction(orderId: string): Promise<
  | {
      ok: true;
      lines: Array<{
        orderItemId: string;
        designName: string;
        fabricId: string;
        metersRequired: number;
        lots: Array<{
          id: string;
          lotCode: string;
          availableMeters: number;
        }>;
      }>;
    }
  | { ok: false; error: string }
> {
  try {
    await requirePermission("orders.view");
    const items = await db
      .select({
        id: orderItems.id,
        designId: orderItems.designId,
        colourwayId: orderItems.colourwayId,
        quantity: orderItems.quantity,
        sizeMode: orderItems.sizeMode,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    const mtm = items.filter((i) => i.sizeMode === "MADE_TO_MEASURE");
    if (mtm.length === 0) {
      return { ok: true, lines: [] };
    }

    const designIds = [...new Set(mtm.map((i) => i.designId))];
    const designRows = await db
      .select({
        id: designs.id,
        name: designs.name,
        fabricConsumptionMeters: designs.fabricConsumptionMeters,
      })
      .from(designs)
      .where(inArray(designs.id, designIds));
    const designById = new Map(designRows.map((d) => [d.id, d]));

    const colourwayIds = [...new Set(mtm.map((i) => i.colourwayId))];
    const colourwayRows = await db
      .select({ id: colourways.id, fabricId: colourways.fabricId })
      .from(colourways)
      .where(inArray(colourways.id, colourwayIds));
    const fabricByColourway = new Map(
      colourwayRows.map((c) => [c.id, c.fabricId]),
    );

    const lines = [];
    for (const item of mtm) {
      const design = designById.get(item.designId);
      const fabricId = fabricByColourway.get(item.colourwayId);
      if (!design || !fabricId) continue;
      const metersRequired = design.fabricConsumptionMeters * item.quantity;
      if (metersRequired <= 0) continue;
      const lots = await listViableFabricLots({ fabricId, metersRequired });
      lines.push({
        orderItemId: item.id,
        designName: design.name,
        fabricId,
        metersRequired,
        lots: lots.map((l) => ({
          id: l.id,
          lotCode: l.lotCode,
          availableMeters: l.availableMeters,
        })),
      });
    }

    return { ok: true, lines };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not load fabric lots.",
    };
  }
}
