import { chromium } from 'playwright';

const BASE = 'https://dluxury-crm.vercel.app';
const ID = '6fd21801-64ad-415f-8e3b-8f4dfe90caf2';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[browser:error]', msg.text());
  });

  // Login
  await page.goto(`${BASE}/#/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.fill('input[type="email"]', 'admin@dluxury.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.toString().includes('/login'), { timeout: 30000 });

  // Lista
  await page.goto(`${BASE}/#/orcamentos`);
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshot-orcamentos-01-lista.png', fullPage: true });
  console.log('captured lista');

  // Detalhe — direct URL with id
  await page.goto(`${BASE}/?id=${ID}#/orcamentos`);
  await page.waitForTimeout(4500);
  await page.screenshot({ path: 'screenshot-orcamentos-02-detalhe.png', fullPage: true });
  console.log('captured detalhe');

  // Confirm delete
  await page.goto(`${BASE}/#/orcamentos`);
  await page.waitForTimeout(2000);
  await page.locator('button[aria-label="Excluir"]').first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'screenshot-orcamentos-03-confirm-delete.png', fullPage: true });
  console.log('captured confirm-delete');

  await browser.close();
})();
