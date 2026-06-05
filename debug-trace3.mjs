import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const logs = [];
page.on("console", (msg) => {
  logs.push(`[${msg.type()}] ${msg.text()}`);
});
page.on("pageerror", (err) => {
  logs.push(`[PAGE-ERROR] ${err.message}`);
});

// Login
await page.goto("https://dluxury-crm.vercel.app/#/login", { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "admin@dluxury.com");
await page.fill('input[type="password"]', "admin123");
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);
await page.goto("https://dluxury-crm.vercel.app/#/orcamentos", { waitUntil: "networkidle" });
await page.waitForTimeout(3500);

console.log("=== Test 1: Click Editar button (known to work) ===");
const editBtn = page.locator('button:has-text("Editar")').first();
await editBtn.click();
await page.waitForTimeout(2000);
console.log("URL after edit click:", page.url());

// Go back
await page.goto("https://dluxury-crm.vercel.app/#/orcamentos", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

console.log("\n=== Test 2: Visualizar PDF (trash's sibling) ===");
const pdfBtn = page.locator('button[aria-label="Visualizar PDF"]').first();
const pdfBefore = page.url();
const [pdfPopup] = await Promise.all([
  page.waitForEvent("popup", { timeout: 3000 }).catch(() => null),
  pdfBtn.click(),
]);
console.log("Popup opened:", !!pdfPopup);
if (pdfPopup) console.log("Popup URL:", pdfPopup.url());
await page.waitForTimeout(1500);
await page.screenshot({ path: "trace-pdf-clicked.png" });

console.log("\n=== Test 3: Trash button click with full trace ===");
const trashBtn = page.locator('button[aria-label="Excluir"]').first();

// Use a fresh click via Playwright
await trashBtn.click({ force: true });
await page.waitForTimeout(2000);

// Take screenshot to see if anything happened
await page.screenshot({ path: "trace-trash-clicked.png", fullPage: true });

const stateAfter = await page.evaluate(() => {
  return {
    bodyText: document.body.innerText.substring(0, 200),
    roleDialogs: document.querySelectorAll('[role="dialog"]').length,
    hasFixedOverlays: document.querySelectorAll(".fixed.inset-0").length,
    url: window.location.href,
  };
});
console.log("State after trash click:", JSON.stringify(stateAfter, null, 2));

console.log("\n=== Test 4: Hook into console to see all events ===");

// Inject a click listener that logs to console
await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  if (btn) {
    btn.addEventListener("click", (e) => {
      console.log("[NATIVE LISTENER] click captured on trash button, defaultPrevented=" + e.defaultPrevented);
    }, true);  // capture phase
    btn.addEventListener("click", (e) => {
      console.log("[NATIVE LISTENER] click captured (bubble) on trash button");
    }, false);
  }
});

// Click again
await trashBtn.click({ force: true });
await page.waitForTimeout(1000);

console.log("\n=== Console logs ===");
logs.forEach((l) => console.log(l));

await browser.close();
