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

console.log("=== Test: Click and check hook 24 value over time ===");

// Get the dispatcher for hook 24
const setup = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
  let fiber = btn[fiberKey];
  while (fiber && fiber.type?.name !== "ra") fiber = fiber.return;
  let hook = fiber.memoizedState;
  let i = 0;
  while (hook) {
    if (i === 24 && hook.queue?.dispatch) {
      return { idx: 24, found: true };
    }
    hook = hook.next;
    i++;
  }
  return { found: false };
});
console.log("Setup:", setup);

// Install an interval poller
await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
  let fiber = btn[fiberKey];
  while (fiber && fiber.type?.name !== "ra") fiber = fiber.return;
  let hook = fiber.memoizedState;
  let i = 0;
  while (hook) {
    if (i === 24 && hook.queue?.dispatch) {
      // Save reference
      window.__hook24 = hook;
      window.__dispatch24 = hook.queue.dispatch;
      return;
    }
    hook = hook.next;
    i++;
  }
});

// Now click
const trashBtn = page.locator('button[aria-label="Excluir"]').first();
await trashBtn.click({ force: true });

// Poll the state and dialog count
for (let t = 100; t <= 5000; t += 500) {
  await page.waitForTimeout(500);
  const state = await page.evaluate(() => {
    const h = window.__hook24;
    const v = h ? h.memoizedState : null;
    const hasDialog = document.body.innerHTML.includes("Excluir or") || document.body.innerHTML.includes("Tem certeza");
    return {
      hook24Value: v === null ? 'null' : (typeof v === 'object' ? 'object' : typeof v),
      hasDialog,
      dialogCount: document.querySelectorAll('[role="dialog"]').length,
    };
  });
  console.log(`t=${t}ms:`, state);
}

await page.screenshot({ path: "trace-time-evolution.png" });
console.log("\n=== Console logs ===");
logs.slice(-5).forEach(l => console.log(l));
await browser.close();
