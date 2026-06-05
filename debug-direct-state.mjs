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

// STEP 1: Walk the fiber tree from the trash button UP to the ra component
// STEP 2: Find the state hook that contains pendingDelete
// STEP 3: Directly call the setter

const result = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  if (!btn) return { error: "no button" };

  // Get fiber
  const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
  let fiber = btn[fiberKey];

  // Walk up to find ra (QuotationForm)
  while (fiber && (fiber.type?.name !== "ra" && fiber.type?.displayName !== "ra")) {
    fiber = fiber.return;
  }
  if (!fiber) return { error: "ra not found" };

  // Now fiber is the QuotationForm fiber
  // Its state hook chain starts at fiber.memoizedState
  const states = [];
  let hook = fiber.memoizedState;
  let i = 0;
  while (hook && i < 30) {
    let preview = '';
    try {
      const v = hook.memoizedState;
      if (v === null) preview = 'null';
      else if (Array.isArray(v)) preview = 'array[' + v.length + ']';
      else if (typeof v === 'object') preview = 'object{...}';
      else preview = String(v).substring(0, 50);
    } catch (e) { preview = '<unserializable>'; }
    states.push({
      i,
      hasMemoizedState: hook.memoizedState !== undefined,
      value: typeof hook.memoizedState === 'object' && hook.memoizedState !== null
        ? (Array.isArray(hook.memoizedState) ? 'array' : 'object')
        : typeof hook.memoizedState,
      preview,
      hasQueue: !!hook.queue,
      hasDispatch: !!(hook.queue && hook.queue.dispatch),
      hasNext: !!hook.next,
    });
    hook = hook.next;
    i++;
  }

  return {
    componentName: fiber.type.name,
    hasState: !!fiber.memoizedState,
    states,
  };
});

console.log("=== QuotationForm state hooks ===");
console.log(JSON.stringify(result, null, 2));

// STEP 4: Now find the specific state hook for pendingDelete
// pendingDelete is the 9th useState in the source code (0-indexed = 8)
// But hooks have order: useState x 11, useEffect x 2, useCallback x many, useMemo
// We need to identify the pendingDelete state

// STEP 5: Call the setter directly
const directSetState = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  if (!btn) return { error: "no button" };

  const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
  let fiber = btn[fiberKey];

  // Walk up to find ra
  while (fiber && (fiber.type?.name !== "ra" && fiber.type?.displayName !== "ra")) {
    fiber = fiber.return;
  }
  if (!fiber) return { error: "ra not found" };

  // Find useState hooks (have queue.dispatch)
  const setStates = [];
  let hook = fiber.memoizedState;
  let i = 0;
  while (hook) {
    if (hook.queue && hook.queue.dispatch) {
      setStates.push({
        i,
        dispatchType: typeof hook.queue.dispatch,
        valueType: typeof hook.memoizedState,
        value: JSON.stringify(hook.memoizedState).substring(0, 50),
      });
    }
    hook = hook.next;
    i++;
  }

  return { setStates };
});

console.log("\n=== All setState dispatchers ===");
console.log(JSON.stringify(directSetState, null, 2));

// STEP 6: Try to call the dispatch directly
console.log("\n=== Trying to directly set pendingDelete state ===");
const triggerState = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Excluir"]');
  const fiberKey = Object.keys(btn).find((k) => k.startsWith("__reactFiber$"));
  let fiber = btn[fiberKey];
  while (fiber && (fiber.type?.name !== "ra" && fiber.type?.displayName !== "ra")) {
    fiber = fiber.return;
  }
  if (!fiber) return { error: "no ra" };

  // Walk hooks
  const dispatchers = [];
  let hook = fiber.memoizedState;
  let i = 0;
  while (hook) {
    if (hook.queue?.dispatch) {
      dispatchers.push({ i, dispatch: hook.queue.dispatch });
    }
    hook = hook.next;
    i++;
  }

  // pendingDelete is null initially. Try setting it via each dispatcher
  // The 9th setState is the pendingDelete (from source: const [V, ae] = h.useState(null))
  // Let's count setStates only (no effects/callbacks)
  const setStateDispatchers = dispatchers.map(d => d.dispatch);

  // Try the 9th one (index 8)
  if (setStateDispatchers.length > 8) {
    try {
      setStateDispatchers[8]({ id: "test", numeroOrcamento: "TEST-001" });
      return { success: true, called: "dispatcher[8]" };
    } catch (e) {
      return { error: "dispatcher[8] failed: " + e.message };
    }
  }
  return { error: "not enough dispatchers", count: setStateDispatchers.length };
});

console.log("Direct state trigger:", triggerState);

await page.waitForTimeout(800);
const dialog = await page.locator('[role="dialog"]').isVisible().catch(() => false);
console.log("Dialog after direct state trigger:", dialog);

await page.screenshot({ path: "trace-direct-state.png" });

console.log("\n=== Console logs ===");
logs.forEach(l => console.log(l));

await browser.close();
