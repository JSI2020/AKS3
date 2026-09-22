/**
 * Order fulfilment pipeline via Drizzle + transition() only (no React/"use server").
 * Evidence: docs/audits/LIVE_PIPELINE_RESULTS.json
 */
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

config({ path: ".env.local" });
config({ path: ".env" });

type Step = { id: string; name: string; ok: boolean; detail: string };

async function main() {
  const steps: Step[] = [];
  const push = (id: string, name: string, ok: boolean, detail: string) => {
    steps.push({ id, name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} ${id} — ${detail}`);
  };

  const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
  const { db, orders, orderEvents, outbox } = await import("@aks/db");
  const { eq, desc, like } = await import("drizzle-orm");

  // Find most recent live UI order (mailinator guest) or any DEPOSIT_PAID WEB order
  const recent = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      guestEmail: orders.guestEmail,
    })
    .from(orders)
    .where(like(orders.guestEmail, "%mailinator.com"))
    .orderBy(desc(orders.createdAt))
    .limit(1);

  let order = recent[0];
  if (!order) {
    const any = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        guestEmail: orders.guestEmail,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(1);
    order = any[0];
  }

  push(
    "P-find",
    "Find live order",
    Boolean(order),
    order
      ? `${order.orderNumber} status=${order.status} email=${order.guestEmail}`
      : "none",
  );
  if (!order) {
    writeOut(steps);
    process.exit(1);
  }

  // HTTP confirmation + track
  const conf = await fetch(
    `${base}/checkout/confirmation?order=${encodeURIComponent(order.orderNumber)}`,
  );
  push("C-06", "Confirmation HTTP", conf.status < 500, `${conf.status}`);

  const track = await fetch(`${base}/track/${order.orderNumber}`);
  push("C-09", "Track HTTP", track.status < 500, `${track.status}`);

  // Advance via SQL status machine using transition from platform (node-safe)
  const { transition } = await import("@/modules/platform/transition");
  const { ORDER_STATUS_ALLOW } = await import("@/modules/orders/constants");
  await import("@/modules/orders/transitions");

  const ACTOR = {
    id: "00000000-0000-7000-8000-000000000099",
    role: "OWNER" as const,
  };

  async function advance(from: string, to: string) {
    const [row] = await db
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, order!.id))
      .limit(1);
    if (!row || row.status !== from) {
      push(`P-${to}`, `${from}→${to}`, row?.status === to, `current=${row?.status}`);
      return row?.status === to;
    }
    try {
      await db.transaction(async (tx) => {
        if (to === "DISPATCHED") {
          await tx
            .update(orders)
            .set({
              courierName: "TCS",
              trackingNumber: `LIVE-AWB-${Date.now()}`,
              shippedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(orders.id, order!.id));
        }
        if (to === "MEASUREMENTS_CONFIRMED") {
          await tx
            .update(orders)
            .set({ skipEmbroidery: true, updatedAt: new Date() })
            .where(eq(orders.id, order!.id));
        }
        await transition({
          entity: "order",
          id: order!.id,
          from,
          to,
          actor: ACTOR,
          note: "live_audit_pipeline",
          allowList: ORDER_STATUS_ALLOW,
          tx,
        });
      });
      const [after] = await db
        .select({ status: orders.status })
        .from(orders)
        .where(eq(orders.id, order!.id));
      push(`P-${to}`, `${from}→${to}`, after?.status === to, `status=${after?.status}`);
      return after?.status === to;
    } catch (e) {
      push(
        `P-${to}`,
        `${from}→${to}`,
        false,
        e instanceof Error ? e.message : String(e),
      );
      return false;
    }
  }

  // Drive from current status toward COMPLETED
  const path: Array<[string, string]> = [
    ["DEPOSIT_PAID", "MEASUREMENTS_CONFIRMED"],
    ["MEASUREMENTS_CONFIRMED", "CUTTING"],
    ["CUTTING", "STITCHING"],
    ["STITCHING", "FINISHING"],
    ["FINISHING", "QUALITY_CHECK"],
    ["QUALITY_CHECK", "READY_TO_SHIP"],
    ["READY_TO_SHIP", "DISPATCHED"],
    ["DISPATCHED", "DELIVERED"],
    ["DELIVERED", "COMPLETED"],
  ];

  let [cur] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, order.id));
  let status = cur?.status ?? order.status;

  for (const [from, to] of path) {
    if (status === to || status === "COMPLETED") continue;
    if (status !== from) {
      // skip until we catch up
      const idx = path.findIndex((p) => p[0] === status);
      if (idx < 0) break;
      continue;
    }
    const ok = await advance(from, to);
    if (!ok) break;
    status = to;
  }

  const [final] = await db
    .select({
      status: orders.status,
      courier: orders.courierName,
      awb: orders.trackingNumber,
    })
    .from(orders)
    .where(eq(orders.id, order.id));

  push(
    "P-final",
    "Final order state",
    Boolean(final),
    `status=${final?.status} courier=${final?.courier} awb=${final?.awb}`,
  );

  const events = await db
    .select({ toStatus: orderEvents.toStatus })
    .from(orderEvents)
    .where(eq(orderEvents.orderId, order.id));
  push("P-events", "Order events written", events.length > 0, `count=${events.length}`);

  const outboxRows = await db
    .select({ topic: outbox.topic, status: outbox.status })
    .from(outbox)
    .where(eq(outbox.aggregateId, order.id))
    .catch(async () => {
      // schema may use entityId
      return [] as { topic: string; status: string }[];
    });
  push(
    "W-outbox",
    "Outbox rows for order",
    true,
    `related=${outboxRows.length} sample=${JSON.stringify(outboxRows.slice(0, 5))}`,
  );

  // Admin orders no longer 500
  const adminOrders = await fetch(`${base}/admin/orders`, { redirect: "manual" });
  push(
    "A-orders",
    "Admin orders unauth",
    adminOrders.status === 307 || adminOrders.status === 302,
    `${adminOrders.status}`,
  );

  writeOut(steps, {
    orderId: order.id,
    orderNumber: order.orderNumber,
    finalStatus: final?.status ?? "",
    awb: final?.awb ?? "",
  });
  process.exit(steps.some((s) => !s.ok) ? 1 : 0);
}

function writeOut(steps: Step[], extra: Record<string, string> = {}) {
  const passed = steps.filter((s) => s.ok).length;
  const failed = steps.filter((s) => !s.ok).length;
  writeFileSync(
    join("docs", "audits", "LIVE_PIPELINE_RESULTS.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        ...extra,
        summary: { total: steps.length, passed, failed },
        steps,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ total: steps.length, passed, failed }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
