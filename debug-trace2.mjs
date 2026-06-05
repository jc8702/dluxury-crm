import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

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
await page.waitForTimeout(2500);

// Navigate
await page.goto("https://dluxury-crm.vercel.app/#/orcamentos", { waitUntil: "networkidle" });
await page.waitForTimeout(3500);

// Test: take screenshot, get trash button position
const trashBtn = page.locator('button[aria-label="Excluir"]').first();
const isVisible = await trashBtn.isVisible();
console.log("Trash button visible:", isVisible);

// Take baseline screenshot
await page.screenshot({ path: "trace-01-before-click.png" });

// Now click and check states
console.log("\n=== Click attempt ===");

// Method A: Playwright click with force
await trashBtn.click({ force: true, timeout: 5000 });
await page.waitForTimeout(300);

let dialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
console.log("After Playwright click:", { dialogVisible: dialog });

await page.screenshot({ path: "trace-02-after-pw-click.png" });

// Method B: Use evaluate to do everything atomically
console.log("\n=== Atomic React invocation ===");
const result = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  if (!btn) return { step: "no-button" };

  const reactPropsKey = Object.keys(btn).find((k) => k.startsWith("__reactProps$"));
  const props = reactPropsKey ? btn[reactPropsKey] : null;
  if (!props) return { step: "no-props" };
  if (!props.onClick) return { step: "no-onclick" };

  try {
    const fakeEvent = { stopPropagation: () => console.log("stopProp called") };
    const ret = props.onClick(fakeEvent);
    return { step: "invoked", returnType: typeof ret, isPromise: ret instanceof Promise };
  } catch (e) {
    return { step: "error", msg: e.message };
  }
});
console.log("Atomic result:", result);

await page.waitForTimeout(500);

// Now check dialog
dialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
console.log("After manual invoke:", { dialogVisible: dialog });

await page.screenshot({ path: "trace-03-after-manual.png" });

// Check all React portals - the dialog might be rendered but in a portal at body level
const portalInfo = await page.evaluate(() => {
  const allDivs = document.body.querySelectorAll("div");
  const portals = [];
  allDivs.forEach((d) => {
    if (d.getAttribute("role") === "dialog" || d.className?.includes?.("fixed") && d.className?.includes("inset-0")) {
      portals.push({
        role: d.getAttribute("role"),
        classes: d.className?.substring(0, 100),
        visible: d.offsetParent !== null,
        children: d.children.length,
      });
    }
  });
  return {
    bodyHTML: document.body.innerHTML.length,
    portalCount: portals.length,
    portals: portals.slice(0, 5),
  };
});
console.log("\nPortal info:", JSON.stringify(portalInfo, null, 2));

console.log("\n=== Console logs ===");
logs.forEach((l) => console.log(l));

await browser.close();
