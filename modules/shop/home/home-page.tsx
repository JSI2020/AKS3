import { getTranslations } from "next-intl/server";
import { cloneElement, isValidElement } from "react";

import { getPublishedDesigns } from "@/modules/catalog/queries";
import { getContentList } from "@/modules/content/pages";
import { loadStorefrontHomepage } from "@/modules/content/homepage";
import { DEFAULT_SECTIONS_ORDER } from "@/modules/content/types";
import { listHouseCollections } from "@/modules/catalog/house-collections-queries";
import {
  automaticPercentForDesign,
  loadActiveAutomaticPercentDiscounts,
} from "@/modules/discounts/storefront-badges";

import { Atelier } from "./atelier";
import { CategoryDoors } from "./category-doors";
import { EditGrid } from "./edit-grid";
import { FabricLibrary } from "./fabric-library";
import { HomeHero } from "./hero";
import { Lookbook } from "./lookbook";
import { HomeStatement } from "./statement";

function sectionOn(enabled: Record<string, boolean>, key: string): boolean {
  return enabled[key] !== false;
}

/** Ensure newer section keys appear even when CMS order predates them. */
function normalizeSectionOrder(order: string[]): string[] {
  if (order.includes("lookbook")) return order;
  const next = [...order];
  const cats = next.indexOf("categories");
  if (cats >= 0) {
    next.splice(cats + 1, 0, "lookbook");
    return next;
  }
  const edit = next.indexOf("edit");
  if (edit >= 0) {
    next.splice(edit, 0, "lookbook");
    return next;
  }
  return [...DEFAULT_SECTIONS_ORDER];
}

export async function HomePage() {
  const t = await getTranslations("HomeProto");
  const [homepage, autoDiscounts, collections] = await Promise.all([
    loadStorefrontHomepage(),
    loadActiveAutomaticPercentDiscounts(),
    listHouseCollections({ activeOnly: true }),
  ]);

  const doorLabels = Object.fromEntries(
    collections.flatMap((c) => [[c.tag, c.navLabel]]),
  );
  doorLabels.WHITE_COLLECTION =
    collections.find((c) => c.slug === "signature")?.navLabel ?? "Signature";

  const editDoorFilters = collections
    .filter((c) => c.slug !== "separates")
    .slice(0, 4)
    .map((c) => ({ label: c.navLabel, tag: c.tag }));

  const editMode = homepage?.edit.mode ?? "auto";
  const handpicked = homepage?.edit.designIds ?? [];

  let designs;
  if (editMode === "handpicked" && handpicked.length > 0) {
    const { items } = await getPublishedDesigns({
      filters: { designIds: handpicked },
      sort: "newest",
      pageSize: Math.min(48, handpicked.length),
    });
    const byId = new Map(items.map((d) => [d.id, d]));
    designs = handpicked
      .map((id) => byId.get(id))
      .filter(Boolean)
      .slice(0, 12) as typeof items;
  } else {
    const { items } = await getPublishedDesigns({
      sort: "newest",
      pageSize: 48,
    });
    designs = items;
  }

  designs = designs.map((d) => ({
    ...d,
    automaticPercentOff: automaticPercentForDesign({
      designId: d.id,
      freeTags: d.freeTags,
      garmentTypeKey: d.garmentTypeKey,
      discounts: autoDiscounts,
    }),
  }));

  const construction = await getContentList("CONSTRUCTION");
  const signatures =
    construction.length > 0
      ? construction.map((c) => c.text)
      : (t.raw("signatures") as string[]);

  const statementText = homepage?.statement || t("statement");

  const order = normalizeSectionOrder(
    homepage?.sectionsOrder?.length
      ? homepage.sectionsOrder
      : [...DEFAULT_SECTIONS_ORDER],
  );
  const enabled = homepage?.sectionsEnabled ?? {};

  const heroSlide = homepage?.heroes[0] ?? null;
  const lookbookHero = homepage?.heroes[1] ?? null;
  const tiles = homepage?.tiles ?? [];
  const lookbookDesign = designs[0] ?? null;
  const lookbookImage =
    lookbookHero?.desktopImageUrl ||
    lookbookHero?.mobileImageUrl ||
    lookbookDesign?.thumbnail?.url ||
    null;

  const heroFallback = {
    eyebrow: t("heroEyebrow"),
    line1: t("heroLine1"),
    line2: t.rich("heroLine2", {
      em: (chunks) => <em>{chunks}</em>,
    }),
    sub: t("heroSub"),
    cta: t("heroCta"),
    slotTag: t("heroSlotTag"),
    slotCap: t("heroSlotCap"),
  };

  const sections: Record<string, React.ReactNode> = {
    hero: <HomeHero slide={heroSlide} fallback={heroFallback} />,
    statement: <HomeStatement text={statementText} />,
    categories: (
      <CategoryDoors
        tiles={tiles}
        fallbackDoors={collections}
        eyebrow={t("heroEyebrow")}
        title={t("catsTitle")}
        exploreTemplate={(name) => t("exploreDoor", { name })}
      />
    ),
    lookbook: (
      <Lookbook
        design={lookbookDesign}
        imageUrl={lookbookImage}
        eyebrow={t("lookbookEyebrow")}
        line={t("lookbookLine")}
        cta={t("lookbookCta")}
      />
    ),
    edit: (
      <EditGrid
        designs={designs}
        doorFilters={editDoorFilters}
        doorLabels={doorLabels}
      />
    ),
    fabric: <FabricLibrary />,
    atelier: (
      <Atelier
        signatures={signatures}
        eyebrow={t("atelierEyebrow")}
        title={t("atelierTitle")}
        p1={t("atelierP1")}
        p2={t("atelierP2")}
        aksLine={t.rich("atelierAks", {
          em: (chunks) => <em>{chunks}</em>,
        })}
      />
    ),
  };

  return (
    <main>
      {order.map((key) => {
        if (!sectionOn(enabled, key)) return null;
        const node = sections[key];
        if (node == null) return null;
        if (!isValidElement(node)) return node;
        return cloneElement(node, { key });
      })}
    </main>
  );
}
