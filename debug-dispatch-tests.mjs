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

async function testDispatch(label, dispatchFn) {
  await page.goto("https://dluxury-crm.vercel.app/#/orcamentos", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  await dispatchFn();

  await page.waitForTimeout(500);
  const result = await page.evaluate(() => ({
    dialogCount: document.querySelectorAll('[role="dialog"]').length,
    hasExcluir: document.body.innerHTML.includes("Excluir or\u00e7amento") || document.body.innerHTML.includes("Tem certeza"),
  }));
  console.log(`${label}: dialog=${result.dialogCount}, hasExcluir=${result.hasExcluir}`);
}

// Test 1: Dispatch hook 24 twice
await testDispatch("Hook 24 twice", async () => {
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Excluir"]');
      const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
      let fiber = btn[fiberKey];
      while (fiber && fiber.type?.name !== "ra") fiber = fiber.return;
      let hook = fiber.memoizedState;
      let i = 0;
      while (hook) {
        if (i === 24 && hook.queue?.dispatch) {
          hook.queue.dispatch({ id: "TEST", numeroOrcamento: "TEST" });
          return;
        }
        hook = hook.next;
        i++;
      }
    });
    await page.waitForTimeout(100);
  }
});

// Test 2: Dispatch hook 24, then hook 17 (any state)
await testDispatch("Hook 24 + Hook 17", async () => {
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Excluir"]');
    const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
    let fiber = btn[fiberKey];
    while (fiber && fiber.type?.name !== "ra") fiber = fiber.return;
    let hook = fiber.memoizedState;
    let i = 0;
    while (hook) {
      if (i === 24 && hook.queue?.dispatch) {
        hook.queue.dispatch({ id: "TEST", numeroOrcamento: "TEST" });
        return;
      }
      hook = hook.next;
      i++;
    }
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Excluir"]');
    const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
    let fiber = btn[fiberKey];
    while (fiber && fiber.type?.name !== "ra") fiber = fiber.return;
    let hook = fiber.memoizedState;
    let i = 0;
    while (hook) {
      if (i === 17 && hook.queue?.dispatch) {
        hook.queue.dispatch(true);
        return;
      }
      hook = hook.next;
      i++;
    }
  });
});

// Test 3: Just the trash button click (no manual dispatch)
await testDispatch("Real click only", async () => {
  const btn = page.locator('button[aria-label="Excluir"]').first();
  await btn.click({ force: true });
});

// Test 4: Real click + any other state change
await testDispatch("Real click + dispatch 0", async () => {
  const btn = page.locator('button[aria-label="Excluir"]').first();
  await btn.click({ force: true });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Excluir"]');
    const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
    let fiber = btn[fiberKey];
    while (fiber && fiber.type?.name !== "ra") fiber = fiber.return;
    let hook = fiber.memoizedState;
    let i = 0;
    while (hook) {
      if (i === 0 && hook.queue?.dispatch) {
        hook.queue.dispatch({ test: true });
        return;
      }
      hook = hook.next;
      i++;
    }
  });
});

console.log("\n=== Console logs ===");
logs.slice(-10).forEach(l => console.log(l));
await browser.close();
