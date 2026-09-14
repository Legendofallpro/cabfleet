import { test, expect } from "@playwright/test";
import { liveStaffCreds, signIn } from "./helpers/auth";

const staff = liveStaffCreds();

test.describe("desk phone-book", () => {
  test.skip(!staff, "Set E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD to run this spec.");

  test("clerk books from a 10-digit mobile", async ({ page }) => {
    await signIn(page, staff!.email, staff!.password);

    await page.goto("/bookings/new");
    await expect(page.getByRole("heading", { name: "Phone call booking" })).toBeVisible();

    const mobile = `9${Date.now().toString().slice(-9)}`;
    await page.locator("#phone").fill(mobile);
    await page.locator("#fullName").fill("E2E Desk Guest");
    await page.getByLabel("Ride type").selectOption({ label: "Local" });
    await page.locator("#pickupAddress").fill("MG Road, Bengaluru");
    await page.locator("#dropAddress").fill("Kempegowda Airport");
    await page.locator("#quotedFare").fill("499");
    await page.getByRole("button", { name: "Save booking" }).click();

    await page.waitForURL(/\/bookings\/[a-z0-9]+$/i, { timeout: 20_000 });
    await expect(page.getByText(/Booking #/i)).toBeVisible();
  });
});
