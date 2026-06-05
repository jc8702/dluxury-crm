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

console.log("=== Test multiple wait times ===");

for (const waitTime of [500, 1000, 2000, 3000, 5000]) {
  await page.goto("https://dluxury-crm.vercel.app/#/orcamentos", { waitUntil: "networkidle" });
  await page.waitForTimeout(waitTime);

  const result = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Excluir"]');
    if (!btn) return { error: "no btn" };
    const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
    let fiber = btn[fiberKey];
    while (fiber && fiber.type?.name !== "ra") fiber = fiber.return;
    let hook = fiber.memoizedState;
    let i = 0;
    while (hook) {
      if (i === 24 && hook.queue?.dispatch) {
        hook.queue.dispatch({ id: "test", numeroOrcamento: "TEST" });
        return { dispatched: true };
      }
      hook = hook.next;
      i++;
    }
    return { error: "no hook 24" };
  });

  await page.waitForTimeout(500);

  const check = await page.evaluate(() => {
    return {
      dialogCount: document.querySelectorAll('[role="dialog"]').length,
      hasExcluirOrcamento: document.body.innerText.includes("Excluir or\u00e7amento"),
    };
  });
  console.log(`Wait ${waitTime}ms: dispatched=${JSON.stringify(result)}, dialog=${check.dialogCount}, hasExcluirText=${check.hasExcluirOrcamento}`);
}

await browser.close();
