import { chromium } from 'playwright';

const BASE = 'https://dluxury-crm.vercel.app';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[browser:error]', msg.text());
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

  // Count Excluir buttons
  const trashCount = await page.locator('button[aria-label="Excluir"]').count();
  console.log('trash buttons:', trashCount);

  // Click first
  await page.locator('button[aria-label="Excluir"]').first().click();
  await page.waitForTimeout(500);

  // Check for dialog
  const dialogVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
  console.log('dialog visible:', dialogVisible);

  // Get dialog HTML
  const dialogHTML = await page.locator('[role="dialog"]').innerHTML().catch(() => 'NO DIALOG');
  console.log('dialog HTML (first 200):', dialogHTML.substring(0, 200));

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot-orcamentos-03-confirm-delete.png', fullPage: true });
  console.log('captured');

  await browser.close();
})();
