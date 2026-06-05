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

console.log("=== Check QuotationForm state ===");

// Check all state values
const state = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  if (!btn) {
    return { error: "no trash btn - probably error screen" };
  }
  const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
  let fiber = btn[fiberKey];
  while (fiber && fiber.type?.name !== "ra") fiber = fiber.return;
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
      else if (typeof v === 'object') {
        try {
          preview = `object{${Object.keys(v).slice(0, 4).join(',')}}`;
        } catch { preview = 'object{...}'; }
      }
      else preview = String(v).substring(0, 30);
      states.push({ i, type: typeof v, value: preview });
    }
    hook = hook.next;
    i++;
  }
  return { states, trashBtnExists: true };
});

console.log("Trash button exists:", state.trashBtnExists);
if (state.states) {
  state.states.forEach(s => console.log(`  hook ${s.i}: ${s.type} = ${s.value}`));
}

// Check what's on the page
const pageInfo = await page.evaluate(() => {
  return {
    bodyText: document.body.innerText.substring(0, 800),
    h1Text: Array.from(document.querySelectorAll("h1")).map(h => h.textContent).join(" | "),
    hasError: document.body.innerText.includes("Erro ao carregar"),
    hasLoading: document.body.innerText.includes("Sincronizando"),
  };
});
console.log("\nPage info:", JSON.stringify(pageInfo, null, 2));

await page.screenshot({ path: "trace-current-state.png" });
await browser.close();
