import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const logs = [];
page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));

// Login
await page.goto("https://dluxury-crm.vercel.app/#/login", { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "admin@dluxury.com");
await page.fill('input[type="password"]', "admin123");
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);
await page.goto("https://dluxury-crm.vercel.app/#/orcamentos", { waitUntil: "networkidle" });
await page.waitForTimeout(3500);

console.log("=== Setup: Patch the trash button's onClick to log state changes ===");

// Inject a comprehensive test
const result = await page.evaluate(async () => {
  // Find trash button
  const btn = document.querySelector('button[aria-label="Excluir"]');
  if (!btn) return { error: "no button" };

  // Get React fiber
  const reactFiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
  const reactPropsKey = Object.keys(btn).find((k) => k.startsWith("__reactProps$"));
  if (!reactFiberKey || !reactPropsKey) return { error: "no fiber" };

  // Walk the fiber tree to find the component
  const fiberKey = reactFiberKey;
  let fiber = btn[fiberKey];

  const components = [];
  let current = fiber;
  let depth = 0;
  while (current && depth < 20) {
    const name = current.type?.name || current.type?.displayName || (typeof current.type === 'string' ? current.type : 'unknown');
    const hasState = !!current.memoizedState;
    const hasStateNode = !!current.stateNode;
    const hasProps = !!current.memoizedProps;
    components.push({
      depth,
      name: String(name).substring(0, 30),
      hasState,
      hasStateNode,
      hasProps,
      key: current.key,
    });
    current = current.return;
    depth++;
  }

  return {
    components,
    fiberKey,
    propsKey: reactPropsKey,
  };
});

console.log("Fiber walk result:", JSON.stringify(result, null, 2));

console.log("\n=== Patch setState in React to log all state changes ===");
await page.evaluate(() => {
  // Find React internal
  const root = document.getElementById("root");
  const reactKey = Object.keys(root).find((k) => k.startsWith("__reactContainer$"));
  if (!reactKey) {
    console.log("[PATCH] No reactContainer found");
    return;
  }
  const container = root[reactKey];
  console.log("[PATCH] React container found");
});

console.log("\n=== Try to invoke setState directly ===");
const directResult = await page.evaluate(() => {
  // Find trash button
  const btn = document.querySelector('button[aria-label="Excluir"]');
  if (!btn) return { error: "no button" };

  // Get the onClick
  const reactPropsKey = Object.keys(btn).find((k) => k.startsWith("__reactProps$"));
  const props = btn[reactPropsKey];
  if (!props || !props.onClick) return { error: "no onClick" };

  // Call it with full debug
  const trace = [];
  const origLog = console.log;
  console.log = (...args) => { trace.push("LOG: " + args.join(" ")); origLog.apply(console, args); };

  try {
    const fakeEvent = { stopPropagation: () => trace.push("stopProp called") };
    const ret = props.onClick(fakeEvent);
    trace.push("onClick returned: " + typeof ret);
  } catch (e) {
    trace.push("ERROR: " + e.message);
  } finally {
    console.log = origLog;
  }

  return { trace };
});

console.log("Direct result:", JSON.stringify(directResult, null, 2));

// Wait and check dialog
await page.waitForTimeout(500);
const dialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
console.log("\nDialog after direct invoke:", dialog);

console.log("\n=== All console logs ===");
logs.forEach(l => console.log(l));

await browser.close();
