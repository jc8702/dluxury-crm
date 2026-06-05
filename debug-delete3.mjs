import { chromium } from 'playwright';

const BASE = 'https://dluxury-crm.vercel.app';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[err]', msg.text());
    if (msg.type() === 'log') console.log('[log]', msg.text());
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

  // Add a global click listener
  await page.evaluate(() => {
    document.addEventListener('click', (e) => {
      const t = e.target;
      console.log('CLICK:', t.tagName, t.getAttribute('aria-label'), t.outerHTML.substring(0, 100));
    }, true);
  });

  // Click trash
  console.log('clicking trash button...');
  await page.locator('button[aria-label="Excluir"]').first().click();
  await page.waitForTimeout(1000);

  // Check React state via inspecting root
  const rootHTML = await page.evaluate(() => document.getElementById('root')?.outerHTML.length);
  console.log('root HTML length:', rootHTML);

  // Look for any element with text "Excluir orçamento"
  const dialogTitle = await page.locator('text="Excluir orçamento"').count();
  console.log('dialog title count:', dialogTitle);

  // Look for any "Excluir" button besides the trash
  const excluirBtns = await page.locator('button:has-text("Excluir")').count();
  console.log('"Excluir" buttons total:', excluirBtns);

  // Check the ConfirmDialog footer button "Excluir"
  const confirmBtn = await page.locator('button:has-text("Excluir")').last().textContent().catch(() => 'none');
  console.log('last Excluir button text:', confirmBtn);

  await page.screenshot({ path: 'debug3.png', fullPage: true });
  await browser.close();
})();
