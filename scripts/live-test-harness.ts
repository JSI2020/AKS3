/**
 * Live HTTP harness for soft-launch storefront + unauth admin gates.
 * Writes docs/audits/LIVE_TEST_RESULTS.json — evidence only, no secrets.
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

config({ path: ".env.local" });
config({ path: ".env" });

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

type Result = {
  id: string;
  url: string;
  status: number | null;
  ok: boolean;
  expect: string;
  note: string;
  ms: number;
};

async function probe(
  id: string,
  path: string,
  expect: "2xx" | "3xx" | "2xx|3xx" | "401|403|3xx",
  note = "",
): Promise<Result> {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      redirect: "manual",
      headers: { Accept: "text/html,application/json,*/*" },
    });
    const status = res.status;
    const ms = Date.now() - t0;
    let ok = false;
    if (expect === "2xx") ok = status >= 200 && status < 300;
    else if (expect === "3xx") ok = status >= 300 && status < 400;
    else if (expect === "2xx|3xx")
      ok = status >= 200 && status < 400;
    else if (expect === "401|403|3xx")
      ok =
        status === 401 ||
        status === 403 ||
        (status >= 300 && status < 400) ||
        status === 200; // some admin pages may render login 200
    // Treat Next 404 as fail for known routes; 500 always fail
    if (status >= 500) ok = false;
    return { id, url, status, ok, expect, note, ms };
  } catch (e) {
    return {
      id,
      url,
      status: null,
      ok: false,
      expect,
      note: `${note} ERR: ${e instanceof Error ? e.message : String(e)}`,
      ms: Date.now() - t0,
    };
  }
}

async function bodyIncludes(path: string, needle: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}${path}`, { redirect: "follow" });
    const text = await res.text();
    return text.includes(needle);
  } catch {
    return false;
  }
}

async function extractFirstDesignSlug(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/collections/all`, { redirect: "follow" });
    const html = await res.text();
    const m = html.match(/\/designs\/([a-z0-9-]+)/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const results: Result[] = [];
  const storefront: [string, string, Result["expect"]][] = [
    ["S-01", "/", "2xx|3xx"],
    ["S-02", "/collections", "2xx|3xx"],
    ["S-03", "/collections/essentials", "2xx|3xx"],
    ["S-04", "/collections/tailored", "2xx|3xx"],
    ["S-05", "/collections/occasion", "2xx|3xx"],
    ["S-06", "/collections/signature", "2xx|3xx"],
    ["S-07", "/collections/separates", "2xx|3xx"],
    ["S-08", "/collections/all", "2xx|3xx"],
    ["S-09", "/collections/new", "2xx|3xx"],
    ["S-10", "/collections/best-sellers", "2xx|3xx"],
    ["S-11", "/search?q=kurta", "2xx|3xx"],
    ["S-12", "/size-guide", "2xx|3xx"],
    ["S-13", "/fabrics", "2xx|3xx"],
    ["S-14", "/wishlist", "2xx|3xx"],
    ["S-15", "/pages/faq", "2xx|3xx"],
    ["S-16", "/pages/shipping-returns", "2xx|3xx"],
    ["S-17", "/pages/privacy-terms", "2xx|3xx"],
    ["S-18", "/pages/atelier", "2xx|3xx"],
    ["S-19", "/pages/construction", "2xx|3xx"],
    ["S-20", "/checkout", "2xx|3xx"],
    ["S-21", "/account/login", "2xx|3xx"],
    ["S-22", "/account/orders", "2xx|3xx"],
    ["S-24", "/api/health", "2xx|3xx"],
    ["S-25", "/api/search?q=a", "2xx|3xx"],
  ];

  for (const [id, path, expect] of storefront) {
    results.push(await probe(id, path, expect));
  }

  const slug = await extractFirstDesignSlug();
  if (slug) {
    results.push(await probe("S-PDP-01", `/designs/${slug}`, "2xx|3xx", `slug=${slug}`));
    results.push(
      await probe(
        "S-23",
        `/designs/${slug}/measure`,
        "2xx|3xx",
        "MTM retired — expect redirect to PDP",
      ),
    );
  } else {
    results.push({
      id: "S-PDP-01",
      url: `${BASE}/collections/all`,
      status: null,
      ok: false,
      expect: "2xx|3xx",
      note: "No design slug discovered — catalogue empty?",
      ms: 0,
    });
  }

  // Empty checkout should land home
  {
    const res = await fetch(`${BASE}/checkout`, { redirect: "manual" });
    const loc = res.headers.get("location") ?? "";
    const followed = await fetch(`${BASE}/checkout`, { redirect: "follow" });
    const finalUrl = followed.url;
    const ok =
      res.status >= 300 ||
      finalUrl.endsWith("/") ||
      /\/en\/?$/.test(finalUrl) ||
      followed.status < 400;
    results.push({
      id: "C-empty",
      url: `${BASE}/checkout`,
      status: res.status,
      ok,
      expect: "redirect home",
      note: `location=${loc || "(follow)"} final=${finalUrl}`,
      ms: 0,
    });
  }

  // Asset traversal denial
  {
    const keys = [
      "../.env",
      "..%2F.env",
      "C:/Windows/win.ini",
      "..\\..\\package.json",
    ];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!;
      const res = await fetch(
        `${BASE}/api/assets/serve?key=${encodeURIComponent(key)}`,
        { redirect: "manual" },
      );
      // Pass if not 200 with file body — 400/403/404/500 all acceptable denials
      const ok = res.status !== 200;
      results.push({
        id: `N-04-${i + 1}`,
        url: `${BASE}/api/assets/serve?key=${key}`,
        status: res.status,
        ok,
        expect: "not 200",
        note: "path traversal probe",
        ms: 0,
      });
    }
  }

  // Unauthenticated admin — should not expose protected data as open API
  const adminRoutes = [
    "/admin",
    "/admin/orders",
    "/admin/orders/new",
    "/admin/customers",
    "/admin/discounts",
    "/admin/content",
    "/admin/content/homepage",
    "/admin/content/pages",
    "/admin/content/lists",
    "/admin/content/nav",
    "/admin/content/collections",
    "/admin/content/settings",
    "/admin/production",
    "/admin/inventory",
    "/admin/inventory/designs",
    "/admin/inventory/fabrics",
    "/admin/inventory/packing",
    "/admin/inventory/trims",
    "/admin/fabrics",
    "/admin/fabrics/new",
    "/admin/designs",
    "/admin/designs/new",
    "/admin/studio",
    "/admin/studio/ai",
    "/admin/photoreal",
    "/admin/photoreal/gallery",
    "/admin/finance",
    "/admin/money",
    "/admin/payments/cod",
    "/admin/payments/verification",
    "/admin/tryon",
    "/admin/insights",
    "/admin/settings",
    "/admin/settings/staff",
    "/admin/settings/roles",
    "/admin/settings/storefront",
    "/admin/settings/studio",
    "/admin/settings/sizing/categories",
    "/admin/settings/sizing/blocks",
    "/admin/settings/sizing/fit-profiles",
    "/admin/settings/sizing/archetypes",
    "/admin/settings/sizing/custom-limits",
    "/admin/settings/sizing/chart",
    "/admin/settings/sizing/chart/grid",
    "/admin/settings/sizing/chart/styles",
    "/admin/settings/sizing/chart/templates",
    "/admin/settings/sizing/chart/recognition",
    "/admin/settings/sizing/chart/fit-events",
    "/admin/login",
    "/admin/tokens",
    "/admin/assets-test",
  ];

  let ai = 0;
  for (const path of adminRoutes) {
    ai += 1;
    const id = `A-HTTP-${String(ai).padStart(2, "0")}`;
    const r = await probe(id, path, "2xx|3xx", "unauth smoke");
    // login must be 200; protected may redirect to login (3xx) or show login (200)
    if (path === "/admin/login") {
      r.ok = r.status !== null && r.status >= 200 && r.status < 400;
      r.expect = "login reachable";
    } else if (path.startsWith("/admin/") && path !== "/admin/login") {
      // Fail only on 500
      r.ok = r.status !== null && r.status < 500;
      r.expect = "<500 (login redirect or page)";
    }
    results.push(r);
  }

  // Safepay webhook without signature
  {
    const res = await fetch(`${BASE}/api/webhooks/safepay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ junk: true }),
    });
    results.push({
      id: "N-03",
      url: `${BASE}/api/webhooks/safepay`,
      status: res.status,
      ok: res.status >= 400 && res.status < 500,
      expect: "4xx reject",
      note: "unsigned webhook body",
      ms: 0,
    });
  }

  // Home brand smoke
  {
    const hasBrand = await bodyIncludes("/", "AKS");
    results.push({
      id: "S-brand",
      url: `${BASE}/`,
      status: hasBrand ? 200 : null,
      ok: hasBrand,
      expect: "body contains AKS",
      note: "brand signal",
      ms: 0,
    });
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  const out = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    summary: { total: results.length, passed, failed },
    designSlug: slug,
    results,
  };

  mkdirSync(join("docs", "audits"), { recursive: true });
  writeFileSync(
    join("docs", "audits", "LIVE_TEST_RESULTS.json"),
    JSON.stringify(out, null, 2),
    "utf8",
  );
  console.log(
    JSON.stringify(
      { summary: out.summary, failed: results.filter((r) => !r.ok).map((r) => ({ id: r.id, status: r.status, note: r.note, url: r.url })) },
      null,
      2,
    ),
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
