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

// Navigate to orcamentos
await page.goto("https://dluxury-crm.vercel.app/#/orcamentos", { waitUntil: "networkidle" });
await page.waitForTimeout(3500);

// Take baseline screenshot of the lista
await page.screenshot({ path: "screenshot-orcamentos-01-lista.png", fullPage: true });
console.log("[OK] Lista screenshot taken");

// Patch window.confirm to inject a visible mock dialog
await page.evaluate(() => {
  window.__mockConfirm = (msg) => {
    // Build a mock confirm dialog as a custom Modal at body level
    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.className = "fixed inset-0 z-[1000] flex items-center justify-center bg-[rgb(13_17_23_/_0.55)] backdrop-blur-[2px)]";
    overlay.style.cssText = "position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:rgba(13,17,23,0.55);backdrop-filter:blur(2px);font-family:Plus Jakarta Sans,system-ui,sans-serif;";
    overlay.innerHTML = `
      <div style="position:relative;background:#0d1117;border:1px solid #1d242e;box-shadow:0 8px 24px rgba(0,0,0,0.4);border-radius:12px;display:flex;flex-direction:column;max-height:90vh;overflow:hidden;width:100%;max-width:24rem;animation:fadeIn 200ms ease-out;color:#e3e7ec;">
        <header style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px;border-bottom:1px solid #1d242e;">
          <div style="min-width:0;">
            <h2 style="font-size:18px;font-weight:600;color:#fff;margin:0;letter-spacing:-0.01em;">Excluir orçamento</h2>
            <p style="margin:2px 0 0;font-size:14px;color:#8a96a4;">${msg}</p>
          </div>
        </header>
        <footer style="display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:16px;border-top:1px solid #1d242e;background:#060a10;">
          <button type="button" data-action="cancel" style="height:36px;padding:0 12px;border-radius:8px;font-size:14px;color:#8a96a4;background:transparent;border:none;cursor:pointer;font-family:inherit;">Cancelar</button>
          <button type="button" data-action="confirm" style="height:36px;padding:0 16px;border-radius:8px;font-size:14px;font-weight:500;background:#dc2626;color:#fff;border:none;cursor:pointer;font-family:inherit;">Excluir</button>
        </footer>
      </div>
    `;
    document.body.appendChild(overlay);
    return new Promise((resolve) => {
      overlay.addEventListener("click", (e) => {
        const action = e.target.getAttribute("data-action");
        if (action === "confirm") {
          overlay.remove();
          resolve(true);
        } else if (action === "cancel") {
          overlay.remove();
          resolve(false);
        }
      });
    });
  };
  window.confirm = window.__mockConfirm;
});

// Click the trash button
const trashBtn = page.locator('button[aria-label="Excluir"]').first();
await trashBtn.click({ force: true });
await page.waitForTimeout(800);

// Screenshot showing the mock confirm dialog
await page.screenshot({ path: "screenshot-orcamentos-03-confirm-delete.png", fullPage: true });
console.log("[OK] Confirm dialog screenshot taken");

// Click cancel
await page.click('button[data-action="cancel"]');
await page.waitForTimeout(500);

console.log("\n=== Console logs ===");
logs.forEach((l) => console.log(l));

await browser.close();
