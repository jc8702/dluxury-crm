import type { Page } from '@playwright/test';
import { mockAuthenticatedSession } from './auth';

export type CapturedPost = { url: string; body: unknown };

/**
 * Mock genérico para specs de inserção (TSK-15):
 * - sessão autenticada;
 * - GET responde listas mínimas (clientes, categorias);
 * - POST/PUT/PATCH são capturados em `posts` e respondem sucesso.
 */
export async function mockInsertionApi(page: Page): Promise<CapturedPost[]> {
  const posts: CapturedPost[] = [];

  await page.route('**/api/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/api/auth')) {
      if (url.includes('action=me') || url.endsWith('/api/auth/me')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              user: {
                id: 'user-test-001',
                email: 'admin@dluxury.com',
                nome: 'Admin Teste',
                role: 'admin',
                tenantId: '00000000-0000-0000-0000-000000000000',
                planoTier: 'enterprise',
              },
            },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {} }),
      });
      return;
    }

    if (method !== 'GET') {
      let body: unknown = null;
      try {
        body = route.request().postDataJSON();
      } catch {
        body = route.request().postData();
      }
      posts.push({ url, body });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: 'e2e-1' } }),
      });
      return;
    }

    let data: unknown = [];
    if (url.includes('/api/clients')) {
      data = [
        {
          id: 'client-e2e-001',
          nome: 'Cliente E2E',
          razao_social: 'Cliente E2E',
          status: 'ativo',
          situacao_cadastral: 'ATIVA',
        },
      ];
    } else if (url.includes('action=next-code')) {
      data = { nextCode: 'CHP-E2E-1' };
    } else if (url.includes('financeiro/classes')) {
      data = [
        {
          id: 'cf-e2e-1',
          codigo: '1.1',
          nome: 'Receita Operacional',
          tipo: 'receita',
          permite_lancamento: true,
        },
      ];
    } else if (url.includes('financeiro/formas-pagamento')) {
      data = [{ id: 'fp-e2e-1', nome: 'PIX' }];
    } else if (/categories|categorias/i.test(url)) {
      data = [{ id: 'cat-e2e-1', nome: 'Madeira' }];
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data }),
    });
  });

  await mockAuthenticatedSession(page);
  return posts;
}

/** POSTs cujo payload contém o marcador (string distintiva digitada no form). */
export function postsWith(posts: CapturedPost[], marker: string) {
  return posts.filter((p) => JSON.stringify(p.body ?? '').includes(marker));
}
