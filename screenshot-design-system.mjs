import { chromium } from 'playwright';

const BASE = 'https://dluxury-crm.vercel.app';
const EMAIL = 'admin@dluxury.com';
const PASSWORD = 'Millena@@2017@@';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`));

console.log('1. Acessando landing...');
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1000);

// Clicar em "Entrar"
console.log('2. Clicando em Entrar...');
const entrar = page.locator('a:has-text("Entrar"), button:has-text("Entrar")').first();
if (await entrar.count() > 0) {
  await entrar.click();
  await page.waitForTimeout(2500);
  console.log('   URL após Entrar:', page.url());
}
await page.screenshot({ path: 'screenshot-02-login-page.png', fullPage: false });

// Preencher login
console.log('3. Preenchendo credenciais...');
const emailInput = page.locator('input[type="email"], input[name="email"]').first();
const passInput = page.locator('input[type="password"]').first();
const cntEmail = await emailInput.count();
const cntPass = await passInput.count();
console.log('   email inputs:', cntEmail, '| pass inputs:', cntPass);

if (cntEmail > 0 && cntPass > 0) {
  await emailInput.fill(EMAIL);
  await passInput.fill(PASSWORD);
  await page.screenshot({ path: 'screenshot-03-filled.png', fullPage: false });

  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();
  await page.waitForTimeout(4000);
  console.log('   URL após submit:', page.url());
}
await page.screenshot({ path: 'screenshot-04-after-auth.png', fullPage: false });

// Navegar para Clientes
console.log('4. Indo para /clients...');
await page.goto(BASE + '/clients', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
await page.waitForTimeout(3000);
console.log('   URL final:', page.url());
await page.screenshot({ path: 'screenshot-05-clients.png', fullPage: true });

// Tentar abrir modal de Novo Cliente
console.log('5. Abrindo modal Novo Cliente...');
const novoBtn = page.locator('button:has-text("Novo cliente")').first();
if (await novoBtn.count() > 0) {
  await novoBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'screenshot-06-modal-novo.png', fullPage: false });
  console.log('   ✓ Modal aberto');
} else {
  console.log('   (botão Novo cliente não encontrado)');
}

// Fechar modal e testar edição
await page.keyboard.press('Escape');
await page.waitForTimeout(800);

// Testar uma linha (cliente) da tabela para ver hover state
const firstRow = page.locator('table tbody tr').first();
if (await firstRow.count() > 0) {
  await firstRow.hover();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshot-07-row-hover.png', fullPage: false });
}

// Tentar confirmar exclusão (clicar no botão de excluir)
const deleteBtn = page.locator('button[aria-label*="Excluir" i], button:has-text("Excluir"), button:has-text("Lixeira")').first();
if (await deleteBtn.count() > 0) {
  await deleteBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot-08-confirm-delete.png', fullPage: false });
}

if (errors.length) {
  console.log('\n=== ERROS DE PÁGINA ===');
  errors.forEach(e => console.log(e));
}

await browser.close();
console.log('\n✓ Concluído');
