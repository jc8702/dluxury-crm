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
console.log("Going to login page...");
await page.goto("https://dluxury-crm.vercel.app/#/login", { waitUntil: "networkidle" });
console.log("Login page loaded");
await page.waitForTimeout(1000);

await page.fill('input[type="email"]', "admin@dluxury.com");
await page.fill('input[type="password"]', "admin123");
console.log("Credentials filled, clicking submit...");
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);

console.log("Current URL after login:", page.url());

// Navigate to orcamentos
console.log("Going to orcamentos page...");
await page.goto("https://dluxury-crm.vercel.app/#/orcamentos", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

console.log("Current URL:", page.url());

// Check what's on the page
const pageInfo = await page.evaluate(() => {
  return {
    title: document.title,
    bodyText: document.body.innerText.substring(0, 500),
    h1Count: document.querySelectorAll("h1").length,
    h1Text: Array.from(document.querySelectorAll("h1")).map(h => h.textContent),
    trashCount: document.querySelectorAll('button[aria-label="Excluir"]').length,
    tableCount: document.querySelectorAll("table").length,
    allButtons: Array.from(document.querySelectorAll("button")).slice(0, 10).map(b => ({
      text: b.textContent?.substring(0, 30),
      ariaLabel: b.getAttribute("aria-label"),
    })),
  };
});

console.log("\n=== Page info ===");
console.log(JSON.stringify(pageInfo, null, 2));

await page.screenshot({ path: "debug-page-state.png", fullPage: true });

console.log("\n=== Console logs ===");
logs.forEach(l => console.log(l));

await browser.close();
