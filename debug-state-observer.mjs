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

console.log("=== Check if confirm dialog is in the DOM (with open: false) ===");

// Check initial state
const initialState = await page.evaluate(() => {
  return {
    roleDialogs: document.querySelectorAll('[role="dialog"]').length,
    bodyHasExcluir: document.body.innerHTML.includes("Excluir"),
    bodyHasTemCerteza: document.body.innerHTML.includes("Tem certeza"),
    allModals: Array.from(document.querySelectorAll('[role="dialog"]')).map(d => ({
      text: d.textContent?.substring(0, 100),
      visible: d.offsetParent !== null,
    })),
  };
});
console.log("Initial state:", JSON.stringify(initialState, null, 2));

// Now try the click with ALL info
console.log("\n=== Click trash button and watch state changes ===");

// Inject a state observer
await page.evaluate(() => {
  // Find the ra component and patch its dispatchers to log
  const btn = document.querySelector('button[aria-label="Excluir"]');
  const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
  let fiber = btn[fiberKey];
  while (fiber && (fiber.type?.name !== "ra" && fiber.type?.displayName !== "ra")) {
    fiber = fiber.return;
  }

  // Patch all dispatchers to log
  let hook = fiber.memoizedState;
  let i = 0;
  const originalDispatches = [];
  while (hook) {
    if (hook.queue?.dispatch) {
      const orig = hook.queue.dispatch;
      originalDispatches.push({ i, orig, currentValue: hook.memoizedState });
      hook.queue.dispatch = function(val) {
        console.log(`[STATE] Hook ${i} dispatch:`, JSON.stringify(val)?.substring(0, 100));
        return orig.apply(this, arguments);
      };
    }
    hook = hook.next;
    i++;
  }
  console.log(`[PATCH] Patched ${originalDispatches.length} dispatchers`);
  window.__originalDispatches = originalDispatches;
});

// Now click
const trashBtn = page.locator('button[aria-label="Excluir"]').first();
await trashBtn.click({ force: true });
await page.waitForTimeout(2000);

// Check state after
const afterState = await page.evaluate(() => {
  return {
    roleDialogs: document.querySelectorAll('[role="dialog"]').length,
    bodyHasExcluir: document.body.innerHTML.includes("Excluir"),
    bodyHasTemCerteza: document.body.innerHTML.includes("Tem certeza"),
    allModals: Array.from(document.querySelectorAll('[role="dialog"]')).map(d => ({
      text: d.textContent?.substring(0, 100),
      visible: d.offsetParent !== null,
    })),
  };
});
console.log("After click state:", JSON.stringify(afterState, null, 2));

console.log("\n=== Console logs ===");
logs.forEach(l => console.log(l));

await page.screenshot({ path: "trace-after-state-observer.png" });
await browser.close();
