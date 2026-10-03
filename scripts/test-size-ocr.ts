import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { readFileSync } from "node:fs";

async function main() {
  const { extractSizeTableFromImage } = await import(
    "@/modules/designs/extract-size-table"
  );

  const path = process.argv[2];
  if (!path) {
    console.error("Usage: tsx scripts/test-size-ocr.ts <image-path>");
    process.exit(2);
  }

  const bytes = readFileSync(path);
  const blob = new Blob([bytes], { type: "image/png" });
  const file = new File([blob], "table.png", { type: "image/png" });
  const fd = new FormData();
  fd.set("image", file);

  console.log("Reading table with Mistral vision…\n");
  const res = await extractSizeTableFromImage(fd);

  if (!res.ok) {
    console.error("FAILED:", res.error);
    process.exit(1);
  }

  console.log(`unit: ${res.unit}   sizes: ${res.sizes.join(", ")}`);
  console.log(`rows: ${res.rows.length}   unmatched: ${res.unmatchedCount}\n`);
  for (const r of res.rows) {
    const map = r.measurementKey
      ? `→ ${r.measurementKey}`
      : "→ (UNMATCHED — needs review)";
    const vals = res.sizes
      .map((s) => `${s}:${r.values[s] ?? "—"}`)
      .join("  ");
    console.log(`  ${r.rawLabel.padEnd(18)} ${map.padEnd(34)} ${vals}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
