import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

// Login
await page.goto("https://dluxury-crm.vercel.app/#/login", { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "admin@dluxury.com");
await page.fill('input[type="password"]', "admin123");
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);

// Navigate to orcamentos
await page.goto("https://dluxury-crm.vercel.app/#/orcamentos", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

// Check the React fiber of the trash button AND all ancestors
const fiberInfo = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  if (!btn) return { error: "no button" };

  const result = { hierarchy: [] };
  let el = btn;
  let depth = 0;
  while (el && depth < 15) {
    const reactPropsKey = Object.keys(el).find((k) => k.startsWith("__reactProps$"));
    const props = reactPropsKey ? el[reactPropsKey] : null;
    result.hierarchy.push({
      tag: el.tagName,
      classes: el.className?.substring(0, 80),
      hasReactProps: !!props,
      hasOnClick: !!(props && props.onClick),
      onClickBody: props?.onClick ? props.onClick.toString().substring(0, 100) : null,
    });
    el = el.parentElement;
    depth++;
  }
  return result;
});

console.log("=== DOM hierarchy from trash button to root ===");
fiberInfo.hierarchy?.forEach((h, i) => {
  console.log(`${i}: <${h.tag}> classes=${h.classes}`);
  console.log(`   hasOnClick=${h.hasOnClick}, onClick=${h.onClickBody}`);
});

// Now also check: are there any document-level event listeners?
const docInfo = await page.evaluate(() => {
  return {
    bodyTagName: document.body.tagName,
    reactRoot: !!document.getElementById("root"),
    bodyChildren: document.body.children.length,
    appDiv: document.getElementById("root")?.children.length,
  };
});
console.log("\n=== Document structure ===");
console.log(docInfo);

// Try clicking the button and immediately check React state
console.log("\n=== Attempting click + checking React state ===");
const result = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  if (!btn) return { error: "no button" };

  // Get React fiber
  const reactPropsKey = Object.keys(btn).find((k) => k.startsWith("__reactProps$"));
  const props = reactPropsKey ? btn[reactPropsKey] : null;
  if (!props || !props.onClick) return { error: "no onClick" };

  // Manually invoke the onClick with a fake event
  try {
    const fakeEvent = { stopPropagation: () => {} };
    props.onClick(fakeEvent);
    return { success: true, invoked: "props.onClick(fakeEvent)" };
  } catch (e) {
    return { error: "invocation failed: " + e.message };
  }
});
console.log("Manual invocation result:", result);

// Wait and check if dialog is now visible
await page.waitForTimeout(500);
const dialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
console.log("Dialog visible after manual invocation:", dialog);

await page.screenshot({ path: "debug-manual-click.png", fullPage: false });
await browser.close();
