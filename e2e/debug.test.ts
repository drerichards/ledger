import { test } from "@playwright/test";

test("Debug classes", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const incomeTab = page.getByRole("tab", { name: /Income/i }).first();
  await incomeTab.click();
  await page.waitForLoadState("networkidle");

  // Log the outerHTML of the element inside main
  const mainHTML = await page.locator("main").innerHTML();
  console.log("=== MAIN HTML ===");
  console.log(mainHTML);
});
