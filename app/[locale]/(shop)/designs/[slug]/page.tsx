import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import {
  DesignConfigurator,
  DesignDetailBreadcrumb,
  getDesignBySlug,
  resolveDesignSizeChart,
  resolveImages,
} from "@/modules/catalog";
import type { GalleryAngle, SizeMode } from "@/modules/catalog";
import { DesignViewTracker } from "@/modules/analytics";
import { RelatedDesigns } from "@/modules/catalog/related-designs";
import {
  formatLeadTimeLine,
  getSiteSettings,
} from "@/modules/content/site-settings";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DesignDetailPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const design = await getDesignBySlug(slug);
  if (!design) notFound();

  const rawParams = await searchParams;
  const colourway = firstParam(rawParams.colourway) ?? null;
  const angle = (firstParam(rawParams.angle) ?? "FRONT") as GalleryAngle;
  const sizeMode = (firstParam(rawParams.sizeMode) ??
    "STANDARD") as SizeMode;
  const sizeLabel = firstParam(rawParams.sizeLabel) ?? null;
  const qtyRaw = firstParam(rawParams.qty);
  const quantity = qtyRaw ? Math.max(1, Number(qtyRaw) || 1) : 1;

  const imagesByColourway: Record<
    string,
    Awaited<ReturnType<typeof resolveImages>>
  > = {};
  await Promise.all(
    design.colourways.map(async (cw) => {
      imagesByColourway[cw.id] = await resolveImages(design.id, cw.id);
    }),
  );

  // A shade with no photos of its own borrows the first shade that has some
  // (default first), flagged so the gallery can say which shade is pictured.
  const hasPhotos = (imgs: (typeof imagesByColourway)[string] | undefined) =>
    Boolean(imgs?.FRONT?.url || imgs?.THREE_QUARTER?.url || imgs?.BACK?.url);
  const photoSource = [...design.colourways]
    .sort(
      (a, b) =>
        Number(b.id === design.defaultColourwayId) -
        Number(a.id === design.defaultColourwayId),
    )
    .find((cw) => hasPhotos(imagesByColourway[cw.id]));
  if (photoSource) {
    const source = imagesByColourway[photoSource.id]!;
    for (const cw of design.colourways) {
      const own = imagesByColourway[cw.id];
      if (hasPhotos(own)) continue;
      imagesByColourway[cw.id] = {
        FRONT: source.FRONT,
        THREE_QUARTER: source.THREE_QUARTER,
        BACK: source.BACK,
        fabricPhotos: own?.fabricPhotos ?? [],
        shownInColourwayName: photoSource.name,
      };
    }
  }

  const sizeChart = await resolveDesignSizeChart({
    sizeBlockId: design.sizeBlockId,
    pieceSizeBlocks: design.pieceSizeBlocks,
    components: design.components,
    primaryCategoryKey: design.garmentCategory.key,
    availableSizeLabels: design.availableSizeLabels,
  });

  const settings = await getSiteSettings();
  const leadTimePromise = formatLeadTimeLine(
    settings,
    design.leadTimeDaysOverride,
  );

  return (
    <main className="pdp-page">
      <DesignViewTracker
        designId={design.id}
        designSlug={design.slug}
        designName={design.name}
      />
      <DesignDetailBreadcrumb design={design} />
      <DesignConfigurator
        design={design}
        sizeChart={sizeChart}
        imagesByColourway={imagesByColourway}
        initialColourwayParam={colourway}
        initialAngle={angle}
        initialSizeMode={sizeMode}
        initialSizeLabel={sizeLabel}
        initialQuantity={quantity}
        leadTimePromise={leadTimePromise}
        whatsappUrl={settings.whatsappUrl || undefined}
      />
      <RelatedDesigns design={design} />
    </main>
  );
}
