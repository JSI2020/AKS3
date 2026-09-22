export type FabricAllocationSuccess = {
  status: "RESERVED";
  reservationId: string;
  fabricLotId: string;
  lotCode: string;
  metersReserved: number;
};

export type FabricAllocationInsufficient = {
  status: "INSUFFICIENT";
  fabricId: string;
  metersRequired: number;
  shortfall: number;
  candidateLotIds: string[];
};

export type FabricAllocationResult =
  | FabricAllocationSuccess
  | FabricAllocationInsufficient;

export class FabricStockError extends Error {
  readonly code = "FABRIC_STOCK_ERROR" as const;

  constructor(message: string) {
    super(message);
    this.name = "FabricStockError";
  }
}

export class FabricAllocationError extends Error {
  readonly code = "FABRIC_ALLOCATION_ERROR" as const;

  constructor(message: string) {
    super(message);
    this.name = "FabricAllocationError";
  }
}

export class RtwStockError extends Error {
  readonly code = "RTW_STOCK_ERROR" as const;

  constructor(message: string) {
    super(message);
    this.name = "RtwStockError";
  }
}

/**
 * Fabric is reserved at MEASUREMENTS_CONFIRMED for MADE_TO_MEASURE lines only.
 * STANDARD (RTW) skips this — cloth was consumed when finished stock was received.
 * DEPOSIT_PAID only confirms payment; this gate aligns with the fabric lock on CUTTING.
 */
export const FABRIC_RESERVATION_ORDER_STATUS = "MEASUREMENTS_CONFIRMED" as const;
