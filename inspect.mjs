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
await page.goto(BASE + '/#/clientes', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2500);

const stats = await page.locator('.grid >> nth=0').first();
const html = await stats.innerHTML().catch(() => 'not found');
console.log('=== STATS HTML ===');
console.log(html.substring(0, 2000));

const cards = await page.locator('div.grid > div').first();
const cardBox = await cards.boundingBox().catch(() => null);
console.log('\n=== FIRST STAT CARD ===');
console.log('box:', cardBox);

const icon = await page.locator('div.grid > div:nth-child(1) > div > div > div').first();
const iconBox = await icon.boundingBox().catch(() => null);
console.log('icon-box:', iconBox);

const cards2 = await page.locator('div.grid > div:nth-child(2)').first();
const card2Box = await cards2.boundingBox().catch(() => null);
console.log('card2-box:', card2Box);

const icon2 = await page.locator('div.grid > div:nth-child(2) > div > div > div').first();
const icon2Box = await icon2.boundingBox().catch(() => null);
console.log('icon2-box:', icon2Box);

await browser.close();
