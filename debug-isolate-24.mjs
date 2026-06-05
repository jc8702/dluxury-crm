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

// Reload to get a clean state
await page.goto("https://dluxury-crm.vercel.app/#/orcamentos", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

console.log("=== Test 1: Dispatch on hook 24, check confirm dialog text ===");

const dispatchResult = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  if (!btn) return { error: "no btn" };
  const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
  let fiber = btn[fiberKey];
  while (fiber && fiber.type?.name !== "ra") fiber = fiber.return;
  let hook = fiber.memoizedState;
  let i = 0;
  while (hook) {
    if (i === 24 && hook.queue?.dispatch) {
      hook.queue.dispatch({ id: "test", numeroOrcamento: "TEST-001" });
      return { idx: 24, success: true };
    }
    hook = hook.next;
    i++;
  }
  return { success: false };
});

console.log("Dispatch:", dispatchResult);

await page.waitForTimeout(500);
const result1 = await page.evaluate(() => {
  return {
    dialogCount: document.querySelectorAll('[role="dialog"]').length,
    hasTemCerteza: document.body.innerHTML.includes("Tem certeza"),
    hasExcluirOrcamento: document.body.innerHTML.includes("Excluir or") || document.body.innerHTML.includes("Excluir or\u00e7amento"),
    bodyHasConfirmText: document.body.innerText.includes("Excluir or\u00e7amento"),
  };
});
console.log("Result 1:", result1);

// Take screenshot
await page.screenshot({ path: "trace-test-24-only.png" });

// Try clicking the trash button to see if anything happens
console.log("\n=== Test 2: Click trash button now ===");
const trashBtn = page.locator('button[aria-label="Excluir"]').first();
await trashBtn.click({ force: true });
await page.waitForTimeout(1000);

const result2 = await page.evaluate(() => {
  return {
    dialogCount: document.querySelectorAll('[role="dialog"]').length,
    hasTemCerteza: document.body.innerHTML.includes("Tem certeza"),
  };
});
console.log("Result 2:", result2);

await page.screenshot({ path: "trace-test-24-after-click.png" });

console.log("\n=== Console logs ===");
logs.forEach(l => console.log(l));
await browser.close();
