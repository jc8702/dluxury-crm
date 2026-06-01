import { test } from '@playwright/test';

test('debug: inspecionar DOM da landing', async ({ page }) => {
  const errors: string[] = [];
  const logs: string[] = [];
  page.on('pageerror', (e) => errors.push('PAGE: ' + e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text());
    else logs.push(msg.type() + ': ' + msg.text());
  });
  page.on('requestfailed', (req) =>
    errors.push('REQ: ' + req.url() + ' -> ' + req.failure()?.errorText),
  );

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  console.log('--- TITLE ---', await page.title());
  console.log('--- URL ---', page.url());
  console.log('--- ERRORS (' + errors.length + ') ---');
  errors.slice(0, 10).forEach((e) => console.log(e));
  console.log('--- ROOT HTML ---');
  console.log((await page.locator('#root').innerHTML()).substring(0, 500));
  console.log('--- BODY HTML (first 500) ---');
  console.log((await page.locator('body').innerHTML()).substring(0, 500));
  console.log('--- BODY TEXT (first 1000) ---');
  console.log((await page.locator('body').innerText()).substring(0, 1000));
});
