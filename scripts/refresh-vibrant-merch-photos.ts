/**
 * Replace storefront merch photos with vibrant Pakistani East–West looks
 * (tea rose, olive, gold, oxblood, sapphire, terracotta, emerald, etc.).
 *
 * Run: npx tsx --env-file=.env.local scripts/refresh-vibrant-merch-photos.ts
 */
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";

config({ path: ".env.local" });
config({ path: ".env" });

const VIBRANT_DIR = path.join(process.cwd(), "public/aks-merch/vibrant");

async function main() {
  const { and, asc, eq } = await import("drizzle-orm");
  const {
    categoryTiles,
    colourways,
    db,
    designRenders,
    designs,
    heroSlides,
    homepages,
    sql,
    users,
  } = await import("@aks/db");
  const { uuidv7 } = await import("@aks/shared");
  const { completeUpload, saveLocalDevAsset, uploadBufferToR2 } = await import(
    "@/modules/platform/assets/r2"
  );

  const files = fs
    .readdirSync(VIBRANT_DIR)
    .filter((f) => /^vibrant-.*\.(jpe?g|png)$/i.test(f))
    .sort()
    .map((f) => path.join(VIBRANT_DIR, f));
  if (files.length < 8) {
    throw new Error(`Need vibrant photos in ${VIBRANT_DIR}, found ${files.length}`);
  }

  const [owner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "OWNER"))
    .limit(1);
  if (!owner) throw new Error("No OWNER");

  console.log(`\n=== Refresh vibrant merch photos (${files.length}) ===\n`);

  const assetIds: string[] = [];
  for (const fp of files) {
    const body = fs.readFileSync(fp);
    const mime = fp.endsWith(".png") ? "image/png" : "image/jpeg";
    const { key } = await uploadBufferToR2({
      body,
      mime,
      keyPrefix: "aks-merch/vibrant",
    });
    try {
      saveLocalDevAsset(key, body);
    } catch {
      /* ok */
    }
    const asset = await completeUpload({
      key,
      mime,
      uploadedById: owner.id,
      kind: "IMAGE",
    });
    assetIds.push(asset.id);
    console.log(`  ✓ ${path.basename(fp)}`);
  }

  const published = await db
    .select({ id: designs.id, name: designs.name })
    .from(designs)
    .where(eq(designs.status, "PUBLISHED"))
    .orderBy(asc(designs.name));

  // Spread colours so neighbouring cards don't share the same look
  const stride = 7;
  let updated = 0;
  for (const [i, d] of published.entries()) {
    const a = assetIds[(i * stride) % assetIds.length]!;
    const b = assetIds[(i * stride + 5) % assetIds.length]!;
    const c = assetIds[(i * stride + 11) % assetIds.length]!;

    const cws = await db
      .select({
        id: colourways.id,
        isDefault: colourways.isDefault,
      })
      .from(colourways)
      .where(and(eq(colourways.designId, d.id), eq(colourways.active, true)))
      .orderBy(asc(colourways.sortOrder));
    if (!cws.length) continue;
    const defaultCw = cws.find((x) => x.isDefault) ?? cws[0]!;
    const altCw = cws.find((x) => x.id !== defaultCw.id) ?? defaultCw;

    await db.delete(designRenders).where(eq(designRenders.designId, d.id));
    await db.insert(designRenders).values([
      {
        id: uuidv7(),
        designId: d.id,
        colourwayId: defaultCw.id,
        angle: "FRONT",
        archetypeId: null,
        assetId: a,
        isAiGenerated: true,
        altText: `${d.name} — front`,
        sortOrder: 0,
      },
      {
        id: uuidv7(),
        designId: d.id,
        colourwayId: defaultCw.id,
        angle: "THREE_QUARTER",
        archetypeId: null,
        assetId: b,
        isAiGenerated: true,
        altText: `${d.name} — three-quarter`,
        sortOrder: 1,
      },
      {
        id: uuidv7(),
        designId: d.id,
        colourwayId: defaultCw.id,
        angle: "BACK",
        archetypeId: null,
        assetId: c,
        isAiGenerated: true,
        altText: `${d.name} — back`,
        sortOrder: 2,
      },
      {
        id: uuidv7(),
        designId: d.id,
        colourwayId: altCw.id,
        angle: "FRONT",
        archetypeId: null,
        assetId: b,
        isAiGenerated: true,
        altText: `${d.name} alt shade — front`,
        sortOrder: 3,
      },
    ]);
    updated += 1;
    if (updated <= 5 || updated === published.length) {
      console.log(`  ${d.name}`);
    } else if (updated === 6) {
      console.log("  …");
    }
  }
  console.log(`Updated ${updated} design(s).`);

  const homes = await db.select().from(homepages);
  const heroA = assetIds[0]!;
  const heroB = assetIds[Math.min(3, assetIds.length - 1)]!;
  const doors = [
    assetIds[1 % assetIds.length]!,
    assetIds[2 % assetIds.length]!,
    assetIds[5 % assetIds.length]!,
    assetIds[7 % assetIds.length]!,
  ];

  for (const home of homes) {
    const slides = await db
      .select()
      .from(heroSlides)
      .where(eq(heroSlides.homepageId, home.id))
      .orderBy(asc(heroSlides.sortOrder));
    for (const [si, slide] of slides.entries()) {
      const asset = si === 0 ? heroA : heroB;
      await db
        .update(heroSlides)
        .set({
          desktopImageAssetId: asset,
          mobileImageAssetId: asset,
          updatedAt: new Date(),
        })
        .where(eq(heroSlides.id, slide.id));
    }
    const tiles = await db
      .select()
      .from(categoryTiles)
      .where(eq(categoryTiles.homepageId, home.id))
      .orderBy(asc(categoryTiles.sortOrder));
    for (const [ti, tile] of tiles.entries()) {
      await db
        .update(categoryTiles)
        .set({
          imageAssetId: doors[ti % doors.length]!,
          updatedAt: new Date(),
        })
        .where(eq(categoryTiles.id, tile.id));
    }
  }
  console.log(`Homepage wired on ${homes.length} row(s).`);
  console.log("\nDone — hard-refresh /\n");

  await sql.end({ timeout: 5 });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
