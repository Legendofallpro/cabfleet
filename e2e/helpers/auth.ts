import { type Page, expect } from "@playwright/test";

export function liveStaffCreds() {
  const email = process.env.E2E_STAFF_EMAIL ?? "";
  const password = process.env.E2E_STAFF_PASSWORD ?? "";
  return email && password ? { email, password } : null;
}

export function liveTripCreds() {
  const staff = liveStaffCreds();
  const customerEmail = process.env.E2E_CUSTOMER_EMAIL ?? "";
  const customerPassword = process.env.E2E_CUSTOMER_PASSWORD ?? "";
  const driverEmail = process.env.E2E_DRIVER_EMAIL ?? "";
  const driverPassword = process.env.E2E_DRIVER_PASSWORD ?? "";
  if (!staff || !customerEmail || !customerPassword || !driverEmail || !driverPassword) {
    return null;
  }
  return {
    staff,
    customer: { email: customerEmail, password: customerPassword },
    driver: { email: driverEmail, password: driverPassword },
  };
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signin"), {
    timeout: 20_000,
  });
}

export async function signOutViaForm(page: Page) {
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: /sign out/i }) });
  if (await form.count()) {
    await form.getByRole("button", { name: /sign out/i }).click();
    return;
  }
  await page.context().clearCookies();
}

export async function expectEnforcingCsp(page: Page) {
  const response = await page.goto("/signin");
  expect(response, "expected /signin to respond").toBeTruthy();
  const headers = response!.headers();
  const csp = headers["content-security-policy"];
  expect(csp, "CSP must be enforcing").toBeTruthy();
  expect(csp).toContain("default-src 'self'");
  expect(headers["content-security-policy-report-only"]).toBeUndefined();
}
