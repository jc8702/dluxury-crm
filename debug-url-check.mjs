import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const logs = [];
page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on("framenavigated", (frame) => {
  console.log(`[NAV] ${frame.url()}`);
});

await page.goto("https://dluxury-crm.vercel.app/#/login", { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "admin@dluxury.com");
await page.fill('input[type="password"]', "admin123");
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);
await page.goto("https://dluxury-crm.vercel.app/#/orcamentos", { waitUntil: "networkidle" });
await page.waitForTimeout(3500);

console.log("=== URL before click:", page.url());

// Click trash button
const trashBtn = page.locator('button[aria-label="Excluir"]').first();
await trashBtn.click({ force: true });
await page.waitForTimeout(2000);

console.log("=== URL after click:", page.url());

// Check the QuotationForm state again
const stateAfter = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  if (!btn) {
    // Button no longer exists - means component unmounted and remounted with no data
    return { buttonExists: false, bodyText: document.body.innerText.substring(0, 300) };
  }
  return { buttonExists: true, bodyText: document.body.innerText.substring(0, 200) };
});
console.log("State after click:", stateAfter);

const dialog = await page.locator('[role="dialog"]').count();
console.log("Dialog count:", dialog);

await page.screenshot({ path: "trace-final.png", fullPage: true });

console.log("\n=== Console logs ===");
logs.forEach(l => console.log(l));
await browser.close();
