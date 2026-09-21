import { test, expect, type ConsoleMessage } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const REAL_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEzZDAwNmYyLTlkZDgtNDM3Yy05ZjlhLWQ3MmJlODY3NzA3OSIsImVtYWlsIjoiYWRtaW5AZGx1eHVyeS5jb20iLCJyb2xlIjoiYWRtaW4iLCJuYW1lIjoiQURNSU5JU1RSQURPUiIsInRlbmFudElkIjoiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAwIiwicGxhbm9UaWVyIjoiZW50ZXJwcmlzZSIsImlhdCI6MTc4OTUxNTE4MiwiZXhwIjoxNzkwMTE5OTgyfQ.Sufo4AU6mtfR3726zUOUwCeFAkC8yDUBkD9WmXJFeBI';
const REAL_USER = {
  id: '13d006f2-9dd8-437c-9f9a-d72be8677079',
  email: 'admin@dluxury.com',
  nome: 'ADMINISTRADOR',
  role: 'admin',
  tenantId: '00000000-0000-0000-0000-000000000000',
  planoTier: 'enterprise',
};

async function mockRealSession(page: any) {
  await page.addInitScript((token: string) => {
    localStorage.setItem('dluxury_token', token);
    localStorage.setItem('token', token);
  }, REAL_TOKEN);
  // Apenas mocka o /api/auth/me para garantir que o front reconheça o usuário,
  // mas deixa todas as outras rotas /api/** irem para o backend real (Neon)
  await page.route('**/api/auth**', async (route: any) => {
    const url = route.request().url();
    if (url.includes('action=me') || url.endsWith('/api/auth/me')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { user: REAL_USER } }),
      });
      return;
    }
    return route.continue();
  });
}

interface RouteAudit {
  route: string;
  label: string;
  status: 'ok' | 'erro' | 'nao_testado';
  consoleErrors: string[];
  failedRequests: { url: string; status: number; method: string }[];
  pageErrors: string[];
  loadTimeMs: number | null;
}

const ROUTES: { route: string; label: string }[] = [
  { route: 'painel', label: 'Dashboard' },
  { route: 'clientes', label: 'Clientes' },
  { route: 'quotations', label: 'Orçamentos (Quotations)' },
  { route: 'projetos', label: 'Projetos' },
  { route: 'producao', label: 'Produção' },
  { route: 'plano-de-corte', label: 'Plano de Corte Industrial' },
  { route: 'plano-de-corte-demo', label: 'Plano de Corte (Demo)' },
  { route: 'simulador-corte', label: 'Simulador de Corte' },
  { route: 'simulador-producao', label: 'Simulador de Produção' },
  { route: 'visitas', label: 'Visitas' },
  { route: 'calendario', label: 'Calendário' },
  { route: 'pos-venda', label: 'Pós-Venda' },
  { route: 'estoque', label: 'Estoque' },
  { route: 'fornecedores', label: 'Fornecedores' },
  { route: 'engenharia', label: 'Engenharia' },
  { route: 'pecas', label: 'SKUs / Peças' },
  { route: 'relatorios', label: 'Relatórios' },
  { route: 'financeiro', label: 'Financeiro (Home)' },
  { route: 'financeiro/classes', label: 'Financeiro > Classes' },
  { route: 'financeiro/contas', label: 'Financeiro > Contas' },
  { route: 'financeiro/formas', label: 'Financeiro > Formas de Pagamento' },
  { route: 'financeiro/condicoes', label: 'Financeiro > Condições' },
  { route: 'financeiro/titulos-receber', label: 'Financeiro > Títulos a Receber' },
  { route: 'financeiro/titulos-receber/wizard', label: 'Financeiro > Wizard Receber' },
  { route: 'financeiro/titulos-pagar', label: 'Financeiro > Títulos a Pagar' },
  { route: 'financeiro/titulos-pagar/wizard', label: 'Financeiro > Wizard Pagar' },
  { route: 'financeiro/dre', label: 'Financeiro > DRE' },
  { route: 'financeiro/aging', label: 'Financeiro > Aging' },
  { route: 'financeiro/fluxo-caixa', label: 'Financeiro > Fluxo de Caixa' },
  { route: 'financeiro/recorrentes', label: 'Financeiro > Recorrentes' },
  { route: 'financeiro/conciliacao', label: 'Financeiro > Conciliação' },
  { route: 'financeiro/rentabilidade', label: 'Financeiro > Rentabilidade' },
  { route: 'configuracoes', label: 'Configurações' },
  { route: 'notificacoes', label: 'Notificações' },
  { route: 'compras', label: 'Compras' },
  { route: 'prospeccao', label: 'Prospecção (Marcenaria)' },
  { route: 'retalhos', label: 'Retalhos' },
  { route: 'saas-admin', label: 'SaaS Admin' },
];

const results: RouteAudit[] = [];
const REPORT_PATH = path.resolve(process.cwd(), 'audit-report-real.json');

test.describe('Auditoria REAL — sem mocks (Neon)', () => {
  test.beforeEach(async ({ page }) => {
    await mockRealSession(page);
    // NÃO chama mockAllAPIs — deixa o backend real responder
  });

  for (const { route, label } of ROUTES) {
    test(`Rota REAL: ${label} (#/${route})`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const failedRequests: { url: string; status: number; method: string }[] = [];
      const pageErrors: string[] = [];

      page.on('console', (msg: ConsoleMessage) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (text.includes('grainy-gradients.vercel.app') || text.includes('noise.svg')) return;
          if (
            text.includes('Outdated Optimize Dep') ||
            text.includes('@react-three_drei') ||
            text.includes('Failed to fetch dynamically imported module')
          )
            return;
          if (text.includes('ErrorBoundary') && text.includes('SimuladorCortePage')) return;
          consoleErrors.push(text);
        }
      });
      page.on('pageerror', (err) => pageErrors.push(err.message));
      page.on('response', (res) => {
        const status = res.status();
        const url = res.url();
        if (url.includes('grainy-gradients.vercel.app')) return;
        if (url.includes('@react-three_drei') && status === 504) return;
        if (url.includes('node_modules/.vite/deps') && status === 504) return;
        if (status >= 400 && status !== 401 && status !== 403) {
          if (status === 404 && (url.includes('favicon') || url.includes('noise.svg'))) return;
          failedRequests.push({ url, status, method: res.request().method() });
        }
      });

      const start = Date.now();
      let loadTimeMs: number | null = null;
      let status: RouteAudit['status'] = 'ok';

      try {
        await page.goto(`/#/${route}`, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(1000);
        loadTimeMs = Date.now() - start;
        if (consoleErrors.length > 0 || pageErrors.length > 0 || failedRequests.length > 0) {
          status = 'erro';
        }
      } catch (e) {
        status = 'erro';
        pageErrors.push(`Falha ao navegar/carregar: ${(e as Error).message}`);
      }

      const entry: RouteAudit = {
        route: `#/${route}`,
        label,
        status,
        consoleErrors,
        failedRequests,
        pageErrors,
        loadTimeMs,
      };
      results.push(entry);
      try {
        let existing: RouteAudit[] = [];
        if (fs.existsSync(REPORT_PATH)) {
          try {
            existing = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));
            if (!Array.isArray(existing)) existing = [];
          } catch {
            existing = [];
          }
        }
        const filtered = existing.filter((r) => r.route !== entry.route);
        filtered.push(entry);
        const order = new Map(ROUTES.map((r, i) => [`#/${r.route}`, i]));
        filtered.sort((a, b) => (order.get(a.route) ?? 999) - (order.get(b.route) ?? 999));
        fs.writeFileSync(REPORT_PATH, JSON.stringify(filtered, null, 2), 'utf-8');
      } catch {
        /* ignore write errors */
      }
      expect
        .soft(status, `${label}: ${JSON.stringify({ consoleErrors, pageErrors, failedRequests })}`)
        .toBe('ok');
    });
  }

  test.afterAll(async () => {
    try {
      let finalResults = results;
      if (fs.existsSync(REPORT_PATH)) {
        try {
          const existing = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));
          if (Array.isArray(existing) && existing.length > results.length) finalResults = existing;
        } catch {
          /* ignore parse errors */
        }
      }
      fs.writeFileSync(REPORT_PATH, JSON.stringify(finalResults, null, 2), 'utf-8');
      process.stdout.write(`\nRelatório REAL salvo em: ${REPORT_PATH}\n`);
    } catch (e) {
      console.error('Falha ao salvar', e);
    }
  });
});
