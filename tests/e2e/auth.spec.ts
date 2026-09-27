import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@dluxury.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

const FAKE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.test';

const TEST_USER = {
  id: 'user-test-001',
  name: 'Usuário Teste',
  email: TEST_EMAIL,
  role: 'admin',
  tenantId: '00000000-0000-0000-0000-000000000000',
  planoTier: 'enterprise',
};

// O app usa HashRouter: as rotas autenticadas vivem em /#/<rota>.
// /login redireciona para /#/painel, que renderiza <LoginPage> sem sessão.
async function mockAuthApi(page: Page) {
  await page.route('**/api/auth**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('action=login') && method === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      const valid = body.email === TEST_EMAIL && body.password === TEST_PASSWORD;

      if (!valid) {
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Credenciais inválidas.' }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { token: FAKE_TOKEN, user: TEST_USER } }),
      });
    }

    if (url.includes('action=me')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { user: TEST_USER } }),
      });
    }

    return route.continue();
  });
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/#/login');
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
}

const getToken = (page: Page) => page.evaluate(() => localStorage.getItem('dluxury_token'));

test.describe('Autenticação', () => {
  test('usuário consegue fazer login', async ({ page }) => {
    await mockAuthApi(page);
    await login(page, TEST_EMAIL, TEST_PASSWORD);

    // Sessão ativa: form de login some e o shell autenticado (sidebar) aparece
    await expect(page.locator('input[type="email"]')).toBeHidden({ timeout: 10000 });
    await expect(page.getByRole('link', { name: 'Painel Geral' })).toBeVisible({ timeout: 10000 });
    expect(await getToken(page)).toBe(FAKE_TOKEN);
  });

  test('login com credenciais erradas retorna erro', async ({ page }) => {
    await mockAuthApi(page);
    await login(page, 'errado@email.com', 'senhaerrada');

    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="alert"]')).toContainText('Credenciais inválidas');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    expect(await getToken(page)).toBeNull();
  });

  test('usuário consegue fazer logout', async ({ page }) => {
    await mockAuthApi(page);
    await login(page, TEST_EMAIL, TEST_PASSWORD);
    await expect(page.getByRole('link', { name: 'Painel Geral' })).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Sair do sistema' }).click();

    // Sem sessão o AuthGuard volta a renderizar o <LoginPage>
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
    expect(await getToken(page)).toBeNull();
  });
});
