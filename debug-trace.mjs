import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

// Capture EVERYTHING
const logs = [];
page.on("console", (msg) => {
  logs.push(`[${msg.type()}] ${msg.text()}`);
});
page.on("pageerror", (err) => {
  logs.push(`[PAGE-ERROR] ${err.message}`);
});

// Login
await page.goto("https://dluxury-crm.vercel.app/#/login", { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "admin@dluxury.com");
await page.fill('input[type="password"]', "admin123");
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);

// Navigate to orcamentos
await page.goto("https://dluxury-crm.vercel.app/#/orcamentos", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

console.log("=== Initial state ===");
let dialogCount = await page.locator('[role="dialog"]').count();
console.log(`Dialog count: ${dialogCount}`);

// Now: invoke the onClick and inspect React state
const result = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  if (!btn) return { error: "no button" };

  // Get React fiber
  const reactPropsKey = Object.keys(btn).find((k) => k.startsWith("__reactProps$"));
  const props = reactPropsKey ? btn[reactPropsKey] : null;
  if (!props || !props.onClick) return { error: "no onClick" };

  // Take baseline dialog count
  const beforeDialogs = document.querySelectorAll('[role="dialog"]').length;

  // Call onClick
  const fakeEvent = { stopPropagation: () => {} };
  const result = props.onClick(fakeEvent);

  // Synchronously check after invocation
  const afterDialogs = document.querySelectorAll('[role="dialog"]').length;

  return {
    beforeDialogs,
    afterDialogs,
    clickReturned: typeof result,
  };
});

console.log("\n=== After manual invocation ===");
console.log(JSON.stringify(result, null, 2));

// Wait a bit and check again (React may batch updates)
await page.waitForTimeout(500);
const dialogAfter = await page.evaluate(() => {
  return {
    count: document.querySelectorAll('[role="dialog"]').length,
    visible: !!Array.from(document.querySelectorAll('[role="dialog"]')).find(d => d.offsetParent !== null),
    bodyHTML: document.body.innerHTML.length,
  };
});
console.log("After 500ms:", dialogAfter);

// Try the REAL click via Playwright
console.log("\n=== Now try real Playwright click ===");
const trashBtn = page.locator('button[aria-label="Excluir"]').first();
await trashBtn.click({ force: true });
await page.waitForTimeout(500);

const dialogAfterReal = await page.evaluate(() => {
  return {
    count: document.querySelectorAll('[role="dialog"]').length,
    visible: !!Array.from(document.querySelectorAll('[role="dialog"]')).find(d => d.offsetParent !== null),
  };
});
console.log("After real click:", dialogAfterReal);

console.log("\n=== All console logs ===");
logs.forEach(l => console.log(l));

await page.screenshot({ path: "debug-trace.png", fullPage: false });
await browser.close();
