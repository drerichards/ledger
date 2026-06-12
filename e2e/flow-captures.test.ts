import { test, type Locator, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

test("Capture detailed flow screenshots", async ({ page }) => {
  // Set viewport to 1280x800 for high resolution
  await page.setViewportSize({ width: 1280, height: 800 });

  // 1. Go to Home page
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Mask floating action buttons and toast messages
  const masks = [
    page.locator("[class*='toast'], [class*='Toast']"),
    page.locator("[class*='msgFab'], [class*='fab']"),
  ];

  const publicDir = path.join(__dirname, "../public/screenshots");
  const artifactDir = "/Users/andre.richardson/.gemini/antigravity-cli/brain/54e8869a-8f8c-48f1-90a1-d674563d7b0e";

  // Ensure directories exist
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const saveCrops = async (locator: Locator | Page, name: string) => {
    const pubPath = path.join(publicDir, name);
    const artPath = path.join(artifactDir, name);
    await locator.screenshot({ path: pubPath, mask: masks });
    fs.copyFileSync(pubPath, artPath);
  };

  // Crop Verdict Hero Card
  const verdictHero = page.locator("[class*='tileAnswer']").first();
  await saveCrops(verdictHero, "verdict-card.png");

  // Crop This Week Panel
  const thisWeekPanel = page.locator("[class*='tileWeek']").first();
  await saveCrops(thisWeekPanel, "this-week.png");

  // Crop Momentum Gauges
  const momentumGauges = page.locator("[class*='tileMom']").first();
  await saveCrops(momentumGauges, "momentum-gauges.png");

  // 2. Go to Accounts tab and open Add Bill modal
  const accountsTab = page.getByRole("tab", { name: /Accounts/i }).first();
  await accountsTab.click();
  await page.waitForLoadState("networkidle");

  const addBillBtn = page.getByRole("button", { name: "+ Add Bill" }).first();
  await addBillBtn.click();
  await page.waitForTimeout(500);

  const addBillModal = page.locator("[class*='Modal-module__'][class*='modal'], [class*='modal']").first();
  await saveCrops(addBillModal, "add-bill-modal.png");

  // Close the modal
  const closeBtn = page.getByRole("button", { name: "Close" }).first();
  await closeBtn.click();
  await page.waitForTimeout(300);

  // 3. Open Edit/Delete actions menu on Accounts tab
  // Click first actions button
  const actionBtn = page.locator("button[aria-label^='Actions for ']").first();
  await actionBtn.click();
  await page.waitForTimeout(300);

  // Take screenshot of the page showing the menu portal open
  await saveCrops(page, "edit-delete-menu.png");

  // Click outside to close the menu
  await page.click("body", { position: { x: 10, y: 10 } });
  await page.waitForTimeout(300);

  // 4. Go to Income tab and expand first week to capture paycheck split
  const incomeTab = page.getByRole("tab", { name: /Income/i }).first();
  await incomeTab.click();
  await page.waitForLoadState("networkidle");

  // Expand the first month header if collapsed
  const monthHeader = page.locator("[class*='MonthAccordion-module__'][class*='monthHeader']").first();
  if (await monthHeader.isVisible()) {
    const isExpanded = await monthHeader.getAttribute("aria-expanded") === "true";
    if (!isExpanded) {
      await monthHeader.click();
      await page.waitForTimeout(300);
    }
  }

  // Expand the first week header if collapsed
  const weekHeader = page.locator("[class*='WeekAccordion-module__'][class*='header']").first();
  if (await weekHeader.isVisible()) {
    const isExpanded = await weekHeader.getAttribute("aria-expanded") === "true";
    if (!isExpanded) {
      await weekHeader.click();
      await page.waitForTimeout(300);
    }
  }

  // Crop the entire Income Tab Container (income-tab.png)
  const incomeContainer = page.locator("[class*='PaycheckTab-module__'][class*='container']").first();
  await saveCrops(incomeContainer, "income-tab.png");

  // Crop the active expanded Week Split block (income-splitting.png)
  const paycheckSplit = page.locator("[class*='WeekAccordion-module__'][class*='weekExpanded']").first();
  await saveCrops(paycheckSplit, "income-splitting.png");

  // 5. Go to Payoff tab and open Add Plan modal
  const payoffTab = page.getByRole("tab", { name: /Payoff/i }).first();
  await payoffTab.click();
  await page.waitForLoadState("networkidle");

  const addPlanBtn = page.getByRole("button", { name: "+ Add Plan" }).first();
  await addPlanBtn.click();
  await page.waitForTimeout(500);

  const addPlanModal = page.locator("[class*='Modal-module__'][class*='modal'], [class*='modal']").first();
  await saveCrops(addPlanModal, "add-plan-modal.png");
});
