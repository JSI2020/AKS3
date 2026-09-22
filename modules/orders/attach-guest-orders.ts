import "server-only";

import { and, isNull, sql } from "drizzle-orm";

import { db, orders } from "@aks/db";

import { normalizeEmail } from "@/modules/auth/otp";

/**
 * Claim guest checkout orders for a customer who later signs in with the
 * same email. Only touches rows that still have no userId.
 */
export async function attachGuestOrdersByEmail(
  userId: string,
  email: string | null | undefined,
): Promise<number> {
  if (!userId || !email?.trim()) return 0;

  const normalized = normalizeEmail(email);
  if (!normalized.includes("@")) return 0;

  const updated = await db
    .update(orders)
    .set({ userId, updatedAt: new Date() })
    .where(
      and(
        isNull(orders.userId),
        sql`lower(trim(${orders.guestEmail})) = ${normalized}`,
      ),
    )
    .returning({ id: orders.id });

  return updated.length;
}

/** Idempotent attach — safe to call on every customer session start. */
export async function attachGuestOrdersForCustomer(input: {
  userId: string;
  email?: string | null;
  role?: string | null;
}): Promise<number> {
  if (input.role && input.role !== "CUSTOMER") return 0;
  return attachGuestOrdersByEmail(input.userId, input.email);
}
