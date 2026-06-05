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

// First, get candidate null hooks
await page.goto("https://dluxury-crm.vercel.app/#/orcamentos", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

const candidates = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  if (!btn) return [];
  const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
  let fiber = btn[fiberKey];
  while (fiber && fiber.type?.name !== "ra") fiber = fiber.return;
  let hook = fiber.memoizedState;
  let i = 0;
  const result = [];
  while (hook) {
    if (hook.queue?.dispatch && hook.memoizedState === null) {
      result.push(i);
    }
    hook = hook.next;
    i++;
  }
  return result;
});
console.log("Candidates:", candidates);

for (const idx of candidates) {
  await page.goto("https://dluxury-crm.vercel.app/#/orcamentos", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const result = await page.evaluate((targetIdx) => {
    const btn = document.querySelector('button[aria-label="Excluir"]');
    if (!btn) return { idx: targetIdx, error: "no btn" };
    const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
    let fiber = btn[fiberKey];
    while (fiber && fiber.type?.name !== "ra") fiber = fiber.return;
    let hook = fiber.memoizedState;
    let i = 0;
    while (hook) {
      if (i === targetIdx && hook.queue?.dispatch) {
        hook.queue.dispatch({ id: "TEST", numeroOrcamento: "TEST-001" });
        return { idx: targetIdx, success: true };
      }
      hook = hook.next;
      i++;
    }
    return { idx: targetIdx, error: "no hook" };
  }, idx);

  await page.waitForTimeout(500);
  const check = await page.evaluate(() => {
    return {
      dialogCount: document.querySelectorAll('[role="dialog"]').length,
      hasExcluir: document.body.innerHTML.includes("Excluir or\u00e7amento") || document.body.innerHTML.includes("Tem certeza"),
    };
  });
  console.log(`Hook ${idx}: ${JSON.stringify(result)}, dialog=${check.dialogCount}, hasExcluir=${check.hasExcluir}`);
}

await browser.close();
