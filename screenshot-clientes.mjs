import { chromium } from 'playwright';

const BASE = 'https://dluxury-crm.vercel.app';
const EMAIL = 'admin@dluxury.com';
const PASSWORD = 'admin123';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[err] ${e.message}`));

console.log('1. Login via API...');
const loginResp = await page.request.post(BASE + '/api/auth/login', {
  data: { email: EMAIL, password: PASSWORD },
  headers: { 'Content-Type': 'application/json' },
});
const loginJson = await loginResp.json().catch(() => null);
console.log('   status:', loginResp.status());
console.log('   response keys:', loginJson ? Object.keys(loginJson).join(',') : 'null');
console.log('   success:', loginJson?.success, '| hasToken:', !!loginJson?.token, '| hasData.token:', !!loginJson?.data?.token);

let token = loginJson?.token || loginJson?.data?.token;
if (token) {
  console.log('   ✓ token obtido (length=' + token.length + ')');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(t => localStorage.setItem('dluxury_token', t), token);
  console.log('   ✓ token salvo em localStorage');
}

console.log('\n2. Navegando para /#/clientes (HashRouter)...');
await page.goto(BASE + '/#/clientes', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3500);
console.log('   URL final:', page.url());

await page.screenshot({ path: 'screenshot-clientes-01-list.png', fullPage: true });
console.log('   ✓ screenshot-clientes-01-list.png');

const novoBtn = page.locator('button:has-text("Novo cliente")').first();
const hasBtn = await novoBtn.count();
console.log('\n3. Botão "Novo cliente":', hasBtn > 0 ? 'ENCONTRADO' : 'NÃO ENCONTRADO');

if (hasBtn > 0) {
  await novoBtn.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'screenshot-clientes-02-modal-novo.png', fullPage: false });
  console.log('   ✓ screenshot-clientes-02-modal-novo.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
}

// Procurar botão de excluir na primeira linha
const deleteBtn = page.locator('table button[aria-label*="xcluir" i], table button:has(svg)').first();
const hasDel = await deleteBtn.count();
console.log('\n4. Botão excluir na tabela:', hasDel > 0 ? 'ENCONTRADO' : 'NÃO ENCONTRADO');

if (hasDel > 0) {
  await deleteBtn.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'screenshot-clientes-03-confirm-delete.png', fullPage: false });
  console.log('   ✓ screenshot-clientes-03-confirm-delete.png');
}

console.log('\n=== ÚLTIMOS 15 LOGS DO CONSOLE ===');
logs.slice(-15).forEach(l => console.log(l));

await browser.close();
console.log('\n✓ Concluído');
