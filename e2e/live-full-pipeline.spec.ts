import { expect, test } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

type Row = { id: string; ok: boolean; detail: string };
const rows: Row[] = [];
function record(id: string, ok: boolean, detail: string) {
  rows.push({ id, ok, detail });
}

test.describe.configure({ mode: "serial" });

test.afterAll(() => {
  const passed = rows.filter((r) => r.ok).length;
  const failed = rows.filter((r) => !r.ok).length;
  writeFileSync(
    join("docs", "audits", "LIVE_UI_RESULTS.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary: { total: rows.length, passed, failed },
        rows,
      },
      null,
      2,
    ),
  );
});

test("storefront catalogue + PDP + cart + checkout COD path", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  record("UI-home", page.url().includes("127.0.0.1") || page.url().includes("localhost"), page.url());
  await expect(page.locator("body")).toBeVisible();

  await page.goto("/collections/all", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toBeVisible();
  record("UI-collections", true, page.url());

  // Walk PDPs until an in-stock size enables Add to bag
  let added = false;
  const links = await page.locator('a[href^="/designs/"]').evaluateAll((as) =>
    [...new Set(as.map((a) => (a as HTMLAnchorElement).getAttribute("href") || ""))].filter(Boolean).slice(0, 12),
  );
  for (const href of links) {
    await page.goto(href!, { waitUntil: "domcontentloaded" });
    const enabledSize = page.locator(".std button:not([disabled])").first();
    if (!(await enabledSize.count())) continue;
    await enabledSize.click();
    await page.waitForTimeout(400);
    const addBtn = page.locator("button.addcart:not([disabled])").first();
    if (!(await addBtn.count())) continue;
    await addBtn.click();
    await page.waitForTimeout(800);
    added = true;
    record("UI-pdp", true, href!);
    record("UI-size", true, "in-stock size selected");
    record("UI-add", true, "added to bag");
    break;
  }
  if (!added) {
    record("UI-add", false, "no in-stock PDP among first 12 — seed RTW stock");
    return;
  }

  await page.goto("/checkout", { waitUntil: "domcontentloaded" });
  const onCheckout = /checkout/.test(page.url());
  record("UI-checkout", onCheckout, page.url());

  if (!onCheckout) {
    return;
  }

  // Address step — controlled inputs need fill + events
  await page.locator("#recipientName").fill("Live UI Tester");
  await page.locator("#phone").fill("03001112233");
  await page.locator("#guestEmail").fill(`live-ui-${Date.now()}@mailinator.com`);
  await page.locator("#addressLine1").fill("House 12 Test Street");
  await page.locator("#city").fill("Lahore");
  await page.locator("#province").selectOption("PUNJAB");
  await page.locator("#postalCode").fill("54000");

  await page.getByRole("button", { name: /continue to payment/i }).click();
  await page.waitForTimeout(1000);

  // Capture address validation errors if still on address
  const addrErr = page.locator('[role="alert"]');
  if (await addrErr.count()) {
    record("UI-addr-next", false, await addrErr.first().innerText());
  }

  await page.getByRole("button", { name: /review order/i }).click({ timeout: 10_000 });
  await page.waitForTimeout(1000);
  record("UI-cod", true, page.url());

  const place = page.getByRole("button", { name: /place (this )?order|place order/i });
  // Also try exact copy from review step
  const placeAlt = page.locator("button.btn-primary").filter({ hasText: /place/i });
  const placeBtn = (await place.count()) ? place : placeAlt;
  await expect(placeBtn.first()).toBeVisible({ timeout: 15_000 });
  await placeBtn.first().click();
  await page.waitForURL(/confirmation|order=/, { timeout: 60_000 }).catch(() => undefined);
  const alert = page.locator('[role="alert"]');
  const alertText = (await alert.count()) ? await alert.first().innerText() : "";
  const placed =
    /confirmation/.test(page.url()) ||
    /order=/.test(page.url()) ||
    (await page.getByText(/AKS-/i).count()) > 0;
  record("UI-place", placed, placed ? page.url() : `url=${page.url()} alert=${alertText}`);

  if (placed) {
    const orderMatch = page.url().match(/order=([^&]+)/);
    const orderNum =
      orderMatch?.[1] ??
      (await page.getByText(/AKS-[A-Z0-9-]+/i).first().textContent().catch(() => null));
    if (orderNum) {
      const track = await page.goto(`/track/${decodeURIComponent(orderNum)}`, {
        waitUntil: "domcontentloaded",
      });
      record("UI-track", Boolean(track && track.status() < 500), page.url());
    }
  }
});

test("admin login reachable; protected redirects", async ({ page }) => {
  const login = await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
  record("UI-admin-login", Boolean(login?.ok()), String(login?.status()));
  await expect(page.locator("body")).toBeVisible();

  await page.goto("/admin/orders", { waitUntil: "domcontentloaded" });
  // Should land on login, not 500
  const url = page.url();
  const bodyText = await page.locator("body").innerText();
  const crashed = /server.?error|internal.?error|Ecmascript file had an error/i.test(bodyText);
  record("UI-admin-orders-gate", !crashed && (/login/.test(url) || /sign in|email/i.test(bodyText)), url);
});

test("api health + search + security probes", async ({ request }) => {
  const health = await request.get("/api/health");
  record("API-health", health.ok(), String(health.status()));

  const search = await request.get("/api/search?q=kurta");
  record("API-search", search.ok(), String(search.status()));

  const wh = await request.post("/api/webhooks/safepay", {
    data: { junk: true },
  });
  record("API-safepay", wh.status() >= 400 && wh.status() < 500, String(wh.status()));

  const trav = await request.get("/api/assets/serve?key=../.env");
  record("API-trav", trav.status() !== 200, String(trav.status()));
});
