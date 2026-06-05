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

console.log("=== React root delegation check ===");

// Get info about React root and its event listeners
const result = await page.evaluate(() => {
  const root = document.getElementById("root");
  const reactContainerKey = Object.keys(root).find((k) => k.startsWith("__reactContainer$"));
  const container = root[reactContainerKey];

  // Try to find the React internal state node
  const fiber = container?.stateNode?.current;

  // Check what events React is listening to on the root
  // React 18 uses a special delegated event system

  // Find the trash button
  const btn = document.querySelector('button[aria-label="Excluir"]');
  if (!btn) return { error: "no button" };

  // Test 1: Check if React event handlers work at all by triggering a button click
  // and checking if the native click event was processed by React
  let reactProcessed = false;
  const handler = (e) => {
    if (e.target.tagName === "BUTTON") {
      reactProcessed = true;
    }
  };
  document.body.addEventListener("click", handler, true);

  // Trigger a click
  btn.click();

  document.body.removeEventListener("click", handler, true);

  return {
    bodyHasReactRoot: !!root,
    bodyChildren: document.body.children.length,
    rootChildren: root?.children?.length,
    reactContainerExists: !!container,
    reactProcessed,
    rootInfo: root ? {
      tag: root.tagName,
      id: root.id,
      classes: root.className,
    } : null,
  };
});

console.log("Result:", JSON.stringify(result, null, 2));

// Now check: are the click events being delegated to the root?
console.log("\n=== Test React's event delegation ===");
const delegationTest = await page.evaluate(() => {
  // Find React's event listener by looking at the root's events
  // React 18 stores dispatch listeners on the root element
  const root = document.getElementById("root");
  if (!root) return { error: "no root" };

  // Try to find a React event listener
  // React 18 uses internal __reactEventHandlers or similar
  const keys = Object.keys(root);
  const reactKeys = keys.filter(k => k.startsWith("__react") || k.startsWith("_react"));

  // Try to find the reactProps or reactEventHandlers
  let reactProps = null;
  for (const k of keys) {
    if (k.startsWith("__reactProps")) {
      reactProps = root[k];
      break;
    }
  }

  return {
    reactKeys,
    hasReactProps: !!reactProps,
    reactPropKeys: reactProps ? Object.keys(reactProps) : null,
  };
});

console.log("Delegation test:", JSON.stringify(delegationTest, null, 2));

// Final test: try to dispatch a synthetic event that React WILL pick up
console.log("\n=== Dispatching synthetic click event ===");
const syntheticTest = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  if (!btn) return { error: "no btn" };

  // Get React fiber
  const reactPropsKey = Object.keys(btn).find((k) => k.startsWith("__reactProps$"));
  const props = btn[reactPropsKey];
  if (!props) return { error: "no props" };

  // Try invoking onClick directly
  const fakeEvent = {
    type: "click",
    target: btn,
    currentTarget: btn,
    stopPropagation: () => console.log("[STOPPROP]"),
    preventDefault: () => console.log("[PREVENT]"),
    bubbles: true,
    cancelable: true,
  };

  try {
    const result = props.onClick(fakeEvent);
    return { step: "invoked", returnValue: typeof result, isPromise: result instanceof Promise };
  } catch (e) {
    return { step: "error", error: e.message, stack: e.stack };
  }
});

console.log("Synthetic test:", syntheticTest);

await page.waitForTimeout(500);
const dialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
console.log("Dialog after synthetic click:", dialog);

console.log("\n=== Console logs ===");
logs.forEach(l => console.log(l));

await browser.close();
