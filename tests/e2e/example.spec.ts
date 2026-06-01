import { test, expect } from '@playwright/test';

test('deve abrir homepage', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await expect(page).toHaveTitle(/D'Luxury/);
});
