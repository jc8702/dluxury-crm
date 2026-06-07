import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@dluxury.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

test.describe('Autenticação', () => {
  test('usuário consegue fazer login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")');

    await page.waitForURL(/\/(dashboard|home|app)/, { timeout: 10000 });
    expect(page.url()).not.toContain('/login');
  });

  test('login com credenciais erradas retorna erro', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'errado@email.com');
    await page.fill('input[type="password"]', 'senhaerrada');
    await page.click('button[type="submit"], button:has-text("Entrar")');

    const error = await page.locator('[role="alert"], .error, [class*="error"]').first();
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('usuário consegue fazer logout', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home|app)/);

    const logoutBtn = page
      .locator('button:has-text("Sair"), button:has-text("Logout"), [aria-label="logout"]')
      .first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    } else {
      await page.locator('[data-testid="user-menu"], [aria-label="user menu"]').first().click();
      await page.locator('button:has-text("Sair")').first().click();
    }

    await page.waitForURL(/\/login/, { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });
});
