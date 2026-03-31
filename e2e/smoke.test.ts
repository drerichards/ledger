import { test, expect } from "@playwright/test";

/**
 * Smoke tests — verify the app loads and core navigation works.
 * These run against `next dev` (spun up by playwright.config.ts webServer).
 *
 * Financial accuracy is covered by Jest unit tests in src/lib/__tests__.
 * These E2E tests assert that the UI renders without crashing.
 */

test.describe("App shell", () => {
  test("loads the home page without errors", async ({ page }) => {
    await page.goto("/");
    // The app title should be present
    await expect(page).toHaveTitle(/Ledger/i);
  });

  test("renders the tab navigation", async ({ page }) => {
    await page.goto("/");
    // All 4 tabs must be present
    await expect(page.getByRole("tab", { name: /bill chart/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /affirm/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /paycheck/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /savings/i })).toBeVisible();
  });
});

test.describe("Tab navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Bill Chart tab renders a bill list or empty state", async ({ page }) => {
    await page.getByRole("tab", { name: /bill chart/i }).click();
    // Either the bill table or an empty state message should be visible
    const hasBills = await page.locator("table").isVisible().catch(() => false);
    const hasEmpty = await page
      .getByText(/no bills/i)
      .isVisible()
      .catch(() => false);
    expect(hasBills || hasEmpty).toBe(true);
  });

  test("Affirm tab renders without crashing", async ({ page }) => {
    await page.getByRole("tab", { name: /affirm/i }).click();
    // Grid or empty state
    await expect(page.locator("main, [role='main'], .container")).toBeVisible();
  });

  test("Paycheck tab renders without crashing", async ({ page }) => {
    await page.getByRole("tab", { name: /paycheck/i }).click();
    await expect(page.locator("main, [role='main'], .container")).toBeVisible();
  });

  test("Savings tab renders without crashing", async ({ page }) => {
    await page.getByRole("tab", { name: /savings/i }).click();
    await expect(page.locator("main, [role='main'], .container")).toBeVisible();
  });
});

test.describe("No JS errors on load", () => {
  test("console has no errors on initial load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
});
