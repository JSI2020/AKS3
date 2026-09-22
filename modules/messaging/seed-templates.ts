import { and, desc, eq } from "drizzle-orm";

import { db, messageTemplates } from "@aks/db";
import { uuidv7 } from "@aks/shared";

import { MESSAGE_TEMPLATE_SEEDS } from "./templates";

/**
 * Inserts missing templates, and bumps version when seed body/subject changed
 * (so dispatch AWB copy lands without wiping admin edits to other keys).
 */
export async function seedMessageTemplatesIntoDb(): Promise<void> {
  for (const seed of MESSAGE_TEMPLATE_SEEDS) {
    const [latest] = await db
      .select({
        id: messageTemplates.id,
        version: messageTemplates.version,
        subject: messageTemplates.subject,
        body: messageTemplates.body,
      })
      .from(messageTemplates)
      .where(
        and(
          eq(messageTemplates.key, seed.key),
          eq(messageTemplates.channel, "EMAIL"),
          eq(messageTemplates.locale, seed.locale),
        ),
      )
      .orderBy(desc(messageTemplates.version))
      .limit(1);

    if (
      latest &&
      latest.subject === seed.subject &&
      latest.body === seed.body
    ) {
      continue;
    }

    await db.insert(messageTemplates).values({
      id: uuidv7(),
      key: seed.key,
      channel: "EMAIL",
      locale: seed.locale,
      version: (latest?.version ?? 0) + 1,
      subject: seed.subject,
      body: seed.body,
    });
  }
}
