import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://localhost:5173';
const results = {};

/**
 * Módulos a serem testados via UI.
 * Cada teste captura: status, erros JS, network failures, e observações.
 */
const MODULES = [
  { id: 'landing', path: '/', requiresAuth: false, label: 'Landing Page' },
  { id: 'login', path: '/#/login', requiresAuth: false, label: 'Login' },
  { id: 'dashboard', path: '/#/painel', requiresAuth: true, label: 'Dashboard' },
  { id: 'clientes', path: '/#/clientes', requiresAuth: true, label: 'Clientes' },
  { id: 'orcamentos', path: '/#/orcamentos', requiresAuth: true, label: 'Orcamentos' },
  { id: 'producao', path: '/#/producao', requiresAuth: true, label: 'Producao' },
  { id: 'plano-corte', path: '/#/plano-corte', requiresAuth: true, label: 'Plano de Corte' },
  { id: 'simulador-corte', path: '/#/simulador-corte', requiresAuth: true, label: 'Simulador Corte' },
  { id: 'simulador-producao', path: '/#/simulador-producao', requiresAuth: true, label: 'Simulador Producao' },
  { id: 'estoque', path: '/#/estoque', requiresAuth: true, label: 'Estoque' },
  { id: 'financeiro', path: '/#/financeiro', requiresAuth: true, label: 'Financeiro' },
  { id: 'fluxo-caixa', path: '/#/financeiro/fluxo-caixa', requiresAuth: true, label: 'Fluxo de Caixa' },
  { id: 'dre', path: '/#/financeiro/dre', requiresAuth: true, label: 'DRE' },
  { id: 'titulos-receber', path: '/#/financeiro/titulos-receber', requiresAuth: true, label: 'Titulos a Receber' },
  { id: 'titulos-pagar', path: '/#/financeiro/titulos-pagar', requiresAuth: true, label: 'Titulos a Pagar' },
  { id: 'rentabilidade', path: '/#/financeiro/rentabilidade', requiresAuth: true, label: 'Rentabilidade' },
  { id: 'projetos', path: '/#/projetos', requiresAuth: true, label: 'Projetos' },
  { id: 'visitas', path: '/#/visitas', requiresAuth: true, label: 'Visitas' },
  { id: 'calendario', path: '/#/calendario', requiresAuth: true, label: 'Calendario' },
  { id: 'pos-venda', path: '/#/pos-venda', requiresAuth: true, label: 'Pos Venda' },
  { id: 'fornecedores', path: '/#/fornecedores', requiresAuth: true, label: 'Fornecedores' },
  { id: 'engenharia', path: '/#/engenharia', requiresAuth: true, label: 'Engenharia' },
  { id: 'skus', path: '/#/skus', requiresAuth: true, label: 'SKUs' },
  { id: 'relatorios', path: '/#/relatorios', requiresAuth: true, label: 'Relatorios' },
  { id: 'compras', path: '/#/compras', requiresAuth: true, label: 'Compras' },
  { id: 'aprovacao', path: '/#/aprovacao', requiresAuth: true, label: 'Aprovacao' },
  { id: 'prospeccao', path: '/#/prospeccao', requiresAuth: true, label: 'Prospeccao' },
  { id: 'retalhos', path: '/#/retalhos', requiresAuth: true, label: 'Retalhos' },
  { id: 'configuracoes', path: '/#/configuracoes', requiresAuth: true, label: 'Configuracoes' },
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const consoleErrors = [];
const networkErrors = [];

page.on('console', (msg) => {
  if (msg.type() === 'error') {
    consoleErrors.push({ url: page.url(), text: msg.text() });
  }
});

page.on('pageerror', (err) => {
  consoleErrors.push({ url: page.url(), text: '[pageerror] ' + err.message });
});

page.on('response', (resp) => {
  if (resp.status() >= 400) {
    networkErrors.push({ url: resp.url(), status: resp.status(), page: page.url() });
  }
});

// 1) Landing
try {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const heroVisible = await page.locator('h1, h2').first().isVisible().catch(() => false);
  const title = await page.title();
  results.landing = { status: heroVisible ? 'OK' : 'PARTIAL', title, hero: heroVisible };
  console.log(`[Landing] status=${results.landing.status} title="${title}"`);
} catch (e) {
  results.landing = { status: 'FAIL', error: e.message };
}

// 2) Login
try {
  await page.goto(BASE + '/#/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  // Try login
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const pwdInput = page.locator('input[type="password"]').first();
  const submitBtn = page.locator('button[type="submit"]').first();

  await emailInput.fill('admin@dluxury.com');
  await pwdInput.fill('admin123');
  await submitBtn.click();
  await page.waitForTimeout(3000);

  const url = page.url();
  results.login = { status: url.includes('/painel') || url.includes('/dashboard') ? 'OK' : 'PARTIAL', afterLoginUrl: url };
  console.log(`[Login] status=${results.login.status} url=${url}`);
} catch (e) {
  results.login = { status: 'FAIL', error: e.message };
}

// 3) Modules
for (const m of MODULES.filter((x) => x.requiresAuth)) {
  consoleErrors.length = 0;
  networkErrors.length = 0;
  try {
    await page.goto(BASE + m.path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const bodyText = await page.locator('body').textContent().catch(() => '');
    const hasError =
      bodyText.toLowerCase().includes('something went wrong') ||
      bodyText.toLowerCase().includes('erro') && bodyText.toLowerCase().includes('500') ||
      bodyText.toLowerCase().includes('cannot read') ||
      bodyText.toLowerCase().includes('undefined is not');
    const headings = await page.locator('h1, h2, h3').allTextContents();
    const buttonCount = await page.locator('button').count();
    const inputCount = await page.locator('input,select,textarea').count();
    const hasContent = bodyText.length > 200;
    results[m.id] = {
      status: hasError ? 'FAIL' : hasContent ? 'OK' : 'PARTIAL',
      headings: headings.slice(0, 5),
      buttonCount,
      inputCount,
      bodyLength: bodyText.length,
      consoleErrors: consoleErrors.slice(0, 3),
      networkErrors: networkErrors.slice(0, 3),
    };
    console.log(
      `[${m.label}] status=${results[m.id].status} bodyLen=${bodyText.length} btns=${buttonCount} inputs=${inputCount} cE=${consoleErrors.length} nE=${networkErrors.length}`,
    );
  } catch (e) {
    results[m.id] = { status: 'FAIL', error: e.message };
    console.log(`[${m.label}] FAIL: ${e.message}`);
  }
}

// 4) Design System: Dark Mode
try {
  await page.goto(BASE + '/#/painel', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const initialClass = await page.evaluate(() => document.documentElement.className);
  // Try toggle theme (look for any button with "tema" or sun/moon icon)
  const themeBtn = page
    .locator('button[aria-label*="tema" i], button[aria-label*="theme" i], button[title*="tema" i]')
    .first();
  if ((await themeBtn.count()) > 0) {
    await themeBtn.click();
    await page.waitForTimeout(800);
  }
  const afterClass = await page.evaluate(() => document.documentElement.className);
  const dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  results.darkMode = {
    status: initialClass !== afterClass || dataTheme ? 'OK' : 'PARTIAL',
    initialClass,
    afterClass,
    dataTheme,
  };
  console.log(`[DarkMode] status=${results.darkMode.status} before="${initialClass}" after="${afterClass}" data-theme=${dataTheme}`);
} catch (e) {
  results.darkMode = { status: 'FAIL', error: e.message };
}

// 5) Mobile responsive
try {
  await context.close();
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto(BASE + '/#/painel', { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(2000);
  const hamburger = await mobilePage
    .locator('button[aria-label*="menu" i], button[aria-label*="abrir" i]')
    .first();
  const hasHamburger = (await hamburger.count()) > 0;
  results.mobile = {
    status: hasHamburger ? 'OK' : 'PARTIAL',
    hasHamburger,
  };
  await mobileCtx.close();
  console.log(`[Mobile] status=${results.mobile.status} hamburger=${hasHamburger}`);
} catch (e) {
  results.mobile = { status: 'FAIL', error: e.message };
}

await browser.close();

writeFileSync('/tmp/module_audit.json', JSON.stringify(results, null, 2));
console.log('\n=== SUMMARY ===');
const ok = Object.values(results).filter((r) => r.status === 'OK').length;
const partial = Object.values(results).filter((r) => r.status === 'PARTIAL').length;
const fail = Object.values(results).filter((r) => r.status === 'FAIL').length;
console.log(`OK=${ok} PARTIAL=${partial} FAIL=${fail} TOTAL=${Object.keys(results).length}`);
