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

console.log("=== Test: Capture pendingDelete state before/after click ===");

// Get initial state
const initialState = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  if (!btn) return { error: "no btn" };
  const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
  let fiber = btn[fiberKey];
  while (fiber && fiber.type?.name !== "ra") fiber = fiber.return;
  if (!fiber) return { error: "no ra" };

  // Find all useState hooks and dump their state
  let hook = fiber.memoizedState;
  let i = 0;
  const states = [];
  while (hook) {
    if (hook.queue?.dispatch) {
      const v = hook.memoizedState;
      let preview;
      if (v === null) preview = 'null';
      else if (v === undefined) preview = 'undefined';
      else if (typeof v === 'boolean') preview = String(v);
      else if (typeof v === 'string') preview = `"${v}"`;
      else if (Array.isArray(v)) preview = `array[${v.length}]`;
      else if (typeof v === 'object') preview = `object{${Object.keys(v).slice(0, 3).join(',')}}`;
      else preview = String(v).substring(0, 30);
      states.push({ i, type: typeof v, value: preview });
    }
    hook = hook.next;
    i++;
  }
  return { states };
});

console.log("Initial states:");
initialState.states?.forEach(s => console.log(`  hook ${s.i}: ${s.type} = ${s.value}`));

// Save the fiber reference
await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
  let fiber = btn[fiberKey];
  while (fiber && fiber.type?.name !== "ra") fiber = fiber.return;
  window.__raFiber = fiber;
});

// Now click
console.log("\n=== Clicking trash button ===");
const trashBtn = page.locator('button[aria-label="Excluir"]').first();
await trashBtn.click({ force: true });
await page.waitForTimeout(1000);

// Get state after
const afterState = await page.evaluate(() => {
  const fiber = window.__raFiber;
  if (!fiber) return { error: "no fiber saved" };

  let hook = fiber.memoizedState;
  let i = 0;
  const states = [];
  while (hook) {
    if (hook.queue?.dispatch) {
      const v = hook.memoizedState;
      let preview;
      if (v === null) preview = 'null';
      else if (v === undefined) preview = 'undefined';
      else if (typeof v === 'boolean') preview = String(v);
      else if (typeof v === 'string') preview = `"${v}"`;
      else if (Array.isArray(v)) preview = `array[${v.length}]`;
      else if (typeof v === 'object') preview = `object{${Object.keys(v).slice(0, 3).join(',')}}`;
      else preview = String(v).substring(0, 30);
      states.push({ i, type: typeof v, value: preview });
    }
    hook = hook.next;
    i++;
  }
  return { states };
});

console.log("\nStates after click:");
afterState.states?.forEach(s => console.log(`  hook ${s.i}: ${s.type} = ${s.value}`));

// Diff
console.log("\n=== Diff ===");
if (initialState.states && afterState.states) {
  initialState.states.forEach((s, idx) => {
    const a = afterState.states[idx];
    if (a && s.value !== a.value) {
      console.log(`  *** CHANGED: hook ${s.i}: ${s.value} -> ${a.value} ***`);
    }
  });
}

// Check dialog
const dialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
console.log("\nDialog visible:", dialog);

console.log("\n=== Console logs ===");
logs.forEach(l => console.log(l));

await browser.close();
