import { chromium } from 'playwright';

const BASE = 'https://dluxury-crm.vercel.app';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const loginResp = await page.request.post(BASE + '/api/auth/login', {
  data: { email: 'admin@dluxury.com', password: 'admin123' },
  headers: { 'Content-Type': 'application/json' },
});
const { data: { token } } = await loginResp.json();
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate(t => localStorage.setItem('dluxury_token', t), token);
await page.goto(BASE + '/#/painel', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3500);
console.log('URL final:', page.url());

await page.screenshot({ path: 'screenshot-dashboard-01.png', fullPage: true });
console.log('✓ screenshot-dashboard-01.png (full page)');

await page.screenshot({ path: 'screenshot-dashboard-02-viewport.png', fullPage: false });
console.log('✓ screenshot-dashboard-02-viewport.png (viewport)');

await browser.close();
console.log('✓ Concluído');
