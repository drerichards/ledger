import { test } from "@playwright/test";
import path from "path";

test("Capture guide screenshots", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  console.log("Current URL:", page.url());
  console.log("Current Title:", await page.title());

  const artifactDir = "/Users/andre.richardson/.gemini/antigravity-cli/brain/54e8869a-8f8c-48f1-90a1-d674563d7b0e";

  // Take screenshot of the initial page for debugging
  await page.screenshot({ path: path.join(artifactDir, "debug-initial-page.png") });

  // Open the guide modal — select by aria-label
  const guideBtn = page.locator("button[aria-label='How to use this app']").first();
  await guideBtn.click();

  // Let the modal open
  await page.waitForTimeout(500);

  // Take screenshot of the opened guide modal
  await page.screenshot({ path: path.join(artifactDir, "debug-guide-opened.png") });

  const chips = ["Start here", "Home", "Accounts", "Income", "Payoff", "Extras"];

  for (const chip of chips) {
    // Locate the chip button specifically inside the guide's navigation menu
    const chipBtn = page.locator("nav[aria-label='Guide sections']").getByRole("button", { name: chip, exact: true });
    await chipBtn.click();
    await page.waitForTimeout(300);

    // Capture the modal element
    const modal = page.locator("[class*='Modal_modal'], [class*='modal']").first();
    const cleanChip = chip.toLowerCase().replace(" ", "-");
    await modal.screenshot({
      path: path.join(artifactDir, `guide-modal-${cleanChip}.png`),
    });
  }
});
