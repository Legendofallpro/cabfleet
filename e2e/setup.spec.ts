import { test, expect } from "@playwright/test";

test.skip(!process.env.E2E_FORCE_SETUP, "Set E2E_FORCE_SETUP=true against an unseeded install.");

test("setup wizard step 1 is reachable", async ({ page }) => {
  await page.goto("/setup");
  await expect(page.getByRole("heading", { name: /Where does this fleet run/i })).toBeVisible();
});
