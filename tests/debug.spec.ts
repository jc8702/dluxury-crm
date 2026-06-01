import { test, expect } from '@playwright/test';

test('debug login page', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      errors.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    errors.push(`[PAGE ERROR] ${err.message}`);
  });

  await page.goto('/#/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('=== CONSOLE ERRORS ===');
  errors.forEach((e) => console.log(e));
  if (errors.length === 0) console.log('(no errors)');

  const rootContent = await page.evaluate(() =>
    document.getElementById('root')?.innerHTML?.substring(0, 500),
  );
  console.log('=== ROOT INNERHTML ===');
  console.log(rootContent || '(empty)');

  console.log('=== FINAL URL ===');
  console.log(page.url());
});
