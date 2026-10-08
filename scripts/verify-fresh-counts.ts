import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const { sql } = await import("@aks/db");
  const [row] = await sql<
    {
      published: number;
      fabrics: number;
      with_swatch: number;
      orders: number;
      rtw: number;
      renders: number;
      heroes: number;
    }[]
  >`
    select
      (select count(*)::int from designs where status = 'PUBLISHED') as published,
      (select count(*)::int from fabrics where active) as fabrics,
      (select count(*)::int from fabrics where active and swatch_asset_id is not null) as with_swatch,
      (select count(*)::int from orders) as orders,
      (select count(*)::int from rtw_stock) as rtw,
      (select count(*)::int from design_renders) as renders,
      (select count(*)::int from hero_slides where desktop_image_asset_id is not null) as heroes`;

  const doors = await sql<{ door: string; looks: number }[]>`
    select lower(t.value) as door, count(distinct d.id)::int as looks
    from designs d
    join design_tags t on t.design_id = d.id
    where d.status = 'PUBLISHED'
      and lower(t.value) in ('essentials','tailored','occasion','signature','separates')
    group by 1
    order by 1`;

  console.log(row);
  console.log("doors", doors);
  await sql.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
