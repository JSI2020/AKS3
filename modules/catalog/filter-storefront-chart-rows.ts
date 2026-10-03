import type { SilhouetteMode } from "@/modules/dress-sizing/core/silhouette";
import {
  displayGarmentChartRows,
  inferSilhouetteFromChartRows,
  measurementKeyToPomKey,
} from "@/modules/sizing/garment-size-guide";
import type { GarmentChartRow } from "@/modules/sizing/garment-size-guide/types";

import type { SizeChartRowPublic } from "./resolve-design-size-chart";

export function toGarmentChartRows(
  rows: SizeChartRowPublic[],
): GarmentChartRow[] {
  return rows.flatMap((row) => {
    const pomKey = measurementKeyToPomKey(row.measurementKey);
    if (!pomKey) return [];
    return [
      {
        pomKey,
        measurementKey: row.measurementKey,
        label: row.label,
        values: row.valuesBySize,
      },
    ];
  });
}

export function filterStorefrontChartRows(
  rows: SizeChartRowPublic[],
  baseSizeLabel: string,
): {
  rows: SizeChartRowPublic[];
  silhouette: SilhouetteMode;
  silhouetteLabel: string;
} {
  const garmentRows = toGarmentChartRows(rows);
  if (garmentRows.length === 0) {
    return {
      rows,
      silhouette: "waisted",
      silhouetteLabel: "Finished garment measurements",
    };
  }

  const { mode, label } = inferSilhouetteFromChartRows(
    garmentRows,
    baseSizeLabel,
  );
  const displayed = displayGarmentChartRows(garmentRows, mode, baseSizeLabel);
  const visibleKeys = new Set(displayed.map((r) => r.measurementKey));
  const labelByKey = new Map(
    displayed.map((r) => [r.measurementKey, r.label] as const),
  );

  // The storefront table shows the FULL admin size chart. The overlay-display
  // set only governs the silhouette graphic, never which rows appear in the
  // table — filtering by it dropped real rows (e.g. a trouser's Waist, Hip,
  // Length). Keep every row; just adopt the nicer overlay label where one
  // exists, so a cold reader sees exactly what was entered in admin.
  void visibleKeys;
  const filtered = rows.map((row) => ({
    ...row,
    label: labelByKey.get(row.measurementKey) ?? row.label,
  }));

  return { rows: filtered, silhouette: mode, silhouetteLabel: label };
}
