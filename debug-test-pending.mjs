import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const logs = [];
page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on("pageerror", (err) => logs.push(`[PAGE-ERROR] ${err.message}\n${err.stack}`));

await page.goto("https://dluxury-crm.vercel.app/#/login", { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "admin@dluxury.com");
await page.fill('input[type="password"]', "admin123");
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);
await page.goto("https://dluxury-crm.vercel.app/#/orcamentos", { waitUntil: "networkidle" });
await page.waitForTimeout(3500);

console.log("=== Direct setState test ===");

// Find the pendingDelete hook
const pendingDeleteHookIdx = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
  let fiber = btn[fiberKey];
  while (fiber && fiber.type?.name !== "ra") fiber = fiber.return;

  // Find hooks with object null initial value
  let hook = fiber.memoizedState;
  let i = 0;
  const candidates = [];
  while (hook) {
    if (hook.queue?.dispatch && hook.memoizedState === null) {
      candidates.push({ i, dispatch: hook.queue.dispatch });
    }
    hook = hook.next;
    i++;
  }
  return candidates;
});

console.log("Candidate null hooks:", pendingDeleteHookIdx);

// Try setting each candidate and check the dialog
for (const cand of pendingDeleteHookIdx) {
  await page.goto("https://dluxury-crm.vercel.app/#/orcamentos", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const result = await page.evaluate((idx) => {
    const btn = document.querySelector('button[aria-label="Excluir"]');
    const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
    let fiber = btn[fiberKey];
    while (fiber && fiber.type?.name !== "ra") fiber = fiber.return;

    let hook = fiber.memoizedState;
    let i = 0;
    while (hook) {
      if (i === idx && hook.queue?.dispatch) {
        try {
          hook.queue.dispatch({ id: "TEST", numeroOrcamento: "TEST-001" });
          return { idx, success: true };
        } catch (e) {
          return { idx, error: e.message };
        }
      }
      hook = hook.next;
      i++;
    }
    return { idx, error: "not found" };
  }, cand.i);

  await page.waitForTimeout(500);

  const hasConfirmDialog = await page.evaluate(() => {
    return document.body.innerHTML.includes("Tem certeza") || document.body.innerHTML.includes("Excluir or\\u00e7amento") || document.body.innerHTML.includes("Excluir or\u00e7amento");
  });

  console.log(`Hook ${cand.i}: ${JSON.stringify(result)}, confirmDialog=${hasConfirmDialog}`);
}

// Check ALL errors
console.log("\n=== All errors ===");
logs.filter(l => l.includes("error") || l.includes("Error")).forEach(l => console.log(l));

await browser.close();
