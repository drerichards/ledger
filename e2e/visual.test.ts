import { test, expect } from "@playwright/test";

/**
 * Visual regression tests — lock the approved design for every tab.
 *
 * First run: generates baseline snapshots in e2e/visual.test.ts-snapshots/
 * Subsequent runs: pixel-diffs against baseline, fails on drift
 *
 * To update baselines after an intentional design change:
 *   pnpm test:visual:update
 */

const TABS = [
  { name: "Home", label: "home" },
  { name: "Accounts", label: "accounts" },
  { name: "Income", label: "income" },
  { name: "Payoff", label: "payoff" },
];

test.describe("Visual regression — tab layouts", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test.setTimeout(60000);

  for (const tab of TABS) {
    test(`${tab.name} tab matches approved snapshot`, async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Click the tab if enabled — use first() to avoid Radix inner tab collisions
      const tabEl = page.getByRole("tab", { name: new RegExp(tab.name, "i") }).first();
      if (await tabEl.isEnabled()) {
        await tabEl.click();
      }
      await page.waitForLoadState("networkidle");

      // Mask transient UI so they don't cause false diffs
      const masks = [
        page.locator("[class*='toast'], [class*='Toast']"),
        page.locator("[class*='msgFab'], [class*='fab']"),
      ];

      await expect(page).toHaveScreenshot(`${tab.label}-tab.png`, {
        maxDiffPixelRatio: 0.02,
        fullPage: false,
        mask: masks,
      });
    });
  }
});
