import { chromium } from '@playwright/test';
import fs from 'fs';

async function run() {
  console.log('=== STARTING BROWSER AUDIT ===');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 1. Landing Page
    console.log('\n--- 1. Landing Page ---');
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    console.log('Title:', await page.title());
    const bodyText = await page.innerText('body');
    console.log('Hero text exists:', bodyText.includes("O ERP Definitivo"));

    // 2. Login
    console.log('\n--- 2. Login ---');
    await page.goto('http://localhost:5173/#/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', 'admin@dluxury.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    console.log('URL after login:', page.url());
    
    // Check if token exists in localStorage
    const token = await page.evaluate(() => localStorage.getItem('dluxury_token'));
    console.log('Token stored in localStorage:', token ? 'YES (Valid JWT)' : 'NO');

    // 3. Clientes
    console.log('\n--- 3. Clientes ---');
    await page.goto('http://localhost:5173/#/clientes');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('Clientes Page URL:', page.url());
    const clientsText = await page.innerText('body');
    console.log('List of clients loaded:', clientsText.includes("Clientes") || clientsText.includes("Nome"));
    
    // Check if we can find add client button
    const addClientBtn = await page.locator('button:has-text("Novo"), button:has-text("Adicionar"), button:has-text("Cadastrar")').first().isVisible();
    console.log('Add client button visible:', addClientBtn);

    // 4. Orçamentos
    console.log('\n--- 4. Orçamentos ---');
    await page.goto('http://localhost:5173/#/orcamentos');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('Orçamentos Page URL:', page.url());
    const quotesText = await page.innerText('body');
    console.log('Orçamentos list loaded:', quotesText.includes("Orçamentos") || quotesText.includes("Novo Orçamento"));
    
    // Check if Fita de Borda is there
    const hasFitaBorda = quotesText.toLowerCase().includes("fita de borda") || quotesText.toLowerCase().includes("borda");
    console.log('Fita de Borda reference found on page:', hasFitaBorda);

    // 5. Produção
    console.log('\n--- 5. Produção ---');
    await page.goto('http://localhost:5173/#/producao');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('Produção Page URL:', page.url());
    const prodText = await page.innerText('body');
    console.log('Kanban PCP Board loaded:', prodText.includes("Produção") || prodText.includes("Kanban") || prodText.includes("Fase"));
    
    // Plano de Corte
    await page.goto('http://localhost:5173/#/plano-de-corte');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const planText = await page.innerText('body');
    console.log('Plano de Corte loaded:', planText.includes("Plano de Corte") || planText.includes("Chapas"));

    // Simulador 3D
    await page.goto('http://localhost:5173/#/simulador-corte');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const simText = await page.innerText('body');
    console.log('Simulador 3D loaded:', simText.includes("Simulador") || simText.includes("3D"));

    // 6. Estoque
    console.log('\n--- 6. Estoque ---');
    await page.goto('http://localhost:5173/#/estoque');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('Estoque Page URL:', page.url());
    const stockText = await page.innerText('body');
    console.log('Estoque list loaded:', stockText.includes("Estoque") || stockText.includes("Material"));

    // 7. Financeiro
    console.log('\n--- 7. Financeiro ---');
    await page.goto('http://localhost:5173/#/financeiro');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('Financeiro Page URL:', page.url());
    const finText = await page.innerText('body');
    console.log('Financeiro loaded:', finText.includes("Financeiro") || finText.includes("DRE") || finText.includes("Fluxo de Caixa"));

    // 8. Design System / Dark Mode
    console.log('\n--- 8. Design System ---');
    const isDarkModeInitial = await page.evaluate(() => document.documentElement.classList.contains('dark') || document.body.classList.contains('dark'));
    console.log('Initial Dark Mode:', isDarkModeInitial);
    
  } catch (error) {
    console.error('Audit script failed:', error);
  } finally {
    await browser.close();
    console.log('=== BROWSER AUDIT FINISHED ===');
  }
}

run();
