import { and, asc, eq } from "drizzle-orm";

import { assets, db, designRenders } from "@aks/db";

import { isFabricSwatchRender } from "@/modules/designs/fabric-swatch-render";
import { createPresignedReadUrl } from "@/modules/platform/assets/r2";

import type {
  GalleryAngle,
  ResolvedGalleryImages,
  ResolvedImageTriple,
  ResolvedRenderImage,
} from "./types";

const GALLERY_ANGLES = ["FRONT", "THREE_QUARTER", "BACK"] as const satisfies readonly GalleryAngle[];

export type RenderRow = {
  angle: string;
  assetId: string;
  altText: string;
  r2Key: string;
  sortOrder: number;
  isAiGenerated: boolean;
};

/**
 * Pure helper — maps cached render rows to the gallery triple. A real photo
 * wins over an AI visualisation for the same angle; otherwise the first row
 * per angle (by sort order) wins.
 */
export function buildImageTripleFromRows(rows: RenderRow[]): ResolvedImageTriple {
  const byAngle = new Map<string, RenderRow>();
  for (const row of rows) {
    if (!(GALLERY_ANGLES as readonly string[]).includes(row.angle)) continue;
    if (isFabricSwatchRender(row)) continue;
    const current = byAngle.get(row.angle);
    if (!current || (current.isAiGenerated && !row.isAiGenerated)) {
      byAngle.set(row.angle, row);
    }
  }

  const toImage = (row: RenderRow | undefined): ResolvedRenderImage => {
    if (!row) return null;
    return {
      assetId: row.assetId,
      r2Key: row.r2Key,
      altText: row.altText,
      url: null,
      isAiGenerated: row.isAiGenerated,
    };
  };

  return {
    FRONT: toImage(byAngle.get("FRONT")),
    THREE_QUARTER: toImage(byAngle.get("THREE_QUARTER")),
    BACK: toImage(byAngle.get("BACK")),
  };
}

export function buildFabricPhotosFromRows(
  rows: RenderRow[],
): NonNullable<ResolvedRenderImage>[] {
  return rows
    .filter((r) => isFabricSwatchRender(r))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.assetId.localeCompare(b.assetId))
    .map((row) => ({
      assetId: row.assetId,
      r2Key: row.r2Key,
      altText: row.altText,
      url: null,
      isAiGenerated: row.isAiGenerated,
    }));
}

async function presignTriple(triple: ResolvedImageTriple): Promise<ResolvedImageTriple> {
  const entries = await Promise.all(
    GALLERY_ANGLES.map(async (angle) => {
      const img = triple[angle];
      if (!img) return [angle, null] as const;
      let url: string | null = null;
      try {
        url = await createPresignedReadUrl(img.r2Key, 3600);
      } catch {
        url = null;
      }
      return [angle, { ...img, url }] as const;
    }),
  );
  return Object.fromEntries(entries) as ResolvedImageTriple;
}

async function presignFabricPhotos(
  photos: NonNullable<ResolvedRenderImage>[],
): Promise<NonNullable<ResolvedRenderImage>[]> {
  return Promise.all(
    photos.map(async (img) => {
      let url: string | null = null;
      try {
        url = await createPresignedReadUrl(img.r2Key, 3600);
      } catch {
        url = null;
      }
      return { ...img, url };
    }),
  );
}

/**
 * Reads cached design_renders only — never generates images.
 * Returns presigned URLs for FRONT, THREE_QUARTER, BACK, plus fabric swatches last.
 * Promoted AI visualisations are included (the gallery labels them) so the PDP
 * matches the product cards; real photos still take precedence per angle.
 */
export async function resolveImages(
  designId: string,
  colourwayId: string,
): Promise<ResolvedGalleryImages> {
  const rows = await db
    .select({
      angle: designRenders.angle,
      assetId: designRenders.assetId,
      altText: designRenders.altText,
      r2Key: assets.r2Key,
      sortOrder: designRenders.sortOrder,
      isAiGenerated: designRenders.isAiGenerated,
    })
    .from(designRenders)
    .innerJoin(assets, eq(designRenders.assetId, assets.id))
    .where(
      and(
        eq(designRenders.designId, designId),
        eq(designRenders.colourwayId, colourwayId),
      ),
    )
    .orderBy(asc(designRenders.sortOrder));

  const triple = buildImageTripleFromRows(rows);
  const fabricPhotos = buildFabricPhotosFromRows(rows);
  const [signedTriple, signedFabric] = await Promise.all([
    presignTriple(triple),
    presignFabricPhotos(fabricPhotos),
  ]);

  return {
    ...signedTriple,
    fabricPhotos: signedFabric,
  };
}
