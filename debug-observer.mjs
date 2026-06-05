import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const logs = [];
page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));

await page.goto("https://dluxury-crm.vercel.app/#/login", { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "admin@dluxury.com");
await page.fill('input[type="password"]', "admin123");
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);
await page.goto("https://dluxury-crm.vercel.app/#/orcamentos", { waitUntil: "networkidle" });
await page.waitForTimeout(3500);

console.log("=== Click and check if dialog re-renders ===");

// Patch the ConfirmDialog component to log renders
await page.evaluate(() => {
  // Find any function called 'ce' in the page
  const scripts = document.scripts;
  // Get ConfirmDialog from imports
  // ConfirmDialog is exported as 'd' from Badge chunk, used as 'ct' in QuotationForm
  // We can patch the function by walking the fiber

  // Get any element rendered with role="dialog" or any modal trigger
  // Or directly monitor React updates

  // Use MutationObserver to detect any new nodes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      m.addedNodes.forEach((n) => {
        if (n.nodeType === 1 && n.getAttribute && n.getAttribute("role") === "dialog") {
          console.log("[MO] dialog added:", n.textContent?.substring(0, 50));
        }
        if (n.nodeType === 1 && n.className && typeof n.className === "string" && n.className.includes("fixed inset-0")) {
          console.log("[MO] fixed overlay added");
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.__observer = observer;
});

console.log("Observer installed. Clicking trash button...");

const trashBtn = page.locator('button[aria-label="Excluir"]').first();
await trashBtn.click({ force: true });
await page.waitForTimeout(2000);

const dialogCount = await page.locator('[role="dialog"]').count();
console.log("Dialog count after click:", dialogCount);

console.log("\n=== Console logs ===");
logs.forEach(l => console.log(l));

await browser.close();
