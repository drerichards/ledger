import { test, expect } from "@playwright/test";

/**
 * Smoke tests — verify the app loads and core navigation works.
 * These run against `next dev` (spun up by playwright.config.ts webServer).
 */

test.describe("App shell", () => {
  test("loads the home page without errors", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Ledger/i);
  });

  test("renders the tab navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("tab", { name: /bills/i }).first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /income/i }).first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /debt/i }).first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /goals/i }).first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /snapshots/i }).first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /activity/i }).first()).toBeVisible();
  });
});

test.describe("Tab navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Bills tab renders", async ({ page }) => {
    await page.getByRole("tab", { name: /bills/i }).first().click();
    await expect(page.locator("body")).toBeVisible();
  });

  test("Income tab renders", async ({ page }) => {
    await page.getByRole("tab", { name: /income/i }).first().click();
    await expect(page.locator("body")).toBeVisible();
  });

  test("Debt tab renders", async ({ page }) => {
    await page.getByRole("tab", { name: /debt/i }).first().click();
    await expect(page.locator("body")).toBeVisible();
  });

  test("Goals tab renders", async ({ page }) => {
    await page.getByRole("tab", { name: /goals/i }).first().click();
    await expect(page.locator("body")).toBeVisible();
  });

  test("Snapshots tab renders", async ({ page }) => {
    await page.getByRole("tab", { name: /snapshots/i }).first().click();
    await expect(page.locator("body")).toBeVisible();
  });

  test("Activity tab renders", async ({ page }) => {
    await page.getByRole("tab", { name: /activity/i }).first().click();
    await expect(page.locator("body")).toBeVisible();
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
