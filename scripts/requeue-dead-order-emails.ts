import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

/**
 * Requeue DEAD message.send jobs that failed only because templates were missing.
 * Also closes stuck PENDING message_log rows tied to fake/undeliverable recipients.
 *
 * Run: npm run messaging:requeue-dead-emails
 */
async function main() {
  const { sql } = await import("@aks/db");
  const { seedMessageTemplatesIntoDb } = await import(
    "../modules/messaging/seed-templates"
  );

  await seedMessageTemplatesIntoDb();
  console.log("templates ensured");

  const requeued = await sql<{ id: string }[]>`
    update outbox
    set
      status = 'PENDING',
      attempts = 0,
      last_error = null,
      available_at = now(),
      updated_at = now()
    where topic = 'message.send'
      and status = 'DEAD'
      and last_error like 'No template found for %'
      and coalesce(payload->>'recipient', '') not like '%@example.com'
      and coalesce(payload->>'recipient', '') not like '%@aks.local'
    returning id`;

  // Fake-domain DEAD jobs: close them cleanly (never deliverable via Resend).
  const abandoned = await sql<{ id: string }[]>`
    update outbox
    set
      last_error = coalesce(last_error, '') || ' · abandoned: undeliverable seed recipient',
      updated_at = now()
    where topic = 'message.send'
      and status = 'DEAD'
      and (
        coalesce(payload->>'recipient', '') like '%@example.com'
        or coalesce(payload->>'recipient', '') like '%@aks.local'
      )
    returning id`;

  const logsFailed = await sql<{ id: string }[]>`
    update message_log
    set
      status = 'FAILED',
      error = coalesce(error, 'No template found (historical) — abandoned undeliverable/seed recipient')
    where status = 'PENDING'
      and template_key like 'order.%'
      and template_key not like 'whatsapp.%'
      and (
        recipient like '%@example.com'
        or recipient like '%@aks.local'
        or recipient like '03%'
      )
    returning id`;

  const logsReset = await sql<{ id: string }[]>`
    update message_log
    set status = 'PENDING', error = null
    where status in ('PENDING', 'FAILED')
      and template_key like 'order.%'
      and template_key not like 'whatsapp.%'
      and recipient not like '%@example.com'
      and recipient not like '%@aks.local'
      and id in (
        select (payload->>'messageLogId')::uuid
        from outbox
        where topic = 'message.send'
          and status = 'PENDING'
          and payload->>'messageLogId' is not null
      )
    returning id`;

  console.log(`requeued outbox (real recipients): ${requeued.length}`);
  console.log(`abandoned fake-recipient DEAD: ${abandoned.length}`);
  console.log(`message_log closed (seed/fake): ${logsFailed.length}`);
  console.log(`message_log reset for requeue: ${logsReset.length}`);

  await sql.end({ timeout: 5 });
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
