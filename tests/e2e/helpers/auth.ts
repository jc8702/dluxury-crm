import type { Page } from '@playwright/test';

export const FAKE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.test';

export const FAKE_USER = {
  id: 'user-test-001',
  email: 'admin@dluxury.com',
  nome: 'Admin Teste',
  role: 'admin',
  tenantId: '00000000-0000-0000-0000-000000000000',
  planoTier: 'enterprise',
};

export async function mockAuthenticatedSession(page: Page) {
  await page.addInitScript((token) => {
    localStorage.setItem('dluxury_token', token);
  }, FAKE_TOKEN);

  await page.route('**/api/auth**', async (route) => {
    const url = route.request().url();
    if (url.includes('action=me') || url.endsWith('/api/auth/me')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { user: FAKE_USER } }),
      });
      return;
    }
    return route.continue();
  });
}

export async function mockApiGet(page: Page, endpointPattern: string, body: unknown) {
  await page.route(endpointPattern, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: body }),
    });
  });
}

export async function mockApiCrud(page: Page, endpointPattern: string) {
  await page.route(endpointPattern, async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    const reqData =
      method !== 'GET' && method !== 'DELETE'
        ? JSON.parse(route.request().postData() || '{}')
        : null;
    const id = `mock-${Date.now()}`;
    const data = { id, ...(reqData || {}), createdAt: new Date().toISOString() };

    let body: string;
    if (method === 'DELETE') {
      body = '';
    } else if (method === 'GET' && /[?&](page|limit|q)=/.test(url)) {
      body = JSON.stringify({
        success: true,
        data: [data],
        pagination: { page: 1, total: 1, pages: 1, limit: 5 },
      });
    } else if (method === 'GET' && !/[?&]id=/.test(url)) {
      body = JSON.stringify({ success: true, data: [data] });
    } else {
      body = JSON.stringify({ success: true, data });
    }

    await route.fulfill({
      status: method === 'DELETE' ? 204 : 200,
      contentType: 'application/json',
      body,
    });
  });
}
