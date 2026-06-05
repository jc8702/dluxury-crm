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

console.log("=== Test 1: Click then manually call all dispatchers to find pendingDelete ===");

// Click first
const trashBtn = page.locator('button[aria-label="Excluir"]').first();
await trashBtn.click({ force: true });
await page.waitForTimeout(1500);

console.log("After click - dialog count:", await page.locator('[role="dialog"]').count());

// Now patch the dispatchers to log calls
const patchResult = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  if (!btn) return { error: "no btn" };
  const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
  let fiber = btn[fiberKey];
  while (fiber && fiber.type?.name !== "ra") fiber = fiber.return;
  if (!fiber) return { error: "no ra" };

  let hook = fiber.memoizedState;
  let i = 0;
  const dispatchers = [];
  while (hook) {
    if (hook.queue?.dispatch) {
      const orig = hook.queue.dispatch;
      const idx = i;
      hook.queue.dispatch = function(v) {
        console.log(`[DISPATCH] hook ${idx}, value:`, JSON.stringify(v)?.substring(0, 80));
        return orig.call(this, v);
      };
      dispatchers.push({ i: idx, dispatch: orig });
    }
    hook = hook.next;
    i++;
  }
  return { patched: dispatchers.length, dispatchers: dispatchers.map(d => d.i) };
});

console.log("Patch result:", patchResult);

// Now click AGAIN
console.log("\n=== Clicking trash button after patch ===");
await trashBtn.click({ force: true });
await page.waitForTimeout(2000);

console.log("After 2nd click - dialog count:", await page.locator('[role="dialog"]').count());

console.log("\n=== Console logs ===");
logs.forEach(l => console.log(l));

await browser.close();
