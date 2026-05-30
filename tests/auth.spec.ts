import { test, expect } from '@playwright/test';

test('has title and can load login page', async ({ page }) => {
  // Use the baseURL from the playwright config or environment
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/D'Luxury/);

  // Verificamos se o form de login renderiza
  const loginForm = page.locator('form');
  await expect(loginForm).toBeVisible();

  // Verificamos campos essenciais
  const emailInput = page.locator('input[type="email"]');
  const passInput = page.locator('input[type="password"]');
  
  await expect(emailInput).toBeVisible();
  await expect(passInput).toBeVisible();
});
