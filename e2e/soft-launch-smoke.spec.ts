import { expect, test } from "@playwright/test";

/**
 * Soft-launch happy path (storefront browse → PDP).
 * Full checkout needs seeded stock + worker; this smoke verifies the shop loads.
 */
test.describe("soft-launch storefront smoke", () => {
  test("home and designs catalogue respond", async ({ page }) => {
    const home = await page.goto("/en", { waitUntil: "domcontentloaded" });
    expect(home?.ok() || home?.status() === 304).toBeTruthy();

    await page.goto("/en/designs", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
  });

  test("checkout redirects when cart empty", async ({ page }) => {
    await page.goto("/en/checkout", { waitUntil: "domcontentloaded" });
    // Empty cart redirects home (locale may strip to `/`)
    await expect(page).toHaveURL(/\/(en\/?)?$/);
  });
});
