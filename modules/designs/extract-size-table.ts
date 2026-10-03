"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { MEASUREMENT_KEY_DEFS, uuidv7 } from "@aks/shared";
import { db } from "@/packages/db/client";
import { sizeBlockRows, sizeBlockCells } from "@/packages/db/schema";

import { mistralVisionJson } from "@/modules/ai/providers/mistral-vision";
import { requireSizingEdit } from "@/modules/sizing/require-sizing-permission";
import { resolveEditableBlockId } from "@/modules/sizing/fork-actions";
import { getSizeBlock } from "@/modules/sizing/block-actions";

/** Raw shape the vision model is asked to return. */
type VisionTable = {
  unit?: string;
  sizes?: string[];
  rows?: { label?: string; values?: Record<string, number | string> }[];
};

export type ExtractedRow = {
  /** Row label exactly as printed in the photo. */
  rawLabel: string;
  /** Best-matched house measurement key, or null when unmatched (needs review). */
  measurementKey: string | null;
  matchedLabel: string | null;
  /** Per-size values in inches (as read), keyed by the detected size header. */
  values: Record<string, number>;
};

export type ExtractSizeTableResult =
  | {
      ok: true;
      unit: "in" | "cm";
      sizes: string[];
      rows: ExtractedRow[];
      unmatchedCount: number;
    }
  | { ok: false; error: string };

const SIZE_CANON = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

/** Normalise a label for fuzzy matching: lowercase, strip punctuation/spaces. */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Common chart aliases → house measurement label, before the generic match. */
const ALIASES: Record<string, string> = {
  bust: "Bust",
  chest: "Chest",
  waist: "Waist",
  hip: "Hip",
  shoulder: "Shoulder",
  shoulderwidth: "Shoulder",
  sleeve: "Sleeve Length",
  sleevelength: "Sleeve Length",
  sleeveopening: "Sleeve Opening",
  sleeveround: "Sleeve Opening",
  armhole: "Armhole",
  length: "Length",
  shirtlength: "Full Shirt Length",
  kameezlength: "Length",
  sweep: "Sweep",
  daman: "Daman",
  thigh: "Thigh",
  bottomopening: "Bottom Opening",
  bottomhem: "Bottom Opening",
  ankleopening: "Bottom Opening",
  trouserlength: "Bottom Length",
  rise: "Rise",
  neckdepthfront: "Neck Depth Front",
  neckdepthback: "Neck Depth Back",
  crossback: "Cross Back",
};

const LABEL_BY_NORM = new Map(
  MEASUREMENT_KEY_DEFS.map((d) => [norm(d.label), d] as const),
);
const KEY_BY_NORM = new Map(
  MEASUREMENT_KEY_DEFS.map((d) => [norm(d.key), d] as const),
);

function matchLabel(
  raw: string,
): { measurementKey: string; matchedLabel: string } | null {
  const n = norm(raw);
  if (!n) return null;

  const aliasLabel = ALIASES[n];
  if (aliasLabel) {
    const def = LABEL_BY_NORM.get(norm(aliasLabel));
    if (def) return { measurementKey: def.key, matchedLabel: def.label };
  }

  const exact = LABEL_BY_NORM.get(n) ?? KEY_BY_NORM.get(n);
  if (exact) return { measurementKey: exact.key, matchedLabel: exact.label };

  // Containment both ways for minor wording differences.
  for (const def of MEASUREMENT_KEY_DEFS) {
    const dn = norm(def.label);
    if (dn.length >= 4 && (n.includes(dn) || dn.includes(n))) {
      return { measurementKey: def.key, matchedLabel: def.label };
    }
  }
  return null;
}

function toNumber(v: number | string | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const cleaned = v.replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const SYSTEM_PROMPT =
  "You read garment size-chart images precisely. Transcribe ONLY what is printed. " +
  "Never invent, infer, or add measurement rows or sizes that are not visibly in the table. " +
  "If a cell is empty, omit it. Numbers may carry inch marks or quotes — return the plain number.";

const USER_PROMPT =
  'Return a JSON object: {"unit":"in"|"cm","sizes":["XS","S","M","L","XL"],' +
  '"rows":[{"label":"Bust","values":{"XS":34.5,"S":38,"M":40}}]}. ' +
  '"sizes" is the exact column headers left-to-right (strip any "base" suffix). ' +
  '"rows" is one entry per measurement row, "label" exactly as printed, "values" keyed by those size headers. ' +
  "Include every printed row and nothing else.";

export async function extractSizeTableFromImage(
  fd: FormData,
): Promise<ExtractSizeTableResult> {
  try {
    const image = fd.get("image");
    if (!(image instanceof File) || image.size === 0) {
      return { ok: false, error: "Choose a size-table photo to read." };
    }
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "Vision OCR is not configured (MISTRAL_API_KEY)." };
    }

    const buf = Buffer.from(await image.arrayBuffer());
    const mime = image.type || "image/png";
    const imageDataUrl = `data:${mime};base64,${buf.toString("base64")}`;

    const table = await mistralVisionJson<VisionTable>({
      apiKey,
      baseUrl: process.env.MISTRAL_BASE_URL,
      imageDataUrl,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: USER_PROMPT,
    });

    const sizesRaw = (table.sizes ?? [])
      .map((s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, ""))
      .filter(Boolean);
    const sizes = sizesRaw.filter((s) => SIZE_CANON.includes(s));
    const unit = (table.unit ?? "in").toLowerCase().startsWith("c") ? "cm" : "in";

    const rows: ExtractedRow[] = [];
    for (const r of table.rows ?? []) {
      const rawLabel = (r.label ?? "").trim();
      if (!rawLabel) continue;
      const values: Record<string, number> = {};
      for (const [k, v] of Object.entries(r.values ?? {})) {
        const sizeKey = String(k).toUpperCase().replace(/[^A-Z0-9]/g, "");
        const num = toNumber(v);
        if (num != null && (sizes.length === 0 || sizes.includes(sizeKey))) {
          values[sizeKey] = num;
        }
      }
      if (Object.keys(values).length === 0) continue;
      const match = matchLabel(rawLabel);
      rows.push({
        rawLabel,
        measurementKey: match?.measurementKey ?? null,
        matchedLabel: match?.matchedLabel ?? null,
        values,
      });
    }

    if (rows.length === 0) {
      return { ok: false, error: "No measurement rows were read from the image." };
    }

    return {
      ok: true,
      unit,
      sizes: sizes.length > 0 ? sizes : SIZE_CANON.filter((s) =>
        rows.some((r) => r.values[s] != null),
      ),
      rows,
      unmatchedCount: rows.filter((r) => !r.measurementKey).length,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not read the size table.",
    };
  }
}

// ── Apply confirmed rows into the design's chart ───────────────────────────

/** Snap hundredths-of-an-inch to the quarter-inch grid (floor at 0). */
function snapQuarter(v: number): number {
  return Math.max(0, Math.round(v / 25) * 25);
}

/** value in the chart's unit → hundredths of an inch, snapped. */
function toHundredths(value: number, unit: "in" | "cm"): number {
  const inches = unit === "cm" ? value / 2.54 : value;
  return snapQuarter(Math.round(inches * 100));
}

export type ApplyExtractedResult =
  | { ok: true; blockId: string; filled: number }
  | { ok: false; error: string };

type ConfirmedRow = {
  measurementKey: string;
  values: Record<string, number>;
};

/**
 * Replace the design's chart with EXACTLY the rows read from the photo (the
 * user has already confirmed each row's measurement key). Per-size values are
 * reproduced precisely via base + gradeOverrides, so the editor shows what the
 * photo showed, and every other size stays editable from M.
 */
export async function applyExtractedSizeTable(
  fd: FormData,
): Promise<ApplyExtractedResult> {
  try {
    const designId = String(fd.get("designId") ?? "");
    const blockId = String(fd.get("blockId") ?? "");
    const unit = String(fd.get("unit") ?? "in") === "cm" ? "cm" : "in";
    const rowsJson = String(fd.get("rowsJson") ?? "[]");

    if (!designId || !blockId) {
      return { ok: false, error: "Missing design or size chart." };
    }

    let confirmed: ConfirmedRow[];
    try {
      confirmed = (JSON.parse(rowsJson) as ConfirmedRow[]).filter(
        (r) => r.measurementKey && r.values && Object.keys(r.values).length > 0,
      );
    } catch {
      return { ok: false, error: "Could not read the confirmed rows." };
    }
    if (confirmed.length === 0) {
      return { ok: false, error: "No rows to apply." };
    }

    await requireSizingEdit(designId);

    const resolved = await resolveEditableBlockId(blockId, designId);
    const editBlockId = resolved.blockId;

    const detail = await getSizeBlock(editBlockId, { designId });
    if (!detail) return { ok: false, error: "Size chart not found." };
    const labels = detail.sizeLabels;
    const baseLabel = detail.baseSizeLabel;
    const baseIdx = labels.indexOf(baseLabel);
    if (baseIdx < 0) return { ok: false, error: "Chart has no base size." };

    // De-dupe by measurement key (last wins), keep input order for sortOrder.
    const byKey = new Map<string, Record<string, number>>();
    const order: string[] = [];
    for (const r of confirmed) {
      if (!byKey.has(r.measurementKey)) order.push(r.measurementKey);
      byKey.set(r.measurementKey, r.values);
    }

    const newRows = order.map((mk, i) => {
      const vals = byKey.get(mk)!;
      // Convert present sizes to hundredths.
      const h: Record<string, number> = {};
      for (const [size, v] of Object.entries(vals)) {
        if (labels.includes(size)) h[size] = toHundredths(v, unit);
      }
      // Base value: the photo's M, else the nearest present size to base.
      let baseValue = h[baseLabel];
      if (baseValue == null) {
        let best: number | null = null;
        let bestDist = Infinity;
        for (const size of Object.keys(h)) {
          const d = Math.abs(labels.indexOf(size) - baseIdx);
          if (d < bestDist) {
            bestDist = d;
            best = h[size]!;
          }
        }
        baseValue = best ?? 0;
      }

      // Per-step overrides reproduce arbitrary per-size values exactly.
      const overrides: Record<string, number> = {};
      // Upward from base.
      for (let idx = baseIdx + 1; idx < labels.length; idx++) {
        const cur = labels[idx]!;
        const prev = labels[idx - 1]!;
        if (h[cur] == null) continue;
        const prevVal = h[prev] ?? (idx - 1 === baseIdx ? baseValue : h[cur]!);
        overrides[cur] = h[cur]! - prevVal;
      }
      // Downward from base.
      for (let idx = baseIdx - 1; idx >= 0; idx--) {
        const cur = labels[idx]!;
        const prev = labels[idx + 1]!;
        if (h[cur] == null) continue;
        const prevVal = h[prev] ?? (idx + 1 === baseIdx ? baseValue : h[cur]!);
        overrides[cur] = prevVal - h[cur]!;
      }

      // Collapse a uniform grade to a single increment for a clean chart.
      const steps = Object.values(overrides);
      const uniform =
        steps.length > 0 && steps.every((s) => s === steps[0]);
      const gradeIncrement = uniform ? steps[0]! : 0;

      return {
        id: uuidv7(),
        blockId: editBlockId,
        measurementKey: mk,
        baseValue,
        gradeIncrement,
        gradeOverrides: uniform ? {} : overrides,
        sortOrder: i,
      };
    });

    await db.transaction(async (tx) => {
      await tx
        .delete(sizeBlockCells)
        .where(eq(sizeBlockCells.blockId, editBlockId));
      await tx.delete(sizeBlockRows).where(eq(sizeBlockRows.blockId, editBlockId));
      await tx.insert(sizeBlockRows).values(newRows);
    });

    revalidatePath(`/admin/designs/${designId}`);
    return { ok: true, blockId: editBlockId, filled: newRows.length };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not apply the size table.",
    };
  }
}
