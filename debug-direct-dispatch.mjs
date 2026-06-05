import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const logs = [];
page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on("pageerror", (err) => logs.push(`[PAGE-ERROR] ${err.message}`));

await page.goto("https://dluxury-crm.vercel.app/#/login", { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "admin@dluxury.com");
await page.fill('input[type="password"]', "admin123");
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);
await page.goto("https://dluxury-crm.vercel.app/#/orcamentos", { waitUntil: "networkidle" });
await page.waitForTimeout(3500);

console.log("=== Test: Direct dispatch from React's perspective ===");

// Use the test that worked: dispatch on hook 24 directly
const result = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
  let fiber = btn[fiberKey];
  while (fiber && fiber.type?.name !== "ra") fiber = fiber.return;
  let hook = fiber.memoizedState;
  let i = 0;
  while (hook) {
    if (i === 24 && hook.queue?.dispatch) {
      // Dispatch
      hook.queue.dispatch({ id: "test-id", numeroOrcamento: "TEST-DIRECT" });
      return { success: true, idx: 24 };
    }
    hook = hook.next;
    i++;
  }
  return { success: false };
});

console.log("Dispatch result:", result);

await page.waitForTimeout(500);
const dialog = await page.locator('[role="dialog"]').count();
const hasText = await page.evaluate(() => document.body.innerHTML.includes("Excluir or") || document.body.innerHTML.includes("Tem certeza"));
console.log("Dialog count:", dialog);
console.log("Has confirm text:", hasText);

await page.screenshot({ path: "trace-direct-dispatch.png" });

console.log("\n=== Console logs ===");
logs.forEach(l => console.log(l));
await browser.close();
