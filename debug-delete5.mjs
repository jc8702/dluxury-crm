import { chromium } from 'playwright';

const BASE = 'https://dluxury-crm.vercel.app';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'log') console.log('[log]', msg.text());
    if (msg.type() === 'error') console.log('[err]', msg.text());
  });
  page.on('pageerror', (err) => console.log('[pageerror]', err.message));

  await page.goto(`${BASE}/#/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.fill('input[type="email"]', 'admin@dluxury.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 30000 });

  await page.goto(`${BASE}/#/orcamentos`);
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);

  console.log('--- now clicking ---');
  await page.locator('button[aria-label="Excluir"]').first().click();
  await page.waitForTimeout(2000);
  console.log('--- after click ---');

  await page.screenshot({ path: 'debug5.png', fullPage: true });
  await browser.close();
})();
