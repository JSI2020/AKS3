/**
 * Temporary merchandising photos for soft-launch QA.
 * Uses free Unsplash fashion stills (replace later via Admin → Design Photos / Homepage).
 *
 * Run: npx tsx scripts/seed-temp-merch-photos.ts
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import sharp from "sharp";

type Shot = { url: string; credit: string; label: string };

/**
 * Quiet, covered, natural-cloth lean — Unsplash License (free to use).
 * Not AKS garments; stand-ins until real photography ships.
 */
const TEMP_SHOTS: Shot[] = [
  {
    url: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1200&q=80",
    credit: "Unsplash",
    label: "Ivory tailored set",
  },
  {
    url: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1200&q=80",
    credit: "Unsplash",
    label: "Soft white dress drape",
  },
  {
    url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80",
    credit: "Unsplash",
    label: "Cream editorial look",
  },
  {
    url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1200&q=80",
    credit: "Unsplash",
    label: "Linen street quiet",
  },
  {
    url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80",
    credit: "Unsplash",
    label: "Neutral coat and dress",
  },
  {
    url: "https://images.unsplash.com/photo-1558171813-4c088753af8f?auto=format&fit=crop&w=1200&q=80",
    credit: "Unsplash",
    label: "Bone blouse close",
  },
  {
    url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=80",
    credit: "Unsplash",
    label: "Eastern festive silk",
  },
  {
    url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80",
    credit: "Unsplash",
    label: "Heritage drape",
  },
  {
    url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1200&q=80",
    credit: "Unsplash",
    label: "Long gown line",
  },
  {
    url: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?auto=format&fit=crop&w=1200&q=80",
    credit: "Unsplash",
    label: "Soft maxi length",
  },
  {
    url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80",
    credit: "Unsplash",
    label: "Minimal dress column",
  },
  {
    url: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1200&q=80",
    credit: "Unsplash",
    label: "Red accent occasion",
  },
];

async function downloadJpeg(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { "User-Agent": "AKS-temp-merch-seed/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url.slice(0, 60)}`);
  const raw = Buffer.from(await res.arrayBuffer());
  return sharp(raw)
    .rotate()
    .resize(1200, 1600, { fit: "cover", position: "centre" })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

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
  const { completeUpload, uploadBufferToR2 } = await import(
    "@/modules/platform/assets/r2"
  );
  const { seedContentDefaults } = await import(
    "@/modules/content/seed-defaults"
  );

  console.log("\n=== Seed temporary merch photos (Unsplash stand-ins) ===\n");
  console.log(
    "These are not AKS garments. Replace via Admin → Designs → Photos / Homepage.\n",
  );

  const [owner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "OWNER"))
    .limit(1);
  if (!owner) throw new Error("No OWNER user — create staff first");

  console.log("Ensuring homepage CMS rows…");
  await seedContentDefaults();

  console.log("Downloading temp shots…");
  const buffers: { shot: Shot; jpeg: Buffer; assetId: string }[] = [];
  for (const shot of TEMP_SHOTS) {
    try {
      const jpeg = await downloadJpeg(shot.url);
      const { key } = await uploadBufferToR2({
        body: jpeg,
        mime: "image/jpeg",
        keyPrefix: "temp-merch/unsplash",
      });
      // Always mirror under public/ so local /api/assets/serve works even if
      // MinIO signed URLs are awkward across ports.
      const { saveLocalDevAsset } = await import("@/modules/platform/assets/r2");
      try {
        saveLocalDevAsset(key, jpeg);
      } catch {
        // production-like env — MinIO/R2 only
      }
      const asset = await completeUpload({
        key,
        mime: "image/jpeg",
        uploadedById: owner.id,
        kind: "IMAGE",
      });
      buffers.push({ shot, jpeg, assetId: asset.id });
      console.log(`  ✓ ${shot.label} (${shot.credit}) → ${asset.id}`);
    } catch (e) {
      console.warn(`  ✗ skip ${shot.label}:`, e instanceof Error ? e.message : e);
    }
  }
  if (buffers.length < 3) {
    throw new Error("Too few images downloaded — check network / Unsplash");
  }

  const published = await db
    .select({
      id: designs.id,
      slug: designs.slug,
      name: designs.name,
    })
    .from(designs)
    .where(eq(designs.status, "PUBLISHED"))
    .orderBy(asc(designs.name));

  console.log(`\nAttaching photos to ${published.length} published design(s)…`);
  let updated = 0;
  for (const [i, d] of published.entries()) {
    const a = buffers[i % buffers.length]!;
    const b = buffers[(i + 1) % buffers.length]!;
    const c = buffers[(i + 2) % buffers.length]!;

    const cws = await db
      .select({
        id: colourways.id,
        name: colourways.name,
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
        assetId: a.assetId,
        isAiGenerated: false,
        altText: `${d.name} — temporary front (${a.shot.label})`,
        sortOrder: 0,
      },
      {
        id: uuidv7(),
        designId: d.id,
        colourwayId: defaultCw.id,
        angle: "THREE_QUARTER",
        archetypeId: null,
        assetId: b.assetId,
        isAiGenerated: false,
        altText: `${d.name} — temporary three-quarter (${b.shot.label})`,
        sortOrder: 1,
      },
      {
        id: uuidv7(),
        designId: d.id,
        colourwayId: defaultCw.id,
        angle: "BACK",
        archetypeId: null,
        assetId: c.assetId,
        isAiGenerated: false,
        altText: `${d.name} — temporary back (${c.shot.label})`,
        sortOrder: 2,
      },
      {
        id: uuidv7(),
        designId: d.id,
        colourwayId: altCw.id,
        angle: "FRONT",
        archetypeId: null,
        assetId: b.assetId,
        isAiGenerated: false,
        altText: `${d.name} alt colourway — temporary front`,
        sortOrder: 3,
      },
    ]);
    updated += 1;
  }
  console.log(`  Updated ${updated} design(s).`);

  const publishedHomes = await db
    .select()
    .from(homepages)
    .where(eq(homepages.status, "PUBLISHED"));
  const draftHomes = await db
    .select()
    .from(homepages)
    .where(eq(homepages.status, "DRAFT"));
  const homes = [...publishedHomes, ...draftHomes];

  const heroAsset = buffers[0]!.assetId;
  const doorAssets = [
    buffers[1]!.assetId,
    buffers[2]!.assetId,
    buffers[3 % buffers.length]!.assetId,
    buffers[4 % buffers.length]!.assetId,
  ];

  for (const home of homes) {
    const slides = await db
      .select()
      .from(heroSlides)
      .where(eq(heroSlides.homepageId, home.id))
      .orderBy(asc(heroSlides.sortOrder));
    for (const slide of slides) {
      await db
        .update(heroSlides)
        .set({
          desktopImageAssetId: heroAsset,
          mobileImageAssetId: heroAsset,
          updatedAt: new Date(),
        })
        .where(eq(heroSlides.id, slide.id));
    }
    if (!slides.length) {
      const { hashLink } = await import("@/modules/content/types");
      await db.insert(heroSlides).values({
        id: uuidv7(),
        homepageId: home.id,
        sortOrder: 0,
        eyebrow: "Quiet luxury · rooted in heritage",
        headline: "Eastern lines, Western calm",
        subtext:
          "Ready-to-wear pieces in natural cloth — chosen for how they drape.",
        buttonLabel: "See the collections",
        buttonLink: hashLink("#cats"),
        textPosition: "LEFT",
        overlayStrength: 45,
        desktopImageAssetId: heroAsset,
        mobileImageAssetId: heroAsset,
        active: true,
      });
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
          imageAssetId: doorAssets[ti % doorAssets.length]!,
          updatedAt: new Date(),
        })
        .where(eq(categoryTiles.id, tile.id));
    }
  }
  console.log(
    `\nHomepage hero + category doors updated on ${homes.length} homepage row(s).`,
  );
  console.log(
    `\nDone. Browse /en — replace later in admin when real AKS photos arrive.\n`,
  );

  await sql.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
