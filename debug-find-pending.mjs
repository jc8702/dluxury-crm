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

console.log("=== Direct dispatch + check for specific dialog title 'Excluir or'amento' ===\n");

for (let targetIdx = 0; targetIdx < 30; targetIdx++) {
  await page.goto("https://dluxury-crm.vercel.app/#/orcamentos", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const result = await page.evaluate((idx) => {
    const btn = document.querySelector('button[aria-label="Excluir"]');
    if (!btn) return { error: "no button" };
    const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
    let fiber = btn[fiberKey];
    while (fiber && (fiber.type?.name !== "ra" && fiber.type?.displayName !== "ra")) {
      fiber = fiber.return;
    }
    if (!fiber) return { error: "no ra" };

    let hook = fiber.memoizedState;
    let i = 0;
    while (hook) {
      if (i === idx) {
        if (!hook.queue?.dispatch) return { error: "no dispatch" };
        hook.queue.dispatch({ id: "TEST-" + idx, numeroOrcamento: "TEST-" + idx });
        return { success: true };
      }
      hook = hook.next;
      i++;
    }
    return { error: "no hook" };
  }, targetIdx);

  if (!result.success) continue;

  await page.waitForTimeout(400);
  // Check for the SPECIFIC Excluir orcamento dialog
  const hasConfirmDialog = await page.evaluate(() => {
    const dialogs = document.querySelectorAll('[role="dialog"]');
    return Array.from(dialogs).some(d =>
      d.textContent?.includes("Excluir or") || d.textContent?.includes("Excluir or\u00e7amento")
    );
  });
  console.log(`Hook ${targetIdx}: ${result.success ? "dispatched" : "FAIL"}, confirmDialog=${hasConfirmDialog}`);

  if (hasConfirmDialog) {
    console.log(`\n*** FOUND IT! Hook index ${targetIdx} is pendingDelete setter! ***`);
    await page.screenshot({ path: "trace-found-pending-delete.png" });
    break;
  }
}

console.log("\n=== Console logs ===");
logs.forEach(l => console.log(l));
await browser.close();
