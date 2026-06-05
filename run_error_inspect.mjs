import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const allErrors = [];

page.on('console', (msg) => {
  if (msg.type() === 'error') {
    allErrors.push({ type: 'console', url: page.url(), text: msg.text() });
  }
});

page.on('pageerror', (err) => {
  allErrors.push({ type: 'pageerror', url: page.url(), text: err.message });
});

page.on('response', (resp) => {
  if (resp.status() >= 400) {
    allErrors.push({ type: 'http', url: resp.url(), status: resp.status(), page: page.url() });
  }
});

const MODULES = [
  '/#/producao',
  '/#/plano-corte',
  '/#/financeiro',
  '/#/financeiro/fluxo-caixa',
  '/#/financeiro/titulos-receber',
  '/#/financeiro/titulos-pagar',
  '/#/financeiro/rentabilidade',
  '/#/projetos',
  '/#/visitas',
  '/#/calendario',
  '/#/pos-venda',
  '/#/fornecedores',
  '/#/engenharia',
  '/#/relatorios',
  '/#/compras',
  '/#/configuracoes',
];

// Login first
await page.goto(BASE + '/#/login', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await page.locator('input[type="email"]').first().fill('admin@dluxury.com');
await page.locator('input[type="password"]').first().fill('admin123');
await page.locator('button[type="submit"]').first().click();
await page.waitForTimeout(3000);

for (const m of MODULES) {
  allErrors.length = 0;
  await page.goto(BASE + m, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  console.log(`\n=== ${m} ===`);
  console.log(`Total errors: ${allErrors.length}`);
  for (const e of allErrors.slice(0, 5)) {
    console.log(`  [${e.type}] ${e.text || e.status} ${e.url.replace(BASE, '')}`);
  }
}

await browser.close();
