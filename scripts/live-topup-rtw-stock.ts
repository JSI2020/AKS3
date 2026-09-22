import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const { db, rtwStock, designs, colourways } = await import("@aks/db");
  const { eq } = await import("drizzle-orm");
  const { uuidv7 } = await import("@aks/shared");

  const published = await db
    .select({ id: designs.id, slug: designs.slug })
    .from(designs)
    .where(eq(designs.status, "PUBLISHED"))
    .limit(5);

  console.log("published", published.length);

  for (const d of published) {
    const cws = await db
      .select({ id: colourways.id })
      .from(colourways)
      .where(eq(colourways.designId, d.id))
      .limit(1);
    const cw = cws[0];
    if (!cw) continue;

    for (const size of ["XS", "S", "M", "L", "XL"] as const) {
      const existing = await db
        .select()
        .from(rtwStock)
        .where(eq(rtwStock.designId, d.id))
        .limit(50);
      const row = existing.find(
        (r) => r.colourwayId === cw.id && r.sizeLabel === size,
      );
      if (row) {
        await db
          .update(rtwStock)
          .set({
            quantityOnHand: Math.max(row.quantityOnHand, 5),
            quantityReserved: 0,
            updatedAt: new Date(),
          })
          .where(eq(rtwStock.id, row.id));
      } else {
        await db.insert(rtwStock).values({
          id: uuidv7(),
          designId: d.id,
          colourwayId: cw.id,
          sizeLabel: size,
          quantityOnHand: 5,
          quantityReserved: 0,
          reorderPoint: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
    console.log("stocked", d.slug);
  }

  const sample = await db
    .select({
      slug: designs.slug,
      size: rtwStock.sizeLabel,
      onHand: rtwStock.quantityOnHand,
      reserved: rtwStock.quantityReserved,
    })
    .from(rtwStock)
    .innerJoin(designs, eq(designs.id, rtwStock.designId))
    .where(eq(designs.status, "PUBLISHED"))
    .limit(10);
  console.log(JSON.stringify(sample, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
