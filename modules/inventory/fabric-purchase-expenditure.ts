import { fabrics, expenditures } from "@aks/db";
import { uuidv7 } from "@aks/shared";
import { eq } from "drizzle-orm";

import { computeFabricCostMinor } from "@/modules/money/compute";
import type { DbTx } from "@/modules/platform/types";

/**
 * When cloth is recorded into a lot, log MATERIALS expenditure:
 * amount = cost/metre × metres (paisa). Buy stays manual; ledger is automatic.
 */
export async function insertFabricLotExpenditureTx(
  tx: DbTx,
  input: {
    fabricId: string;
    lotCode: string;
    metersHundredths: number;
    costPerMeterMinor: number;
    actorId: string;
  },
): Promise<{ expenditureId: string; amountMinor: number } | null> {
  const amountMinor = computeFabricCostMinor(
    input.costPerMeterMinor,
    input.metersHundredths,
  );
  if (amountMinor <= 0) return null;

  const [fabric] = await tx
    .select({ name: fabrics.name })
    .from(fabrics)
    .where(eq(fabrics.id, input.fabricId))
    .limit(1);

  const payee = fabric?.name?.trim() || "Fabric purchase";
  const metresDisplay = (input.metersHundredths / 100).toFixed(2);
  const expenditureId = uuidv7();

  await tx.insert(expenditures).values({
    id: expenditureId,
    date: new Date(),
    category: "MATERIALS",
    payee,
    amountMinor,
    paymentMethod: "BANK_TRANSFER",
    isRecurring: false,
    recurrenceCycle: null,
    note: `Fabric lot ${input.lotCode} — ${metresDisplay} m recorded`,
    actorId: input.actorId,
  });

  return { expenditureId, amountMinor };
}
