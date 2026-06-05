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

console.log("=== Direct dispatch on pendingDelete state ===");

// Try calling each dispatcher one by one and check dialog
const results = [];
for (let targetIdx = 0; targetIdx < 30; targetIdx++) {
  // Reload page to reset state
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
    let target = null;
    while (hook) {
      if (i === idx) {
        target = hook;
        break;
      }
      hook = hook.next;
      i++;
    }

    if (!target) return { error: "no hook at idx " + idx };
    if (!target.queue || !target.queue.dispatch) return { error: "no dispatch at idx " + idx };

    try {
      const preview = typeof target.memoizedState;
      target.queue.dispatch({ id: "TEST-" + idx, numeroOrcamento: "TEST-" + idx });
      return { idx, dispatchType: preview, success: true };
    } catch (e) {
      return { idx, error: e.message };
    }
  }, targetIdx);

  // Wait and check
  await page.waitForTimeout(500);
  const dialogVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
  console.log(`Hook ${targetIdx}: dispatch ${result.success ? "OK" : "FAIL"} (${result.dispatchType || result.error}), dialog=${dialogVisible}`);

  if (dialogVisible) {
    console.log(`*** FOUND IT! Hook index ${targetIdx} controls the dialog ***`);
    break;
  }
}

console.log("\n=== All console logs ===");
logs.forEach(l => console.log(l));

await browser.close();
