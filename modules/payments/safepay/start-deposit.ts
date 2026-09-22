"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, insertAuditLog, orders, payments } from "@aks/db";
import { uuidv7 } from "@aks/shared";

import { normalizePhoneDigits } from "@/modules/customers/phone";
import { CHECKOUT_GUEST_ACTOR_ID } from "@/modules/orders/constants";

import { readSafepayConfigOrNull } from "../config";
import { createSafepayCheckout } from "../create-checkout";
import { isPaymentMethodEnabled } from "../methods-config";
import { PaymentProviderError } from "../types";
import type { PaymentKind } from "../types";

export type StartSafepayDepositResult =
  | { ok: true; providerRef: string; expiresAt: string | null }
  | { ok: false; error: string };

function inferKind(depositAmountMinor: number, totalMinor: number): PaymentKind {
  return depositAmountMinor >= totalMinor ? "FULL" : "DEPOSIT";
}

/**
 * Start a Safepay Raast push (RTP_NOW) for the order deposit.
 * No hosted checkout URL — customer approves on their banking app.
 * Webhook marks SUCCEEDED and transitions AWAITING_DEPOSIT → DEPOSIT_PAID.
 */
export async function startSafepayDepositAction(input: {
  orderNumber: string;
  raastPhone: string;
}): Promise<StartSafepayDepositResult> {
  try {
    if (!isPaymentMethodEnabled("SAFEPAY") || !readSafepayConfigOrNull()) {
      return {
        ok: false,
        error:
          "Online Raast pay is not available yet. Use cash on delivery, or contact the studio.",
      };
    }

    const orderNumber = input.orderNumber.trim();
    const phone = normalizePhoneDigits(input.raastPhone);
    if (!orderNumber) {
      return { ok: false, error: "Order number is required." };
    }
    if (phone.length < 10) {
      return {
        ok: false,
        error:
          "Enter the mobile number linked to your Raast ID (e.g. 03XX XXXXXXX).",
      };
    }

    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        depositAmountMinor: orders.depositAmountMinor,
        totalMinor: orders.totalMinor,
      })
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);

    if (!order) {
      return { ok: false, error: "Order not found." };
    }
    if (order.status !== "AWAITING_DEPOSIT") {
      return {
        ok: false,
        error: "This order is no longer waiting for a deposit.",
      };
    }
    if (order.depositAmountMinor <= 0) {
      return { ok: false, error: "No deposit is due on this order." };
    }

    const idempotencyKey = `safepay-deposit:${order.id}`;

    const [existing] = await db
      .select({
        id: payments.id,
        providerRef: payments.providerRef,
        status: payments.status,
      })
      .from(payments)
      .where(
        and(
          eq(payments.orderId, order.id),
          eq(payments.provider, "SAFEPAY"),
          eq(payments.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);

    if (existing?.status === "SUCCEEDED") {
      return { ok: false, error: "This deposit is already paid." };
    }
    if (existing?.status === "PENDING" && existing.providerRef) {
      return {
        ok: true,
        providerRef: existing.providerRef,
        expiresAt: null,
      };
    }

    const kind = inferKind(order.depositAmountMinor, order.totalMinor);
    const session = await createSafepayCheckout({
      orderId: order.id,
      orderReference: order.orderNumber,
      amountMinor: order.depositAmountMinor,
      kind,
      currency: "PKR",
      debitorRaastId: phone,
      idempotencyKey,
    });

    const paymentId = existing?.id ?? uuidv7();
    if (existing) {
      await db
        .update(payments)
        .set({
          providerRef: session.providerRef,
          status: "PENDING",
          amountMinor: order.depositAmountMinor,
          kind,
          rawPayload: session.raw,
        })
        .where(eq(payments.id, existing.id));
    } else {
      await db.insert(payments).values({
        id: paymentId,
        orderId: order.id,
        provider: "SAFEPAY",
        providerRef: session.providerRef,
        kind,
        amountMinor: order.depositAmountMinor,
        currency: "PKR",
        status: "PENDING",
        rawPayload: session.raw,
        idempotencyKey,
      });
    }

    await insertAuditLog(db, {
      id: uuidv7(),
      actorId: CHECKOUT_GUEST_ACTOR_ID,
      actorRole: "SYSTEM",
      action: "payment.safepay.start",
      entityType: "payment",
      entityId: paymentId,
      before: null,
      after: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amountMinor: order.depositAmountMinor,
        providerRef: session.providerRef,
        kind,
      },
    });

    revalidatePath(`/checkout/pay`);
    revalidatePath(`/checkout/confirmation`);

    return {
      ok: true,
      providerRef: session.providerRef,
      expiresAt: session.expiresAt?.toISOString() ?? null,
    };
  } catch (e) {
    if (e instanceof PaymentProviderError) {
      return { ok: false, error: e.message };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not start Raast payment.",
    };
  }
}
