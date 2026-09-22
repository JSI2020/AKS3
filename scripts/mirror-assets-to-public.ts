/**
 * Pull recent temp-merch / design asset bytes from MinIO into public/
 * so /api/assets/serve works without signed URLs.
 *
 * Run: npx tsx scripts/mirror-assets-to-public.ts
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const { db, assets, sql } = await import("@aks/db");
  const { desc, like, or } = await import("drizzle-orm");
  const { getObjectBytes, saveLocalDevAsset } = await import(
    "@/modules/platform/assets/r2"
  );

  const rows = await db
    .select({ id: assets.id, key: assets.r2Key })
    .from(assets)
    .where(
      or(
        like(assets.r2Key, "temp-merch/%"),
        like(assets.r2Key, "designs/demo/%"),
      ),
    )
    .orderBy(desc(assets.createdAt))
    .limit(200);

  console.log(`Mirroring ${rows.length} asset(s) to public/…`);
  let ok = 0;
  for (const row of rows) {
    try {
      const bytes = await getObjectBytes(row.key);
      saveLocalDevAsset(row.key, bytes);
      ok += 1;
    } catch (e) {
      console.warn(`  skip ${row.key}:`, e instanceof Error ? e.message : e);
    }
  }
  console.log(`Done — ${ok}/${rows.length} mirrored.`);
  await sql.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
