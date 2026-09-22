import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { assets, db } from "@aks/db";
import { assertSafeAssetKey, getObjectBytes } from "@/modules/platform/assets";

/** Serve asset bytes with the correct Content-Type (local dev + R2). */
export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  let safeKey: string;
  try {
    if (!key) throw new Error("missing");
    safeKey = assertSafeAssetKey(key);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Buffer;
  try {
    body = await getObjectBytes(safeKey);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [row] = await db
    .select({ mime: assets.mime })
    .from(assets)
    .where(eq(assets.r2Key, safeKey))
    .limit(1);

  const mime = row?.mime ?? "application/octet-stream";

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
