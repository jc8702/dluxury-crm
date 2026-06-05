import { chromium } from 'playwright';

const BASE = 'https://dluxury-crm.vercel.app';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('pageerror', (err) => console.log('[pageerror]', err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[error]', msg.text());
  });

  await page.goto(`${BASE}/#/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.fill('input[type="email"]', 'admin@dluxury.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 30000 });

  await page.goto(`${BASE}/#/orcamentos`);
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Inspect button
  const btnInfo = await page.locator('button[aria-label="Excluir"]').first().evaluate((el) => ({
    outerHTML: el.outerHTML.substring(0, 200),
    hasOnClick: !!el.onclick,
    parentTag: el.parentElement?.tagName,
    parentClass: el.parentElement?.className,
  }));
  console.log('button info:', JSON.stringify(btnInfo, null, 2));

  // Click and check pendingDelete via React DevTools-like check
  await page.locator('button[aria-label="Excluir"]').first().click();
  await page.waitForTimeout(800);

  // Look for any modal in DOM
  const modals = await page.locator('[role="dialog"]').count();
  console.log('dialogs in DOM:', modals);

  const portals = await page.evaluate(() => {
    const allDivs = document.querySelectorAll('div');
    let portals = [];
    for (const d of allDivs) {
      if (d.style.position === 'fixed' || getComputedStyle(d).position === 'fixed') {
        const rect = d.getBoundingClientRect();
        portals.push({
          className: d.className.substring(0, 80),
          width: rect.width,
          height: rect.height,
          zIndex: getComputedStyle(d).zIndex,
        });
      }
    }
    return portals.slice(0, 5);
  });
  console.log('fixed elements:', JSON.stringify(portals, null, 2));

  await page.screenshot({ path: 'debug-after-click.png', fullPage: true });
  console.log('done');
  await browser.close();
})();
