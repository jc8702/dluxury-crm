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

  // Try Editar button
  console.log('--- clicking Editar ---');
  await page.locator('button:has-text("Editar")').first().click();
  await page.waitForTimeout(2000);
  console.log('--- after Editar --- URL:', page.url());

  // Back
  await page.goto(`${BASE}/#/orcamentos`);
  await page.waitForTimeout(2000);

  // Try PDF icon
  console.log('--- clicking PDF ---');
  const pdfBtn = page.locator('button[aria-label="Visualizar PDF"]').first();
  const pdfCount = await pdfBtn.count();
  console.log('PDF buttons:', pdfCount);
  if (pdfCount > 0) {
    // Listen for popup
    const popupPromise = page.waitForEvent('popup', { timeout: 3000 }).catch(() => null);
    await pdfBtn.click();
    const popup = await popupPromise;
    console.log('popup opened:', !!popup);
    if (popup) await popup.close();
  }

  await browser.close();
})();
