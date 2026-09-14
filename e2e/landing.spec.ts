import { test, expect } from "@playwright/test";

test("public landing offers Book, Staff sign in, and Driver sign in", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Book a ride\. Dispatch a cab/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Book a ride" })).toHaveAttribute(
    "href",
    "/signup",
  );
  await expect(page.getByRole("link", { name: "Staff sign in" })).toHaveAttribute(
    "href",
    "/signin?redirectTo=/dashboard",
  );
  await expect(page.getByRole("link", { name: "Driver sign in" })).toHaveAttribute(
    "href",
    "/signin?redirectTo=/driver",
  );
});
