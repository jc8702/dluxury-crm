import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

// Collect ALL console messages
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

// Find the trash button
const trashBtn = page.locator('button[aria-label="Excluir"]').first();
const count = await page.locator('button[aria-label="Excluir"]').count();
console.log(`\n=== Trash button count: ${count} ===\n`);

// Print the row context
const row = trashBtn.locator("xpath=ancestor::tr");
const rowText = await row.textContent();
console.log(`=== Row text: ${rowText?.substring(0, 200)} ===\n`);

// Try dispatching React-compatible click events
console.log("=== Method 1: Native .click() ===");
await trashBtn.click({ force: true });
await page.waitForTimeout(1000);

// Check for dialog
const dialogVisible1 = await page.locator('[role="dialog"]').isVisible().catch(() => false);
console.log(`Dialog visible after native click: ${dialogVisible1}`);

// Try with explicit dispatchEvent
console.log("\n=== Method 2: dispatchEvent('click', { bubbles: true }) ===");
await trashBtn.dispatchEvent("click");
await page.waitForTimeout(1000);
const dialogVisible2 = await page.locator('[role="dialog"]').isVisible().catch(() => false);
console.log(`Dialog visible after dispatchEvent: ${dialogVisible2}`);

// Try pointer events
console.log("\n=== Method 3: pointerdown/pointerup ===");
const box = await trashBtn.boundingBox();
if (box) {
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(1000);
}
const dialogVisible3 = await page.locator('[role="dialog"]').isVisible().catch(() => false);
console.log(`Dialog visible after mouse events: ${dialogVisible3}`);

// Check the React fiber attached to the button
console.log("\n=== Method 4: Check React fiber props ===");
const reactProps = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  if (!btn) return null;
  // React 18+ stores the props in a different key
  const key = Object.keys(btn).find((k) => k.startsWith("__reactProps$"));
  if (!key) return { hasFiber: false, keys: Object.keys(btn) };
  const props = btn[key];
  return {
    hasFiber: true,
    propKeys: Object.keys(props),
    hasOnClick: typeof props.onClick === "function",
    onClickBody: props.onClick ? props.onClick.toString().substring(0, 300) : null,
  };
});
console.log("React props:", JSON.stringify(reactProps, null, 2));

// Print all logs
console.log("\n=== All console messages ===");
logs.forEach((l) => console.log(l));

await page.screenshot({ path: "debug-trash-handler.png", fullPage: false });
await browser.close();
