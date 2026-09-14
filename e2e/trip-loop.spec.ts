import { test, expect } from "@playwright/test";
import { liveTripCreds, signIn } from "./helpers/auth";

const creds = liveTripCreds();

test.describe("customer → staff → driver → invoice", () => {
  test.skip(
    !creds,
    "Set E2E_STAFF_*, E2E_CUSTOMER_*, and E2E_DRIVER_* email/password to run this spec.",
  );

  test("happy-path trip loop", async ({ browser }) => {
    const customerCtx = await browser.newContext();
    const staffCtx = await browser.newContext();
    const driverCtx = await browser.newContext();
    const customer = await customerCtx.newPage();
    const staff = await staffCtx.newPage();
    const driver = await driverCtx.newPage();

    try {
      await signIn(customer, creds!.customer.email, creds!.customer.password);
      await customer.goto("/portal/book");
      await customer.getByRole("button", { name: /^Local/ }).click();
      await customer.getByRole("button", { name: "Continue" }).click();
      await customer.locator("#pickupAddress").fill("Indiranagar, Bengaluru");
      await customer.locator("#dropAddress").fill("Koramangala, Bengaluru");
      await customer.locator("#distanceKm").fill("8");
      await customer.getByRole("button", { name: "Continue" }).click();
      await customer.getByRole("button", { name: "Confirm booking" }).click();
      await customer.waitForURL(/\/portal\/bookings\/[a-z0-9]+$/i, { timeout: 20_000 });
      await expect(customer.getByText("Waiting for confirmation")).toBeVisible();

      const bookingId = customer.url().split("/").pop()!;

      await signIn(staff, creds!.staff.email, creds!.staff.password);
      await staff.goto(`/bookings/${bookingId}`);
      await staff.getByLabel("Driver").selectOption({ index: 1 });
      await staff.getByLabel("Vehicle").selectOption({ index: 1 });
      await staff.getByRole("button", { name: "Assign" }).click();
      await expect(staff.getByText(/assigned/i).first()).toBeVisible({ timeout: 20_000 });

      await signIn(driver, creds!.driver.email, creds!.driver.password);
      await driver.goto(`/driver/trips/${bookingId}`);
      await driver.getByRole("button", { name: "I'm on my way" }).click();
      await expect(driver.getByRole("button", { name: "Start Trip" })).toBeVisible({
        timeout: 20_000,
      });
      await driver.getByRole("button", { name: "Start Trip" }).click();
      await expect(driver.getByRole("button", { name: "Complete Trip" })).toBeVisible({
        timeout: 20_000,
      });
      await driver.getByRole("button", { name: "Complete Trip" }).click();

      await customer.goto(`/portal/bookings/${bookingId}`);
      await expect(customer.getByText("Trip completed")).toBeVisible({ timeout: 20_000 });
      await expect(customer.getByRole("button", { name: "Download invoice" })).toBeVisible({
        timeout: 25_000,
      });
    } finally {
      await customerCtx.close();
      await staffCtx.close();
      await driverCtx.close();
    }
  });
});
