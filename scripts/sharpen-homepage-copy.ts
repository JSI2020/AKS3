import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

/**
 * Idempotent copy refresh for the storefront homepage. Matches on the exact
 * current text and swaps in sharper lines on BOTH the draft and published
 * homepage rows. Touches text only — images, buttons, links, ordering and the
 * hero headline are left untouched. Safe to re-run: a second pass finds the new
 * text already in place and changes nothing.
 */
async function main() {
  const { db, heroSlides, featuredBlocks, categoryTiles } = await import(
    "@aks/db"
  );
  const { eq } = await import("drizzle-orm");

  // --- Hero: eyebrow + subtext (keep headline "The cut is the *ornament*.") ---
  const HERO_EYEBROW_OLD = "Quiet luxury · rooted in heritage";
  const HERO_EYEBROW_NEW = "Quiet luxury, cut by hand";
  const HERO_SUB_OLD =
    "Heritage silhouettes in matte natural cloth — refined by proportion, drape and finishing. Nothing added to be seen; everything made to be felt.";
  const HERO_SUB_NEW =
    "Eastern silhouette, Western restraint – in matte natural cloth shaped by proportion and drape. Nothing added to be seen; everything made to be felt.";

  let heroCount = 0;
  const slides = await db.select().from(heroSlides);
  for (const s of slides) {
    const patch: Partial<{ eyebrow: string; subtext: string }> = {};
    if (s.eyebrow === HERO_EYEBROW_OLD) patch.eyebrow = HERO_EYEBROW_NEW;
    if (s.subtext === HERO_SUB_OLD) patch.subtext = HERO_SUB_NEW;
    if (Object.keys(patch).length > 0) {
      await db
        .update(heroSlides)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(heroSlides.id, s.id));
      heroCount += 1;
    }
  }

  // --- Manifesto (STATEMENT block). *…* = italic accent span at render. ---
  const STMT_OLD =
    "The market signals value through what it *adds*. We signal it through what remains — *proportion, drape, and finishing*. Unmistakably Pakistani in silhouette, contemporary and covered in cut.";
  const STMT_NEW =
    "Most labels signal value by what they *add*. We signal it by what *remains*: proportion, drape, and a finish you can only reach by hand. Pakistani in silhouette, quiet in intent – made to outlast the season it's bought in.";

  let stmtCount = 0;
  const blocks = await db.select().from(featuredBlocks);
  for (const b of blocks) {
    if (b.kind !== "STATEMENT") continue;
    const payload = b.payload as { text?: string };
    if (payload.text === STMT_OLD) {
      await db
        .update(featuredBlocks)
        .set({ payload: { ...payload, text: STMT_NEW }, updatedAt: new Date() })
        .where(eq(featuredBlocks.id, b.id));
      stmtCount += 1;
    }
  }

  // --- Category captions (by key) ---
  const CAPTIONS: Record<string, { old: string; next: string }> = {
    ESSENTIALS: {
      old: "Everyday · khaddi & cotton silk",
      next: "The everyday, quietly elevated",
    },
    TAILORED: {
      old: "Structured · clean line",
      next: "Structure, softened by hand",
    },
    OCCASION: {
      old: "Restrained · covered",
      next: "Covered, and never overstated",
    },
    SIGNATURE: {
      old: "The statement pieces",
      next: "The pieces we're known for",
    },
  };

  let tileCount = 0;
  const tiles = await db.select().from(categoryTiles);
  for (const t of tiles) {
    const rule = CAPTIONS[t.categoryKey.toUpperCase()];
    if (rule && t.caption === rule.old) {
      await db
        .update(categoryTiles)
        .set({ caption: rule.next, updatedAt: new Date() })
        .where(eq(categoryTiles.id, t.id));
      tileCount += 1;
    }
  }

  console.log(
    `Updated: ${heroCount} hero slide(s), ${stmtCount} statement block(s), ${tileCount} category tile(s).`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
