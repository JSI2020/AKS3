import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

// Dynamic imports after dotenv — static imports hoist before config() runs.
async function main() {
  const { sql } = await import("@aks/db");
  const {
    drainDueMessages,
    registerHandler,
    registerTestPingHandler,
  } = await import("../modules/platform/outbox");
  const { purgeExpiredAssets } = await import("../modules/platform/assets");
  const { handleEmailSend } = await import("../modules/auth/email-handler");
  const {
    handleMessageSend,
    handleOrderTransitioned,
    handleWhatsappNotify,
  } = await import("../modules/messaging");
  const { registerDesignGenerateHandler } = await import(
    "../modules/ai/generation"
  );
  // Deep-import handler — barrel `modules/tryon` pulls server-actions → server-only.
  const { registerTryOnHandlers } = await import("../modules/tryon/handler");

  const POLL_MS = Number(process.env.OUTBOX_POLL_MS ?? 500);

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  registerTestPingHandler();
  registerHandler("email.send", handleEmailSend);
  registerHandler("message.send", handleMessageSend);
  registerHandler("whatsapp.notify", handleWhatsappNotify);
  registerHandler("order.transitioned", handleOrderTransitioned);
  // Fire-and-forget topics: ack so the poller does not RETRY/MISSING forever.
  // Side effects for these (if any) already run inline in the transition/payment paths.
  const noopTopics = [
    "production_job.transitioned",
    "production_job_status.transitioned",
    "payment.awaiting_verification",
    "payment.verified",
    "payment.rejected",
    "payment.succeeded",
    "payment.cod_collected",
    "cod.remittance_recorded",
    "customer.cod_disabled",
    "inventory.low_stock",
  ] as const;
  for (const topic of noopTopics) {
    registerHandler(topic, async () => {
      /* intentional no-op */
    });
  }
  registerHandler("assets.purgeExpired", async () => {
    const n = await purgeExpiredAssets();
    console.log(`[worker] purged ${n} assets`);
    const { purgeExpiredSelfies } = await import("../modules/tryon/purge");
    const selfies = await purgeExpiredSelfies();
    console.log(`[worker] purged ${selfies} selfies`);
  });
  registerDesignGenerateHandler();
  registerTryOnHandlers();

  // Ensure order-email templates exist before draining (avoids DEAD "No template found").
  const { seedMessageTemplatesIntoDb } = await import(
    "../modules/messaging/seed-templates"
  );
  await seedMessageTemplatesIntoDb();
  console.log("[worker] message templates seeded");

  console.log(`[worker] outbox polling every ${POLL_MS}ms`);

  // Long-lived process — not serverless.
  for (;;) {
    try {
      const results = await drainDueMessages(20);
      for (const r of results) {
        if (r.kind === "sent") {
          console.log(`[worker] SENT ${r.topic} ${r.id}`);
        } else if (r.kind === "retry") {
          console.log(
            `[worker] RETRY ${r.topic} ${r.id} attempts=${r.attempts} delayMs=${r.delayMs}`,
          );
        } else if (r.kind === "dead") {
          console.log(`[worker] DEAD ${r.topic} ${r.id} attempts=${r.attempts}`);
          const { alertOutboxDead } = await import(
            "../modules/platform/observability"
          );
          void alertOutboxDead({
            id: r.id,
            topic: r.topic,
            attempts: r.attempts,
          });
        } else if (r.kind === "missing-handler") {
          console.log(`[worker] MISSING ${r.topic} ${r.id}`);
        }
      }
    } catch (err) {
      console.error("[worker] tick failed", err);
    }
    await sleep(POLL_MS);
  }
}

main().catch(async (err) => {
  console.error(err);
  try {
    const { sql } = await import("@aks/db");
    await sql.end({ timeout: 5 });
  } catch {
    // ignore shutdown errors
  }
  process.exit(1);
});
