/**
 * AKS-true merch photos for soft-launch QA.
 *
 * Product cards: modest East–West boutique apparel (Eastern silhouette,
 * quiet Western line) — NOT runway / loud fashion Unsplash.
 * Homepage: White Collection only — milk · ivory · bone · cream cloth.
 *
 * Replace later via Admin → Design Photos / Homepage with real AKS shoots.
 *
 * Run: npx tsx scripts/seed-temp-merch-photos.ts
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import sharp from "sharp";

import {
  downloadDesignPhoto,
  fetchBoutiquePhotoCatalog,
  photoTripletForDesign,
  type DesignPhotoCatalog,
} from "./demo-design-photo-sources";
import type { CatalogueLook } from "../packages/db/house-catalogue-looks";

type Shot = { url: string; credit: string; label: string };

function u(id: string): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=85`;
}

/**
 * White Collection homepage only — milk / ivory / bone / cream.
 * No bright coats, no runway stare, no shopping-bag fashion.
 */
const WHITE_COLLECTION_SHOTS: Shot[] = [
  { url: u("photo-1713881587420-113c1c43e28a"), credit: "Unsplash", label: "Ivory linen mandarin tunic" },
  { url: u("photo-1752825609278-f9696bc9d7bd"), credit: "Unsplash", label: "Bone linen shirt drape" },
  { url: u("photo-1713881676551-b16f22ce4719"), credit: "Unsplash", label: "Bone linen blouson" },
  { url: u("photo-1585487000160-6ebcfceb0d03"), credit: "Unsplash", label: "Modest cream mandarin dress" },
  { url: u("photo-1610030469983-98e550d6193c"), credit: "Unsplash", label: "Ivory dress, quiet doorway" },
  { url: u("photo-1566174053879-31528523f8ae"), credit: "Unsplash", label: "Cream dress, soft architecture" },
  { url: u("photo-1621184455862-c163dfb30e0f"), credit: "Unsplash", label: "White dress, wind and cloth" },
  { url: u("photo-1596783074918-c84cb06531ca"), credit: "Unsplash", label: "Soft maxi, covered line" },
  { url: u("photo-1490481651871-ab68de25d43d"), credit: "Unsplash", label: "Cream hangers, atelier calm" },
  { url: u("photo-1637110276019-df15ad496674"), credit: "Unsplash", label: "Hand gathering linen" },
  { url: u("photo-1545042746-ec9e5a59b359"), credit: "Unsplash", label: "Linen textile stack" },
  { url: u("photo-1558171813-4c088753af8f"), credit: "Unsplash", label: "Sewing table, quiet cloth" },
];

async function toJpeg(raw: Buffer): Promise<Buffer> {
  return sharp(raw)
    .rotate()
    .resize(1200, 1600, { fit: "cover", position: "centre" })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}

function categoryFromComponents(
  components: string[] | null,
): CatalogueLook["category"] {
  const key = (components?.[0] ?? "KAMEEZ").toUpperCase();
  if (
    key === "TROUSER" ||
    key === "DUPATTA" ||
    key === "GOWN" ||
    key === "SKIRT"
  ) {
    return key;
  }
  return "KAMEEZ";
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
  const { completeUpload, saveLocalDevAsset, uploadBufferToR2 } = await import(
    "@/modules/platform/assets/r2"
  );
  const { seedContentDefaults } = await import(
    "@/modules/content/seed-defaults"
  );

  console.log("\n=== Seed AKS-true merch photos ===\n");
  console.log(
    "Product: modest East–West boutique apparel · Homepage: White Collection neutrals.\n",
  );

  const [owner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "OWNER"))
    .limit(1);
  if (!owner) throw new Error("No OWNER user — create staff first");

  console.log("Ensuring homepage CMS rows…");
  await seedContentDefaults();

  console.log("Fetching modest East–West boutique catalogues…");
  const catalog: DesignPhotoCatalog = await fetchBoutiquePhotoCatalog();
  for (const [cat, pool] of catalog.entries()) {
    console.log(`  ${cat}: ${pool.length}`);
  }

  const published = await db
    .select({
      id: designs.id,
      slug: designs.slug,
      name: designs.name,
      components: designs.components,
    })
    .from(designs)
    .where(eq(designs.status, "PUBLISHED"))
    .orderBy(asc(designs.name));

  console.log(
    `\nAttaching boutique triplets to ${published.length} published design(s)…`,
  );

  let updated = 0;
  for (const [i, d] of published.entries()) {
    const category = categoryFromComponents(d.components);
    const triplet = photoTripletForDesign(i, category, catalog);
    const angles = ["FRONT", "THREE_QUARTER", "BACK"] as const;

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

    const defaultCw = cws.find((c) => c.isDefault) ?? cws[0]!;
    const altCw = cws.find((c) => c.id !== defaultCw.id) ?? defaultCw;

    const assetIds: string[] = [];
    for (const url of triplet.urls) {
      try {
        const jpeg = await toJpeg(await downloadDesignPhoto(url));
        const { key } = await uploadBufferToR2({
          body: jpeg,
          mime: "image/jpeg",
          keyPrefix: "temp-merch/east-west",
        });
        try {
          saveLocalDevAsset(key, jpeg);
        } catch {
          // R2-only envs
        }
        const asset = await completeUpload({
          key,
          mime: "image/jpeg",
          uploadedById: owner.id,
          kind: "IMAGE",
        });
        assetIds.push(asset.id);
      } catch (e) {
        console.warn(
          `  skip angle for ${d.slug}:`,
          e instanceof Error ? e.message : e,
        );
      }
    }
    if (assetIds.length < 3) {
      console.warn(`  ✗ ${d.slug} — need 3 angles, got ${assetIds.length}`);
      continue;
    }

    await db.delete(designRenders).where(eq(designRenders.designId, d.id));
    await db.insert(designRenders).values([
      ...angles.map((angle, idx) => ({
        id: uuidv7(),
        designId: d.id,
        colourwayId: defaultCw.id,
        angle,
        archetypeId: null,
        assetId: assetIds[idx]!,
        isAiGenerated: false,
        altText: `${d.name} — ${angle.toLowerCase().replace(/_/g, " ")} (${triplet.productTitle})`,
        sortOrder: idx,
      })),
      {
        id: uuidv7(),
        designId: d.id,
        colourwayId: altCw.id,
        angle: "FRONT" as const,
        archetypeId: null,
        assetId: assetIds[1]!,
        isAiGenerated: false,
        altText: `${d.name} alt shade — front`,
        sortOrder: 3,
      },
    ]);

    updated += 1;
    if (updated <= 6 || updated === published.length) {
      console.log(
        `  ✓ ${d.name} ← ${triplet.productTitle.slice(0, 42)} (${triplet.credit})`,
      );
    } else if (updated === 7) {
      console.log("  …");
    }
  }
  console.log(`  Updated ${updated} design(s).`);

  console.log("\nWiring White Collection homepage hero + door tiles…");
  const whiteAssets: string[] = [];
  for (const shot of WHITE_COLLECTION_SHOTS) {
    try {
      const res = await fetch(shot.url, {
        headers: { "User-Agent": "AKS-white-collection-seed/1.0" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const jpeg = await toJpeg(Buffer.from(await res.arrayBuffer()));
      const { key } = await uploadBufferToR2({
        body: jpeg,
        mime: "image/jpeg",
        keyPrefix: "temp-merch/white-collection",
      });
      try {
        saveLocalDevAsset(key, jpeg);
      } catch {
        // ignore
      }
      const asset = await completeUpload({
        key,
        mime: "image/jpeg",
        uploadedById: owner.id,
        kind: "IMAGE",
      });
      whiteAssets.push(asset.id);
      console.log(`  ✓ ${shot.label}`);
    } catch (e) {
      console.warn(
        `  ✗ skip ${shot.label}:`,
        e instanceof Error ? e.message : e,
      );
    }
  }
  if (whiteAssets.length < 4) {
    throw new Error("Too few White Collection shots for homepage");
  }

  const publishedHomes = await db
    .select()
    .from(homepages)
    .where(eq(homepages.status, "PUBLISHED"));
  const draftHomes = await db
    .select()
    .from(homepages)
    .where(eq(homepages.status, "DRAFT"));
  const homes = [...publishedHomes, ...draftHomes];

  const heroAsset = whiteAssets[0]!;
  const lookbookAsset = whiteAssets[1]!;
  const doorAssets = [
    whiteAssets[2]!,
    whiteAssets[3]!,
    whiteAssets[4 % whiteAssets.length]!,
    whiteAssets[5 % whiteAssets.length]!,
  ];

  for (const home of homes) {
    const slides = await db
      .select()
      .from(heroSlides)
      .where(eq(heroSlides.homepageId, home.id))
      .orderBy(asc(heroSlides.sortOrder));

    for (const [si, slide] of slides.entries()) {
      await db
        .update(heroSlides)
        .set({
          desktopImageAssetId: si === 0 ? heroAsset : lookbookAsset,
          mobileImageAssetId: si === 0 ? heroAsset : lookbookAsset,
          updatedAt: new Date(),
        })
        .where(eq(heroSlides.id, slide.id));
    }

    if (!slides.length) {
      const { hashLink } = await import("@/modules/content/types");
      await db.insert(heroSlides).values([
        {
          id: uuidv7(),
          homepageId: home.id,
          sortOrder: 0,
          eyebrow: "Quiet luxury · rooted in heritage",
          headline: "The cut is the ornament.",
          subtext:
            "Eastern silhouette, Western restraint — in matte natural cloth.",
          buttonLabel: "Enter the house",
          buttonLink: hashLink("#cats"),
          textPosition: "LEFT",
          overlayStrength: 45,
          desktopImageAssetId: heroAsset,
          mobileImageAssetId: heroAsset,
          active: true,
        },
        {
          id: uuidv7(),
          homepageId: home.id,
          sortOrder: 1,
          eyebrow: "Lookbook",
          headline: "See how the cloth moves.",
          subtext: "Cut, drape, and quiet finishes — nothing added to be seen.",
          buttonLabel: "View the edit",
          buttonLink: hashLink("#edit"),
          textPosition: "LEFT",
          overlayStrength: 40,
          desktopImageAssetId: lookbookAsset,
          mobileImageAssetId: lookbookAsset,
          active: true,
        },
      ]);
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
    `\nHomepage White Collection wired on ${homes.length} homepage row(s).`,
  );
  console.log(
    `\nDone — ${updated} design(s) with East–West boutique photos. Browse /\n`,
  );

  await sql.end({ timeout: 5 });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
