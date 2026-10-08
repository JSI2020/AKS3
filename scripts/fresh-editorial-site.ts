/**
 * Brand-new local site: wipe all business data, then rebuild admin pipelines
 * with the house catalogue (10 looks × 5 doors) + editorial Unsplash photos.
 *
 * Run: npx tsx --env-file=.env.local scripts/fresh-editorial-site.ts
 */
import { config } from "dotenv";
import { execSync } from "node:child_process";

config({ path: ".env.local" });
config({ path: ".env" });

function run(cmd: string, env: Record<string, string> = {}) {
  console.log(`\n>>> ${cmd}\n`);
  execSync(cmd, {
    stdio: "inherit",
    env: { ...process.env, ...env },
    shell: true,
  });
}

async function seedPromo() {
  const { db, announcements, discounts } = await import("@aks/db");
  const { uuidv7 } = await import("@aks/shared");

  await db.insert(discounts).values([
    {
      id: uuidv7(),
      code: null,
      name: "Soft launch — house 10%",
      type: "PERCENTAGE",
      value: 10,
      appliesTo: "ORDER",
      targetIds: [],
      minSpendMinor: 0,
      maxDiscountMinor: null,
      firstOrderOnly: false,
      oncePerCustomer: false,
      usageLimit: null,
      usageCount: 0,
      startsAt: new Date(),
      endsAt: null,
      stackable: false,
      status: "ACTIVE",
    },
    {
      id: uuidv7(),
      code: "AKSWELCOME",
      name: "Welcome — PKR 2,000 off",
      type: "FIXED_AMOUNT",
      value: 200_000,
      appliesTo: "ORDER",
      targetIds: [],
      minSpendMinor: 1_500_000,
      maxDiscountMinor: null,
      firstOrderOnly: true,
      oncePerCustomer: true,
      usageLimit: 500,
      usageCount: 0,
      startsAt: new Date(),
      endsAt: null,
      stackable: false,
      status: "ACTIVE",
    },
  ]);

  await db.insert(announcements).values([
    {
      id: uuidv7(),
      message:
        "Ready to wear, cut by hand · Free shipping within Pakistan",
      link: { type: "collection", value: "essentials" },
      active: true,
      sortOrder: 0,
      startsAt: null,
      endsAt: null,
    },
    {
      id: uuidv7(),
      message: "White Collection looks live — enter Signature",
      link: { type: "collection", value: "signature" },
      active: true,
      sortOrder: 1,
      startsAt: null,
      endsAt: null,
    },
  ]);
  console.log("discounts + announcements seeded");
}

async function verify() {
  const { sql } = await import("@aks/db");
  const [row] = await sql<
    {
      published: number;
      fabrics: number;
      orders: number;
      customers: number;
      rtw: number;
      renders: number;
      heroes: number;
    }[]
  >`
    select
      (select count(*)::int from designs where status = 'PUBLISHED') as published,
      (select count(*)::int from fabrics where active) as fabrics,
      (select count(*)::int from orders) as orders,
      (select count(*)::int from users where role = 'CUSTOMER') as customers,
      (select count(*)::int from rtw_stock) as rtw,
      (select count(*)::int from design_renders) as renders,
      (select count(*)::int from hero_slides) as heroes`;
  console.log("\n=== VERIFY ===");
  console.log(row);
  await sql.end({ timeout: 5 });
  return row;
}

async function main() {
  console.log("\n=== AKS fresh editorial site ===\n");

  run("npx tsx scripts/db-wipe-all-data.ts --confirm --bootstrap");
  run("npx tsx scripts/ensure-house-collections.ts");
  run("npx tsx scripts/ensure-default-size-block-rows.ts");
  run("npx tsx scripts/seed-staff-employees.ts");

  // Soft-launch pipeline (admin catalogue-writer path)
  run("npm run launch:1");
  run("npm run launch:2");
  run("npm run launch:3", { SEED_LAUNCH_FABRIC_LOTS: "1" });
  run("npm run launch:4");

  await seedPromo();

  run("npx tsx scripts/seed-temp-merch-photos.ts");
  run("npm run db:seed:inventory");
  run("npm run db:seed:pipeline");
  run("npm run db:seed:admin-orders");
  run("npm run db:seed:portal");
  run("npm run db:seed:message-templates");

  run("npm run launch:5");

  const counts = await verify();
  if ((counts?.published ?? 0) < 40) {
    throw new Error(`Expected ≥40 published designs, got ${counts?.published}`);
  }
  if ((counts?.renders ?? 0) < 80) {
    throw new Error(`Expected design renders, got ${counts?.renders}`);
  }

  console.log("\n=== DONE ===");
  console.log("Storefront: http://localhost:3000/");
  console.log("Admin:      http://localhost:3000/admin/login");
  console.log("OTP:        npm run dev:admin-code\n");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
