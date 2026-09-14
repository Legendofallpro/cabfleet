import { test, expect } from "@playwright/test";
import { expectEnforcingCsp } from "./helpers/auth";

test("signin serves enforcing Content-Security-Policy", async ({ page }) => {
  await expectEnforcingCsp(page);
  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
});
