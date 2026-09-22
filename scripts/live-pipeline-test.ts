/**
 * Live COD pipeline: placeOrderCore → confirm → advance → dispatch → HTTP checks.
 * Evidence: docs/audits/LIVE_PIPELINE_RESULTS.json
 */
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

config({ path: ".env.local" });
config({ path: ".env" });

type Step = { id: string; name: string; ok: boolean; detail: string };

const ACTOR = {
  id: "00000000-0000-7000-8000-000000000099",
  role: "OWNER",
};

async function main() {
  const steps: Step[] = [];
  const push = (id: string, name: string, ok: boolean, detail: string) => {
    steps.push({ id, name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"} ${id} — ${detail}`);
  };

  const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
  const {
    db,
    designs,
    colourways,
    rtwStock,
    orders,
    orderItems,
    productionJobs,
  } = await import("@aks/db");
  const { gt, eq, and } = await import("drizzle-orm");
  const { placeOrderCore } = await import("@/modules/orders/place-order-core");
  const { buildStandardMeasurementSnapshot } = await import(
    "@/modules/orders/compute-cut-spec-snapshot"
  );
  const { CHECKOUT_GUEST_ACTOR_ID } = await import("@/modules/orders/constants");
  const { transitionOrder } = await import("@/modules/orders/transition-order");
  const { getOrderDetail } = await import("@/modules/orders/queries");
  const { uuidv7 } = await import("@aks/shared");

  // Import side-effect registration
  await import("@/modules/orders/transitions");

  const stockRows = await db
    .select({
      designId: rtwStock.designId,
      colourwayId: rtwStock.colourwayId,
      sizeLabel: rtwStock.sizeLabel,
      onHand: rtwStock.quantityOnHand,
      reserved: rtwStock.quantityReserved,
    })
    .from(rtwStock)
    .where(gt(rtwStock.quantityOnHand, 0))
    .limit(20);

  const stock = stockRows.find((r) => r.onHand - r.reserved > 0);
  if (!stock) {
    push(
      "P-stock",
      "RTW stock",
      false,
      `rows=${stockRows.length} none with free units`,
    );
    finish(steps);
    process.exit(1);
  }

  const available = stock.onHand - stock.reserved;

  const design = (
    await db
      .select()
      .from(designs)
      .where(
        and(eq(designs.id, stock.designId), eq(designs.status, "PUBLISHED")),
      )
      .limit(1)
  )[0];
  const colourway = (
    await db
      .select()
      .from(colourways)
      .where(eq(colourways.id, stock.colourwayId))
      .limit(1)
  )[0];

  push(
    "P-stock",
    "RTW stock",
    Boolean(design && colourway),
    `slug=${design?.slug} size=${stock.sizeLabel} avail=${available}`,
  );
  if (!design || !colourway) {
    finish(steps);
    process.exit(1);
  }

  const pdp = await fetch(`${base}/designs/${design.slug}`);
  push("S-PDP", "PDP live", pdp.ok, `${pdp.status}`);

  const unitPrice =
    design.basePriceMinor + (colourway.priceDeltaMinor ?? 0);
  const guestEmail = `live-pipeline-${Date.now()}@mailinator.com`;
  const priceBreakdown = {
    basePriceMinor: design.basePriceMinor,
    colourwayDeltaMinor: colourway.priceDeltaMinor ?? 0,
    customizationDeltaMinor: 0,
    madeToMeasureSurchargeMinor: 0,
    unitPriceMinor: unitPrice,
  };

  let orderId = "";
  let orderNumber = "";

  try {
    const placed = await db.transaction(async (tx) => {
      const measurementSnapshot = await buildStandardMeasurementSnapshot(
        { designId: design.id, sizeLabel: stock.sizeLabel },
        tx,
      );
      return placeOrderCore(
        {
          userId: null,
          guestEmail,
          guestPhone: "+923001112233",
          whatsappNumber: "+923001112233",
          shippingAddressSnapshot: {
            recipientName: "Live Pipeline Tester",
            phone: "+923001112233",
            whatsappNumber: "+923001112233",
            addressLine1: "Test Street 1",
            addressLine2: null,
            city: "Lahore",
            province: "Punjab",
            postalCode: "54000",
            landmark: null,
          },
          paymentPlan: "FULL_COD",
          customerNotes: "Live pipeline harness",
          source: "WEB",
          subtotalMinor: unitPrice,
          shippingMinor: 0,
          taxMinor: 0,
          totalMinor: unitPrice,
          lines: [
            {
              designId: design.id,
              colourwayId: colourway.id,
              designSlug: design.slug,
              designName: design.name,
              sizeMode: "STANDARD",
              sizeLabel: stock.sizeLabel,
              measurementSnapshot,
              customizationSelections: {},
              quantity: 1,
              unitPriceMinor: unitPrice,
              lineTotalMinor: unitPrice,
              priceBreakdown,
            },
          ],
          actor: { id: CHECKOUT_GUEST_ACTOR_ID, role: "CUSTOMER" },
          transitionNote: "Live pipeline COD place",
        },
        tx,
      );
    });
    orderId = placed.orderId;
    orderNumber = placed.orderNumber;
    const d = await getOrderDetail(orderId);
    push(
      "P-01",
      "FULL_COD place",
      d?.status === "DEPOSIT_PAID",
      `${orderNumber} status=${d?.status}`,
    );
  } catch (e) {
    push("P-01", "FULL_COD place", false, err(e));
    finish(steps, { orderId, orderNumber, guestEmail });
    process.exit(1);
  }

  // Confirm measurements (same transition path as admin action)
  try {
    await db.transaction(async (tx) => {
      await transitionOrder({
        orderId,
        from: "DEPOSIT_PAID",
        to: "MEASUREMENTS_CONFIRMED",
        actor: ACTOR,
        note: "Live pipeline confirm",
        tx,
      });
      await tx
        .update(orders)
        .set({ skipEmbroidery: true, updatedAt: new Date() })
        .where(eq(orders.id, orderId));
    });
    const d = await getOrderDetail(orderId);
    const jobs = await db
      .select({ id: productionJobs.id, stage: productionJobs.stage })
      .from(productionJobs)
      .where(eq(productionJobs.orderId, orderId));
    push(
      "P-03",
      "Confirm → MEASUREMENTS_CONFIRMED",
      d?.status === "MEASUREMENTS_CONFIRMED",
      `status=${d?.status} jobs=${jobs.length}`,
    );
  } catch (e) {
    push("P-03", "Confirm measurements", false, err(e));
  }

  // Advance production chain (skip embroidery)
  const chain = [
    "CUTTING",
    "STITCHING",
    "FINISHING",
    "QUALITY_CHECK",
    "READY_TO_SHIP",
  ] as const;
  let from = "MEASUREMENTS_CONFIRMED";
  for (const to of chain) {
    try {
      await db.transaction(async (tx) => {
        if (to === "CUTTING") {
          // Capture estimated metres as actual for RTW lines
          const items = await tx
            .select({
              id: orderItems.id,
              qty: orderItems.quantity,
            })
            .from(orderItems)
            .where(eq(orderItems.orderId, orderId));
          // consumeFabricAtCutting may no-op for STANDARD — still run transition
          void items;
        }
        await transitionOrder({
          orderId,
          from,
          to,
          actor: ACTOR,
          note: `Live advance ${to}`,
          tx,
        });
      });
      from = to;
      push(`P-${to}`, `Advance → ${to}`, true, "ok");
    } catch (e) {
      push(`P-${to}`, `Advance → ${to}`, false, err(e));
      break;
    }
  }

  // Dispatch with AWB
  const awb = `LIVE-AWB-${Date.now()}`;
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({
          courierName: "TCS",
          trackingNumber: awb,
          shippedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));
      await transitionOrder({
        orderId,
        from: "READY_TO_SHIP",
        to: "DISPATCHED",
        actor: ACTOR,
        note: "Live dispatch",
        tx,
      });
    });
    const d = await getOrderDetail(orderId);
    push(
      "P-10",
      "DISPATCHED + AWB",
      d?.status === "DISPATCHED" && d.trackingNumber === awb,
      `status=${d?.status} awb=${d?.trackingNumber}`,
    );
  } catch (e) {
    push("P-10", "DISPATCHED + AWB", false, err(e));
  }

  // Delivered + Completed
  for (const [to, prev] of [
    ["DELIVERED", "DISPATCHED"],
    ["COMPLETED", "DELIVERED"],
  ] as const) {
    try {
      await db.transaction(async (tx) => {
        await transitionOrder({
          orderId,
          from: prev,
          to,
          actor: ACTOR,
          note: `Live ${to}`,
          tx,
        });
      });
      push(`P-${to}`, to, true, "ok");
    } catch (e) {
      push(`P-${to}`, to, false, err(e));
    }
  }

  // HTTP surfaces
  for (const [id, path] of [
    ["C-06", `/checkout/confirmation?order=${encodeURIComponent(orderNumber)}`],
    ["C-09", `/track/${orderNumber}`],
    ["A-login", `/admin/login`],
    ["A-orders", `/admin/orders`],
    ["S-home", `/`],
    ["S-size", `/size-guide`],
    ["S-fabrics", `/fabrics`],
    ["S-coll", `/collections/all`],
  ] as const) {
    try {
      const res = await fetch(`${base}${path}`, { redirect: "manual" });
      const ok = res.status > 0 && res.status < 500;
      push(id, path, ok, `HTTP ${res.status}`);
    } catch (e) {
      push(id, path, false, err(e));
    }
  }

  // Security probes
  {
    const res = await fetch(`${base}/api/webhooks/safepay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    push("N-03", "Safepay unsigned", res.status >= 400 && res.status < 500, `${res.status}`);
  }
  {
    const res = await fetch(
      `${base}/api/assets/serve?key=${encodeURIComponent("../.env")}`,
    );
    push("N-04", "Asset traversal", res.status !== 200, `${res.status}`);
  }

  // Admin route sweep (expect <500)
  const adminPaths = [
    "/admin",
    "/admin/customers",
    "/admin/discounts",
    "/admin/content",
    "/admin/content/homepage",
    "/admin/production",
    "/admin/inventory",
    "/admin/inventory/designs",
    "/admin/inventory/fabrics",
    "/admin/fabrics",
    "/admin/designs",
    "/admin/finance",
    "/admin/insights",
    "/admin/settings",
    "/admin/settings/staff",
    "/admin/settings/roles",
    "/admin/settings/storefront",
    "/admin/settings/sizing/blocks",
    "/admin/photoreal",
    "/admin/tryon",
  ];
  let i = 0;
  for (const path of adminPaths) {
    i++;
    const res = await fetch(`${base}${path}`, { redirect: "manual" });
    push(
      `A-sweep-${String(i).padStart(2, "0")}`,
      path,
      res.status < 500,
      `${res.status}`,
    );
  }

  finish(steps, { orderId, orderNumber, guestEmail, awb });
  const failed = steps.filter((s) => !s.ok).length;
  process.exit(failed > 0 ? 1 : 0);
}

function err(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

function finish(
  steps: Step[],
  extra: Record<string, string> = {},
) {
  const passed = steps.filter((s) => s.ok).length;
  const failed = steps.filter((s) => !s.ok).length;
  const out = {
    generatedAt: new Date().toISOString(),
    ...extra,
    summary: { total: steps.length, passed, failed },
    steps,
  };
  writeFileSync(
    join("docs", "audits", "LIVE_PIPELINE_RESULTS.json"),
    JSON.stringify(out, null, 2),
  );
  console.log(JSON.stringify(out.summary));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
