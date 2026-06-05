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

async function testSequence(sequence, description) {
  await page.goto("https://dluxury-crm.vercel.app/#/orcamentos", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  for (const idx of sequence) {
    await page.evaluate((targetIdx) => {
      const btn = document.querySelector('button[aria-label="Excluir"]');
      if (!btn) return;
      const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
      let fiber = btn[fiberKey];
      while (fiber && fiber.type?.name !== "ra") fiber = fiber.return;
      let hook = fiber.memoizedState;
      let i = 0;
      while (hook) {
        if (i === targetIdx && hook.queue?.dispatch) {
          hook.queue.dispatch({ id: "TEST", numeroOrcamento: "TEST-001" });
          return;
        }
        hook = hook.next;
        i++;
      }
    }, idx);
    await page.waitForTimeout(200);
  }

  await page.waitForTimeout(800);
  const check = await page.evaluate(() => ({
    dialogCount: document.querySelectorAll('[role="dialog"]').length,
    hasExcluir: document.body.innerHTML.includes("Excluir or\u00e7amento") || document.body.innerHTML.includes("Tem certeza"),
  }));
  console.log(`${description} [${sequence.join(', ')}]: dialog=${check.dialogCount}, hasExcluir=${check.hasExcluir}`);
}

await testSequence([24], "Just hook 24");
await testSequence([0, 24], "Hook 0, then 24");
await testSequence([2, 24], "Hook 2, then 24");
await testSequence([0, 2, 24], "All three");
await testSequence([24, 0], "Hook 24, then 0");
await testSequence([24, 2], "Hook 24, then 2");

await browser.close();
