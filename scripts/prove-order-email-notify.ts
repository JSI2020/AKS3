import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

/**
 * Enqueue one order-status email through the real notify path (message.send → Resend).
 * Requires RESEND_TEST_TO (or first arg) = a real inbox you control.
 *
 * Run: npx tsx scripts/prove-order-email-notify.ts you@example.com
 */
async function main() {
  const to =
    process.argv[2]?.trim() ||
    process.env.RESEND_TEST_TO?.trim() ||
    "";
  if (!to || !to.includes("@")) {
    throw new Error(
      "Pass a real email: npx tsx scripts/prove-order-email-notify.ts you@domain.com",
    );
  }

  const { uuidv7 } = await import("@aks/shared");
  const { db, messageLog, sql } = await import("@aks/db");
  const { enqueue } = await import("../modules/platform/outbox/enqueue");
  const { seedMessageTemplatesIntoDb } = await import(
    "../modules/messaging/seed-templates"
  );
  const {
    isResendConfigured,
    resolveFromEmail,
  } = await import("../modules/messaging/providers/resend");

  if (!isResendConfigured()) {
    throw new Error("RESEND_API_KEY is not set");
  }
  console.log("from:", resolveFromEmail());
  console.log("to:", to);

  await seedMessageTemplatesIntoDb();

  const messageLogId = uuidv7();
  const orderNumber = `AKS-PROBE-${Date.now().toString().slice(-6)}`;
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.AUTH_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  await db.transaction(async (tx) => {
    await tx.insert(messageLog).values({
      id: messageLogId,
      recipient: to.toLowerCase(),
      templateKey: "order.dispatched",
      orderId: null,
      status: "PENDING",
    });
    await enqueue(
      "message.send",
      {
        messageLogId,
        recipient: to.toLowerCase(),
        templateKey: "order.dispatched",
        locale: "en",
        vars: {
          orderNumber,
          customerName: "there",
          trackUrl: `${base}/track/${encodeURIComponent(orderNumber)}`,
          courierName: "TCS",
          trackingNumber: "PROBE-AWB-001",
        },
        customerRemark: null,
      },
      tx,
    );
  });

  console.log("enqueued message.send — waiting for worker…");
  console.log("messageLogId:", messageLogId);

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const [row] = await sql<
      { status: string; provider_ref: string | null; error: string | null }[]
    >`
      select status, provider_ref, error from message_log where id = ${messageLogId}`;
    if (row && row.status !== "PENDING") {
      console.log("result:", row);
      await sql.end({ timeout: 5 });
      if (row.status !== "SENT") process.exit(1);
      process.exit(0);
    }
  }

  console.error("timed out waiting for worker to drain message.send");
  await sql.end({ timeout: 5 });
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
