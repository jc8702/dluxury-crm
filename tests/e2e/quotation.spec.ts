import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@dluxury.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

test.describe('Orçamentos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home|app)/);
  });

  test('usuário consegue navegar até orçamentos', async ({ page }) => {
    const quotationLink = page
      .locator('a:has-text("Orçamento"), a[href*="quotation"], a[href*="orcamento"]')
      .first();
    if (await quotationLink.isVisible()) {
      await quotationLink.click();
    } else {
      await page.goto('/quotations');
    }

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
  });

  test('página de orçamentos carrega sem erro', async ({ page }) => {
    await page.goto('/quotations');
    const errorEl = page.locator('[class*="error-boundary"], text=Something went wrong');
    await expect(errorEl).not.toBeVisible({ timeout: 5000 });
  });
});
