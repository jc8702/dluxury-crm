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
await page.waitForTimeout(3000);

console.log("=== Test: Real Playwright click + inspect the React fiber of the trash button ===");

// Get the trash button's onClick reference
const onClickInfo = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  if (!btn) return null;
  const reactPropsKey = Object.keys(btn).find((k) => k.startsWith("__reactProps$"));
  const props = btn[reactPropsKey];
  if (!props) return null;
  return {
    onClickStr: props.onClick?.toString(),
  };
});

console.log("onClick info:", onClickInfo);

// Now: click the trash button and check the state in the SAME render cycle
const trashBtn = page.locator('button[aria-label="Excluir"]').first();

console.log("\n=== Test: Click and trace ===");

// Add a script that monitors the fiber state RIGHT after the click
await page.evaluate(() => {
  window.__clickTrace = [];
  const btn = document.querySelector('button[aria-label="Excluir"]');
  if (!btn) {
    window.__clickTrace.push("no btn");
    return;
  }

  // Patch the dispatch
  const reactPropsKey = Object.keys(btn).find((k) => k.startsWith("__reactProps$"));
  const props = btn[reactPropsKey];
  if (!props || !props.onClick) {
    window.__clickTrace.push("no onClick");
    return;
  }

  // Wrap the onClick to log
  const origOnClick = props.onClick;
  props.onClick = function(e) {
    window.__clickTrace.push("onClick called");
    return origOnClick(e);
  };
});

await trashBtn.click({ force: true });
await page.waitForTimeout(100);

// Read the trace
const trace = await page.evaluate(() => window.__clickTrace);
console.log("Click trace:", trace);

await page.waitForTimeout(2000);

const dialog = await page.locator('[role="dialog"]').count();
const hasExcluir = await page.evaluate(() => document.body.innerHTML.includes("Excluir or\u00e7amento") || document.body.innerHTML.includes("Tem certeza"));
console.log(`Dialog count: ${dialog}, hasExcluir: ${hasExcluir}`);

console.log("\n=== Console logs ===");
logs.forEach(l => console.log(l));
await browser.close();
