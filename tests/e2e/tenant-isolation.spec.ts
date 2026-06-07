import { test, expect } from '@playwright/test';

test.describe('Isolamento de Tenant', () => {
  test('API retorna 403 sem token', async ({ request }) => {
    const response = await request.get('/api/quotations', {
      headers: { Authorization: '' },
    });
    expect(response.status()).toBe(403);
  });

  test('API retorna 403 com token inválido', async ({ request }) => {
    const response = await request.get('/api/quotations', {
      headers: { Authorization: 'Bearer token_invalido_123' },
    });
    expect(response.status()).toBe(403);
  });

  test('API retorna 403 com UUID de tenant inexistente', async ({ request }) => {
    const fakeJwt =
      'eyJhbGciOiJIUzI1NiJ9.eyJ0ZW5hbnRJZCI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCJ9.fake';
    const response = await request.get('/api/quotations', {
      headers: { Authorization: `Bearer ${fakeJwt}` },
    });
    expect([403, 401]).toContain(response.status());
  });
});
