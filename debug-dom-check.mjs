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

console.log("=== Click and immediately check DOM ===");

const trashBtn = page.locator('button[aria-label="Excluir"]').first();

// Click and check DOM
const result = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  if (!btn) return { error: "no btn" };

  // Click it
  btn.click();

  // Wait microtask
  return new Promise((resolve) => {
    setTimeout(() => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      const overlays = document.querySelectorAll('.fixed.inset-0');
      const portals = document.querySelectorAll('[data-reactroot]');
      const bodyChildren = document.body.children.length;
      const hasExcluirText = document.body.innerHTML.includes("Excluir or") || document.body.innerHTML.includes("Excluir or\\u00e7amento");
      const allRoleDialogs = Array.from(dialogs).map(d => ({
        text: d.textContent?.substring(0, 100),
        visible: d.offsetParent !== null,
        ariaModal: d.getAttribute("aria-modal"),
        display: window.getComputedStyle(d).display,
        opacity: window.getComputedStyle(d).opacity,
        zIndex: window.getComputedStyle(d).zIndex,
      }));

      resolve({
        bodyChildren,
        dialogCount: dialogs.length,
        overlayCount: overlays.length,
        portalCount: portals.length,
        hasExcluirText,
        allRoleDialogs,
        bodyClasses: document.body.className,
        bodyHTMLSize: document.body.innerHTML.length,
      });
    }, 100);
  });
});

console.log("DOM after click:", JSON.stringify(result, null, 2));

// Try waiting longer
await page.waitForTimeout(2000);
const finalState = await page.evaluate(() => {
  return {
    dialogCount: document.querySelectorAll('[role="dialog"]').length,
    hasExcluirText: document.body.innerHTML.includes("Excluir or") || document.body.innerHTML.includes("Excluir or\\u00e7amento"),
    bodyHTMLSize: document.body.innerHTML.length,
  };
});
console.log("\nFinal state after 2s wait:", finalState);

await page.screenshot({ path: "trace-dom-check.png" });

console.log("\n=== Console logs ===");
logs.forEach(l => console.log(l));
await browser.close();
