import { eq } from "drizzle-orm";

import { db, messageLog, orders, users } from "@aks/db";
import { uuidv7 } from "@aks/shared";

import { enqueue } from "@/modules/platform/outbox/enqueue";
import type { OutboxHandler } from "@/modules/platform/outbox";

import { isWhatsappConfigured } from "./providers/whatsapp";
import { ORDER_STATUS_TEMPLATE_KEYS } from "./templates";

/** Seed / Resend-rejected domains — do not enqueue (would DEAD the outbox). */
const UNDELIVERABLE_EMAIL_HOSTS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "aks.local",
  "localhost",
]);

function resolveRecipient(input: {
  guestEmail: string | null;
  userEmail: string | null;
}): string | null {
  const email = input.userEmail?.trim() || input.guestEmail?.trim();
  if (!email || !email.includes("@")) return null;
  const normalized = email.toLowerCase();
  const host = normalized.split("@")[1] ?? "";
  if (UNDELIVERABLE_EMAIL_HOSTS.has(host)) return null;
  return normalized;
}

function trackUrl(orderNumber: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    process.env.AUTH_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  return `${base}/track/${encodeURIComponent(orderNumber)}`;
}

export type OrderTransitionedPayload = {
  entity: string;
  id: string;
  from: string;
  to: string;
  note?: string | null;
};

function isOrderTransitionedPayload(
  payload: Record<string, unknown>,
): payload is OrderTransitionedPayload {
  return (
    payload.entity === "order" &&
    typeof payload.id === "string" &&
    typeof payload.from === "string" &&
    typeof payload.to === "string"
  );
}

/**
 * Customer notify for each order status change.
 * Email via Resend when a real recipient exists.
 * WhatsApp only when WHATSAPP_* env is configured (otherwise skipped — no fake SENT).
 */
export const handleOrderTransitioned: OutboxHandler = async (payload) => {
  if (!isOrderTransitionedPayload(payload)) {
    throw new Error("Invalid order.transitioned payload");
  }

  const templateKey = ORDER_STATUS_TEMPLATE_KEYS[payload.to];
  if (!templateKey) return;

  const [order] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      guestEmail: orders.guestEmail,
      whatsappNumber: orders.whatsappNumber,
      userId: orders.userId,
      shippingAddressSnapshot: orders.shippingAddressSnapshot,
      courierName: orders.courierName,
      trackingNumber: orders.trackingNumber,
    })
    .from(orders)
    .where(eq(orders.id, payload.id))
    .limit(1);

  if (!order) return;

  const [user] = order.userId
    ? await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, order.userId))
        .limit(1)
    : [null];

  const customerName =
    user?.name ?? order.shippingAddressSnapshot.recipientName ?? "there";
  const vars = {
    orderNumber: order.orderNumber,
    customerName,
    trackUrl: trackUrl(order.orderNumber),
    courierName: order.courierName?.trim() || "your courier",
    trackingNumber: order.trackingNumber?.trim() || "—",
  };

  const emailRecipient = resolveRecipient({
    guestEmail: order.guestEmail,
    userEmail: user?.email ?? null,
  });

  const whatsapp = order.whatsappNumber?.replace(/\D/g, "") ?? "";
  const sendWhatsapp = isWhatsappConfigured() && whatsapp.length >= 10;

  await db.transaction(async (tx) => {
    if (emailRecipient) {
      const messageLogId = uuidv7();
      await tx.insert(messageLog).values({
        id: messageLogId,
        recipient: emailRecipient,
        templateKey,
        orderId: order.id,
        status: "PENDING",
      });
      await enqueue(
        "message.send",
        {
          messageLogId,
          recipient: emailRecipient,
          templateKey,
          locale: "en",
          vars,
          customerRemark: payload.note ?? null,
        },
        tx,
      );
    }

    if (sendWhatsapp) {
      const waLogId = uuidv7();
      await tx.insert(messageLog).values({
        id: waLogId,
        recipient: whatsapp,
        templateKey: `whatsapp.${templateKey}`,
        orderId: order.id,
        status: "PENDING",
      });
      await enqueue(
        "whatsapp.notify",
        {
          messageLogId: waLogId,
          to: whatsapp,
          templateKey,
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName,
          note: payload.note ?? null,
          trackUrl: vars.trackUrl,
          courierName: vars.courierName,
          trackingNumber: vars.trackingNumber,
        },
        tx,
      );
    }
  });
};
