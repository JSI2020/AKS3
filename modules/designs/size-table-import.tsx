"use client";

import { useRef, useState } from "react";

import { MEASUREMENT_KEY_DEFS } from "@aks/shared";

import {
  extractSizeTableFromImage,
  applyExtractedSizeTable,
  type ExtractedRow,
} from "./extract-size-table";

type EditableRow = ExtractedRow & { include: boolean };

const MEASURE_OPTIONS = [...MEASUREMENT_KEY_DEFS].sort((a, b) =>
  a.label.localeCompare(b.label),
);

/**
 * Upload a photo of a printed size table → read it with vision OCR → review
 * (matched rows fill in; unmatched get a "map to" dropdown) → apply exactly
 * those rows to this piece's chart. The chart stays editable afterwards.
 */
export function SizeTablePhotoImport({
  designId,
  blockId,
  pieceKey,
  onApplied,
}: {
  designId: string;
  blockId: string;
  pieceKey: string;
  onApplied: (newBlockId: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [unit, setUnit] = useState<"in" | "cm">("in");
  const [sizes, setSizes] = useState<string[]>([]);
  const [rows, setRows] = useState<EditableRow[] | null>(null);

  function reset() {
    setRows(null);
    setSizes([]);
    setError(null);
    setMsg(null);
  }

  function onFile(files: FileList | null) {
    const f = files?.[0];
    if (!f?.type.startsWith("image/")) return;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
    setFile(f);
    reset();
  }

  async function onExtract() {
    if (!file) return;
    setExtracting(true);
    setError(null);
    setMsg("Reading the table…");
    try {
      const fd = new FormData();
      fd.set("image", file);
      fd.set("pieceKey", pieceKey);
      const res = await extractSizeTableFromImage(fd);
      if (!res.ok) {
        setMsg(null);
        setError(res.error);
        return;
      }
      setUnit(res.unit);
      setSizes(res.sizes);
      setRows(res.rows.map((r) => ({ ...r, include: true })));
      setMsg(
        res.unmatchedCount > 0
          ? `Read ${res.rows.length} rows — map the ${res.unmatchedCount} highlighted below, then apply.`
          : `Read ${res.rows.length} rows — review and apply.`,
      );
    } catch (e) {
      setMsg(null);
      setError(e instanceof Error ? e.message : "Could not read the image.");
    } finally {
      setExtracting(false);
    }
  }

  function setRowKey(i: number, key: string) {
    setRows((prev) =>
      prev
        ? prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  measurementKey: key || null,
                  matchedLabel:
                    MEASURE_OPTIONS.find((m) => m.key === key)?.label ?? null,
                }
              : r,
          )
        : prev,
    );
  }

  function toggleRow(i: number) {
    setRows((prev) =>
      prev ? prev.map((r, idx) => (idx === i ? { ...r, include: !r.include } : r)) : prev,
    );
  }

  const applicable = (rows ?? []).filter((r) => r.include && r.measurementKey);

  async function onApply() {
    if (applicable.length === 0) {
      setError("Map at least one row to a measurement first.");
      return;
    }
    setApplying(true);
    setError(null);
    setMsg("Applying to the chart…");
    try {
      const fd = new FormData();
      fd.set("designId", designId);
      fd.set("blockId", blockId);
      fd.set("pieceKey", pieceKey);
      fd.set("unit", unit);
      fd.set(
        "rowsJson",
        JSON.stringify(
          applicable.map((r) => ({
            measurementKey: r.measurementKey,
            values: r.values,
          })),
        ),
      );
      const res = await applyExtractedSizeTable(fd);
      if (!res.ok) {
        setMsg(null);
        setError(res.error);
        return;
      }
      setMsg(`Applied ${res.filled} rows from your photo. Edit any value below, then Save.`);
      setRows(null);
      setPreview(null);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onApplied(res.blockId);
    } catch (e) {
      setMsg(null);
      setError(e instanceof Error ? e.message : "Could not apply the table.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="mt-3 border border-ink/12 bg-milk/60 p-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="font-sans text-[10px] uppercase tracking-[0.14em] text-ink/55">
          Or import from a photo
        </span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={(e) => onFile(e.target.files)}
          className="block text-[11.5px] text-ink/60 file:mr-2 file:border file:border-ink/15 file:bg-milk file:px-2.5 file:py-1 file:text-[11px] file:uppercase file:tracking-[0.06em] file:text-ink/70 hover:file:border-ink"
        />
        {file ? (
          <button
            type="button"
            disabled={extracting}
            onClick={() => void onExtract()}
            className="border border-zari bg-zari/90 px-3 py-1.5 text-[11px] uppercase tracking-[0.06em] text-indigo hover:bg-zari disabled:opacity-50"
          >
            {extracting ? "Reading…" : "Extract sizes"}
          </button>
        ) : null}
      </div>

      <p className="mt-1.5 text-[11px] text-ink/45">
        Upload a photo or screenshot of a printed size chart. Only the rows in
        the photo are read — then you review and apply them.
      </p>

      {preview ? (
        <img
          src={preview}
          alt="Size table to import"
          className="mt-2 max-h-40 border border-ink/10"
        />
      ) : null}

      {msg ? <p className="mt-2 text-[11.5px] text-ink/70">{msg}</p> : null}
      {error ? (
        <p className="mt-2 text-[11.5px] text-madder" role="alert">
          {error}
        </p>
      ) : null}

      {rows ? (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-[12px]">
            <thead>
              <tr>
                <th className="border-b border-ink/15 px-2 py-1.5 text-start font-sans text-[9.5px] uppercase tracking-[0.08em] text-ink/50">
                  Use
                </th>
                <th className="border-b border-ink/15 px-2 py-1.5 text-start font-sans text-[9.5px] uppercase tracking-[0.08em] text-ink/50">
                  From photo
                </th>
                <th className="border-b border-ink/15 px-2 py-1.5 text-start font-sans text-[9.5px] uppercase tracking-[0.08em] text-ink/50">
                  Measurement
                </th>
                {sizes.map((s) => (
                  <th
                    key={s}
                    className="border-b border-ink/15 px-2 py-1.5 text-center font-sans text-[9.5px] uppercase tracking-[0.08em] text-ink/50"
                  >
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const unmatched = !r.measurementKey;
                return (
                  <tr
                    key={`${r.rawLabel}-${i}`}
                    className={unmatched ? "bg-madder/[0.06]" : undefined}
                  >
                    <td className="border-b border-ink/10 px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={r.include}
                        onChange={() => toggleRow(i)}
                        aria-label={`Include ${r.rawLabel}`}
                      />
                    </td>
                    <td className="border-b border-ink/10 px-2 py-1.5 text-ink/60">
                      {r.rawLabel}
                    </td>
                    <td className="border-b border-ink/10 px-2 py-1.5">
                      <select
                        value={r.measurementKey ?? ""}
                        onChange={(e) => setRowKey(i, e.target.value)}
                        className={[
                          "border bg-milk px-1.5 py-1 text-[11.5px] text-ink outline-none focus:border-ink",
                          unmatched ? "border-madder/50" : "border-ink/15",
                        ].join(" ")}
                      >
                        <option value="">— map to —</option>
                        {MEASURE_OPTIONS.map((m) => (
                          <option key={m.key} value={m.key}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    {sizes.map((s) => (
                      <td
                        key={s}
                        className="border-b border-ink/10 px-2 py-1.5 text-center font-data text-ink/80"
                      >
                        {r.values[s] ?? "—"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={applying || applicable.length === 0}
              onClick={() => void onApply()}
              className="border border-ink bg-ink px-4 py-2 text-[12px] uppercase tracking-[0.08em] text-milk disabled:opacity-40"
            >
              {applying
                ? "Applying…"
                : `Apply ${applicable.length} row${applicable.length === 1 ? "" : "s"} to chart`}
            </button>
            <span className="text-[11px] text-ink/45">
              Unit read as {unit === "in" ? "inches" : "centimetres"}. Values snap
              to the quarter-inch grid.
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
